from decimal import Decimal
import pytest
from app.routers.invoices import get_invoices, get_invoice, create_manual_invoice
from app.routers.workflow import approve_invoice, reject_invoice, WorkflowActionRequest
from app.schemas.schemas import InvoiceCreate, LineItemCreate

def test_api_manual_invoice_and_workflow_handlers(db_session):
    payload = InvoiceCreate(
        invoice_number="INV-API-TEST-99",
        invoice_date="2026-11-01",
        due_date="2026-12-01",
        vendor_name="API Testing Supplier Ltd",
        vendor_gstin="29AABCU9603R1ZM",
        customer_name="ACME Technologies India Pvt Ltd",
        customer_gstin="29AABCA1234F1ZP",
        place_of_supply="Karnataka",
        pos_state_code="29",
        currency="INR",
        subtotal=5000.00,
        taxable_amount=5000.00,
        cgst_amount=450.00,
        sgst_amount=450.00,
        total_tax=900.00,
        grand_total=5900.00,
        line_items=[
            LineItemCreate(
                description="API Test Deliverable",
                quantity=1.0,
                unit_price=5000.0,
                taxable_value=5000.0,
                gst_rate=18.0,
                cgst_amount=450.0,
                sgst_amount=450.0,
                total_amount=5900.0
            )
        ]
    )

    # 1. Test create manual invoice
    created = create_manual_invoice(payload=payload, db=db_session)
    assert created.id.startswith("INV-")
    assert created.invoice_number == "INV-API-TEST-99"
    assert created.validation_status in ["PASSED", "PASSED_WITH_WARNINGS"]

    # 2. Test get invoice details
    fetched = get_invoice(invoice_id=created.id, db=db_session)
    assert fetched.id == created.id
    assert fetched.grand_total == Decimal("5900.00")

    # 3. Test list invoices
    all_invs = get_invoices(db=db_session)
    assert len(all_invs) >= 1
    assert any(i.id == created.id for i in all_invs)

    # 4. Test approve invoice
    app_res = approve_invoice(
        invoice_id=created.id,
        req=WorkflowActionRequest(comments="Passed deterministic financial checks"),
        db=db_session
    )
    assert app_res["status"] == "SUCCESS"
    assert app_res["validation_status"] == "APPROVED"

    # 5. Verify status updated in DB
    re_fetched = get_invoice(invoice_id=created.id, db=db_session)
    assert re_fetched.validation_status == "APPROVED"
