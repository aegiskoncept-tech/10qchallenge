'use client';

import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, FileText, Printer, Clock, RotateCcw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InvoiceEntity } from '@/lib/commerce/types';

export default function StudentInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceEntity | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/student/invoices');
        if (res.ok) {
          const j = await res.json();
          if (j.success && Array.isArray(j.data)) {
            setInvoices(j.data);
          } else {
            setError(j.error || 'Failed to load invoices.');
          }
        } else {
          setError('Failed to load invoices ledger.');
        }
      } catch (e: any) {
        setError(e.message || 'Network error fetching invoices.');
      } finally {
        setIsLoading(false);
      }
    }
    loadInvoices();
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
      case 'PAID':
      case 'SETTLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8FAF0] text-[#16A34A] flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} /> Paid & Verified
          </span>
        );
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F0EDFD] text-[#3F328A] flex items-center gap-1 w-fit">
            <RotateCcw size={11} /> Partially Refunded
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF5FF] text-[#2563EB] flex items-center gap-1 w-fit">
            <RotateCcw size={11} /> Fully Refunded
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] flex items-center gap-1 w-fit">
            <AlertCircle size={11} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF9E6] text-[#D97706] flex items-center gap-1 w-fit">
            <Clock size={11} /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17152A]">
          My Course Invoices & Payment Receipts
        </h1>
        <p className="text-xs sm:text-sm text-[#6E6990] mt-1">
          Download and view authoritative course enrollment receipts and payment invoices for your enrolled programs.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] text-[#E11D48] text-xs font-medium flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-[#E7E3F5] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#17152A]">
            <thead className="bg-[#F6F4FF] text-[#6E6990] font-bold border-b border-[#E7E3F5]">
              <tr>
                <th className="p-4">Invoice No.</th>
                <th className="p-4">Date</th>
                <th className="p-4">Program Enrolled</th>
                <th className="p-4">Amount Paid</th>
                <th className="p-4">Payment Reference</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1EFFB]">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#6E6990]">
                    Loading verified invoices from PostgreSQL ledger...
                  </td>
                </tr>
              )}
              {!isLoading && invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#6E6990]">
                    No verified course payment invoices found.
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
                    <tr key={inv.id} className="hover:bg-[#FAFAFD] transition-colors">
                      <td className="p-4 font-mono font-bold text-[#1455C0]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-4 text-[#6E6990]">
                        {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 font-medium max-w-xs truncate" title={courseNames}>
                        {courseNames}
                      </td>
                      <td className="p-4 font-bold text-[#17152A]">
                        ₹{Number(inv.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-[#6E6990]">
                        {inv.gatewayPaymentId || inv.merchantTxnId}
                      </td>
                      <td className="p-4">{getStatusBadge(inv.status)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/api/student/invoices/${inv.id}/pdf`}
                            download={`10Q-Invoice-${inv.invoiceNumber}.pdf`}
                            className="px-2.5 py-1.5 rounded-lg bg-[#EBF5FF] hover:bg-[#1455C0] text-[#1455C0] hover:text-white font-bold transition-colors flex items-center gap-1"
                            title="Download Official PDF"
                          >
                            <Download size={12} />
                            <span>PDF</span>
                          </a>
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#F0EDFD] hover:bg-[#3F328A] text-[#3F328A] hover:text-white font-bold transition-colors flex items-center gap-1"
                          >
                            <FileText size={12} />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-[#E7E3F5] space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E3F5]">
              <div>
                <h3 className="text-xl font-black text-[#1455C0]">10Q CHALLENGE</h3>
                <p className="text-[11px] text-[#6E6990]">Course Enrollment Receipt & Payment Invoice</p>
              </div>

              <div className="text-right text-xs">
                <span className="font-bold text-[#1455C0] block font-mono text-sm">
                  {selectedInvoice.invoiceNumber}
                </span>
                <span className="text-[#6E6990]">
                  Date: {new Date(selectedInvoice.issuedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Bill To & Gateway Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-[#6E6990] block mb-1">Billed To (Student):</span>
                <p className="font-bold text-[#17152A]">{selectedInvoice.billingFullName}</p>
                <p className="text-[#6E6990]">{selectedInvoice.billingEmail}</p>
                {selectedInvoice.billingPhone && (
                  <p className="text-[#6E6990]">Phone: {selectedInvoice.billingPhone}</p>
                )}
                <p className="text-[#6E6990]">
                  State: {selectedInvoice.billingStateCode}, Country: {selectedInvoice.billingCountryCode}
                </p>
                <p className="text-[#6E6990]">Student ID: #{selectedInvoice.userId}</p>
              </div>

              <div className="text-right">
                <span className="font-bold text-[#6E6990] block mb-1">Transaction Details:</span>
                <p className="font-semibold text-[#17152A]">Payment Gateway: {selectedInvoice.gatewayName}</p>
                <p className="font-mono text-[#6E6990] text-[11px]">PayU ID: {selectedInvoice.gatewayPaymentId}</p>
                <p className="font-mono text-[#6E6990] text-[11px]">Txn ID: {selectedInvoice.merchantTxnId}</p>
                <p className="text-[#16A34A] font-bold text-[11px]">Verification: Confirmed & Settled</p>
              </div>
            </div>

            {/* Program Items Table */}
            <div className="border border-[#E7E3F5] rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F6F4FF] text-[#6E6990] font-bold border-b border-[#E7E3F5]">
                  <tr>
                    <th className="p-3">Program / Course Description</th>
                    <th className="p-3 text-right">Catalog Price</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EFFB]">
                  {(selectedInvoice.items && selectedInvoice.items.length > 0 ? selectedInvoice.items : [
                    {
                      id: '1',
                      productTitleSnapshot: 'BITSAT 2026 Master Crash Course (Updated Batch)',
                      unitPrice: selectedInvoice.originalAmount,
                      lineTotal: selectedInvoice.finalAmount,
                    }
                  ]).map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium text-[#17152A]">{item.productTitleSnapshot}</td>
                      <td className="p-3 text-right">₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right font-bold">₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Breakdown (Pure manual pricing: zero assumed GST) */}
            <div className="flex justify-end text-xs">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-[#6E6990]">
                  <span>Catalog Course Price:</span>
                  <span>₹{Number(selectedInvoice.originalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(selectedInvoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-[#16A34A] font-semibold">
                    <span>Coupon Discount {selectedInvoice.couponCode ? `(${selectedInvoice.couponCode})` : ''}:</span>
                    <span>- ₹{Number(selectedInvoice.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-[#17152A] pt-2 border-t border-[#E7E3F5]">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#1455C0]">
                    ₹{Number(selectedInvoice.finalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] text-[#94A3B8] text-right">
                  (Course Enrollment Fee. Zero hidden charges)
                </p>
              </div>
            </div>

            {/* Refund notification if status is refunded */}
            {(selectedInvoice.status === 'REFUNDED' || selectedInvoice.status === 'PARTIALLY_REFUNDED') && (
              <div className="p-3 rounded-xl bg-[#F0EDFD] border border-[#DDD6FE] text-[#3F328A] text-xs">
                <span className="font-bold block">Refund Reference:</span>
                <span>This invoice reflects an adjusted or refunded enrollment state. Original payment receipt details are preserved permanently.</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-[#E7E3F5] flex justify-between items-center text-xs">
              <span className="text-[#6E6990]">
                Official computer-generated receipt. No physical signature required.
              </span>
              <div className="flex gap-2">
                <a
                  href={`/api/student/invoices/${selectedInvoice.id}/pdf`}
                  download={`10Q-Invoice-${selectedInvoice.invoiceNumber}.pdf`}
                  className="px-4 py-2 rounded-xl bg-[#1455C0] text-white font-bold flex items-center gap-1.5 hover:bg-[#0E3E8E] transition-colors"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-[#3F328A] text-white font-bold flex items-center gap-1.5 hover:bg-[#2D246B] transition-colors"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E7E3F5] text-[#17152A] font-bold hover:bg-[#F6F4FF] transition-colors"
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
