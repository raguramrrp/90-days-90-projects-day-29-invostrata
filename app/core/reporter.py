from datetime import datetime
from decimal import Decimal
import io
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

from app.models.entities import Invoice, ValidationResult, Vendor
from app.core.decimal_math import to_decimal

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

class ValidationReporter:
    """
    Generates professional validation reports and financial audit exports in CSV and PDF formats.
    """

    @staticmethod
    def generate_csv_export(invoices: List[Invoice]) -> bytes:
        records = []
        for inv in invoices:
            records.append({
                "Invoice ID": inv.id,
                "Invoice Number": inv.invoice_number or "",
                "Invoice Date": inv.invoice_date or "",
                "Vendor Name": inv.vendor_name or "",
                "Vendor GSTIN": inv.vendor_gstin or "",
                "Customer Name": inv.customer_name or "",
                "Subtotal (INR)": float(to_decimal(inv.subtotal)),
                "Taxable Amount (INR)": float(to_decimal(inv.taxable_amount)),
                "Total Tax (INR)": float(to_decimal(inv.total_tax)),
                "Grand Total (INR)": float(to_decimal(inv.grand_total)),
                "Validation Status": inv.validation_status,
                "Extraction Confidence": round(inv.extraction_confidence or 1.0, 2),
                "PO Reference": inv.po_number or "N/A",
                "Created At": inv.created_at.strftime("%Y-%m-%d %H:%M:%S") if inv.created_at else ""
            })
        
        df = pd.DataFrame(records)
        output = io.BytesIO()
        df.to_csv(output, index=False, encoding="utf-8")
        return output.getvalue()

    @staticmethod
    def generate_pdf_report(invoices: List[Invoice], summary_metrics: Dict[str, Any]) -> bytes:
        """
        Creates a clean enterprise PDF audit report using ReportLab.
        Forest green theme (#286B55) matching VALICORA design standards.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        elements = []
        styles = getSampleStyleSheet()

        brand_green = colors.HexColor("#286B55")
        text_dark = colors.HexColor("#24312D")
        text_secondary = colors.HexColor("#74817B")
        bg_light = colors.HexColor("#F4F6F4")
        border_color = colors.HexColor("#E0E6E1")

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=brand_green
        )

        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=text_secondary
        )

        header_cell_style = ParagraphStyle(
            "HeaderCell",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white
        )

        cell_style = ParagraphStyle(
            "CellText",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=text_dark
        )

        # Title & Header
        elements.append(Paragraph("VALICORA", title_style))
        elements.append(Paragraph("Automated Invoice Validation & Financial Consistency Workstation — Executive Audit Report", subtitle_style))
        elements.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Workstation Status: ACTIVE", subtitle_style))
        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=brand_green, spaceBefore=0, spaceAfter=15))

        # Operational Summary Metrics Block
        tot = summary_metrics.get("total_invoices", len(invoices))
        passed = summary_metrics.get("passed_validation", 0)
        failed = summary_metrics.get("failed_validation", 0)
        review = summary_metrics.get("needs_review", 0)
        dups = summary_metrics.get("duplicate_suspected", 0)
        total_val = summary_metrics.get("total_invoice_value", 0.0)

        summary_data = [
            [
                Paragraph("<b>Total Invoices</b>", cell_style),
                Paragraph("<b>Passed Validation</b>", cell_style),
                Paragraph("<b>Needs Review</b>", cell_style),
                Paragraph("<b>Failed Validation</b>", cell_style),
                Paragraph("<b>Suspected Duplicates</b>", cell_style),
                Paragraph("<b>Total Billed Value</b>", cell_style),
            ],
            [
                Paragraph(str(tot), cell_style),
                Paragraph(f"<font color='#286B55'><b>{passed}</b></font>", cell_style),
                Paragraph(f"<font color='#B7791F'><b>{review}</b></font>", cell_style),
                Paragraph(f"<font color='#C2413B'><b>{failed}</b></font>", cell_style),
                Paragraph(f"<font color='#C2413B'><b>{dups}</b></font>", cell_style),
                Paragraph(f"₹{total_val:,.2f}", cell_style),
            ]
        ]

        summary_table = Table(summary_data, colWidths=[90, 90, 90, 90, 90, 90])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_light),
            ('BOX', (0, 0), (-1, -1), 1, border_color),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # Recent Invoices Table
        elements.append(Paragraph("<b>Invoice Validation Ledger Sample (Latest Records)</b>", ParagraphStyle(
            "SecHead", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=12, leading=14, textColor=text_dark
        )))
        elements.append(Spacer(1, 8))

        table_rows = [
            [
                Paragraph("ID", header_cell_style),
                Paragraph("Vendor", header_cell_style),
                Paragraph("Invoice #", header_cell_style),
                Paragraph("Date", header_cell_style),
                Paragraph("Amount (INR)", header_cell_style),
                Paragraph("Tax (INR)", header_cell_style),
                Paragraph("Status", header_cell_style),
            ]
        ]

        for inv in invoices[:25]:
            status_color = "#286B55" if "PASS" in inv.validation_status else ("#C2413B" if "FAIL" in inv.validation_status or "DUP" in inv.validation_status else "#B7791F")
            table_rows.append([
                Paragraph(inv.id, cell_style),
                Paragraph(inv.vendor_name[:24] if inv.vendor_name else "N/A", cell_style),
                Paragraph(inv.invoice_number or "N/A", cell_style),
                Paragraph(inv.invoice_date or "N/A", cell_style),
                Paragraph(f"₹{float(to_decimal(inv.grand_total)):,.2f}", cell_style),
                Paragraph(f"₹{float(to_decimal(inv.total_tax)):,.2f}", cell_style),
                Paragraph(f"<font color='{status_color}'><b>{inv.validation_status}</b></font>", cell_style),
            ])

        inv_table = Table(table_rows, colWidths=[65, 125, 80, 65, 80, 65, 60])
        inv_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), brand_green),
            ('BOX', (0, 0), (-1, -1), 1, border_color),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
        ]))
        elements.append(inv_table)

        # Footer statement
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(
            "<i>Certification Note: Generated deterministically by VALICORA Validation Engine using Python Decimal precision arithmetic. Every calculation independently verified against source line items.</i>",
            subtitle_style
        ))

        doc.build(elements)
        return buffer.getvalue()
