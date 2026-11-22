'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  CreditCard,
  Tag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OrderEntity } from '@/lib/commerce/types';

export default function StudentOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<OrderEntity | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/student/orders');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setOrders(j.data);
        }
      }
    } catch (err) {
      console.error('[StudentOrders] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'SETTLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8FAF0] text-[#16A34A] flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} /> Paid
          </span>
        );
      case 'PENDING_PAYMENT':
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF9E6] text-[#D97706] flex items-center gap-1 w-fit">
            <Clock size={12} /> Pending
          </span>
        );
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F0EDFD] text-[#3F328A] flex items-center gap-1 w-fit">
            <RotateCcw size={12} /> Partially Refunded
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF5FF] text-[#2563EB] flex items-center gap-1 w-fit">
            <RotateCcw size={12} /> Refunded
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFE8ED] text-[#FF3F68] flex items-center gap-1 w-fit">
            <XCircle size={12} /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17152A] tracking-tight">
            My Orders & Enrollments
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6990] mt-1">
            Authoritative order history, payment verification records, and tax invoices.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 rounded-xl bg-white border border-[#E7E3F5] text-xs font-bold text-[#17152A] hover:bg-[#F6F4FF] transition-all flex items-center gap-2 w-fit shadow-xs"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-3xl border border-[#E7E3F5] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#17152A]">
            <thead className="bg-[#F6F4FF] text-[#6E6990] font-bold border-b border-[#E7E3F5]">
              <tr>
                <th className="p-4">Order Reference</th>
                <th className="p-4">Course Enrolled</th>
                <th className="p-4">Order Date</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFFB]">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#6E6990]">
                    Loading your purchase history from PostgreSQL ledger...
                  </td>
                </tr>
              )}
              {!isLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center space-y-3">
                    <ShoppingBag size={40} className="mx-auto text-[#6E6990]/40" />
                    <p className="text-sm font-bold text-[#17152A]">No orders found</p>
                    <p className="text-xs text-[#6E6990]">You have not made any purchases yet.</p>
                    <Link
                      href="/courses"
                      className="px-5 py-2 rounded-xl bg-[#3F328A] text-white text-xs font-bold inline-block"
                    >
                      Browse Programs
                    </Link>
                  </td>
                </tr>
              )}
              {!isLoading &&
                orders.map((o) => {
                  const courseTitle =
                    o.items && o.items.length > 0
                      ? o.items.map((i) => i.productTitleSnapshot).join(', ')
                      : `Course #${o.courseId}`;

                  return (
                    <tr key={o.id} className="hover:bg-[#FAFAFD] transition-colors">
                      <td className="p-4 font-mono font-bold text-[#3F328A]">
                        {o.orderNumber}
                      </td>
                      <td className="p-4 font-medium max-w-xs truncate">
                        {courseTitle}
                      </td>
                      <td className="p-4 text-[#6E6990]">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4">
                        <span className="font-bold">₹{o.netPayableAmount.toLocaleString('en-IN')}</span>
                        {o.discountAmount > 0 && (
                          <span className="block text-[10px] text-[#16A34A]">
                            Saved ₹{o.discountAmount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(o.status)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setActiveOrder(o)}
                          className="px-3 py-1.5 rounded-lg bg-[#F0EDFD] hover:bg-[#3F328A] text-[#3F328A] hover:text-white font-bold transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[#E7E3F5] animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-[#F1EFFB]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990]">
                  Order Receipt
                </span>
                <h3 className="text-lg font-extrabold text-[#17152A] font-mono">
                  {activeOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="p-1 rounded-xl text-[#6E6990] hover:bg-[#F6F4FF] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#6E6990]">Order Status</span>
                {getStatusBadge(activeOrder.status)}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#6E6990]">Date & Time</span>
                <span className="font-medium text-[#17152A]">
                  {new Date(activeOrder.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>

              {/* Items Purchased */}
              <div className="pt-2 border-t border-[#F1EFFB]">
                <span className="font-bold text-[#17152A] block mb-2">Program Snapshot</span>
                <div className="p-3 rounded-2xl bg-[#F6F4FF] space-y-2">
                  {(activeOrder.items || []).map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-[#17152A]">{item.productTitleSnapshot}</div>
                        <div className="text-[10px] text-[#6E6990]">
                          18% GST Included (₹{item.taxAmount.toLocaleString('en-IN')})
                        </div>
                      </div>
                      <span className="font-bold text-[#17152A]">
                        ₹{item.lineTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-1.5 pt-2 border-t border-[#F1EFFB]">
                <div className="flex justify-between text-[#6E6990]">
                  <span>Catalog Price</span>
                  <span>₹{activeOrder.originalAmount.toLocaleString('en-IN')}</span>
                </div>
                {activeOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-[#16A34A] font-semibold">
                    <span>Coupon Discount ({activeOrder.couponCode || 'PROMO'})</span>
                    <span>- ₹{activeOrder.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#6E6990]">
                  <span>GST (18% Tax-Inclusive)</span>
                  <span className="text-[#16A34A]">Included (₹{activeOrder.taxAmount.toLocaleString('en-IN')})</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-[#17152A] pt-2 border-t border-[#F1EFFB]">
                  <span>Total Amount Paid</span>
                  <span className="text-base text-[#3F328A]">₹{activeOrder.netPayableAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Billing Info */}
              <div className="pt-2 border-t border-[#F1EFFB]">
                <span className="font-bold text-[#17152A] block mb-1">Billing Entity</span>
                <p className="text-[#6E6990]">
                  {activeOrder.billingFullName} • {activeOrder.billingEmail} • {activeOrder.billingStateCode}, India
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Link
                href={`/student/classroom/${activeOrder.courseId}`}
                className="flex-1 py-3 rounded-xl bg-[#3F328A] hover:bg-[#2D246B] text-white font-bold text-xs text-center transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Open Classroom</span>
                <ArrowRight size={14} />
              </Link>
              <button
                onClick={() => setActiveOrder(null)}
                className="px-5 py-3 rounded-xl bg-white border border-[#E7E3F5] text-[#17152A] font-bold text-xs hover:bg-[#F6F4FF] transition-colors"
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
