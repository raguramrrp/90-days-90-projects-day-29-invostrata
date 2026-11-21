# INVOSTRATA — Automated Testing & Quality Assurance

## Test Suite Execution
Execute the automated test suite using:
```cmd
test.bat
```
Or via Python:
```cmd
python -m pytest tests/ -v
```

## Test Coverage Summary

| Test File | Focus Area | Status |
|-----------|------------|--------|
| `test_decimal_math.py` | Decimal conversion, quantization, line math, tolerance checks | **PASS** |
| `test_financial_validator.py` | Basic field validation, arithmetic reconciliation, dates | **PASS** |
| `test_gst_validation.py` | 15-character GSTIN format, state codes, intra/inter-state split | **PASS** |
| `test_duplicate_detector.py` | Exact SHA-256 hash match, statutory field duplicates | **PASS** |
| `test_anomaly_engine.py` | Suspect round amounts, high discount percentage anomalies | **PASS** |
| `test_three_way_matching.py` | PO + GRN + Invoice line item alignment, unreferenced PO | **PASS** |
| `test_invoices_api.py` | Invoices CRUD, manual creation, approval/rejection workflow | **PASS** |
| `test_reports.py` | Pandas CSV export and ReportLab PDF document generation | **PASS** |

**Total Tests:** 23 Passed | **Execution Time:** ~3.5 seconds
