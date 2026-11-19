'use client';

import React from 'react';
import Link from 'next/link';
import { RotateCcw, ArrowLeft, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Refund & Cancellation Policy
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Last updated: November 2026 • Clear, transparent guidance on digital course and test series purchases
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">1. Nature of Digital Goods</h2>
            <p>
              10Q Challenge offers digital educational products, including full-syllabus video courses, test series with downloadable solutions, CBT examination engines, and personalized mentorship programs. Upon payment confirmation, enrollment access to high-yield proprietary materials is instantly unlocked on the student dashboard.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">2. Refund Eligibility & Rules</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">Technical Failure or Duplicate Deduction</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    If an amount was debited from your account multiple times due to a gateway error, or if your payment was deducted but access was not unlocked within 24 hours, you are entitled to a 100% refund of the duplicate/failed charge.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">Digital Course & Mock Test Consumables</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Once a student has commenced attempting mock tests or accessed proprietary course videos/documents, cancellation requests cannot be granted due to the immediate digital consumption of content. We encourage students to review available free preview tests and syllabus outlines prior to purchase.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">3. How to Request a Refund</h2>
            <p>
              To request a refund for a duplicate transaction or billing error:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
              <li>
                Send an email to <strong>support@10qchallenge.in</strong> within <strong>7 calendar days</strong> of the transaction.
              </li>
              <li>
                Include your <strong>Registered Email</strong>, <strong>Mobile Number</strong>, <strong>Order Number</strong>, and <strong>Payment Gateway Transaction ID (or Bank UTR)</strong>.
              </li>
              <li>
                Attach a screenshot or bank debit confirmation verifying the deduction.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">4. Processing Timelines</h2>
            <p>
              Once your request is verified by our finance team, approved refunds will be initiated within <strong>3 to 5 business days</strong>. The funds will be credited back to the original source method (Bank Account, UPI, or Card) within <strong>5 to 7 working days</strong>, adhering to standard banking processing cycles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">5. Course Batch Transfer Policy</h2>
            <p>
              In genuine academic situations (such as target exam changes from BITSAT to JEE or COMEDK), students may request a batch transfer within 7 days of enrollment, subject to any difference in course fees and administrator approval.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">6. Contact Support</h2>
            <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p><strong>10Q Challenge Student Support Desk</strong></p>
              <p>Email: support@10qchallenge.in</p>
              <p>WhatsApp Assistance: +91 99999 99999</p>
              <p>Operating Hours: Monday to Saturday, 10:00 AM – 7:00 PM IST</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
