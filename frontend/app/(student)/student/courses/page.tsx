'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface StudentCourseItem {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  examTag: string;
  image: string | null;
  shortDescription?: string | null;
  enrolledAt: string;
  settlementStatus: string;
  accessState: string;
  enrollmentSource: string;
  statusLabel: string;
  statusCategory: 'ACTIVE' | 'PROVISIONING' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'UNVERIFIED' | 'UNKNOWN';
  classroomAccessEligible: boolean;
  classroomStatusNotice: string;
  courseDetailsUrl: string;
}

interface StudentCoursesData {
  courses: StudentCourseItem[];
  counts: {
    totalEnrollments: number;
    settledCount: number;
    pendingCount: number;
    revokedCount: number;
  };
  limitations: {
    classroomEnforcement: string;
    courseProgressTracking: string;
  };
}

export default function MyCoursesPage() {
  const [data, setData] = useState<StudentCoursesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/courses', {
        method: 'GET',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to retrieve enrolled courses.');
      }
      setData(json.data);
    } catch (err: any) {
      console.error('[MyCourses] Fetch error:', err);
      setError(err?.message || 'Unable to connect to course enrollment service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-[#E7E3F5] overflow-hidden p-6 space-y-4 animate-pulse shadow-xs"
            >
              <div className="aspect-video w-full bg-slate-100 rounded-2xl" />
              <div className="h-5 w-3/4 bg-slate-200 rounded-lg" />
              <div className="h-4 w-1/2 bg-slate-100 rounded-lg" />
              <div className="h-10 w-full bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-10 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#17152A]">Course Library Unavailable</h2>
            <p className="text-xs text-[#6E6990] leading-relaxed max-w-sm mx-auto">
              {error || 'Unable to load course enrollments at this time.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={fetchCourses}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw size={14} /> Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { courses, counts } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#6E6990] mb-1 font-semibold">
            <Link href="/student/dashboard" className="hover:text-[#5034EB] transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[#17152A] font-bold">My Courses</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17152A] tracking-tight">
            My Enrolled Courses
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6990] mt-1">
            Authoritative course library linked to your authenticated student account.
          </p>
        </div>

        {/* Enrollment Count Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-4 py-2 rounded-2xl bg-white border border-[#E7E3F5] shadow-xs flex items-center gap-2">
            <GraduationCap size={16} className="text-[#5034EB]" />
            <span className="text-xs font-bold text-[#17152A]">
              {counts.settledCount}{' '}
              {counts.settledCount === 1 ? 'Settled Course' : 'Settled Courses'}
            </span>
            {counts.pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {counts.pendingCount} Pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. COURSE CARDS GRID OR EMPTY STATE */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F6F4FF] text-[#5034EB] flex items-center justify-center mx-auto shadow-xs">
            <BookOpen size={32} />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-lg text-[#17152A]">No Enrolled Courses Found</h3>
            <p className="text-xs text-[#6E6990] leading-relaxed max-w-sm mx-auto">
              You have not enrolled in any courses yet. Browse our comprehensive test series and crash
              courses to start your preparation.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/course-all"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white font-bold text-xs transition-all shadow-xs"
            >
              <span>Explore Course Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const formattedDate = course.enrolledAt
              ? new Date(course.enrolledAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recorded';

            return (
              <div
                key={course.enrollmentId}
                className="bg-white rounded-3xl border border-[#E7E3F5] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Course Thumbnail */}
                <div className="relative aspect-video w-full bg-gradient-to-tr from-[#17152A] via-[#2F2468] to-[#43358E] flex items-center justify-center overflow-hidden">
                  {course.image ? (
                    <Image
                      src={course.image}
                      alt={course.title}
                      fill
                      className="object-cover opacity-90"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/80 space-y-2 p-4 text-center">
                      <GraduationCap size={36} className="text-amber-400" />
                      <span className="text-xs font-bold tracking-wide uppercase">
                        {course.examTag} Preparation
                      </span>
                    </div>
                  )}

                  {/* Exam Tag Badge */}
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#17152A]/85 backdrop-blur-md text-amber-300 border border-white/20 shadow-sm">
                    {course.examTag}
                  </span>

                  {/* Status Tag Badge */}
                  <span
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${
                      course.statusCategory === 'ACTIVE' || course.statusCategory === 'PROVISIONING'
                        ? 'bg-emerald-600 text-white'
                        : course.statusCategory === 'PENDING'
                        ? 'bg-amber-500 text-white'
                        : course.statusCategory === 'UNVERIFIED'
                        ? 'bg-purple-600 text-white'
                        : course.statusCategory === 'EXPIRED'
                        ? 'bg-slate-600 text-white'
                        : course.statusCategory === 'REVOKED'
                        ? 'bg-rose-600 text-white'
                        : 'bg-zinc-600 text-white'
                    }`}
                  >
                    {course.statusLabel}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-6 flex flex-col flex-grow justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-[#6E6990]">
                      <Calendar size={13} className="shrink-0" />
                      <span>Enrolled on {formattedDate}</span>
                    </div>

                    <h3 className="font-extrabold text-base text-[#17152A] leading-snug line-clamp-2">
                      {course.title}
                    </h3>

                    {course.shortDescription && (
                      <p className="text-xs text-[#6E6990] line-clamp-2 leading-relaxed">
                        {course.shortDescription}
                      </p>
                    )}
                  </div>

                  {/* Authoritative Classroom Notice Box */}
                  <div className="p-3.5 rounded-2xl bg-[#F6F4FF] border border-[#E7E3F5] flex items-start gap-2.5">
                    <Info size={15} className="text-[#5034EB] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#6E6990] leading-relaxed">
                      {course.classroomStatusNotice}
                    </p>
                  </div>

                  {/* Action Link: Links safely to public course details */}
                  <div className="pt-1">
                    <Link
                      href={course.courseDetailsUrl}
                      className="w-full py-3 rounded-xl bg-slate-50 hover:bg-[#F6F4FF] border border-[#E7E3F5] text-[#17152A] hover:text-[#5034EB] font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <span>View Course Details</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
