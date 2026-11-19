'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  FileText,
  BarChart3,
  Layers,
  Bookmark,
  ShieldCheck,
  ArrowRight,
  Lock,
  RefreshCw,
  Info,
  Calendar,
  Check,
  Minus,
  Sparkles,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import type { AttemptScorecardDTO } from '@/lib/db/test-evaluation';

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default function StudentTestResultPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const attemptId = resolvedParams.attemptId;

  const [scorecard, setScorecard] = useState<AttemptScorecardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'chapters' | 'questions'>('overview');

  useEffect(() => {
    let isMounted = true;

    async function fetchScorecard() {
      setIsLoading(true);
      setError(null);
      setIsInProgress(false);

      try {
        const res = await fetch(`/api/student/tests/attempts/${encodeURIComponent(attemptId)}/result`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Authentication required. Please log in to view examination results.');
          }
          if (res.status === 403) {
            throw new Error('Access forbidden: this examination attempt belongs to another candidate.');
          }
          if (res.status === 404) {
            throw new Error(`Test attempt record "${attemptId}" was not found.`);
          }
          if (res.status === 400 && json.error?.toLowerCase().includes('in progress')) {
            if (isMounted) setIsInProgress(true);
            throw new Error('This test session is currently active and has not been submitted.');
          }
          throw new Error(json.error || `Failed to retrieve test scorecard (HTTP ${res.status}).`);
        }

        if (json.success && json.data) {
          if (isMounted) {
            setScorecard(json.data);
          }
        } else {
          throw new Error(json.error || 'Failed to parse scorecard payload.');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'An error occurred while loading your test results.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (attemptId) {
      fetchScorecard();
    }

    return () => {
      isMounted = false;
    };
  }, [attemptId]);

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-6">
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-16 text-center shadow-xs space-y-4">
          <LoadingSpinner size="lg" className="mx-auto text-[#5034EB]" />
          <h3 className="font-extrabold text-base text-[#17152A]">Loading Examination Scorecard...</h3>
          <p className="text-xs text-[#6E6990] max-w-md mx-auto">
            Retrieving authoritative evaluated marks, section breakdowns, and submission records for attempt{' '}
            <span className="font-mono text-[#5034EB] font-bold">{attemptId}</span>.
          </p>
        </div>
      </div>
    );
  }

  // Active / In-Progress Attempt Guard
  if (isInProgress) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-10 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Clock size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#17152A]">Test Session In Progress</h2>
            <p className="text-xs text-[#6E6990] leading-relaxed max-w-md mx-auto">
              This examination attempt is currently active. The official scorecard and evaluation analytics will only
              become available after you finalize and submit your test.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/student/tests/session/${encodeURIComponent(attemptId)}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs w-full sm:w-auto"
            >
              Resume Test Session <ArrowRight size={16} />
            </Link>
            <Link
              href="/student/tests"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#E7E3F5] text-[#6E6990] hover:text-[#17152A] text-xs font-bold hover:bg-[#F6F4FD] transition-all w-full sm:w-auto"
            >
              <ChevronLeft size={16} /> Return to Test Series
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found / Forbidden View
  if (error || !scorecard) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-10 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#17152A]">Unable to Load Scorecard</h2>
            <p className="text-xs text-[#6E6990] leading-relaxed max-w-md mx-auto">
              {error || 'The requested examination record could not be processed.'}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/student/tests"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs"
            >
              <ChevronLeft size={16} /> Return to Test Series
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPassing = scorecard.percentageScore >= 40;

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* 1. Breadcrumbs & Top Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#6E6990] font-medium">
        <Link href="/student/dashboard" className="hover:text-[#17152A] transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/student/tests" className="hover:text-[#17152A] transition-colors">
          Test Series
        </Link>
        <span>/</span>
        <span className="text-[#17152A] font-bold">Results &amp; Scorecard</span>
      </nav>

      {/* 2. Result Header Banner */}
      <div className="bg-gradient-to-r from-[#17152A] via-[#241E47] to-[#392E7B] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#5034EB] text-white">
              {scorecard.examTag} CBT
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-slate-200">
              Target Year {scorecard.targetYear}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Status: Finalized &amp; Evaluated</span>
            </span>
            {scorecard.submissionReason === 'TIMEOUT' ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Clock size={12} />
                <span>Auto-Submitted on Expiry</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                <Check size={12} />
                <span>Manual Submission</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
            {scorecard.paperTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300 pt-1 font-mono">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-[#A29CD8]" />
              Submitted: {new Date(scorecard.submittedAt).toLocaleDateString()} at{' '}
              {new Date(scorecard.submittedAt).toLocaleTimeString()}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#A29CD8]" />
              Time Spent: {scorecard.formattedTimeTaken} (Allocated: {scorecard.timeAllocatedMinutes}m)
            </span>
            <span className="flex items-center gap-1.5">
              <FileText size={14} className="text-[#A29CD8]" />
              Attempt ID: {scorecard.attemptId}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Primary Scorecard Hero Card */}
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E7E3F5]">
          {/* Col 1: Net Score Presentation */}
          <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-1 md:pr-6">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#6E6990]">Total Score Obtained</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl sm:text-5xl font-black tracking-tight ${scorecard.finalScore < 0 ? 'text-red-600' : 'text-[#5034EB]'}`}>
                {scorecard.finalScore}
              </span>
              <span className="text-lg font-bold text-[#6E6990]">/ {scorecard.maximumMarks}</span>
            </div>
            <p className="text-xs text-[#6E6990]">
              Score Percentage:{' '}
              <strong className={isPassing ? 'text-emerald-600' : 'text-amber-600'}>
                {scorecard.percentageScore}%
              </strong>
            </p>
          </div>

          {/* Col 2: Accuracy & Examination Gauge */}
          <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-2 pt-6 md:pt-0 md:px-6">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#6E6990]">Accuracy Rate</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F6F4FD] text-[#5034EB]">
                CBT Metric
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-[#17152A]">
                {scorecard.accuracy}%
              </span>
              <span className="text-xs text-[#6E6990]">
                ({scorecard.correctQuestions} correct of {scorecard.attemptedQuestions} attempted)
              </span>
            </div>
            <div className="w-full bg-[#E7E3F5] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#5034EB] to-emerald-500 h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, scorecard.accuracy))}%` }}
              />
            </div>
          </div>

          {/* Col 3: Mark Breakdown & Final Evaluation Status */}
          <div className="flex flex-col justify-center space-y-3 pt-6 md:pt-0 md:pl-6 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-800 font-medium">Positive Marks Earned:</span>
              <span className="font-black text-emerald-700">+{scorecard.positiveMarks}.00</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-red-50 border border-red-100">
              <span className="text-red-800 font-medium">Penalty Deductions:</span>
              <span className="font-black text-red-700">-{scorecard.negativeMarks}.00</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-[#E7E3F5]">
              <span className="text-[#6E6990] font-medium">Time Efficiency:</span>
              <span className="font-black text-[#17152A] font-mono">{scorecard.formattedTimeTaken}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Performance Summary Grid (8 Metrics) */}
      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#6E6990]">Performance Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-[#E7E3F5] p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] block">Total Questions</span>
            <span className="text-2xl font-black text-[#17152A]">{scorecard.totalQuestions}</span>
            <span className="text-[11px] text-[#6E6990] block">Paper Allocation</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E7E3F5] p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] block">Attempted</span>
            <span className="text-2xl font-black text-[#5034EB]">{scorecard.attemptedQuestions}</span>
            <span className="text-[11px] text-[#6E6990] block">
              {scorecard.totalQuestions > 0
                ? `${Math.round((scorecard.attemptedQuestions / scorecard.totalQuestions) * 100)}% coverage`
                : '0% coverage'}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Correct Answers</span>
            <span className="text-2xl font-black text-emerald-700">{scorecard.correctQuestions}</span>
            <span className="text-[11px] text-emerald-600 block">+{scorecard.positiveMarks} marks</span>
          </div>

          <div className="bg-white rounded-2xl border border-red-100 bg-red-50/40 p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">Incorrect Answers</span>
            <span className="text-2xl font-black text-red-700">{scorecard.incorrectQuestions}</span>
            <span className="text-[11px] text-red-600 block">-{scorecard.negativeMarks} penalty marks</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E7E3F5] p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] block">Unattempted</span>
            <span className="text-2xl font-black text-slate-700">{scorecard.unattemptedQuestions}</span>
            <span className="text-[11px] text-[#6E6990] block">0 marks impact</span>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 bg-purple-50/40 p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Marked for Review</span>
            <span className="text-2xl font-black text-purple-700">{scorecard.markedForReviewCount}</span>
            <span className="text-[11px] text-purple-600 block">
              {scorecard.answeredAndMarkedCount} scored, {scorecard.unansweredMarkedCount} unattempted
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E7E3F5] p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] block">Accuracy</span>
            <span className="text-2xl font-black text-[#17152A]">{scorecard.accuracy}%</span>
            <span className="text-[11px] text-[#6E6990] block">Correct / Attempted</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E7E3F5] p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] block">Net Score</span>
            <span className={`text-2xl font-black ${scorecard.finalScore < 0 ? 'text-red-600' : 'text-[#5034EB]'}`}>
              {scorecard.finalScore}
            </span>
            <span className="text-[11px] text-[#6E6990] block">Max {scorecard.maximumMarks}</span>
          </div>
        </div>
      </div>

      {/* 5. Navigation Tab Pills for Detailed Breakdowns */}
      <div className="flex items-center gap-2 border-b border-[#E7E3F5] pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#5034EB] text-white shadow-xs'
              : 'text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD]'
          }`}
        >
          Subject Analysis ({scorecard.subjectBreakdown.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chapters')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'chapters'
              ? 'bg-[#5034EB] text-white shadow-xs'
              : 'text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD]'
          }`}
        >
          Chapter Analysis ({scorecard.chapterBreakdown.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-[#5034EB] text-white shadow-xs'
              : 'text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD]'
          }`}
        >
          Question Review ({scorecard.questionsReview.length})
        </button>
      </div>

      {/* 6. Section Content */}

      {/* TAB A: Subject-wise Performance Breakdown */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl border border-[#E7E3F5] overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#E7E3F5] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-black text-sm text-[#17152A]">Subject-wise Examination Performance</h3>
              <p className="text-xs text-[#6E6990]">Aggregated directly from authoritative question-level evaluation records.</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#5034EB] bg-[#F6F4FD] px-3 py-1 rounded-xl">
              {scorecard.subjectBreakdown.length} Subjects Evaluated
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F4FD] text-[#6E6990] font-black uppercase tracking-wider text-[10px] border-b border-[#E7E3F5]">
                <tr>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4 text-center">Total Questions</th>
                  <th className="py-3.5 px-4 text-center">Attempted</th>
                  <th className="py-3.5 px-4 text-center">Correct</th>
                  <th className="py-3.5 px-4 text-center">Incorrect</th>
                  <th className="py-3.5 px-4 text-center">Unattempted</th>
                  <th className="py-3.5 px-4 text-center">Marks Obtained</th>
                  <th className="py-3.5 px-4 text-center">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E3F5]">
                {scorecard.subjectBreakdown.map((sub) => (
                  <tr key={sub.subjectId} className="hover:bg-[#FAFAFD] transition-colors">
                    <td className="py-4 px-4 font-bold text-[#17152A] flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#5034EB]" />
                      <span>{sub.subjectName}</span>
                    </td>
                    <td className="py-4 px-4 text-center font-medium">{sub.totalQuestions}</td>
                    <td className="py-4 px-4 text-center font-bold text-[#5034EB]">{sub.attemptedQuestions}</td>
                    <td className="py-4 px-4 text-center font-bold text-emerald-600">{sub.correctQuestions}</td>
                    <td className="py-4 px-4 text-center font-bold text-red-600">{sub.incorrectQuestions}</td>
                    <td className="py-4 px-4 text-center text-[#6E6990]">{sub.unattemptedQuestions}</td>
                    <td className="py-4 px-4 text-center font-black">
                      <span className={sub.marksObtained < 0 ? 'text-red-600' : 'text-[#17152A]'}>
                        {sub.marksObtained}
                      </span>
                      <span className="text-[#6E6990] font-normal"> / {sub.maximumMarks}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-[#17152A]">{sub.accuracy}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F6F4FD]/60 font-black text-[#17152A] border-t border-[#E7E3F5]">
                <tr>
                  <td className="py-3 px-4">Total Reconciled</td>
                  <td className="py-3 px-4 text-center">{scorecard.totalQuestions}</td>
                  <td className="py-3 px-4 text-center text-[#5034EB]">{scorecard.attemptedQuestions}</td>
                  <td className="py-3 px-4 text-center text-emerald-600">{scorecard.correctQuestions}</td>
                  <td className="py-3 px-4 text-center text-red-600">{scorecard.incorrectQuestions}</td>
                  <td className="py-3 px-4 text-center text-[#6E6990]">{scorecard.unattemptedQuestions}</td>
                  <td className="py-3 px-4 text-center font-black text-[#5034EB]">
                    {scorecard.finalScore} / {scorecard.maximumMarks}
                  </td>
                  <td className="py-3 px-4 text-center">{scorecard.accuracy}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB B: Chapter-wise Performance Breakdown */}
      {activeTab === 'chapters' && (
        <div className="bg-white rounded-3xl border border-[#E7E3F5] overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#E7E3F5]">
            <h3 className="font-black text-sm text-[#17152A]">Chapter-wise Performance Breakdown</h3>
            <p className="text-xs text-[#6E6990]">Granular topic and chapter level accuracy analysis.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F4FD] text-[#6E6990] font-black uppercase tracking-wider text-[10px] border-b border-[#E7E3F5]">
                <tr>
                  <th className="py-3.5 px-4">Chapter</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4 text-center">Questions</th>
                  <th className="py-3.5 px-4 text-center">Attempted</th>
                  <th className="py-3.5 px-4 text-center">Correct</th>
                  <th className="py-3.5 px-4 text-center">Incorrect</th>
                  <th className="py-3.5 px-4 text-center">Marks</th>
                  <th className="py-3.5 px-4 text-center">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E3F5]">
                {scorecard.chapterBreakdown.map((ch) => (
                  <tr key={ch.chapterId} className="hover:bg-[#FAFAFD] transition-colors">
                    <td className="py-4 px-4 font-bold text-[#17152A]">{ch.chapterName}</td>
                    <td className="py-4 px-4 text-[#6E6990]">{ch.subjectName}</td>
                    <td className="py-4 px-4 text-center font-medium">{ch.totalQuestions}</td>
                    <td className="py-4 px-4 text-center font-bold text-[#5034EB]">{ch.attemptedQuestions}</td>
                    <td className="py-4 px-4 text-center font-bold text-emerald-600">{ch.correctQuestions}</td>
                    <td className="py-4 px-4 text-center font-bold text-red-600">{ch.incorrectQuestions}</td>
                    <td className="py-4 px-4 text-center font-black">
                      <span className={ch.marksObtained < 0 ? 'text-red-600' : 'text-[#17152A]'}>
                        {ch.marksObtained}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-[#17152A]">{ch.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB C: Question Review & Official Answer Policy */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Answer Release Policy Alert Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-xs text-amber-900 flex items-start gap-3">
            <Lock size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-black text-amber-950">Answer Key &amp; Explanations Notice</h4>
              <p className="text-amber-800 leading-relaxed">
                {scorecard.answerReleasePolicy.message}
              </p>
              <p className="text-[11px] text-amber-700/80">
                Your submitted responses and authoritative question evaluation outcomes are shown below. Correct answer keys and explanations remain protected.
              </p>
            </div>
          </div>

          {/* Question-by-Question Evaluation Table */}
          <div className="bg-white rounded-3xl border border-[#E7E3F5] overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#E7E3F5] flex items-center justify-between">
              <h3 className="font-black text-sm text-[#17152A]">Candidate Question Summary</h3>
              <span className="text-xs font-mono text-[#6E6990]">
                {scorecard.questionsReview.length} Questions in Paper
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F4FD] text-[#6E6990] font-black uppercase tracking-wider text-[10px] border-b border-[#E7E3F5]">
                  <tr>
                    <th className="py-3.5 px-4 text-center">Q#</th>
                    <th className="py-3.5 px-4">Subject &amp; Chapter</th>
                    <th className="py-3.5 px-4 text-center">Type</th>
                    <th className="py-3.5 px-4 text-center">Your Response</th>
                    <th className="py-3.5 px-4 text-center">Review Flag</th>
                    <th className="py-3.5 px-4 text-center">Outcome</th>
                    <th className="py-3.5 px-4 text-center">Marks Awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E3F5]">
                  {scorecard.questionsReview.map((q) => {
                    let outcomeBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <Minus size={11} /> Unattempted
                      </span>
                    );
                    if (q.evaluationStatus === 'CORRECT') {
                      outcomeBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> Correct
                        </span>
                      );
                    } else if (q.evaluationStatus === 'INCORRECT') {
                      outcomeBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <XCircle size={11} /> Incorrect
                        </span>
                      );
                    }

                    return (
                      <tr key={q.questionId} className="hover:bg-[#FAFAFD] transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#17152A]">
                          Q{q.questionNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#17152A]">{q.subjectName}</div>
                          <div className="text-[11px] text-[#6E6990]">{q.chapterName}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#F6F4FD] text-[#5034EB]">
                            {q.questionType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {q.studentSelectedOption ? (
                            <span className="px-2.5 py-1 rounded-lg bg-[#5034EB]/10 text-[#5034EB]">
                              Option {q.studentSelectedOption}
                            </span>
                          ) : q.studentNumericalValue ? (
                            <span className="px-2.5 py-1 rounded-lg bg-[#5034EB]/10 text-[#5034EB]">
                              {q.studentNumericalValue}
                            </span>
                          ) : (
                            <span className="text-[#6E6990] font-normal italic">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {q.isMarkedForReview ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Bookmark size={11} /> Flagged
                            </span>
                          ) : (
                            <span className="text-[#6E6990]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">{outcomeBadge}</td>
                        <td className="py-3.5 px-4 text-center font-black">
                          {q.marksAwarded > 0 && (
                            <span className="text-emerald-600">+{q.marksAwarded}</span>
                          )}
                          {q.marksAwarded < 0 && (
                            <span className="text-red-600">{q.marksAwarded}</span>
                          )}
                          {q.marksAwarded === 0 && (
                            <span className="text-[#6E6990]">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. Action Buttons Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E7E3F5]">
        <Link
          href="/student/tests"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs w-full sm:w-auto"
        >
          <ChevronLeft size={16} /> Return to Test Series
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href={`/student/tests/${scorecard.paperId}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD] transition-colors w-full sm:w-auto"
          >
            <Info size={15} /> View Test Instructions
          </Link>
          <Link
            href="/student/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD] transition-colors w-full sm:w-auto"
          >
            Dashboard <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
