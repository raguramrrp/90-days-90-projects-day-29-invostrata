import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Play,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCw,
  SlidersHorizontal,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { Invoice, Vendor, OperationalSummary } from '../types';
import { api } from '../services/api';
import { SelectedInvoicePanel, formatInvoiceDate, formatCurrency } from '../components/SelectedInvoicePanel';

interface Props {
  onSelectInvoiceForAudit?: (invoice: Invoice) => void;
  onNavigateToImport?: () => void;
}

export const RegisterPage: React.FC<Props> = ({
  onSelectInvoiceForAudit,
  onNavigateToImport,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [dateRangeText, setDateRangeText] = useState<string>('01 Nov 2026 – 30 Nov 2026');
  const [isDateOpen, setIsDateOpen] = useState<boolean>(false);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [isVendorOpen, setIsVendorOpen] = useState<boolean>(false);

  // Selected invoice in the right panel (default to INV-2026-0107 if present)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(true);

  // Checkbox selection in the table
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // Pagination (6 items per page matching the screenshot)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  useEffect(() => {
    loadVendors();
    loadSummary();
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

  const loadSummary = async () => {
    try {
      const s = await api.getSummary();
      setSummary(s);
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
        limit: 150,
      });
      setInvoices(data);

      // Default selected invoice to INV-2026-0107 if found, otherwise first item
      if (!selectedInvoice && data.length > 0) {
        const target = data.find((inv) => inv.id === 'INV-2026-0107') || data[0];
        // Fetch full details with validation results
        try {
          const full = await api.getInvoice(target.id);
          setSelectedInvoice(full);
        } catch {
          setSelectedInvoice(target);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (inv: Invoice) => {
    setIsPanelVisible(true);
    try {
      const full = await api.getInvoice(inv.id);
      setSelectedInvoice(full);
    } catch {
      setSelectedInvoice(inv);
    }
  };

  const handleToggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleCheckAll = () => {
    const currentIds = paginatedInvoices.map((i) => i.id);
    const allChecked = currentIds.every((id) => checkedIds.includes(id));
    if (allChecked) {
      setCheckedIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      setCheckedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  // Filtered invoices based on search
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        inv.id.toLowerCase().includes(q) ||
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
        (inv.vendor_name && inv.vendor_name.toLowerCase().includes(q)) ||
        (inv.vendor_gstin && inv.vendor_gstin.toLowerCase().includes(q))
      );
    });
  }, [invoices, search]);

  // Paginated list
  const totalCount = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + pageSize);

  // Computed summary metrics
  const displayProcessed = summary ? summary.total_invoices : totalCount;
  const displayPassed = summary ? summary.passed_validation : invoices.filter(i => i.validation_status === 'PASSED').length;
  const displayReview = summary ? summary.needs_review : invoices.filter(i => i.validation_status === 'NEEDS_REVIEW' || i.validation_status === 'PASSED_WITH_WARNINGS').length;
  const displayFailed = summary ? summary.failed_validation : invoices.filter(i => i.validation_status === 'FAILED' || i.validation_status === 'REJECTED').length;

  return (
    <div className="w-full font-sans">
      {/* 1. Page Heading Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#15263B] tracking-tight">
            Invoice register
          </h1>
        </div>

        {/* Right side controls: Date-range selector & New validation button */}
        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="flex items-center space-x-2 px-3 py-2 bg-white border border-[#E4DED4] hover:bg-[#F4F1EB] rounded-md text-xs font-medium text-[#15263B] shadow-sm transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#15263B]" />
              <span>{dateRangeText}</span>
              <ChevronDown className="w-3 h-3 text-[#687586] ml-1" />
            </button>

            {isDateOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white border border-[#E4DED4] rounded-md shadow-lg py-1.5 z-30 text-xs">
                <button
                  onClick={() => {
                    setDateRangeText('01 Nov 2026 – 30 Nov 2026');
                    setIsDateOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F4F1EB] text-[#15263B]"
                >
                  November 2026 (Active period)
                </button>
                <button
                  onClick={() => {
                    setDateRangeText('01 Oct 2026 – 31 Oct 2026');
                    setIsDateOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F4F1EB] text-[#15263B]"
                >
                  October 2026
                </button>
                <button
                  onClick={() => {
                    setDateRangeText('All Fiscal Year 2026-27');
                    setIsDateOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F4F1EB] text-[#15263B]"
                >
                  All FY 2026-27
                </button>
              </div>
            )}
          </div>

          {/* New Validation Button (Muted Copper-Orange) */}
          <button
            onClick={onNavigateToImport}
            className="flex items-center space-x-2 px-4 py-2 bg-[#B96C32] hover:bg-[#A65C28] text-white rounded-md text-xs font-medium shadow-sm transition-colors"
          >
            <Play className="w-3 h-3 fill-white text-white" />
            <span>New validation</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Strip (Single horizontal white card with thin vertical dividers) */}
      <div className="bg-white border border-[#E4DED4] rounded-lg shadow-sm mb-5 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E4DED4] py-4 px-6 items-center">
          {/* Total Processed */}
          <div className="flex items-baseline py-2 md:py-0 pr-4">
            <span className="font-serif font-bold text-3xl text-[#15263B] tracking-tight">
              {displayProcessed}
            </span>
            <span className="text-xs text-[#15263B] font-medium ml-2">
              processed
            </span>
          </div>

          {/* Passed */}
          <div className="flex items-baseline py-2 md:py-0 md:px-6">
            <span className="font-serif font-bold text-3xl text-[#26764F] tracking-tight">
              {displayPassed}
            </span>
            <span className="text-xs text-[#15263B] font-medium ml-2">
              passed
            </span>
          </div>

          {/* Needs Review */}
          <div className="flex items-baseline py-2 md:py-0 md:px-6">
            <span className="font-serif font-bold text-3xl text-[#C47B16] tracking-tight">
              {displayReview}
            </span>
            <span className="text-xs text-[#15263B] font-medium ml-2">
              needs review
            </span>
          </div>

          {/* Failed */}
          <div className="flex items-baseline py-2 md:py-0 md:pl-6">
            <span className="font-serif font-bold text-3xl text-[#B83D37] tracking-tight">
              {displayFailed}
            </span>
            <span className="text-xs text-[#15263B] font-medium ml-2">
              failed
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Row */}
      <div className="bg-white border border-[#E4DED4] rounded-lg px-3.5 py-2 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Search Input */}
        <div className="flex items-center space-x-2.5 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#89919B] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search invoice, vendor or GSTIN..."
            className="w-full text-xs text-[#15263B] placeholder-[#89919B] bg-transparent focus:outline-none"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E4DED4] hover:bg-[#F4F1EB] rounded text-[#15263B] transition-colors"
            >
              <span>{statusFilter === 'ALL' ? 'Status' : statusFilter}</span>
              <ChevronDown className="w-3 h-3 text-[#687586]" />
            </button>
            {isStatusOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-[#E4DED4] rounded shadow-lg py-1 z-30">
                {['ALL', 'PASSED', 'NEEDS_REVIEW', 'FAILED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setIsStatusOpen(false);
                      setCurrentPage(1);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-[#F4F1EB] text-xs text-[#15263B]"
                  >
                    {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vendor Filter */}
          <div className="relative">
            <button
              onClick={() => setIsVendorOpen(!isVendorOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E4DED4] hover:bg-[#F4F1EB] rounded text-[#15263B] transition-colors"
            >
              <span>Vendor</span>
              <ChevronDown className="w-3 h-3 text-[#687586]" />
            </button>
            {isVendorOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-[#E4DED4] rounded shadow-lg py-1 z-30 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setVendorFilter('ALL');
                    setIsVendorOpen(false);
                    setCurrentPage(1);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#F4F1EB] text-xs text-[#15263B]"
                >
                  All Vendors
                </button>
                {vendors.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVendorFilter(String(v.id));
                      setIsVendorOpen(false);
                      setCurrentPage(1);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-[#F4F1EB] text-xs text-[#15263B] truncate"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Filter */}
          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E4DED4] hover:bg-[#F4F1EB] rounded text-[#15263B] transition-colors">
            <span>Date</span>
            <ChevronDown className="w-3 h-3 text-[#687586]" />
          </button>

          {/* Amount Filter */}
          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E4DED4] hover:bg-[#F4F1EB] rounded text-[#15263B] transition-colors">
            <span>Amount</span>
            <ChevronDown className="w-3 h-3 text-[#687586]" />
          </button>

          {/* More Filters */}
          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-[#E4DED4] hover:bg-[#F4F1EB] rounded text-[#15263B] transition-colors">
            <SlidersHorizontal className="w-3 h-3 text-[#687586]" />
            <span>More filters</span>
            <ChevronDown className="w-3 h-3 text-[#687586]" />
          </button>
        </div>
      </div>

      {/* 4. Two-Column Layout: Invoice Table (~70%) + Selected Invoice Panel (~30%) */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Column: Invoice Table */}
        <div className="flex-1 min-w-0 w-full bg-white border border-[#E4DED4] rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE5DC] bg-white text-[11px] font-bold text-[#15263B]">
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedInvoices.length > 0 &&
                        paginatedInvoices.every((i) => checkedIds.includes(i.id))
                      }
                      onChange={handleToggleCheckAll}
                      className="rounded border-[#D5CEC4] text-[#15263B] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3.5">Invoice</th>
                  <th className="py-3 px-3.5">Vendor</th>
                  <th className="py-3 px-3.5">Invoice date</th>
                  <th className="py-3 px-3.5">Due date</th>
                  <th className="py-3 px-3.5">Subtotal (₹)</th>
                  <th className="py-3 px-3.5">Tax (₹)</th>
                  <th className="py-3 px-3.5">Total (₹)</th>
                  <th className="py-3 px-3.5">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5DC] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#687586]">
                      <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#B96C32]" />
                      Loading invoice records...
                    </td>
                  </tr>
                ) : paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#687586]">
                      No invoices match the specified criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    const isChecked = checkedIds.includes(inv.id);

                    // Status representation matching the reference screenshot dots:
                    // • Passed (Green) | • Review (Amber) | • Failed (Red)
                    let statusLabel = 'Passed';
                    let dotColor = 'bg-[#26764F]';
                    let textColor = 'text-[#26764F]';

                    if (
                      inv.validation_status === 'NEEDS_REVIEW' ||
                      inv.validation_status === 'PASSED_WITH_WARNINGS' ||
                      inv.validation_status === 'DUPLICATE_SUSPECTED'
                    ) {
                      statusLabel = 'Review';
                      dotColor = 'bg-[#C47B16]';
                      textColor = 'text-[#C47B16]';
                    } else if (
                      inv.validation_status === 'FAILED' ||
                      inv.validation_status === 'REJECTED'
                    ) {
                      statusLabel = 'Failed';
                      dotColor = 'bg-[#B83D37]';
                      textColor = 'text-[#B83D37]';
                    }

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => handleRowClick(inv)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F9F5EE] border-l-4 border-l-[#B96C32]'
                            : 'bg-white hover:bg-[#FAF8F5]'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-3 px-3.5 text-center"
                          onClick={(e) => handleToggleCheck(inv.id, e)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-[#D5CEC4] text-[#15263B] focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Invoice Number */}
                        <td className="py-3 px-3.5 font-mono text-[11px] font-semibold text-[#15263B]">
                          {inv.id}
                        </td>

                        {/* Vendor Name */}
                        <td className="py-3 px-3.5 font-medium text-[#15263B] whitespace-nowrap">
                          {inv.vendor_name || 'Vendor Not Specified'}
                        </td>

                        {/* Invoice Date */}
                        <td className="py-3 px-3.5 text-[#15263B] whitespace-nowrap">
                          {formatInvoiceDate(inv.invoice_date)}
                        </td>

                        {/* Due Date */}
                        <td className="py-3 px-3.5 text-[#15263B] whitespace-nowrap">
                          {formatInvoiceDate(inv.due_date)}
                        </td>

                        {/* Subtotal */}
                        <td className="py-3 px-3.5 font-mono text-[#15263B] whitespace-nowrap">
                          {formatCurrency(inv.subtotal)}
                        </td>

                        {/* Tax */}
                        <td className="py-3 px-3.5 font-mono text-[#15263B] whitespace-nowrap">
                          {formatCurrency(inv.total_tax)}
                        </td>

                        {/* Total */}
                        <td className="py-3 px-3.5 font-mono font-semibold text-[#15263B] whitespace-nowrap">
                          {formatCurrency(inv.grand_total)}
                        </td>

                        {/* Validation Status Dot */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className={`flex items-center space-x-1.5 font-medium text-xs ${textColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                            <span>{statusLabel}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Showing X–Y of Z invoices & Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-t border-[#EAE5DC] text-xs text-[#687586] gap-3">
            <div>
              {totalCount > 0 ? (
                <span>
                  Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalCount)} of{' '}
                  {totalCount} invoices
                </span>
              ) : (
                <span>Showing 0 invoices</span>
              )}
            </div>

            {/* Pagination Numbers: < [ 1 ] 2 3 4 5 > */}
            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-6 h-6 flex items-center justify-center rounded text-[#687586] hover:text-[#15263B] hover:bg-[#F4F1EB] disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pg) => {
                const isActive = pg === currentPage;
                return (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${
                      isActive
                        ? 'bg-[#15263B] text-white font-semibold'
                        : 'text-[#15263B] hover:bg-[#F4F1EB]'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-6 h-6 flex items-center justify-center rounded text-[#687586] hover:text-[#15263B] hover:bg-[#F4F1EB] disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Invoice Panel (~30%) */}
        {isPanelVisible && selectedInvoice && (
          <SelectedInvoicePanel
            invoice={selectedInvoice}
            onClose={() => setIsPanelVisible(false)}
            onOpenAuditRecord={() => {
              if (onSelectInvoiceForAudit) {
                onSelectInvoiceForAudit(selectedInvoice);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
