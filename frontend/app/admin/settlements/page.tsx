'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building,
  RefreshCw,
  Plus,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Percent,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface SettlementSummary {
  grossCaptured: number;
  totalRefunds: number;
  estimatedGatewayFee: number;
  estimatedTaxOnFee: number;
  totalDeductions: number;
  netSettlementExpected: number;
  totalSettledPayments: number;
  reconciledPayments: number;
  unreconciledPayments: number;
}

interface SettlementRecord {
  id: string;
  settlementReference: string;
  settlementDate: string;
  grossAmount: number;
  refundAmount: number;
  gatewayFee: number;
  taxOnFee: number;
  netSettlementAmount: number;
  currency: string;
  status: string;
  sourceReference: string | null;
  adminUserId: number | null;
  createdAt: string;
}

export default function AdminSettlementsPage() {
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    settlementReference: '',
    settlementDate: new Date().toISOString().split('T')[0],
    grossAmount: '',
    refundAmount: '0',
    gatewayFee: '',
    taxOnFee: '',
    netSettlementAmount: '',
    sourceReference: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettlements = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/admin/settlements');
      if (res.ok) {
        const j = await res.json();
        if (j.success) {
          setSummary(j.summary);
          setSettlements(j.settlements || []);
        }
      }
    } catch (err) {
      console.error('[AdminSettlements] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiClient('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementReference: formData.settlementReference.trim(),
          settlementDate: formData.settlementDate,
          grossAmount: parseFloat(formData.grossAmount),
          refundAmount: parseFloat(formData.refundAmount || '0'),
          gatewayFee: formData.gatewayFee ? parseFloat(formData.gatewayFee) : undefined,
          taxOnFee: formData.taxOnFee ? parseFloat(formData.taxOnFee) : undefined,
          netSettlementAmount: parseFloat(formData.netSettlementAmount),
          sourceReference: formData.sourceReference.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Settlement batch recorded successfully.');
        fetchSettlements();
        setTimeout(() => {
          setIsModalOpen(false);
          setFormData({
            settlementReference: '',
            settlementDate: new Date().toISOString().split('T')[0],
            grossAmount: '',
            refundAmount: '0',
            gatewayFee: '',
            taxOnFee: '',
            netSettlementAmount: '',
            sourceReference: '',
          });
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Failed to record settlement batch.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred.');
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settlement & Reconciliation</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
              Bank Authoritative
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gross gateway receipts, MDR fee deductions (2% + 18% GST), refunds, and net bank settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSettlements()}
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
          >
            <Plus size={14} />
            Record Bank Settlement
          </button>
        </div>
      </div>

      {/* Commercial MDR Status Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div>
            <span className="font-bold">Commercial Agreement Notice:</span> The 2.0% MDR and 18% GST-on-MDR calculations displayed below are unconfirmed default merchant estimates pending final commercial agreement with PayU.
          </div>
          <div className="text-[11px] text-amber-700">
            <strong>Important Accounting Boundary:</strong> Gateway MDR is strictly a banking disbursement deduction for merchant settlement reconciliation. It has zero effect on authoritative course pricing or student checkout billing.
          </div>
        </div>
      </div>
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Captured</span>
            <p className="text-lg font-black text-emerald-600 mt-1">
              ₹{summary.grossCaptured.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">{summary.totalSettledPayments} captures</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Refunds</span>
            <p className="text-lg font-black text-rose-600 mt-1">
              -₹{summary.totalRefunds.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Reversals</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Gateway Fee (2%)</span>
            <p className="text-lg font-black text-amber-600 mt-1">
              -₹{summary.estimatedGatewayFee.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Base PayU MDR</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GST on Fee (18%)</span>
            <p className="text-lg font-black text-amber-600 mt-1">
              -₹{summary.estimatedTaxOnFee.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">18% on MDR</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deductions</span>
            <p className="text-lg font-black text-slate-800 mt-1">
              -₹{summary.totalDeductions.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">Fees + Refunds</span>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Net Expected</span>
            <p className="text-xl font-black text-indigo-950 mt-1">
              ₹{summary.netSettlementExpected.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-indigo-600 font-medium">To Bank Account</span>
          </div>
        </div>
      )}

      {/* Reconciliation Health Card */}
      {summary && (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Settlement Ledger Reconciliation</h4>
              <p className="text-[11px] text-slate-500">
                {summary.reconciledPayments} payments bank-matched • {summary.unreconciledPayments} awaiting settlement verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/payments"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              Open Payments Ledger
            </Link>
          </div>
        </div>
      )}

      {/* Table of Recorded Settlements */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Settlement Batches & Bank Credit Records</h3>
          <span className="text-xs text-slate-400 font-medium">{settlements.length} batches recorded</span>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <LoadingSpinner size="md" />
            <p className="text-xs font-semibold text-slate-400">Loading settlement batches...</p>
          </div>
        ) : settlements.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
            <p className="text-xs font-semibold">No bank settlement batches recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Use "Record Bank Settlement" to log your first bank payout.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Settlement Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Gross Capture</th>
                  <th className="py-3 px-4 text-right">Gateway Fee</th>
                  <th className="py-3 px-4 text-right">Refunds</th>
                  <th className="py-3 px-4 text-right">Net Credited</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source / UTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {s.settlementReference}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-sans">
                      {new Date(s.settlementDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                      ₹{s.grossAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-amber-600 font-semibold">
                      -₹{(s.gatewayFee + s.taxOnFee).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-rose-600 font-semibold">
                      -₹{s.refundAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-indigo-900">
                      ₹{s.netSettlementAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={10} /> {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {s.sourceReference || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Settlement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <Building size={18} />
                <h3 className="font-bold text-slate-900 text-base">Record Bank Settlement Batch</h3>
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
                <AlertCircle size={14} className="shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleCreateSettlement} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Settlement Batch Ref:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SETTL-20261120-01"
                    value={formData.settlementReference}
                    onChange={(e) => setFormData({ ...formData, settlementReference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Settlement Date:
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.settlementDate}
                    onChange={(e) => setFormData({ ...formData, settlementDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Gross Amount (₹):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 50000"
                    value={formData.grossAmount}
                    onChange={(e) => {
                      const gross = parseFloat(e.target.value) || 0;
                      const fee = Math.round(gross * 0.02 * 100) / 100;
                      const tax = Math.round(fee * 0.18 * 100) / 100;
                      const ref = parseFloat(formData.refundAmount) || 0;
                      const net = Math.round((gross - ref - fee - tax) * 100) / 100;
                      setFormData({
                        ...formData,
                        grossAmount: e.target.value,
                        gatewayFee: fee.toString(),
                        taxOnFee: tax.toString(),
                        netSettlementAmount: net.toString(),
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Refunds Deducted (₹):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.refundAmount}
                    onChange={(e) => setFormData({ ...formData, refundAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Gateway Fee (2%):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gatewayFee}
                    onChange={(e) => setFormData({ ...formData, gatewayFee: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    GST on Fee (18%):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxOnFee}
                    onChange={(e) => setFormData({ ...formData, taxOnFee: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Net Bank Credited Amount (₹):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.netSettlementAmount}
                  onChange={(e) => setFormData({ ...formData, netSettlementAmount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Bank Reference / UTR Number (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-HDFC20261120001923"
                  value={formData.sourceReference}
                  onChange={(e) => setFormData({ ...formData, sourceReference: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Record Batch'
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