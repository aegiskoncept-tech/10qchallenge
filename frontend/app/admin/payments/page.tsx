'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  X,
  ExternalLink,
  ShieldCheck,
  Building,
  Check,
  AlertCircle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

interface PaymentItem {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: number;
  courseId: string;
  billingFullName: string;
  billingEmail: string;
  merchantTxnId: string | null;
  gatewayName: string;
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  settlementStatus: string;
  settledAt: string;
  orderStatus: string;
  attemptStatus: string | null;
  metadata: any;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [reconcileMsg, setReconcileMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'ALL') q.set('status', statusFilter);
      if (searchTerm.trim()) q.set('search', searchTerm.trim());

      const res = await fetch(`/api/admin/payments?${q.toString()}`);
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setPayments(j.data);
        }
      }
    } catch (err) {
      console.error('[AdminPayments] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const metrics = useMemo(() => {
    const totalCount = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const reconciledCount = payments.filter((p) => p.settlementStatus === 'RECONCILED').length;
    const settledCount = payments.filter((p) => p.settlementStatus === 'SETTLED').length;
    return { totalCount, totalAmount, reconciledCount, settledCount };
  }, [payments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleReconcile = async (paymentId: string) => {
    setReconcilingId(paymentId);
    setReconcileMsg(null);
    try {
      const res = await fetch('/api/admin/settlements/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (data.success) {
        setReconcileMsg({ text: 'Payment reconciled successfully.', isError: false });
        fetchPayments();
      } else {
        setReconcileMsg({ text: data.error || 'Reconciliation failed.', isError: true });
      }
    } catch (err: any) {
      setReconcileMsg({ text: err?.message || 'Error occurred during reconciliation.', isError: true });
    } finally {
      setReconcilingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments Ledger</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              PayU Gateway
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gateway payment captures, merchant transactions, PayU IDs, and authoritative settlement status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPayments()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            href="/admin/settlements"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition shadow-sm"
          >
            <Building size={14} />
            Settlement Summary
          </Link>
        </div>
      </div>

      {reconcileMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            reconcileMsg.isError
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <span>{reconcileMsg.text}</span>
          <button onClick={() => setReconcileMsg(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Payments</span>
            <CreditCard size={18} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{metrics.totalCount}</p>
          <span className="text-[10px] text-slate-500 font-medium">Gateway records</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gross Captured</span>
            <span className="text-xs font-bold text-emerald-700">INR</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            ₹{metrics.totalAmount.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">Authorized payments</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Settled</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{metrics.settledCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Awaiting or cleared</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reconciled</span>
            <ShieldCheck size={18} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">{metrics.reconciledCount}</p>
          <span className="text-[10px] text-indigo-500 font-medium">Bank matched</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PayU ID, Order #, Email, Name..."
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
            <option value="SETTLED">Settled</option>
            <option value="RECONCILED">Reconciled</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <LoadingSpinner size="md" />
            <p className="text-xs font-semibold text-slate-400">Loading payments ledger...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CreditCard size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
            <p className="text-xs font-semibold">No payments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Gateway Txn / PayU ID</th>
                  <th className="py-3 px-4">Order / Course</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Settlement Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="font-bold text-slate-900">{p.gatewayPaymentId || '—'}</div>
                      <div className="text-[10px] text-slate-400">Merchant: {p.merchantTxnId || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/orders`}
                        className="font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 font-mono text-[11px]"
                      >
                        {p.orderNumber}
                        <ExternalLink size={10} />
                      </Link>
                      <div className="text-[10px] text-slate-400 font-sans">{p.courseId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{p.billingFullName}</div>
                      <div className="text-[10px] text-slate-400">{p.billingEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.settlementStatus === 'RECONCILED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <ShieldCheck size={10} /> Reconciled
                        </span>
                      ) : p.settlementStatus === 'SETTLED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={10} /> Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={10} /> {p.settlementStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {p.settledAt ? new Date(p.settledAt).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        title="View Metadata"
                      >
                        <Eye size={14} />
                      </button>
                      {p.settlementStatus !== 'RECONCILED' && (
                        <button
                          onClick={() => handleReconcile(p.id)}
                          disabled={reconcilingId === p.id}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition disabled:opacity-50"
                        >
                          {reconcilingId === p.id ? 'Reconciling...' : 'Reconcile'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Metadata Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Payment Details & Metadata</h3>
                <p className="text-[11px] text-slate-500 font-mono">{selectedPayment.gatewayPaymentId}</p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Order ID:</span>
                  <div className="font-mono font-semibold text-slate-900">{selectedPayment.orderNumber}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Amount:</span>
                  <div className="font-bold text-emerald-600">₹{selectedPayment.amount.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Gateway:</span>
                  <div className="font-semibold text-slate-900">{selectedPayment.gatewayName}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                  <div className="font-semibold text-slate-900">{selectedPayment.settlementStatus}</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1">Raw Gateway Payload:</span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-auto max-h-56 leading-relaxed">
                  {JSON.stringify(selectedPayment.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
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