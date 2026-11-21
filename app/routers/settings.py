from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.entities import ApplicationSetting, ValidationRule, AuditLog

router = APIRouter(tags=["Settings & Configuration"])

class SettingUpdate(BaseModel):
    settings: Dict[str, Any]

@router.get("/api/settings")
def get_system_settings():
    return {
        "project_name": settings.PROJECT_NAME,
        "project_title": settings.PROJECT_TITLE,
        "rounding_tolerance": settings.ROUNDING_TOLERANCE,
        "max_invoice_age_days": settings.MAX_INVOICE_AGE_DAYS,
        "high_discount_threshold": settings.HIGH_DISCOUNT_PERCENT,
        "round_number_modulo": settings.ROUND_NUMBER_MODULO,
        "standard_gst_rates": settings.STANDARD_GST_RATES,
        "gst_state_codes": settings.GST_STATE_CODES,
        "version": settings.VERSION,
        "database_engine": "SQLite / PostgreSQL (SQLAlchemy 2.0 Unified Connection)"
    }

@router.patch("/api/settings")
def update_system_settings(payload: SettingUpdate, db: Session = Depends(get_db)):
    for k, v in payload.settings.items():
        if hasattr(settings, k.upper()):
            setattr(settings, k.upper(), v)

    audit = AuditLog(
        user="admin",
        action="UPDATE_SETTINGS",
        entity_type="SYSTEM_SETTINGS",
        details=payload.settings
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": "Settings updated successfully."}

@router.get("/api/validation-rules")
def get_validation_rules():
    return [
        {
            "code": "REQ_INVOICE_NUM",
            "category": "BASIC",
            "name": "Invoice Number Mandatory",
            "description": "Invoice number must be present for statutory compliance.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "REQ_VENDOR_NAME",
            "category": "BASIC",
            "name": "Vendor Name Mandatory",
            "description": "Supplier name must be clearly stated on document.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "ARITH_SUBTOTAL_MISMATCH",
            "category": "ARITHMETIC",
            "name": "Line Item Subtotal Reconciliation",
            "description": "Sum of taxable line item values must equal stated subtotal.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "ARITH_GRAND_TOTAL_MISMATCH",
            "category": "ARITHMETIC",
            "name": "Grand Total Reconciliation",
            "description": "Grand total must equal Subtotal + Tax + Other Charges + Round Off.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "GST_INVALID_VENDOR_FORMAT",
            "category": "TAX_GST",
            "name": "GSTIN 15-Digit Format Validation",
            "description": "Vendor GSTIN must conform to 15-character alphanumeric statutory checksum.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "GST_CGST_SGST_ASYMMETRY",
            "category": "TAX_GST",
            "name": "Intra-State CGST/SGST Equality",
            "description": "Under Indian GST, CGST and SGST must be split equally for intra-state supply.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "GST_INVALID_IGST_ON_INTRASTATE",
            "category": "TAX_GST",
            "name": "Place of Supply Intra-state Consistency",
            "description": "IGST cannot be levied when supplier and place of supply are in the same state.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "DATE_FUTURE_DATED",
            "category": "DATE",
            "name": "Future Date Restriction",
            "description": "Invoice date cannot exceed current calendar date.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "DATE_DUE_BEFORE_INVOICE",
            "category": "DATE",
            "name": "Payment Due Date Sequence",
            "description": "Payment due date cannot precede the invoice issue date.",
            "severity": "CRITICAL",
            "enabled": True
        },
        {
            "code": "VENDOR_GSTIN_MISMATCH",
            "category": "VENDOR",
            "name": "Vendor Master GSTIN Match",
            "description": "Invoice vendor GSTIN must match registered corporate vendor master.",
            "severity": "CRITICAL",
            "enabled": True
        }
    ]

@router.get("/api/audit-logs")
def get_audit_history(limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user": l.user,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }
        for l in logs
    ]
