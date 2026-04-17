@echo off
title Master Build Codex - Install
echo ========================================
echo  Master Build Codex - Install and Build
echo ========================================
echo.

cd /d "%~dp0"

:: Create logs folder
if not exist "logs" mkdir logs
set LOGFILE=logs\install-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log

echo Log file: %LOGFILE%
echo.

:: Check Node is installed
echo Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Download it from https://nodejs.org and re-run this installer.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODEVER=%%i
echo Node.js found: %NODEVER%
echo.

:: Remove stale database so it is recreated with current seed data
echo Clearing old database (if any)...
if exist "dev.db" del /f "dev.db"
if exist "dev.db-wal" del /f "dev.db-wal"
if exist "dev.db-shm" del /f "dev.db-shm"
echo.

:: Install dependencies
echo ----------------------------------------
echo Installing dependencies...
echo (This may take 1-2 minutes, please wait)
echo ----------------------------------------
npm install >> "%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed.
    echo Open this file to see what went wrong: %LOGFILE%
    echo.
    pause
    exit /b 1
)
echo Dependencies installed OK.
echo.

:: Build the project
echo ----------------------------------------
echo Building project...
echo ----------------------------------------
npm run build >> "%LOGFILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed.
    echo Open this file to see what went wrong: %LOGFILE%
    echo.
    pause
    exit /b 1
)
echo Build completed OK.
echo.

echo ========================================
echo  Install complete! Run start.bat next.
echo ========================================
echo.
pause
