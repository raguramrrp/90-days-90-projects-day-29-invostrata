import os
from pathlib import Path
from typing import List, Dict
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "VALICORA"
    PROJECT_TITLE: str = "Automated Invoice Validation & Financial Consistency Workstation"
    PROJECT_TAGLINE: str = "Every invoice checked. Every discrepancy explained."
    VERSION: str = "1.0.0"
    
    # Database (Defaults to local SQLite for instant zero-config launch, easily configured to PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'valicora.db'}")
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "valicora_enterprise_financial_consistency_secret_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Storage
    STORAGE_DIR: Path = BASE_DIR / "storage" / "invoices"
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx", ".xls"]
    
    # Financial Validation Parameters
    ROUNDING_TOLERANCE: float = 0.05  # Max allowed rounding discrepancy in INR
    MAX_INVOICE_AGE_DAYS: int = 180  # Older than 180 days triggers historical flag
    HIGH_DISCOUNT_PERCENT: float = 20.0  # Above 20% triggers anomaly review
    ROUND_NUMBER_MODULO: float = 1000.0  # Suspect rounded amounts (e.g., 50000.00)
    
    # Indian GST State Codes Mapping
    GST_STATE_CODES: Dict[str, str] = {
        "01": "Jammu and Kashmir",
        "02": "Himachal Pradesh",
        "03": "Punjab",
        "04": "Chandigarh",
        "05": "Uttarakhand",
        "06": "Haryana",
        "07": "Delhi",
        "08": "Rajasthan",
        "09": "Uttar Pradesh",
        "10": "Bihar",
        "11": "Sikkim",
        "12": "Arunachal Pradesh",
        "13": "Nagaland",
        "14": "Manipur",
        "15": "Mizoram",
        "16": "Tripura",
        "17": "Meghalaya",
        "18": "Assam",
        "19": "West Bengal",
        "20": "Jharkhand",
        "21": "Odisha",
        "22": "Chhattisgarh",
        "23": "Madhya Pradesh",
        "24": "Gujarat",
        "26": "Dadra and Nagar Haveli and Daman and Diu",
        "27": "Maharashtra",
        "28": "Andhra Pradesh (Old)",
        "29": "Karnataka",
        "30": "Goa",
        "31": "Lakshadweep",
        "32": "Kerala",
        "33": "Tamil Nadu",
        "34": "Puducherry",
        "35": "Andaman and Nicobar Islands",
        "36": "Telangana",
        "37": "Andhra Pradesh (New)",
        "38": "Ladakh",
        "97": "Other Territory",
        "99": "Centre Jurisdiction"
    }

    # Standard GST Rate Slabs in India
    STANDARD_GST_RATES: List[float] = [0.0, 5.0, 12.0, 18.0, 28.0]

settings = Settings()
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
