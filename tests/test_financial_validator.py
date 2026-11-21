from decimal import Decimal
from datetime import date, timedelta
import pytest
from app.core.validator import ValidationEngine
from app.models.entities import Invoice, InvoiceLineItem, Vendor

def test_arithmetic_valid_invoice():
    engine = ValidationEngine()
    inv = Invoice(
        id="TEST-001",
        invoice_number="INV-2026-01",
        invoice_date=date.today().isoformat(),
        vendor_name="Valid Vendor Ltd",
        vendor_gstin="29AABCU9603R1ZM",
        pos_state_code="29",
        place_of_supply="Karnataka",
        subtotal=Decimal("10000.00"),
        cgst_amount=Decimal("900.00"),
        sgst_amount=Decimal("900.00"),
        igst_amount=Decimal("0.00"),
        total_tax=Decimal("1800.00"),
        other_charges=Decimal("0.00"),
        round_off=Decimal("0.00"),
        grand_total=Decimal("11800.00")
    )
    item = InvoiceLineItem(
        line_number=1,
        description="Consulting",
        quantity=Decimal("1.000"),
        unit_price=Decimal("10000.00"),
        item_discount=Decimal("0.00"),
        taxable_value=Decimal("10000.00"),
        gst_rate=Decimal("18.00"),
        cgst_amount=Decimal("900.00"),
        sgst_amount=Decimal("900.00"),
        igst_amount=Decimal("0.00"),
        total_amount=Decimal("11800.00")
    )
    inv.line_items = [item]
    vendor = Vendor(name="Valid Vendor Ltd", gstin="29AABCU9603R1ZM", state_code="29")

    results = engine.validate_invoice(inv, vendor)
    # Check that there are no critical errors
    criticals = [r for r in results if r["severity"] == "CRITICAL"]
    assert len(criticals) == 0

def test_arithmetic_grand_total_mismatch():
    engine = ValidationEngine()
    inv = Invoice(
        id="TEST-002",
        invoice_number="INV-2026-02",
        invoice_date=date.today().isoformat(),
        vendor_name="Vendor Ltd",
        vendor_gstin="29AABCU9603R1ZM",
        subtotal=Decimal("10000.00"),
        cgst_amount=Decimal("900.00"),
        sgst_amount=Decimal("900.00"),
        total_tax=Decimal("1800.00"),
        grand_total=Decimal("13000.00")  # Should be 11800!
    )
    item = InvoiceLineItem(
        line_number=1,
        description="Service",
        quantity=Decimal("1.000"),
        unit_price=Decimal("10000.00"),
        taxable_value=Decimal("10000.00"),
        gst_rate=Decimal("18.00")
    )
    inv.line_items = [item]

    results = engine.validate_invoice(inv)
    total_failures = [r for r in results if r["rule_code"] == "ARITH_GRAND_TOTAL_MISMATCH"]
    assert len(total_failures) == 1
    assert total_failures[0]["severity"] == "CRITICAL"
    assert "+1200.00" in total_failures[0]["difference"]

def test_date_future_dated():
    engine = ValidationEngine()
    future = date.today() + timedelta(days=10)
    inv = Invoice(
        id="TEST-003",
        invoice_number="INV-2026-03",
        invoice_date=future.isoformat(),
        vendor_name="Vendor Ltd"
    )
    results = engine.validate_invoice(inv)
    date_failures = [r for r in results if r["rule_code"] == "DATE_FUTURE_DATED"]
    assert len(date_failures) == 1

def test_date_due_before_invoice():
    engine = ValidationEngine()
    inv_dt = date(2026, 11, 10)
    due_dt = date(2026, 11, 5)
    inv = Invoice(
        id="TEST-004",
        invoice_number="INV-2026-04",
        invoice_date=inv_dt.isoformat(),
        due_date=due_dt.isoformat(),
        vendor_name="Vendor Ltd"
    )
    results = engine.validate_invoice(inv)
    inv_failures = [r for r in results if r["rule_code"] == "DATE_DUE_BEFORE_INVOICE"]
    assert len(inv_failures) == 1
