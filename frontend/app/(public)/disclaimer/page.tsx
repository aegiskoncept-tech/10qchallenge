'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Info, BookOpen } from 'lucide-react';

export default function DisclaimerPage() {
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
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Academic & Trademark Disclaimer
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Important legal notices regarding non-affiliation and academic representations
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">1. Trademark & Non-Affiliation Notice</h2>
            <p>
              <strong>10Q Challenge</strong> is an independent educational training, mentorship, and test-preparation platform operated by private educators and alumni of BITS Pilani and premier institutes.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
              <p>
                <strong>Important Notice:</strong> BITSAT®, JEE (Main)®, JEE (Advanced)®, COMEDK®, VITEEE®, MET®, and other examination names, acronyms, or logos referenced on this website are registered trademarks of their respective conducting bodies and universities:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>BITSAT is conducted by Birla Institute of Technology & Science, Pilani (BITS Pilani).</li>
                <li>JEE (Main) & JEE (Advanced) are conducted by the National Testing Agency (NTA) and IIT Joint Admission Board (JAB).</li>
                <li>COMEDK is conducted by the Consortium of Medical, Engineering, and Dental Colleges of Karnataka.</li>
              </ul>
              <p>
                Reference to these examination names is made strictly for descriptive, identification, and curriculum alignment purposes. 10Q Challenge is <strong>not affiliated with, associated with, authorized by, sponsored by, or endorsed by</strong> BITS Pilani, NTA, IITs, or any official examination conducting authority.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">2. Academic Performance & Results Representation</h2>
            <p>
              While our curriculum, practice problems, and speed-test simulations are curated based on past trends and syllabus patterns, 10Q Challenge makes no express or implied warranty that any student will achieve a specific score, rank, percentile, or admission offer.
            </p>
            <p>
              Individual performance depends on the student&apos;s own preparation, background knowledge, dedication, examination temperament, and examination day variables.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">3. Content Accuracy</h2>
            <p>
              We exercise strict academic diligence in formulating questions, options, and solutions. However, in the rare event of a typographical or conceptual error, our academic team provides timely errata and corrections upon review through our doubt resolution system.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 border-b pb-2">4. Questions & Feedback</h2>
            <p>
              If you have any questions or seek clarification regarding this disclaimer, please reach out to us at:
            </p>
            <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p><strong>10Q Challenge Legal & Academic Desk</strong></p>
              <p>Email: legal@10qchallenge.in</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
