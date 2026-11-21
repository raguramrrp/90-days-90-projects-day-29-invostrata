from datetime import datetime, date, timedelta
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import random
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal, Base, engine
from app.models.entities import (
    User, Vendor, Invoice, InvoiceLineItem, InvoiceDocument,
    ExtractedField, ValidationResult, DuplicateMatch, AnomalyResult,
    PurchaseOrder, PurchaseOrderItem, GoodsReceivedRecord, AuditLog
)
from app.core.decimal_math import quantize_money, quantize_quantity, to_decimal
from app.core.validator import ValidationEngine
from app.core.duplicate_detector import DuplicateDetector
from app.core.anomaly_engine import AnomalyEngine

# Generate real sample PDF using ReportLab
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_sample_pdf(file_path: Path, invoice_data: dict):
    """Creates an actual readable PDF invoice on disk for document inspection and preview."""
    doc = SimpleDocTemplate(str(file_path), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    styles = getSampleStyleSheet()

    brand_color = colors.HexColor("#286B55")
    dark_text = colors.HexColor("#24312D")

    # Header
    title_style = ParagraphStyle("InvTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=brand_color)
    body_style = ParagraphStyle("InvBody", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=12, textColor=dark_text)
    bold_style = ParagraphStyle("InvBold", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=dark_text)

    elements.append(Paragraph(f"TAX INVOICE — {invoice_data['vendor_name'].upper()}", title_style))
    elements.append(Paragraph(f"GSTIN: {invoice_data['vendor_gstin']} | State Code: {invoice_data['vendor_gstin'][:2]}", body_style))
    elements.append(Paragraph(f"Address: {invoice_data.get('vendor_address', 'Bengaluru, India')}", body_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=brand_color, spaceBefore=0, spaceAfter=10))

    # Meta
    meta_table = Table([
        [Paragraph(f"<b>Invoice No:</b> {invoice_data['invoice_number']}", body_style), Paragraph(f"<b>Date:</b> {invoice_data['invoice_date']}", body_style)],
        [Paragraph(f"<b>Billed To:</b> {invoice_data['customer_name']}", body_style), Paragraph(f"<b>Due Date:</b> {invoice_data.get('due_date', 'N/A')}", body_style)],
        [Paragraph(f"<b>Recipient GSTIN:</b> {invoice_data['customer_gstin']}", body_style), Paragraph(f"<b>PO Ref:</b> {invoice_data.get('po_number', 'N/A')}", body_style)],
        [Paragraph(f"<b>Place of Supply:</b> {invoice_data['place_of_supply']}", body_style), Paragraph(f"<b>Currency:</b> INR", body_style)],
    ], colWidths=[270, 270])
    elements.append(meta_table)
    elements.append(Spacer(1, 15))

    # Line items table
    header_style = ParagraphStyle("Head", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, textColor=colors.white)
    table_data = [[
        Paragraph("#", header_style),
        Paragraph("Description", header_style),
        Paragraph("HSN/SAC", header_style),
        Paragraph("Qty", header_style),
        Paragraph("Rate (₹)", header_style),
        Paragraph("Taxable (₹)", header_style),
        Paragraph("GST", header_style),
        Paragraph("Total (₹)", header_style),
    ]]

    for itm in invoice_data["line_items"]:
        table_data.append([
            Paragraph(str(itm["line_number"]), body_style),
            Paragraph(itm["description"], body_style),
            Paragraph(itm.get("hsn_sac", "998313"), body_style),
            Paragraph(str(itm["quantity"]), body_style),
            Paragraph(f"{itm['unit_price']:.2f}", body_style),
            Paragraph(f"{itm['taxable_value']:.2f}", body_style),
            Paragraph(f"{itm['gst_rate']}%", body_style),
            Paragraph(f"{itm['total_amount']:.2f}", body_style),
        ])

    items_table = Table(table_data, colWidths=[25, 200, 55, 35, 65, 65, 35, 60])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), brand_color),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E0E6E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E6E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # Summary table
    summary_data = [
        [Paragraph("Subtotal:", bold_style), Paragraph(f"₹{invoice_data['subtotal']:.2f}", body_style)],
        [Paragraph("CGST:", body_style), Paragraph(f"₹{invoice_data['cgst_amount']:.2f}", body_style)],
        [Paragraph("SGST:", body_style), Paragraph(f"₹{invoice_data['sgst_amount']:.2f}", body_style)],
        [Paragraph("IGST:", body_style), Paragraph(f"₹{invoice_data['igst_amount']:.2f}", body_style)],
        [Paragraph("Round Off:", body_style), Paragraph(f"₹{invoice_data['round_off']:.2f}", body_style)],
        [Paragraph("<b>Grand Total:</b>", bold_style), Paragraph(f"<b>₹{invoice_data['grand_total']:.2f}</b>", bold_style)],
    ]
    sum_table = Table(summary_data, colWidths=[120, 100], hAlign="RIGHT")
    elements.append(sum_table)

    # Footer
    elements.append(Spacer(1, 25))
    elements.append(Paragraph("This is a computer generated invoice requiring no physical signature. Registered under Indian GST Act.", ParagraphStyle("Foot", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#74817B"))))

    doc.build(elements)

def seed_database():
    """Populates the database with 105 realistic Indian business invoices and vendors."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    existing_count = db.query(Invoice).count()
    if existing_count >= 100:
        print(f"Database already contains {existing_count} invoices. Skipping seed.")
        db.close()
        return

    print("Seeding INVOSTRATA database with 105 realistic enterprise invoices...")

    # 1. Create Default Users
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email="admin@invostrata.internal",
            full_name="Chief Financial Auditor",
            role="admin",
            hashed_password="pbkdf2:sha256:600000$dummyhash$invostrata2026",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # 2. Registered Vendors Matrix (Diverse Indian States)
    vendors_data = [
        {
            "name": "InfraTech Cloud Solutions Pvt Ltd",
            "gstin": "29AABCU9603R1ZM",  # 29 Karnataka
            "pan": "AABCU9603R",
            "city": "Bengaluru", "state": "Karnataka", "state_code": "29",
            "address": "EcoWorld Tech Park, Sarjapur Outer Ring Rd, Bellandur, Bengaluru 560103",
            "email": "billing@infratech-cloud.in", "phone": "+91 80 4123 9000",
            "bank_name": "HDFC Bank", "account_number": "50200012345678", "ifsc_code": "HDFC0000240",
            "status": "ACTIVE"
        },
        {
            "name": "Apex Industrial Components Ltd",
            "gstin": "27AAACA1234E1ZR",  # 27 Maharashtra
            "pan": "AAACA1234E",
            "city": "Pune", "state": "Maharashtra", "state_code": "27",
            "address": "Bhosari Industrial Estate, MIDC, Pune 411026",
            "email": "accounts@apexcomponents.com", "phone": "+91 20 2712 4500",
            "bank_name": "State Bank of India", "account_number": "30456123450", "ifsc_code": "SBIN0001452",
            "status": "ACTIVE"
        },
        {
            "name": "Kaveri Logistics & Freight Corp",
            "gstin": "33AABCK8765Q1Z9",  # 33 Tamil Nadu
            "pan": "AABCK8765Q",
            "city": "Chennai", "state": "Tamil Nadu", "state_code": "33",
            "address": "Guindy Industrial Estate, Mount Road, Chennai 600032",
            "email": "invoices@kaverifreight.in", "phone": "+91 44 2250 8899",
            "bank_name": "ICICI Bank", "account_number": "000405012345", "ifsc_code": "ICIC0000004",
            "status": "ACTIVE"
        },
        {
            "name": "Synthetix Bio-Labs Private Limited",
            "gstin": "36AAGCS9988D1Z4",  # 36 Telangana
            "pan": "AAGCS9988D",
            "city": "Hyderabad", "state": "Telangana", "state_code": "36",
            "address": "Genome Valley, Shamirpet, Hyderabad 500078",
            "email": "finance@synthetixlabs.com", "phone": "+91 40 6677 3322",
            "bank_name": "Axis Bank", "account_number": "918020034567891", "ifsc_code": "UTIB0000123",
            "status": "ACTIVE"
        },
        {
            "name": "Nordic Clean Energy Systems",
            "gstin": "07AAACN5544K1ZV",  # 07 Delhi
            "pan": "AAACN5544K",
            "city": "New Delhi", "state": "Delhi", "state_code": "07",
            "address": "Barakhamba Road, Connaught Place, New Delhi 110001",
            "email": "ap@nordicclean.in", "phone": "+91 11 4355 6677",
            "bank_name": "Kotak Mahindra Bank", "account_number": "1234567890", "ifsc_code": "KKBK0000195",
            "status": "ACTIVE"
        },
        {
            "name": "Vanguard Precision Tooling Corp",
            "gstin": "24AAACV8899M1ZY",  # 24 Gujarat
            "pan": "AAACV8899M",
            "city": "Ahmedabad", "state": "Gujarat", "state_code": "24",
            "address": "Sanand Industrial Park, Ahmedabad 382110",
            "email": "contact@vanguardtooling.in", "phone": "+91 79 2688 1122",
            "bank_name": "Bank of Baroda", "account_number": "01230200004567", "ifsc_code": "BARB0SANAND",
            "status": "ACTIVE"
        },
        {
            "name": "Global Office Supplies India Ltd",
            "gstin": "29AAACG4433F1Z1",  # 29 Karnataka
            "pan": "AAACG4433F",
            "city": "Bengaluru", "state": "Karnataka", "state_code": "29",
            "address": "Koramangala 4th Block, 80 Feet Road, Bengaluru 560034",
            "email": "orders@globalofficesupplies.in", "phone": "+91 80 2553 4400",
            "bank_name": "Canara Bank", "account_number": "0412101004567", "ifsc_code": "CNRB0000412",
            "status": "ACTIVE"
        },
        {
            "name": "Suspended Legacy Vendor Ltd",
            "gstin": "29AAACS0000Z1Z0",  # Blocked vendor
            "pan": "AAACS0000Z",
            "city": "Bengaluru", "state": "Karnataka", "state_code": "29",
            "address": "Peenya 2nd Stage, Bengaluru 560058",
            "email": "legal@suspendedvendor.in", "phone": "+91 80 2839 0000",
            "bank_name": "Punjab National Bank", "account_number": "1122334455", "ifsc_code": "PUNB0112200",
            "status": "BLOCKED"
        }
    ]

    vendor_objs = []
    for vdata in vendors_data:
        v = db.query(Vendor).filter(Vendor.gstin == vdata["gstin"]).first()
        if not v:
            v = Vendor(**vdata)
            db.add(v)
            db.flush()
        vendor_objs.append(v)
    db.commit()

    # 3. Create Sample Purchase Orders & GRNs
    pos_data = [
        ("PO-2026-8801", vendor_objs[0], Decimal("59000.00"), [("AWS Cloud Server Managed Cluster & Support", Decimal("1.000"), Decimal("50000.00"))]),
        ("PO-2026-8802", vendor_objs[1], Decimal("94400.00"), [("Precision CNC Machined Valve Components", Decimal("40.000"), Decimal("2000.00"))]),
        ("PO-2026-8803", vendor_objs[2], Decimal("35400.00"), [("Inter-State Freight & Container Transit", Decimal("1.000"), Decimal("30000.00"))]),
        ("PO-2026-8804", vendor_objs[6], Decimal("23600.00"), [("Ergonomic Task Chairs & Desk Units", Decimal("10.000"), Decimal("2000.00"))]),
    ]

    for po_num, ven, tot, items in pos_data:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_num).first()
        if not po:
            po = PurchaseOrder(
                po_number=po_num,
                vendor_id=ven.id,
                po_date="2026-10-15",
                total_amount=tot,
                status="ISSUED"
            )
            db.add(po)
            db.flush()

            for idx, (desc, q, r) in enumerate(items, 1):
                p_item = PurchaseOrderItem(
                    po_id=po.id,
                    line_number=idx,
                    item_description=desc,
                    quantity=q,
                    unit_price=r,
                    total_amount=quantize_money(q * r)
                )
                db.add(p_item)

            # GRN record
            grn = GoodsReceivedRecord(
                grn_number=f"GRN-{po_num[3:]}",
                po_id=po.id,
                receipt_date="2026-10-20",
                received_quantity=items[0][1],
                item_description=items[0][0],
                status="ACCEPTED"
            )
            db.add(grn)
    db.commit()

    # 4. Generate 105 Diverse Invoices
    # Catalog of realistic B2B item templates
    item_templates = [
        ("Cloud Infrastructure Tier-4 Dedicated Hosting", "998313", 18.0, 25000.00),
        ("High-Precision Steel Bushings & Bearings (Batch 50)", "848210", 18.0, 1200.00),
        ("Cold-Chain Pharmaceutical Reagent Kits", "300290", 12.0, 4500.00),
        ("Logistics Hub Transportation & Dock Handling Fee", "996511", 18.0, 15000.00),
        ("Enterprise Cyber Threat Sentinel Software Subscription", "997331", 18.0, 48000.00),
        ("Custom Cast Alloy Flanges Grade 316L", "730799", 18.0, 3200.00),
        ("Industrial Solar Inverter Battery Module 48V", "850440", 12.0, 28000.00),
        ("Commercial Ergonomic Task Seating & Mesh Chairs", "940310", 18.0, 7500.00),
        ("Certified Cleanroom Consumables & Filtration Media", "591190", 12.0, 6800.00),
        ("Quarterly IT Systems Maintenance & Disaster Recovery", "998713", 18.0, 35000.00),
    ]

    base_customer_gstin = "29AABCA1234F1ZP"  # Karnataka (State 29)
    customer_name = "ACME Technologies India Pvt Ltd"

    today_dt = date.today()
    sample_docs_dir = settings.STORAGE_DIR

    validator = ValidationEngine()
    
    invoices_to_create = []

    for i in range(1, 106):
        inv_id = f"INV-2026-{i:04d}"
        inv_number = f"FAC/2026/{i+1000}"
        
        # Determine vendor
        vendor = vendor_objs[(i - 1) % len(vendor_objs)]
        vendor_state_code = vendor.state_code
        pos_state_code = "29"  # Customer state: Karnataka
        place_of_supply = "Karnataka"

        # Days offset: between 1 and 120 days ago
        days_ago = random.randint(1, 110)
        inv_dt = today_dt - timedelta(days=days_ago)
        due_dt = inv_dt + timedelta(days=30)

        # PO assignment
        po_num = None
        if i in [1, 2, 3, 4]:
            po_num = pos_data[i-1][0]
        elif i % 7 == 0:
            po_num = f"PO-2026-{8800 + (i%5)}"

        # Line items
        num_items = random.randint(1, 3)
        line_items_data = []
        subtotal = Decimal("0.00")
        cgst_total = Decimal("0.00")
        sgst_total = Decimal("0.00")
        igst_total = Decimal("0.00")

        # Pick templates
        chosen_templates = random.sample(item_templates, num_items)
        for l_idx, (t_desc, t_hsn, t_rate, t_price) in enumerate(chosen_templates, 1):
            qty = Decimal(str(random.choice([1, 2, 5, 10, 20])))
            unit_price = Decimal(str(t_price))
            disc = Decimal("0.00")
            
            # Synthetic issue: High discount anomaly on invoice #35, #70
            if i in [35, 70]:
                disc = quantize_money(qty * unit_price * Decimal("0.30"))  # 30% discount!

            taxable = quantize_money((qty * unit_price) - disc)
            subtotal += taxable
            
            rate_dec = Decimal(str(t_rate))
            tax_amt = quantize_money(taxable * rate_dec / Decimal("100.00"))

            # State check: Intra-state (29 == 29) vs Inter-state (other vs 29)
            if vendor_state_code == pos_state_code:
                c_amt = quantize_money(tax_amt / Decimal("2.00"))
                s_amt = quantize_money(tax_amt - c_amt)
                i_amt = Decimal("0.00")
            else:
                c_amt = Decimal("0.00")
                s_amt = Decimal("0.00")
                i_amt = tax_amt

            line_items_data.append({
                "line_number": l_idx,
                "description": t_desc,
                "hsn_sac": t_hsn,
                "quantity": float(qty),
                "unit": "PCS",
                "unit_price": float(unit_price),
                "item_discount": float(disc),
                "taxable_value": float(taxable),
                "gst_rate": float(t_rate),
                "cgst_amount": float(c_amt),
                "sgst_amount": float(s_amt),
                "igst_amount": float(i_amt),
                "total_amount": float(taxable + c_amt + s_amt + i_amt)
            })

            cgst_total += c_amt
            sgst_total += s_amt
            igst_total += i_amt

        tot_tax = cgst_total + sgst_total + igst_total
        other_chg = Decimal("0.00")
        round_off = Decimal("0.00")
        grand_total = subtotal + tot_tax + other_chg + round_off

        # Ingest deliberate realistic synthetic defect variations:
        notes = "DEMO DATA: Standard enterprise validation record."
        
        # Defect 1: Arithmetic Grand Total mismatch (e.g. invoice #5, #25, #65)
        if i in [5, 25, 65]:
            grand_total += Decimal("1500.00")
            notes = "DEMO DATA: Deliberate grand total calculation mismatch (+₹1500.00)."

        # Defect 2: Subtotal mismatch (e.g. invoice #12, #52)
        elif i in [12, 52]:
            subtotal += Decimal("800.00")
            notes = "DEMO DATA: Stated subtotal does not equal sum of line items."

        # Defect 3: GST split mismatch on inter-state (e.g. invoice #8, #48)
        elif i in [8, 48]:
            # Intra-state vendor charged IGST or Inter-state charged CGST
            if vendor_state_code != pos_state_code:
                cgst_total = quantize_money(tot_tax / Decimal("2.00"))
                sgst_total = quantize_money(tot_tax - cgst_total)
                igst_total = Decimal("0.00")
                notes = "DEMO DATA: Inter-state supplier erroneously charged CGST + SGST instead of IGST."
            else:
                igst_total = tot_tax
                cgst_total = Decimal("0.00")
                sgst_total = Decimal("0.00")
                notes = "DEMO DATA: Intra-state supplier erroneously charged IGST instead of CGST/SGST."

        # Defect 4: Missing / Invalid GSTIN (e.g. invoice #15, #85)
        elif i in [15, 85]:
            vendor_gstin = "INVALID-GSTIN-00"
            notes = "DEMO DATA: Malformed 15-character statutory GSTIN format."

        # Defect 5: Future-dated invoice (e.g. invoice #20, #90)
        elif i in [20, 90]:
            inv_dt = today_dt + timedelta(days=14)
            notes = "DEMO DATA: Future-dated invoice (dated 14 days ahead)."

        # Defect 6: Due date before invoice date (e.g. invoice #30)
        elif i == 30:
            due_dt = inv_dt - timedelta(days=5)
            notes = "DEMO DATA: Inverted payment due date preceding invoice issue date."

        # Defect 7: Stale record > 180 days (e.g. invoice #40)
        elif i == 40:
            inv_dt = today_dt - timedelta(days=210)
            notes = "DEMO DATA: Stale invoice (> 180 days old) requiring Section 16(4) ITC review."

        # Defect 8: Exact duplicate of another invoice (e.g. invoice #60 is duplicate of #1)
        elif i == 60:
            inv_number = "FAC/2026/1001"
            vendor = vendor_objs[0]
            notes = "DEMO DATA: Suspected exact duplicate of invoice #INV-2026-0001."

        # Defect 9: Exact round amount anomaly (e.g. invoice #18, #75)
        elif i in [18, 75]:
            grand_total = Decimal("100000.00")
            notes = "DEMO DATA: Exact lump-sum rounded amount (₹100,000.00) anomaly."

        # Defect 10: Statistical outlier amount spike (e.g. invoice #50)
        elif i == 50:
            grand_total = Decimal("850000.00")
            subtotal = Decimal("720338.98")
            tot_tax = Decimal("129661.02")
            notes = "DEMO DATA: Statistical outlier amount spike (> 4 sigma above historical vendor average)."

        stored_filename = f"{inv_id}.pdf"
        pdf_path = sample_docs_dir / stored_filename

        invoice_dict = {
            "invoice_number": inv_number,
            "invoice_date": inv_dt.isoformat(),
            "due_date": due_dt.isoformat() if due_dt else "",
            "vendor_name": vendor.name,
            "vendor_gstin": vendor.gstin if i not in [15, 85] else "INVALID-GSTIN-00",
            "vendor_address": vendor.address,
            "customer_name": customer_name,
            "customer_gstin": base_customer_gstin,
            "place_of_supply": place_of_supply,
            "pos_state_code": pos_state_code,
            "currency": "INR",
            "po_number": po_num,
            "subtotal": float(subtotal),
            "cgst_amount": float(cgst_total),
            "sgst_amount": float(sgst_total),
            "igst_amount": float(igst_total),
            "round_off": float(round_off),
            "grand_total": float(grand_total),
            "line_items": line_items_data
        }

        # Generate real PDF document on disk
        generate_sample_pdf(pdf_path, invoice_dict)

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        inv = Invoice(
            id=inv_id,
            original_filename=f"{inv_number.replace('/', '_')}.pdf",
            stored_filename=stored_filename,
            file_type="pdf",
            file_size=len(pdf_bytes),
            sha256_hash=sha256,
            invoice_number=inv_number,
            invoice_date=inv_dt.isoformat(),
            due_date=due_dt.isoformat() if due_dt else None,
            vendor_id=vendor.id,
            vendor_name=vendor.name,
            vendor_gstin=invoice_dict["vendor_gstin"],
            vendor_address=vendor.address,
            customer_name=customer_name,
            customer_gstin=base_customer_gstin,
            place_of_supply=place_of_supply,
            pos_state_code=pos_state_code,
            currency="INR",
            po_number=po_num,
            subtotal=subtotal,
            discount_amount=Decimal(str(line_items_data[0]["item_discount"] if line_items_data else 0)),
            taxable_amount=subtotal,
            cgst_amount=cgst_total,
            sgst_amount=sgst_total,
            igst_amount=igst_total,
            total_tax=tot_tax,
            other_charges=other_chg,
            round_off=round_off,
            grand_total=grand_total,
            validation_status="NEEDS_REVIEW",
            extraction_confidence=0.96,
            is_synthetic=True,
            has_po_match=(po_num in [pos_data[0][0], pos_data[1][0], pos_data[2][0], pos_data[3][0]]),
            notes=notes
        )
        db.add(inv)
        db.flush()

        # Add line items
        for itm in line_items_data:
            li = InvoiceLineItem(
                invoice_id=inv.id,
                line_number=itm["line_number"],
                description=itm["description"],
                hsn_sac=itm["hsn_sac"],
                quantity=Decimal(str(itm["quantity"])),
                unit=itm["unit"],
                unit_price=Decimal(str(itm["unit_price"])),
                item_discount=Decimal(str(itm["item_discount"])),
                taxable_value=Decimal(str(itm["taxable_value"])),
                gst_rate=Decimal(str(itm["gst_rate"])),
                cgst_amount=Decimal(str(itm["cgst_amount"])),
                sgst_amount=Decimal(str(itm["sgst_amount"])),
                igst_amount=Decimal(str(itm["igst_amount"])),
                total_amount=Decimal(str(itm["total_amount"]))
            )
            db.add(li)

        # Add document entry
        doc_entry = InvoiceDocument(
            invoice_id=inv.id,
            file_path=str(pdf_path),
            file_hash=sha256,
            mime_type="application/pdf",
            page_count=1,
            raw_text=f"Tax Invoice {inv_number} issued by {vendor.name}",
            extracted_json=invoice_dict
        )
        db.add(doc_entry)

        # Add initial audit log
        audit = AuditLog(
            user="system_seeder",
            action="INGEST_INVOICE",
            entity_type="INVOICE",
            entity_id=inv.id,
            details={"invoice_number": inv_number, "grand_total": float(grand_total)}
        )
        db.add(audit)

    db.commit()

    # Now execute initial validation runs on all invoices
    print("Running initial validation, duplicate check, and anomaly detection passes...")
    all_invoices = db.query(Invoice).all()

    dup_engine = DuplicateDetector(db)
    anomaly_engine = AnomalyEngine(db)

    for inv in all_invoices:
        # 1. Validation
        val_issues = validator.validate_invoice(inv, inv.vendor)
        for issue in val_issues:
            v_res = ValidationResult(
                invoice_id=inv.id,
                rule_code=issue["rule_code"],
                category=issue["category"],
                severity=issue["severity"],
                status=issue["status"],
                expected_value=issue.get("expected_value"),
                actual_value=issue.get("actual_value"),
                difference=issue.get("difference"),
                explanation=issue["explanation"],
                suggested_correction=issue.get("suggested_correction"),
                evidence_source=issue.get("evidence_source")
            )
            db.add(v_res)

        # 2. Duplicate Detection
        dup_matches = dup_engine.check_duplicates(inv)
        for d in dup_matches:
            dm = DuplicateMatch(
                invoice_id=inv.id,
                matched_invoice_id=d["matched_invoice_id"],
                match_type=d["match_type"],
                confidence_score=d["confidence_score"],
                matched_fields=d.get("matched_fields", []),
                resolution_note=d.get("explanation")
            )
            db.add(dm)

        # 3. Anomaly Detection
        anom_results = anomaly_engine.investigate(inv)
        for an in anom_results:
            ar = AnomalyResult(
                invoice_id=inv.id,
                anomaly_type=an["anomaly_type"],
                severity=an["severity"],
                score=an["score"],
                explanation=an["explanation"],
                recommended_action=an["recommended_action"]
            )
            db.add(ar)

        # Determine overall validation status
        critical_count = len([iss for iss in val_issues if iss["severity"] == "CRITICAL"])
        warning_count = len([iss for iss in val_issues if iss["severity"] == "WARNING"])
        high_conf_dup = any(d["confidence_score"] >= 0.85 for d in dup_matches)

        if high_conf_dup:
            inv.validation_status = "DUPLICATE_SUSPECTED"
        elif critical_count > 0:
            inv.validation_status = "FAILED"
        elif warning_count > 0:
            inv.validation_status = "PASSED_WITH_WARNINGS"
        else:
            inv.validation_status = "PASSED"

    db.commit()
    print(f"INVOSTRATA database seeded successfully with {len(all_invoices)} validated invoices.")
    db.close()

if __name__ == "__main__":
    seed_database()
