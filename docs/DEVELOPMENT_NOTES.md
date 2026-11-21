# INVOSTRATA — Development Notes & Engineering Decisions

## 1. Absolute Precision with Python Decimal
In financial operations, floating-point numbers (`0.1 + 0.2 = 0.30000000000000004`) lead to accumulated compounding rounding errors that can trigger false fraud alerts. INVOSTRATA strictly enforces `decimal.Decimal` with explicit `ROUND_HALF_UP` quantization across all monetary fields:
- 2 decimal places (`0.01`) for currency values.
- 3 decimal places (`0.001`) for fractional physical quantities.
- Tolerances default to ₹0.05 to accommodate natural fractional rounding on large line item counts.

## 2. Indian GST Validation Logic
- **Structure**: Validated using regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`.
- **State Codes**: First two digits mapped against 38 official state/union territory prefixes.
- **Intra vs Inter-State Logic**:
  - `Supplier State == Place of Supply`: Intra-state supply. Enforces `CGST == SGST` and `IGST == 0`.
  - `Supplier State != Place of Supply`: Inter-state supply. Enforces `IGST > 0` and `CGST == 0, SGST == 0`.

## 3. Storage & Document Previews
- Every uploaded document receives a SHA-256 binary hash before saving to `storage/invoices/{INV-ID}.{ext}`.
- Original extracted fields are stored separately from manually corrected values in `extracted_fields` to maintain compliance audit trails.
