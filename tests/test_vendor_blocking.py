import pytest
from app.models.entities import Vendor, Invoice
from app.core.validator import ValidationEngine
from app.routers.reports import export_pdf_direct, export_csv_direct
from app.routers.vendors import update_vendor

def test_blocked_vendor_triggers_validation_failure(db_session):
    engine = ValidationEngine()

    # 1. Create a test vendor and invoice
    vendor = Vendor(
        name="Restricted Test Supplier Pvt Ltd",
        gstin="29AAACR1234D1ZM",
        state="Karnataka",
        state_code="29",
        status="ACTIVE"
    )
    db_session.add(vendor)
    db_session.commit()
    db_session.refresh(vendor)

    invoice = Invoice(
        id="INV-TEST-BLK-01",
        original_filename="test_blk.pdf",
        stored_filename="test_blk.pdf",
        file_type="pdf",
        file_size=1024,
        sha256_hash="dummyhashblocked001",
        invoice_number="BLK-101",
        invoice_date="2026-02-15",
        due_date="2026-03-15",
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        vendor_gstin=vendor.gstin,
        customer_name="ACME India Pvt Ltd",
        customer_gstin="29AABCA1234F1ZP",
        place_of_supply="Karnataka",
        pos_state_code="29",
        currency="INR",
        subtotal=10000.0,
        taxable_amount=10000.0,
        cgst_amount=900.0,
        sgst_amount=900.0,
        igst_amount=0.0,
        total_tax=1800.0,
        grand_total=11800.0,
        validation_status="PASSED"
    )
    db_session.add(invoice)
    db_session.commit()

    # 2. When vendor is ACTIVE, no VENDOR_BLOCKED issue
    res_active = engine.validate_invoice(invoice, vendor=vendor)
    assert not any(i["rule_code"] == "VENDOR_BLOCKED" for i in res_active)

    # 3. Block the vendor via API handler
    update_vendor(vendor_id=vendor.id, payload={"status": "BLOCKED"}, db=db_session)
    db_session.refresh(vendor)
    assert vendor.status == "BLOCKED"

    # 4. Now validation must trigger VENDOR_BLOCKED with CRITICAL severity
    res_blocked = engine.validate_invoice(invoice, vendor=vendor)
    blocked_issues = [i for i in res_blocked if i["rule_code"] == "VENDOR_BLOCKED"]
    assert len(blocked_issues) == 1
    assert blocked_issues[0]["severity"] == "CRITICAL"
    assert "payments is prohibited" in blocked_issues[0]["explanation"]

    # 5. Unblock the vendor
    update_vendor(vendor_id=vendor.id, payload={"status": "ACTIVE"}, db=db_session)
    db_session.refresh(vendor)
    assert vendor.status == "ACTIVE"

    res_unblocked = engine.validate_invoice(invoice, vendor=vendor)
    assert not any(i["rule_code"] == "VENDOR_BLOCKED" for i in res_unblocked)

def test_direct_report_export_endpoints(db_session):
    pdf_res = export_pdf_direct(db=db_session)
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.media_type

    csv_res = export_csv_direct(db=db_session)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.media_type
