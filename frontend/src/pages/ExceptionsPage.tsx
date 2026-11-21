import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { ExceptionItem } from '../types';
import { api } from '../services/api';

export const ExceptionsPage: React.FC = () => {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [reviewedFilter, setReviewedFilter] = useState<string>('ALL');
  const [reviewModalItem, setReviewModalItem] = useState<ExceptionItem | null>(null);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
    setReviewNote(item.review_note || 'Verified by financial auditor. Acceptable rounding/contractual variance.');
  };

  const handleSaveReview = async () => {
    if (!reviewModalItem) return;
    setIsSubmitting(true);
    try {
      await api.reviewException(reviewModalItem.id, reviewNote);
      setReviewModalItem(null);
      loadExceptions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Financial Exceptions Ledger</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Dedicated workflow table for investigating arithmetic discrepancies, tax mismatches, and compliance anomalies.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          {/* Severity Filter */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs bg-workspace border border-border rounded-md px-3 py-1.5 appearance-none pr-8 font-medium text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Discrepancies</option>
              <option value="WARNING">Warnings</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-workspace border border-border rounded-md px-3 py-1.5 appearance-none pr-8 font-medium text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="ARITHMETIC">Arithmetic</option>
              <option value="TAX_GST">Indian GST</option>
              <option value="DATE">Statutory Dates</option>
              <option value="VENDOR">Vendor Consistency</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={reviewedFilter}
              onChange={(e) => setReviewedFilter(e.target.value)}
              className="text-xs bg-workspace border border-border rounded-md px-3 py-1.5 appearance-none pr-8 font-medium text-text-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Review Statuses</option>
              <option value="NO">Pending Review</option>
              <option value="YES">Reviewed</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        <div className="text-xs text-text-secondary font-mono">
          <span>{exceptions.length} Active Exceptions</span>
        </div>
      </div>

      {/* Structured Exceptions Table */}
      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFCFA] border-b border-border text-text-secondary font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Invoice</th>
                <th className="py-2.5 px-3">Vendor</th>
                <th className="py-2.5 px-3">Rule Code</th>
                <th className="py-2.5 px-3">Discrepancy Details</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted font-mono">
                    Loading exceptions ledger...
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-secondary">
                    No exceptions matching selected criteria.
                  </td>
                </tr>
              ) : (
                exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-workspace/50">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${
                        ex.severity === 'CRITICAL'
                          ? 'bg-status-criticalBg text-status-critical border border-status-critical/30'
                          : 'bg-status-warningBg text-status-warning border border-status-warning/30'
                      }`}>
                        {ex.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-primary whitespace-nowrap">
                      {ex.invoice_id}
                    </td>
                    <td className="py-2.5 px-3 text-text-primary max-w-[140px] truncate font-medium">
                      {ex.vendor_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-text-secondary text-[11px]">
                      {ex.rule_code}
                    </td>
                    <td className="py-2.5 px-3 text-text-primary max-w-[240px] truncate">
                      {ex.explanation}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-status-critical">
                      {ex.difference || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {ex.is_reviewed ? (
                        <span className="text-[11px] text-primary font-medium flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reviewed</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#B7791F] font-medium">Pending Review</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReview(ex)}
                        className="px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-[#EAF3EE] rounded border border-[#C2DDD0] transition-colors"
                      >
                        {ex.is_reviewed ? 'Edit Note' : 'Review'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal Dialog */}
      {reviewModalItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-border rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-bold text-text-primary">
                Review Exception: {reviewModalItem.rule_code}
              </h3>
              <button onClick={() => setReviewModalItem(null)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-text-secondary">
                <span className="font-semibold text-text-primary">Invoice: </span>
                {reviewModalItem.invoice_id} ({reviewModalItem.vendor_name})
              </p>
              <p className="text-text-primary bg-workspace p-2 rounded border border-border">
                {reviewModalItem.explanation}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Auditor Resolution & Justification Note *
              </label>
              <textarea
                rows={3}
                required
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Document justification for accepting or escalating this variance..."
                className="w-full text-xs p-2 border border-border rounded bg-workspace focus:border-primary outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-border">
              <button
                onClick={() => setReviewModalItem(null)}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReview}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs bg-primary hover:bg-primary-dark text-white rounded font-medium shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'Mark as Reviewed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
