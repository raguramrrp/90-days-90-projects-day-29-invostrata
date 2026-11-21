from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.entities import Vendor, Invoice, ValidationResult, DuplicateMatch, AnomalyResult, AuditLog
from app.schemas.schemas import VendorResponse, VendorCreate
from app.core.decimal_math import to_decimal

router = APIRouter(prefix="/api/vendors", tags=["Vendors"])

@router.get("", response_model=List[VendorResponse])
def get_vendors(
    search: Optional[str] = Query(None, description="Search vendor name or GSTIN"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, BLOCKED"),
    db: Session = Depends(get_db)
):
    query = db.query(Vendor)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter((Vendor.name.ilike(search_fmt)) | (Vendor.gstin.ilike(search_fmt)))

    if status and status != "ALL":
        query = query.filter(Vendor.status == status)

    vendors = query.order_by(Vendor.name).all()

    # Calculate real statistics from actual stored invoices
    results = []
    for v in vendors:
        invoices = db.query(Invoice).filter(Invoice.vendor_id == v.id).all()
        inv_count = len(invoices)
        total_billed = sum([float(to_decimal(i.grand_total)) for i in invoices])
        passed_count = sum([1 for i in invoices if "PASS" in i.validation_status])
        pass_rate = round((passed_count / inv_count * 100.0), 1) if inv_count > 0 else 100.0

        # Discrepancies count
        inv_ids = [i.id for i in invoices]
        disc_count = db.query(ValidationResult).filter(ValidationResult.invoice_id.in_(inv_ids)).count() if inv_ids else 0

        # Last invoice date
        dates = [i.invoice_date for i in invoices if i.invoice_date]
        last_date = max(dates) if dates else None

        results.append({
            "id": v.id,
            "name": v.name,
            "gstin": v.gstin,
            "pan": v.pan,
            "address": v.address,
            "city": v.city,
            "state": v.state,
            "state_code": v.state_code,
            "email": v.email,
            "phone": v.phone,
            "bank_name": v.bank_name,
            "account_number": v.account_number,
            "ifsc_code": v.ifsc_code,
            "status": v.status,
            "invoice_count": inv_count,
            "total_billed": round(total_billed, 2),
            "pass_rate": pass_rate,
            "discrepancy_count": disc_count,
            "last_invoice_date": last_date,
            "created_at": v.created_at
        })

    return results

@router.get("/{vendor_id}")
def get_vendor_details(vendor_id: int, db: Session = Depends(get_db)):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    invoices = db.query(Invoice).filter(Invoice.vendor_id == v.id).order_by(desc(Invoice.created_at)).all()
    inv_ids = [i.id for i in invoices]

    total_billed = sum([float(to_decimal(i.grand_total)) for i in invoices])
    passed_count = sum([1 for i in invoices if "PASS" in i.validation_status])
    pass_rate = round((passed_count / len(invoices) * 100.0), 1) if invoices else 100.0

    dups_count = db.query(DuplicateMatch).filter(DuplicateMatch.invoice_id.in_(inv_ids)).count() if inv_ids else 0
    anomalies_count = db.query(AnomalyResult).filter(AnomalyResult.invoice_id.in_(inv_ids)).count() if inv_ids else 0
    exceptions = db.query(ValidationResult).filter(ValidationResult.invoice_id.in_(inv_ids)).count() if inv_ids else 0

    return {
        "vendor": {
            "id": v.id,
            "name": v.name,
            "gstin": v.gstin,
            "pan": v.pan,
            "address": v.address,
            "city": v.city,
            "state": v.state,
            "state_code": v.state_code,
            "email": v.email,
            "phone": v.phone,
            "bank_name": v.bank_name,
            "account_number": v.account_number,
            "ifsc_code": v.ifsc_code,
            "status": v.status,
            "created_at": v.created_at
        },
        "stats": {
            "invoice_count": len(invoices),
            "total_billed": round(total_billed, 2),
            "pass_rate": pass_rate,
            "duplicate_count": dups_count,
            "anomaly_warnings": anomalies_count,
            "exception_count": exceptions,
            "gstin_consistent": bool(v.gstin and v.gstin.startswith(v.state_code or ""))
        },
        "invoices": [
            {
                "id": i.id,
                "invoice_number": i.invoice_number,
                "invoice_date": i.invoice_date,
                "grand_total": float(to_decimal(i.grand_total)),
                "total_tax": float(to_decimal(i.total_tax)),
                "validation_status": i.validation_status
            }
            for i in invoices
        ]
    }

@router.post("", response_model=VendorResponse)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db)):
    if payload.gstin:
        existing = db.query(Vendor).filter(Vendor.gstin == payload.gstin).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Vendor with GSTIN {payload.gstin} already registered.")

    v = Vendor(**payload.dict())
    db.add(v)
    db.commit()
    db.refresh(v)

    audit = AuditLog(
        user="analyst",
        action="CREATE_VENDOR",
        entity_type="VENDOR",
        entity_id=str(v.id),
        details={"name": v.name, "gstin": v.gstin}
    )
    db.add(audit)
    db.commit()

    return {
        **payload.dict(),
        "id": v.id,
        "invoice_count": 0,
        "total_billed": 0.0,
        "pass_rate": 100.0,
        "discrepancy_count": 0,
        "last_invoice_date": None,
        "created_at": v.created_at
    }

@router.patch("/{vendor_id}")
def update_vendor(vendor_id: int, payload: dict, db: Session = Depends(get_db)):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    for k, val in payload.items():
        if hasattr(v, k):
            setattr(v, k, val)

    v.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(v)
    return v
