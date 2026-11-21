from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ----------------- Line Item Schemas -----------------
class LineItemBase(BaseModel):
    description: str
    hsn_sac: Optional[str] = "998313"
    quantity: float = 1.0
    unit: str = "PCS"
    unit_price: float = 0.0
    item_discount: float = 0.0
    taxable_value: float = 0.0
    gst_rate: float = 18.0
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0
    total_amount: float = 0.0

class LineItemCreate(LineItemBase):
    pass

class LineItemResponse(LineItemBase):
    id: int
    invoice_id: str
    line_number: int
    is_corrected: bool = False

    class Config:
        from_attributes = True

# ----------------- Invoice Schemas -----------------
class InvoiceCreate(BaseModel):
    invoice_number: str
    invoice_date: str
    due_date: Optional[str] = None
    vendor_name: str
    vendor_gstin: Optional[str] = None
    vendor_address: Optional[str] = None
    customer_name: Optional[str] = "ACME Technologies India Pvt Ltd"
    customer_gstin: Optional[str] = "29AABCA1234F1ZP"
    place_of_supply: Optional[str] = "Karnataka"
    pos_state_code: Optional[str] = "29"
    currency: str = "INR"
    po_number: Optional[str] = None
    subtotal: float = 0.0
    discount_amount: float = 0.0
    taxable_amount: float = 0.0
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0
    total_tax: float = 0.0
    other_charges: float = 0.0
    round_off: float = 0.0
    grand_total: float = 0.0
    notes: Optional[str] = None
    line_items: List[LineItemCreate] = []

class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_gstin: Optional[str] = None
    subtotal: Optional[float] = None
    discount_amount: Optional[float] = None
    taxable_amount: Optional[float] = None
    cgst_amount: Optional[float] = None
    sgst_amount: Optional[float] = None
    igst_amount: Optional[float] = None
    total_tax: Optional[float] = None
    other_charges: Optional[float] = None
    round_off: Optional[float] = None
    grand_total: Optional[float] = None
    notes: Optional[str] = None

class ValidationResultResponse(BaseModel):
    id: int
    rule_code: str
    category: str
    severity: str
    status: str
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    difference: Optional[str] = None
    explanation: str
    suggested_correction: Optional[str] = None
    evidence_source: Optional[str] = None
    is_reviewed: bool = False
    review_note: Optional[str] = None

    class Config:
        from_attributes = True

class DuplicateMatchResponse(BaseModel):
    id: int
    matched_invoice_id: str
    match_type: str
    confidence_score: float
    matched_fields: Optional[Any] = None
    is_resolved: bool = False
    resolution_note: Optional[str] = None

    class Config:
        from_attributes = True

class AnomalyResultResponse(BaseModel):
    id: int
    anomaly_type: str
    severity: str
    score: float
    explanation: str
    recommended_action: Optional[str] = None
    is_investigated: bool = False
    investigation_note: Optional[str] = None

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: str
    original_filename: str
    stored_filename: str
    file_type: str
    file_size: int
    sha256_hash: str
    invoice_number: Optional[str]
    invoice_date: Optional[str]
    due_date: Optional[str]
    vendor_id: Optional[int]
    vendor_name: Optional[str]
    vendor_gstin: Optional[str]
    vendor_address: Optional[str]
    customer_name: Optional[str]
    customer_gstin: Optional[str]
    place_of_supply: Optional[str]
    pos_state_code: Optional[str]
    currency: str
    po_number: Optional[str]
    subtotal: float
    discount_amount: float
    taxable_amount: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_tax: float
    other_charges: float
    round_off: float
    grand_total: float
    validation_status: str
    extraction_confidence: float
    is_synthetic: bool
    has_po_match: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    line_items: List[LineItemResponse] = []
    validation_results: List[ValidationResultResponse] = []
    duplicates: List[DuplicateMatchResponse] = []
    anomalies: List[AnomalyResultResponse] = []

    class Config:
        from_attributes = True

# ----------------- Vendor Schemas -----------------
class VendorBase(BaseModel):
    name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    status: str = "ACTIVE"

class VendorCreate(VendorBase):
    pass

class VendorResponse(VendorBase):
    id: int
    invoice_count: Optional[int] = 0
    total_billed: Optional[float] = 0.0
    pass_rate: Optional[float] = 100.0
    discrepancy_count: Optional[int] = 0
    last_invoice_date: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Workflow Actions -----------------
class StatusActionRequest(BaseModel):
    action: str  # APPROVE, REJECT, REQUEST_CORRECTION
    comments: Optional[str] = None

class ReviewExceptionRequest(BaseModel):
    review_note: str

class ResolveDuplicateRequest(BaseModel):
    resolution_note: str

# ----------------- Operational Summary -----------------
class OperationalSummary(BaseModel):
    total_invoices: int
    passed_validation: int
    needs_review: int
    duplicate_suspected: int
    failed_validation: int
    approved_invoices: int
    total_invoice_value: float
    total_tax_value: float
    pass_rate_percent: float
