@echo off
REM Script para lanzar la aplicacion en local
REM Requiere: Node.js y MongoDB ejecutandose en localhost

echo.
echo =========================================
echo   Hitzgurutzatuak - Konfigurazio lokala
echo =========================================
echo.

REM Check if Node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js ez dago instalatuta edo ez dago PATHean
    echo Deskargatu hemendik: https://nodejs.org/
    pause
    exit /b 1
)

echo [ONDO] Node.js detektatuta:
node --version

REM Check if MongoDB connection is available
echo.
echo MongoDB egiaztatzen...
timeout /t 2 /nobreak >nul

node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost/CW', {serverSelectionTimeoutMS: 5000}).then(() => { console.log('[ONDO] MongoDB konektatuta'); mongoose.disconnect(); process.exit(0); }).catch(e => { console.error('[ERROR] Ezin da MongoDBra konektatu'); console.error('Egiaztatu MongoDB martxan dagoela localhost:27017 helbidean'); process.exit(1); })"

if errorlevel 1 (
    echo.
    echo [ERROR] MongoDB ez dago erabilgarri
    echo.
    echo Instalatu MongoDB hemendik: https://www.mongodb.com/try/download/community
    echo Edo Chocolatey erabiliz: choco install mongodb-community
    echo.
    echo Ondoren, abiarazi MongoDB komando honekin: mongod
    echo.
    pause
    exit /b 1
)

REM Install dependencies if needed
echo.
echo Node mendekotasunak egiaztatzen...
if not exist "node_modules" (
    echo Mendekotasunak instalatzen - minutu batzuk har ditzake...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Ezin izan dira mendekotasunak instalatu
        pause
        exit /b 1
    )
)
echo [ONDO] Mendekotasunak instalatuta

REM Create master user
echo.
echo Erabiltzaile nagusia sortzen...
call node create-master.js master 1234 master@hitzgurutzatuak.local
if errorlevel 1 (
    echo [ERROR] Ezin izan da erabiltzaile nagusia sortu
    pause
    exit /b 1
)

REM Start the app
echo.
echo =========================================
echo   APLIKAZIOA ABIARAZTEN
echo =========================================
echo.
set NODE_ENV=development
echo URL: http://localhost:3000
echo Erabiltzailea: master
echo Pasahitza: 1234
echo.
echo Sakatu Ctrl+C gelditzeko
echo.

call npm run dev
