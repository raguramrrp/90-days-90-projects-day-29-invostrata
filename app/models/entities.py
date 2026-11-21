from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Numeric, Text, ForeignKey,
    Float, Enum, Index, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(20), default="financial_analyst")  # admin, auditor, financial_analyst
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), index=True, nullable=False)
    gstin = Column(String(15), unique=True, index=True, nullable=True)
    pan = Column(String(10), index=True, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    state_code = Column(String(2), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    bank_name = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, BLOCKED, UNDER_REVIEW
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    invoices = relationship("Invoice", back_populates="vendor")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(String(50), primary_key=True, index=True)  # e.g. "INV-2026-0001"
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf, png, jpg, csv, xlsx
    file_size = Column(Integer, default=0)
    sha256_hash = Column(String(64), index=True, nullable=False)
    
    invoice_number = Column(String(100), index=True, nullable=True)
    invoice_date = Column(String(20), index=True, nullable=True)  # YYYY-MM-DD
    due_date = Column(String(20), nullable=True)
    
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    vendor_name = Column(String(200), index=True, nullable=True)
    vendor_gstin = Column(String(15), index=True, nullable=True)
    vendor_address = Column(Text, nullable=True)
    
    customer_name = Column(String(200), nullable=True)
    customer_gstin = Column(String(15), nullable=True)
    place_of_supply = Column(String(100), nullable=True)
    pos_state_code = Column(String(2), nullable=True)
    currency = Column(String(10), default="INR")
    po_number = Column(String(100), index=True, nullable=True)
    
    # Financial fields stored as Numeric for exact decimal math
    subtotal = Column(Numeric(14, 2), default=Decimal("0.00"))
    discount_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    taxable_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    cgst_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    sgst_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    igst_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    total_tax = Column(Numeric(14, 2), default=Decimal("0.00"))
    other_charges = Column(Numeric(14, 2), default=Decimal("0.00"))
    round_off = Column(Numeric(14, 2), default=Decimal("0.00"))
    grand_total = Column(Numeric(14, 2), default=Decimal("0.00"))
    
    # Statuses: PASSED, PASSED_WITH_WARNINGS, NEEDS_REVIEW, FAILED, DUPLICATE_SUSPECTED, APPROVED, REJECTED
    validation_status = Column(String(30), default="NEEDS_REVIEW", index=True)
    extraction_confidence = Column(Float, default=1.0)
    is_synthetic = Column(Boolean, default=False)
    has_po_match = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    documents = relationship("InvoiceDocument", back_populates="invoice", cascade="all, delete-orphan")
    extracted_fields = relationship("ExtractedField", back_populates="invoice", cascade="all, delete-orphan")
    validation_results = relationship("ValidationResult", back_populates="invoice", cascade="all, delete-orphan")
    duplicates = relationship("DuplicateMatch", foreign_keys="DuplicateMatch.invoice_id", back_populates="invoice", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyResult", back_populates="invoice", cascade="all, delete-orphan")
    approval_history = relationship("ApprovalHistory", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceDocument(Base):
    __tablename__ = "invoice_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), index=True, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False)
    mime_type = Column(String(100), nullable=False)
    page_count = Column(Integer, default=1)
    raw_text = Column(Text, nullable=True)
    extracted_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="documents")

class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), index=True, nullable=False)
    line_number = Column(Integer, default=1)
    description = Column(String(300), nullable=False)
    hsn_sac = Column(String(20), nullable=True)
    quantity = Column(Numeric(12, 3), default=Decimal("1.000"))
    unit = Column(String(20), default="PCS")
    unit_price = Column(Numeric(14, 2), default=Decimal("0.00"))
    item_discount = Column(Numeric(14, 2), default=Decimal("0.00"))
    taxable_value = Column(Numeric(14, 2), default=Decimal("0.00"))
    gst_rate = Column(Numeric(5, 2), default=Decimal("18.00"))
    cgst_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    sgst_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    igst_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    total_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    is_corrected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="line_items")

