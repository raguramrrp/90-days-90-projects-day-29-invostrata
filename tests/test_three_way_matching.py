from decimal import Decimal
import pytest
from app.core.matching_engine import ThreeWayMatchingEngine
from app.models.entities import Invoice, InvoiceLineItem, PurchaseOrder, PurchaseOrderItem, GoodsReceivedRecord, Vendor

def test_matching_not_performed_when_no_po(db_session):
    engine = ThreeWayMatchingEngine(db_session)
    inv = Invoice(id="INV-MATCH-0", po_number=None)
    result = engine.match_invoice(inv)
    assert result["status"] == "NOT_PERFORMED"
    assert result["is_matched"] is False

def test_matching_success_all_aligned(db_session):
    vendor = Vendor(id=10, name="Apex Industrial Components Ltd")
    db_session.add(vendor)
    db_session.commit()

    po = PurchaseOrder(
        id=101,
        po_number="PO-TEST-100",
        vendor_id=vendor.id,
        po_date="2026-10-01",
        total_amount=Decimal("11800.00")
    )
    db_session.add(po)
    db_session.commit()

    po_item = PurchaseOrderItem(
        po_id=po.id,
        line_number=1,
        item_description="Pneumatic Valve 2-inch",
        quantity=Decimal("10.000"),
        unit_price=Decimal("1000.00"),
        total_amount=Decimal("10000.00")
    )
    db_session.add(po_item)

    grn = GoodsReceivedRecord(
        grn_number="GRN-TEST-100",
        po_id=po.id,
        receipt_date="2026-10-05",
        received_quantity=Decimal("10.000"),
        item_description="Pneumatic Valve 2-inch",
        status="ACCEPTED"
    )
    db_session.add(grn)
    db_session.commit()

    # Invoice
    inv = Invoice(
        id="INV-MATCH-1",
        original_filename="inv_match.pdf",
        stored_filename="inv_match.pdf",
        file_type="pdf",
        sha256_hash="dummy_hash_matching_test",
        po_number="PO-TEST-100",
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        grand_total=Decimal("11800.00")
    )
    inv_item = InvoiceLineItem(
        invoice_id=inv.id,
        line_number=1,
        description="Pneumatic Valve 2-inch",
        quantity=Decimal("10.000"),
        unit_price=Decimal("1000.00"),
        total_amount=Decimal("11800.00")
    )
    inv.line_items = [inv_item]
    db_session.add(inv)
    db_session.commit()

    engine = ThreeWayMatchingEngine(db_session)
    result = engine.match_invoice(inv)

    assert result["status"] == "MATCHED"
    assert result["is_matched"] is True
    assert len(result["discrepancies"]) == 0
