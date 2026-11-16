@echo off
title Stop LuminaFM Servers
color 0C

echo ===============================================================================
echo                   Stopping LuminaFM Application Servers
echo ===============================================================================
echo.

:: Kill processes occupying port 3000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Terminating Backend process PID: %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes occupying port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Terminating Frontend process PID: %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [OK] All LuminaFM servers have been stopped.
echo.
timeout /t 3 >nul
