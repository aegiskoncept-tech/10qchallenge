'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Printer,
  RefreshCw,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  User,
  GraduationCap,
  Eye,
  X,
  ExternalLink,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: number;
  courseId: string;
  courseTitle: string;
  originalAmount: number;
  discountAmount: number;
  netPayableAmount: number;
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
  createdAt: string;
}

interface OrderMetrics {
  totalOrders: number;
  settledCount: number;
  totalRevenue: number;
  pendingCount: number;
  failedCount: number;
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
    anomalyCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            <span>Orders & Payment Operations</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/invoices"
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Tax Invoices</span>
          </Link>
          <button
            onClick={fetchOrders}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Total Settled Revenue</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{metrics.totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Settled Orders</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.settledCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Pending / In-Flight</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{metrics.pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Failed / Anomalies</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600">{metrics.failedCount}</span>
            {metrics.anomalyCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                {metrics.anomalyCount} Flagged
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by order #, student name, email, or merchant Txn ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Order Statuses</option>
          <option value="SETTLED">Settled (Successful)</option>
          <option value="PENDING">Pending Payment</option>
          <option value="FAILED">Failed</option>
          <option value="USER_CANCELLED">User Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-semibold text-slate-500 mt-2">Loading commerce transactions...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-slate-700">No Orders Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              No orders match the current filter or sandbox orders have been cleared.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Gateway Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{o.orderNumber}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(o.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
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
                          Saved ₹{o.discountAmount}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      <div>{o.merchantTxnId || 'N/A'}</div>
                      {o.gatewayPaymentId && (
                        <div className="text-[10px] text-slate-400">{o.gatewayPaymentId}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          o.orderStatus === 'SETTLED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : o.orderStatus === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {o.orderStatus === 'SETTLED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : o.orderStatus === 'PENDING' ? (
                          <Clock className="w-3 h-3 text-amber-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        <span>{o.orderStatus}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveOrder(o)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                        title="View Order Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDER DOSSIER MODAL */}
      {activeOrder && (
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
                <span className="text-slate-500">State Code:</span>
                <span className="font-bold text-slate-900">{activeOrder.billingStateCode}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Gross Payable Amount:</span>
                <span className="font-black text-indigo-600 text-sm">
                  ₹{activeOrder.netPayableAmount.toLocaleString('en-IN')} (Tax-Inclusive)
                </span>
              </div>
            </div>

            {/* Gateway & Settlement Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-bold text-slate-900">{activeOrder.gatewayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Merchant Txn ID:</span>
                <span className="font-bold text-slate-900">{activeOrder.merchantTxnId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gateway Payment ID:</span>
                <span className="text-slate-800">{activeOrder.gatewayPaymentId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Settlement Status:</span>
                <span className="font-bold text-emerald-600">{activeOrder.settlementStatus}</span>
              </div>
              {activeOrder.settledAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Settled At:</span>
                  <span className="text-slate-800">
                    {new Date(activeOrder.settledAt).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Link
                href="/admin/invoices"
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>View Tax Invoice</span>
              </Link>
              <button
                onClick={() => setActiveOrder(null)}
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
