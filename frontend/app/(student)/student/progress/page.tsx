'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  CircleDot,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  ArrowRight,
  Lock,
  ShieldCheck,
  Check,
  Loader2,
  BarChart3,
  Award,
} from 'lucide-react';
import type {
  StudentOverallSummary,
  CourseSummaryItem,
  CourseProgressSummary,
  SubjectProgressSummary,
  ChapterProgressSummary,
  TopicProgressItem,
  StudentLearningEventRecord,
} from '@/lib/learning/types';
import { apiClient } from '@/lib/apiClient';

interface EnrolledCourse {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  examTag: string;
  image: string | null;
  settlementStatus: string;
  accessState: string;
  statusCategory: string;
}

export default function StudentProgressPage() {
  // 1. Overall state
  const [summary, setSummary] = useState<StudentOverallSummary | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Selected course for syllabus drill-down
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseProgressSummary | null>(null);
  const [courseDetailLoading, setCourseDetailLoading] = useState<boolean>(false);
  const [courseDetailError, setCourseDetailError] = useState<string | null>(null);

  // 3. Expanded chapter IDs for accordion state
  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>({});

  // 4. Topic mutation in-flight tracking
  const [mutatingTopicId, setMutatingTopicId] = useState<number | null>(null);
  const [mutationSuccessMessage, setMutationSuccessMessage] = useState<string | null>(null);
  const [mutationErrorMessage, setMutationErrorMessage] = useState<string | null>(null);

  // Fetch initial summary and enrolled courses
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, coursesRes] = await Promise.all([
        fetch('/api/student/progress/summary', { cache: 'no-store' }),
        fetch('/api/student/courses', { cache: 'no-store' }),
      ]);

      const summaryJson = await summaryRes.json().catch(() => ({}));
      const coursesJson = await coursesRes.json().catch(() => ({}));

      if (!summaryRes.ok || !summaryJson.success) {
        throw new Error(summaryJson.error || 'Failed to retrieve learning progress summary.');
      }

      setSummary(summaryJson.data);

      if (coursesRes.ok && coursesJson.success && coursesJson.data?.courses) {
        const settledOnly = (coursesJson.data.courses as EnrolledCourse[]).filter(
          (c) => c.statusCategory === 'ACTIVE' || c.statusCategory === 'PROVISIONING' || c.settlementStatus === 'SETTLED'
        );
        setEnrolledCourses(settledOnly.length > 0 ? settledOnly : coursesJson.data.courses);

        // Auto-select first course if not already selected
        if (!selectedCourseId) {
          const firstId = settledOnly[0] ? Number(settledOnly[0].courseId) : Number(coursesJson.data.courses[0]?.courseId);
          if (firstId && !isNaN(firstId)) {
            setSelectedCourseId(firstId);
          } else if (summaryJson.data.courses?.[0]?.courseId) {
            setSelectedCourseId(summaryJson.data.courses[0].courseId);
          }
        }
      } else if (summaryJson.data.courses?.[0]?.courseId) {
        setSelectedCourseId(summaryJson.data.courses[0].courseId);
      }
    } catch (err: any) {
      console.error('[StudentProgressPage] Error loading dashboard data:', err);
      setError(err?.message || 'Unable to connect to learning progress service.');
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  // Fetch course detailed drill-down
  const fetchCourseDetail = useCallback(async (courseId: number) => {
    setCourseDetailLoading(true);
    setCourseDetailError(null);

    try {
      const res = await fetch(`/api/student/progress/courses/${courseId}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to load course #${courseId} progress details.`);
      }

      setCourseDetail(json.data);

      // Default expand all chapters in this course
      if (json.data?.subjects) {
        const initialExpanded: Record<number, boolean> = {};
        for (const sub of json.data.subjects) {
          for (const ch of sub.chapters || []) {
            initialExpanded[ch.chapterId] = true;
          }
        }
        setExpandedChapters(initialExpanded);
      }
    } catch (err: any) {
      console.error(`[StudentProgressPage] Error fetching course ${courseId}:`, err);
      setCourseDetailError(err?.message || 'Failed to load course details.');
    } finally {
      setCourseDetailLoading(false);
    }
  }, []);

  // When selectedCourseId changes, fetch detail
  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseDetail(selectedCourseId);
    }
  }, [selectedCourseId, fetchCourseDetail]);

  // Initial mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Mark Topic Completed
  const handleMarkTopicCompleted = async (courseId: number, topicId: number, topicName: string) => {
    setMutatingTopicId(topicId);
    setMutationSuccessMessage(null);
    setMutationErrorMessage(null);

    try {
      const res = await apiClient('/api/student/progress/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          topicId,
          status: 'COMPLETED',
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update topic progress.');
      }

      setMutationSuccessMessage(`"${topicName}" marked as completed!`);

      // Refresh both course detail and summary in background
      await Promise.all([
        fetchCourseDetail(courseId),
        fetch('/api/student/progress/summary', { cache: 'no-store' })
          .then((r) => r.json())
          .then((sJson) => {
            if (sJson.success && sJson.data) {
              setSummary(sJson.data);
            }
          })
          .catch(() => {}),
      ]);
    } catch (err: any) {
      console.error('[StudentProgressPage] Error completing topic:', err);
      setMutationErrorMessage(err?.message || 'Unable to save topic completion.');
    } finally {
      setMutatingTopicId(null);
    }
  };

  // Toggle chapter expansion in accordion
  const toggleChapter = (chapterId: number) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  // Expand or collapse all
  const setAllChaptersExpanded = (expanded: boolean) => {
    if (!courseDetail?.subjects) return;
    const newState: Record<number, boolean> = {};
    for (const sub of courseDetail.subjects) {
      for (const ch of sub.chapters || []) {
        newState[ch.chapterId] = expanded;
      }
    }
    setExpandedChapters(newState);
  };

  // Format relative time helper
  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No activity yet';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Event badge styling helper
  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'TOPIC_COMPLETED':
        return { label: 'Topic Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'TOPIC_STARTED':
        return { label: 'Topic Started', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'VIDEO_COMPLETED':
        return { label: 'Video Completed', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'VIDEO_STARTED':
        return { label: 'Video Started', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'DOCUMENT_COMPLETED':
        return { label: 'Doc Completed', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'DOCUMENT_OPENED':
        return { label: 'Doc Opened', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'Study Activity', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-[#E7E3F5] p-6 space-y-3 animate-pulse shadow-xs">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-8 w-20 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error view
  if (error || !summary) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-10 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#17152A]">Learning Progress Unavailable</h2>
            <p className="text-xs text-[#6E6990] leading-relaxed max-w-sm mx-auto">
              {error || 'Unable to load your authenticated learning progress.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw size={14} /> Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { overall, courses, recentActivity } = summary;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#6E6990] mb-1 font-semibold">
            <Link href="/student/dashboard" className="hover:text-[#5034EB] transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[#17152A] font-bold">Learning Progress</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17152A] tracking-tight">
            Learning Progress & Syllabus Tracker
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6990] mt-1">
            Authoritative progress tracking across courses, subjects, chapters, and topics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            title="Refresh learning metrics"
            className="p-2.5 rounded-xl bg-white border border-[#E7E3F5] text-[#6E6990] hover:text-[#5034EB] hover:border-[#5034EB]/30 transition-all shadow-xs"
          >
            <RefreshCw size={15} />
          </button>
          <div className="px-4 py-2 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs flex items-center gap-2">
            <TrendingUp size={16} className="text-[#5034EB]" />
            <span className="text-xs font-bold text-[#17152A]">
              {overall.completedTopics} Completed Topics
            </span>
          </div>
        </div>
      </div>

      {/* 2. OVERVIEW METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Overall Progress */}
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E6990] uppercase tracking-wider">
              Overall Completion
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F6F4FF] text-[#5034EB] flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#17152A]">
              {overall.averageCompletionPercentage.toFixed(1)}%
            </div>
            <div className="w-full bg-[#E7E3F5] h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#5034EB] to-[#FF3F68] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, overall.averageCompletionPercentage))}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[#6E6990]">
            Average across {summary.totalCourses} canonical {summary.totalCourses === 1 ? 'course' : 'courses'}
          </span>
        </div>

        {/* Metric 2: Completed Topics */}
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E6990] uppercase tracking-wider">
              Topic Mastery
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#17152A]">
              {overall.completedTopics}{' '}
              <span className="text-sm font-semibold text-[#6E6990]">/ {overall.totalEligibleTopics}</span>
            </div>
            <span className="text-xs font-bold text-emerald-700 mt-1 inline-block">
              {overall.remainingTopics} remaining
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#6E6990]">
            Verified topic completion records
          </span>
        </div>

        {/* Metric 3: Chapters & Subjects */}
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E6990] uppercase tracking-wider">
              Chapter Milestones
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#17152A]">
              {overall.completedChapters}{' '}
              <span className="text-sm font-semibold text-[#6E6990]">/ {overall.totalChapters}</span>
            </div>
            <span className="text-xs font-bold text-purple-700 mt-1 inline-block">
              {overall.completedSubjects} of {overall.totalSubjects} subjects completed
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#6E6990]">
            100% topic coverage required
          </span>
        </div>

        {/* Metric 4: Last Learning Activity */}
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6E6990] uppercase tracking-wider">
              Last Activity
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="my-3">
            <div className="text-lg font-extrabold text-[#17152A] truncate">
              {formatRelativeTime(overall.lastActivityAt)}
            </div>
            <span className="text-xs font-semibold text-[#6E6990] mt-1 block">
              {overall.lastActivityAt
                ? new Date(overall.lastActivityAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No recorded study activity'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#6E6990]">
            Persistent audit trail
          </span>
        </div>
      </div>

      {/* 3. COURSE-WISE PROGRESS CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[#17152A] tracking-tight">
            My Courses Learning Progress
          </h2>
          <span className="text-xs font-semibold text-[#6E6990]">
            {courses.length > 0 ? 'Click any course to inspect full syllabus breakdown' : '0 active course enrollments'}
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#E7E3F5] p-10 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-50 text-[#5034EB] flex items-center justify-center mx-auto">
              <BookOpen size={30} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-[#17152A]">No Enrolled Courses Found</h3>
              <p className="text-xs text-[#6E6990] max-w-md mx-auto">
                Learning progress and syllabus tracking are available for active, settled course enrollments. Browse our course catalog to get started.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/course-all"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs"
              >
                Explore Courses
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course) => {
            const isSelected = selectedCourseId === course.courseId;
            return (
              <div
                key={course.courseId}
                onClick={() => setSelectedCourseId(course.courseId)}
                className={`bg-white rounded-3xl border p-6 transition-all cursor-pointer relative shadow-xs hover:shadow-md flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#5034EB] ring-2 ring-[#5034EB]/20 bg-[#FAF9FF]'
                    : 'border-[#E7E3F5] hover:border-[#5034EB]/40'
                }`}
              >
                <div>
                  {/* Top Exam Tag and Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#17152A] text-amber-300">
                      {course.examTag || 'JEE/BITSAT'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        course.completionPercentage >= 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : course.completionPercentage > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {course.completionPercentage >= 100
                        ? 'COMPLETED'
                        : course.completionPercentage > 0
                        ? 'IN PROGRESS'
                        : 'NOT STARTED'}
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="font-extrabold text-base text-[#17152A] line-clamp-2 leading-snug">
                    {course.courseTitle}
                  </h3>

                  {/* Progress Bar */}
                  <div className="mt-4 mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                      <span className="text-[#6E6990]">Course Progress</span>
                      <span className="text-[#17152A]">
                        {course.completionPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E7E3F5] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#5034EB] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, course.completionPercentage))}%` }}
                      />
                    </div>
                  </div>

                  {/* Detail Stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#F1EFFB] text-center my-3">
                    <div>
                      <div className="text-xs font-black text-[#17152A]">
                        {course.completedTopics}/{course.totalTopics}
                      </div>
                      <div className="text-[10px] font-semibold text-[#6E6990]">Topics</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#17152A]">
                        {course.completedChapters}/{course.totalChapters}
                      </div>
                      <div className="text-[10px] font-semibold text-[#6E6990]">Chapters</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#17152A]">
                        {course.completedSubjects}/{course.totalSubjects}
                      </div>
                      <div className="text-[10px] font-semibold text-[#6E6990]">Subjects</div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Button */}
                <div className="pt-3 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#6E6990] font-medium">
                    {course.lastActivityAt ? `Active ${formatRelativeTime(course.lastActivityAt)}` : 'Not started yet'}
                  </span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isSelected ? 'text-[#5034EB]' : 'text-[#6E6990]'
                    }`}
                  >
                    {isSelected ? 'Viewing Syllabus' : 'View Syllabus'}
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* 4. COURSE PROGRESS DETAIL DRILL-DOWN (SYLLABUS & TOPIC BREAKDOWN) */}
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Drill-down Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F1EFFB]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F6F4FF] text-[#5034EB]">
                Interactive Syllabus
              </span>
              {courseDetail && (
                <span className="text-xs font-bold text-[#6E6990]">
                  Course #{courseDetail.courseId} • {courseDetail.courseCompletionPercentage.toFixed(1)}% Completed
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#17152A] tracking-tight">
              {courseDetail ? courseDetail.courseTitle : 'Select a course to view syllabus'}
            </h2>
          </div>

          {/* Accordion Controls */}
          {courseDetail && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAllChaptersExpanded(true)}
                className="px-3 py-1.5 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FF] transition-all"
              >
                Expand All
              </button>
              <button
                onClick={() => setAllChaptersExpanded(false)}
                className="px-3 py-1.5 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FF] transition-all"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

        {/* Mutation Notifications */}
        {mutationSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{mutationSuccessMessage}</span>
          </div>
        )}

        {mutationErrorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{mutationErrorMessage}</span>
          </div>
        )}

        {/* Course Detail Content */}
        {courseDetailLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-[#5034EB] mx-auto" />
            <p className="text-xs font-bold text-[#6E6990]">Loading syllabus hierarchy...</p>
          </div>
        ) : courseDetailError ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
            <AlertCircle size={24} className="text-rose-600 mx-auto" />
            <p className="text-xs font-bold text-rose-800">{courseDetailError}</p>
            <button
              onClick={() => selectedCourseId && fetchCourseDetail(selectedCourseId)}
              className="px-4 py-2 rounded-xl bg-[#5034EB] text-white text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : !courseDetail || !courseDetail.subjects || courseDetail.subjects.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6E6990]">
            No syllabus data available for this course.
          </div>
        ) : (
          <div className="space-y-6">
            {courseDetail.subjects.map((subject) => {
              const subjectProgress = subject.totalTopics > 0
                ? Math.round((subject.completedTopics / subject.totalTopics) * 100)
                : 0;

              return (
                <div
                  key={subject.subjectId}
                  className="rounded-2xl border border-[#E7E3F5] overflow-hidden bg-[#FAF9FF]"
                >
                  {/* Subject Header */}
                  <div className="p-4 sm:p-5 bg-white border-b border-[#E7E3F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F6F4FF] text-[#5034EB] flex items-center justify-center font-black text-sm">
                        {subject.subjectName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-[#17152A]">
                          {subject.subjectName}
                        </h3>
                        <p className="text-[11px] font-semibold text-[#6E6990]">
                          {subject.completedChapters} of {subject.totalChapters} chapters completed •{' '}
                          {subject.completedTopics} of {subject.totalTopics} topics
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right sm:w-32">
                        <span className="text-xs font-black text-[#17152A]">
                          {subjectProgress}%
                        </span>
                        <div className="w-full bg-[#E7E3F5] h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-[#5034EB] h-full rounded-full"
                            style={{ width: `${subjectProgress}%` }}
                          />
                        </div>
                      </div>
                      {subject.isCompleted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                          <CheckCircle2 size={12} /> Subject Mastered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chapters List */}
                  <div className="divide-y divide-[#F1EFFB]">
                    {subject.chapters.map((chapter) => {
                      const isExpanded = !!expandedChapters[chapter.chapterId];
                      const chapterProgress = chapter.totalTopics > 0
                        ? Math.round((chapter.completedTopics / chapter.totalTopics) * 100)
                        : 0;

                      return (
                        <div key={chapter.chapterId} className="bg-white">
                          {/* Chapter Toggle Bar */}
                          <div
                            onClick={() => toggleChapter(chapter.chapterId)}
                            className="p-4 flex items-center justify-between gap-3 hover:bg-[#FAF9FF] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button
                                aria-label="Toggle chapter"
                                className="p-1 rounded text-[#6E6990] hover:text-[#17152A]"
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                              <div className="truncate">
                                <h4 className="font-bold text-xs sm:text-sm text-[#17152A] truncate">
                                  {chapter.chapterName}
                                </h4>
                                <span className="text-[11px] text-[#6E6990]">
                                  {chapter.totalTopics === 0 ? (
                                    <span className="italic text-amber-700">
                                      No published topics currently
                                    </span>
                                  ) : (
                                    `${chapter.completedTopics} / ${chapter.totalTopics} topics completed`
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {chapter.totalTopics > 0 ? (
                                <div className="text-right w-24 hidden sm:block">
                                  <div className="text-[11px] font-bold text-[#17152A]">
                                    {chapterProgress}%
                                  </div>
                                  <div className="w-full bg-[#E7E3F5] h-1.5 rounded-full mt-1 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        chapter.isCompleted ? 'bg-emerald-600' : 'bg-[#5034EB]'
                                      }`}
                                      style={{ width: `${chapterProgress}%` }}
                                    />
                                  </div>
                                </div>
                              ) : null}

                              {chapter.isCompleted ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Completed
                                </span>
                              ) : chapter.totalTopics === 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Empty Chapter
                                </span>
                              ) : chapter.completedTopics > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                  In Progress
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                  Not Started
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Topics List when expanded */}
                          {isExpanded && (
                            <div className="bg-[#FAF9FF] border-t border-[#F1EFFB] p-3 sm:p-4 space-y-2">
                              {chapter.totalTopics === 0 || !chapter.topics || chapter.topics.length === 0 ? (
                                <div className="p-4 text-center text-xs text-[#6E6990] italic bg-white rounded-xl border border-dashed border-[#E7E3F5]">
                                  No topics currently published in this chapter.
                                </div>
                              ) : (
                                chapter.topics.map((topic) => {
                                  const isCompleted = topic.status === 'COMPLETED';
                                  const isMutating = mutatingTopicId === topic.topicId;

                                  return (
                                    <div
                                      key={topic.topicId}
                                      className="p-3 sm:p-3.5 bg-white rounded-xl border border-[#E7E3F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#5034EB]/30 transition-all shadow-2xs"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div
                                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                            isCompleted
                                              ? 'bg-emerald-50 text-emerald-600'
                                              : topic.status === 'IN_PROGRESS'
                                              ? 'bg-blue-50 text-blue-600'
                                              : 'bg-slate-100 text-slate-400'
                                          }`}
                                        >
                                          {isCompleted ? (
                                            <CheckCircle2 size={15} />
                                          ) : topic.status === 'IN_PROGRESS' ? (
                                            <Clock size={15} />
                                          ) : (
                                            <CircleDot size={15} />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs sm:text-sm text-[#17152A] truncate">
                                              {topic.topicName}
                                            </span>
                                            {topic.topicCode && (
                                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 rounded text-slate-500">
                                                {topic.topicCode}
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] text-[#6E6990] mt-0.5">
                                            {isCompleted && topic.completedAt
                                              ? `Completed ${new Date(topic.completedAt).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                })}`
                                              : topic.status === 'IN_PROGRESS'
                                              ? 'In progress'
                                              : 'Not started'}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Action Button */}
                                      <div className="shrink-0 self-end sm:self-auto">
                                        {isCompleted ? (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                                            <Check size={13} /> Completed
                                          </span>
                                        ) : (
                                          <button
                                            disabled={isMutating}
                                            onClick={() =>
                                              handleMarkTopicCompleted(
                                                courseDetail.courseId,
                                                topic.topicId,
                                                topic.topicName
                                              )
                                            }
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                          >
                                            {isMutating ? (
                                              <>
                                                <Loader2 size={13} className="animate-spin" /> Saving...
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle2 size={13} /> Mark Completed
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. RECENT LEARNING ACTIVITY TIMELINE */}
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1EFFB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F6F4FF] text-[#5034EB] flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#17152A]">
                Recent Learning Activity
              </h3>
              <p className="text-[11px] text-[#6E6990]">
                Chronological record of completed topics and study events.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#6E6990]">
            {recentActivity.length} Events
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <BookOpen size={28} className="text-[#6E6990]/40 mx-auto" />
            <p className="text-xs font-semibold text-[#6E6990]">
              No learning activity recorded yet. Start studying your courses to track progress here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {recentActivity.map((event) => {
              const badge = getEventBadge(event.eventType);
              return (
                <div
                  key={event.id}
                  className="p-3.5 rounded-2xl bg-[#FAF9FF] border border-[#E7E3F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                    <span className="font-bold text-[#17152A]">
                      Course #{event.courseId}
                      {event.topicId && ` • Topic #${event.topicId}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#6E6990]">
                    <Clock size={12} />
                    <span>{formatRelativeTime(event.eventAt)}</span>
                    <span>•</span>
                    <span>{new Date(event.eventAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. CLASSROOM POLICY COMPLIANCE NOTICE */}
      <div className="p-5 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] flex items-start gap-3.5">
        <ShieldCheck size={20} className="text-[#5034EB] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-[#1E293B]">
            Classroom Access & Syllabus Progress Policy
          </h4>
          <p className="leading-relaxed">
            Topic progress tracking is recorded persistently for your personal study dashboard and analytics.
            Classroom access enforcement and protected video playback remain locked in accordance with CBT regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
