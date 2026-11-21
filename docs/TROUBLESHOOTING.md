# VALICORA — Troubleshooting Guide

## 1. Port 8000 Already in Use
**Symptom**: `ERROR: [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000)`
**Resolution**:
Another process is using port 8000. Specify an alternative port:
```cmd
python -m uvicorn app.main:app --host 0.0.0.0 --port 8029 --reload
```

## 2. Frontend Assets Not Loading
**Symptom**: Opening `http://localhost:8000` shows an API JSON response instead of the React workstation.
**Resolution**:
The React frontend bundle has not been built yet. Build it via:
```cmd
cd frontend
npm install
npm run build
cd ..
```

## 3. Database Reinitialization
**Symptom**: Need to reset demo data and regenerate 105 synthetic invoices.
**Resolution**:
Delete `valicora.db` and run:
```cmd
python -m app.seed.seed_data
```

## 4. PyMuPDF / PDF Extraction Warning
**Symptom**: `fitz` import warning or scanned PDF text extraction returns empty.
**Resolution**:
Ensure `pymupdf` and `pdfplumber` are installed (`python -m pip install pymupdf pdfplumber`). Scanned image-only PDFs can also be manually corrected via the Invoice Inspector.
