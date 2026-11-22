import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  MessageSquare,
  ShieldAlert,
  RotateCw,
  UserCheck,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { ExceptionItem } from '../types';
import { api } from '../services/api';

export const ExceptionsPage: React.FC = () => {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [reviewedFilter, setReviewedFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Review & Resolution Modal State
  const [reviewModalItem, setReviewModalItem] = useState<ExceptionItem | null>(null);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [assignedReviewer, setAssignedReviewer] = useState<string>('Senior Financial Auditor');
  const [resolutionReason, setResolutionReason] = useState<string>('Acceptable Rounding Tolerance');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [revalidatingId, setRevalidatingId] = useState<string | null>(null);

  useEffect(() => {
    loadExceptions();
  }, [severityFilter, categoryFilter, reviewedFilter]);

  const loadExceptions = async () => {
    try {
      setLoading(true);
      const data = await api.getExceptions({
        severity: severityFilter,
        category: categoryFilter,
        is_reviewed: reviewedFilter === 'ALL' ? undefined : reviewedFilter === 'YES',
        limit: 100
      });
      setExceptions(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (item: ExceptionItem) => {
    setReviewModalItem(item);
    setReviewNote(item.review_note || 'Investigated by financial auditor. Variance verified against contractual terms.');
    setAssignedReviewer('Senior Financial Auditor');
    setResolutionReason('Acceptable Rounding Tolerance');
  };

  const handleSaveReview = async () => {
    if (!reviewModalItem) return;
    setIsSubmitting(true);
    try {
      const fullNote = `[Assigned: ${assignedReviewer} | Reason: ${resolutionReason}] ${reviewNote}`;
      await api.reviewException(reviewModalItem.id, fullNote);
      setReviewModalItem(null);
      loadExceptions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevalidateInvoice = async (invoiceId: string) => {
    setRevalidatingId(invoiceId);
    try {
      await api.revalidateInvoice(invoiceId);
      loadExceptions();
    } catch (err) {
      console.error(err);
    } finally {
      setRevalidatingId(null);
    }
  };

  const filteredExceptions = useMemo(() => {
    if (!search.trim()) return exceptions;
    const q = search.toLowerCase();
    return exceptions.filter(
      (e) =>
        e.invoice_id.toLowerCase().includes(q) ||
        (e.invoice_number || '').toLowerCase().includes(q) ||
        (e.vendor_name || '').toLowerCase().includes(q) ||
        e.rule_code.toLowerCase().includes(q) ||
        e.explanation.toLowerCase().includes(q)
    );
  }, [exceptions, search]);

  const countCritical = useMemo(() => exceptions.filter(e => e.severity === 'CRITICAL').length, [exceptions]);
  const countWarning = useMemo(() => exceptions.filter(e => e.severity === 'WARNING').length, [exceptions]);
  const countResolved = useMemo(() => exceptions.filter(e => e.is_reviewed).length, [exceptions]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Exceptions Management
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadExceptions}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface border border-border hover:bg-surfaceMuted text-text-primary rounded text-xs font-medium transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-navy" />
              <span>Refresh Exceptions</span>
            </button>
          </div>
        </div>

        {/* Severity Tabs Strip */}
        <div className="flex items-center space-x-1 pt-4 mt-4 border-t border-border overflow-x-auto text-xs">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              severityFilter === 'ALL'
                ? 'bg-navy text-white font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surfaceMuted'
            }`}
          >
            All Exceptions ({exceptions.length})
          </button>

          <button
            onClick={() => setSeverityFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              severityFilter === 'CRITICAL'
                ? 'bg-[#B94B43] text-white font-semibold'
                : 'text-[#B94B43] hover:bg-status-criticalBg'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Critical Failures ({countCritical})</span>
          </button>

          <button
            onClick={() => setSeverityFilter('WARNING')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              severityFilter === 'WARNING'
                ? 'bg-[#B88635] text-white font-semibold'
                : 'text-[#B88635] hover:bg-status-warningBg'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Warnings ({countWarning})</span>
          </button>

          <button
            onClick={() => setReviewedFilter(reviewedFilter === 'YES' ? 'ALL' : 'YES')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              reviewedFilter === 'YES'
                ? 'bg-[#39765B] text-white font-semibold'
                : 'text-[#39765B] hover:bg-status-successBg'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Audited & Resolved ({countResolved})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search exceptions by rule, vendor, invoice number, or explanation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-surfaceMuted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-navy transition-colors font-sans"
          />
        </div>

        <div className="flex items-center space-x-2.5 text-xs">
          {/* Category Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-text-secondary font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-surfaceMuted/50 border border-border rounded px-2.5 py-1.5 font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="ARITHMETIC">Arithmetic & Math</option>
              <option value="GST">GST & Tax</option>
              <option value="DATE">Dates & Timeline</option>
              <option value="VENDOR">Vendor Consistency</option>
              <option value="DUPLICATE">Duplicates</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exceptions List */}
      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-12 text-center text-text-muted font-mono text-xs">
              Loading financial exception records...
            </div>
          ) : filteredExceptions.length === 0 ? (
            <div className="p-12 text-center text-text-muted font-mono text-xs">
              No discrepancies match the active filter criteria.
            </div>
          ) : (
            filteredExceptions.map((ex) => (
              <div key={ex.id} className="p-4 hover:bg-[#F5F2EC]/40 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surfaceMuted border border-border text-navy">
                      {ex.rule_code}
                    </span>
                    <span className="text-sm font-semibold text-text-primary">
                      {ex.vendor_name}
                    </span>
                    <span className="text-xs font-mono text-text-secondary">
                      ({ex.invoice_id})
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        ex.severity === 'CRITICAL'
                          ? 'bg-status-criticalBg text-status-critical border-[#ECC7C4]'
                          : 'bg-status-warningBg text-status-warning border-[#ECDBC2]'
                      }`}
                    >
                      {ex.severity}
                    </span>

                    {ex.is_reviewed ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-status-success bg-status-successBg px-2 py-0.5 rounded border border-[#B8D5C7]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Resolved</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-copper font-mono">
                        Pending Action
                      </span>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-xs text-text-secondary leading-relaxed">
                  {ex.explanation}
                </p>

                {/* Variance Values Comparison Strip */}
                {(ex.expected_value || ex.actual_value || ex.difference) && (
                  <div className="p-2.5 rounded bg-surfaceMuted/50 border border-border text-xs font-mono grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-text-muted text-[10px] uppercase block">Expected Value:</span>
                      <span className="font-semibold text-status-success">{ex.expected_value || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted text-[10px] uppercase block">Extracted Value:</span>
                      <span className="font-semibold text-status-critical">{ex.actual_value || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted text-[10px] uppercase block">Variance / Discrepancy:</span>
                      <span className="font-bold text-copper">{ex.difference || 'None'}</span>
                    </div>
                  </div>
                )}

                {/* Review Notes or Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/60">
                  <div className="text-[11px] text-text-secondary">
                    {ex.is_reviewed ? (
                      <div className="flex items-center space-x-1.5 text-status-success">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="font-mono">Audit Note: {ex.review_note}</span>
                      </div>
                    ) : ex.suggested_correction ? (
                      <span className="italic text-text-muted">
                        Recommendation: {ex.suggested_correction}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleRevalidateInvoice(ex.invoice_id)}
                      disabled={revalidatingId === ex.invoice_id}
                      className="px-2.5 py-1 text-[11px] font-medium rounded border border-border hover:bg-surfaceMuted text-text-secondary flex items-center space-x-1 transition-colors"
                    >
                      <RotateCw className={`w-3 h-3 ${revalidatingId === ex.invoice_id ? 'animate-spin' : ''}`} />
                      <span>Revalidate</span>
                    </button>

                    <button
                      onClick={() => handleOpenReview(ex)}
                      className="px-3 py-1 bg-navy hover:bg-navy-dark text-white rounded text-[11px] font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{ex.is_reviewed ? 'Edit Resolution' : 'Investigate & Resolve'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review & Resolution Modal */}
      {reviewModalItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg border border-border shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-copper" />
                <h3 className="font-bold text-sm text-text-primary">
                  Resolve Financial Discrepancy
                </h3>
              </div>
              <span className="font-mono text-xs text-navy font-semibold">
                {reviewModalItem.rule_code}
              </span>
            </div>

            <div className="text-xs space-y-1.5 bg-surfaceMuted p-3 rounded border border-border">
              <p className="font-semibold text-text-primary">
                {reviewModalItem.vendor_name} ({reviewModalItem.invoice_id})
              </p>
              <p className="text-text-secondary leading-relaxed">
                {reviewModalItem.explanation}
              </p>
            </div>

            {/* Reviewer Assignment */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary block">
                Assigned Auditor / Reviewer:
              </label>
              <select
                value={assignedReviewer}
                onChange={(e) => setAssignedReviewer(e.target.value)}
                className="w-full text-xs p-2 rounded border border-border bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="Lead Financial Auditor">Lead Financial Auditor</option>
                <option value="Accounts Payable Controller">Accounts Payable Controller</option>
                <option value="Tax & GST Compliance Specialist">Tax & GST Compliance Specialist</option>
                <option value="Internal Audit Manager">Internal Audit Manager</option>
              </select>
            </div>

            {/* Resolution Reason */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary block">
                Resolution Basis:
              </label>
              <select
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                className="w-full text-xs p-2 rounded border border-border bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="Acceptable Rounding Tolerance">Acceptable Rounding Tolerance (&le; ₹0.05)</option>
                <option value="Supplier Credit Note Confirmed">Supplier Credit Note Issued for Variance</option>
                <option value="Contractual Discount Schedule Applied">Contractual Discount Schedule Applied</option>
                <option value="Inter-State IGST Exemption Certified">Inter-State IGST Exemption Certified</option>
                <option value="Authorized Management Override">Authorized Management Override with Approval</option>
              </select>
            </div>

            {/* Investigation & Audit Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary block">
                Investigation Findings & Audit Note:
              </label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Enter detailed audit justification, reference ticket, or resolution notes..."
                className="w-full text-xs p-2.5 rounded border border-border bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                onClick={() => setReviewModalItem(null)}
                className="px-3 py-1.5 rounded border border-border text-xs text-text-secondary hover:bg-surfaceMuted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReview}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-navy hover:bg-navy-dark text-white rounded text-xs font-semibold transition-colors shadow-sm"
              >
                {isSubmitting ? 'Recording Resolution...' : 'Commit Audit Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
