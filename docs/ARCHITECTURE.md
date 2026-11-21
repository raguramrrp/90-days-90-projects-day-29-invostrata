# VALICORA — System Architecture & Component Design

## Technical Architecture

```mermaid
flowchart TD
    subgraph Ingestion["Document Ingestion Layer"]
        Upload["File Ingestion (PDF / Image / CSV / Excel / Manual)"]
        Hash["SHA-256 Binary Checksum"]
        Extract["Extractor (PyMuPDF / pdfplumber / Regex Heuristics)"]
    end

    subgraph Core["Deterministic Financial Core"]
        DecMath["Python Decimal Precision Math Engine"]
        ValEngine["Validation Engine (Arithmetic, GST, Dates, Vendor)"]
        DupDet["Duplicate Detector (Exact & Fuzzy Levenshtein)"]
        Anom["Anomaly Engine (Rule Heuristics & Isolation Forest)"]
        Match["Three-Way Matcher (PO + GRN + Invoice)"]
    end

    subgraph DataLayer["Persistence & Storage"]
        DB[(Relational DB: SQLite / PostgreSQL)]
        DiskStore["Protected Document Storage (storage/invoices/)"]
    end

    subgraph API["FastAPI Application Services"]
        Endpoints["REST API Endpoints (/api/invoices, /api/reports, etc.)"]
        Reports["ReportLab PDF & Pandas CSV Generator"]
    end

    subgraph Frontend["React UI Workstation"]
        UI["React 18 + TypeScript + Vite + Tailwind CSS"]
        Inspector["Right-Side Invoice Inspector Panel"]
        Analytics["Recharts Operational Visualizations"]
    end

    Upload --> Hash --> Extract --> DecMath
    DecMath --> ValEngine
    DecMath --> DupDet
    DecMath --> Anom
    DecMath --> Match
    ValEngine --> Endpoints
    DupDet --> Endpoints
    Anom --> Endpoints
    Match --> Endpoints
    Endpoints <--> DB
    Endpoints --> Reports
    Endpoints <--> UI
    Inspector <--> Endpoints
```

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic.
- **Data & Math**: Python `Decimal`, Pandas, NumPy.
- **Document Processing**: PyMuPDF (`fitz`), `pdfplumber`, Pillow.
- **ML / Anomaly**: Scikit-learn `IsolationForest`.
- **Reporting**: ReportLab (PDF), Pandas (CSV).
- **Testing**: Pytest.
