'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
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
  User,
  GraduationCap,
  Building,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

interface InvoiceRecord {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  userId: number;
  courseId: string;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  stateCode: string;
  originalAmount: number;
  discountAmount: number;
  netPayableAmount: number;
  baseAmount: number;
  gstAmount: number;
  orderStatus: string;
  settlementStatus: string;
  gatewayPaymentId: string | null;
  settledAt: string | null;
  createdAt: string;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeInvoice, setActiveInvoice] = useState<InvoiceRecord | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/invoices');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setInvoices(j.data);
        }
      }
    } catch (err) {
      console.error('[AdminInvoices] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchOrder = inv.orderNumber.toLowerCase().includes(q);
      const matchName = inv.studentName.toLowerCase().includes(q);
      const matchEmail = inv.studentEmail.toLowerCase().includes(q);
      const matchCourse = inv.courseTitle.toLowerCase().includes(q);
      const matchGateway = inv.gatewayPaymentId?.toLowerCase().includes(q) || false;
      if (!matchOrder && !matchName && !matchEmail && !matchCourse && !matchGateway) return false;
    }

    if (statusFilter !== 'ALL' && inv.settlementStatus !== statusFilter) return false;

    return true;
  });

  const totalRevenue = invoices
    .filter((inv) => inv.settlementStatus === 'SETTLED' || inv.orderStatus === 'COMPLETED')
    .reduce((sum, inv) => sum + inv.netPayableAmount, 0);

  const totalGst = invoices
    .filter((inv) => inv.settlementStatus === 'SETTLED' || inv.orderStatus === 'COMPLETED')
    .reduce((sum, inv) => sum + inv.gstAmount, 0);

  const settledCount = invoices.filter((i) => i.settlementStatus === 'SETTLED' || i.orderStatus === 'COMPLETED').length;
  const pendingCount = invoices.filter((i) => i.settlementStatus === 'PENDING' && i.orderStatus !== 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-7 w-7 text-indigo-600" />
            Invoices & Student Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Authoritative commerce transactions, GST tax breakdowns, payment settlement records, and invoices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInvoices}
            disabled={isLoading}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Invoices"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{invoices.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Settled Revenue</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">GST Collected (18%)</p>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            ₹{totalGst.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Orders</p>
          <p className="text-2xl font-bold text-amber-700 mt-2">{pendingCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order #, Student Name, Email, Course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Settlement Statuses</option>
              <option value="SETTLED">SETTLED (Verified)</option>
              <option value="PENDING">PENDING (Awaiting Gateway)</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 mt-2">Loading transactions...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900">No orders or invoices found</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Transactions will automatically populate when students initiate checkout or complete course enrollments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Order / Invoice</th>
                  <th className="py-3.5 px-4">Student Details</th>
                  <th className="py-3.5 px-4">Course Enrolled</th>
                  <th className="py-3.5 px-4">Amount (GST Incl.)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono font-semibold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {inv.orderNumber}
                        </span>
                        {inv.gatewayPaymentId && (
                          <p className="text-[11px] text-gray-500 font-mono mt-1">
                            PayU: {inv.gatewayPaymentId}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-medium text-gray-900 text-xs flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          {inv.studentName}
                        </p>
                        <p className="text-xs text-gray-500">{inv.studentEmail}</p>
                        <p className="text-[11px] text-gray-400">State: {inv.stateCode}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
                        <GraduationCap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="line-clamp-1 max-w-[200px]">{inv.courseTitle}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-gray-900 text-xs">
                          ₹{inv.netPayableAmount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Taxable: ₹{inv.baseAmount.toLocaleString('en-IN')} + GST ₹{inv.gstAmount.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.settlementStatus === 'SETTLED' || inv.orderStatus === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          SETTLED
                        </span>
                      ) : inv.settlementStatus === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="h-3 w-3" />
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveInvoice(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="View Tax Invoice"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tax Invoice Modal Preview */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-gray-200 transition-all max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
            {/* Modal Header with Print Button */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Official GST Tax Invoice Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold ml-2"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Tax Invoice Printable Body */}
            <div className="mt-6 space-y-6 text-sm text-gray-800 font-sans">
              {/* Header Details */}
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">10Q CHALLENGE</h2>
                  <p className="text-xs text-gray-500 mt-1">10Q Challenge EduTech Pvt. Ltd.</p>
                  <p className="text-xs text-gray-500">GSTIN: 29AABCU9603R1ZM</p>
                  <p className="text-xs text-gray-500">SAC Code: 999293 (Online Education Services)</p>
                  <p className="text-xs text-gray-500">Support: support@10qchallenge.in</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold uppercase px-2 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                    TAX INVOICE
                  </span>
                  <p className="font-mono font-bold text-xs mt-2 text-gray-900">
                    {activeInvoice.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    Date: {new Date(activeInvoice.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">Order: {activeInvoice.orderNumber}</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <div>
                  <p className="font-bold text-gray-900 uppercase tracking-wider mb-1">Billed To (Student):</p>
                  <p className="font-semibold text-gray-900">{activeInvoice.studentName}</p>
                  <p className="text-gray-600">{activeInvoice.studentEmail}</p>
                  {activeInvoice.studentPhone && <p className="text-gray-600">Ph: {activeInvoice.studentPhone}</p>}
                </div>
                <div>
                  <p className="font-bold text-gray-900 uppercase tracking-wider mb-1">Place of Supply:</p>
                  <p className="text-gray-700">State Code: {activeInvoice.stateCode} (India)</p>
                  <p className="text-gray-700">Payment Status: <strong className="text-emerald-700">{activeInvoice.settlementStatus}</strong></p>
                  {activeInvoice.gatewayPaymentId && (
                    <p className="text-gray-500">Gateway Ref: {activeInvoice.gatewayPaymentId}</p>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">SAC</th>
                      <th className="py-2.5 px-3 text-right">Taxable Amount</th>
                      <th className="py-2.5 px-3 text-right">GST (18%)</th>
                      <th className="py-2.5 px-3 text-right">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-gray-900">
                        {activeInvoice.courseTitle}
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-mono">999293</td>
                      <td className="py-3 px-3 text-right font-mono">
                        ₹{activeInvoice.baseAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        ₹{activeInvoice.gstAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                        ₹{activeInvoice.netPayableAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Base Value:</span>
                    <span className="font-mono">₹{activeInvoice.baseAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST (9%):</span>
                    <span className="font-mono">₹{(activeInvoice.gstAmount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST (9%):</span>
                    <span className="font-mono">₹{(activeInvoice.gstAmount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold text-gray-900">
                    <span>Total Amount Paid:</span>
                    <span className="font-mono">₹{activeInvoice.netPayableAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="border-t pt-4 text-[11px] text-gray-500 space-y-1">
                <p>• This is a computer-generated tax invoice and requires no physical signature.</p>
                <p>• All online educational services are tax-inclusive adhering to Central & State GST rules.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
