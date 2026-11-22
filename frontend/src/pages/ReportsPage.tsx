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
  ResponsiveContainer
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
    <div className="space-y-4">
      {/* Header with Export Actions */}
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Audit Reports & Operational Analytics
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface border border-border hover:bg-surfaceMuted text-text-primary rounded text-xs font-medium transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-navy" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-copper hover:bg-copper-hover text-white rounded text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Executive PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="p-4">
            <span className="text-[10px] uppercase font-mono text-text-secondary block">Total Invoiced Value</span>
            <span className="text-xl font-bold font-mono text-text-primary block mt-1">
              ₹{summary ? summary.total_invoice_value.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
            </span>
            <span className="text-[11px] text-text-muted mt-1 block font-mono">
              {summary?.total_invoices || 0} Invoices Ingested
            </span>
          </div>

          <div className="p-4">
            <span className="text-[10px] uppercase font-mono text-text-secondary block">Statutory Tax Assessed</span>
            <span className="text-xl font-bold font-mono text-navy block mt-1">
              ₹{summary ? summary.total_tax_value.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
            </span>
            <span className="text-[11px] text-text-muted mt-1 block font-mono">
              GST (CGST / SGST / IGST)
            </span>
          </div>

          <div className="p-4 bg-status-successBg/20">
            <span className="text-[10px] uppercase font-mono text-status-success block">Validation Success Rate</span>
            <span className="text-xl font-bold font-mono text-status-success block mt-1">
              {summary ? `${summary.pass_rate_percent}%` : '--'}
            </span>
            <span className="text-[11px] text-status-success mt-1 block font-mono">
              Passed without Critical Errors
            </span>
          </div>

          <div className="p-4 bg-status-criticalBg/20">
            <span className="text-[10px] uppercase font-mono text-status-critical block">Active Exceptions</span>
            <span className="text-xl font-bold font-mono text-status-critical block mt-1">
              {summary ? summary.failed_validation + summary.duplicate_suspected : '--'}
            </span>
            <span className="text-[11px] text-status-critical mt-1 block font-mono">
              Requires Auditor Action
            </span>
          </div>
        </div>
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#737D88' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737D88' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E0D7', borderRadius: '6px', fontSize: '11px', color: '#202C3A' }}
                  />
                  <Bar dataKey="amount" fill="#34536B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted font-mono">
                Loading volume distribution...
              </div>
            )}
          </div>
        </div>

        {/* Vendor-Wise Discrepancy Distribution */}
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Vendor Risk & Discrepancy Distribution
            </h3>
            <span className="text-[10px] text-text-muted font-mono">Audit Flags</span>
          </div>

          <div className="h-64 w-full">
            {analytics?.vendor_discrepancies ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.vendor_discrepancies} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E0D7" />
                  <XAxis dataKey="vendor_name" tick={{ fontSize: 10, fill: '#737D88' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#737D88' }} />
                  <Tooltip
                    formatter={(val: any) => [val, 'Discrepancies']}
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E0D7', borderRadius: '6px', fontSize: '11px', color: '#202C3A' }}
                  />
                  <Bar dataKey="discrepancies" fill="#B8754B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted font-mono">
                Loading vendor distribution...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
