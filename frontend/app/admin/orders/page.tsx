'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Eye,
  X,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: number;
  courseId: string;
  courseTitle: string;
  originalAmount: number;
  discountAmount: number;
  netPayableAmount: number;
  taxInclusiveAmount: number;
  taxAmount: number;
  couponCode: string | null;
  billingFullName: string;
  billingEmail: string;
  billingPhone: string;
  billingStateCode: string;
  orderStatus: string;
  merchantTxnId: string | null;
  gatewayName: string;
  gatewayPaymentId: string | null;
  settlementStatus: string;
  settledAt: string | null;
  completedAt: string | null;
  totalRefunded: number;
  createdAt: string;
}

interface OrderMetrics {
  totalOrders: number;
  settledCount: number;
  totalRevenue: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
  anomalyCount: number;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics>({
    totalOrders: 0,
    settledCount: 0,
    totalRevenue: 0,
    pendingCount: 0,
    failedCount: 0,
    refundedCount: 0,
    anomalyCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/admin/orders');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setOrders(j.data);
          if (j.metrics) setMetrics(j.metrics);
        }
      }
    } catch (err) {
      console.error('[AdminOrders] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.orderStatus !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesName = o.billingFullName.toLowerCase().includes(q);
        const matchesEmail = o.billingEmail.toLowerCase().includes(q);
        const matchesTxn = o.merchantTxnId ? o.merchantTxnId.toLowerCase().includes(q) : false;
        const matchesPay = o.gatewayPaymentId ? o.gatewayPaymentId.toLowerCase().includes(q) : false;
        if (!matchesNum && !matchesName && !matchesEmail && !matchesTxn && !matchesPay) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  const handleOpenRefund = (order: OrderRecord) => {
    setActiveOrder(order);
    const maxRefund = Math.max(0, order.netPayableAmount - (order.totalRefunded || 0));
    setRefundAmount(String(maxRefund));
    setRefundReason('');
    setRefundError(null);
    setRefundSuccess(null);
    setIsRefundModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    setRefundError(null);
    setRefundSuccess(null);
    setIsProcessingRefund(true);

    try {
      const amt = parseFloat(refundAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid refund amount greater than zero.');
      }

      const res = await apiClient('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.id,
          amount: amt,
          reason: refundReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Refund initiation failed.');
      }

      setRefundSuccess('Refund successfully initiated and recorded in ledger.');
      await fetchOrders();
      setTimeout(() => {
        setIsRefundModalOpen(false);
        setActiveOrder(null);
      }, 1500);
    } catch (err: any) {
      setRefundError(err.message || 'Failed to process refund.');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'SETTLED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARTIALLY_REFUNDED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'REFUNDED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PENDING':
      case 'PENDING_PAYMENT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
              Commerce & Settlement Operations
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">PostgreSQL Authoritative Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Student Orders & Transactions
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</div>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.totalOrders}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Settled & Paid</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{metrics.settledCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Total Collections</div>
          <div className="text-xl font-black text-indigo-600 mt-1">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Pending Attempts</div>
          <div className="text-xl font-black text-amber-500 mt-1">{metrics.pendingCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Refunds</div>
          <div className="text-xl font-black text-blue-600 mt-1">{metrics.refundedCount || 0}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order number, student name, email, txn ID..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'PAID', 'PENDING_PAYMENT', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <span className="text-xs text-slate-400 mt-3 font-medium">Querying commerce orders ledger...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No matching orders found in PostgreSQL database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Amount (INR)</th>
                  <th className="py-3 px-4">Gateway Txn ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-indigo-600">{o.orderNumber}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{o.billingFullName}</div>
                      <div className="text-[11px] text-slate-400">{o.billingEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="font-medium text-slate-800 line-clamp-1">
                        {o.courseTitle}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>₹{o.netPayableAmount.toLocaleString('en-IN')}</div>
                      {o.discountAmount > 0 && (
                        <div className="text-[10px] text-emerald-600 font-normal">
                          Saved ₹{o.discountAmount} ({o.couponCode || 'Coupon'})
                        </div>
                      )}
                      {o.totalRefunded > 0 && (
                        <div className="text-[10px] text-blue-600 font-normal">
                          Refunded: ₹{o.totalRefunded.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      <div>{o.merchantTxnId || 'N/A'}</div>
                      {o.gatewayPaymentId && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{o.gatewayPaymentId}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(
                          o.orderStatus
                        )}`}
                      >
                        {['PAID', 'SETTLED'].includes(o.orderStatus) ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : ['PARTIALLY_REFUNDED', 'REFUNDED'].includes(o.orderStatus) ? (
                          <RotateCcw className="w-3 h-3 text-purple-600" />
                        ) : o.orderStatus === 'PENDING_PAYMENT' ? (
                          <Clock className="w-3 h-3 text-amber-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        <span>{o.orderStatus}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setActiveOrder(o)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="View Order Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {['PAID', 'SETTLED', 'PARTIALLY_REFUNDED'].includes(o.orderStatus) && (
                          <button
                            onClick={() => handleOpenRefund(o)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Initiate Refund"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDER DOSSIER MODAL */}
      {activeOrder && !isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Order #{activeOrder.orderNumber}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  ID: {activeOrder.id}
                </p>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Course:</span>
                <span className="font-bold text-slate-900">{activeOrder.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{activeOrder.billingFullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800">{activeOrder.billingEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">State Code (GST):</span>
                <span className="font-bold text-slate-900">{activeOrder.billingStateCode}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Net Payable Amount:</span>
                <span className="font-black text-indigo-600 text-sm">
                  ₹{activeOrder.netPayableAmount.toLocaleString('en-IN')} (Tax-Inclusive)
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>18% GST Included:</span>
                <span>₹{activeOrder.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              {activeOrder.totalRefunded > 0 && (
                <div className="flex justify-between text-[11px] text-blue-600 font-semibold border-t border-slate-200 pt-1">
                  <span>Total Refunded:</span>
                  <span>₹{activeOrder.totalRefunded.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Gateway Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway:</span>
                <span className="text-slate-800 font-bold">{activeOrder.gatewayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant Txn ID:</span>
                <span className="text-slate-800">{activeOrder.merchantTxnId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PayU Payment ID:</span>
                <span className="text-slate-800">{activeOrder.gatewayPaymentId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settlement Status:</span>
                <span className="text-emerald-600 font-bold">{activeOrder.settlementStatus}</span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              {['PAID', 'SETTLED', 'PARTIALLY_REFUNDED'].includes(activeOrder.orderStatus) && (
                <button
                  onClick={() => handleOpenRefund(activeOrder)}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Initiate Refund</span>
                </button>
              )}
              <button
                onClick={() => setActiveOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND INITIATION MODAL */}
      {isRefundModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Initiate Refund</h3>
              </div>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Order:</span>
                  <span className="font-mono font-bold text-slate-800">{activeOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Original Paid:</span>
                  <span className="font-bold text-slate-900">₹{activeOrder.netPayableAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Already Refunded:</span>
                  <span className="font-bold text-blue-600">₹{activeOrder.totalRefunded.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Refund Amount (INR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-indigo-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Maximum refundable: ₹{(activeOrder.netPayableAmount - activeOrder.totalRefunded).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Reason for Refund <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Student requested cancellation within guarantee window."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              {refundError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{refundError}</span>
                </div>
              )}

              {refundSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{refundSuccess}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isProcessingRefund ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Refund</span>
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
