'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Clock,
  Printer,
  RefreshCw,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { InvoiceEntity } from '@/lib/commerce/types';
import { apiClient } from '@/lib/apiClient';

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceEntity | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter) q.set('status', statusFilter);
      if (startDate) q.set('startDate', startDate);
      if (endDate) q.set('endDate', endDate);
      q.set('page', String(page));
      q.set('limit', '20');

      const res = await apiClient(`/api/admin/invoices?${q.toString()}`);
      if (res.ok) {
        const j = await res.json();
        if (j.success) {
          setInvoices(j.invoices || []);
          setTotal(j.total || 0);
          setTotalPages(j.totalPages || 1);
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch invoices', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleBackfill = async () => {
    if (!confirm('Run idempotent backfill for verified historical paid orders?')) return;
    setIsBackfilling(true);
    setActionMessage(null);
    try {
      const res = await apiClient('/api/admin/invoices/backfill', { method: 'POST' });
      const j = await res.json();
      if (j.success) {
        setActionMessage({
          type: 'success',
          text: `Backfill completed successfully! Backfilled: ${j.backfilledCount}, Total Verified Invoices: ${j.existingCount}.`,
        });
        fetchInvoices();
      } else {
        setActionMessage({ type: 'error', text: j.error || 'Backfill operation failed.' });
      }
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Backfill request failed.' });
    } finally {
      setIsBackfilling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
      case 'PAID':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E8FAF0] text-[#16A34A] flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} /> Issued & Paid
          </span>
        );
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F0EDFD] text-[#3F328A] flex items-center gap-1 w-fit">
            <RotateCcw size={11} /> Partially Refunded
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EBF5FF] text-[#2563EB] flex items-center gap-1 w-fit">
            <RotateCcw size={11} /> Fully Refunded
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] flex items-center gap-1 w-fit">
            <AlertCircle size={11} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFF9E6] text-[#D97706] flex items-center gap-1 w-fit">
            <Clock size={11} /> {status}
          </span>
        );
    }
  };

  const totalInvoicedSum = invoices.reduce((acc, inv) => acc + Number(inv.finalAmount || 0), 0);
  const issuedCount = invoices.filter((i) => i.status === 'ISSUED').length;
  const refundedCount = invoices.filter((i) => i.status === 'REFUNDED' || i.status === 'PARTIALLY_REFUNDED').length;

  return (
    <div className="space-y-6">
      {/* Page Title & Backfill Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#17152A] flex items-center gap-2">
            <FileText className="text-[#1455C0]" size={26} />
            Invoices & Billing Register
          </h1>
          <p className="text-xs text-[#6E6990] mt-0.5">
            Authoritative ledger of course enrollment invoices, receipts, and refund audit records.
          </p>
        </div>

        <button
          onClick={handleBackfill}
          disabled={isBackfilling}
          className="px-4 py-2 rounded-xl bg-[#1455C0] hover:bg-[#0E3E8E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 w-fit disabled:opacity-50"
        >
          <RefreshCw size={13} className={isBackfilling ? 'animate-spin' : ''} />
          <span>{isBackfilling ? 'Backfilling...' : 'Backfill Historical Orders'}</span>
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            actionMessage.type === 'success'
              ? 'bg-[#E8FAF0] border-[#BBF7D0] text-[#16A34A]'
              : 'bg-[#FFF1F2] border-[#FFE4E6] text-[#E11D48]'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E3F5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#6E6990] uppercase tracking-wider block">Total Invoiced (Page)</span>
            <span className="text-xl font-black text-[#17152A]">₹{totalInvoicedSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EBF5FF] text-[#1455C0] flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E3F5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#6E6990] uppercase tracking-wider block">Issued & Active</span>
            <span className="text-xl font-black text-[#16A34A]">{issuedCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E8FAF0] text-[#16A34A] flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E3F5] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#6E6990] uppercase tracking-wider block">Refunded / Adjusted</span>
            <span className="text-xl font-black text-[#3F328A]">{refundedCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0EDFD] text-[#3F328A] flex items-center justify-center font-bold">
            <RotateCcw size={20} />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E7E3F5] shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="relative md:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by Invoice No, Student Name, Email, Txn ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
            >
              <option value="">All Statuses</option>
              <option value="ISSUED">Issued / Paid</option>
              <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
              <option value="REFUNDED">Fully Refunded</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full py-2 bg-[#17152A] hover:bg-black text-white font-bold rounded-xl transition-all"
            >
              Filter Ledger
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
                setPage(1);
                fetchInvoices();
              }}
              className="px-3 py-2 bg-[#F1F5F9] text-[#475569] font-bold rounded-xl hover:bg-[#E2E8F0]"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Invoices Register Table */}
      <div className="bg-white rounded-3xl border border-[#E7E3F5] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#17152A]">
            <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0]">
              <tr>
                <th className="p-4">Invoice No.</th>
                <th className="p-4">Student Name & Email</th>
                <th className="p-4">Program Enrolled</th>
                <th className="p-4">Original</th>
                <th className="p-4">Coupon</th>
                <th className="p-4">Final Paid</th>
                <th className="p-4">Gateway Txn ID</th>
                <th className="p-4">Issue Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {isLoading && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#94A3B8]">
                    Loading verified invoices from PostgreSQL ledger...
                  </td>
                </tr>
              )}
              {!isLoading && invoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#94A3B8]">
                    No invoices match the search criteria.
                  </td>
                </tr>
              )}
              {!isLoading &&
                invoices.map((inv) => {
                  const courseNames =
                    inv.items && inv.items.length > 0
                      ? inv.items.map((i) => i.productTitleSnapshot).join(', ')
                      : 'BITSAT 2026 Master Crash Course';

                  return (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-4 font-mono font-bold text-[#1455C0]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-[#0F172A]">{inv.billingFullName}</div>
                        <div className="text-[11px] text-[#64748B]">{inv.billingEmail}</div>
                      </td>
                      <td className="p-4 max-w-[180px] truncate" title={courseNames}>
                        {courseNames}
                      </td>
                      <td className="p-4 text-[#64748B]">
                        ₹{Number(inv.originalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        {Number(inv.discountAmount) > 0 ? (
                          <span className="text-[#16A34A] font-semibold">
                            -₹{Number(inv.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            {inv.couponCode && ` (${inv.couponCode})`}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-[#0F172A]">
                        ₹{Number(inv.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-[#64748B]">
                        {inv.gatewayPaymentId || inv.merchantTxnId}
                      </td>
                      <td className="p-4 text-[#64748B] text-[11px]">
                        {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4">{getStatusBadge(inv.status)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/api/admin/invoices/${inv.id}/pdf`}
                            download={`10Q-Invoice-${inv.invoiceNumber}.pdf`}
                            className="p-1.5 rounded-lg bg-[#EBF5FF] hover:bg-[#1455C0] text-[#1455C0] hover:text-white transition-colors"
                            title="Download PDF"
                          >
                            <Download size={13} />
                          </a>
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#334155] text-[#334155] hover:text-white transition-colors"
                            title="View Details"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <span>
            Showing {invoices.length} of {total} registered invoices
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-bold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Admin Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-[#E7E3F5] space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E3F5]">
              <div>
                <h3 className="text-xl font-black text-[#1455C0]">10Q CHALLENGE LMS</h3>
                <p className="text-[11px] text-[#6E6990]">Admin Verified Invoice Inspection</p>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-[#1455C0] block font-mono text-sm">
                  {selectedInvoice.invoiceNumber}
                </span>
                <span className="text-[#6E6990]">
                  Issued: {new Date(selectedInvoice.issuedAt).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-[#6E6990] block">Student Billing Details:</span>
                <p className="font-bold text-[#0F172A]">{selectedInvoice.billingFullName}</p>
                <p className="text-[#64748B]">{selectedInvoice.billingEmail}</p>
                <p className="text-[#64748B]">State: {selectedInvoice.billingStateCode}, {selectedInvoice.billingCountryCode}</p>
                <p className="text-[#64748B]">User ID: #{selectedInvoice.userId}</p>
                <p className="font-mono text-[10px] text-[#94A3B8]">Order UUID: {selectedInvoice.orderId}</p>
              </div>

              <div className="space-y-1 text-right">
                <span className="font-bold text-[#6E6990] block">Gateway Settlement Evidence:</span>
                <p className="font-semibold text-[#0F172A]">Gateway: {selectedInvoice.gatewayName}</p>
                <p className="font-mono text-[#64748B] text-[11px]">PayU Payment ID: {selectedInvoice.gatewayPaymentId}</p>
                <p className="font-mono text-[#64748B] text-[11px]">Txn ID: {selectedInvoice.merchantTxnId}</p>
                <div className="pt-1">{getStatusBadge(selectedInvoice.status)}</div>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-3">Program / Item Description</th>
                    <th className="p-3 text-right">Catalog Price</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {(selectedInvoice.items && selectedInvoice.items.length > 0 ? selectedInvoice.items : [
                    {
                      id: '1',
                      productTitleSnapshot: 'BITSAT 2026 Master Crash Course (Updated Batch)',
                      unitPrice: selectedInvoice.originalAmount,
                      lineTotal: selectedInvoice.finalAmount,
                    }
                  ]).map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium text-[#0F172A]">{item.productTitleSnapshot}</td>
                      <td className="p-3 text-right">₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right font-bold">₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end text-xs">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-[#64748B]">
                  <span>Catalog Course Price:</span>
                  <span>₹{Number(selectedInvoice.originalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(selectedInvoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-[#16A34A] font-semibold">
                    <span>Coupon Discount {selectedInvoice.couponCode ? `(${selectedInvoice.couponCode})` : ''}:</span>
                    <span>- ₹{Number(selectedInvoice.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-[#0F172A] pt-2 border-t border-[#E2E8F0]">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#1455C0]">
                    ₹{Number(selectedInvoice.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Refund & Adjustments Details */}
            {selectedInvoice.refunds && selectedInvoice.refunds.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#F0EDFD] border border-[#DDD6FE] text-xs space-y-1">
                <span className="font-bold text-[#3F328A] block">Linked Refunds:</span>
                {selectedInvoice.refunds.map((rf) => (
                  <div key={rf.id} className="flex justify-between text-[#3F328A]">
                    <span>Ref: {rf.refundReference} ({rf.reason || 'Requested refund'})</span>
                    <span className="font-bold">₹{Number(rf.amount).toFixed(2)} ({rf.status})</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center text-xs">
              <span className="text-[#64748B]">Audited by 10Q Commerce Settlement Ledger</span>
              <div className="flex gap-2">
                <a
                  href={`/api/admin/invoices/${selectedInvoice.id}/pdf`}
                  download={`10Q-Invoice-${selectedInvoice.invoiceNumber}.pdf`}
                  className="px-4 py-2 rounded-xl bg-[#1455C0] text-white font-bold flex items-center gap-1.5 hover:bg-[#0E3E8E] transition-colors"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] font-bold hover:bg-[#F8FAFC] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
