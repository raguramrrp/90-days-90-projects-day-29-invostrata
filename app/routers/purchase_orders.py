from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import PurchaseOrder, PurchaseOrderItem, GoodsReceivedRecord, Invoice, Vendor
from app.core.matching_engine import ThreeWayMatchingEngine
from app.core.decimal_math import to_decimal, quantize_money

router = APIRouter(tags=["Procurement & Three-Way Matching"])

class POItemCreate(BaseModel):
    item_description: str
    quantity: float
    unit_price: float

class POCreate(BaseModel):
    po_number: str
    vendor_id: int
    po_date: str
    items: List[POItemCreate]

@router.get("/api/purchase-orders")
def get_purchase_orders(db: Session = Depends(get_db)):
    pos = db.query(PurchaseOrder).all()
    results = []
    for p in pos:
        results.append({
            "id": p.id,
            "po_number": p.po_number,
            "vendor_name": p.vendor.name if p.vendor else "Unknown",
            "po_date": p.po_date,
            "total_amount": float(to_decimal(p.total_amount)),
            "status": p.status,
            "items_count": len(p.items),
            "grn_count": len(p.grns),
            "items": [
                {
                    "description": itm.item_description,
                    "quantity": float(to_decimal(itm.quantity)),
                    "unit_price": float(to_decimal(itm.unit_price)),
                    "total_amount": float(to_decimal(itm.total_amount))
                }
                for itm in p.items
            ]
        })
    return results

@router.post("/api/purchase-orders")
def create_purchase_order(payload: POCreate, db: Session = Depends(get_db)):
    existing = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == payload.po_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"PO #{payload.po_number} already exists.")

    total_amt = Decimal("0.00")
    for itm in payload.items:
        total_amt += quantize_money(to_decimal(itm.quantity) * to_decimal(itm.unit_price))

    po = PurchaseOrder(
        po_number=payload.po_number,
        vendor_id=payload.vendor_id,
        po_date=payload.po_date,
        total_amount=total_amt,
        status="ISSUED"
    )
    db.add(po)
    db.flush()

    for idx, itm in enumerate(payload.items, 1):
        pi = PurchaseOrderItem(
            po_id=po.id,
            line_number=idx,
            item_description=itm.item_description,
            quantity=to_decimal(itm.quantity),
            unit_price=to_decimal(itm.unit_price),
            total_amount=quantize_money(to_decimal(itm.quantity) * to_decimal(itm.unit_price))
        )
        db.add(pi)

    db.commit()
    return {"status": "SUCCESS", "po_id": po.id, "po_number": po.po_number, "total_amount": float(total_amt)}

@router.get("/api/invoices/{invoice_id}/matching")
def get_invoice_three_way_match(invoice_id: str, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    engine = ThreeWayMatchingEngine(db)
    result = engine.match_invoice(inv)
    return result
