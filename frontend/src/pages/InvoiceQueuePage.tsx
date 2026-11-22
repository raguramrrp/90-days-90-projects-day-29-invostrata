import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RotateCw,
  Eye,
  CheckSquare,
  Square,
  Download,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Copy
} from 'lucide-react';
import { Invoice, Vendor } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  onSelectInvoice: (invoice: Invoice) => void;
  selectedInvoiceId?: string;
}

export const InvoiceQueuePage: React.FC<Props> = ({ onSelectInvoice, selectedInvoiceId }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  useEffect(() => {
    loadVendors();
    loadInvoices();
  }, [statusFilter, vendorFilter]);

  const loadVendors = async () => {
    try {
      const v = await api.getVendors();
      setVendors(v);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.getInvoices({
        search: search.trim() || undefined,
        status: statusFilter,
        vendor_id: vendorFilter !== 'ALL' ? parseInt(vendorFilter) : undefined,
        limit: 150
      });
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices();
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === invoices.length && invoices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((i) => i.id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchRevalidate = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchRunning(true);
    try {
      for (const id of selectedIds) {
        await api.revalidateInvoice(id);
      }
      setSelectedIds([]);
      loadInvoices();
    } catch (err) {
      console.error(err);
    } finally {
      setIsBatchRunning(false);
    }
  };

  const handleExportCSV = () => {
    const targets = selectedIds.length > 0
      ? invoices.filter((i) => selectedIds.includes(i.id))
      : invoices;

    const headers = [
      'Invoice ID',
      'Invoice Number',
      'Vendor Name',
      'Vendor GSTIN',
      'Invoice Date',
      'Due Date',
      'Taxable Value',
      'GST Total',
      'Grand Total',
      'Validation Status'
    ];

    const rows = targets.map((i) => [
      i.id,
      i.invoice_number || '',
      `"${(i.vendor_name || '').replace(/"/g, '""')}"`,
      i.vendor_gstin || '',
      i.invoice_date || '',
      i.due_date || '',
      i.taxable_amount.toFixed(2),
      i.total_tax.toFixed(2),
      i.grand_total.toFixed(2),
      i.validation_status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `invostrata_invoice_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Counts for secondary contextual tabs
  const countPassed = useMemo(() => invoices.filter(i => i.validation_status === 'PASSED' || i.validation_status === 'APPROVED').length, [invoices]);
  const countReview = useMemo(() => invoices.filter(i => i.validation_status === 'NEEDS_REVIEW' || i.validation_status === 'PASSED_WITH_WARNINGS').length, [invoices]);
  const countFailed = useMemo(() => invoices.filter(i => i.validation_status === 'FAILED' || i.validation_status === 'REJECTED').length, [invoices]);
  const countDups = useMemo(() => invoices.filter(i => i.validation_status === 'DUPLICATE_SUSPECTED').length, [invoices]);

  const getRiskBadge = (inv: Invoice) => {
    if (inv.validation_status === 'FAILED') {
      return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-[#B94B43] bg-[#FBEFED] border-[#ECC7C4]">CRITICAL</span>;
    }
    if (inv.validation_status === 'DUPLICATE_SUSPECTED') {
      return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-[#B8754B] bg-[#F7EFEA] border-[#ECC7C4]">HIGH</span>;
    }
    if (inv.validation_status === 'NEEDS_REVIEW' || inv.validation_status === 'PASSED_WITH_WARNINGS') {
      return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-[#B88635] bg-[#FBF5EA] border-[#ECDBC2]">MEDIUM</span>;
    }
    return <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-[#39765B] bg-[#EBF3EF] border-[#B8D5C7]">LOW</span>;
  };

  return (
    <div className="space-y-4">
      {/* Page Title & Actions */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Invoice Register</h1>
          </div>

          <div className="flex items-center space-x-2">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBatchRevalidate}
                disabled={isBatchRunning}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-navy hover:bg-navy-dark text-white rounded text-xs font-medium transition-colors shadow-sm"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isBatchRunning ? 'animate-spin' : ''}`} />
                <span>Revalidate ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface border border-border hover:bg-surfaceMuted text-text-primary rounded text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-navy" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={loadInvoices}
              title="Refresh ledger"
              className="p-1.5 bg-surface border border-border hover:bg-surfaceMuted text-text-secondary rounded transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Secondary Contextual Tabs Strip */}
        <div className="flex items-center space-x-1 pt-4 mt-4 border-t border-border overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-navy text-white font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surfaceMuted'
            }`}
          >
            All Invoices ({invoices.length})
          </button>

          <button
            onClick={() => setStatusFilter('PASSED')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              statusFilter === 'PASSED'
                ? 'bg-[#39765B] text-white font-semibold'
                : 'text-[#39765B] hover:bg-status-successBg'
            }`}
          >
            <span>Clean / Passed</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {countPassed}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('NEEDS_REVIEW')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              statusFilter === 'NEEDS_REVIEW'
                ? 'bg-[#B88635] text-white font-semibold'
                : 'text-[#B88635] hover:bg-status-warningBg'
            }`}
          >
            <span>Needs Review</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {countReview}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('FAILED')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              statusFilter === 'FAILED'
                ? 'bg-[#B94B43] text-white font-semibold'
                : 'text-[#B94B43] hover:bg-status-criticalBg'
            }`}
          >
            <span>Critical Failures</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {countFailed}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('DUPLICATE_SUSPECTED')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              statusFilter === 'DUPLICATE_SUSPECTED'
                ? 'bg-[#B8754B] text-white font-semibold'
                : 'text-[#B8754B] hover:bg-copper-light'
            }`}
          >
            <span>Duplicates</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
              {countDups}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice number, vendor name, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-surfaceMuted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-navy transition-colors font-sans"
          />
        </form>

        <div className="flex items-center space-x-2.5">
          {/* Vendor Filter */}
          <div className="relative">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="text-xs bg-surfaceMuted/50 border border-border rounded px-3 py-1.5 font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL">All Registered Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id.toString()}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Register Table */}
      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surfaceMuted/60 border-b border-border text-text-secondary font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <button
                    onClick={handleToggleSelectAll}
                    className="flex items-center text-text-secondary hover:text-text-primary"
                  >
                    {selectedIds.length === invoices.length && invoices.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-navy" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Invoice Record</th>
                <th className="py-2.5 px-3">Vendor & GSTIN</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">GST (₹)</th>
                <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Risk</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-text-muted font-mono">
                    Loading invoice register records...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-text-muted font-mono">
                    No matching invoices found in register.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isSelected = selectedIds.includes(inv.id);
                  const isCurrent = selectedInvoiceId === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className={`hover:bg-[#F5F2EC]/60 cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-navy-light/60 font-medium'
                          : isSelected
                          ? 'bg-navy-light/30'
                          : ''
                      }`}
                    >
                      {/* Selection Box */}
                      <td className="py-3 px-3">
                        <button
                          onClick={(e) => handleToggleSelect(inv.id, e)}
                          className="flex items-center text-text-secondary hover:text-text-primary"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-navy" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Invoice ID */}
                      <td className="py-3 px-3 font-mono">
                        <span className="font-semibold text-navy">{inv.id}</span>
                        {inv.invoice_number && (
                          <span className="block text-[10px] text-text-secondary">
                            {inv.invoice_number}
                          </span>
                        )}
                      </td>

                      {/* Vendor & GSTIN */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-text-primary block truncate max-w-[170px]">
                          {inv.vendor_name || 'Unassigned Vendor'}
                        </span>
                        <span className="font-mono text-[10px] text-text-secondary block">
                          {inv.vendor_gstin || 'GSTIN Missing'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-text-secondary">
                        {inv.invoice_date || '—'}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 font-mono text-text-secondary">
                        {inv.due_date || '—'}
                      </td>

                      {/* Taxable Value */}
                      <td className="py-3 px-3 text-right font-mono text-text-primary">
                        ₹{inv.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* GST */}
                      <td className="py-3 px-3 text-right font-mono text-text-secondary">
                        ₹{inv.total_tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-text-primary">
                        ₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <StatusBadge status={inv.validation_status} />
                      </td>

                      {/* Risk */}
                      <td className="py-3 px-3">
                        {getRiskBadge(inv)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInvoice(inv);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-border hover:border-navy hover:bg-navy hover:text-white transition-all text-text-secondary inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Ledger Statistics */}
        <div className="p-3 border-t border-border bg-surfaceMuted/30 flex items-center justify-between text-xs text-text-secondary">
          <div>
            Showing <span className="font-semibold text-text-primary">{invoices.length}</span> recorded invoice documents
          </div>
          <div className="font-mono text-[11px] text-text-muted">
            All arithmetic checks audited via Python Decimal Engine
          </div>
        </div>
      </div>
    </div>
  );
};
