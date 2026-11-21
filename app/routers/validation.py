from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.entities import Invoice, ValidationResult, Vendor, AuditLog
from app.core.validator import ValidationEngine
from app.core.duplicate_detector import DuplicateDetector
from app.core.anomaly_engine import AnomalyEngine
from app.schemas.schemas import ValidationResultResponse, ReviewExceptionRequest

router = APIRouter(tags=["Validation Engine"])
validator = ValidationEngine()

class BatchValidateRequest(BaseModel):
    invoice_ids: List[str]

@router.post("/api/invoices/{invoice_id}/validate")
def validate_single_invoice(invoice_id: str, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    vendor = inv.vendor
    if not vendor and inv.vendor_gstin:
        vendor = db.query(Vendor).filter(Vendor.gstin == inv.vendor_gstin).first()

    # Clear prior validation results
    db.query(ValidationResult).filter(ValidationResult.invoice_id == invoice_id).delete()

    # Run validation
    val_issues = validator.validate_invoice(inv, vendor)
    for issue in val_issues:
        vr = ValidationResult(
            invoice_id=inv.id,
            rule_code=issue["rule_code"],
            category=issue["category"],
            severity=issue["severity"],
            status=issue["status"],
            expected_value=issue.get("expected_value"),
            actual_value=issue.get("actual_value"),
            difference=issue.get("difference"),
            explanation=issue["explanation"],
            suggested_correction=issue.get("suggested_correction"),
            evidence_source=issue.get("evidence_source")
        )
        db.add(vr)

    # Re-evaluate duplicate and anomalies
    dup_detector = DuplicateDetector(db)
    dups = dup_detector.check_duplicates(inv)

    anomaly_engine = AnomalyEngine(db)
    anomalies = anomaly_engine.investigate(inv)

    criticals = len([iss for iss in val_issues if iss["severity"] == "CRITICAL"])
    warnings = len([iss for iss in val_issues if iss["severity"] == "WARNING"])
    
    if len(dups) > 0:
        inv.validation_status = "DUPLICATE_SUSPECTED"
    elif criticals > 0:
        inv.validation_status = "FAILED"
    elif warnings > 0:
        inv.validation_status = "PASSED_WITH_WARNINGS"
    else:
        inv.validation_status = "PASSED"

    inv.updated_at = datetime.utcnow()

    # Audit log
    audit = AuditLog(
        user="analyst",
        action="REVALIDATE_INVOICE",
        entity_type="INVOICE",
        entity_id=inv.id,
        details={"status": inv.validation_status, "critical_issues": criticals, "warnings": warnings}
    )
    db.add(audit)

    db.commit()
    db.refresh(inv)

    return {
        "status": "SUCCESS",
        "invoice_id": inv.id,
        "validation_status": inv.validation_status,
        "issues_found": len(val_issues),
        "critical_count": criticals,
        "warning_count": warnings
    }

@router.post("/api/validation/batch")
def batch_validate(req: BatchValidateRequest, db: Session = Depends(get_db)):
    results = []
    for inv_id in req.invoice_ids:
        try:
            res = validate_single_invoice(invoice_id=inv_id, db=db)
            results.append(res)
        except Exception as e:
            results.append({"status": "ERROR", "invoice_id": inv_id, "error": str(e)})
    return {"total": len(req.invoice_ids), "results": results}

@router.get("/api/invoices/{invoice_id}/validation")
def get_invoice_validation_details(invoice_id: str, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    results = db.query(ValidationResult).filter(ValidationResult.invoice_id == invoice_id).all()

    # Group results
    grouped = {
        "ARITHMETIC": [],
        "TAX_GST": [],
        "DATE": [],
        "VENDOR": [],
        "BASIC": []
    }
    for r in results:
        cat = r.category if r.category in grouped else "BASIC"
        grouped[cat].append({
            "id": r.id,
            "rule_code": r.rule_code,
            "severity": r.severity,
            "status": r.status,
            "expected_value": r.expected_value,
            "actual_value": r.actual_value,
            "difference": r.difference,
            "explanation": r.explanation,
            "suggested_correction": r.suggested_correction,
            "evidence_source": r.evidence_source,
            "is_reviewed": r.is_reviewed,
            "review_note": r.review_note
        })

    return {
        "invoice_id": invoice_id,
        "overall_status": inv.validation_status,
        "total_exceptions": len(results),
        "grouped_checks": grouped
    }

@router.get("/api/exceptions")
def get_exceptions_ledger(
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, WARNING"),
    category: Optional[str] = Query(None, description="Filter by category: ARITHMETIC, TAX_GST, DATE, VENDOR"),
    is_reviewed: Optional[bool] = Query(None, description="Filter reviewed status"),
    search: Optional[str] = Query(None, description="Search by invoice number or rule code"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(ValidationResult).join(Invoice)

    if severity and severity != "ALL":
        query = query.filter(ValidationResult.severity == severity)

    if category and category != "ALL":
        query = query.filter(ValidationResult.category == category)

    if is_reviewed is not None:
        query = query.filter(ValidationResult.is_reviewed == is_reviewed)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (ValidationResult.rule_code.ilike(search_fmt)) |
            (ValidationResult.explanation.ilike(search_fmt)) |
            (Invoice.invoice_number.ilike(search_fmt)) |
            (Invoice.vendor_name.ilike(search_fmt))
        )

    total_count = query.count()
    results = query.order_by(desc(ValidationResult.created_at)).offset(offset).limit(limit).all()

    items = []
    for r in results:
        items.append({
            "id": r.id,
            "invoice_id": r.invoice_id,
            "invoice_number": r.invoice.invoice_number if r.invoice else "N/A",
            "vendor_name": r.invoice.vendor_name if r.invoice else "N/A",
            "rule_code": r.rule_code,
            "category": r.category,
            "severity": r.severity,
            "status": r.status,
            "expected_value": r.expected_value,
            "actual_value": r.actual_value,
            "difference": r.difference,
            "explanation": r.explanation,
            "suggested_correction": r.suggested_correction,
            "evidence_source": r.evidence_source,
            "is_reviewed": r.is_reviewed,
            "review_note": r.review_note,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
        })

    return {"total": total_count, "items": items}

@router.post("/api/exceptions/{exception_id}/review")
def review_exception(exception_id: int, req: ReviewExceptionRequest, db: Session = Depends(get_db)):
    res = db.query(ValidationResult).filter(ValidationResult.id == exception_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Exception record not found")

    res.is_reviewed = True
    res.review_note = req.review_note
    res.reviewed_at = datetime.utcnow()

    audit = AuditLog(
        user="analyst",
        action="REVIEW_EXCEPTION",
        entity_type="VALIDATION_RESULT",
        entity_id=str(exception_id),
        details={"rule_code": res.rule_code, "note": req.review_note}
    )
    db.add(audit)

    db.commit()
    return {"status": "SUCCESS", "message": "Exception marked as reviewed with audit note."}
