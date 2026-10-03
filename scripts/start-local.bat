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
    echo [ERROREA] Node.js ez dago instalatuta edo ez dago PATH aldagaian.
    popd
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROREA] npm ez dago instalatuta edo ez dago PATH aldagaian.
    popd
    exit /b 1
)

echo ==^> Node.js bertsioa
node --version

set "INSTALL_DEPS="
if not exist "node_modules\.bin\nodemon.cmd" set "INSTALL_DEPS=1"
if not exist "node_modules\.bin\vite.cmd" set "INSTALL_DEPS=1"
if not exist "node_modules\@vitejs\plugin-react\package.json" set "INSTALL_DEPS=1"
if defined INSTALL_DEPS (
    echo ==^> Garapeneko mendekotasunak instalatzen...
    call npm --silent ci
    if errorlevel 1 goto :failed
)

echo ==^> MongoDB lokala egiaztatzen: 127.0.0.1:27017...
call node scripts\check-local-mongodb.js
if errorlevel 1 (
    echo [ERROREA] MongoDB ez dago erabilgarri 127.0.0.1:27017 helbidean.
    echo Abiarazi MongoDB zerbitzua mongod erabiliz, eta exekutatu script hau berriro.
    popd
    exit /b 1
)

echo ==^> Garapeneko datu-basea: HG_develop
echo ==^> Tokiko master erabiltzailea prestatzen...
call node create-master.js master 1234 master@hitzgurutzatuak.local
if errorlevel 1 goto :failed

echo.
echo ==^> Tokiko aplikazioa: http://localhost:%PORT%
echo ==^> Garapenerako erabiltzailea: master / 1234
echo ==^> Sakatu Ctrl+C aplikazioa gelditzeko.
echo.

call npm --silent run dev
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%

:failed
popd
exit /b 1
