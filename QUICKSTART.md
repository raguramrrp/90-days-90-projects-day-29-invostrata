# VALICORA Quick Start Guide

VALICORA is an automated financial consistency and invoice validation workstation.

## Prerequisites
- Windows 10/11
- Python 3.10+
- Node.js 18+ (for frontend compilation)

## Quick Start (Automated Windows)

1. **Setup Environment & Database**:
   Double-click `setup.bat` or run:
   ```cmd
   setup.bat
   ```
   This will install dependencies, build the React frontend, and seed 105 validated invoices.

2. **Launch Application**:
   Double-click `run.bat` or run:
   ```cmd
   run.bat
   ```
   Open [http://localhost:8000](http://localhost:8000) in your browser.

3. **Run Automated Tests**:
   Double-click `test.bat` or run:
   ```cmd
   test.bat
   ```

## Manual Setup

```cmd
# 1. Install dependencies
python -m pip install -r requirements.txt

# 2. Build React frontend
cd frontend
npm install
npm run build
cd ..

# 3. Seed database
python -m app.seed.seed_data

# 4. Start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
