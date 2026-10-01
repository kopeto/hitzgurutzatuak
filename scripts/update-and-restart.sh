#!/bin/bash
set -e

echo "==> Pulling latest changes..."
git pull

echo "==> Stopping containers..."
docker compose down

echo "==> Rebuilding image..."
docker compose build --no-cache

echo "==> Starting services..."
docker compose up -d

echo "==> Update and restart complete!"