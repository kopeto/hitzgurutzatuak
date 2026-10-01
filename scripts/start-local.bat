@echo off
setlocal

for %%I in ("%~dp0..") do set "REPO_ROOT=%%~fI"
pushd "%REPO_ROOT%" || exit /b 1

set "NODE_ENV=development"
set "HOST=127.0.0.1"
set "PORT=3000"
set "DB_CONNECTION=mongodb://127.0.0.1:27017/HG_develop"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no está instalado o no está en PATH.
    popd
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm no está instalado o no está en PATH.
    popd
    exit /b 1
)

echo ==^> Node.js
node --version

if not exist "node_modules\.bin\nodemon.cmd" (
    echo ==^> Instalando dependencias de desarrollo...
    call npm ci
    if errorlevel 1 goto :failed
)

echo ==^> Comprobando MongoDB local en 127.0.0.1:27017...
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.DB_CONNECTION, {serverSelectionTimeoutMS:5000}).then(() => mongoose.disconnect()).then(() => process.exit(0)).catch(error => {console.error(error.message); process.exit(1);})"
if errorlevel 1 (
    echo [ERROR] MongoDB no está disponible en 127.0.0.1:27017.
    echo Inicia el servicio local de MongoDB (mongod) y vuelve a ejecutar este script.
    popd
    exit /b 1
)

echo ==^> Base de desarrollo: HG_develop
echo ==^> Preparando usuario local master...
call node create-master.js master 1234 master@hitzgurutzatuak.local
if errorlevel 1 goto :failed

echo.
echo ==^> App local: http://localhost:%PORT%
echo ==^> Usuario de desarrollo: master / 1234
echo ==^> Pulsa Ctrl+C para detener la aplicación.
echo.

call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%

:failed
popd
exit /b 1
