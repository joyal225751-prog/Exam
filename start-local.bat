@echo off
echo ==============================================
echo   Starting ReelList Movie Watchlist Manager
echo ==============================================
echo.
echo Starting Backend API (Port 5000)...
start "ReelList Backend API" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 3 /nobreak >nul
echo Starting Frontend (Port 5173)...
start "ReelList Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo ==============================================
echo App is starting!
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:5000/api/health
echo ==============================================
pause