class ExtractedField(Base):
    __tablename__ = "extracted_fields"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), index=True, nullable=False)
    field_name = Column(String(100), nullable=False)
    original_value = Column(Text, nullable=True)
    corrected_value = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0)
    is_manually_edited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="extracted_fields")

class ValidationRule(Base):
    __tablename__ = "validation_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(50), nullable=False)  # ARITHMETIC, TAX_GST, DATE, VENDOR, DUPLICATE, ANOMALY
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="CRITICAL")  # CRITICAL, WARNING, INFO
    is_enabled = Column(Boolean, default=True)
    parameters = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ValidationResult(Base):
    __tablename__ = "validation_results"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), index=True, nullable=False)
    rule_code = Column(String(50), index=True, nullable=False)
    category = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)  # CRITICAL, WARNING, INFO
    status = Column(String(20), nullable=False)  # PASS, FAIL, WARNING
    expected_value = Column(String(255), nullable=True)
    actual_value = Column(String(255), nullable=True)
    difference = Column(String(255), nullable=True)
    explanation = Column(Text, nullable=False)
    suggested_correction = Column(Text, nullable=True)
    evidence_source = Column(String(200), nullable=True)
    is_reviewed = Column(Boolean, default=False)
    review_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="validation_results")

class DuplicateMatch(Base):
    __tablename__ = "duplicate_matches"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), index=True, nullable=False)
    matched_invoice_id = Column(String(50), ForeignKey("invoices.id"), index=True, nullable=False)
    match_type = Column(String(50), nullable=False)  # EXACT_FILE_HASH, EXACT_INVOICE_FIELDS, SIMILAR_RECORD
    confidence_score = Column(Float, default=1.0)
    matched_fields = Column(JSON, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolution_note = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", foreign_keys=[invoice_id], back_populates="duplicates")
    matched_invoice = relationship("Invoice", foreign_keys=[matched_invoice_id])

class AnomalyResult(Base):
    __tablename__ = "anomaly_results"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), index=True, nullable=False)
    anomaly_type = Column(String(100), nullable=False)  # OUTLIER_AMOUNT, UNUSUAL_TAX, SUSPECT_ROUND_AMOUNT, HIGH_DISCOUNT, FREQUENT_SUBMISSION
    severity = Column(String(20), default="WARNING")
    score = Column(Float, default=0.0)
    explanation = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    is_investigated = Column(Boolean, default=False)
    investigation_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="anomalies")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(100), unique=True, index=True, nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    po_date = Column(String(20), nullable=False)
    total_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    status = Column(String(30), default="ISSUED")  # ISSUED, PARTIALLY_FULFILLED, COMPLETED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    grns = relationship("GoodsReceivedRecord", back_populates="purchase_order")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    line_number = Column(Integer, default=1)
    item_description = Column(String(300), nullable=False)
    quantity = Column(Numeric(12, 3), default=Decimal("1.000"))
    unit_price = Column(Numeric(14, 2), default=Decimal("0.00"))
    total_amount = Column(Numeric(14, 2), default=Decimal("0.00"))
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")

class GoodsReceivedRecord(Base):
    __tablename__ = "goods_received_records"
    
    id = Column(Integer, primary_key=True, index=True)
    grn_number = Column(String(100), unique=True, index=True, nullable=False)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    receipt_date = Column(String(20), nullable=False)
    received_quantity = Column(Numeric(12, 3), default=Decimal("0.000"))
    item_description = Column(String(300), nullable=True)
    status = Column(String(30), default="ACCEPTED")  # ACCEPTED, PARTIAL, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    
    purchase_order = relationship("PurchaseOrder", back_populates="grns")

class ApprovalHistory(Base):
    __tablename__ = "approval_history"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String(50), ForeignKey("invoices.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)  # APPROVED, REJECTED, CORRECTION_REQUESTED, REVALIDATED
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=False)
    comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("Invoice", back_populates="approval_history")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user = Column(String(100), default="system")
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class ApplicationSetting(Base):
    __tablename__ = "application_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
