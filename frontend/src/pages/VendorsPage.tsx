import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { Vendor } from '../types';
import { api } from '../services/api';

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

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

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVendor(newVendor);
      setShowAddModal(false);
      loadVendors();
    } catch (err: any) {
      alert(`Registration error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Registered Vendor Directory</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Maintain statutory GSTIN registry, banking credentials, compliance pass rates, and invoice histories.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Vendor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Vendor Directory Table (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-border rounded-lg shadow-sm flex flex-col h-[700px] overflow-hidden">
          <div className="p-3 border-b border-border bg-surface font-semibold text-xs text-text-primary flex justify-between items-center">
            <span>Corporate Suppliers ({vendors.length})</span>
            <span className="text-[11px] font-mono text-text-muted">Live Database Records</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {vendors.map((v) => {
              const isSelected = selectedVendorId === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => handleSelectVendor(v.id)}
                  className={`p-3.5 text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#EAF3EE] border-l-4 border-l-primary' : 'hover:bg-workspace/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-text-primary">{v.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        v.status === 'ACTIVE'
                          ? 'bg-[#EAF3EE] text-[#286B55]'
                          : 'bg-status-criticalBg text-status-critical'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-text-secondary font-mono text-[11px] mt-1">
                    <span>GSTIN: {v.gstin || 'None'}</span>
                    <span className="font-bold text-text-primary">
                      ₹{v.total_billed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-text-muted mt-1.5 pt-1.5 border-t border-border/50">
                    <span>{v.invoice_count} Invoices Processed</span>
                    <span className="text-primary font-semibold">{v.pass_rate}% Pass Rate</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Vendor View (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {vendorDetails ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-text-primary">{vendorDetails.vendor.name}</h3>
                    <p className="text-xs text-text-secondary font-mono mt-0.5">
                      GSTIN: {vendorDetails.vendor.gstin || 'Unregistered'} | PAN: {vendorDetails.vendor.pan || 'N/A'}
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-workspace border border-border">
                    Vendor #{vendorDetails.vendor.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-text-secondary">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-text-primary">{vendorDetails.vendor.address || 'Address unlisted'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-text-secondary">
                      <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-text-primary">{vendorDetails.vendor.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-text-secondary">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-text-primary">{vendorDetails.vendor.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-text-secondary font-mono">
                      <Landmark className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-text-primary">
                        {vendorDetails.vendor.bank_name || 'Bank N/A'} ({vendorDetails.vendor.account_number || ''})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real Metrics Strip */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border text-center">
                  <div className="p-2.5 bg-workspace rounded border border-border">
                    <p className="text-[10px] text-text-secondary uppercase">Total Billed</p>
                    <p className="text-sm font-bold font-mono text-text-primary mt-0.5">
                      ₹{vendorDetails.stats.total_billed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-2.5 bg-workspace rounded border border-border">
                    <p className="text-[10px] text-text-secondary uppercase">Pass Rate</p>
                    <p className="text-sm font-bold font-mono text-primary mt-0.5">
                      {vendorDetails.stats.pass_rate}%
                    </p>
                  </div>
                  <div className="p-2.5 bg-workspace rounded border border-border">
                    <p className="text-[10px] text-text-secondary uppercase">Discrepancies</p>
                    <p className="text-sm font-bold font-mono text-status-critical mt-0.5">
                      {vendorDetails.stats.exception_count}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vendor Invoice History Table */}
              <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="p-3 border-b border-border bg-surface font-semibold text-xs text-text-primary">
                  Historical Submissions ({vendorDetails.invoices?.length || 0})
                </div>
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFCFA] border-b border-border text-text-secondary font-mono text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Invoice ID</th>
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Amount (₹)</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {vendorDetails.invoices?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-workspace/50">
                          <td className="py-2 px-3 font-mono font-medium text-primary">{inv.id}</td>
                          <td className="py-2 px-3 font-mono text-text-secondary">{inv.invoice_number}</td>
                          <td className="py-2 px-3 font-mono text-text-secondary">{inv.invoice_date}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-text-primary">
                            ₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-mono uppercase font-semibold text-text-secondary">
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
            <div className="p-12 text-center text-text-muted text-xs bg-white border border-border rounded-lg">
              Select a vendor to inspect full ledger history.
            </div>
          )}
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateVendor} className="bg-white border border-border rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-sm font-bold text-text-primary">Register New Supplier / Vendor</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="font-medium text-text-secondary block mb-1">Legal Entity / Company Name *</label>
                <input
                  type="text"
                  required
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="w-full p-2 border border-border rounded bg-workspace"
                />
              </div>

              <div>
                <label className="font-medium text-text-secondary block mb-1">GSTIN (15 Chars) *</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={newVendor.gstin}
                  onChange={(e) => setNewVendor({ ...newVendor, gstin: e.target.value.toUpperCase() })}
                  className="w-full p-2 border border-border rounded bg-workspace font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-text-secondary block mb-1">State Code</label>
                <input
                  type="text"
                  maxLength={2}
                  value={newVendor.state_code}
                  onChange={(e) => setNewVendor({ ...newVendor, state_code: e.target.value })}
                  className="w-full p-2 border border-border rounded bg-workspace font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="font-medium text-text-secondary block mb-1">Operating Address</label>
                <input
                  type="text"
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                  className="w-full p-2 border border-border rounded bg-workspace"
                />
              </div>

              <div>
                <label className="font-medium text-text-secondary block mb-1">Billing Email</label>
                <input
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  className="w-full p-2 border border-border rounded bg-workspace"
                />
              </div>

              <div>
                <label className="font-medium text-text-secondary block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={newVendor.bank_name}
                  onChange={(e) => setNewVendor({ ...newVendor, bank_name: e.target.value })}
                  className="w-full p-2 border border-border rounded bg-workspace"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-text-secondary border border-border rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-primary text-white rounded font-medium shadow-sm hover:bg-primary-dark"
              >
                Register Vendor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
