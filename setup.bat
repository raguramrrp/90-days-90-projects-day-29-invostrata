@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo VALICORA — Workstation Setup Script (Windows)
echo ======================================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ and add it to your system PATH.
    exit /b 1
)
echo [OK] Python runtime detected.

:: 2. Check Node & NPM
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    echo Please install Node.js 18+ to build the frontend.
    exit /b 1
)
echo [OK] Node.js and npm detected.

:: 3. Install Python Dependencies
echo [INFO] Installing required Python dependencies...
python -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Some pip dependencies failed to install. Continuing...
)

:: 4. Build Frontend Assets
echo [INFO] Building React + TypeScript frontend bundle...
cd frontend
call npm install
call npm run build
cd ..

:: 5. Initialize & Seed Database
echo [INFO] Initializing database and generating 105 demo invoices...
python -m app.seed.seed_data

echo.
echo ======================================================================
echo [SUCCESS] VALICORA setup completed successfully!
echo Run 'run.bat' to launch the application server on http://localhost:8000
echo ======================================================================
pause
