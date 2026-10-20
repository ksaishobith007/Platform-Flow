@echo off
title PlatformFlow Backend
echo ======================================================================
echo PlatformFlow - Nationwide Railway Operations & Platform Planning
echo Starting FastAPI Backend & API Server on http://127.0.0.1:8000
echo Interactive API Documentation available at http://127.0.0.1:8000/docs
echo ======================================================================
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
