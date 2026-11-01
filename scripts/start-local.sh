#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--production|--maintenance]"
  echo "Runs the production Docker image with local settings and a separate local database."
}

mode=production
if (( $# > 0 )); then
  case "$1" in
    --production) mode=production ;;
    --maintenance) mode=maintenance ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
fi
if (( $# > 0 )); then
  echo "Unexpected argument: $1" >&2
  usage >&2
  exit 2
fi

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "[ERROREA] Docker Compose ez dago erabilgarri." >&2
  exit 1
fi

local_env_file=.env.local
if [[ ! -f "$local_env_file" ]]; then
  cp .env.example "$local_env_file"
  echo "==> Tokiko konfigurazioa sortu da: $local_env_file"
fi

compose=(docker compose --project-name hitzgurutzatuak-local \
  -f docker-compose.production.yml \
  -f docker-compose.local.yml)
local_port="${LOCAL_APP_PORT:-3001}"
master_username="${LOCAL_MASTER_USERNAME:-master}"
master_password="${LOCAL_MASTER_PASSWORD:-1234}"

echo "==> Production Docker irudia tokiko konfigurazioarekin abiarazten ($mode)..."
APP_ENV_FILE="$local_env_file" APP_MODE="$mode" APP_HOST_PORT="$local_port" \
  "${compose[@]}" up -d --build --force-recreate app

echo "==> Tokiko master erabiltzailea prestatzen..."
printf '%s' "$master_password" | APP_ENV_FILE="$local_env_file" APP_MODE="$mode" APP_HOST_PORT="$local_port" \
  "${compose[@]}" exec -T app node create-master.js "$master_username" --password-stdin
unset master_password

APP_ENV_FILE="$local_env_file" APP_MODE="$mode" APP_HOST_PORT="$local_port" "${compose[@]}" ps
echo
echo "==> Ireki http://localhost:$local_port eta hasi saioa $master_username erabiltzailearekin."
if [[ -z "${LOCAL_MASTER_PASSWORD:-}" ]]; then
  echo "==> Tokiko pasahitz lehenetsia: 1234 (LOCAL_MASTER_PASSWORD bidez alda dezakezu)."
fi
echo "==> Tokiko datu-basea: HG_develop. Produkzioko MongoDBa bereizita dago."
