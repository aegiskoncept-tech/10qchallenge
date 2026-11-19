'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  Award,
  Sparkles,
  BookOpen,
  Info,
  ShieldAlert,
  Play,
  RotateCcw,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

interface TestPaperDetail {
  id: number;
  title: string;
  examTag: string;
  targetYear: number;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  price: number;
  status: string;
  createdAt: string;
}

interface TestPaperDetailPageProps {
  params: Promise<{ paperId: string }>;
}

export default function TestPaperDetailPage({ params }: TestPaperDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const paperIdRaw = resolvedParams.paperId;
  const paperId = parseInt(paperIdRaw, 10);

  const [testPaper, setTestPaper] = useState<TestPaperDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Readiness confirmation state
  const [isReadyConfirmed, setIsReadyConfirmed] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(paperId) || paperId <= 0) {
      setError('Invalid test paper identifier.');
      setIsLoading(false);
      return;
    }

    const fetchPaperDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/student/tests/${paperId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`Test paper #${paperId} was not found or is currently not published.`);
          }
          if (res.status === 401) {
            throw new Error('Please log in as a student to access this test paper.');
          }
          throw new Error(`Failed to load test paper (HTTP ${res.status}).`);
        }
        const data = await res.json();
        if (data.success && data.data) {
          setTestPaper(data.data);
        } else {
          throw new Error(data.error || 'Failed to retrieve test details.');
        }
      } catch (err: any) {
        setError(err?.message || 'Unable to retrieve test paper.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaperDetail();
  }, [paperId]);

  const handleStartAttempt = async () => {
    if (!isReadyConfirmed || isStarting) return;
    setIsStarting(true);
    setStartError(null);

    try {
      const csrfMatch = typeof document !== 'undefined' ? document.cookie.match(/(?:^|; )10q_csrf_token=([^;]*)/) : null;
      const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch(`/api/student/tests/${paperId}/start`, {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server rejected attempt creation (HTTP ${res.status}).`);
      }

      // Navigate to the verified session container
      if (data.destination) {
        router.push(data.destination);
      } else {
        throw new Error('Server did not return a valid session destination.');
      }
    } catch (err: any) {
      setStartError(err?.message || 'Failed to start test attempt. Please try again.');
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-16 text-center max-w-lg mx-auto shadow-xs space-y-4 my-8">
        <LoadingSpinner size="lg" className="mx-auto" />
        <h3 className="font-extrabold text-base text-[#17152A]">Loading Test Paper #{paperIdRaw}...</h3>
        <p className="text-xs text-[#6E6990]">Retrieving authoritative CBT test configuration from LMS server.</p>
      </div>
    );
  }

  if (error || !testPaper) {
    return (
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 my-8">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h2 className="font-black text-xl text-[#17152A]">Test Paper Unavailable</h2>
        <p className="text-xs text-[#6E6990] leading-relaxed max-w-sm mx-auto">
          {error || `The requested test paper (#${paperIdRaw}) does not exist in the active test series catalogue.`}
        </p>
        <div className="pt-2">
          <Link
            href="/student/tests"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3F328A] text-white text-xs font-bold hover:bg-[#2A2356] transition"
          >
            <ChevronLeft size={16} />
            <span>Return to Test Series</span>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate positive and negative marks pattern based on exam
  const examNorm = testPaper.examTag?.toLowerCase() || '';
  const isBitsat = examNorm.includes('bitsat');
  const isJee = examNorm.includes('jee');
  const positiveMarks = isBitsat ? 3 : (isJee ? 4 : 1);
  const negativeMarks = isBitsat ? 1 : (isJee ? 1 : 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/student/tests"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#6E6990] hover:text-[#3F328A] transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to Test Series</span>
        </Link>
        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#EBF9F1] text-[#1FA660] border border-[#BDECD1]">
          {testPaper.status}
        </span>
      </div>

      {/* Main Paper Header Card */}
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-[#F0EDFD] text-[#3F328A] border border-[#E2DCFB]">
            {testPaper.examTag}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            Target Year {testPaper.targetYear}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Paper ID #{testPaper.id}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#17152A] tracking-tight mb-3">
          {testPaper.title}
        </h1>

        <p className="text-sm text-[#6E6990] leading-relaxed mb-6">
          {testPaper.description ||
            'Full syllabus Computer-Based Test (CBT) matching official exam patterns and numerical evaluation rules.'}
        </p>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#F6F4FF] border border-[#F1EFFB]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990]">Total Duration</span>
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-[#17152A]">
              <Clock size={16} className="text-[#3F328A]" />
              <span>{testPaper.durationMinutes} Mins</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990]">Questions</span>
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-[#17152A]">
              <FileQuestion size={16} className="text-[#3F328A]" />
              <span>{testPaper.totalQuestions} Questions</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990]">Maximum Marks</span>
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-[#17152A]">
              <Award size={16} className="text-[#3F328A]" />
              <span>{testPaper.totalMarks} Marks</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990]">Marking Pattern</span>
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-[#17152A]">
              <CheckCircle2 size={16} className="text-[#1FA660]" />
              <span>+{positiveMarks} / -{negativeMarks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CBT Instructions Card */}
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2 text-base font-black text-[#17152A]">
          <BookOpen size={20} className="text-[#3F328A]" />
          <h2>Official CBT Instructions &amp; Examination Guidelines</h2>
        </div>

        <div className="space-y-4 text-xs text-[#6E6990] leading-relaxed">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <Info size={18} className="text-[#3F328A] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#17152A] block mb-1">Standard CBT Countdown Clock</strong>
              <span>
                The clock in the examination interface will display remaining time. Once the countdown timer reaches zero, your test session will automatically submit.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <CheckCircle2 size={18} className="text-[#1FA660] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#17152A] block mb-1">Question Palette Status Legend</strong>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 font-medium">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Answered</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Not Answered</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Review Flagged</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Not Visited</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-950 block mb-1">Academic Integrity &amp; Browser Security</strong>
              <span>
                Full-screen mode will be required during live examination. Leaving full screen or switching tabs registers an anomaly warning with the proctoring monitor.
              </span>
            </div>
          </div>
        </div>

        {/* Readiness Checkbox */}
        <div className="pt-4 border-t border-[#E7E3F5]">
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-[#F6F4FF] border border-[#E2DCFB] cursor-pointer hover:bg-[#F0EDFD] transition">
            <input
              type="checkbox"
              checked={isReadyConfirmed}
              onChange={(e) => setIsReadyConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-[#3F328A] border-[#C2BAEB] rounded focus:ring-[#3F328A]"
            />
            <span className="text-xs font-semibold text-[#17152A] leading-relaxed">
              I have read and understood all CBT examination instructions, sectional rules, and marking schemes. I confirm that I am ready to begin the timed test session.
            </span>
          </label>
        </div>

        {/* Error Alert if Starting Fails */}
        {startError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-3">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <div className="flex-1 font-semibold">{startError}</div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <Link
            href="/student/tests"
            className="px-5 py-2.5 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#6E6990] hover:text-[#17152A] hover:bg-slate-50 transition text-center"
          >
            Back to Test Series
          </Link>

          <button
            onClick={handleStartAttempt}
            disabled={!isReadyConfirmed || isStarting}
            className={`px-8 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all ${
              isReadyConfirmed && !isStarting
                ? 'bg-[#3F328A] hover:bg-[#2A2356] text-white hover:shadow-md cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isStarting ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                <span>Initializing Secure Session...</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-current" />
                <span>I Am Ready to Begin</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
