import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Calculator,
  Percent,
  Calendar,
  Building,
  Copy,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ShieldCheck,
  RotateCw,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice } from '../types';

interface Props {
  onSelectInvoice: (invoice: Invoice) => void;
}

export const ValidationCentrePage: React.FC<Props> = ({ onSelectInvoice }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [groupedChecks, setGroupedChecks] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.getInvoices({ limit: 50 });
      setInvoices(data);
      if (data.length > 0) {
        loadValidationDetails(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadValidationDetails = async (inv: Invoice) => {
    setSelectedInv(inv);
    try {
      setIsValidating(true);
      await api.revalidateInvoice(inv.id);
      const full = await api.getInvoice(inv.id);
      groupChecks(full);
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  const groupChecks = (inv: Invoice) => {
    const results = inv.validation_results || [];
    const grouped = {
      arithmetic: results.filter((r) => r.category === 'ARITHMETIC'),
      tax: results.filter((r) => r.category === 'TAX_GST'),
      date: results.filter((r) => r.category === 'DATE'),
      vendor: results.filter((r) => r.category === 'VENDOR'),
      duplicate: inv.duplicates || [],
      anomaly: inv.anomalies || [],
    };
    setGroupedChecks(grouped);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Validation Centre & Rule Execution
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Invoice Selector (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-border rounded-lg shadow-sm flex flex-col h-[700px] overflow-hidden">
          <div className="p-3 border-b border-border bg-surfaceMuted/50 font-semibold text-xs text-text-primary flex justify-between items-center">
            <span>Select Invoice to Audit</span>
            <span className="text-[10px] font-mono text-text-muted">{invoices.length} Available</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {invoices.map((inv) => {
              const isSelected = selectedInv?.id === inv.id;
              return (
                <div
                  key={inv.id}
                  onClick={() => loadValidationDetails(inv)}
                  className={`p-3 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-navy-light/60 border-l-4 border-l-navy'
                      : 'hover:bg-[#F5F2EC]/60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-bold text-navy">{inv.id}</span>
                    <span className="font-mono text-text-primary font-bold">
                      ₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-text-primary font-medium truncate">{inv.vendor_name || 'N/A'}</p>
                  <div className="flex justify-between text-[11px] text-text-secondary mt-1">
                    <span className="font-mono">{inv.invoice_number || '—'}</span>
                    <span className="font-mono text-[10px] uppercase font-bold text-text-muted">
                      {inv.validation_status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Grouped Validation Suites (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedInv && (
            <div className="p-4 bg-white border border-border rounded-lg shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Audit Findings for {selectedInv.invoice_number || selectedInv.id}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Vendor: <span className="font-medium text-text-primary">{selectedInv.vendor_name}</span> | GSTIN: <span className="font-mono">{selectedInv.vendor_gstin || 'None'}</span>
                </p>
              </div>
              <button
                onClick={() => onSelectInvoice(selectedInv)}
                className="px-3 py-1.5 bg-navy hover:bg-navy-dark text-white rounded text-xs font-medium transition-colors shadow-sm"
              >
                Open Full Inspector
              </button>
            </div>
          )}

          {/* Group 1: Arithmetic Checks */}
          <div className="bg-white border border-border rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 border-b border-border pb-2">
              <Calculator className="w-4 h-4 text-navy" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                1. Arithmetic & Calculation Reconciliation (Python Decimal)
              </h4>
            </div>

            {groupedChecks?.arithmetic?.length === 0 ? (
              <div className="flex items-center space-x-2 text-xs text-[#39765B] bg-[#EBF3EF] p-2.5 rounded border border-[#B8D5C7]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Line item amounts, taxable sum, subtotal, and grand total balance with zero mathematical variance.</span>
              </div>
            ) : (
              groupedChecks?.arithmetic?.map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-status-criticalBg border border-[#ECC7C4] rounded text-xs space-y-1">
                  <div className="flex justify-between font-mono font-bold text-status-critical">
                    <span>{item.rule_code}</span>
                    <span>DIFFERENCE: {item.difference}</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">{item.explanation}</p>
                  <p className="text-[11px] text-text-secondary italic">Correction: {item.suggested_correction}</p>
                </div>
              ))
            )}
          </div>

          {/* Group 2: Indian GST Tax Checks */}
          <div className="bg-white border border-border rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 border-b border-border pb-2">
              <Percent className="w-4 h-4 text-navy" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                2. Indian GST Compliance & Place of Supply
              </h4>
            </div>

            {groupedChecks?.tax?.length === 0 ? (
              <div className="flex items-center space-x-2 text-xs text-[#39765B] bg-[#EBF3EF] p-2.5 rounded border border-[#B8D5C7]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>GSTIN format, 2-digit state prefix, intra-state CGST/SGST balance, and inter-state IGST verified.</span>
              </div>
            ) : (
              groupedChecks?.tax?.map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-status-criticalBg border border-[#ECC7C4] rounded text-xs space-y-1">
                  <div className="flex justify-between font-mono font-bold text-status-critical">
                    <span>{item.rule_code}</span>
                    <span>{item.severity}</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">{item.explanation}</p>
                  <p className="text-[11px] text-text-secondary italic">Action: {item.suggested_correction}</p>
                </div>
              ))
            )}
          </div>

          {/* Group 3: Statutory Date Validation */}
          <div className="bg-white border border-border rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 border-b border-border pb-2">
              <Calendar className="w-4 h-4 text-navy" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                3. Statutory Date & Sequence Checks
              </h4>
            </div>

            {groupedChecks?.date?.length === 0 ? (
              <div className="flex items-center space-x-2 text-xs text-[#39765B] bg-[#EBF3EF] p-2.5 rounded border border-[#B8D5C7]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Invoice date is valid, not future-dated, within Section 16(4) ITC limits, and precedes payment due date.</span>
              </div>
            ) : (
              groupedChecks?.date?.map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-status-warningBg border border-[#ECDBC2] rounded text-xs space-y-1">
                  <div className="flex justify-between font-mono font-bold text-status-warning">
                    <span>{item.rule_code}</span>
                    <span>{item.difference}</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">{item.explanation}</p>
                  <p className="text-[11px] text-text-secondary italic">{item.suggested_correction}</p>
                </div>
              ))
            )}
          </div>

          {/* Group 4: Duplicate & Anomaly Checks */}
          <div className="bg-white border border-border rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 border-b border-border pb-2">
              <Zap className="w-4 h-4 text-copper" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                4. Duplicate Submissions & Anomaly Signals
              </h4>
            </div>

            {groupedChecks?.duplicate?.length === 0 && groupedChecks?.anomaly?.length === 0 ? (
              <div className="flex items-center space-x-2 text-xs text-[#39765B] bg-[#EBF3EF] p-2.5 rounded border border-[#B8D5C7]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>No exact SHA-256 binary hash duplicates, no fuzzy statutory duplicates, and no statistical outlier warnings.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {groupedChecks?.duplicate?.map((d: any, idx: number) => (
                  <div key={idx} className="p-3 bg-status-criticalBg border border-[#ECC7C4] rounded text-xs space-y-1">
                    <div className="flex justify-between font-mono font-bold text-status-critical">
                      <span>{d.match_type}</span>
                      <span>Confidence: {d.confidence_score * 100}%</span>
                    </div>
                    <p className="text-text-primary">Matched with Invoice #{d.matched_invoice_id}</p>
                  </div>
                ))}
                {groupedChecks?.anomaly?.map((a: any, idx: number) => (
                  <div key={idx} className="p-3 bg-status-warningBg border border-[#ECDBC2] rounded text-xs space-y-1">
                    <div className="flex justify-between font-mono font-bold text-status-warning">
                      <span>{a.anomaly_type}</span>
                      <span>Anomaly Score: {a.score}</span>
                    </div>
                    <p className="text-text-primary">{a.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
