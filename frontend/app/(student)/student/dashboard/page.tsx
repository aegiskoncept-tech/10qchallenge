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
  Flame,
  Target,
  Compass,
  Zap,
  TrendingUp,
  AlertTriangle,
  FileText,
  Video,
  Layers,
  Check,
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
      const res = await fetch('/api/student/dashboard', { cache: 'no-store' });
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
          <h3 className="font-extrabold text-base text-[#17152A]">Loading Student Command Center...</h3>
          <p className="text-xs text-[#6E6990] max-w-md mx-auto">
            Aggregating authoritative course progress, video lectures, CBT mock scores, and personalized recommendations.
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

  const {
    student,
    overview,
    continueLearning,
    courses,
    contentProgress,
    testAnalytics,
    upcomingTests,
    recommendations,
    streak,
    recentActivity,
    doubts,
  } = dashboardData;

  const firstName = student.fullName.split(' ')[0] || 'Student';

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* =========================================================================
          SECTION 1: HERO COMMAND BANNER (What am I currently studying?)
         ========================================================================= */}
      <div className="bg-gradient-to-r from-[#17152A] via-[#2F2468] to-[#43358E] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-xs">
                <Sparkles size={13} />
                <span>{student.targetExam || 'Target: BITSAT & JEE 2026'}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-rose-300 text-xs font-bold backdrop-blur-xs">
                <Flame size={13} className="text-rose-400" />
                <span>{streak.currentStreakDays} Day Streak</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-mono">
                Academic Session 2025–2026
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to your Learning Command Center, {firstName}! 🚀
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
              {continueLearning
                ? `You are currently studying ${continueLearning.courseTitle}. You have completed ${continueLearning.progressPercentage}% of the curriculum.`
                : 'Track your syllabus progress, watch HD video lectures, review curated study notes, and evaluate your readiness with real-exam CBT mock tests.'}
            </p>
          </div>

          {/* Quick Action Hub */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {continueLearning && (
              <Link
                href={continueLearning.resumeUrl}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#17152A] hover:bg-slate-100 font-bold text-xs transition-all shadow-md"
              >
                <Play size={14} className="fill-[#17152A]" />
                <span>Continue Learning</span>
              </Link>
            )}
            <Link
              href="/student/tests"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FF3F68] hover:bg-[#E02E53] text-white font-bold text-xs transition-all shadow-md"
            >
              <FileQuestion size={14} />
              <span>CBT Mock Series</span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: SIX OVERVIEW STATISTICS CARDS (How much have I completed?)
         ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Enrolled Courses */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-[11px] font-semibold">Enrolled Courses</span>
            <GraduationCap size={16} className="text-[#5034EB]" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">{overview.enrolledCoursesCount}</div>
          <span className="text-[10px] text-[#5034EB] font-bold block">
            {overview.completedCoursesCount} Completed
          </span>
        </div>

        {/* Card 2: Overall Progress */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-[11px] font-semibold">Course Progress</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">{overview.overallProgressPercentage}%</div>
          <div className="w-full bg-[#E7E3F5] h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overview.overallProgressPercentage)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Lessons Completed */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-[11px] font-semibold">Lessons Finished</span>
            <BookOpen size={16} className="text-[#5034EB]" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">{overview.lessonsCompletedCount}</div>
          <span className="text-[10px] text-[#6E6990] font-bold block">
            Topics, Videos &amp; Notes
          </span>
        </div>

        {/* Card 4: CBT Tests Completed */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-[11px] font-semibold">Completed Tests</span>
            <FileQuestion size={16} className="text-[#FF3F68]" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">{overview.completedTestsCount}</div>
          <span className="text-[10px] text-[#6E6990] font-bold block">
            {overview.attemptedTestsCount} Total Attempts
          </span>
        </div>

        {/* Card 5: Average Accuracy */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-[11px] font-semibold">Test Accuracy</span>
            <Trophy size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">
            {overview.averageAccuracy !== null ? `${overview.averageAccuracy}%` : 'N/A'}
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block">
            {overview.averageScorePercentage !== null ? `${overview.averageScorePercentage}% Avg Score` : 'No Tests Yet'}
          </span>
        </div>

        {/* Card 6: Study Time & Streak */}
        <div className="p-4 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6990]">
            <span className="text-[11px] font-semibold">Learning Streak</span>
            <Flame size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-[#17152A]">
            {overview.currentStreakDays} <span className="text-xs font-bold text-[#6E6990]">Days</span>
          </div>
          <span className="text-[10px] text-[#6E6990] font-bold block">
            {Math.floor(overview.studyTimeMinutes / 60)}h {overview.studyTimeMinutes % 60}m Studied
          </span>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: CONTINUE LEARNING SPOTLIGHT
         ========================================================================= */}
      {continueLearning && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E3F5] shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#F1EFFB]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#5034EB]/10 text-[#5034EB] flex items-center justify-center font-bold">
                <Play size={16} className="fill-[#5034EB]" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#17152A]">Continue Your Learning</h3>
                <p className="text-xs text-[#6E6990]">Resume where you left off in your active course curriculum.</p>
              </div>
            </div>
            <span className="text-xs text-[#6E6990] font-mono">
              Last accessed: {new Date(continueLearning.lastActivityAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-center justify-between p-5 rounded-2xl bg-[#F6F4FD] border border-[#E7E3F5]">
            <div className="space-y-2 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#5034EB] text-white">
                  {continueLearning.examTag}
                </span>
                {continueLearning.subjectName && (
                  <span className="text-xs font-bold text-[#5034EB]">
                    {continueLearning.subjectName}
                  </span>
                )}
                {continueLearning.chapterName && (
                  <span className="text-xs text-[#6E6990]">
                    • {continueLearning.chapterName}
                  </span>
                )}
              </div>

              <h4 className="font-black text-lg text-[#17152A]">{continueLearning.courseTitle}</h4>
              <p className="text-xs font-medium text-[#6E6990]">
                Current Lesson: <strong className="text-[#17152A]">{continueLearning.lessonTitle}</strong>
              </p>

              <div className="w-full sm:w-80 pt-1 space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-[#6E6990]">Course Completion</span>
                  <span className="text-[#5034EB]">{continueLearning.progressPercentage}%</span>
                </div>
                <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-[#E7E3F5]">
                  <div
                    className="bg-[#5034EB] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, continueLearning.progressPercentage)}%` }}
                  />
                </div>
              </div>
            </div>

            <Link
              href={continueLearning.resumeUrl}
              className="w-full md:w-auto px-7 py-3.5 rounded-2xl bg-[#5034EB] hover:bg-[#432bc4] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shrink-0"
            >
              <span>Resume Classroom</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: PERSONALIZED LEARNING RECOMMENDATIONS (What should I study next?)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Compass size={16} />
            </div>
            <h3 className="font-extrabold text-lg text-[#17152A]">Personalized Study Recommendations</h3>
          </div>
          <span className="text-xs font-bold text-[#6E6990]">Data-Driven Guidance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((rec) => {
            const isHigh = rec.priority === 'HIGH';
            const isRevision = rec.category === 'REVISION';

            return (
              <div
                key={rec.id}
                className="bg-white p-5 rounded-2xl border border-[#E7E3F5] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#5034EB]/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isRevision
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : isHigh
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-[#F0EDFD] text-[#5034EB]'
                      }`}
                    >
                      {rec.category}
                    </span>
                    {isHigh && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                        <Zap size={11} /> Priority
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-[#17152A]">{rec.title}</h4>
                  <p className="text-xs text-[#6E6990] leading-relaxed">{rec.reason}</p>
                </div>

                <div className="pt-2 border-t border-[#F1EFFB]">
                  <Link
                    href={rec.actionUrl}
                    className="inline-flex items-center justify-between w-full text-xs font-bold text-[#5034EB] hover:text-[#432bc4] transition-colors"
                  >
                    <span>{rec.actionLabel}</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: MY COURSES & SYLLABUS COMPLETION
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#5034EB]/10 text-[#5034EB] flex items-center justify-center font-bold">
              <BookOpen size={16} />
            </div>
            <h3 className="font-extrabold text-lg text-[#17152A]">My Enrolled Courses</h3>
          </div>
          <Link href="/course-all" className="text-xs font-bold text-[#5034EB] hover:underline">
            Browse All Courses
          </Link>
        </div>

        {courses.enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.enrolledCourses.map((c) => (
              <div
                key={c.enrollmentId}
                className="bg-white p-5 rounded-2xl border border-[#E7E3F5] shadow-xs space-y-4 hover:border-[#5034EB]/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5034EB] block">
                        {c.examTag} Crash Course
                      </span>
                      <h4 className="font-extrabold text-base text-[#17152A] leading-snug">{c.title}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {c.accessState}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#6E6990]">Curriculum Progress</span>
                      <span className="text-[#5034EB] font-black">{c.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-[#E7E3F5] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#5034EB] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, c.progressPercentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Academic Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-[#FAFAFD] border border-[#F1EFFB]">
                      <span className="text-[10px] text-[#6E6990] block font-semibold">Chapters</span>
                      <strong className="text-xs font-bold text-[#17152A]">
                        {c.completedChapters} / {c.totalChapters}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FAFAFD] border border-[#F1EFFB]">
                      <span className="text-[10px] text-[#6E6990] block font-semibold">Topics</span>
                      <strong className="text-xs font-bold text-[#17152A]">
                        {c.completedTopics} / {c.totalTopics}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FAFAFD] border border-[#F1EFFB]">
                      <span className="text-[10px] text-[#6E6990] block font-semibold">Videos</span>
                      <strong className="text-xs font-bold text-[#17152A]">
                        {c.completedVideos} / {c.totalVideos}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#F1EFFB]">
                  <span className="text-[11px] text-[#6E6990]">
                    {c.lastActivityAt
                      ? `Active: ${new Date(c.lastActivityAt).toLocaleDateString()}`
                      : `Enrolled: ${new Date(c.enrolledAt).toLocaleDateString()}`}
                  </span>
                  <Link
                    href={c.continueUrl}
                    className="px-4 py-2 rounded-xl bg-[#F6F4FD] hover:bg-[#5034EB] text-[#5034EB] hover:text-white font-bold text-xs transition-colors"
                  >
                    Open Classroom
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E7E3F5] p-10 text-center shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F6F4FD] text-[#5034EB] flex items-center justify-center mx-auto">
              <BookOpen size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-base text-[#17152A]">No Active Course Enrollments</h4>
              <p className="text-xs text-[#6E6990] max-w-sm mx-auto leading-relaxed">
                Explore our high-yield crash courses designed by top BITS Pilani &amp; IIT faculty to accelerate your preparation.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/course-all"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white font-bold text-xs transition-colors shadow-xs"
              >
                <span>Browse Crash Courses</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 6: CBT TEST PERFORMANCE & SCORECARD ANALYTICS (How am I performing?)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FF3F68]/10 text-[#FF3F68] flex items-center justify-center font-bold">
              <Trophy size={16} />
            </div>
            <h3 className="font-extrabold text-lg text-[#17152A]">CBT Examination Performance</h3>
          </div>
          <Link href="/student/tests" className="text-xs font-bold text-[#5034EB] hover:underline">
            View All Mock Papers
          </Link>
        </div>

        {/* Latest Scorecard Spotlight */}
        {testAnalytics.latestScore && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E3F5] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="font-extrabold text-sm text-[#17152A]">Latest Evaluation Released</h4>
              </div>
              <span className="text-xs text-[#6E6990] font-mono">
                Submitted: {new Date(testAnalytics.latestScore.submittedAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-center justify-between p-5 rounded-2xl bg-[#FAFAFD] border border-[#E7E3F5]">
              <div className="space-y-2 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#FF3F68] text-white">
                    {testAnalytics.latestScore.examTag} CBT
                  </span>
                  <span className="text-xs font-mono text-[#6E6990]">
                    Attempt: {testAnalytics.latestScore.attemptId}
                  </span>
                </div>
                <h4 className="font-black text-base text-[#17152A]">{testAnalytics.latestScore.paperTitle}</h4>
                <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                  <span className="font-bold text-[#5034EB]">
                    Score: {testAnalytics.latestScore.finalScore} / {testAnalytics.latestScore.maximumMarks} (
                    {testAnalytics.latestScore.percentageScore}%)
                  </span>
                  <span className="text-emerald-700 font-bold">
                    Accuracy: {testAnalytics.latestScore.accuracy}%
                  </span>
                  <span className="text-[#6E6990]">
                    Submission: {testAnalytics.latestScore.submissionReason}
                  </span>
                </div>
              </div>

              <Link
                href={`/student/tests/results/${encodeURIComponent(testAnalytics.latestScore.attemptId)}`}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs shrink-0"
              >
                <span>View Full Scorecard</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Two-Column Grid: Subject-Wise Performance & Upcoming Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Subject-Wise Performance (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E7E3F5] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1EFFB]">
              <div>
                <h4 className="font-extrabold text-base text-[#17152A]">Subject-Wise Test Accuracy</h4>
                <p className="text-xs text-[#6E6990]">Identifies academic domains that require more practice.</p>
              </div>
              <BarChart2 size={18} className="text-[#5034EB]" />
            </div>

            {testAnalytics.subjectWisePerformance.length > 0 ? (
              <div className="space-y-4">
                {testAnalytics.subjectWisePerformance.map((sub) => {
                  const isWeak = sub.accuracy < 60;
                  const isStrong = sub.accuracy >= 80;

                  return (
                    <div key={sub.subjectId} className="space-y-1.5 p-3 rounded-xl bg-[#FAFAFD] border border-[#F1EFFB]">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#17152A]">{sub.subjectName}</span>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              isWeak
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isStrong
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {isWeak ? 'Needs Attention' : isStrong ? 'Strong' : 'On Track'}
                          </span>
                        </div>
                        <span className="font-bold text-[#5034EB]">{sub.accuracy}% Accuracy</span>
                      </div>

                      <div className="w-full bg-[#E7E3F5] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isWeak ? 'bg-rose-500' : isStrong ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, sub.accuracy)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-[#6E6990] pt-0.5">
                        <span>
                          {sub.correctQuestions} Correct • {sub.incorrectQuestions} Incorrect
                        </span>
                        <span>Marks: {sub.marksObtained} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-[#6E6990]">
                  Complete at least one full CBT mock test to unlock subject-wise accuracy diagnostics.
                </p>
                <Link
                  href="/student/tests"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5034EB] hover:underline"
                >
                  <span>Explore Mock Papers</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Upcoming & Published Mock Tests (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E7E3F5] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1EFFB]">
              <div>
                <h4 className="font-extrabold text-base text-[#17152A]">Available Mock Tests</h4>
                <p className="text-xs text-[#6E6990]">Official simulated examination papers.</p>
              </div>
              <FileQuestion size={18} className="text-[#FF3F68]" />
            </div>

            <div className="space-y-3">
              {upcomingTests.slice(0, 4).map((t) => {
                const isComp = t.studentStatus === 'COMPLETED';
                const isInProg = t.studentStatus === 'IN_PROGRESS';

                return (
                  <div
                    key={t.paperId}
                    className="p-3.5 rounded-2xl border border-[#E7E3F5] hover:border-[#5034EB]/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#F0EDFD] text-[#5034EB]">
                          {t.examTag}
                        </span>
                        <span className="text-[10px] text-[#6E6990]">{t.durationMinutes}m • {t.totalQuestions} Qs</span>
                      </div>
                      <h5 className="font-bold text-xs text-[#17152A] truncate">{t.paperTitle}</h5>
                      {isComp && t.score !== null && (
                        <span className="text-[10px] font-bold text-emerald-700 block">
                          Score: {t.score} / {t.totalMarks}
                        </span>
                      )}
                    </div>

                    <Link
                      href={t.actionUrl}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                        isComp
                          ? 'bg-[#F6F4FD] hover:bg-[#5034EB] text-[#5034EB] hover:text-white'
                          : isInProg
                          ? 'bg-[#FF3F68] hover:bg-[#E02E53] text-white'
                          : 'bg-[#5034EB] hover:bg-[#432bc4] text-white'
                      }`}
                    >
                      {t.actionLabel}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 7: RECENT ACTIVITY FEED & LEARNING STREAK
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Unified Recent Activity Stream (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E7E3F5] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1EFFB]">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#5034EB]" />
              <h4 className="font-extrabold text-base text-[#17152A]">Recent Learning Activity</h4>
            </div>
            <span className="text-xs text-[#6E6990]">Real-time Event Stream</span>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((act) => {
                const isVideo = act.type === 'VIDEO';
                const isDoc = act.type === 'DOCUMENT';
                const isTest = act.type === 'TEST';

                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-[#FAFAFD] border border-[#F1EFFB]"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                        isVideo
                          ? 'bg-blue-50 text-blue-600'
                          : isDoc
                          ? 'bg-emerald-50 text-emerald-600'
                          : isTest
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-[#F0EDFD] text-[#5034EB]'
                      }`}
                    >
                      {isVideo ? <Video size={14} /> : isDoc ? <FileText size={14} /> : isTest ? <Award size={14} /> : <CheckCircle2 size={14} />}
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="font-bold text-xs text-[#17152A] truncate">{act.title}</h5>
                        <span className="text-[10px] text-[#6E6990] shrink-0 font-mono">
                          {new Date(act.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {act.courseTitle && (
                        <p className="text-[11px] text-[#6E6990] truncate">{act.courseTitle}</p>
                      )}
                      {act.details && (
                        <p className="text-[10px] font-bold text-[#5034EB]">{act.details}</p>
                      )}
                    </div>

                    {act.link && (
                      <Link
                        href={act.link}
                        className="text-[11px] font-bold text-[#5034EB] hover:underline shrink-0 self-center"
                      >
                        Open
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-[#6E6990]">No recent learning activity recorded yet.</p>
              <p className="text-[11px] text-[#6E6990]">
                Watch a lecture or attempt a question to start your activity stream.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Learning Streak & Faculty Doubts (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Streak Card */}
          <div className="bg-gradient-to-br from-[#17152A] to-[#2F2468] p-6 rounded-3xl text-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400" />
                <h4 className="font-extrabold text-sm text-white">Study Momentum</h4>
              </div>
              <span className="text-xs font-bold text-amber-300">
                {streak.activeDaysCount} Days Active
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">{streak.currentStreakDays}</span>
              <span className="text-xs font-bold text-slate-300">Consecutive Days Streak</span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              Consistency is the key to cracking BITSAT &amp; JEE. Study every day to maintain your streak and maximize retention.
            </p>

            <div className="pt-2 border-t border-white/10 flex justify-between text-xs text-slate-300 font-medium">
              <span>Longest Streak: {streak.longestStreakDays} days</span>
              <span>Total Time: {Math.floor(streak.studyTimeMinutes / 60)}h {streak.studyTimeMinutes % 60}m</span>
            </div>
          </div>

          {/* Doubts Quick Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E3F5] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-sm text-[#17152A]">Faculty Doubts</h4>
              </div>
              <Link href="/student/doubts" className="text-xs font-bold text-[#5034EB] hover:underline">
                View All
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFD] border border-[#F1EFFB] text-xs">
              <span className="text-[#6E6990]">Total Doubts</span>
              <strong className="text-[#17152A] font-black">{doubts.totalCount}</strong>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold">
              <span>Resolved Answers</span>
              <span>{doubts.resolvedCount}</span>
            </div>
          </div>

          {/* Notes Quick Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E3F5] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h4 className="font-extrabold text-sm text-[#17152A]">My Study Notes</h4>
              </div>
              <Link href="/student/notes" className="text-xs font-bold text-[#5034EB] hover:underline">
                View Notes
              </Link>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFD] border border-[#F1EFFB] text-xs">
              <span className="text-[#6E6990]">Total Notes</span>
              <strong className="text-[#17152A] font-black">{dashboardData.notes?.totalCount ?? 0}</strong>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold">
              <span>Pinned Notes</span>
              <span>{dashboardData.notes?.pinnedCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
