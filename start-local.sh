#!/bin/bash

# Script para lanzar la aplicacion en local
# Requiere: Node.js y MongoDB ejecutandose en localhost

set -e

echo ""
echo "========================================="
echo "  Hitzgurutzatuak - Konfigurazio lokala"
echo "========================================="
echo ""

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js ez dago instalatuta"
    echo "Deskargatu hemendik: https://nodejs.org/"
    exit 1
fi

echo "[ONDO] Node.js detektatuta:"
node --version

# Check if MongoDB connection is available
echo ""
echo "MongoDB egiaztatzen..."
sleep 1

if ! node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost/CW', {serverSelectionTimeoutMS: 5000}).then(() => { console.log('[ONDO] MongoDB konektatuta'); mongoose.disconnect(); process.exit(0); }).catch(e => { console.error('[ERROR] Ezin da MongoDBra konektatu'); console.error('Egiaztatu MongoDB martxan dagoela localhost:27017 helbidean'); process.exit(1); })"; then
    echo ""
    echo "[ERROR] MongoDB ez dago erabilgarri"
    echo ""
    echo "Instalatu MongoDB hemendik: https://www.mongodb.com/try/download/community"
    echo "Edo Homebrew erabiliz: brew install mongodb-community"
    echo ""
    echo "Ondoren, abiarazi MongoDB komando honekin: mongod"
    echo ""
    exit 1
fi

# Install dependencies if needed
echo ""
echo "Node mendekotasunak egiaztatzen..."
if [ ! -d "node_modules" ]; then
    echo "Mendekotasunak instalatzen (minutu batzuk har ditzake)..."
    npm install
fi
echo "[ONDO] Mendekotasunak instalatuta"

# Create master user
echo ""
echo "Erabiltzaile nagusia sortzen..."
node create-master.js master 1234 master@hitzgurutzatuak.local

# Start the app
echo ""
echo "========================================="
echo "   APLIKAZIOA ABIARAZTEN"
echo "========================================="
echo ""
echo "URL: http://localhost:3000"
echo "Erabiltzailea: master"
echo "Pasahitza: 1234"
echo ""
echo "Sakatu Ctrl+C gelditzeko"
echo ""

npm start
