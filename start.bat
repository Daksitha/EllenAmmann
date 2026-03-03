@echo off
echo ===================================================
echo Starting Ellen Ammann Dataset Manager
echo ===================================================
echo.

echo Stopping any running Node.js instances to avoid port conflicts...
taskkill /F /IM node.exe /T >nul 2>&1

echo Starting the backend server...
:: Starts the server in a new command prompt window so you can see the logs
start "Ellen Ammann Server" cmd /k "node server.js"

echo Waiting for the server to initialize...
timeout /t 2 /nobreak >nul

echo Opening the frontend in your default browser...
start http://localhost:3000

echo.
echo Services started successfully! You can close this window.
