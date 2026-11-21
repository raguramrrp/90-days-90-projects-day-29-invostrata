from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import Invoice, ApprovalHistory, AuditLog, ExtractedField
from app.core.validator import ValidationEngine
from app.core.decimal_math import to_decimal

router = APIRouter(prefix="/api/invoices", tags=["Workflow & Approvals"])
validator = ValidationEngine()

class WorkflowActionRequest(BaseModel):
    comments: Optional[str] = "Standard financial review."

class CorrectionRequest(BaseModel):
    field_updates: Dict[str, Any]
    reason: str

@router.post("/{invoice_id}/approve")
def approve_invoice(invoice_id: str, req: WorkflowActionRequest, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    from_status = inv.validation_status
    inv.validation_status = "APPROVED"
    inv.updated_at = datetime.utcnow()

    # Record approval history
    ah = ApprovalHistory(
        invoice_id=inv.id,
        user_id=1,
        action="APPROVED",
        from_status=from_status,
        to_status="APPROVED",
        comments=req.comments,
        timestamp=datetime.utcnow()
    )
    db.add(ah)

    audit = AuditLog(
        user="financial_controller",
        action="APPROVE_INVOICE",
        entity_type="INVOICE",
        entity_id=inv.id,
        details={"from_status": from_status, "to_status": "APPROVED", "comments": req.comments}
    )
    db.add(audit)

    db.commit()
    return {"status": "SUCCESS", "invoice_id": inv.id, "validation_status": "APPROVED", "message": "Invoice approved for payment."}

@router.post("/{invoice_id}/reject")
def reject_invoice(invoice_id: str, req: WorkflowActionRequest, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    from_status = inv.validation_status
    inv.validation_status = "REJECTED"
    inv.updated_at = datetime.utcnow()

    ah = ApprovalHistory(
        invoice_id=inv.id,
        user_id=1,
        action="REJECTED",
        from_status=from_status,
        to_status="REJECTED",
        comments=req.comments,
        timestamp=datetime.utcnow()
    )
    db.add(ah)

    audit = AuditLog(
        user="financial_controller",
        action="REJECT_INVOICE",
        entity_type="INVOICE",
        entity_id=inv.id,
        details={"from_status": from_status, "to_status": "REJECTED", "comments": req.comments}
    )
    db.add(audit)

    db.commit()
    return {"status": "SUCCESS", "invoice_id": inv.id, "validation_status": "REJECTED", "message": "Invoice rejected with documented reasons."}

@router.post("/{invoice_id}/correct")
def correct_invoice_fields(invoice_id: str, req: CorrectionRequest, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    for field_name, new_val in req.field_updates.items():
        if hasattr(inv, field_name):
            old_val = getattr(inv, field_name)
            # Store in extracted fields audit trail
            ef = ExtractedField(
                invoice_id=inv.id,
                field_name=field_name,
                original_value=str(old_val),
                corrected_value=str(new_val),
                confidence=1.0,
                is_manually_edited=True
            )
            db.add(ef)
            setattr(inv, field_name, to_decimal(new_val) if isinstance(old_val, Decimal) else new_val)

    # Re-run validation engine
    val_issues = validator.validate_invoice(inv, inv.vendor)
    criticals = len([iss for iss in val_issues if iss["severity"] == "CRITICAL"])
    warnings = len([iss for iss in val_issues if iss["severity"] == "WARNING"])
    
    inv.validation_status = "FAILED" if criticals > 0 else ("PASSED_WITH_WARNINGS" if warnings > 0 else "PASSED")
    inv.updated_at = datetime.utcnow()

    audit = AuditLog(
        user="analyst",
        action="CORRECT_FIELDS",
        entity_type="INVOICE",
        entity_id=inv.id,
        details={"reason": req.reason, "updated_fields": list(req.field_updates.keys()), "new_status": inv.validation_status}
    )
    db.add(audit)

    db.commit()
    return {
        "status": "SUCCESS",
        "invoice_id": inv.id,
        "new_validation_status": inv.validation_status,
        "message": "Fields updated and invoice re-validated successfully."
    }
