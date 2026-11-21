import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Search, Filter } from 'lucide-react';
import { api } from '../services/api';
import { AuditLogItem } from '../types';

export const AuditHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.user.toLowerCase().includes(term) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Audit Trail & Compliance History</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Immutable operational log tracking every ingestion, field correction, revalidation pass, and controller sign-off.
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-border rounded-lg p-3 flex items-center justify-between shadow-sm">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail by user, action, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-workspace border border-border rounded focus:border-primary outline-none"
          />
        </div>

        <div className="text-xs text-text-secondary font-mono">
          <span>{filteredLogs.length} Logged Entries</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFCFA] border-b border-border text-text-secondary font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Record ID</th>
                <th className="py-2.5 px-3">Operation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted font-mono">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-workspace/50 font-mono text-[11px]">
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">{l.timestamp}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-text-primary whitespace-nowrap">{l.user}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-primary px-1.5 py-0.5 rounded bg-[#EAF3EE] border border-[#C2DDD0]">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary">{l.entity_type}</td>
                    <td className="py-2.5 px-3 font-bold text-text-primary">{l.entity_id || '—'}</td>
                    <td className="py-2.5 px-3 font-sans text-text-secondary max-w-[280px] truncate">
                      {l.details ? JSON.stringify(l.details) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
