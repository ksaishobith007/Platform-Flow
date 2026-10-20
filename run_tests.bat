@echo off
title PlatformFlow Tests
echo ======================================================================
echo PlatformFlow - Running Comprehensive Unit & Integration Tests (pytest)
echo ======================================================================
python -m pytest backend/tests -v
pause
