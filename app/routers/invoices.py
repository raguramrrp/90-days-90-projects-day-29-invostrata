from datetime import datetime
from decimal import Decimal
import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.config import settings
from app.models.entities import (
    Invoice, InvoiceLineItem, InvoiceDocument, ExtractedField,
    Vendor, ValidationResult, DuplicateMatch, AnomalyResult, AuditLog, ApprovalHistory
)
from app.schemas.schemas import InvoiceResponse, InvoiceCreate, InvoiceUpdate
from app.core.extractor import DocumentExtractor
from app.core.validator import ValidationEngine
from app.core.duplicate_detector import DuplicateDetector
from app.core.anomaly_engine import AnomalyEngine
from app.core.decimal_math import to_decimal, quantize_money

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])
extractor = DocumentExtractor()
validator = ValidationEngine()

@router.get("", response_model=List[InvoiceResponse])
def get_invoices(
    search: Optional[str] = None,
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Invoice)

    if search and isinstance(search, str) and search.strip():
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(search_fmt),
                Invoice.vendor_name.ilike(search_fmt),
                Invoice.customer_name.ilike(search_fmt),
                Invoice.id.ilike(search_fmt),
                Invoice.po_number.ilike(search_fmt)
            )
        )

    if status and isinstance(status, str) and status != "ALL":
        query = query.filter(Invoice.validation_status == status)

    if vendor_id and isinstance(vendor_id, int):
        query = query.filter(Invoice.vendor_id == vendor_id)

    if date_from and isinstance(date_from, str):
        query = query.filter(Invoice.invoice_date >= date_from)

    if date_to and isinstance(date_to, str):
        query = query.filter(Invoice.invoice_date <= date_to)

    if min_amount is not None and isinstance(min_amount, (int, float)):
        query = query.filter(Invoice.grand_total >= min_amount)

    if max_amount is not None and isinstance(max_amount, (int, float)):
        query = query.filter(Invoice.grand_total <= max_amount)

    limit_val = limit if isinstance(limit, int) else 100
    offset_val = offset if isinstance(offset, int) else 0

    invoices = query.order_by(desc(Invoice.created_at)).offset(offset_val).limit(limit_val).all()
    return invoices

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: str, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv

@router.get("/{invoice_id}/document")
def get_invoice_document(invoice_id: str, db: Session = Depends(get_db)):
    doc = db.query(InvoiceDocument).filter(InvoiceDocument.invoice_id == invoice_id).first()
    if not doc or not os.path.exists(doc.file_path):
        # Fall back to standard storage path
        alt_path = settings.STORAGE_DIR / f"{invoice_id}.pdf"
        if alt_path.exists():
            return FileResponse(path=str(alt_path), media_type="application/pdf", filename=f"{invoice_id}.pdf")
        raise HTTPException(status_code=404, detail="Document file not found on storage")
    return FileResponse(path=doc.file_path, media_type=doc.mime_type, filename=os.path.basename(doc.file_path))

