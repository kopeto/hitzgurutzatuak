#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
cd "$repo_root"

export NODE_ENV=development
export HOST=127.0.0.1
export PORT=3000
export DB_CONNECTION=mongodb://127.0.0.1:27017/HG_develop

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROREA] Node.js ez dago instalatuta edo ez dago PATH aldagaian." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROREA] npm ez dago instalatuta edo ez dago PATH aldagaian." >&2
  exit 1
fi

echo "==> Node.js bertsioa: $(node --version)"

if [[ ! -x node_modules/.bin/nodemon || ! -x node_modules/.bin/vite || ! -d node_modules/@vitejs/plugin-react ]]; then
  echo "==> Garapeneko mendekotasunak instalatzen..."
  npm --silent ci
fi

echo "==> MongoDB lokala egiaztatzen: 127.0.0.1:27017..."
if ! node -e 'const mongoose = require("mongoose"); mongoose.connect(process.env.DB_CONNECTION, { serverSelectionTimeoutMS: 5000 }).then(() => mongoose.disconnect()).then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });'; then
  echo "[ERROREA] MongoDB ez dago erabilgarri 127.0.0.1:27017 helbidean." >&2
  echo "Abiarazi MongoDB zerbitzua mongod erabiliz, eta exekutatu script hau berriro." >&2
  exit 1
fi

echo "==> Garapeneko datu-basea: HG_develop"
echo "==> Tokiko master erabiltzailea prestatzen..."
node create-master.js master 1234 master@hitzgurutzatuak.local

echo
echo "==> Tokiko aplikazioa: http://localhost:$PORT"
echo "==> Garapenerako erabiltzailea: master / 1234"
echo "==> Sakatu Ctrl+C aplikazioa gelditzeko."
echo

npm --silent run dev
