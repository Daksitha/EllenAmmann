@echo off
echo ===================================================
echo Stopping Ellen Ammann Dataset Manager
echo ===================================================
echo.

echo Stopping all Node.js services...
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo All services stopped successfully.
pause
