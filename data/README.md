# INVOSTRATA Data Specification & Synthetic Generator

## Overview
INVOSTRATA uses realistic synthetic Indian commercial invoice records. All synthetic records are explicitly tagged with `is_synthetic = True` and notes starting with `DEMO DATA:`.

## Schema Attributes
- `id`: Human-readable identifier (e.g. `INV-2026-0001`)
- `invoice_number`: Vendor invoice number (e.g. `FAC/2026/1001`)
- `invoice_date`: Statutory supply date (ISO format YYYY-MM-DD)
- `due_date`: Payment credit terms due date
- `vendor_gstin`: 15-character statutory GST identification number
- `place_of_supply`: Indian state destination
- `subtotal`: Taxable amount computed deterministically via Python Decimal
- `cgst_amount` / `sgst_amount`: Intra-state tax split (equal 50/50 division)
- `igst_amount`: Inter-state tax levy
- `grand_total`: Final reconciled gross amount

## Included Edge Cases & Scenarios
1. **Valid Invoices**: Completely reconciled line items and GST splits.
2. **Arithmetic Variances**: Deliberate grand total and subtotal discrepancies (+₹1,500.00).
3. **GST Split Errors**: Inter-state suppliers billing local CGST/SGST instead of IGST.
4. **Invalid GSTIN**: Malformed checksums and invalid state codes.
5. **Future-Dated Invoices**: Invoices dated ahead of calendar date.
6. **Inverted Due Dates**: Due date preceding issue date.
7. **Stale Records**: Invoices older than 180 days (Section 16(4) ITC flags).
8. **Duplicates**: Exact binary SHA-256 matches and statutory field near-duplicates.
9. **Lump-Sum Round Amounts**: Suspicious round multiples (₹50,000 / ₹100,000).
10. **High Discounts**: Commercial discounts exceeding 20%.
