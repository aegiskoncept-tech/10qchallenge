'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Layers,
  FileText,
  Eye,
  X,
  Code,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

interface AuditLogItem {
  id: number;
  userId: number;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  module: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  timestamp: string;
}

const MODULES = [
  'TEST_SERIES',
  'STUDENTS',
  'COURSES',
  'CHAPTERS',
  'SUBJECTS',
  'QUESTIONS',
  'VIDEOS',
  'DOCUMENTS',
  'BLOGS',
  'SEO',
  'AUTH',
  'ORDERS',
  'INVOICES',
];

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [metrics, setMetrics] = useState({ totalLogs: 0, adminCount: 0, returnedCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let url = '/api/admin/audit-logs?limit=150';
      if (selectedModule !== 'ALL') url += `&module=${selectedModule}`;
      if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;

      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setLogs(j.data);
          if (j.metrics) setMetrics(j.metrics);
        }
      }
    } catch (err) {
      console.error('[AdminAuditLogs] Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
              Security & Compliance
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">{metrics.totalLogs} Total Recorded Actions</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-indigo-600" />
            <span>Admin Activity Audit Trail</span>
          </h1>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Stream</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Total Audit Events</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalLogs}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Tracked Administrators</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.adminCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Audit Stream State</p>
          <p className="text-xs font-bold text-indigo-600 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active SQLite Authoritative Ledger
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3"
      >
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, administrator name, email, or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All System Modules</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-semibold text-slate-500 mt-2">Streaming audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-slate-700">No Audit Events Found</h3>
            <p className="text-xs text-slate-400 mt-1">Adjust your search query or module filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{l.adminName || `Admin #${l.userId}`}</div>
                      <div className="text-[10px] text-slate-400">{l.adminEmail || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px]">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-600 text-[11px]">{l.module}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {l.entityId || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {l.details ? (
                        <button
                          onClick={() => setSelectedLog(l)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Code className="w-3 h-3 text-slate-500" />
                          <span>View JSON</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Audit Event #{selectedLog.id}
                </h3>
                <p className="text-[11px] font-mono text-indigo-600 mt-0.5">
                  {selectedLog.action} on {selectedLog.module}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-500">
                Timestamp:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {new Date(selectedLog.timestamp).toISOString()}
                </span>
              </p>
              <p className="text-slate-500">
                Actor:{' '}
                <span className="font-bold text-slate-900">
                  {selectedLog.adminName} ({selectedLog.adminEmail})
                </span>
              </p>
              {selectedLog.ipAddress && (
                <p className="text-slate-500">
                  IP Address: <span className="font-mono text-slate-800">{selectedLog.ipAddress}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Event Payload / Details:
              </label>
              <pre className="p-4 rounded-xl bg-slate-900 text-amber-300 font-mono text-xs overflow-x-auto leading-relaxed">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2);
                  } catch {
                    return selectedLog.details;
                  }
                })()}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
