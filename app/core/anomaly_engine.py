from datetime import datetime
from decimal import Decimal
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Invoice, AnomalyResult
from app.core.decimal_math import to_decimal
from app.config import settings

try:
    from sklearn.ensemble import IsolationForest
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

class AnomalyEngine:
    """
    Financial anomaly investigation engine combining rule-based heuristics
    with scikit-learn Isolation Forest unsupervised outlier detection.
    """

    def __init__(self, db: Session):
        self.db = db

    def investigate(self, invoice: Invoice) -> List[Dict[str, Any]]:
        anomalies: List[Dict[str, Any]] = []

        # Gather vendor historical invoices
        vendor_invoices = []
        if invoice.vendor_id:
            vendor_invoices = self.db.query(Invoice).filter(
                Invoice.vendor_id == invoice.vendor_id,
                Invoice.id != invoice.id
            ).all()
        elif invoice.vendor_name:
            vendor_invoices = self.db.query(Invoice).filter(
                Invoice.vendor_name == invoice.vendor_name,
                Invoice.id != invoice.id
            ).all()

        current_amount = float(to_decimal(invoice.grand_total))
        current_subtotal = float(to_decimal(invoice.subtotal))
        current_discount = float(to_decimal(invoice.discount_amount))
        current_tax = float(to_decimal(invoice.total_tax))

        # 1. Repeated Suspicious Rounded Amounts
        # In B2B accounting with GST (18%, 12%), an exact round number like 50000.00 or 100000.00 is often an arbitrary lump-sum or retainer needing contract verification
        if current_amount > 5000 and current_amount % settings.ROUND_NUMBER_MODULO == 0:
            anomalies.append({
                "anomaly_type": "SUSPECT_ROUND_AMOUNT",
                "severity": "WARNING",
                "score": 0.65,
                "explanation": f"Grand total is an exact round integer (₹{current_amount:,.2f}) with zero fractional paise. Itemized GST invoices rarely produce round thousands naturally.",
                "recommended_action": "Verify supporting line-item work order or contract terms to ensure billing reflects actual deliveries rather than unverified advance estimates."
            })

        # 2. Excessive / Uncharacteristic Discount
        if current_subtotal > 0 and current_discount > 0:
            discount_pct = (current_discount / current_subtotal) * 100.0
            if discount_pct >= settings.HIGH_DISCOUNT_PERCENT:
                anomalies.append({
                    "anomaly_type": "HIGH_DISCOUNT_ANOMALY",
                    "severity": "WARNING",
                    "score": 0.75,
                    "explanation": f"Invoice features a high commercial discount of {discount_pct:.1f}% (₹{current_discount:,.2f}), exceeding the {settings.HIGH_DISCOUNT_PERCENT}% threshold.",
                    "recommended_action": "Cross-check commercial discount authorization with purchase agreement or management approval matrix."
                })

        # 3. Vendor Historical Deviation (Z-score & Multiple of Median)
        if len(vendor_invoices) >= 3:
            hist_amounts = [float(to_decimal(inv.grand_total)) for inv in vendor_invoices if float(to_decimal(inv.grand_total)) > 0]
            if len(hist_amounts) >= 3:
                mean_amt = float(np.mean(hist_amounts))
                std_amt = float(np.std(hist_amounts))
                median_amt = float(np.median(hist_amounts))

                if std_amt > 0:
                    z_score = (current_amount - mean_amt) / std_amt
                    if z_score >= 3.0 or (median_amt > 0 and current_amount >= 3.5 * median_amt):
                        anomalies.append({
                            "anomaly_type": "OUTLIER_AMOUNT_SPIKE",
                            "severity": "CRITICAL" if z_score >= 4.0 else "WARNING",
                            "score": min(0.95, round(0.5 + (z_score * 0.1), 2)),
                            "explanation": f"Invoice amount (₹{current_amount:,.2f}) is a statistical outlier ({z_score:.1f} standard deviations above historical vendor average of ₹{mean_amt:,.2f}; median: ₹{median_amt:,.2f}).",
                            "recommended_action": "Perform secondary financial controller sign-off for high-value invoice spike."
                        })

        # 4. Rapid Repeat Submissions from Same Vendor (< 48 hours)
        if invoice.invoice_date and vendor_invoices:
            try:
                curr_date = datetime.strptime(str(invoice.invoice_date).strip(), "%Y-%m-%d").date()
                same_day_or_near = [
                    inv for inv in vendor_invoices
                    if inv.invoice_date and abs((curr_date - datetime.strptime(str(inv.invoice_date).strip(), "%Y-%m-%d").date()).days) <= 1
                ]
                if same_day_or_near:
                    matched_ids = [inv.invoice_number or inv.id for inv in same_day_or_near]
                    anomalies.append({
                        "anomaly_type": "FREQUENT_VENDOR_SUBMISSION",
                        "severity": "WARNING",
                        "score": 0.70,
                        "explanation": f"Vendor has submitted {len(same_day_or_near)} other invoice(s) within 24-48 hours ({', '.join(matched_ids)}), potentially indicating split-billing to circumvent procurement authorization thresholds.",
                        "recommended_action": "Verify whether deliverables could have been consolidated into a single PO and invoice."
                    })
            except Exception:
                pass

        # 5. Isolation Forest Unsupervised Outlier Detection (When >= 10 historical records exist)
        all_invoices = self.db.query(Invoice).filter(Invoice.id != invoice.id).all()
        if SKLEARN_AVAILABLE and len(all_invoices) >= 10:
            try:
                features = []
                for inv in all_invoices:
                    sub = float(to_decimal(inv.subtotal))
                    tot = float(to_decimal(inv.grand_total))
                    tax = float(to_decimal(inv.total_tax))
                    disc = float(to_decimal(inv.discount_amount))
                    tax_ratio = (tax / sub) if sub > 0 else 0.0
                    disc_ratio = (disc / sub) if sub > 0 else 0.0
                    features.append([tot, tax_ratio, disc_ratio])

                curr_sub = current_subtotal if current_subtotal > 0 else 1.0
                curr_feat = [[
                    current_amount,
                    current_tax / curr_sub,
                    current_discount / curr_sub
                ]]

                clf = IsolationForest(n_estimators=50, contamination=0.08, random_state=42)
                clf.fit(features)
                pred = clf.predict(curr_feat)[0]  # -1 = anomaly, 1 = normal
                decision_score = float(clf.decision_function(curr_feat)[0])

                if pred == -1 and decision_score < -0.05:
                    anomalies.append({
                        "anomaly_type": "ISOLATION_FOREST_OUTLIER",
                        "severity": "WARNING",
                        "score": round(min(0.92, max(0.60, 0.5 - decision_score)), 2),
                        "explanation": f"Isolation Forest multidimensional model flagged this invoice as an anomaly (Anomaly score: {decision_score:.3f}). Feature combination (amount ₹{current_amount:,.2f}, tax ratio, discount ratio) deviates from enterprise baseline distribution.",
                        "recommended_action": "Perform holistic audit of line items, tax split, and billing structure."
                    })
            except Exception:
                pass

        return anomalies
