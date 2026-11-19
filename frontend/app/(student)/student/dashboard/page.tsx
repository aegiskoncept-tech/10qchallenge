'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  GraduationCap,
  Play,
  FileQuestion,
  HelpCircle,
  Clock,
  ArrowRight,
  Trophy,
  Sparkles,
  CheckCircle2,
  BarChart2,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Award,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import type { StudentDashboardDTO } from '@/lib/db/student-dashboard';

export default function StudentDashboardPage() {
  const [dashboardData, setDashboardData] = useState<StudentDashboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/dashboard');
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please log in to access your student dashboard.');
        }
        throw new Error(json.error || `Failed to load dashboard (HTTP ${res.status}).`);
      }

      if (json.success && json.data) {
        setDashboardData(json.data);
      } else {
        throw new Error(json.error || 'Failed to parse student dashboard payload.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to student dashboard service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 space-y-6">
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-16 text-center shadow-xs space-y-4">
          <LoadingSpinner size="lg" className="mx-auto text-[#5034EB]" />
          <h3 className="font-extrabold text-base text-[#17152A]">Loading Student Workspace...</h3>
          <p className="text-xs text-[#6E6990] max-w-md mx-auto">
            Retrieving authenticated enrollments, examination attempt records, and faculty doubts.
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !dashboardData) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-10 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#17152A]">Dashboard Unavailable</h2>
            <p className="text-xs text-[#6E6990] leading-relaxed max-w-sm mx-auto">
              {error || 'Unable to load student metrics at this time.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw size={14} /> Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { student, overview, tests, courses, doubts } = dashboardData;
  const firstName = student.fullName.split(' ')[0] || 'Student';

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* 1. WELCOME HERO BANNER */}
      <div className="bg-gradient-to-r from-[#17152A] via-[#2F2468] to-[#43358E] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold">
                <Sparkles size={13} />
                <span>{student.targetExam || 'Target: BITSAT 2026'}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-mono">
                {student.email}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {firstName}! 🚀
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 max-w-xl leading-relaxed">
              {tests.latestScore
                ? `Great job on your recent mock! You scored ${tests.latestScore.finalScore} / ${tests.latestScore.maximumMarks} (${tests.latestScore.accuracy}% accuracy) in ${tests.latestScore.paperTitle}.`
                : 'Your personalized preparation hub. Review enrolled courses, practice real-exam CBT mocks, and track your accuracy.'}
            </p>
          </div>

          {/* Quick Action Button Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-48">
            <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
              CBT Test Series
            </span>
            <div className="text-xl font-black text-amber-300 mt-1">
              {overview.availableTestsCount} Mock Papers
            </div>
            <Link
              href="/student/tests"
              className="mt-2.5 inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-white text-[#17152A] hover:bg-slate-100 font-bold text-xs transition-colors shadow-xs"
            >
              <span>Explore Tests</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. FOUR KEY METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Enrolled Courses */}
        <div className="p-5 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-xs font-semibold">Enrolled Courses</span>
            <GraduationCap size={18} className="text-[#5034EB]" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">{overview.enrolledCoursesCount}</div>
          <span className="text-[10px] text-[#5034EB] font-bold">
            {overview.enrolledCoursesCount > 0 ? 'Active Enrollments' : 'Catalog Available'}
          </span>
        </div>

        {/* Card 2: Completed Tests */}
        <div className="p-5 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-xs font-semibold">Completed CBT Mocks</span>
            <FileQuestion size={18} className="text-[#FF3F68]" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">{overview.completedTestsCount}</div>
          <span className="text-[10px] text-[#6E6990] font-bold">
            {overview.attemptedTestsCount} Total Started
          </span>
        </div>

        {/* Card 3: Average Accuracy */}
        <div className="p-5 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-xs font-semibold">Average Accuracy</span>
            <Trophy size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">
            {overview.averageAccuracy !== null ? `${overview.averageAccuracy}%` : 'N/A'}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">
            {overview.averageScorePercentage !== null ? `${overview.averageScorePercentage}% Avg Score` : 'Across Completed Tests'}
          </span>
        </div>

        {/* Card 4: Faculty Doubts */}
        <div className="p-5 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-xs font-semibold">Faculty Doubts</span>
            <HelpCircle size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">{overview.totalDoubtsCount}</div>
          <span className="text-[10px] text-emerald-700 font-bold">
            {overview.resolvedDoubtsCount} Resolved • {overview.pendingDoubtsCount} Pending
          </span>
        </div>
      </div>

      {/* 3. LATEST CBT RESULT SPOTLIGHT (If completed at least 1 test) */}
      {tests.latestScore && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E3F5] shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#5034EB]/10 text-[#5034EB] flex items-center justify-center font-bold">
                <Award size={18} />
              </div>
              <h3 className="font-extrabold text-base text-[#17152A]">Latest Examination Scorecard</h3>
            </div>
            <span className="text-xs text-[#6E6990] font-mono">
              Submitted: {new Date(tests.latestScore.submittedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 items-center justify-between p-5 rounded-2xl bg-[#F6F4FD] border border-[#E7E3F5]">
            <div className="space-y-1.5 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#5034EB] text-white">
                  {tests.latestScore.examTag} CBT
                </span>
                <span className="text-xs font-mono text-[#6E6990]">
                  Attempt ID: {tests.latestScore.attemptId}
                </span>
              </div>
              <h4 className="font-black text-base text-[#17152A]">{tests.latestScore.paperTitle}</h4>
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                <span className="font-bold text-[#5034EB]">
                  Score: {tests.latestScore.finalScore} / {tests.latestScore.maximumMarks} ({tests.latestScore.percentageScore}%)
                </span>
                <span className="text-emerald-700 font-bold">
                  Accuracy: {tests.latestScore.accuracy}%
                </span>
              </div>
            </div>

            <Link
              href={`/student/tests/results/${encodeURIComponent(tests.latestScore.attemptId)}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs shrink-0"
            >
              <span>View Full Scorecard</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* 4. MAIN TWO-COLUMN SECTION: ENROLLED COURSES & RECENT TEST ATTEMPTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: My Courses (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-[#17152A]">My Enrolled Courses</h3>
            <Link href="/course-all" className="text-xs font-bold text-[#5034EB] hover:underline">
              Browse Catalog
            </Link>
          </div>

          {courses.enrolledCourses.length > 0 ? (
            <div className="space-y-3">
              {courses.enrolledCourses.map((c) => (
                <div
                  key={c.enrollmentId}
                  className="bg-white p-4 rounded-2xl border border-[#E7E3F5] hover:border-[#5034EB]/30 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-11 h-11 rounded-xl bg-[#F6F4FD] text-[#5034EB] flex items-center justify-center font-bold shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5034EB] block">
                        {c.examTag}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-[#17152A] truncate">
                        {c.title}
                      </h4>
                      <p className="text-[11px] text-[#6E6990]">
                        Enrolled: {new Date(c.enrolledAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/student/courses/${c.courseId}`}
                    className="px-4 py-2 rounded-xl bg-[#F6F4FD] hover:bg-[#5034EB] text-[#5034EB] hover:text-white font-bold text-xs transition-colors shrink-0"
                  >
                    Open Course
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E7E3F5] p-8 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F6F4FD] text-[#5034EB] flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-[#17152A]">No Enrolled Courses Yet</h4>
                <p className="text-xs text-[#6E6990] max-w-sm mx-auto leading-relaxed">
                  You do not have any active course enrollments. Explore our high-yield crash courses to boost your preparation.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/course-all"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <span>Explore Courses</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent CBT Test Activity (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-[#17152A]">Recent Test Activity</h3>
            <Link href="/student/tests" className="text-xs font-bold text-[#5034EB] hover:underline">
              View All Tests
            </Link>
          </div>

          {tests.recentResults.length > 0 ? (
            <div className="space-y-3">
              {tests.recentResults.map((t) => {
                const isComp = t.status === 'COMPLETED';

                return (
                  <div
                    key={t.attemptId}
                    className="bg-white p-4 rounded-2xl border border-[#E7E3F5] flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isComp
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-[10px] text-[#6E6990] font-mono">
                          {t.examTag}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-[#17152A] truncate">{t.paperTitle}</h4>
                      <div className="text-[11px] text-[#6E6990]">
                        {isComp && t.finalScore !== null ? (
                          <span className="font-bold text-[#5034EB]">
                            Score: {t.finalScore} / {t.maximumMarks} ({t.accuracy}% Acc)
                          </span>
                        ) : (
                          <span>Started: {new Date(t.startedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {isComp ? (
                      <Link
                        href={`/student/tests/results/${encodeURIComponent(t.attemptId)}`}
                        className="px-3.5 py-2 rounded-xl bg-[#F6F4FD] hover:bg-[#5034EB] text-[#5034EB] hover:text-white font-bold text-xs transition-colors shrink-0"
                      >
                        Result
                      </Link>
                    ) : (
                      <Link
                        href={`/student/tests/session/${encodeURIComponent(t.attemptId)}`}
                        className="px-3.5 py-2 rounded-xl bg-[#FF3F68] hover:bg-[#E02E53] text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1"
                      >
                        <span>Resume</span>
                        <Play size={10} className="fill-white" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E7E3F5] p-8 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <FileQuestion size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-[#17152A]">No Tests Attempted Yet</h4>
                <p className="text-xs text-[#6E6990] max-w-sm mx-auto leading-relaxed">
                  Put your preparation to the test with official BITSAT and JEE Main simulated mock papers.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/student/tests"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FF3F68] hover:bg-[#E02E53] text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <span>Start a Mock Test</span>
                  <Play size={11} className="fill-white" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. FACULTY DOUBTS HUB SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E3F5] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1EFFB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#17152A]">
                Faculty Doubt Resolution
              </h3>
              <p className="text-xs text-[#6E6990]">
                Direct academic doubts resolved by experienced BITS Pilani &amp; IIT faculty.
              </p>
            </div>
          </div>
          <Link
            href="/student/doubts"
            className="text-xs font-bold text-[#5034EB] hover:underline"
          >
            Open Doubt Hub
          </Link>
        </div>

        {doubts.recentDoubts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doubts.recentDoubts.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-2xl border border-[#E7E3F5] bg-[#FAFAFD] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F0EDFD] text-[#5034EB]">
                      {d.subject || d.courseTitle}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        d.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#17152A] line-clamp-2">{d.queryText}</p>
                </div>

                <div className="pt-2 border-t border-[#E7E3F5] text-[11px] text-[#6E6990] flex items-center justify-between">
                  <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                  <Link
                    href="/student/doubts"
                    className="font-bold text-[#5034EB] hover:underline flex items-center gap-0.5"
                  >
                    View <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-[#6E6990]">You have not submitted any academic doubts yet.</p>
            <Link
              href="/student/doubts"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5034EB] hover:underline"
            >
              <span>Ask a Doubt</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
