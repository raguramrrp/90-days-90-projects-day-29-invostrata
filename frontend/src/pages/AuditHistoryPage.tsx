import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Search, Filter, RotateCw } from 'lucide-react';
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
      <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Audit Trail & Compliance History
            </h1>
          </div>

          <button
            onClick={loadAuditLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-surface border border-border hover:bg-surfaceMuted text-text-primary rounded text-xs font-medium transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5 text-navy" />
            <span>Refresh Trail</span>
          </button>
        </div>
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
            className="w-full text-xs pl-9 pr-3 py-1.5 bg-surfaceMuted/50 border border-border rounded focus:ring-1 focus:ring-navy outline-none"
          />
        </div>

        <div className="text-xs text-text-secondary font-mono">
          Total Recorded Actions: <span className="font-semibold text-text-primary">{logs.length}</span>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surfaceMuted text-text-secondary font-mono text-[10px] border-b border-border">
              <tr>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Action</th>
                <th className="p-3">User</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Entity ID</th>
                <th className="p-3">Metadata / Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    Loading audit records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surfaceMuted/30">
                    <td className="p-3 text-text-secondary">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-3">
                      <span className="font-bold px-2 py-0.5 rounded bg-surfaceMuted border border-border text-navy">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-text-primary font-semibold font-sans">{log.user}</td>
                    <td className="p-3 text-text-secondary">{log.entity_type}</td>
                    <td className="p-3 font-semibold text-text-primary">{log.entity_id || '—'}</td>
                    <td className="p-3 text-text-secondary max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
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
