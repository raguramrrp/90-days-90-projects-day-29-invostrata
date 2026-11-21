from decimal import Decimal
from datetime import date
import pytest
from app.core.validator import ValidationEngine
from app.models.entities import Invoice, InvoiceLineItem

def test_gstin_invalid_format():
    engine = ValidationEngine()
    inv = Invoice(
        id="TEST-GST-01",
        invoice_number="INV-01",
        invoice_date=date.today().isoformat(),
        vendor_name="ABC Corp",
        vendor_gstin="INVALID123"  # Not 15 characters
    )
    results = engine.validate_invoice(inv)
    format_failures = [r for r in results if r["rule_code"] == "GST_INVALID_VENDOR_FORMAT"]
    assert len(format_failures) == 1

def test_gstin_invalid_state_code():
    engine = ValidationEngine()
    inv = Invoice(
        id="TEST-GST-02",
        invoice_number="INV-02",
        invoice_date=date.today().isoformat(),
        vendor_name="ABC Corp",
        vendor_gstin="99AABCU9603R1ZM"  # 99 is Centre Jurisdiction, test 95 invalid
    )
    inv.vendor_gstin = "00AABCU9603R1ZM"  # 00 is invalid
    results = engine.validate_invoice(inv)
    state_failures = [r for r in results if r["rule_code"] == "GST_INVALID_VENDOR_STATE"]
    assert len(state_failures) == 1

def test_intrastate_requires_cgst_sgst_not_igst():
    engine = ValidationEngine()
    inv = Invoice(
        id="TEST-GST-03",
        invoice_number="INV-03",
        invoice_date=date.today().isoformat(),
        vendor_name="Vendor Karnataka",
        vendor_gstin="29AABCU9603R1ZM",  # State 29
        pos_state_code="29",              # POS State 29 (Intra-state)
        subtotal=Decimal("1000.00"),
        cgst_amount=Decimal("0.00"),
        sgst_amount=Decimal("0.00"),
        igst_amount=Decimal("180.00"),   # Erroneously charged IGST!
        total_tax=Decimal("180.00"),
        grand_total=Decimal("1180.00")
    )
    results = engine.validate_invoice(inv)
    igst_errors = [r for r in results if r["rule_code"] == "GST_INVALID_IGST_ON_INTRASTATE"]
    assert len(igst_errors) == 1
    assert igst_errors[0]["severity"] == "CRITICAL"

def test_interstate_requires_igst():
    engine = ValidationEngine()
    inv = Invoice(
        id="TEST-GST-04",
        invoice_number="INV-04",
        invoice_date=date.today().isoformat(),
        vendor_name="Vendor Maharashtra",
        vendor_gstin="27AAACA1234E1ZR",  # State 27
        pos_state_code="29",              # POS State 29 (Inter-state)
        subtotal=Decimal("1000.00"),
        cgst_amount=Decimal("90.00"),    # Erroneously charged CGST + SGST!
        sgst_amount=Decimal("90.00"),
        igst_amount=Decimal("0.00"),
        total_tax=Decimal("180.00"),
        grand_total=Decimal("1180.00")
    )
    results = engine.validate_invoice(inv)
    interstate_errors = [r for r in results if r["rule_code"] == "GST_INVALID_CGST_SGST_ON_INTERSTATE"]
    assert len(interstate_errors) == 1
