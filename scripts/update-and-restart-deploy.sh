#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--production|--maintenance]"
  echo "  --production  build and launch the production stack from this checkout"
  echo "  --maintenance build and launch the maintenance page from this checkout"
}

mode=
case "${1:-}" in
  --production) mode=production ;;
  --maintenance) mode=maintenance ;;
  --help|-h)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

if (( $# > 1 )); then
  usage >&2
  exit 2
fi

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ "$mode" == production ]]; then
  echo "==> Building and starting the production stack from this checkout..."
  docker compose -f docker-compose.production.yml up -d --build
  docker compose -f docker-compose.production.yml ps
elif [[ "$mode" == maintenance ]]; then
  echo "==> Building and starting the maintenance page from this checkout..."
  docker compose -f docker-compose.maintenance.yml up -d --build --remove-orphans
  docker compose -f docker-compose.maintenance.yml ps
fi

echo "==> Update and restart complete!"
