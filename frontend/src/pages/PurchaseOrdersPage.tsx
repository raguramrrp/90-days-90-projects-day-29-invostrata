import React, { useState, useEffect } from 'react';
import {
  FileText,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice } from '../types';

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvId, setSelectedInvId] = useState<string>('');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, invs] = await Promise.all([
        api.getPurchaseOrders(),
        api.getInvoices({ limit: 50 }),
      ]);
      setPurchaseOrders(pos);
      setInvoices(invs);
      if (invs.length > 0) {
        handleRunMatch(invs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMatch = async (invId: string) => {
    setSelectedInvId(invId);
    try {
      const res = await api.getInvoiceThreeWayMatch(invId);
      setMatchResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Purchase Order Reconciliation (Three-Way Matching)
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Purchase Orders Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 border-b border-border bg-surfaceMuted/50 font-semibold text-xs text-text-primary flex justify-between items-center">
              <span>Authorized Purchase Orders</span>
              <span className="text-[10px] font-mono text-text-muted">{purchaseOrders.length} Orders</span>
            </div>

            <div className="divide-y divide-border max-h-[620px] overflow-y-auto">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="p-3.5 text-xs hover:bg-[#F5F2EC]/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-navy">{po.po_number}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-status-successBg text-status-success rounded border border-[#B8D5C7]">
                      {po.status}
                    </span>
                  </div>

                  <div className="flex justify-between text-text-secondary">
                    <span className="font-medium text-text-primary">{po.vendor_name}</span>
                    <span className="font-mono font-semibold text-text-primary">
                      ₹{po.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-surfaceMuted/50 p-2 rounded border border-border text-[11px] space-y-1">
                    {po.items.map((itm: any, i: number) => (
                      <div key={i} className="flex justify-between text-text-primary">
                        <span className="truncate max-w-[200px]">{itm.description}</span>
                        <span className="font-mono">{itm.quantity} @ ₹{itm.unit_price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: 3-Way Match Reconciler (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Invoice Selector */}
          <div className="bg-white border border-border rounded-lg p-3.5 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-text-primary">Audit Target Invoice:</span>
              <select
                value={selectedInvId}
                onChange={(e) => handleRunMatch(e.target.value)}
                className="text-xs font-mono font-medium p-1.5 bg-surfaceMuted border border-border rounded focus:ring-1 focus:ring-navy outline-none"
              >
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.id} — {inv.vendor_name?.substring(0, 22)} ({inv.po_number || 'No PO'})
                  </option>
                ))}
              </select>
            </div>

            {matchResult && (
              <span
                className={`text-xs font-bold font-mono px-2.5 py-1 rounded border ${
                  matchResult.status === 'MATCHED'
                    ? 'bg-status-successBg text-status-success border-[#B8D5C7]'
                    : matchResult.status === 'NOT_PERFORMED'
                    ? 'bg-surfaceMuted text-text-muted border-border'
                    : 'bg-status-criticalBg text-status-critical border-[#ECC7C4]'
                }`}
              >
                {matchResult.status}
              </span>
            )}
          </div>

          {/* Three-Way Comparison Details */}
          {matchResult && (
            <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Reconciliation Summary</h3>
                <p className="text-xs text-text-secondary mt-1">{matchResult.summary}</p>
              </div>

              {/* 3 Blocks Comparison */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-surfaceMuted/50 border border-border rounded-lg">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">1. Purchase Order</p>
                  <p className="font-mono text-xs font-bold text-text-primary mt-1">
                    {matchResult.po_found ? matchResult.po_number : 'Not Supplied'}
                  </p>
                  <p className="text-[11px] font-mono text-text-secondary mt-0.5">
                    {matchResult.po_total ? `₹${matchResult.po_total.toLocaleString('en-IN')}` : '—'}
                  </p>
                </div>

                <div className="p-3 bg-surfaceMuted/50 border border-border rounded-lg">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">2. Warehouse GRN</p>
                  <p className="font-mono text-xs font-bold text-text-primary mt-1">
                    {matchResult.grn_found ? 'GRN Verified' : 'Pending Intake'}
                  </p>
                  <p className="text-[11px] font-mono text-text-secondary mt-0.5">
                    {matchResult.grn_items_count ? `${matchResult.grn_items_count} Line Items` : '—'}
                  </p>
                </div>

                <div className="p-3 bg-surfaceMuted/50 border border-border rounded-lg">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">3. Billed Invoice</p>
                  <p className="font-mono text-xs font-bold text-navy mt-1">
                    {selectedInvId}
                  </p>
                  <p className="text-[11px] font-mono font-bold text-text-primary mt-0.5">
                    {matchResult.invoice_total ? `₹${matchResult.invoice_total.toLocaleString('en-IN')}` : '—'}
                  </p>
                </div>
              </div>

              {/* Line Items Variance Table */}
              {matchResult.items_comparison && matchResult.items_comparison.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surfaceMuted text-text-secondary font-mono text-[10px] border-b border-border">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-right">PO Qty</th>
                        <th className="p-2.5 text-right">GRN Qty</th>
                        <th className="p-2.5 text-right">Billed Qty</th>
                        <th className="p-2.5 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[11px]">
                      {matchResult.items_comparison.map((c: any, i: number) => (
                        <tr key={i} className="hover:bg-surfaceMuted/30">
                          <td className="p-2.5 font-sans font-medium text-text-primary">{c.description}</td>
                          <td className="p-2.5 text-right">{c.po_qty}</td>
                          <td className="p-2.5 text-right">{c.grn_qty}</td>
                          <td className="p-2.5 text-right font-semibold text-text-primary">{c.invoice_qty}</td>
                          <td className="p-2.5 text-right">
                            {c.qty_diff === 0 ? (
                              <span className="text-status-success font-bold">MATCH</span>
                            ) : (
                              <span className="text-status-critical font-bold">{c.qty_diff > 0 ? `+${c.qty_diff}` : c.qty_diff}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
