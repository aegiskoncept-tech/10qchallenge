'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  ExternalLink,
  Plus,
  AlertTriangle,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface RefundItem {
  id: string;
  orderId: string;
  orderNumber?: string;
  userId?: number;
  courseId?: string;
  billingFullName?: string;
  billingEmail?: string;
  orderNetPayable?: number;
  amount: number;
  reason: string;
  status: string;
  gatewayRefundId: string | null;
  adminUserId?: number | null;
  createdAt: string;
  updatedAt?: string;
  isSimulated?: boolean;
  isGatewayConfirmed?: boolean;
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Initiate Refund Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'ALL') q.set('status', statusFilter);
      if (searchTerm.trim()) q.set('search', searchTerm.trim());

      const res = await apiClient(`/api/admin/refunds?${q.toString()}`);
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setRefunds(j.data);
        }
      }
    } catch (err) {
      console.error('[AdminRefunds] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [statusFilter]);

  const metrics = useMemo(() => {
    const totalCount = refunds.length;
    const totalRefunded = refunds
      .filter((r) => r.status === 'CONFIRMED')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const simulatedRefunded = refunds
      .filter((r) => r.status === 'CONFIRMED' && r.isSimulated)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const pendingCount = refunds.filter((r) => r.status === 'REQUESTED' || r.status === 'PROCESSING').length;
    return { totalCount, totalRefunded, simulatedRefunded, pendingCount };
  }, [refunds]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRefunds();
  };

  const handleInitiateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderIdInput.trim(),
          amount: amountInput ? parseFloat(amountInput) : undefined,
          reason: reasonInput.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Refund successfully initiated.');
        setOrderIdInput('');
        setAmountInput('');
        setReasonInput('');
        fetchRefunds();
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setErrorMsg(data.error || 'Failed to process refund.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error processing refund request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Refunds Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              Audit Guarded
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Process full or partial refunds, enforce refundable balance limits, and track PayU reversal logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRefunds()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              setIsModalOpen(true);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-sm"
          >
            <Plus size={14} />
            Initiate Refund
          </button>
        </div>
      </div>

      {/* Sandbox Transparency Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-3">
        <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold">Sandbox Environment Transparency Notice:</span> In local development and test environments, refund operations generate simulated gateway identifiers (<code>PAYU_REF_...</code>) and restore customer balances/access without executing real banking fund transfers. In live production with authenticated credentials, requests invoke PayU's authoritative reversal API.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Refund Events</span>
            <RotateCcw size={18} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{metrics.totalCount}</p>
          <span className="text-[10px] text-slate-500 font-medium">Logged refund records</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Confirmed</span>
            <span className="text-xs font-bold text-rose-600">INR</span>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            ₹{metrics.totalRefunded.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-purple-600 font-medium">
            {metrics.simulatedRefunded > 0 ? `(₹${metrics.simulatedRefunded.toLocaleString('en-IN')} simulated sandbox)` : 'Authoritative returns'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending / Processing</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{metrics.pendingCount}</p>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting settlement</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Refund ID, Order #, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="REQUESTED">Requested</option>
            <option value="FAILED">Failed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <LoadingSpinner size="md" />
            <p className="text-xs font-semibold text-slate-400">Loading refunds queue...</p>
          </div>
        ) : refunds.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <RotateCcw size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
            <p className="text-xs font-semibold">No refund records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Refund Ref / Gateway ID</th>
                  <th className="py-3 px-4">Order / Customer</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Refund Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="font-bold text-slate-900">{r.id.substring(0, 13)}...</div>
                      <div className="text-[10px] text-slate-400">PayU Ref: {r.gatewayRefundId || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/orders`}
                        className="font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 font-mono text-[11px]"
                      >
                        {r.orderNumber || r.orderId?.substring(0, 13) || 'Order'}
                        <ExternalLink size={10} />
                      </Link>
                      <div className="text-[10px] text-slate-500 font-sans">
                        {r.billingFullName ? `${r.billingFullName} (${r.billingEmail || ''})` : (r.userId ? `User #${r.userId}` : 'Customer')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                      {r.reason}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                      ₹{r.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.status === 'CONFIRMED' ? (
                        r.isSimulated ? (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              <CheckCircle2 size={10} /> Simulated (Sandbox)
                            </span>
                            <span className="text-[9px] text-purple-600 font-medium">Internal reversal</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={10} /> Gateway Confirmed
                          </span>
                        )
                      ) : r.status === 'PROCESSING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                          <Clock size={10} /> Processing
                        </span>
                      ) : r.status === 'REQUESTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={10} /> Requested
                        </span>
                      ) : r.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle size={10} /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Initiate Refund Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <RotateCcw size={18} />
                <h3 className="font-bold text-slate-900 text-base">Initiate Controlled Refund</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleInitiateRefund} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Target Order ID or Order Number:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ord_... or 10Q-202611-..."
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Refund Amount (₹) (Optional - leave blank for full remaining amount):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Leave empty for full refund"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mandatory Reason for Audit Trail:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State clear reason for this refund request..."
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm & Process'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}