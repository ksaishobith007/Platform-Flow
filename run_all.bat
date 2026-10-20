@echo off
title PlatformFlow Launcher
echo ======================================================================
echo PlatformFlow - Nationwide Railway Operations & Platform Planning
echo Launching both Backend API and Frontend Web UI...
echo ======================================================================

start "PlatformFlow Backend (Port 8000)" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo Waiting 2 seconds for backend initialization...
timeout /t 2 >nul

start "PlatformFlow Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================================================
echo SUCCESS! PlatformFlow is running:
echo   - Web UI (Vite Dev Server):  http://localhost:5173
echo   - Direct Web App / Backend:  http://127.0.0.1:8000
echo   - Interactive API Docs:      http://127.0.0.1:8000/docs
echo ======================================================================
echo You can leave these command windows open while using the application.
pause
