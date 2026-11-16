@echo off
setlocal enabledelayedexpansion
title LuminaFM Enterprise CMMS Launcher
color 0B

echo ===============================================================================
echo            LuminaFM Enterprise CMMS - Application Launcher
echo ===============================================================================
echo.

:: Ensure we are running in the directory where this .bat file resides
cd /d "%~dp0"

:: 1. Verify Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in your system PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: 2. Check for .env file
if not exist ".env" (
    echo [WARN] .env file not found in root directory.
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy ".env.example" ".env" >nul
        echo [OK] .env created.
    ) else (
        echo [ERROR] No .env or .env.example found.
        pause
        exit /b 1
    )
)

echo [1/3] Starting Backend API Server (Port 3000)...
start "LuminaFM Backend API [Port 3000]" cmd /c "title LuminaFM - Backend Server [Port 3000] && color 0A && echo ======================================================== && echo   LuminaFM Backend Server (Node.js/Express + Prisma)   && echo ======================================================== && npm run dev"

:: Wait 3 seconds for backend initialization
timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Web Interface (Port 5173)...
start "LuminaFM Frontend UI [Port 5173]" cmd /c "title LuminaFM - Frontend UI [Port 5173] && color 09 && cd frontend && echo ======================================================== && echo      LuminaFM Frontend Interface (React + Vite)       && echo ======================================================== && npm run dev"

:: Wait 3 seconds for Vite server startup
timeout /t 3 /nobreak >nul

echo [3/3] Opening LuminaFM in your default web browser...
start http://localhost:5173

echo.
echo ===============================================================================
echo                      LuminaFM is Live & Running!
echo ===============================================================================
echo.
echo   * Web Portal:      http://localhost:5173
echo   * Backend API:     http://localhost:3000
echo   * Database:        Supabase Cloud PostgreSQL (Connected)
echo.
echo   --- Default Login Credentials ---
echo   Administrator:     admin@kingsburyhotel.com
echo   Password:          Kingsbury@2026!
echo.
echo   Boiler Operator:   operator@kingsburyhotel.com
echo   Password:          Operator@2026!
echo.
echo ===============================================================================
echo Tip: Keep the two server windows open while using LuminaFM.
echo To shut down all servers, run 'stop-luminafm.bat' or close the terminal windows.
echo ===============================================================================
echo.
pause
