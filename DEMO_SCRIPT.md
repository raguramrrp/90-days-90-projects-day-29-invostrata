# VALICORA 90-Second Portfolio Demonstration Script

## Objective
Demonstrate automated invoice ingestion, arithmetic validation, Indian GST checks, duplicate detection, and 3-way matching.

---

### Step 1: Overview Dashboard (0 - 20s)
1. Launch the application by executing `run.bat` and navigate to `http://localhost:8000`.
2. Observe the KPI summary strip: 105 Ingested Invoices, 75+ Passed Validation, active exceptions, and suspected duplicates.
3. Review the status distribution donut chart and top discrepancy breakdown.

### Step 2: Invoice Queue & Inspection Panel (20 - 45s)
1. Click **Invoice Queue** in the left icon rail.
2. Filter by status: select **Failed Validation**.
3. Click invoice `INV-2026-0005` to open the right-side Inspection Panel.
4. Switch to the **Validation** tab: observe the `ARITH_GRAND_TOTAL_MISMATCH` critical error highlighting the exact variance.
5. Switch to the **Document Preview** tab: view the actual rendered PDF invoice.

### Step 3: Exceptions Ledger & Auditor Resolution (45 - 65s)
1. Click **Exceptions** in the navigation rail.
2. Filter by category: **TAX_GST**.
3. View the GST split discrepancies (e.g., inter-state suppliers charging CGST/SGST instead of IGST).
4. Click **Review** on an exception, enter an auditor justification note, and submit.

### Step 4: Three-Way Matching & Procurement (65 - 80s)
1. Navigate to **Purchase Orders**.
2. Select invoice `INV-2026-0001` with referenced PO `PO-2026-8801`.
3. Highlight the 3-way reconciliation between PO items, Goods Received Note (GRN) acceptance, and billed invoice amounts.

### Step 5: Reports Export (80 - 90s)
1. Click **Reports** in the navigation rail.
2. Click **Download Audit PDF** to generate an executive ReportLab compliance PDF report.
3. Click **Export CSV** to download the complete invoice verification ledger.
