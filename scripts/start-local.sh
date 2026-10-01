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
  echo "[ERROR] Node.js no está instalado o no está en PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm no está instalado o no está en PATH." >&2
  exit 1
fi

echo "==> Node.js $(node --version)"

if [[ ! -x node_modules/.bin/nodemon ]]; then
  echo "==> Instalando dependencias de desarrollo..."
  npm ci
fi

echo "==> Comprobando MongoDB local en 127.0.0.1:27017..."
if ! node -e 'const mongoose = require("mongoose"); mongoose.connect(process.env.DB_CONNECTION, { serverSelectionTimeoutMS: 5000 }).then(() => mongoose.disconnect()).then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });'; then
  echo "[ERROR] MongoDB no está disponible en 127.0.0.1:27017." >&2
  echo "Inicia el servicio local de MongoDB (mongod) y vuelve a ejecutar este script." >&2
  exit 1
fi

echo "==> Base de desarrollo: HG_develop"
echo "==> Preparando usuario local master..."
node create-master.js master 1234 master@hitzgurutzatuak.local

echo
echo "==> App local: http://localhost:$PORT"
echo "==> Usuario de desarrollo: master / 1234"
echo "==> Pulsa Ctrl+C para detener la aplicación."
echo

npm run dev
