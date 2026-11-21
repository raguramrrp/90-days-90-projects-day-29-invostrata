import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RotateCw,
  Eye,
  CheckSquare,
  Square,
  Download,
  AlertTriangle,
  ChevronDown
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
    if (selectedIds.length === invoices.length) {
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

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Invoice Ingestion & Audit Queue</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Structured operational table for validating invoices, verifying arithmetic and tax rules.
          </p>
        </div>

        {/* Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2 bg-workspace p-1.5 rounded-lg border border-border">
            <span className="text-xs font-mono font-semibold px-2 text-primary">
              {selectedIds.length} Selected
            </span>
            <button
              onClick={handleBatchRevalidate}
              disabled={isBatchRunning}
              className="flex items-center space-x-1 px-3 py-1 bg-primary text-white text-xs font-medium rounded hover:bg-primary-dark transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isBatchRunning ? 'animate-spin' : ''}`} />
              <span>Batch Validate</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice number, vendor name, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-workspace border border-border rounded-md focus:outline-none focus:border-primary transition-colors font-sans"
          />
        </form>

        <div className="flex items-center space-x-2.5">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-workspace border border-border rounded-md px-3 py-2 appearance-none pr-8 font-medium text-text-primary focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PASSED">Passed Validation</option>
              <option value="PASSED_WITH_WARNINGS">Passed with Warnings</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="DUPLICATE_SUSPECTED">Duplicate Suspected</option>
              <option value="FAILED">Failed Validation</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Vendor Filter */}
          <div className="relative">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="text-xs bg-workspace border border-border rounded-md px-3 py-2 appearance-none pr-8 font-medium text-text-primary focus:outline-none focus:border-primary cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-3 pointer-events-none" />
          </div>

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setVendorFilter('ALL');
            }}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-workspace rounded-md border border-border transition-colors text-xs"
            title="Reset Filters"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Structured Table */}
      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFCFA] border-b border-border text-text-secondary font-mono text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <button onClick={handleToggleSelectAll} className="text-text-secondary hover:text-text-primary">
                    {selectedIds.length > 0 && selectedIds.length === invoices.length ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-text-muted" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Invoice ID</th>
                <th className="py-3 px-3">Vendor</th>
                <th className="py-3 px-3">Invoice Number</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Amount (₹)</th>
                <th className="py-3 px-3 text-right">Tax (₹)</th>
                <th className="py-3 px-3">Validation Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-muted font-mono">
                    Loading invoice ledger...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-secondary">
                    No matching invoice records found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isSelected = selectedInvoiceId === inv.id;
                  const isChecked = selectedIds.includes(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#EAF3EE]/70 border-l-4 border-l-primary'
                          : 'hover:bg-workspace/60'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center" onClick={(e) => handleToggleSelect(inv.id, e)}>
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted mx-auto" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-primary whitespace-nowrap">
                        {inv.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-text-primary max-w-[180px] truncate">
                        {inv.vendor_name || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-secondary whitespace-nowrap">
                        {inv.invoice_number || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-secondary whitespace-nowrap">
                        {inv.invoice_date || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-text-primary whitespace-nowrap">
                        ₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-text-secondary whitespace-nowrap">
                        ₹{inv.total_tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusBadge status={inv.validation_status} />
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInvoice(inv);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-[#EAF3EE] rounded border border-[#C2DDD0] transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-surface border-t border-border flex justify-between items-center text-xs text-text-secondary font-mono">
          <span>Showing {invoices.length} invoices</span>
          <span>Click any row to open the Inspection Panel</span>
        </div>
      </div>
    </div>
  );
};
