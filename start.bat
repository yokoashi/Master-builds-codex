@echo off
title Master Build Codex
set PERPLEXITY_API_KEY=YOUR_PERPLEXITY_API_KEY_HERE
cd /d "%~dp0"

:: Create logs folder
if not exist "logs" mkdir logs
set LOGFILE=logs\server-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log

echo ========================================
echo  Master Build Codex
echo  Server log: %LOGFILE%
echo ========================================
echo.

:: Check dependencies are installed
if not exist "node_modules" (
    echo [ERROR] Dependencies not installed. Run install.bat first.
    echo.
    pause
    exit /b 1
)

:: Start server in a new window (log redirected natively — no tee needed)
echo Starting server...
start "Master Build Codex Server" cmd /c "npm run dev >> "%LOGFILE%" 2>&1"

:: Poll until server is ready (up to ~60 seconds)
echo Waiting for server to start...
set /a tries=0
:wait
set /a tries+=1
if %tries% gtr 30 (
    echo.
    echo [ERROR] Server did not start in time. Check log: %LOGFILE%
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
curl -s http://localhost:5000 >nul 2>&1
if %errorlevel% neq 0 goto wait

echo Server is ready! Opening browser...
start "" http://localhost:5000
echo.
echo Server is running in the background window.
echo Close BOTH windows to shut everything down.
echo Log: %LOGFILE%
echo.
pause
