@echo off
setlocal
cd /d "%~dp0"

echo ======================================================================
echo INVOSTRATA — Automated Invoice Validation & Financial Workstation
echo ======================================================================
echo.
echo Launching Uvicorn backend server at http://localhost:8000 ...
echo Press Ctrl+C in this terminal to stop the server.
echo.

start http://localhost:8000

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
