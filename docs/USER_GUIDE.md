# INVOSTRATA — User Operations Guide

## Navigation & Workspaces

INVOSTRATA organizes accounting operations across 10 distinct workspaces via the slim left navigation rail:

1. **Overview**: High-level financial validation KPIs, volume velocity, distribution donut chart, and high-priority statutory audit checks.
2. **Invoice Queue**: The primary operational workspace with structured table columns, search, filtering by status/vendor/amount, batch revalidation, and single-click access to the right-side Inspection Panel.
3. **Import Invoices**: Drag-and-drop ingestion supporting multi-file batch uploads (PDF, PNG, JPG, CSV, Excel) and manual invoice entry forms.
4. **Validation Centre**: Deep audit trace grouped by Arithmetic, Indian GST, Statutory Dates, Duplicates, and Anomaly checks.
5. **Exceptions**: Focused exception-management ledger allowing auditors to review discrepancies and document justification notes.
6. **Vendors**: Registered corporate supplier directory with real computed billing statistics, GSTIN consistency, and historical submissions.
7. **Purchase Orders**: Procurement directory and automated 3-way matching reconciler (PO vs GRN vs Invoice line items).
8. **Reports**: Recharts operational analytics with one-click executive ReportLab PDF and Pandas CSV exports.
9. **Audit History**: Complete immutable audit log of every operation.
10. **Settings**: Configurable rounding tolerance, maximum invoice age days, anomaly discount thresholds, and active rule registry.

## Reviewing Discrepancies & Approving Invoices
1. In the **Invoice Queue**, click an invoice row to open the **Invoice Inspector**.
2. Switch between **Overview**, **Validation**, and **Document Preview** tabs.
3. If values were misstated, click **Edit Fields**, input corrected amounts, and click **Save Correction & Revalidate**.
4. Once verified, click **Approve Invoice** or **Reject** with documented justification.
