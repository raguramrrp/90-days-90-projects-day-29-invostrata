# VALICORA — Project Overview

## Domain & Problem Statement
In corporate finance and accounts payable (AP) operations, invoice processing is prone to costly arithmetic mistakes, statutory tax non-compliance under Indian Goods and Services Tax (GST) laws, duplicate vendor submissions, and unverified commercial billing spikes. Manual verification is slow, error-prone, and struggles to explain discrepancies.

VALICORA solves this by providing a local-first, deterministic validation and financial consistency workstation that ingests multi-format invoices, parses deliverables, mathematically audits every line item using exact decimal arithmetic, checks GST rules, uncovers duplicate submissions, investigates anomalies, and reconciles 3-way purchase orders.

## Core Objectives
1. **Mathematical Integrity**: Verify that `Quantity × Unit Price - Discount = Taxable Value`, and that subtotal and grand total reconcile to the paise without IEEE 754 floating-point inaccuracies.
2. **Indian GST Rules**: Enforce 15-character GSTIN structure, validate state codes, and verify that intra-state supplies split equally into CGST/SGST while inter-state supplies apply IGST.
3. **Multi-Tiered Duplicate Detection**: Catch exact file duplicates (SHA-256 binary hash), exact statutory duplicates, and near-match duplicates.
4. **Explainable Anomaly Alerts**: Flag statistical outliers, excessive commercial discounts, and round lump-sum billing.
5. **Three-Way Matching**: Compare PO contracts, warehouse Goods Received Notes (GRN), and invoice totals.
