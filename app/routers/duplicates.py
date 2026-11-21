from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.entities import DuplicateMatch, Invoice, AuditLog
from app.schemas.schemas import ResolveDuplicateRequest

router = APIRouter(prefix="/api/duplicates", tags=["Duplicate Detection"])

@router.get("")
def get_duplicate_records(
    is_resolved: Optional[bool] = Query(None, description="Filter resolved status"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(DuplicateMatch)
    if is_resolved is not None:
        query = query.filter(DuplicateMatch.is_resolved == is_resolved)

    # Order by confidence score descending
    matches = query.order_by(desc(DuplicateMatch.confidence_score)).limit(limit).all()

    items = []
    seen_pairs = set()
    for m in matches:
        pair_key = tuple(sorted([m.invoice_id, m.matched_invoice_id]))
        if pair_key in seen_pairs:
            continue
        seen_pairs.add(pair_key)

        inv = db.query(Invoice).filter(Invoice.id == m.invoice_id).first()
        matched_inv = db.query(Invoice).filter(Invoice.id == m.matched_invoice_id).first()

        items.append({
            "id": m.id,
            "invoice_id": m.invoice_id,
            "invoice_number": inv.invoice_number if inv else "N/A",
            "vendor_name": inv.vendor_name if inv else "N/A",
            "invoice_date": inv.invoice_date if inv else "N/A",
            "grand_total": float(inv.grand_total) if inv else 0.0,
            "matched_invoice_id": m.matched_invoice_id,
            "matched_invoice_number": matched_inv.invoice_number if matched_inv else "N/A",
            "matched_vendor_name": matched_inv.vendor_name if matched_inv else "N/A",
            "matched_invoice_date": matched_inv.invoice_date if matched_inv else "N/A",
            "matched_grand_total": float(matched_inv.grand_total) if matched_inv else 0.0,
            "match_type": m.match_type,
            "confidence_score": m.confidence_score,
            "matched_fields": m.matched_fields,
            "is_resolved": m.is_resolved,
            "resolution_note": m.resolution_note,
            "resolved_at": m.resolved_at.strftime("%Y-%m-%d %H:%M") if m.resolved_at else None,
            "resolved_by": m.resolved_by,
            "created_at": m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else ""
        })

    return {"total": len(items), "items": items}

@router.post("/{match_id}/review")
def review_duplicate(match_id: int, req: ResolveDuplicateRequest, db: Session = Depends(get_db)):
    if not req.resolution_note or not req.resolution_note.strip():
        raise HTTPException(status_code=400, detail="Mandatory justification note is required to mark a duplicate as legitimate.")

    m = db.query(DuplicateMatch).filter(DuplicateMatch.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Duplicate match record not found")

    m.is_resolved = True
    m.resolution_note = req.resolution_note
    m.resolved_at = datetime.utcnow()
    m.resolved_by = "financial_analyst"

    # If all duplicates for this invoice are resolved, update invoice status from DUPLICATE_SUSPECTED to NEEDS_REVIEW or PASSED
    inv = db.query(Invoice).filter(Invoice.id == m.invoice_id).first()
    if inv:
        unresolved = db.query(DuplicateMatch).filter(
            DuplicateMatch.invoice_id == inv.id,
            DuplicateMatch.is_resolved == False
        ).count()
        if unresolved == 0:
            inv.validation_status = "PASSED_WITH_WARNINGS"

    audit = AuditLog(
        user="analyst",
        action="RESOLVE_DUPLICATE",
        entity_type="DUPLICATE_MATCH",
        entity_id=str(match_id),
        details={"invoice_id": m.invoice_id, "matched_with": m.matched_invoice_id, "justification": req.resolution_note}
    )
    db.add(audit)

    db.commit()
    return {"status": "SUCCESS", "message": "Duplicate match marked as legitimate with documented justification."}
