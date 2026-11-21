from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.entities import Invoice, PurchaseOrder, GoodsReceivedRecord, InvoiceLineItem
from app.core.decimal_math import to_decimal, quantize_money, quantize_quantity

class ThreeWayMatchingEngine:
    """
    Automated Three-Way Matching Engine:
    Reconciles Purchase Orders (PO) <-> Goods Received Records (GRN) <-> Vendor Invoice line items.
    """

    def __init__(self, db: Session):
        self.db = db

    def match_invoice(self, invoice: Invoice) -> Dict[str, Any]:
        po_number = (invoice.po_number or "").strip()
        
        if not po_number:
            return {
                "status": "NOT_PERFORMED",
                "is_matched": False,
                "po_number": None,
                "summary": "Three-way matching not performed: No Purchase Order referenced on this invoice.",
                "discrepancies": [],
                "po_details": None,
                "grn_details": None
            }

        # Look up PO
        po = self.db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_number).first()
        if not po:
            return {
                "status": "PO_NOT_FOUND",
                "is_matched": False,
                "po_number": po_number,
                "summary": f"Referenced PO '{po_number}' does not exist in the enterprise procurement system.",
                "discrepancies": [{
                    "check": "PO_EXISTENCE",
                    "severity": "CRITICAL",
                    "explanation": f"Invoice references PO #{po_number}, which could not be found in active or historical procurement records."
                }],
                "po_details": None,
                "grn_details": None
            }

        discrepancies: List[Dict[str, Any]] = []

        # Check Vendor consistency
        if invoice.vendor_id and po.vendor_id and invoice.vendor_id != po.vendor_id:
            discrepancies.append({
                "check": "VENDOR_MISMATCH",
                "severity": "CRITICAL",
                "explanation": f"Invoice issued by vendor #{invoice.vendor_name}, but PO #{po_number} was issued to registered vendor #{po.vendor.name if po.vendor else po.vendor_id}."
            })

        # Look up GRN records
        grns = self.db.query(GoodsReceivedRecord).filter(GoodsReceivedRecord.po_id == po.id).all()
        if not grns:
            discrepancies.append({
                "check": "GRN_MISSING",
                "severity": "WARNING",
                "explanation": f"No Goods Received Note (GRN) found for PO #{po_number}. Goods or services have not been confirmed as received by the warehouse/department."
            })

        # Total amount comparison
        inv_total = quantize_money(invoice.grand_total)
        po_total = quantize_money(po.total_amount)
        if abs(inv_total - po_total) > Decimal("5.00"):
            discrepancies.append({
                "check": "TOTAL_AMOUNT_VARIANCE",
                "severity": "CRITICAL",
                "expected": f"₹{po_total:,.2f}",
                "actual": f"₹{inv_total:,.2f}",
                "difference": f"₹{abs(inv_total - po_total):,.2f}",
                "explanation": f"Invoice total (₹{inv_total:,.2f}) differs from authorized PO total (₹{po_total:,.2f}) by ₹{abs(inv_total - po_total):,.2f}."
            })

        # Line-item quantity & unit price comparison
        matched_lines = []
        for inv_item in invoice.line_items:
            inv_qty = quantize_quantity(inv_item.quantity)
            inv_price = quantize_money(inv_item.unit_price)

            # Find matching PO line by description
            matched_po_item = None
            for p_item in po.items:
                if p_item.item_description.strip().lower() in inv_item.description.strip().lower() or \
                   inv_item.description.strip().lower() in p_item.item_description.strip().lower():
                    matched_po_item = p_item
                    break

            if matched_po_item:
                po_qty = quantize_quantity(matched_po_item.quantity)
                po_price = quantize_money(matched_po_item.unit_price)

                # Check price variance
                if abs(inv_price - po_price) > Decimal("0.05"):
                    discrepancies.append({
                        "check": "UNIT_PRICE_VARIANCE",
                        "severity": "CRITICAL",
                        "item": inv_item.description,
                        "expected": f"₹{po_price:,.2f}",
                        "actual": f"₹{inv_price:,.2f}",
                        "difference": f"₹{(inv_price - po_price):+,.2f}",
                        "explanation": f"Unit rate for '{inv_item.description}' billed at ₹{inv_price:.2f}, but authorized PO price was ₹{po_price:.2f}."
                    })

                # Check quantity variance
                if inv_qty > po_qty:
                    discrepancies.append({
                        "check": "QUANTITY_OVERBILLED",
                        "severity": "CRITICAL",
                        "item": inv_item.description,
                        "expected": str(po_qty),
                        "actual": str(inv_qty),
                        "difference": f"+{(inv_qty - po_qty)}",
                        "explanation": f"Billed quantity ({inv_qty}) exceeds contracted PO quantity ({po_qty}) for '{inv_item.description}'."
                    })

                # Check GRN quantity received
                total_received = sum([quantize_quantity(g.received_quantity) for g in grns if g.item_description and (g.item_description.lower() in inv_item.description.lower() or inv_item.description.lower() in g.item_description.lower())], Decimal("0.000"))
                if grns and total_received > Decimal("0.000") and inv_qty > total_received:
                    discrepancies.append({
                        "check": "EXCEEDS_GRN_RECEIVED_QTY",
                        "severity": "WARNING",
                        "item": inv_item.description,
                        "expected": f"<= {total_received}",
                        "actual": str(inv_qty),
                        "explanation": f"Billed {inv_qty} units, but warehouse GRN acknowledges receipt of only {total_received} units."
                    })
            else:
                discrepancies.append({
                    "check": "UNAUTHORIZED_LINE_ITEM",
                    "severity": "WARNING",
                    "item": inv_item.description,
                    "explanation": f"Line item '{inv_item.description}' does not appear in contracted PO items."
                })

        is_matched = len([d for d in discrepancies if d["severity"] == "CRITICAL"]) == 0

        status = "MATCHED" if len(discrepancies) == 0 else ("MATCHED_WITH_WARNINGS" if is_matched else "MISMATCHED")

        return {
            "status": status,
            "is_matched": is_matched,
            "po_number": po.po_number,
            "summary": "Three-way matching complete. " + ("All line items and totals reconciled." if len(discrepancies) == 0 else f"{len(discrepancies)} variance(s) identified."),
            "discrepancies": discrepancies,
            "po_details": {
                "po_number": po.po_number,
                "po_date": po.po_date,
                "total_amount": float(po.total_amount),
                "items_count": len(po.items)
            },
            "grn_details": [
                {"grn_number": g.grn_number, "date": g.receipt_date, "status": g.status, "received_qty": float(g.received_quantity)}
                for g in grns
            ]
        }
