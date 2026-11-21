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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Three-Way Matching & Procurement</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Deterministic cross-reconciliation between Purchase Orders (PO), Warehouse Goods Received Notes (GRN), and Vendor Invoices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Purchase Orders Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 border-b border-border bg-surface font-semibold text-xs text-text-primary flex justify-between items-center">
              <span>Active Purchase Orders</span>
              <span className="text-[11px] font-mono text-text-muted">{purchaseOrders.length} Orders</span>
            </div>

            <div className="divide-y divide-border max-h-[620px] overflow-y-auto">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="p-3.5 text-xs hover:bg-workspace/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-primary">{po.po_number}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EAF3EE] text-[#286B55] rounded border border-[#C2DDD0]">
                      {po.status}
                    </span>
                  </div>

                  <div className="flex justify-between text-text-secondary">
                    <span>{po.vendor_name}</span>
                    <span className="font-mono font-semibold text-text-primary">
                      ₹{po.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-workspace p-2 rounded border border-border text-[11px] space-y-1">
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
                className="text-xs font-mono font-medium p-1.5 bg-workspace border border-border rounded focus:border-primary outline-none"
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
                    ? 'bg-[#EAF3EE] text-[#286B55] border-[#C2DDD0]'
                    : matchResult.status === 'NOT_PERFORMED'
                    ? 'bg-workspace text-text-muted border-border'
                    : 'bg-status-criticalBg text-status-critical border-status-critical/30'
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
                <div className="p-3 bg-workspace border border-border rounded-lg">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">1. Purchase Order</p>
                  <p className="font-mono text-xs font-bold text-text-primary mt-1">
                    {matchResult.po_number || 'None'}
                  </p>
                  <p className="text-[11px] font-mono text-primary font-semibold mt-0.5">
                    {matchResult.po_details ? `₹${matchResult.po_details.total_amount.toLocaleString('en-IN')}` : '—'}
                  </p>
                </div>

                <div className="p-3 bg-workspace border border-border rounded-lg">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">2. Goods Received (GRN)</p>
                  <p className="font-mono text-xs font-bold text-text-primary mt-1">
                    {matchResult.grn_details?.length > 0 ? matchResult.grn_details[0].grn_number : 'Missing'}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {matchResult.grn_details?.length > 0 ? 'Delivered & Accepted' : 'No GRN Found'}
                  </p>
                </div>

                <div className="p-3 bg-workspace border border-border rounded-lg">
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">3. Vendor Invoice</p>
                  <p className="font-mono text-xs font-bold text-text-primary mt-1">
                    {selectedInvId}
                  </p>
                  <p className="text-[11px] font-mono text-text-primary font-semibold mt-0.5">
                    Verified
                  </p>
                </div>
              </div>

              {/* Discrepancies Table */}
              {matchResult.discrepancies?.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-border">
                  <h4 className="text-xs font-bold text-status-critical uppercase tracking-wider">
                    Identified Variances ({matchResult.discrepancies.length})
                  </h4>
                  {matchResult.discrepancies.map((d: any, idx: number) => (
                    <div key={idx} className="p-3 bg-status-criticalBg border border-status-critical/30 rounded text-xs space-y-1">
                      <div className="flex justify-between font-mono font-bold text-status-critical">
                        <span>{d.check}</span>
                        {d.difference && <span>DIFF: {d.difference}</span>}
                      </div>
                      <p className="text-text-primary">{d.explanation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[#C2DDD0] bg-[#EAF3EE] rounded-lg text-xs space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-1" />
                  <p className="font-semibold text-primary">Full Three-Way Match Confirmed</p>
                  <p className="text-text-secondary">
                    Quantity, contracted unit pricing, authorized total, and warehouse receipt status perfectly align.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
