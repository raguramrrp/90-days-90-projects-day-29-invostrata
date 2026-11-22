import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  MapPin,
  Landmark,
  ShieldAlert,
  ChevronRight,
  Ban,
  Check,
  Search,
  Filter
} from 'lucide-react';
import { Vendor } from '../types';
import { api } from '../services/api';

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // New Vendor Form
  const [newVendor, setNewVendor] = useState({
    name: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: 'Karnataka',
    state_code: '29',
    email: '',
    phone: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await api.getVendors();
      setVendors(data);
      if (data.length > 0 && !selectedVendorId) {
        handleSelectVendor(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVendor = async (id: number) => {
    setSelectedVendorId(id);
    try {
      const details = await api.getVendorDetails(id);
      setVendorDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVendorStatus = async (vendor: Vendor) => {
    const newStatus = vendor.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    setIsUpdatingStatus(true);
    try {
      await api.updateVendor(vendor.id, { status: newStatus });
      await loadVendors();
      if (selectedVendorId === vendor.id) {
        await handleSelectVendor(vendor.id);
      }
    } catch (err) {
      console.error('Failed to update vendor status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVendor(newVendor);
      setShowAddModal(false);
      loadVendors();
      setNewVendor({
        name: '',
        gstin: '',
        pan: '',
        address: '',
        city: '',
        state: 'Karnataka',
        state_code: '29',
        email: '',
        phone: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to create vendor');
    }
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          (v.gstin || '').toLowerCase().includes(q) ||
          (v.city || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vendors, statusFilter, search]);

  const activeCount = useMemo(() => vendors.filter(v => v.status === 'ACTIVE').length, [vendors]);
  const blockedCount = useMemo(() => vendors.filter(v => v.status === 'BLOCKED').length, [vendors]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Vendor Intelligence & Compliance Directory
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-copper hover:bg-copper-hover text-white rounded text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Vendor</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Tabs */}
        <div className="flex items-center space-x-1 pt-4 mt-4 border-t border-border overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-navy text-white font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-surfaceMuted'
            }`}
          >
            All Vendors ({vendors.length})
          </button>

          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#39765B] text-white font-semibold'
                : 'text-[#39765B] hover:bg-status-successBg'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Active Suppliers ({activeCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('BLOCKED')}
            className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center space-x-1.5 ${
              statusFilter === 'BLOCKED'
                ? 'bg-[#B94B43] text-white font-semibold'
                : 'text-[#B94B43] hover:bg-status-criticalBg'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Restricted / Blocked ({blockedCount})</span>
          </button>
        </div>
      </div>

      {/* Main Master-Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left (5 cols): Vendor Directory List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-border bg-surfaceMuted/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by vendor name, GSTIN, or city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
            </div>

            {/* List Items */}
            <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
              {filteredVendors.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted font-mono">
                  No matching vendors found.
                </div>
              ) : (
                filteredVendors.map((v) => {
                  const isSelected = selectedVendorId === v.id;
                  const isBlocked = v.status === 'BLOCKED';

                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSelectVendor(v.id)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-navy-light/60 border-l-4 border-l-navy'
                          : 'hover:bg-[#F5F2EC]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-text-primary truncate max-w-[220px]">
                          {v.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            isBlocked
                              ? 'bg-status-criticalBg text-status-critical border-[#ECC7C4]'
                              : 'bg-status-successBg text-status-success border-[#B8D5C7]'
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-text-secondary font-mono">
                        <span>GSTIN: {v.gstin || 'None'}</span>
                        <span>{v.city || 'India'}</span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between text-[10px] text-text-muted">
                        <span>{v.invoice_count} Invoices</span>
                        <span className="font-mono font-semibold text-text-primary">
                          ₹{v.total_billed.toLocaleString('en-IN')}
                        </span>
                        <span className="font-semibold text-[#39765B]">{v.pass_rate}% Pass</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right (7 cols): Selected Vendor Dossier */}
        <div className="lg:col-span-7">
          {vendorDetails ? (
            <div className="bg-white border border-border rounded-lg shadow-sm p-5 space-y-5">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-text-primary">
                      {vendorDetails.vendor.name}
                    </h2>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        vendorDetails.vendor.status === 'BLOCKED'
                          ? 'bg-status-criticalBg text-status-critical border-[#ECC7C4]'
                          : 'bg-status-successBg text-status-success border-[#B8D5C7]'
                      }`}
                    >
                      {vendorDetails.vendor.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 font-mono">
                    GSTIN: {vendorDetails.vendor.gstin || 'UNREGISTERED'} &bull; PAN: {vendorDetails.vendor.pan || 'N/A'}
                  </p>
                </div>

                {/* Status Toggle Action Button */}
                <button
                  onClick={() => handleToggleVendorStatus(vendorDetails.vendor)}
                  disabled={isUpdatingStatus}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm ${
                    vendorDetails.vendor.status === 'BLOCKED'
                      ? 'bg-status-success hover:bg-status-success/90 text-white'
                      : 'bg-status-critical hover:bg-status-critical/90 text-white'
                  }`}
                >
                  {vendorDetails.vendor.status === 'BLOCKED' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Authorize / Unblock Vendor</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block / Restrict Vendor</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded border border-border bg-surfaceMuted/50">
                  <span className="text-[10px] uppercase font-mono text-text-secondary block">Total Billed</span>
                  <span className="text-base font-bold font-mono text-text-primary block mt-1">
                    ₹{vendorDetails.stats.total_billed.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-3 rounded border border-border bg-status-successBg/30">
                  <span className="text-[10px] uppercase font-mono text-status-success block">Pass Rate</span>
                  <span className="text-base font-bold font-mono text-status-success block mt-1">
                    {vendorDetails.stats.pass_rate}%
                  </span>
                </div>

                <div className="p-3 rounded border border-border bg-status-warningBg/30">
                  <span className="text-[10px] uppercase font-mono text-status-warning block">Exceptions</span>
                  <span className="text-base font-bold font-mono text-status-warning block mt-1">
                    {vendorDetails.stats.exception_count} Flags
                  </span>
                </div>

                <div className="p-3 rounded border border-border bg-status-criticalBg/30">
                  <span className="text-[10px] uppercase font-mono text-status-critical block">Duplicates</span>
                  <span className="text-base font-bold font-mono text-status-critical block mt-1">
                    {vendorDetails.stats.duplicate_count} Matches
                  </span>
                </div>
              </div>

              {/* Banking & Statutory Details */}
              <div className="p-3.5 rounded bg-surfaceMuted/40 border border-border space-y-2 text-xs">
                <h4 className="font-bold text-text-primary uppercase tracking-wider text-[10px]">
                  Registered Banking & Compliance Dossier
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-text-muted">Bank Name:</span>{' '}
                    <span className="font-semibold text-text-primary">{vendorDetails.vendor.bank_name || 'HDFC Bank Ltd'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Account No:</span>{' '}
                    <span className="font-semibold text-text-primary">{vendorDetails.vendor.account_number || '50200089211029'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">IFSC Code:</span>{' '}
                    <span className="font-semibold text-text-primary">{vendorDetails.vendor.ifsc_code || 'HDFC0001024'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">State Code:</span>{' '}
                    <span className="font-semibold text-navy">
                      {vendorDetails.vendor.state_code} ({vendorDetails.vendor.state || 'Karnataka'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Historical Invoices */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-text-primary">
                    Historical Billed Invoices ({vendorDetails.invoices.length})
                  </h4>
                  <span className="text-[11px] text-text-muted font-mono">Last 10 Records</span>
                </div>

                <div className="overflow-x-auto border border-border rounded">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surfaceMuted text-text-secondary font-mono text-[10px] border-b border-border">
                      <tr>
                        <th className="p-2">Invoice ID</th>
                        <th className="p-2">Invoice No</th>
                        <th className="p-2">Date</th>
                        <th className="p-2 text-right">Amount (₹)</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {vendorDetails.invoices.slice(0, 8).map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-surfaceMuted/40 font-mono text-[11px]">
                          <td className="p-2 font-semibold text-navy">{inv.id}</td>
                          <td className="p-2 text-text-secondary">{inv.invoice_number || '—'}</td>
                          <td className="p-2 text-text-secondary">{inv.invoice_date || '—'}</td>
                          <td className="p-2 text-right font-bold text-text-primary">
                            ₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              inv.validation_status.includes('PASS')
                                ? 'bg-status-successBg text-status-success'
                                : 'bg-status-criticalBg text-status-critical'
                            }`}>
                              {inv.validation_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-lg shadow-sm p-12 text-center text-xs text-text-muted font-mono">
              Select a vendor to inspect compliance metrics.
            </div>
          )}
        </div>
      </div>

      {/* Register New Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-border shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-text-primary">Register New Supplier / Vendor</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-text-secondary block mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Cloud Infrastructure Pvt Ltd"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full p-2 rounded border border-border focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">GSTIN (15-digit) *</label>
                  <input
                    type="text"
                    required
                    placeholder="29AABCU9603R1ZM"
                    value={newVendor.gstin}
                    onChange={(e) => setNewVendor({ ...newVendor, gstin: e.target.value.toUpperCase() })}
                    className="w-full p-2 rounded border border-border font-mono uppercase focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">State Code (01–38)</label>
                  <input
                    type="text"
                    required
                    placeholder="29"
                    value={newVendor.state_code}
                    onChange={(e) => setNewVendor({ ...newVendor, state_code: e.target.value })}
                    className="w-full p-2 rounded border border-border font-mono focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="HDFC Bank"
                    value={newVendor.bank_name}
                    onChange={(e) => setNewVendor({ ...newVendor, bank_name: e.target.value })}
                    className="w-full p-2 rounded border border-border focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="font-semibold text-text-secondary block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="HDFC0001024"
                    value={newVendor.ifsc_code}
                    onChange={(e) => setNewVendor({ ...newVendor, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full p-2 rounded border border-border font-mono uppercase focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-text-secondary block mb-1">Registered Address</label>
                <input
                  type="text"
                  placeholder="Tech Park, Whitefield, Bangalore"
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                  className="w-full p-2 rounded border border-border focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded border border-border text-text-secondary hover:bg-surfaceMuted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-copper hover:bg-copper-hover text-white rounded font-semibold transition-colors shadow-sm"
                >
                  Register Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
