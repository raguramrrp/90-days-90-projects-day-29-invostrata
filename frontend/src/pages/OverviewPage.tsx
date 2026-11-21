import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  AlertCircle,
  Copy,
  XCircle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { OperationalSummary, Invoice, ExceptionItem } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  onSelectInvoice: (invoice: Invoice) => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewPage: React.FC<Props> = ({ onSelectInvoice, onNavigateTab }) => {
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentExceptions, setRecentExceptions] = useState<ExceptionItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumData, invData, excData, anData] = await Promise.all([
        api.getSummary(),
        api.getInvoices({ limit: 6 }),
        api.getExceptions({ limit: 5 }),
        api.getAnalytics(),
      ]);
      setSummary(sumData);
      setRecentInvoices(invData.slice(0, 6));
      setRecentExceptions(excData.items.slice(0, 5));
      setAnalytics(anData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chartColors: Record<string, string> = {
    PASSED: '#286B55',
    PASSED_WITH_WARNINGS: '#B7791F',
    NEEDS_REVIEW: '#527A9B',
    FAILED: '#C2413B',
    DUPLICATE_SUSPECTED: '#D97706',
    APPROVED: '#1c4d3d',
    REJECTED: '#991B1B',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Financial Validation Overview</h1>
        <p className="text-xs text-text-secondary mt-1">
          Monitor invoice processing, accounting discrepancies and pending financial reviews.
        </p>
      </div>

      {/* KPI Summary Row (5 compact metric blocks) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white border border-border rounded-lg p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-text-secondary text-xs font-medium">
            <span>Processed Invoices</span>
            <FileCheck2 className="w-4 h-4 text-text-muted" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-text-primary font-mono">
              {summary ? summary.total_invoices : '--'}
            </span>
            <span className="text-[11px] font-mono text-text-muted">100% Ingested</span>
          </div>
        </div>

        <div className="bg-white border border-[#C2DDD0] rounded-lg p-3.5 shadow-sm bg-gradient-to-b from-white to-[#EAF3EE]/30">
          <div className="flex items-center justify-between text-primary text-xs font-medium">
            <span>Passed Validation</span>
            <CheckCircle className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-primary font-mono">
              {summary ? summary.passed_validation : '--'}
            </span>
            <span className="text-[11px] font-mono text-primary font-semibold">
              {summary ? `${summary.pass_rate_percent}%` : '--'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#F3E2C4] rounded-lg p-3.5 shadow-sm bg-gradient-to-b from-white to-[#FEF7EC]/30">
          <div className="flex items-center justify-between text-[#B7791F] text-xs font-medium">
            <span>Needs Review</span>
            <AlertCircle className="w-4 h-4 text-[#B7791F]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#B7791F] font-mono">
              {summary ? summary.needs_review : '--'}
            </span>
            <span className="text-[11px] font-mono text-[#B7791F]">Warnings</span>
          </div>
        </div>

        <div className="bg-white border border-[#F7C6C4] rounded-lg p-3.5 shadow-sm bg-gradient-to-b from-white to-[#FDF2F2]/30">
          <div className="flex items-center justify-between text-[#C2413B] text-xs font-medium">
            <span>Duplicate Suspected</span>
            <Copy className="w-4 h-4 text-[#C2413B]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#C2413B] font-mono">
              {summary ? summary.duplicate_suspected : '--'}
            </span>
            <span className="text-[11px] font-mono text-[#C2413B]">Flags</span>
          </div>
        </div>

        <div className="bg-white border border-[#F7C6C4] rounded-lg p-3.5 shadow-sm bg-gradient-to-b from-white to-[#FDF2F2]/30">
          <div className="flex items-center justify-between text-[#C2413B] text-xs font-medium">
            <span>Failed Validation</span>
            <XCircle className="w-4 h-4 text-[#C2413B]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#C2413B] font-mono">
              {summary ? summary.failed_validation : '--'}
            </span>
            <span className="text-[11px] font-mono text-[#C2413B]">Critical</span>
          </div>
        </div>
      </div>

      {/* Two Column Operational Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Queue Snippet & Latest Exceptions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recent Invoice Queue Snippet */}
          <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-xs text-text-primary">Recent Invoice Queue</span>
                <span className="text-[11px] font-mono text-text-muted">({summary?.total_invoices || 0} total)</span>
              </div>
              <button
                onClick={() => onNavigateTab('queue')}
                className="text-xs font-medium text-primary hover:underline flex items-center space-x-1"
              >
                <span>View Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFCFA] border-b border-border text-text-secondary font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Invoice ID</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv)}
                      className="hover:bg-workspace/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-medium text-primary">{inv.id}</td>
                      <td className="py-2.5 px-3 text-text-primary max-w-[140px] truncate">{inv.vendor_name}</td>
                      <td className="py-2.5 px-3 text-text-secondary font-mono">{inv.invoice_date}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-text-primary">
                        ₹{inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={inv.validation_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Latest Validation Exceptions */}
          <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-status-critical" />
                <span className="font-semibold text-xs text-text-primary">Active Financial Discrepancies</span>
              </div>
              <button
                onClick={() => onNavigateTab('exceptions')}
                className="text-xs font-medium text-primary hover:underline flex items-center space-x-1"
              >
                <span>Exceptions Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-border">
              {recentExceptions.map((ex) => (
                <div key={ex.id} className="p-3.5 hover:bg-workspace/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-workspace border border-border text-text-primary">
                        {ex.rule_code}
                      </span>
                      <span className="font-medium text-text-primary truncate max-w-[240px]">{ex.vendor_name}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      ex.severity === 'CRITICAL' ? 'bg-status-criticalBg text-status-critical' : 'bg-status-warningBg text-status-warning'
                    }`}>
                      {ex.severity}
                    </span>
                  </div>
                  <p className="text-text-secondary leading-normal">{ex.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Distribution Chart & Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Validation Status Distribution Chart */}
          <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-text-primary">Validation Status Distribution</span>
              <span className="text-[11px] font-mono text-text-secondary">All Records</span>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              {analytics?.status_distribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.status_distribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {analytics.status_distribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={chartColors[entry.status] || '#CBD5CD'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E0E6E1',
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-text-muted font-mono">Loading chart data...</div>
              )}
            </div>

            {/* Legend pills */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-[11px]">
              {analytics?.status_distribution?.map((item: any, i: number) => (
                <div key={i} className="flex items-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: chartColors[item.status] || '#CBD5CD' }}
                  />
                  <span className="text-text-secondary truncate">{item.name}:</span>
                  <span className="font-mono font-semibold text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* High Priority Review Items */}
          <div className="bg-white border border-border rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-text-primary">High-Priority Audit Checks</span>
              <span className="text-[10px] text-text-muted font-mono">Statutory / GST</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded border border-border bg-[#FAFCFA] flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">Indian GST 15-Digit Format</p>
                  <p className="text-[11px] text-text-secondary">Statutory state code & checksum</p>
                </div>
                <span className="font-mono text-xs text-primary font-semibold">Active</span>
              </div>

              <div className="p-2.5 rounded border border-border bg-[#FAFCFA] flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">Line-Item Arithmetic Sums</p>
                  <p className="text-[11px] text-text-secondary">Qty × Rate - Disc = Taxable</p>
                </div>
                <span className="font-mono text-xs text-primary font-semibold">Active</span>
              </div>

              <div className="p-2.5 rounded border border-border bg-[#FAFCFA] flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">Inter-state vs Intra-state Split</p>
                  <p className="text-[11px] text-text-secondary">CGST+SGST vs IGST enforcement</p>
                </div>
                <span className="font-mono text-xs text-primary font-semibold">Active</span>
              </div>

              <div className="p-2.5 rounded border border-border bg-[#FAFCFA] flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">Three-Way PO Reconciliation</p>
                  <p className="text-[11px] text-text-secondary">PO qty vs GRN delivered items</p>
                </div>
                <span className="font-mono text-xs text-primary font-semibold">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
