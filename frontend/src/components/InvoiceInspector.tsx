import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCw,
  Check,
  Ban,
  Edit3,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Clock,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Invoice } from '../types';
import { StatusBadge } from './StatusBadge';
import { api } from '../services/api';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const InvoiceInspector: React.FC<Props> = ({ invoice, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'audit' | 'preview'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    if (invoice) {
      setEditFields({
        invoice_number: invoice.invoice_number || '',
        subtotal: invoice.subtotal || 0,
        total_tax: invoice.total_tax || 0,
        grand_total: invoice.grand_total || 0,
        vendor_gstin: invoice.vendor_gstin || '',
      });
      setIsEditing(false);
      setErrorMsg(null);
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await api.approveInvoice(invoice.id);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Approval failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter statutory or accounting rejection reason:');
    if (!reason) return;
    setIsProcessing(true);
    try {
      await api.rejectInvoice(invoice.id, reason);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Rejection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCorrection = async () => {
    setIsProcessing(true);
    try {
      await api.correctInvoice(invoice.id, editFields, 'Auditor manual correction in workstation inspector');
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Correction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevalidate = async () => {
    setIsProcessing(true);
    try {
      await api.revalidateInvoice(invoice.id);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Revalidation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const isCritical = invoice.validation_status === 'FAILED';

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[580px] lg:w-[680px] bg-white border-l border-border shadow-2xl z-50 flex flex-col animate-slideLeft font-sans">
      {/* 1. Header with Record ID & Actions */}
      <div className="px-5 py-4 border-b border-border bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-navy text-white flex items-center justify-center font-bold text-xs">
            INV
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-text-primary font-mono">{invoice.id}</h3>
              <StatusBadge status={invoice.validation_status} />
            </div>
            <p className="text-[11px] text-text-secondary truncate max-w-[280px]">
              {invoice.vendor_name || 'Vendor Unassigned'} &bull; {invoice.invoice_number || 'No Number'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRevalidate}
            disabled={isProcessing}
            title="Re-run deterministic Python Decimal validation"
            className="p-1.5 rounded border border-border hover:bg-surfaceMuted text-text-secondary hover:text-navy transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surfaceMuted text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Error Message Banner (if any) */}
      {errorMsg && (
        <div className="px-5 py-2.5 bg-status-criticalBg border-b border-status-critical/20 text-status-critical text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* 3. Horizontal Contextual Tab Switcher */}
      <div className="flex border-b border-border bg-surfaceMuted/40 px-5 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-3.5 border-b-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'border-navy text-navy font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Overview & Items
        </button>

        <button
          onClick={() => setActiveTab('validation')}
          className={`py-3 px-3.5 border-b-2 font-medium transition-colors flex items-center space-x-1.5 ${
            activeTab === 'validation'
              ? 'border-navy text-navy font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <span>Validation Rules</span>
          {invoice.validation_results && invoice.validation_results.length > 0 && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-status-criticalBg text-status-critical font-bold">
              {invoice.validation_results.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-3.5 border-b-2 font-medium transition-colors ${
            activeTab === 'audit'
              ? 'border-navy text-navy font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Audit History
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`py-3 px-3.5 border-b-2 font-medium transition-colors ${
            activeTab === 'preview'
              ? 'border-navy text-navy font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Document Preview
        </button>
      </div>

      {/* 4. Tab Body Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F5F2EC]/30">
        {/* TAB 1: OVERVIEW & LINE ITEMS */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Vendor & Statutory Metadata Card */}
            <div className="border border-border rounded-lg p-4 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider text-[10px]">
                  Vendor & Statutory Tax Details
                </span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-navy hover:underline font-medium flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3 text-copper" />
                  <span>{isEditing ? 'Cancel Edit' : 'Edit Stated Values'}</span>
                </button>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Invoice Number</label>
                    <input
                      type="text"
                      value={editFields.invoice_number}
                      onChange={(e) => setEditFields({ ...editFields, invoice_number: e.target.value })}
                      className="w-full text-xs p-1.5 border border-border rounded mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Vendor GSTIN</label>
                    <input
                      type="text"
                      value={editFields.vendor_gstin}
                      onChange={(e) => setEditFields({ ...editFields, vendor_gstin: e.target.value })}
                      className="w-full text-xs p-1.5 border border-border rounded mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Subtotal (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.subtotal}
                      onChange={(e) => setEditFields({ ...editFields, subtotal: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 border border-border rounded mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary">Grand Total (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFields.grand_total}
                      onChange={(e) => setEditFields({ ...editFields, grand_total: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-1.5 border border-border rounded mt-1 font-mono"
                    />
                  </div>
                  <div className="col-span-2 pt-1 flex justify-end">
                    <button
                      onClick={handleSaveCorrection}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-navy hover:bg-navy-dark text-white text-xs font-semibold rounded shadow-sm"
                    >
                      Save Correction & Revalidate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-text-muted text-[11px]">Vendor Name: </span>
                    <span className="font-semibold text-text-primary block">{invoice.vendor_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px]">GSTIN: </span>
                    <span className="font-mono text-text-primary block">{invoice.vendor_gstin || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px]">Invoice Date: </span>
                    <span className="font-mono text-text-primary block">{invoice.invoice_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px]">Due Date: </span>
                    <span className="font-mono text-text-primary block">{invoice.due_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px]">Place of Supply: </span>
                    <span className="text-text-primary block">{invoice.place_of_supply || 'N/A'} ({invoice.pos_state_code})</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[11px]">PO Reference: </span>
                    <span className="font-mono text-text-primary block">{invoice.po_number || 'None'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Stated Breakdown Card */}
            <div className="border border-border rounded-lg p-4 bg-white shadow-sm space-y-2">
              <h5 className="text-xs font-bold text-text-primary uppercase tracking-wider text-[10px]">
                Deterministic Arithmetic Breakdown
              </h5>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Taxable Amount:</span>
                  <span className="text-text-primary">₹{invoice.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">CGST:</span>
                  <span className="text-text-primary">₹{invoice.cgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">SGST:</span>
                  <span className="text-text-primary">₹{invoice.sgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">IGST:</span>
                  <span className="text-text-primary">₹{invoice.igst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Round Off:</span>
                  <span className="text-text-primary">₹{invoice.round_off.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold text-text-primary">
                  <span>Grand Total:</span>
                  <span className="text-navy font-bold">₹{invoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="px-4 py-2.5 bg-surfaceMuted/60 border-b border-border font-semibold text-xs text-text-primary flex items-center justify-between">
                <span>Extracted Line Items ({invoice.line_items?.length || 0})</span>
                <span className="text-[10px] text-text-muted font-mono">Verified Qty & Rate</span>
              </div>
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surfaceMuted/40 text-text-secondary font-mono text-[10px] border-b border-border">
                    <tr>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate (₹)</th>
                      <th className="p-2 text-right">Tax%</th>
                      <th className="p-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.line_items && invoice.line_items.length > 0 ? (
                      invoice.line_items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surfaceMuted/20 font-mono text-[11px]">
                          <td className="p-2 font-sans font-medium text-text-primary">{item.description}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">₹{item.unit_price.toFixed(2)}</td>
                          <td className="p-2 text-right">{item.gst_rate}%</td>
                          <td className="p-2 text-right font-semibold text-text-primary">₹{item.total_amount.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-text-muted font-mono">
                          No structured line items parsed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VALIDATION RULES & DISCREPANCIES */}
        {activeTab === 'validation' && (
          <div className="space-y-3">
            {invoice.validation_results && invoice.validation_results.length > 0 ? (
              invoice.validation_results.map((res, i) => (
                <div key={i} className="border border-border rounded-lg p-3.5 bg-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surfaceMuted border border-border text-navy">
                      {res.rule_code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      res.severity === 'CRITICAL'
                        ? 'bg-status-criticalBg text-status-critical border-[#ECC7C4]'
                        : 'bg-status-warningBg text-status-warning border-[#ECDBC2]'
                    }`}>
                      {res.severity}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {res.explanation}
                  </p>

                  <div className="p-2 rounded bg-surfaceMuted/50 border border-border text-xs font-mono grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-text-muted block">Expected Value:</span>
                      <span className="font-semibold text-status-success">{res.expected_value || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted block">Extracted Value:</span>
                      <span className="font-semibold text-status-critical">{res.actual_value || 'N/A'}</span>
                    </div>
                  </div>

                  {res.suggested_correction && (
                    <div className="text-[11px] text-text-muted italic bg-surface p-2 rounded border border-border/60">
                      Recommendation: {res.suggested_correction}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="border border-[#B8D5C7] rounded-lg p-6 bg-status-successBg text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-status-success mx-auto" />
                <h4 className="font-bold text-xs text-[#39765B]">Deterministic Validation Clean</h4>
                <p className="text-[11px] text-text-secondary">
                  Every calculation, tax rate, GSTIN format, and chronological sequence conforms strictly to statutory standards.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT HISTORY */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            <div className="bg-white border border-border rounded-lg p-4 shadow-sm space-y-3 text-xs">
              <h4 className="font-bold text-text-primary uppercase tracking-wider text-[10px]">
                Immutable Document Audit Trail
              </h4>

              <div className="space-y-3 border-l-2 border-border pl-4">
                <div className="space-y-0.5">
                  <span className="font-mono text-[10px] text-text-muted">
                    {invoice.created_at ? new Date(invoice.created_at).toLocaleString() : 'N/A'}
                  </span>
                  <p className="font-semibold text-text-primary">Document Ingested & SHA-256 Registered</p>
                  <p className="font-mono text-[10px] text-text-secondary truncate">
                    Hash: {invoice.sha256_hash}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="font-mono text-[10px] text-text-muted">
                    {invoice.updated_at ? new Date(invoice.updated_at).toLocaleString() : 'N/A'}
                  </span>
                  <p className="font-semibold text-text-primary">Deterministic Validation Engine Run</p>
                  <p className="text-[11px] text-text-secondary">
                    Status: <span className="font-bold text-navy">{invoice.validation_status}</span>
                  </p>
                </div>

                {invoice.notes && (
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] text-text-muted">Audit Note</span>
                    <p className="text-[11px] text-text-secondary italic">
                      "{invoice.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DOCUMENT PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-3">
            <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="p-2 border-b border-border bg-surfaceMuted flex items-center justify-between text-xs">
                <span className="font-mono text-text-secondary">{invoice.stored_filename}</span>
                <a
                  href={`/storage/invoices/${invoice.stored_filename}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-navy hover:underline text-xs flex items-center space-x-1 font-medium"
                >
                  <span>Open in Browser</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="h-[460px] bg-slate-900 flex items-center justify-center overflow-hidden">
                <iframe
                  src={`/storage/invoices/${invoice.stored_filename}`}
                  title="Invoice PDF Preview"
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer Operational Decision Bar */}
      <div className="px-5 py-3 border-t border-border bg-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="text-[11px] text-text-muted font-mono">
          Lead Auditor Action
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded border border-status-critical/30 bg-status-criticalBg text-status-critical hover:bg-status-critical/20 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Reject Invoice</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={isProcessing || isCritical}
            title={isCritical ? 'Resolve critical discrepancies before approving' : 'Authorize payment'}
            className="px-4 py-1.5 rounded bg-status-success hover:bg-status-success/90 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve for Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
