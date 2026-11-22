import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  UploadCloud,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileSpreadsheet,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { OperationalSummary, Invoice, ExceptionItem, Vendor } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  onSelectInvoice: (invoice: Invoice) => void;
  onNavigateTab: (tab: any) => void;
}

type SortField =
  | 'id'
  | 'vendor_name'
  | 'invoice_date'
  | 'due_date'
  | 'taxable_amount'
  | 'total_tax'
  | 'grand_total'
  | 'validation_status';

export const OverviewPage: React.FC<Props> = ({ onSelectInvoice, onNavigateTab }) => {
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [reportingPeriod, setReportingPeriod] = useState<string>('FY2025-26');
  const [dateRange, setDateRange] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [amountRange, setAmountRange] = useState<string>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('invoice_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Multi-selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [sumData, invData, excData, vData, anData] = await Promise.all([
        api.getSummary(),
        api.getInvoices({ limit: 100 }),
        api.getExceptions({ limit: 50 }),
        api.getVendors(),
        api.getAnalytics(),
      ]);
      setSummary(sumData);
      setInvoices(invData);
      setExceptions(excData.items);
      setVendors(vData);
      setAnalytics(anData);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = inv.id.toLowerCase().includes(q);
        const matchNum = (inv.invoice_number || '').toLowerCase().includes(q);
        const matchVendor = (inv.vendor_name || '').toLowerCase().includes(q);
        const matchPo = (inv.po_number || '').toLowerCase().includes(q);
        if (!matchId && !matchNum && !matchVendor && !matchPo) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && inv.validation_status !== statusFilter) {
        return false;
      }

      // Vendor filter
      if (vendorFilter !== 'ALL') {
        if (inv.vendor_id?.toString() !== vendorFilter && inv.vendor_name !== vendorFilter) {
          return false;
        }
      }

      // Amount filter
      if (amountRange === 'LT50K' && inv.grand_total >= 50000) return false;
      if (amountRange === '50K_200K' && (inv.grand_total < 50000 || inv.grand_total > 200000)) return false;
      if (amountRange === 'GT200K' && inv.grand_total <= 200000) return false;

      return true;
    });
  }, [invoices, searchQuery, statusFilter, vendorFilter, amountRange]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        const comp = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? comp : -comp;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredInvoices, sortField, sortOrder]);

  // Paginated Invoices
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedInvoices.slice(start, start + pageSize);
  }, [sortedInvoices, currentPage]);

  const totalPages = Math.ceil(sortedInvoices.length / pageSize) || 1;

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedInvoices.map((i) => i.id)));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Export CSV of visible records
  const handleExportCSV = () => {
    const targets = selectedIds.size > 0
      ? invoices.filter((i) => selectedIds.has(i.id))
      : filteredInvoices;

    const headers = [
      'Invoice ID',
      'Invoice Number',
      'Vendor Name',
      'GSTIN',
      'Date',
      'Due Date',
      'Taxable Amount',
      'GST Amount',
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
    link.setAttribute('download', `invostrata_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRiskLevel = (inv: Invoice): { label: string; color: string; bg: string } => {
    if (inv.validation_status === 'FAILED') {
      return { label: 'CRITICAL', color: '#B94B43', bg: '#FBEFED' };
    }
    if (inv.validation_status === 'DUPLICATE_SUSPECTED') {
      return { label: 'HIGH', color: '#B8754B', bg: '#F7EFEA' };
    }
    if (inv.validation_status === 'NEEDS_REVIEW' || inv.validation_status === 'PASSED_WITH_WARNINGS') {
      return { label: 'MEDIUM', color: '#B88635', bg: '#FBF5EA' };
    }
    return { label: 'LOW', color: '#39765B', bg: '#EBF3EF' };
  };

  // Find invoice for exception jump
  const handleExceptionJump = async (invoiceId: string) => {
    try {
      const full = await api.getInvoice(invoiceId);
      onSelectInvoice(full);
    } catch {
      const match = invoices.find((i) => i.id === invoiceId);
      if (match) onSelectInvoice(match);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          SECTION A: PAGE HEADING & TOP CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Financial Control Room
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Reporting Period Selector */}
            <div className="flex items-center space-x-1.5 text-xs text-text-secondary bg-surfaceMuted border border-border px-2.5 py-1.5 rounded">
              <Calendar className="w-3.5 h-3.5 text-navy" />
              <span className="font-medium text-text-primary">Period:</span>
              <select
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                className="bg-transparent text-text-primary font-medium focus:outline-none cursor-pointer"
              >
                <option value="FY2025-26">FY 2025–26 (Active)</option>
                <option value="Q4-2026">Q4 FY26 (Jan–Mar)</option>
                <option value="CURRENT_MONTH">Current Month (Feb 2026)</option>
                <option value="ALL">All Fiscal Cycles</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-1.5 text-xs text-text-secondary bg-surfaceMuted border border-border px-2.5 py-1.5 rounded">
              <Filter className="w-3.5 h-3.5 text-navy" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-text-primary font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Records</option>
                <option value="30D">Last 30 Days</option>
                <option value="90D">Last 90 Days</option>
              </select>
            </div>

            {/* Export Summary Action */}
            <a
              href="/api/reports/pdf"
              download
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface border border-border hover:bg-surfaceMuted text-text-primary rounded text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-navy" />
              <span>Export Summary (PDF)</span>
            </a>

            {/* Import Invoices Action */}
            <button
              onClick={() => onNavigateTab('import')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-copper hover:bg-copper-hover text-white rounded text-xs font-medium transition-colors shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import Invoices</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION B: COMPACT FINANCIAL SUMMARY STRIP
          (Single horizontal strip divided into 5 restrained metrics)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* 1. Total Processed */}
          <div className="p-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary font-medium">
              Total Invoices Processed
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-text-primary">
                {summary ? summary.total_invoices : '--'}
              </span>
              <span className="text-[10px] font-mono text-text-muted">100% Ingested</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              ₹{summary ? (summary.total_invoice_value / 100000).toFixed(2) : '0'} Lakhs Billed
            </p>
          </div>

          {/* 2. Validation Pass Rate */}
          <div className="p-4 bg-status-successBg/20">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#39765B] font-semibold">
              Validation Pass Rate
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#39765B]">
                {summary ? `${summary.pass_rate_percent}%` : '--'}
              </span>
              <span className="text-[10px] font-mono text-[#39765B] font-medium">
                {summary ? `${summary.passed_validation} Clean` : ''}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              Zero statutory discrepancy
            </p>
          </div>

          {/* 3. Pending Review */}
          <div className="p-4 bg-status-warningBg/20">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#B88635] font-semibold">
              Pending Review
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#B88635]">
                {summary ? summary.needs_review : '--'}
              </span>
              <span className="text-[10px] font-mono text-[#B88635] font-medium">Warnings</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              Requires auditor clearance
            </p>
          </div>

          {/* 4. Critical Discrepancies */}
          <div className="p-4 bg-status-criticalBg/20">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#B94B43] font-semibold">
              Critical Discrepancies
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#B94B43]">
                {summary ? summary.failed_validation : '--'}
              </span>
              <span className="text-[10px] font-mono text-[#B94B43] font-medium">Blocked</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              Arithmetic or GST failures
            </p>
          </div>

          {/* 5. Duplicate Invoices */}
          <div className="p-4 bg-status-criticalBg/15">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#B8754B] font-semibold">
              Duplicate Invoices
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#B8754B]">
                {summary ? summary.duplicate_suspected : '--'}
              </span>
              <span className="text-[10px] font-mono text-[#B8754B] font-medium">Collisions</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              SHA-256 / statutory matches
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION C: MAIN WORKSPACE — INVOICE PROCESSING REGISTER
          (Dominant section: search, column sorting, pagination, filters)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        {/* Register Toolbar Header */}
        <div className="p-4 border-b border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-5 h-5 text-navy" />
            <div>
              <h2 className="text-sm font-bold text-text-primary tracking-tight">
                Invoice Processing Register
              </h2>
              <p className="text-[11px] text-text-secondary">
                Showing {filteredInvoices.length} of {invoices.length} total active financial records
              </p>
            </div>
          </div>

          {/* Register Action Buttons */}
          <div className="flex items-center space-x-2">
            {selectedIds.size > 0 && (
              <span className="text-xs font-mono text-navy font-semibold px-2 py-1 rounded bg-navy-light border border-navy/20">
                {selectedIds.size} Selected
              </span>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface border border-border hover:bg-surfaceMuted text-text-primary rounded text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-navy" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={loadAllData}
              title="Refresh ledger records"
              className="p-1.5 bg-surface border border-border hover:bg-surfaceMuted text-text-secondary rounded transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-surfaceMuted/50 border-b border-border flex flex-wrap items-center gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search Invoice ID, Number, Vendor, PO..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded border border-border bg-white text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          {/* Validation Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-text-secondary font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded border border-border bg-white text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PASSED">Passed</option>
              <option value="PASSED_WITH_WARNINGS">Passed w/ Warnings</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="FAILED">Failed</option>
              <option value="DUPLICATE_SUSPECTED">Duplicate Suspected</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-text-secondary font-medium">Vendor:</span>
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded border border-border bg-white text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-navy max-w-[180px] truncate cursor-pointer"
            >
              <option value="ALL">All Vendors ({vendors.length})</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Range Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-text-secondary font-medium">Amount:</span>
            <select
              value={amountRange}
              onChange={(e) => {
                setAmountRange(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded border border-border bg-white text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-navy cursor-pointer"
            >
              <option value="ALL">All Amounts</option>
              <option value="LT50K">&lt; ₹50,000</option>
              <option value="50K_200K">₹50,000 – ₹2,00,000</option>
              <option value="GT200K">&gt; ₹2,00,000</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || statusFilter !== 'ALL' || vendorFilter !== 'ALL' || amountRange !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setVendorFilter('ALL');
                setAmountRange('ALL');
                setCurrentPage(1);
              }}
              className="text-navy hover:underline font-medium text-[11px]"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#EEEAE2]/60 border-b border-border text-text-secondary font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <button
                    onClick={handleToggleSelectAll}
                    className="flex items-center text-text-secondary hover:text-text-primary"
                  >
                    {selectedIds.size === paginatedInvoices.length && paginatedInvoices.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-navy" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>

                <th
                  onClick={() => handleSort('id')}
                  className="py-2.5 px-3 cursor-pointer hover:text-text-primary select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Invoice ID</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('vendor_name')}
                  className="py-2.5 px-3 cursor-pointer hover:text-text-primary select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Vendor</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('invoice_date')}
                  className="py-2.5 px-3 cursor-pointer hover:text-text-primary select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Invoice Date</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('due_date')}
                  className="py-2.5 px-3 cursor-pointer hover:text-text-primary select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('taxable_amount')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-text-primary select-none"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Taxable (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('total_tax')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-text-primary select-none"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>GST (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('grand_total')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-text-primary select-none"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Total (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('validation_status')}
                  className="py-2.5 px-3 cursor-pointer hover:text-text-primary select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Validation Result</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>

                <th className="py-2.5 px-3">Risk Level</th>

                <th className="py-2.5 px-3 text-right">Review Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-text-muted font-mono">
                    No matching invoices found in register.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const risk = getRiskLevel(inv);
                  const isSelected = selectedIds.has(inv.id);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className={`hover:bg-[#F5F2EC]/60 cursor-pointer transition-colors ${
                        isSelected ? 'bg-navy-light/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3">
                        <button
                          onClick={(e) => handleToggleSelectRow(inv.id, e)}
                          className="flex items-center text-text-secondary hover:text-text-primary"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-navy" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Invoice ID & Number */}
                      <td className="py-3 px-3 font-mono">
                        <span className="font-semibold text-navy">{inv.id}</span>
                        {inv.invoice_number && (
                          <span className="block text-[10px] text-text-secondary">
                            {inv.invoice_number}
                          </span>
                        )}
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-text-primary block truncate max-w-[170px]">
                          {inv.vendor_name || 'Unassigned Vendor'}
                        </span>
                        {inv.vendor_gstin && (
                          <span className="font-mono text-[10px] text-text-secondary">
                            {inv.vendor_gstin}
                          </span>
                        )}
                      </td>

                      {/* Invoice Date */}
                      <td className="py-3 px-3 font-mono text-text-secondary">
                        {inv.invoice_date || '—'}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 font-mono text-text-secondary">
                        {inv.due_date || '—'}
                      </td>

                      {/* Taxable Amount */}
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

                      {/* Validation Result */}
                      <td className="py-3 px-3">
                        <StatusBadge status={inv.validation_status} />
                      </td>

                      {/* Risk Level */}
                      <td className="py-3 px-3">
                        <span
                          className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                          style={{
                            color: risk.color,
                            backgroundColor: risk.bg,
                            borderColor: `${risk.color}33`,
                          }}
                        >
                          {risk.label}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInvoice(inv);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-border hover:border-navy hover:bg-navy hover:text-white transition-all text-text-secondary"
                        >
                          Audit Record
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-border bg-surface flex items-center justify-between text-xs text-text-secondary">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length} invoices
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-surfaceMuted transition-colors text-text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs font-medium text-text-primary">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-surfaceMuted transition-colors text-text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION D & E: FINANCIAL EXCEPTIONS PANEL + VALIDATION PERFORMANCE
          (Structured 2-column analytical layout)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Financial Exceptions Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-critical" />
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                  Financial Exceptions & Accounting Discrepancies
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('exceptions')}
                className="text-xs text-navy hover:underline font-medium flex items-center space-x-1"
              >
                <span>Full Exceptions Ledger</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-border max-h-[380px] overflow-y-auto">
              {exceptions.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted font-mono">
                  No active exceptions flagged in ledger.
                </div>
              ) : (
                exceptions.slice(0, 7).map((exc) => (
                  <div
                    key={exc.id}
                    onClick={() => handleExceptionJump(exc.invoice_id)}
                    className="p-3.5 hover:bg-[#F5F2EC]/50 cursor-pointer transition-colors text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-surfaceMuted border border-border text-navy">
                          {exc.rule_code}
                        </span>
                        <span className="font-semibold text-text-primary truncate max-w-[200px]">
                          {exc.vendor_name}
                        </span>
                        <span className="font-mono text-[11px] text-text-muted">
                          ({exc.invoice_id})
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          exc.severity === 'CRITICAL'
                            ? 'bg-status-criticalBg text-status-critical border-[#ECC7C4]'
                            : 'bg-status-warningBg text-status-warning border-[#ECDBC2]'
                        }`}
                      >
                        {exc.severity}
                      </span>
                    </div>

                    <p className="text-text-secondary leading-relaxed">
                      {exc.explanation}
                    </p>

                    {exc.difference && (
                      <div className="text-[11px] font-mono text-text-primary flex items-center space-x-3 pt-0.5">
                        <span>Expected: <span className="font-semibold text-[#39765B]">{exc.expected_value}</span></span>
                        <span>Actual: <span className="font-semibold text-[#B94B43]">{exc.actual_value}</span></span>
                        <span>Variance: <span className="font-bold text-copper">{exc.difference}</span></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right (5 cols): Validation Performance Analytics */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-border rounded-lg shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                  Validation Performance
                </h3>
                <p className="text-[11px] text-text-secondary">
                  Statutory checks, exception categories & trends
                </p>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary px-2 py-0.5 rounded bg-surfaceMuted border border-border">
                Real-time
              </span>
            </div>

            {/* Exception Category Breakdown Chart */}
            <div>
              <span className="text-xs font-semibold text-text-secondary block mb-2">
                Exceptions by Category
              </span>
              <div className="h-40 w-full">
                {analytics?.category_breakdown ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.category_breakdown}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D7" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#737D88' }} />
                      <YAxis
                        dataKey="category"
                        type="category"
                        tick={{ fontSize: 10, fill: '#202C3A' }}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E0D7',
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: '#202C3A'
                        }}
                      />
                      <Bar dataKey="count" fill="#34536B" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-text-muted font-mono">
                    Loading performance telemetry...
                  </div>
                )}
              </div>
            </div>

            {/* Statutory Compliance Checklist */}
            <div className="pt-2 border-t border-border space-y-2">
              <span className="text-xs font-semibold text-text-secondary block">
                Statutory Compliance Controls
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded border border-border bg-surfaceMuted/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-status-success" />
                    <span className="font-medium text-text-primary">Indian GST Statutory 15-Digit Pattern</span>
                  </div>
                  <span className="font-mono text-[10px] text-navy font-bold">100% Monitored</span>
                </div>

                <div className="p-2 rounded border border-border bg-surfaceMuted/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-status-success" />
                    <span className="font-medium text-text-primary">Deterministic Decimal Precision Arithmetic</span>
                  </div>
                  <span className="font-mono text-[10px] text-navy font-bold">0.05 Tolerance</span>
                </div>

                <div className="p-2 rounded border border-border bg-surfaceMuted/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-status-success" />
                    <span className="font-medium text-text-primary">Inter-state IGST vs Intra-state CGST/SGST</span>
                  </div>
                  <span className="font-mono text-[10px] text-navy font-bold">Enforced</span>
                </div>

                <div className="p-2 rounded border border-border bg-surfaceMuted/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-status-success" />
                    <span className="font-medium text-text-primary">Multi-tier Hash & Statutory Duplicate Detection</span>
                  </div>
                  <span className="font-mono text-[10px] text-copper font-bold">Tier 1–3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
