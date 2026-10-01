#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--production]"
  echo "  no flag       update and restart the development Compose stack"
  echo "  --production  update and launch the production Compose stack"
}

mode=development
case "${1:-}" in
  "") ;;
  --production) mode=production ;;
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

echo "==> Pulling latest changes..."
git pull --ff-only

if [[ "$mode" == production ]]; then
  echo "==> Building and starting the production stack..."
  docker compose -f docker-compose.production.yml up -d --build
  docker compose -f docker-compose.production.yml ps
else
  echo "==> Stopping development containers..."
  docker compose down

  echo "==> Rebuilding development image..."
  docker compose build --no-cache

  echo "==> Starting development services..."
  docker compose up -d
fi

echo "==> Update and restart complete!"
