#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--production|--maintenance] [-u USERNAME -p PASSWORD]"
  echo "  --production          build and launch the production stack (default)"
  echo "  --maintenance         show maintenance publicly; allow master group management"
  echo "  -u, --username NAME   create or update the master user after deployment"
  echo "  -p, --password PASS   set the master user's password"
}

mode=production
master_username=
master_password=
username_set=false
password_set=false

while (( $# > 0 )); do
  case "$1" in
    --production)
      mode=production
      shift
      ;;
    --maintenance)
      mode=maintenance
      shift
      ;;
    -u|--username)
      if (( $# < 2 )) || [[ -z "$2" || "$2" == -* ]]; then
        echo "Error: -u requires a username." >&2
        usage >&2
        exit 2
      fi
      master_username=$2
      username_set=true
      shift 2
      ;;
    -p|--password)
      if (( $# < 2 )) || [[ -z "$2" ]]; then
        echo "Error: -p requires a password." >&2
        usage >&2
        exit 2
      fi
      master_password=$2
      password_set=true
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$username_set" != "$password_set" ]]; then
  echo "Error: -u and -p must be provided together." >&2
  usage >&2
  exit 2
fi

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ "$mode" == production ]]; then
  echo "==> Building and starting the production stack from this checkout..."
  APP_ENV_FILE=/etc/hitzgurutzatuak/app.env APP_MODE=production \
    docker compose -f docker-compose.production.yml up -d --build --force-recreate app
  if [[ "$username_set" == true ]]; then
    echo "==> Creating or updating the master user..."
    printf '%s' "$master_password" | APP_ENV_FILE=/etc/hitzgurutzatuak/app.env APP_MODE=production \
      docker compose -f docker-compose.production.yml exec -T app \
      node create-master.js "$master_username" --password-stdin
    unset master_password
  fi
  APP_ENV_FILE=/etc/hitzgurutzatuak/app.env APP_MODE=production \
    docker compose -f docker-compose.production.yml ps
elif [[ "$mode" == maintenance ]]; then
  echo "==> Building and starting the app with public maintenance mode..."
  APP_ENV_FILE=/etc/hitzgurutzatuak/app.env APP_MODE=maintenance \
    docker compose -f docker-compose.production.yml -f docker-compose.maintenance.yml up -d --build --force-recreate app
  if [[ "$username_set" == true ]]; then
    echo "==> Creating or updating the master user..."
    printf '%s' "$master_password" | APP_ENV_FILE=/etc/hitzgurutzatuak/app.env APP_MODE=maintenance \
      docker compose -f docker-compose.production.yml -f docker-compose.maintenance.yml exec -T app \
      node create-master.js "$master_username" --password-stdin
    unset master_password
  fi
  APP_ENV_FILE=/etc/hitzgurutzatuak/app.env APP_MODE=maintenance \
    docker compose -f docker-compose.production.yml -f docker-compose.maintenance.yml ps
fi

echo "==> Update and restart complete!"
