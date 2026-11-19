'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, Eye, Database } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Last updated: November 2026 • Compliant with Digital Personal Data Protection (DPDP) Act, 2023 & IT Rules
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">1. Overview</h2>
            <p>
              At <strong>10Q Challenge</strong>, we respect your privacy and are committed to safeguarding your personal data. This Privacy Policy outlines what information we collect when you visit our website, register for an account, attempt mock tests, or enroll in our academic courses, and how that information is utilized and protected.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">2. Information We Collect</h2>
            <p>We collect only the minimum necessary data to provide our educational services:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>
                <strong>Identity & Contact Information:</strong> Full Name, Email Address, WhatsApp/Mobile Number, City, Target Exam (e.g., BITSAT, JEE Main, COMEDK), and Target Year.
              </li>
              <li>
                <strong>Authentication & Security Data:</strong> Password hashes (hashed using standard bcrypt/argon cryptographic salts), secure HTTP session cookies, and IP access logs for security audit purposes.
              </li>
              <li>
                <strong>Academic & Assessment Performance:</strong> Mock test scores, question responses, time spent per section, accuracy analytics, doubt submissions, and learning module completion status.
              </li>
              <li>
                <strong>Transactional & Billing Records:</strong> Unique merchant transaction IDs, order timestamps, course identifiers, invoice amounts, and tax breakdowns. Note that debit/credit card credentials are processed directly by RBI-licensed payment gateways and are never stored on our servers.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">3. How We Use Your Data</h2>
            <p>Your information is used strictly for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Provisioning authorized course access, test engine access, and student dashboard capabilities.</li>
              <li>Generating personalized performance analytics, percentile projections, and speed recommendations.</li>
              <li>Delivering critical account notifications, payment receipts, test schedule alerts, and mentorship updates via email or WhatsApp.</li>
              <li>Protecting platform integrity against unauthorized sharing, scraping, or fraudulent activities.</li>
            </ul>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 font-medium">
              We uphold a strict zero-spam policy: We never sell, rent, or trade student personal records or mobile numbers to third-party advertising brokers or call centers.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">4. Data Security & Storage</h2>
            <p>
              All communication between your browser and our platform is encrypted in transit using industry-standard Transport Layer Security (TLS 1.3 / HTTPS). Authentication sessions use encrypted, HTTP-only, SameSite cookies to protect against cross-site scripting (XSS) and CSRF vulnerabilities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">5. Cookies & Local Analytics</h2>
            <p>
              We use essential session cookies strictly required for logging in, preserving examination timers, and maintaining cart selections. We do not employ intrusive tracking cookies across external websites.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">6. Your Rights</h2>
            <p>
              Under applicable Indian data protection guidelines, you have the right to review the personal data associated with your profile, request corrections to inaccurate information, or request account closure and data deletion upon completion of your academic cycle, subject to necessary legal and tax retention periods.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">7. Contact the Privacy Officer</h2>
            <p>
              If you have any questions or concerns regarding our privacy practices or data handling, please write to:
            </p>
            <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p><strong>Grievance Officer, 10Q Challenge</strong></p>
              <p>Email: privacy@10qchallenge.in</p>
              <p>Address: 10Q Challenge Learning Technologies, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
