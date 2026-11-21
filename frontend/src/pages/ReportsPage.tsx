import React, { useState, useEffect } from 'react';
import {
  Download,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle2,
  TrendingUp,
  Percent
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { OperationalSummary } from '../types';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const [sumData, anData] = await Promise.all([
        api.getSummary(),
        api.getAnalytics(),
      ]);
      setSummary(sumData);
      setAnalytics(anData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    window.open(`/api/reports/export?format=${format}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header with Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Reports & Financial Analytics</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Executive audit ledgers, compliance distributions, monthly volume trends, and statutory tax reconciliations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-border hover:bg-workspace text-text-primary rounded text-xs font-medium transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Audit PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary">Total Invoiced Value</p>
          <p className="text-xl font-bold font-mono text-text-primary mt-1">
            ₹{summary ? summary.total_invoice_value.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
          </p>
          <p className="text-[11px] text-text-muted mt-1 font-mono">{summary?.total_invoices || 0} Invoices Ingested</p>
        </div>

        <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary">Statutory Tax Assessed</p>
          <p className="text-xl font-bold font-mono text-primary mt-1">
            ₹{summary ? summary.total_tax_value.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
          </p>
          <p className="text-[11px] text-text-muted mt-1 font-mono">GST (CGST/SGST/IGST)</p>
        </div>

        <div className="bg-white border border-[#C2DDD0] rounded-lg p-4 shadow-sm bg-gradient-to-b from-white to-[#EAF3EE]/40">
          <p className="text-xs font-medium text-primary">Validation Success Rate</p>
          <p className="text-xl font-bold font-mono text-primary mt-1">
            {summary ? `${summary.pass_rate_percent}%` : '--'}
          </p>
          <p className="text-[11px] text-primary font-mono mt-1">Passed without Critical Errors</p>
        </div>

        <div className="bg-white border border-[#F7C6C4] rounded-lg p-4 shadow-sm bg-gradient-to-b from-white to-[#FDF2F2]/40">
          <p className="text-xs font-medium text-status-critical">Active Exceptions</p>
          <p className="text-xl font-bold font-mono text-status-critical mt-1">
            {summary ? summary.failed_validation + summary.duplicate_suspected : '--'}
          </p>
          <p className="text-[11px] text-status-critical font-mono mt-1">Requires Controller Review</p>
        </div>
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Invoiced Volume Bar Chart */}
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Monthly Invoiced Volume & Velocity
            </h3>
            <span className="text-[10px] text-text-muted font-mono">Amount (INR)</span>
          </div>

          <div className="h-64 w-full">
            {analytics?.monthly_volume ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthly_volume} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E6E1" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#74817B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#74817B' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E6E1', borderRadius: '6px', fontSize: '11px' }}
                  />
                  <Bar dataKey="amount" fill="#286B55" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted font-mono">
                Loading volume distribution...
              </div>
            )}
          </div>
        </div>

        {/* Top Validation Discrepancy Failure Rules */}
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Common Discrepancy Frequencies
            </h3>
            <span className="text-[10px] text-text-muted font-mono">Violation Count</span>
          </div>

          <div className="h-64 w-full">
            {analytics?.top_failure_rules ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.top_failure_rules} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E6E1" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#74817B' }} />
                  <YAxis dataKey="rule" type="category" tick={{ fontSize: 9, fill: '#24312D' }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E6E1', borderRadius: '6px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#C2413B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted font-mono">
                Loading failure distributions...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Discrepancy Concentration Table */}
      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-surface font-semibold text-xs text-text-primary flex justify-between items-center">
          <span>Vendor Discrepancy Concentration</span>
          <span className="text-[11px] font-mono text-text-muted">Top Risk Suppliers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFCFA] border-b border-border text-text-secondary font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Vendor Name</th>
                <th className="py-2.5 px-4 text-center">Total Invoices</th>
                <th className="py-2.5 px-4 text-center">Active Discrepancies</th>
                <th className="py-2.5 px-4">Risk Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {analytics?.vendor_discrepancies?.map((item: any, i: number) => {
                const ratio = item.discrepancies / (item.total_invoices || 1);
                const isHigh = ratio > 0.4;
                return (
                  <tr key={i} className="hover:bg-workspace/50">
                    <td className="py-2.5 px-4 font-sans font-medium text-text-primary">{item.vendor_name}</td>
                    <td className="py-2.5 px-4 text-center text-text-primary">{item.total_invoices}</td>
                    <td className="py-2.5 px-4 text-center font-bold text-status-critical">{item.discrepancies}</td>
                    <td className="py-2.5 px-4 font-sans">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isHigh ? 'bg-status-criticalBg text-status-critical' : 'bg-[#EAF3EE] text-[#286B55]'
                      }`}>
                        {isHigh ? 'High Variance' : 'Standard Compliance'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