@router.post("/upload", response_model=InvoiceResponse)
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    filename = file.filename or "invoice.pdf"
    content = await file.read()

    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed upload size (25MB)")

    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {ext} not permitted. Supported: {', '.join(settings.ALLOWED_EXTENSIONS)}")

    # Generate sequential invoice record ID
    count = db.query(Invoice).count() + 1
    invoice_id = f"INV-{datetime.utcnow().year}-{count:04d}"
    stored_name = f"{invoice_id}{ext}"
    dest_path = settings.STORAGE_DIR / stored_name

    with open(dest_path, "wb") as f:
        f.write(content)

    # Extract metadata
    try:
        extracted = extractor.extract_from_file(dest_path, filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Document parsing failure: {str(e)}")

    # Find or associate vendor
    vendor = None
    if extracted.get("vendor_gstin"):
        vendor = db.query(Vendor).filter(Vendor.gstin == extracted["vendor_gstin"]).first()
    if not vendor and extracted.get("vendor_name"):
        vendor = db.query(Vendor).filter(Vendor.name.ilike(f"%{extracted['vendor_name'][:30]}%")).first()

    inv = Invoice(
        id=invoice_id,
        original_filename=filename,
        stored_filename=stored_name,
        file_type=ext.lstrip("."),
        file_size=len(content),
        sha256_hash=extracted["file_hash"],
        invoice_number=extracted.get("invoice_number"),
        invoice_date=extracted.get("invoice_date"),
        due_date=extracted.get("due_date"),
        vendor_id=vendor.id if vendor else None,
        vendor_name=extracted.get("vendor_name"),
        vendor_gstin=extracted.get("vendor_gstin"),
        vendor_address=extracted.get("vendor_address"),
        customer_name=extracted.get("customer_name"),
        customer_gstin=extracted.get("customer_gstin"),
        place_of_supply=extracted.get("place_of_supply"),
        pos_state_code=extracted.get("pos_state_code"),
        currency="INR",
        po_number=extracted.get("po_number"),
        subtotal=to_decimal(extracted.get("subtotal")),
        discount_amount=to_decimal(extracted.get("discount_amount")),
        taxable_amount=to_decimal(extracted.get("taxable_amount")),
        cgst_amount=to_decimal(extracted.get("cgst_amount")),
        sgst_amount=to_decimal(extracted.get("sgst_amount")),
        igst_amount=to_decimal(extracted.get("igst_amount")),
        total_tax=to_decimal(extracted.get("total_tax")),
        other_charges=to_decimal(extracted.get("other_charges")),
        round_off=to_decimal(extracted.get("round_off")),
        grand_total=to_decimal(extracted.get("grand_total")),
        validation_status="NEEDS_REVIEW",
        extraction_confidence=extracted.get("extraction_confidence", 0.85),
        is_synthetic=False,
        notes="Uploaded document ingested successfully."
    )
    db.add(inv)
    db.flush()

    # Add line items
    for itm in extracted.get("line_items", []):
        li = InvoiceLineItem(
            invoice_id=inv.id,
            line_number=itm.get("line_number", 1),
            description=itm.get("description", "Item"),
            hsn_sac=itm.get("hsn_sac"),
            quantity=to_decimal(itm.get("quantity")),
            unit=itm.get("unit", "PCS"),
            unit_price=to_decimal(itm.get("unit_price")),
            item_discount=to_decimal(itm.get("item_discount")),
            taxable_value=to_decimal(itm.get("taxable_value")),
            gst_rate=to_decimal(itm.get("gst_rate")),
            cgst_amount=to_decimal(itm.get("cgst_amount")),
            sgst_amount=to_decimal(itm.get("sgst_amount")),
            igst_amount=to_decimal(itm.get("igst_amount")),
            total_amount=to_decimal(itm.get("total_amount"))
        )
        db.add(li)

    # Document record
    doc_rec = InvoiceDocument(
        invoice_id=inv.id,
        file_path=str(dest_path),
        file_hash=extracted["file_hash"],
        mime_type=file.content_type or "application/octet-stream",
        page_count=extracted.get("page_count", 1),
        raw_text=extracted.get("raw_text", ""),
        extracted_json=extracted
    )
    db.add(doc_rec)

    # Store extracted fields audit baseline
    for field, val in extracted.items():
        if field not in ["line_items", "raw_text"]:
            ef = ExtractedField(
                invoice_id=inv.id,
                field_name=field,
                original_value=str(val),
                corrected_value=str(val),
                confidence=extracted.get("extraction_confidence", 0.90)
            )
            db.add(ef)

    # Trigger initial validation pass
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

    # Check duplicates
    dup_detector = DuplicateDetector(db)
    dups = dup_detector.check_duplicates(inv)
    for d in dups:
        dm = DuplicateMatch(
            invoice_id=inv.id,
            matched_invoice_id=d["matched_invoice_id"],
            match_type=d["match_type"],
            confidence_score=d["confidence_score"],
            matched_fields=d.get("matched_fields", []),
            resolution_note=d.get("explanation")
        )
        db.add(dm)

    # Check anomalies
    anomaly_engine = AnomalyEngine(db)
    anomalies = anomaly_engine.investigate(inv)
    for a in anomalies:
        ar = AnomalyResult(
            invoice_id=inv.id,
            anomaly_type=a["anomaly_type"],
            severity=a["severity"],
            score=a["score"],
            explanation=a["explanation"],
            recommended_action=a["recommended_action"]
        )
        db.add(ar)

    # Update overall status
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

    # Audit log
    audit = AuditLog(
        user="analyst",
        action="UPLOAD_INVOICE",
        entity_type="INVOICE",
        entity_id=inv.id,
        details={"filename": filename, "status": inv.validation_status, "grand_total": float(inv.grand_total)}
    )
    db.add(audit)

    db.commit()
    db.refresh(inv)
    return inv

@router.post("/bulk-upload")
async def bulk_upload_invoices(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    results = []
    for file in files:
        try:
            res = await upload_invoice(file=file, db=db)
            results.append({"filename": file.filename, "status": "SUCCESS", "invoice_id": res.id})
        except Exception as e:
            results.append({"filename": file.filename, "status": "ERROR", "error": str(e)})
    return {"total": len(files), "results": results}

@router.post("/manual", response_model=InvoiceResponse)
def create_manual_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    count = db.query(Invoice).count() + 1
    invoice_id = f"INV-{datetime.utcnow().year}-{count:04d}"

    vendor = None
    if payload.vendor_gstin:
        vendor = db.query(Vendor).filter(Vendor.gstin == payload.vendor_gstin).first()
    if not vendor:
        vendor = db.query(Vendor).filter(Vendor.name.ilike(f"%{payload.vendor_name[:30]}%")).first()

    inv = Invoice(
        id=invoice_id,
        original_filename="manual_entry.pdf",
        stored_filename=f"{invoice_id}.pdf",
        file_type="manual",
        file_size=0,
        sha256_hash=f"manual_{datetime.utcnow().timestamp()}",
        invoice_number=payload.invoice_number,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        vendor_id=vendor.id if vendor else None,
        vendor_name=payload.vendor_name,
        vendor_gstin=payload.vendor_gstin,
        vendor_address=payload.vendor_address,
        customer_name=payload.customer_name,
        customer_gstin=payload.customer_gstin,
        place_of_supply=payload.place_of_supply,
        pos_state_code=payload.pos_state_code,
        currency=payload.currency,
        po_number=payload.po_number,
        subtotal=to_decimal(payload.subtotal),
        discount_amount=to_decimal(payload.discount_amount),
        taxable_amount=to_decimal(payload.taxable_amount),
        cgst_amount=to_decimal(payload.cgst_amount),
        sgst_amount=to_decimal(payload.sgst_amount),
        igst_amount=to_decimal(payload.igst_amount),
        total_tax=to_decimal(payload.total_tax),
        other_charges=to_decimal(payload.other_charges),
        round_off=to_decimal(payload.round_off),
        grand_total=to_decimal(payload.grand_total),
        validation_status="NEEDS_REVIEW",
        extraction_confidence=1.0,
        is_synthetic=False,
        notes=payload.notes or "Manually entered invoice."
    )
    db.add(inv)
    db.flush()

    for idx, item in enumerate(payload.line_items, 1):
        li = InvoiceLineItem(
            invoice_id=inv.id,
            line_number=idx,
            description=item.description,
            hsn_sac=item.hsn_sac,
            quantity=to_decimal(item.quantity),
            unit=item.unit,
            unit_price=to_decimal(item.unit_price),
            item_discount=to_decimal(item.item_discount),
            taxable_value=to_decimal(item.taxable_value),
            gst_rate=to_decimal(item.gst_rate),
            cgst_amount=to_decimal(item.cgst_amount),
            sgst_amount=to_decimal(item.sgst_amount),
            igst_amount=to_decimal(item.igst_amount),
            total_amount=to_decimal(item.total_amount)
        )
        db.add(li)

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

    criticals = len([iss for iss in val_issues if iss["severity"] == "CRITICAL"])
    warnings = len([iss for iss in val_issues if iss["severity"] == "WARNING"])
    inv.validation_status = "FAILED" if criticals > 0 else ("PASSED_WITH_WARNINGS" if warnings > 0 else "PASSED")

    db.commit()
    db.refresh(inv)
    return inv

@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(invoice_id: str, payload: InvoiceUpdate, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = payload.dict(exclude_unset=True)
    for key, val in update_data.items():
        if val is not None:
            # Audit field change
            old_val = getattr(inv, key, None)
            ef = ExtractedField(
                invoice_id=inv.id,
                field_name=key,
                original_value=str(old_val),
                corrected_value=str(val),
                is_manually_edited=True
            )
            db.add(ef)
            setattr(inv, key, to_decimal(val) if isinstance(getattr(inv, key), Decimal) else val)

    inv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(inv)
    return inv

@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: str, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(inv)
    db.commit()
    return {"status": "SUCCESS", "message": f"Invoice {invoice_id} deleted."}
