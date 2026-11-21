export type ValidationStatus =
  | 'PASSED'
  | 'PASSED_WITH_WARNINGS'
  | 'NEEDS_REVIEW'
  | 'FAILED'
  | 'DUPLICATE_SUSPECTED'
  | 'APPROVED'
  | 'REJECTED';

export interface LineItem {
  id?: number;
  line_number: number;
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  item_discount: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export interface ValidationResult {
  id: number;
  rule_code: string;
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  status: 'PASS' | 'FAIL' | 'WARNING';
  expected_value?: string;
  actual_value?: string;
  difference?: string;
  explanation: string;
  suggested_correction?: string;
  evidence_source?: string;
  is_reviewed?: boolean;
  review_note?: string;
}

export interface DuplicateMatch {
  id: number;
  matched_invoice_id: string;
  match_type: string;
  confidence_score: number;
  matched_fields?: string[];
  is_resolved: boolean;
  resolution_note?: string;
}

export interface AnomalyResult {
  id: number;
  anomaly_type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  score: number;
  explanation: string;
  recommended_action?: string;
}

export interface Invoice {
  id: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  sha256_hash: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_gstin?: string;
  vendor_address?: string;
  customer_name?: string;
  customer_gstin?: string;
  place_of_supply?: string;
  pos_state_code?: string;
  currency: string;
  po_number?: string;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  other_charges: number;
  round_off: number;
  grand_total: number;
  validation_status: ValidationStatus;
  extraction_confidence: number;
  is_synthetic: boolean;
  has_po_match: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  line_items?: LineItem[];
  validation_results?: ValidationResult[];
  duplicates?: DuplicateMatch[];
  anomalies?: AnomalyResult[];
}

export interface OperationalSummary {
  total_invoices: number;
  passed_validation: number;
  needs_review: number;
  duplicate_suspected: number;
  failed_validation: number;
  approved_invoices: number;
  total_invoice_value: number;
  total_tax_value: number;
  pass_rate_percent: number;
}

export interface Vendor {
  id: number;
  name: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  state_code?: string;
  email?: string;
  phone?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  status: string;
  invoice_count: number;
  total_billed: number;
  pass_rate: number;
  discrepancy_count: number;
  last_invoice_date?: string;
  created_at: string;
}

export interface ExceptionItem {
  id: number;
  invoice_id: string;
  invoice_number: string;
  vendor_name: string;
  rule_code: string;
  category: string;
  severity: string;
  status: string;
  expected_value?: string;
  actual_value?: string;
  difference?: string;
  explanation: string;
  suggested_correction?: string;
  evidence_source?: string;
  is_reviewed: boolean;
  review_note?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  timestamp: string;
}
