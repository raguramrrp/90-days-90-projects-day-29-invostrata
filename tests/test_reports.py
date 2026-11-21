from decimal import Decimal
import pytest
from app.core.reporter import ValidationReporter
from app.models.entities import Invoice

def test_generate_csv_export():
    inv = Invoice(
        id="INV-REP-1",
        invoice_number="FAC-01",
        invoice_date="2026-11-01",
        vendor_name="Test Vendor",
        vendor_gstin="29AABCU9603R1ZM",
        customer_name="ACME",
        subtotal=Decimal("1000.00"),
        taxable_amount=Decimal("1000.00"),
        total_tax=Decimal("180.00"),
        grand_total=Decimal("1180.00"),
        validation_status="PASSED"
    )
    csv_bytes = ValidationReporter.generate_csv_export([inv])
    assert b"Invoice ID,Invoice Number" in csv_bytes
    assert b"INV-REP-1" in csv_bytes
    assert b"Test Vendor" in csv_bytes

def test_generate_pdf_report():
    inv = Invoice(
        id="INV-REP-2",
        invoice_number="FAC-02",
        invoice_date="2026-11-02",
        vendor_name="Test Vendor",
        vendor_gstin="29AABCU9603R1ZM",
        customer_name="ACME",
        subtotal=Decimal("2000.00"),
        taxable_amount=Decimal("2000.00"),
        total_tax=Decimal("360.00"),
        grand_total=Decimal("2360.00"),
        validation_status="PASSED"
    )
    summary = {
        "total_invoices": 1,
        "passed_validation": 1,
        "failed_validation": 0,
        "needs_review": 0,
        "duplicate_suspected": 0,
        "total_invoice_value": 2360.00
    }
    pdf_bytes = ValidationReporter.generate_pdf_report([inv], summary)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")
