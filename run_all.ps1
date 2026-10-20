# PlatformFlow - PowerShell All-in-One Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "PlatformFlow - Nationwide Railway Operations & Platform Planning" -ForegroundColor Green
Write-Host "Launching FastAPI Backend & Vite Frontend..." -ForegroundColor Cyan
Write-Host "======================================================================"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host ""
Write-Host "SUCCESS! PlatformFlow is running:" -ForegroundColor Green
Write-Host "  - Web UI:             http://localhost:5173" -ForegroundColor Yellow
Write-Host "  - Direct Web / API:   http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "  - API Swagger Docs:   http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
