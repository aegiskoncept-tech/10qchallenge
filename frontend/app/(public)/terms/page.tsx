'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function TermsPage() {
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Terms and Conditions
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Last updated: November 2026 • Effective immediately upon registration or course enrollment
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">1. Acceptance of Terms</h2>
            <p>
              Welcome to <strong>10Q Challenge</strong> (&quot;Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
              By accessing, browsing, registering an account, or purchasing any academic courses, test series, or mentorship programs through our website, you agree to be bound by these Terms and Conditions and our Privacy Policy.
            </p>
            <p>
              If you do not agree with any portion of these terms, you must not use or access this platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">2. Eligibility & Student Accounts</h2>
            <p>
              To access courses and mock tests, you must register for an account using authentic and verifiable personal information (including your legal name, valid mobile number, and email address). You are solely responsible for safeguarding your login credentials.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Accounts are strictly non-transferable and designated for individual student use only.</li>
              <li>Simultaneous logins from multiple geographic IP locations or unauthorized credential sharing will result in automatic session termination or account suspension.</li>
              <li>You agree to notify 10Q Challenge immediately at support@10qchallenge.in upon suspecting any unauthorized access.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">3. Intellectual Property Rights</h2>
            <p>
              All curriculum material, video lectures, mock test questions, proprietary algorithmic solutions, analysis reports, graphics, code, and documentation available on 10Q Challenge are the sole intellectual property of 10Q Challenge and its licensors.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
              <strong>Strict Prohibition:</strong> Any screen recording, downloading, reverse engineering, redistribution, commercial reselling, or public posting of course content or test question banks without prior written authorization constitutes copyright infringement and will be prosecuted under the Indian Copyright Act, 1957 and applicable laws.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">4. Purchases, Payments & Taxes</h2>
            <p>
              All published course and test series prices are in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST) unless explicitly indicated otherwise.
            </p>
            <p>
              Payments are processed via authorized payment gateway partners adhering to RBI security directives. We do not store student debit/credit card numbers or CVV codes on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">5. Platform Availability & Technical Requirements</h2>
            <p>
              While we strive for 99.9% platform uptime, 10Q Challenge cannot guarantee uninterrupted operation due to periodic maintenance, telecommunication issues, or unforeseen cloud hosting disruptions. Students are responsible for maintaining suitable hardware and reliable broadband internet connections.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">6. Limitation of Liability</h2>
            <p>
              10Q Challenge and its mentors provide high-yield preparation tools, test simulations, and academic guidance. We make no warranty or guarantee of specific percentile scores, university admissions, or competitive exam ranks. In no event shall 10Q Challenge&apos;s aggregate liability exceed the total fee paid by the student for the relevant course.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">7. Governing Law & Jurisdiction</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with the use of this website shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">8. Contact Information</h2>
            <p>
              For any legal notices or queries regarding these Terms, please contact:
            </p>
            <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p><strong>10Q Challenge Legal & Support Team</strong></p>
              <p>Email: legal@10qchallenge.in / support@10qchallenge.in</p>
              <p>Support Helpline: +91 99999 99999</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
