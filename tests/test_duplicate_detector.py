from decimal import Decimal
import pytest
from app.core.duplicate_detector import DuplicateDetector
from app.models.entities import Invoice

def test_exact_file_hash_duplicate(db_session):
    inv1 = Invoice(
        id="INV-DUP-1",
        original_filename="inv1.pdf",
        stored_filename="inv1.pdf",
        file_type="pdf",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        invoice_number="INV-100",
        invoice_date="2026-11-01",
        grand_total=Decimal("5000.00")
    )
    db_session.add(inv1)
    db_session.commit()

    inv2 = Invoice(
        id="INV-DUP-2",
        original_filename="inv2.pdf",
        stored_filename="inv2.pdf",
        file_type="pdf",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",  # Identical hash
        invoice_number="INV-100-COPY",
        invoice_date="2026-11-01",
        grand_total=Decimal("5000.00")
    )
    db_session.add(inv2)
    db_session.commit()

    detector = DuplicateDetector(db_session)
    dups = detector.check_duplicates(inv2)

    assert len(dups) >= 1
    assert any(d["match_type"] == "EXACT_FILE_HASH" for d in dups)
    assert any(d["matched_invoice_id"] == "INV-DUP-1" for d in dups)

def test_exact_invoice_fields_duplicate(db_session):
    inv1 = Invoice(
        id="INV-STAT-1",
        original_filename="inv1.pdf",
        stored_filename="inv1.pdf",
        file_type="pdf",
        sha256_hash="hash_a",
        vendor_gstin="29AABCU9603R1ZM",
        invoice_number="FAC-2026-555",
        invoice_date="2026-11-15",
        grand_total=Decimal("25000.00")
    )
    db_session.add(inv1)
    db_session.commit()

    inv2 = Invoice(
        id="INV-STAT-2",
        original_filename="inv2.pdf",
        stored_filename="inv2.pdf",
        file_type="pdf",
        sha256_hash="hash_b",  # Different binary hash
        vendor_gstin="29AABCU9603R1ZM",
        invoice_number="FAC-2026-555",  # Exact same invoice # and vendor
        invoice_date="2026-11-15",
        grand_total=Decimal("25000.00")
    )
    db_session.add(inv2)
    db_session.commit()

    detector = DuplicateDetector(db_session)
    dups = detector.check_duplicates(inv2)

    assert len(dups) >= 1
    assert any(d["match_type"] == "EXACT_INVOICE_FIELDS" for d in dups)
