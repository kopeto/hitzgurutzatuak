@echo off
setlocal

for %%I in ("%~dp0..") do set "REPO_ROOT=%%~fI"
pushd "%REPO_ROOT%" || exit /b 1

set "APP_MODE=production"
if /I "%~1"=="--maintenance" set "APP_MODE=maintenance"
if /I "%~1"=="--help" goto :usage
if /I "%~1"=="-h" goto :usage
if not "%~1"=="" if /I not "%~1"=="--maintenance" if /I not "%~1"=="--production" goto :usage_error
if not "%~2"=="" goto :usage_error

set "APP_ENV_FILE=.env.local"
set "APP_HOST_PORT=3000"
set "LOCAL_MASTER_USERNAME=master"
if not defined LOCAL_MASTER_PASSWORD set "LOCAL_MASTER_PASSWORD=1234"

if not exist ".env.local" (
    copy ".env.example" ".env.local" >nul
    if errorlevel 1 goto :failed
    echo ==^> Tokiko konfigurazioa sortu da: .env.local
)

echo ==^> Production Docker irudia tokiko konfigurazioarekin abiarazten: %APP_MODE%...
docker compose --project-name hitzgurutzatuak-local -f docker-compose.production.yml -f docker-compose.local.yml up -d --build --force-recreate app
if errorlevel 1 goto :failed

echo ==^> Tokiko master erabiltzailea prestatzen...
powershell -NoProfile -Command "[Console]::Write($env:LOCAL_MASTER_PASSWORD)" | docker compose --project-name hitzgurutzatuak-local -f docker-compose.production.yml -f docker-compose.local.yml exec -T app node create-master.js "%LOCAL_MASTER_USERNAME%" --password-stdin
if errorlevel 1 goto :failed

docker compose --project-name hitzgurutzatuak-local -f docker-compose.production.yml -f docker-compose.local.yml ps
echo.
echo ==^> Ireki http://localhost:%APP_HOST_PORT% eta hasi saioa %LOCAL_MASTER_USERNAME% erabiltzailearekin.
popd
exit /b 0

:usage
echo Usage: start-local.bat [--production^|--maintenance]
echo Runs the production Docker image with local settings and a separate local database.
popd
exit /b 0

:usage_error
echo Usage: start-local.bat [--production^|--maintenance]
popd
exit /b 2

:failed
popd
exit /b 1
