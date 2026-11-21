from datetime import datetime
from decimal import Decimal
import difflib
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Invoice, DuplicateMatch
from app.core.decimal_math import to_decimal

def normalize_text(text: Optional[str]) -> str:
    """Normalize string by removing non-alphanumeric characters and lowercase."""
    if not text:
        return ""
    return re.sub(r"[^a-zA-Z0-9]", "", str(text)).lower()

class DuplicateDetector:
    """
    Multi-tiered duplicate invoice detection engine:
    1. Exact SHA-256 file hash match.
    2. Exact statutory invoice match (Vendor GSTIN + Invoice No + Date + Total).
    3. Fuzzy / similar invoice heuristic match.
    """

    def __init__(self, db: Session):
        self.db = db

    def check_duplicates(self, invoice: Invoice) -> List[Dict[str, Any]]:
        matches: List[Dict[str, Any]] = []

        # Exclude self
        query = self.db.query(Invoice).filter(Invoice.id != invoice.id)
        existing_invoices = query.all()

        current_hash = (invoice.sha256_hash or "").strip().lower()
        current_inv_no = (invoice.invoice_number or "").strip()
        current_norm_inv = normalize_text(current_inv_no)
        current_gstin = (invoice.vendor_gstin or "").strip().upper()
        current_date_str = (invoice.invoice_date or "").strip()
        current_amount = to_decimal(invoice.grand_total)

        current_dt = None
        if current_date_str:
            try:
                current_dt = datetime.strptime(current_date_str, "%Y-%m-%d").date()
            except ValueError:
                pass

        for other in existing_invoices:
            other_hash = (other.sha256_hash or "").strip().lower()
            other_inv_no = (other.invoice_number or "").strip()
            other_norm_inv = normalize_text(other_inv_no)
            other_gstin = (other.vendor_gstin or "").strip().upper()
            other_date_str = (other.invoice_date or "").strip()
            other_amount = to_decimal(other.grand_total)

            other_dt = None
            if other_date_str:
                try:
                    other_dt = datetime.strptime(other_date_str, "%Y-%m-%d").date()
                except ValueError:
                    pass

            # --- TIER 1: Exact File Duplicate (SHA-256) ---
            if current_hash and other_hash and current_hash == other_hash:
                matches.append({
                    "matched_invoice_id": other.id,
                    "match_type": "EXACT_FILE_HASH",
                    "confidence_score": 1.0,
                    "matched_fields": ["sha256_hash", "document_content"],
                    "explanation": f"Identical file binary match with existing invoice #{other.invoice_number} ({other.id}). SHA-256 hash {current_hash[:12]}... matches exactly."
                })
                continue

            # --- TIER 2: Exact Invoice Fields Match ---
            exact_fields = []
            if current_gstin and other_gstin and current_gstin == other_gstin:
                exact_fields.append("vendor_gstin")
            elif invoice.vendor_name and other.vendor_name and invoice.vendor_name.strip().lower() == other.vendor_name.strip().lower():
                exact_fields.append("vendor_name")

            if current_norm_inv and other_norm_inv and current_norm_inv == other_norm_inv:
                exact_fields.append("invoice_number")

            if current_date_str and other_date_str and current_date_str == other_date_str:
                exact_fields.append("invoice_date")

            if current_amount > Decimal("0.00") and abs(current_amount - other_amount) < Decimal("0.05"):
                exact_fields.append("grand_total")

            if len(exact_fields) >= 4 or (len(exact_fields) == 3 and "invoice_number" in exact_fields and ("vendor_gstin" in exact_fields or "vendor_name" in exact_fields)):
                matches.append({
                    "matched_invoice_id": other.id,
                    "match_type": "EXACT_INVOICE_FIELDS",
                    "confidence_score": 0.98,
                    "matched_fields": exact_fields,
                    "explanation": f"Exact statutory details duplicate: Matched {', '.join(exact_fields)} with invoice #{other.invoice_number} ({other.id})."
                })
                continue

            # --- TIER 3: Similar / Near-Duplicate Heuristics ---
            # In accounting, similar duplicates require vendor match AND matching amount/date proximity
            vendor_match = False
            if current_gstin and other_gstin and current_gstin == other_gstin:
                vendor_match = True
            elif invoice.vendor_name and other.vendor_name:
                ratio = difflib.SequenceMatcher(None, invoice.vendor_name.lower(), other.vendor_name.lower()).ratio()
                if ratio > 0.90:
                    vendor_match = True

            if not vendor_match:
                continue

            # Check amount proximity (within 1% or <= 2.00 INR)
            amount_match = False
            amount_diff = Decimal("0.00")
            if current_amount > Decimal("0.00") and other_amount > Decimal("0.00"):
                amount_diff = abs(current_amount - other_amount)
                rel_diff = amount_diff / max(current_amount, other_amount)
                if amount_diff <= Decimal("2.00") or rel_diff <= Decimal("0.01"):
                    amount_match = True

            # Check date proximity (within +/- 7 days)
            date_proximity = False
            date_diff_days = 999
            if current_dt and other_dt:
                date_diff_days = abs((current_dt - other_dt).days)
                if date_diff_days <= 7:
                    date_proximity = True

            # Check invoice number string similarity
            num_similarity = False
            num_ratio = 0.0
            if current_norm_inv and other_norm_inv:
                num_ratio = difflib.SequenceMatcher(None, current_norm_inv, other_norm_inv).ratio()
                if num_ratio > 0.85:
                    num_similarity = True

            # Near duplicate requires: Vendor Match AND (Amount Match + Date Proximity OR Exact Number Typo + Amount Match)
            if amount_match and (date_proximity or num_similarity):
                matched_aspects = ["Vendor match", f"Amount within 1% (Diff: ₹{amount_diff:.2f})"]
                if date_proximity:
                    matched_aspects.append(f"Date within {date_diff_days} days")
                if num_similarity:
                    matched_aspects.append(f"Invoice number format similarity ({int(num_ratio*100)}%)")

                conf = 0.85 if (amount_match and date_proximity and num_similarity) else 0.70
                matches.append({
                    "matched_invoice_id": other.id,
                    "match_type": "SIMILAR_RECORD",
                    "confidence_score": conf,
                    "matched_fields": matched_aspects,
                    "explanation": f"Suspiciously similar to invoice #{other.invoice_number} ({other.id}) from same vendor: {'; '.join(matched_aspects)}."
                })

        return matches
