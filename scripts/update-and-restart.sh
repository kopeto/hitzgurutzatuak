#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: $0"
  echo "Rebuild and restart the local development app."
  exit 0
fi

if (( $# > 0 )); then
  echo "Usage: $0 [--help]" >&2
  exit 2
fi

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

compose_file=docker-compose.develop.yml

echo "==> Rebuilding and restarting the development app..."
docker compose -f "$compose_file" up -d --build --force-recreate app
docker compose -f "$compose_file" ps

echo "==> Development app update complete!"
