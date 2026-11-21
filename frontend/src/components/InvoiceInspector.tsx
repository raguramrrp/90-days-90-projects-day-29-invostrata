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
  Minimize2
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
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'preview'>('overview');
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
    const reason = prompt('Please enter rejection reason:');
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

  const handleSaveCorrection = async () => {
    setIsProcessing(true);
    try {
      await api.correctInvoice(invoice.id, editFields, 'Manual audit correction via Inspector');
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Correction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const pdfUrl = `/storage/invoices/${invoice.stored_filename}`;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[560px] lg:w-[680px] bg-white border-l border-border shadow-2xl z-40 flex flex-col transition-all duration-200">
      {/* Top Header */}
      <div className="h-14 border-b border-border px-5 flex items-center justify-between shrink-0 bg-surface">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-xs font-semibold text-text-primary px-2 py-0.5 rounded bg-workspace border border-border">
            {invoice.id}
          </span>
          <StatusBadge status={invoice.validation_status} />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-workspace rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-border px-5 bg-workspace shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'validation'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <span>Validation</span>
          {invoice.validation_results && invoice.validation_results.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-status-criticalBg text-status-critical font-bold">
              {invoice.validation_results.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'preview'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Document Preview
        </button>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="px-5 py-2.5 bg-status-criticalBg border-b border-status-critical/20 text-status-critical text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Vendor & General Card */}
            <div className="border border-border rounded-lg p-4 bg-surface space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">{invoice.vendor_name || 'Unregistered Vendor'}</h4>
                  <p className="text-xs text-text-secondary font-mono mt-0.5">GSTIN: {invoice.vendor_gstin || 'None Provided'}</p>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center space-x-1 text-xs text-primary font-medium hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Cancel Edit' : 'Edit Fields'}</span>
                </button>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
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
                      className="w-full text-xs p-1.5 border border-border rounded mt-1"
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
                      className="px-3 py-1 bg-primary text-white text-xs font-medium rounded hover:bg-primary-dark"
                    >
                      Save Correction & Revalidate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-border">
                  <div>
                    <span className="text-text-muted">Invoice Date: </span>
                    <span className="font-mono text-text-primary">{invoice.invoice_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Due Date: </span>
                    <span className="font-mono text-text-primary">{invoice.due_date || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Place of Supply: </span>
                    <span className="text-text-primary">{invoice.place_of_supply || 'N/A'} ({invoice.pos_state_code})</span>
                  </div>
                  <div>
                    <span className="text-text-muted">PO Reference: </span>
                    <span className="font-mono text-text-primary">{invoice.po_number || 'None'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Totals Breakdown */}
            <div className="border border-border rounded-lg p-4 bg-surface">
              <h5 className="text-xs font-semibold text-text-primary uppercase tracking-wider text-text-muted mb-3">
                Financial Breakdown (Stated on Document)
              </h5>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-text-secondary">Subtotal (Taxable Amount):</span>
                  <span className="text-text-primary">₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                  <span className="text-text-secondary">Round Off Difference:</span>
                  <span className="text-text-primary">₹{invoice.round_off.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-bold text-text-primary">
                  <span>Grand Total:</span>
                  <span className="text-primary">₹{invoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-surface">
              <div className="px-4 py-2.5 bg-workspace border-b border-border font-semibold text-xs text-text-primary">
                Itemized Line Deliverables ({invoice.line_items?.length || 0})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#FAFCFA] border-b border-border text-text-secondary font-mono">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-2 text-right">Qty</th>
                      <th className="py-2 px-2 text-right">Unit Rate</th>
                      <th className="py-2 px-2 text-right">Taxable</th>
                      <th className="py-2 px-2 text-right">GST</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.line_items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-workspace/50">
                        <td className="py-2 px-3 font-medium text-text-primary max-w-[180px] truncate">{item.description}</td>
                        <td className="py-2 px-2 text-right font-mono">{item.quantity}</td>
                        <td className="py-2 px-2 text-right font-mono">₹{item.unit_price.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono">₹{item.taxable_value.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono">{item.gst_rate}%</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-text-primary">₹{item.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VALIDATION RESULTS */}
        {activeTab === 'validation' && (
          <div className="space-y-4">
            {(!invoice.validation_results || invoice.validation_results.length === 0) ? (
              <div className="p-8 text-center border border-dashed border-[#C2DDD0] bg-[#EAF3EE] rounded-lg">
                <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-primary">All Deterministic Rules Passed</h4>
                <p className="text-xs text-text-secondary mt-1">
                  Arithmetic reconciliation, GST split calculations, and vendor records verified with zero discrepancies.
                </p>
              </div>
            ) : (
              invoice.validation_results.map((res, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3.5 space-y-2 text-xs ${
                    res.severity === 'CRITICAL'
                      ? 'border-status-critical/30 bg-status-criticalBg'
                      : 'border-status-warning/30 bg-status-warningBg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-white border border-border">
                      {res.rule_code}
                    </span>
                    <span className={`font-semibold text-[11px] ${res.severity === 'CRITICAL' ? 'text-status-critical' : 'text-status-warning'}`}>
                      {res.severity} DISCREPANCY
                    </span>
                  </div>

                  <p className="text-text-primary leading-relaxed">{res.explanation}</p>

                  {(res.expected_value || res.actual_value) && (
                    <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border border-border/80 font-mono text-[11px]">
                      <div>
                        <span className="text-text-muted">Expected: </span>
                        <span className="text-primary font-semibold">{res.expected_value || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Stated: </span>
                        <span className="text-status-critical font-semibold">{res.actual_value || 'N/A'}</span>
                      </div>
                    </div>
                  )}

                  {res.suggested_correction && (
                    <div className="text-[11px] text-text-secondary italic">
                      <span className="font-semibold text-text-primary">Suggested Action: </span>
                      {res.suggested_correction}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Anomaly section if any */}
            {invoice.anomalies && invoice.anomalies.length > 0 && (
              <div className="pt-3 border-t border-border">
                <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Anomaly Investigation Findings ({invoice.anomalies.length})
                </h5>
                {invoice.anomalies.map((anom, i) => (
                  <div key={i} className="border border-[#E0E6E1] bg-[#FAFCFA] rounded-lg p-3 text-xs mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-text-primary">{anom.anomaly_type.replace(/_/g, ' ')}</span>
                      <span className="text-status-warning font-mono text-[10px] bg-status-warningBg px-1.5 py-0.5 rounded border border-status-warning/20">
                        Score: {anom.score}
                      </span>
                    </div>
                    <p className="text-text-secondary mb-1.5">{anom.explanation}</p>
                    <p className="text-[11px] text-primary italic">Investigation: {anom.recommended_action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCUMENT PREVIEW */}
        {activeTab === 'preview' && (
          <div className="h-full flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs text-text-secondary pb-2 border-b border-border">
              <span className="font-mono">{invoice.stored_filename}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(prev - 25, 50))}
                  className="px-2 py-0.5 bg-workspace border border-border rounded font-mono hover:bg-border"
                >
                  -
                </button>
                <span className="font-mono">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 25, 200))}
                  className="px-2 py-0.5 bg-workspace border border-border rounded font-mono hover:bg-border"
                >
                  +
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-primary hover:underline ml-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </a>
              </div>
            </div>

            <div className="flex-1 min-h-[460px] bg-workspace border border-border rounded-lg overflow-hidden flex items-center justify-center relative">
              <iframe
                src={`${pdfUrl}#zoom=${zoomLevel}`}
                title="Invoice Document Inspection"
                className="w-full h-full min-h-[460px] border-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="h-16 border-t border-border px-5 bg-surface flex items-center justify-between shrink-0">
        <button
          onClick={handleRevalidate}
          disabled={isProcessing}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-workspace hover:bg-border/60 rounded border border-border transition-colors"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>Re-run Validation</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-status-critical bg-status-criticalBg hover:bg-status-critical/10 rounded border border-status-critical/30 transition-colors"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark rounded shadow-sm transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
