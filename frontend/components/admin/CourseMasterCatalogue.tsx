'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Layers,
  Edit,
  Trash2,
  ExternalLink,
  BookOpen,
  Users,
  Award,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  Archive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { CourseRecord } from '@/lib/db/courses';
import { PageHeader } from './ui/PageHeader';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';

export interface CourseMasterCatalogueProps {
  courses: CourseRecord[];
  onRefresh: () => Promise<void>;
}

export const CourseMasterCatalogue: React.FC<CourseMasterCatalogueProps> = ({
  courses,
  onRefresh,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [safeguardModal, setSafeguardModal] = useState<{
    course: CourseRecord;
    message: string;
    details?: string[];
  } | null>(null);

  // Extract unique exams for dropdown filter
  const examOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      if (c.exam) set.add(c.exam);
    }
    return Array.from(set);
  }, [courses]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          c.title?.toLowerCase().includes(q) ||
          c.exam?.toLowerCase().includes(q) ||
          c.slug?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Exam filter
      if (selectedExam !== 'all' && c.exam !== selectedExam) {
        return false;
      }

      // 3. Status filter
      if (statusFilter === 'active' && c.isActive === false) return false;
      if (statusFilter === 'archived' && c.isActive !== false) return false;

      return true;
    });
  }, [courses, searchTerm, selectedExam, statusFilter]);

  // Statistics metrics
  const totalCourses = courses.length;
  const activeCourses = courses.filter((c) => c.isActive !== false).length;
  const totalEnrolled = courses.reduce((acc, c) => acc + (Number(c.enrolledStudent) || 0), 0);

  // Toggle active/archived status
  const handleToggleStatus = async (course: CourseRecord) => {
    setIsUpdating(course.id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !course.isActive,
          isShowInIndex: !course.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update course status.');
      }
      setSuccessMessage(`Course "${course.title}" status changed to ${!course.isActive ? 'Active' : 'Archived'}.`);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update status.');
    } finally {
      setIsUpdating(null);
    }
  };

  // Safe delete with referential safeguard
  const handleDelete = async (course: CourseRecord) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete course "${course.title}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setIsUpdating(course.id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSafeguardModal({
          course,
          message:
            json.error ||
            'Permanent course deletion is disabled to prevent data loss. Please archive or deactivate this course instead.',
          details: json.dependencies?.details || [],
        });
        return;
      }
      setSuccessMessage(`Course "${course.title}" deleted successfully.`);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete course.');
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#E3E8F0] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#172B4D] tracking-tight">Course Master</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#1455C0] border border-blue-200">
              {totalCourses} Courses
            </span>
          </div>
          <p className="text-xs text-[#6B7890] mt-1">
            Central LMS course management module linking exams, pricing, subjects, and curriculum roadmaps.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/courses/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1455C0] text-white hover:bg-[#0E3E8C] font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Course</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="font-bold text-red-700 hover:text-red-900">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="font-bold text-emerald-700 hover:text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. STATISTIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-subtle">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Courses</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-[#172B4D] mt-1">{totalCourses}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-subtle">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">{activeCourses}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-subtle">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Enrolled Students</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 mt-1">{totalEnrolled.toLocaleString()}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-subtle">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Exam Categories</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1">{examOptions.length}</p>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS BAR */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search courses by title, exam, or slug..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
          />
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Exam dropdown */}
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
          >
            <option value="all">All Exams</option>
            {examOptions.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({totalCourses})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active ({activeCourses})
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                statusFilter === 'archived' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Archived ({totalCourses - activeCourses})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 ml-auto sm:ml-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. COURSE LISTING (TABLE / GRID) */}
      {filteredCourses.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-slate-200 bg-white space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No courses found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || selectedExam !== 'all' || statusFilter !== 'all'
              ? 'No courses match the active search or filters.'
              : 'No courses have been created yet. Click "Add New Course" to get started.'}
          </p>
          {(searchTerm || selectedExam !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedExam('all');
                setStatusFilter('all');
              }}
              className="text-xs font-bold text-[#1455C0] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-xl border border-[#E3E8F0] bg-white overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E3E8F0] text-[#172B4D] font-bold select-none">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Course Title & Slug</th>
                  <th className="py-3 px-4">Exam</th>
                  <th className="py-3 px-4">Pricing</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4 text-center">Order</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F7]">
                {filteredCourses.map((c) => {
                  const numOrig = Number(c.originalPrice) || 0;
                  const numDisc = Number(c.discountedPrice || c.price) || 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Priority ID */}
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {c.id}
                      </td>

                      {/* Title & Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                            {c.image ? (
                              <Image
                                src={c.image}
                                alt={c.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400">
                                10Q
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/admin/courses/${c.id}/edit`}
                              className="font-bold text-slate-900 hover:text-[#1455C0] block truncate max-w-sm"
                            >
                              {c.title}
                            </Link>
                            <span className="text-[11px] font-mono text-slate-400 truncate block max-w-xs">
                              /course-detail/{c.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Exam Tag */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {c.exam || 'BITSAT'}
                        </span>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-slate-900">₹{numDisc.toLocaleString()}</span>
                          {numOrig > numDisc && (
                            <span className="text-[10px] text-slate-400 line-through">₹{numOrig.toLocaleString()}</span>
                          )}
                        </div>
                        {c.discount && (
                          <span className="text-[10px] font-bold text-emerald-600 block">{c.discount}</span>
                        )}
                      </td>

                      {/* Enrolled Students */}
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {(Number(c.enrolledStudent) || 0).toLocaleString()}
                      </td>

                      {/* Priority Display Index */}
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {c.displayIndex ?? 1}
                      </td>

                      {/* Status Toggle Badge */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          disabled={isUpdating === c.id}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                            c.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {isUpdating === c.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin inline" />
                          ) : c.isActive !== false ? (
                            'Active'
                          ) : (
                            'Archived'
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/course-detail/${c.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="View Public Course Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/admin/assignments?courseId=${c.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Manage Curriculum Content"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/admin/courses/${c.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#1455C0] hover:bg-blue-50"
                            title="Edit Course"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            disabled={isUpdating === c.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((c) => {
            const numOrig = Number(c.originalPrice) || 0;
            const numDisc = Number(c.discountedPrice || c.price) || 0;

            return (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-subtle hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Thumbnail */}
                  <div className="relative aspect-video w-full bg-slate-900 border-b border-slate-200">
                    {c.image ? (
                      <Image
                        src={c.image}
                        alt={c.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                        10Q Challenge
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs">
                      {c.exam || 'BITSAT'}
                    </span>
                    <span
                      className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.isActive !== false
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-500 text-white'
                      }`}
                    >
                      {c.isActive !== false ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                      {c.title}
                    </h3>
                    {c.shortDescription && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {c.shortDescription}
                      </p>
                    )}
                    <div className="pt-2 flex items-baseline justify-between border-t border-slate-100">
                      <div>
                        <span className="text-base font-black text-slate-900">₹{numDisc.toLocaleString()}</span>
                        {numOrig > numDisc && (
                          <span className="text-xs text-slate-400 line-through ml-1.5">
                            ₹{numOrig.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                        {(Number(c.enrolledStudent) || 0).toLocaleString()} enrolled
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/courses/${c.id}/edit`}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3 text-blue-600" />
                      <span>Edit</span>
                    </Link>
                    <Link
                      href={`/admin/assignments?courseId=${c.id}`}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1"
                    >
                      <Layers className="w-3 h-3 text-purple-600" />
                      <span>Curriculum</span>
                    </Link>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/course-detail/${c.slug}`}
                      target="_blank"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                      title="View public page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600"
                      title="Delete course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REFERENTIAL INTEGRITY SAFEGUARD MODAL */}
      {safeguardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Deletion Safeguard Active</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {safeguardModal.message}
                </p>
              </div>
            </div>

            {safeguardModal.details && safeguardModal.details.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Active Dependencies Found:
                </span>
                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-semibold">
                  {safeguardModal.details.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              To protect student classroom access and academic records, permanent deletion is disabled. You can
              safely <span className="font-bold text-slate-800">Archive</span> this course instead, which hides it from
              public search and prevents new purchases while preserving existing enrollments.
            </p>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSafeguardModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  const c = safeguardModal.course;
                  setSafeguardModal(null);
                  await handleToggleStatus({ ...c, isActive: true });
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Course Instead</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
