from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.entities import Invoice, ValidationResult, Vendor
from app.core.decimal_math import to_decimal
from app.core.reporter import ValidationReporter
from app.schemas.schemas import OperationalSummary

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

@router.get("/summary", response_model=OperationalSummary)
def get_operational_summary(db: Session = Depends(get_db)):
    all_invoices = db.query(Invoice).all()
    total_inv = len(all_invoices)
    
    passed = sum(1 for i in all_invoices if i.validation_status == "PASSED")
    warnings = sum(1 for i in all_invoices if i.validation_status == "PASSED_WITH_WARNINGS")
    review = sum(1 for i in all_invoices if i.validation_status in ["NEEDS_REVIEW", "PASSED_WITH_WARNINGS"])
    dups = sum(1 for i in all_invoices if i.validation_status == "DUPLICATE_SUSPECTED")
    failed = sum(1 for i in all_invoices if i.validation_status == "FAILED")
    approved = sum(1 for i in all_invoices if i.validation_status == "APPROVED")

    total_val = sum(float(to_decimal(i.grand_total)) for i in all_invoices)
    total_tax = sum(float(to_decimal(i.total_tax)) for i in all_invoices)

    pass_rate = round(((passed + approved) / total_inv * 100.0), 1) if total_inv > 0 else 0.0

    return {
        "total_invoices": total_inv,
        "passed_validation": passed,
        "needs_review": review,
        "duplicate_suspected": dups,
        "failed_validation": failed,
        "approved_invoices": approved,
        "total_invoice_value": round(total_val, 2),
        "total_tax_value": round(total_tax, 2),
        "pass_rate_percent": pass_rate
    }

@router.get("/analytics")
def get_analytics_distributions(db: Session = Depends(get_db)):
    all_invoices = db.query(Invoice).all()

    # 1. Validation Status Distribution
    status_counts = {}
    for inv in all_invoices:
        st = inv.validation_status
        status_counts[st] = status_counts.get(st, 0) + 1

    status_dist = [
        {"name": k.replace("_", " ").title(), "value": v, "status": k}
        for k, v in status_counts.items()
    ]

    # 2. Monthly Volume
    monthly = {}
    for inv in all_invoices:
        if inv.invoice_date and len(inv.invoice_date) >= 7:
            m_key = inv.invoice_date[:7]  # YYYY-MM
            if m_key not in monthly:
                monthly[m_key] = {"month": m_key, "count": 0, "amount": 0.0}
            monthly[m_key]["count"] += 1
            monthly[m_key]["amount"] += float(to_decimal(inv.grand_total))

    monthly_volume = sorted(list(monthly.values()), key=lambda x: x["month"])

    # 3. Common Validation Failure Rules
    exceptions = db.query(ValidationResult).all()
    rule_counts = {}
    for ex in exceptions:
        code = ex.rule_code
        rule_counts[code] = rule_counts.get(code, 0) + 1

    top_rules = sorted(
        [{"rule": k, "count": v} for k, v in rule_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:8]

    # 4. Vendor-wise Discrepancy Distribution
    vendors = db.query(Vendor).all()
    vendor_disc = []
    for v in vendors:
        v_invs = [i.id for i in all_invoices if i.vendor_id == v.id]
        if v_invs:
            d_count = db.query(ValidationResult).filter(ValidationResult.invoice_id.in_(v_invs)).count()
            vendor_disc.append({
                "vendor_name": v.name[:20],
                "discrepancies": d_count,
                "total_invoices": len(v_invs)
            })

    vendor_disc = sorted(vendor_disc, key=lambda x: x["discrepancies"], reverse=True)[:6]

    return {
        "status_distribution": status_dist,
        "monthly_volume": monthly_volume,
        "top_failure_rules": top_rules,
        "vendor_discrepancies": vendor_disc
    }

@router.get("/export")
def export_reports(
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    db: Session = Depends(get_db)
):
    invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).all()
    summary = get_operational_summary(db=db)

    if format == "csv":
        csv_bytes = ValidationReporter.generate_csv_export(invoices)
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=invostrata_financial_audit_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
        )
    else:
        pdf_bytes = ValidationReporter.generate_pdf_report(invoices, summary)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invostrata_validation_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"}
        )
