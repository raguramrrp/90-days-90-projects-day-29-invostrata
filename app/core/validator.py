from datetime import datetime, date
from decimal import Decimal
import re
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings
from app.core.decimal_math import (
    to_decimal, quantize_money, quantize_quantity,
    calculate_line_item, calculate_gst_amount,
    is_within_tolerance, calculate_discrepancy
)
from app.models.entities import Invoice, InvoiceLineItem, Vendor, ValidationResult

GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")

class ValidationEngine:
    """
    Deterministic financial validation engine for invoice verification,
    arithmetic reconciliation, Indian GST consistency, and vendor matching.
    """

    def __init__(self, rounding_tolerance: Decimal = Decimal(str(settings.ROUNDING_TOLERANCE))):
        self.tolerance = rounding_tolerance

    def validate_invoice(self, invoice: Invoice, vendor: Optional[Vendor] = None) -> List[Dict[str, Any]]:
        """
        Runs all validation suites against an invoice and returns a list of ValidationResult dictionaries.
        """
        results: List[Dict[str, Any]] = []

        # 1. Basic Field Validation
        results.extend(self._validate_basic_fields(invoice))

        # 2. Date Validation
        results.extend(self._validate_dates(invoice))

        # 3. Arithmetic Validation
        results.extend(self._validate_arithmetic(invoice))

        # 4. Indian GST Validation
        results.extend(self._validate_gst(invoice))

        # 5. Vendor Consistency Validation
        results.extend(self._validate_vendor(invoice, vendor))

        return results

    # ---------------- 1. BASIC FIELD VALIDATION ----------------
    def _validate_basic_fields(self, invoice: Invoice) -> List[Dict[str, Any]]:
        issues = []

        if not invoice.invoice_number or not str(invoice.invoice_number).strip():
            issues.append({
                "rule_code": "REQ_INVOICE_NUM",
                "category": "BASIC",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": "Non-empty string",
                "actual_value": "Missing / Null",
                "difference": "N/A",
                "explanation": "Invoice number is mandatory for statutory compliance and accounting ingestion.",
                "suggested_correction": "Review source document header and manually enter the invoice identifier.",
                "evidence_source": "Invoice Header"
            })

        if not invoice.vendor_name or not str(invoice.vendor_name).strip():
            issues.append({
                "rule_code": "REQ_VENDOR_NAME",
                "category": "BASIC",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": "Registered Vendor Name",
                "actual_value": "Missing / Null",
                "difference": "N/A",
                "explanation": "Vendor legal trading name is required to associate billing liabilities.",
                "suggested_correction": "Inspect vendor block on the document or link to an existing vendor.",
                "evidence_source": "Vendor Details Block"
            })

        if not invoice.line_items or len(invoice.line_items) == 0:
            issues.append({
                "rule_code": "REQ_LINE_ITEMS",
                "category": "BASIC",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": "At least 1 line item",
                "actual_value": "0 line items found",
                "difference": "N/A",
                "explanation": "Invoice does not contain itemized billing entries or parsing failed to extract items.",
                "suggested_correction": "Manually add line items or verify tabular extraction regions.",
                "evidence_source": "Item Table"
            })
        else:
            for idx, item in enumerate(invoice.line_items, 1):
                qty = to_decimal(item.quantity)
                price = to_decimal(item.unit_price)
                disc = to_decimal(item.item_discount)

                if qty <= Decimal("0.000"):
                    issues.append({
                        "rule_code": f"ITEM_QTY_POSITIVE_L{idx}",
                        "category": "BASIC",
                        "severity": "CRITICAL",
                        "status": "FAIL",
                        "expected_value": "> 0.000",
                        "actual_value": str(qty),
                        "difference": str(qty),
                        "explanation": f"Line item #{idx} ({item.description}) has zero or negative quantity.",
                        "suggested_correction": "Correct line item quantity to a positive number.",
                        "evidence_source": f"Line Item #{idx}"
                    })

                if price < Decimal("0.00"):
                    issues.append({
                        "rule_code": f"ITEM_PRICE_NON_NEG_L{idx}",
                        "category": "BASIC",
                        "severity": "CRITICAL",
                        "status": "FAIL",
                        "expected_value": ">= 0.00",
                        "actual_value": str(price),
                        "difference": str(price),
                        "explanation": f"Line item #{idx} ({item.description}) has a negative unit rate.",
                        "suggested_correction": "Verify if this should be an item discount instead of negative price.",
                        "evidence_source": f"Line Item #{idx}"
                    })

                if disc < Decimal("0.00"):
                    issues.append({
                        "rule_code": f"ITEM_DISC_NON_NEG_L{idx}",
                        "category": "BASIC",
                        "severity": "WARNING",
                        "status": "FAIL",
                        "expected_value": ">= 0.00",
                        "actual_value": str(disc),
                        "difference": str(disc),
                        "explanation": f"Line item #{idx} has a negative discount, which adds unauthorized surcharges.",
                        "suggested_correction": "Ensure discount is zero or positive.",
                        "evidence_source": f"Line Item #{idx}"
                    })

        return issues

    # ---------------- 2. DATE VALIDATION ----------------
    def _validate_dates(self, invoice: Invoice) -> List[Dict[str, Any]]:
        issues = []
        inv_dt = None
        due_dt = None

        if not invoice.invoice_date:
            issues.append({
                "rule_code": "REQ_INVOICE_DATE",
                "category": "DATE",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": "Valid ISO date (YYYY-MM-DD)",
                "actual_value": "Missing / Null",
                "difference": "N/A",
                "explanation": "Invoice date is missing. Statutory GST rules require clear supply dates.",
                "suggested_correction": "Enter the date printed on the invoice document.",
                "evidence_source": "Invoice Date Field"
            })
        else:
            try:
                inv_dt = datetime.strptime(str(invoice.invoice_date).strip(), "%Y-%m-%d").date()
            except ValueError:
                issues.append({
                    "rule_code": "INVALID_DATE_FORMAT",
                    "category": "DATE",
                    "severity": "CRITICAL",
                    "status": "FAIL",
                    "expected_value": "YYYY-MM-DD",
                    "actual_value": str(invoice.invoice_date),
                    "difference": "N/A",
                    "explanation": "Invoice date cannot be parsed into a standard YYYY-MM-DD date format.",
                    "suggested_correction": "Convert date string to standard ISO format.",
                    "evidence_source": "Invoice Date Field"
                })

        if invoice.due_date and str(invoice.due_date).strip():
            try:
                due_dt = datetime.strptime(str(invoice.due_date).strip(), "%Y-%m-%d").date()
            except ValueError:
                issues.append({
                    "rule_code": "INVALID_DUE_DATE_FORMAT",
                    "category": "DATE",
                    "severity": "WARNING",
                    "status": "FAIL",
                    "expected_value": "YYYY-MM-DD",
                    "actual_value": str(invoice.due_date),
                    "difference": "N/A",
                    "explanation": "Due date format is invalid.",
                    "suggested_correction": "Reformat due date to YYYY-MM-DD.",
                    "evidence_source": "Payment Terms"
                })

        today = date.today()

        if inv_dt:
            # Check future date
            if inv_dt > today:
                issues.append({
                    "rule_code": "DATE_FUTURE_DATED",
                    "category": "DATE",
                    "severity": "CRITICAL",
                    "status": "FAIL",
                    "expected_value": f"<= {today.isoformat()}",
                    "actual_value": inv_dt.isoformat(),
                    "difference": f"{(inv_dt - today).days} days in future",
                    "explanation": f"Invoice date ({inv_dt.isoformat()}) is in the future. Invoices cannot precede actual supply.",
                    "suggested_correction": "Verify if the date was misread (e.g. DD/MM vs MM/DD) or if document is post-dated.",
                    "evidence_source": "Invoice Date"
                })

            # Check unusually old invoice
            age_days = (today - inv_dt).days
            if age_days > settings.MAX_INVOICE_AGE_DAYS:
                issues.append({
                    "rule_code": "DATE_STALE_RECORD",
                    "category": "DATE",
                    "severity": "WARNING",
                    "status": "FAIL",
                    "expected_value": f"Within {settings.MAX_INVOICE_AGE_DAYS} days",
                    "actual_value": f"{age_days} days old ({inv_dt.isoformat()})",
                    "difference": f"{age_days - settings.MAX_INVOICE_AGE_DAYS} days beyond limit",
                    "explanation": f"Invoice is {age_days} days old. Input Tax Credit (ITC) claiming windows may be restricted under Section 16(4).",
                    "suggested_correction": "Review whether ITC can still be claimed for this financial period.",
                    "evidence_source": "Invoice Age Calculation"
                })

            # Check due date sequence
            if due_dt and due_dt < inv_dt:
                issues.append({
                    "rule_code": "DATE_DUE_BEFORE_INVOICE",
                    "category": "DATE",
                    "severity": "CRITICAL",
                    "status": "FAIL",
                    "expected_value": f">= {inv_dt.isoformat()}",
                    "actual_value": due_dt.isoformat(),
                    "difference": f"{(inv_dt - due_dt).days} days inverted",
                    "explanation": f"Due date ({due_dt.isoformat()}) is earlier than invoice date ({inv_dt.isoformat()}).",
                    "suggested_correction": "Adjust payment due date according to agreed credit terms.",
                    "evidence_source": "Payment Terms Block"
                })

        return issues

    # ---------------- 3. ARITHMETIC VALIDATION ----------------
    def _validate_arithmetic(self, invoice: Invoice) -> List[Dict[str, Any]]:
        issues = []

        calc_subtotal = Decimal("0.00")
        calc_cgst = Decimal("0.00")
        calc_sgst = Decimal("0.00")
        calc_igst = Decimal("0.00")

        # Line item arithmetic checks
        if invoice.line_items:
            for idx, item in enumerate(invoice.line_items, 1):
                qty = quantize_quantity(item.quantity)
                price = quantize_money(item.unit_price)
                disc = quantize_money(item.item_discount)
                stated_taxable = quantize_money(item.taxable_value)

                expected_taxable = calculate_line_item(qty, price, disc)
                calc_subtotal += expected_taxable

                diff_taxable = calculate_discrepancy(expected_taxable, stated_taxable)
                if abs(diff_taxable) > self.tolerance:
                    issues.append({
                        "rule_code": f"ARITH_LINE_TAXABLE_L{idx}",
                        "category": "ARITHMETIC",
                        "severity": "CRITICAL",
                        "status": "FAIL",
                        "expected_value": f"{expected_taxable:.2f}",
                        "actual_value": f"{stated_taxable:.2f}",
                        "difference": f"{diff_taxable:+.2f}",
                        "explanation": f"Line #{idx} calculation mismatch: ({qty} × {price:.2f}) - {disc:.2f} should equal {expected_taxable:.2f}, but document states {stated_taxable:.2f}.",
                        "suggested_correction": f"Update Line #{idx} taxable amount to {expected_taxable:.2f}.",
                        "evidence_source": f"Line Item #{idx}"
                    })

                # Line item tax calculations if rate provided
                rate = to_decimal(item.gst_rate)
                if rate > Decimal("0.00"):
                    expected_tax = calculate_gst_amount(expected_taxable, rate)
                    
                    # Accumulate for subtotal checks
                    stated_cgst = quantize_money(item.cgst_amount)
                    stated_sgst = quantize_money(item.sgst_amount)
                    stated_igst = quantize_money(item.igst_amount)
                    
                    calc_cgst += stated_cgst
                    calc_sgst += stated_sgst
                    calc_igst += stated_igst

        # Subtotal reconciliation
        stated_subtotal = quantize_money(invoice.subtotal)
        calc_subtotal = quantize_money(calc_subtotal)
        diff_subtotal = calculate_discrepancy(calc_subtotal, stated_subtotal)

        if abs(diff_subtotal) > self.tolerance:
            issues.append({
                "rule_code": "ARITH_SUBTOTAL_MISMATCH",
                "category": "ARITHMETIC",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": f"{calc_subtotal:.2f}",
                "actual_value": f"{stated_subtotal:.2f}",
                "difference": f"{diff_subtotal:+.2f}",
                "explanation": f"Sum of taxable line items ({calc_subtotal:.2f}) does not match stated invoice subtotal ({stated_subtotal:.2f}).",
                "suggested_correction": f"Adjust subtotal to {calc_subtotal:.2f}.",
                "evidence_source": "Subtotal Row"
            })

        # Tax Totals Reconciliation
        stated_cgst = quantize_money(invoice.cgst_amount)
        stated_sgst = quantize_money(invoice.sgst_amount)
        stated_igst = quantize_money(invoice.igst_amount)
        stated_tax = quantize_money(invoice.total_tax)
        computed_tax = quantize_money(stated_cgst + stated_sgst + stated_igst)

        diff_tax = calculate_discrepancy(computed_tax, stated_tax)
        if abs(diff_tax) > self.tolerance:
            issues.append({
                "rule_code": "ARITH_TAX_SUM_MISMATCH",
                "category": "ARITHMETIC",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": f"{computed_tax:.2f}",
                "actual_value": f"{stated_tax:.2f}",
                "difference": f"{diff_tax:+.2f}",
                "explanation": f"Sum of tax components (CGST {stated_cgst:.2f} + SGST {stated_sgst:.2f} + IGST {stated_igst:.2f} = {computed_tax:.2f}) does not equal total tax ({stated_tax:.2f}).",
                "suggested_correction": f"Update total tax field to {computed_tax:.2f}.",
                "evidence_source": "Tax Summary Table"
            })

        # Grand Total Reconciliation
        other = quantize_money(invoice.other_charges)
        round_off = quantize_money(invoice.round_off)
        stated_grand_total = quantize_money(invoice.grand_total)

        # Expected grand total = Subtotal + Total Tax + Other Charges + Round Off
        expected_grand_total = quantize_money(stated_subtotal + stated_tax + other + round_off)
        diff_grand_total = calculate_discrepancy(expected_grand_total, stated_grand_total)

        if abs(diff_grand_total) > self.tolerance:
            issues.append({
                "rule_code": "ARITH_GRAND_TOTAL_MISMATCH",
                "category": "ARITHMETIC",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": f"{expected_grand_total:.2f}",
                "actual_value": f"{stated_grand_total:.2f}",
                "difference": f"{diff_grand_total:+.2f}",
                "explanation": f"Grand total mismatch: Subtotal ({stated_subtotal:.2f}) + Tax ({stated_tax:.2f}) + Other ({other:.2f}) + Round-off ({round_off:.2f}) equals {expected_grand_total:.2f}, but invoice states {stated_grand_total:.2f}.",
                "suggested_correction": f"Correct grand total to {expected_grand_total:.2f} or adjust round-off difference.",
                "evidence_source": "Grand Total Row"
            })

        # Check round-off reasonableness
        if abs(round_off) > Decimal("5.00"):
            issues.append({
                "rule_code": "ARITH_EXCESSIVE_ROUNDOFF",
                "category": "ARITHMETIC",
                "severity": "WARNING",
                "status": "FAIL",
                "expected_value": "Between -1.00 and +1.00",
                "actual_value": f"{round_off:.2f}",
                "difference": f"{round_off:.2f}",
                "explanation": f"Round-off amount ({round_off:.2f}) exceeds normal fractional rounding bounds.",
                "suggested_correction": "Ensure round-off only captures minor decimal fractions.",
                "evidence_source": "Round-off Entry"
            })

        return issues

    # ---------------- 4. INDIAN GST VALIDATION ----------------
    def _validate_gst(self, invoice: Invoice) -> List[Dict[str, Any]]:
        issues = []
        vendor_gstin = str(invoice.vendor_gstin or "").strip().upper()
        customer_gstin = str(invoice.customer_gstin or "").strip().upper()

        vendor_state_code = None
        customer_state_code = None

        # Vendor GSTIN Format & State Code
        if not vendor_gstin:
            issues.append({
                "rule_code": "GST_VENDOR_GSTIN_MISSING",
                "category": "TAX_GST",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": "15-digit alphanumeric GSTIN",
                "actual_value": "Missing / Null",
                "difference": "N/A",
                "explanation": "Vendor GSTIN is missing. Registered businesses must provide GSTIN on tax invoices.",
                "suggested_correction": "Obtain valid 15-character GSTIN from vendor master or document.",
                "evidence_source": "Vendor Details Block"
            })
        else:
            if not GSTIN_REGEX.match(vendor_gstin):
                issues.append({
                    "rule_code": "GST_INVALID_VENDOR_FORMAT",
                    "category": "TAX_GST",
                    "severity": "CRITICAL",
                    "status": "FAIL",
                    "expected_value": "Standard 15-char format (e.g. 27AABCU9603R1ZM)",
                    "actual_value": vendor_gstin,
                    "difference": f"Length {len(vendor_gstin)} / Invalid structure",
                    "explanation": f"Vendor GSTIN '{vendor_gstin}' fails statutory format checksum validation.",
                    "suggested_correction": "Verify GSTIN against government GST portal records.",
                    "evidence_source": "Vendor GSTIN Field"
                })
            else:
                vendor_state_code = vendor_gstin[:2]
                if vendor_state_code not in settings.GST_STATE_CODES:
                    issues.append({
                        "rule_code": "GST_INVALID_VENDOR_STATE",
                        "category": "TAX_GST",
                        "severity": "CRITICAL",
                        "status": "FAIL",
                        "expected_value": "Valid 2-digit Indian State Code (01-38, 97)",
                        "actual_value": vendor_state_code,
                        "difference": "Unknown State Code",
                        "explanation": f"State prefix '{vendor_state_code}' does not correspond to any recognized Indian state or union territory.",
                        "suggested_correction": "Update GSTIN with valid state code prefix.",
                        "evidence_source": "GSTIN State Prefix"
                    })

        # Customer GSTIN if present
        if customer_gstin:
            if not GSTIN_REGEX.match(customer_gstin):
                issues.append({
                    "rule_code": "GST_INVALID_CUSTOMER_FORMAT",
                    "category": "TAX_GST",
                    "severity": "WARNING",
                    "status": "FAIL",
                    "expected_value": "Standard 15-character GSTIN",
                    "actual_value": customer_gstin,
                    "difference": "Invalid structure",
                    "explanation": f"Customer/Recipient GSTIN '{customer_gstin}' does not follow statutory 15-character structure.",
                    "suggested_correction": "Verify recipient GSTIN on corporate records.",
                    "evidence_source": "Billed-To Customer Block"
                })
            else:
                customer_state_code = customer_gstin[:2]

        # Place of supply check & CGST/SGST vs IGST split
        pos_code = str(invoice.pos_state_code or "").strip()
        if not pos_code and customer_state_code:
            pos_code = customer_state_code

        cgst = quantize_money(invoice.cgst_amount)
        sgst = quantize_money(invoice.sgst_amount)
        igst = quantize_money(invoice.igst_amount)

        if vendor_state_code and pos_code:
            # Intra-state supply: Vendor State == Place of Supply
            if vendor_state_code == pos_code:
                if igst > self.tolerance:
                    issues.append({
                        "rule_code": "GST_INVALID_IGST_ON_INTRASTATE",
                        "category": "TAX_GST",
                        "severity": "CRITICAL",
                        "status": "FAIL",
                        "expected_value": "IGST = 0.00 (Intra-state Supply)",
                        "actual_value": f"IGST = {igst:.2f}",
                        "difference": f"{igst:.2f}",
                        "explanation": f"Supplier state ({vendor_state_code} - {settings.GST_STATE_CODES.get(vendor_state_code, 'Unknown')}) matches Place of Supply ({pos_code}). CGST and SGST apply, NOT IGST.",
                        "suggested_correction": "Split IGST equally into CGST and SGST.",
                        "evidence_source": "Tax Breakdown & Place of Supply"
                    })
                # Check CGST == SGST
                if abs(cgst - sgst) > self.tolerance:
                    issues.append({
                        "rule_code": "GST_CGST_SGST_ASYMMETRY",
                        "category": "TAX_GST",
                        "severity": "CRITICAL",
                        "status": "FAIL",
                        "expected_value": f"CGST == SGST (Half each: {((cgst + sgst)/2):.2f})",
                        "actual_value": f"CGST: {cgst:.2f}, SGST: {sgst:.2f}",
                        "difference": f"Difference: {abs(cgst - sgst):.2f}",
                        "explanation": "Under Indian GST law, CGST and SGST must be charged at identical rates and amounts for intra-state supplies.",
                        "suggested_correction": "Balance CGST and SGST amounts equally.",
                        "evidence_source": "Tax Split Columns"
                    })
            else:
                # Inter-state supply: Vendor State != Place of Supply
                if (cgst > self.tolerance) or (sgst > self.tolerance):
                    issues.append({
                        "rule_code": "GST_INVALID_CGST_SGST_ON_INTERSTATE",
                        "category": "TAX_GST",
                        "severity": "CRITICAL",
                        "status": "FAIL",
                        "expected_value": "CGST = 0.00, SGST = 0.00 (Inter-state Supply)",
                        "actual_value": f"CGST: {cgst:.2f}, SGST: {sgst:.2f}",
                        "difference": f"Total local tax: {(cgst + sgst):.2f}",
                        "explanation": f"Supplier state ({vendor_state_code}) differs from Place of Supply ({pos_code}). IGST is mandatory; CGST and SGST cannot be levied.",
                        "suggested_correction": "Combine CGST and SGST into IGST.",
                        "evidence_source": "Tax Split & Place of Supply"
                    })

        # Check line item GST rate standard slabs
        if invoice.line_items:
            for idx, item in enumerate(invoice.line_items, 1):
                rate = float(item.gst_rate or 0.0)
                if rate not in settings.STANDARD_GST_RATES:
                    issues.append({
                        "rule_code": f"GST_NON_STANDARD_RATE_L{idx}",
                        "category": "TAX_GST",
                        "severity": "WARNING",
                        "status": "FAIL",
                        "expected_value": f"Standard slab: {settings.STANDARD_GST_RATES}%",
                        "actual_value": f"{rate}%",
                        "difference": f"{rate}% non-standard",
                        "explanation": f"Line #{idx} specifies {rate}% GST, which is not one of the standard statutory slabs (0%, 5%, 12%, 18%, 28%).",
                        "suggested_correction": "Confirm with vendor whether a special notification or composition scheme applies.",
                        "evidence_source": f"Line Item #{idx}"
                    })

        return issues

    # ---------------- 5. VENDOR CONSISTENCY VALIDATION ----------------
    def _validate_vendor(self, invoice: Invoice, vendor: Optional[Vendor] = None) -> List[Dict[str, Any]]:
        issues = []

        if not vendor:
            issues.append({
                "rule_code": "VENDOR_NOT_REGISTERED",
                "category": "VENDOR",
                "severity": "WARNING",
                "status": "FAIL",
                "expected_value": "Vendor registered in system directory",
                "actual_value": invoice.vendor_name or "Unidentified",
                "difference": "Unmatched Vendor Master",
                "explanation": f"Vendor '{invoice.vendor_name}' is not currently registered in the vendor directory.",
                "suggested_correction": "Create a new vendor profile or link to existing alias.",
                "evidence_source": "Vendor Master Match"
            })
            return issues

        # Check GSTIN match with vendor master
        if vendor.gstin and invoice.vendor_gstin:
            master_gstin = str(vendor.gstin).strip().upper()
            inv_gstin = str(invoice.vendor_gstin).strip().upper()
            if master_gstin != inv_gstin:
                issues.append({
                    "rule_code": "VENDOR_GSTIN_MISMATCH",
                    "category": "VENDOR",
                    "severity": "CRITICAL",
                    "status": "FAIL",
                    "expected_value": master_gstin,
                    "actual_value": inv_gstin,
                    "difference": "GSTIN Discrepancy",
                    "explanation": f"Invoice GSTIN '{inv_gstin}' does not match registered vendor master GSTIN '{master_gstin}'.",
                    "suggested_correction": "Investigate if vendor has re-registered or changed branch location.",
                    "evidence_source": "Vendor Master vs Invoice GSTIN"
                })

        # Check vendor status
        if vendor.status == "BLOCKED":
            issues.append({
                "rule_code": "VENDOR_BLOCKED",
                "category": "VENDOR",
                "severity": "CRITICAL",
                "status": "FAIL",
                "expected_value": "ACTIVE status",
                "actual_value": "BLOCKED",
                "difference": "Restricted Vendor",
                "explanation": f"Vendor '{vendor.name}' is currently flagged as BLOCKED in the financial directory. Processing payments is prohibited.",
                "suggested_correction": "Escalate to procurement and legal compliance.",
                "evidence_source": "Vendor Directory Status"
            })
        elif vendor.status == "UNDER_REVIEW":
            issues.append({
                "rule_code": "VENDOR_UNDER_REVIEW",
                "category": "VENDOR",
                "severity": "WARNING",
                "status": "FAIL",
                "expected_value": "ACTIVE status",
                "actual_value": "UNDER_REVIEW",
                "difference": "Review Pending",
                "explanation": f"Vendor '{vendor.name}' is marked UNDER_REVIEW.",
                "suggested_correction": "Review vendor onboarding compliance before approving.",
                "evidence_source": "Vendor Directory Status"
            })

        return issues
