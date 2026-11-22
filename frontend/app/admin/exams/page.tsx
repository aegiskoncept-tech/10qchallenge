'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

interface ExamCategory {
  id: number;
  examName: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  displayIndex?: number;
  associatedCoursesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<ExamCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamCategory | null>(null);
  const [formData, setFormData] = useState({
    examName: '',
    slug: '',
    description: '',
    metaTitle: '',
    metaDescription: '',
    displayIndex: 1,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<ExamCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Status Toggle Loading
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/exams');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setExams(json.data);
        }
      }
    } catch (err) {
      console.error('[AdminExams] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const openCreateModal = () => {
    setEditingExam(null);
    setFormData({
      examName: '',
      slug: '',
      description: '',
      metaTitle: '',
      metaDescription: '',
      displayIndex: exams.length + 1,
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exam: ExamCategory) => {
    setEditingExam(exam);
    setFormData({
      examName: exam.examName,
      slug: exam.slug,
      description: exam.description || '',
      metaTitle: exam.metaTitle || '',
      metaDescription: exam.metaDescription || '',
      displayIndex: exam.displayIndex || 1,
      isActive: exam.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    const autoSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData((prev) => ({
      ...prev,
      examName: name,
      slug: editingExam ? prev.slug : autoSlug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const url = editingExam ? `/api/admin/exams/${editingExam.id}` : '/api/admin/exams';
      const method = editingExam ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save exam category.');
      }

      setIsModalOpen(false);
      await fetchExams();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (exam: ExamCategory) => {
    setTogglingId(exam.id);
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exam,
          isActive: !exam.isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Failed to update status.');
        return;
      }
      await fetchExams();
    } catch (err: any) {
      alert(err.message || 'Network error updating status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/exams/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete exam category.');
      }

      setDeleteTarget(null);
      await fetchExams();
    } catch (err: any) {
      setDeleteError(err.message || 'An error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && e.isActive) ||
      (statusFilter === 'INACTIVE' && !e.isActive);

    return matchesSearch && matchesStatus;
  });

  const totalCategories = exams.length;
  const activeCategories = exams.filter((e) => e.isActive).length;
  const inactiveCategories = exams.filter((e) => !e.isActive).length;
  const totalAssociatedCourses = exams.reduce((acc, e) => acc + (e.associatedCoursesCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <GraduationCap size={22} />
            </span>
            <span>Exam Master</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure target competitive examination categories (JEE, BITSAT, COMEDK, VITEEE, MET) and link them to courses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchExams}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
            title="Refresh list"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus size={16} />
            <span>Add Exam Category</span>
          </button>
        </div>
      </div>

      {/* Distinction & Architectural Context Banner */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-4 text-xs shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <HelpCircle size={15} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span>Exam Categories vs. Student Test Attempts</span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                Architectural Clarity
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              <strong>Exam Master</strong> defines top-level competitive entrance examination streams (e.g., JEE, BITSAT, COMEDK). These categories are attached to courses in Course Master. To build actual online test papers, question banks, or timed student mock exams, navigate to{' '}
              <Link href="/admin/test-series" className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                Test Series <ArrowRight size={11} />
              </Link>{' '}
              and{' '}
              <Link href="/admin/questions" className="font-bold text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                Question Management <ArrowRight size={11} />
              </Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Categories</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalCategories}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Competitive streams</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Categories</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{activeCategories}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Published on portal</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactive Categories</div>
          <div className="text-2xl font-black text-slate-700 mt-1">{inactiveCategories}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Draft / Hidden</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Associated Courses</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{totalAssociatedCourses}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">In Course Master</div>
        </div>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by exam name, slug, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === filter
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Categories Table */}
      {isLoading ? (
        <div className="min-h-[300px] bg-white rounded-2xl border border-slate-200/80 p-8 flex flex-col items-center justify-center space-y-3 shadow-xs">
          <LoadingSpinner size="lg" />
          <p className="text-xs font-bold text-slate-500">Loading Exam Categories...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Exam Categories Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No categories match your search or filter criteria.'
              : 'Get started by creating your first competitive examination stream.'}
          </p>
          {!searchTerm && statusFilter === 'ALL' && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 transition-all"
            >
              <Plus size={15} />
              <span>Create Category</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Exam Category</th>
                  <th className="py-3 px-4">Slug / Code</th>
                  <th className="py-3 px-4">Associated Courses</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Order */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                      #{exam.displayIndex || exam.id}
                    </td>

                    {/* Category Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{exam.examName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          ID: {exam.id}
                        </span>
                      </div>
                      {exam.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {exam.description}
                        </p>
                      )}
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {exam.slug}
                      </span>
                    </td>

                    {/* Associated Courses */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/courses?exam=${encodeURIComponent(exam.slug)}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 font-bold text-[11px] transition-all"
                        title="View associated courses in Course Master"
                      >
                        <BookOpen size={12} />
                        <span>{exam.associatedCoursesCount || 0} Courses</span>
                      </Link>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(exam)}
                        disabled={togglingId === exam.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          exam.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        {exam.isActive ? (
                          <>
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} className="text-slate-400" />
                            <span>Inactive</span>
                          </>
                        )}
                        {togglingId === exam.id && <RefreshCw size={10} className="animate-spin ml-1" />}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(exam)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Exam Category"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(exam)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Exam Category"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <GraduationCap size={17} className="text-indigo-600" />
                <span>{editingExam ? 'Edit Exam Category' : 'Add New Exam Category'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Exam Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exam Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BITSAT, JEE Main, COMEDK UGET"
                  value={formData.examName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Slug / Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unique Code / URL Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bitsat, jee, comedk"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Used in URL routing and course linking. Must be unique across all categories.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of this entrance examination stream..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Display Index & Active Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Index</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.displayIndex}
                    onChange={(e) => setFormData({ ...formData, displayIndex: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">Published / Active</span>
                  </label>
                </div>
              </div>

              {/* SEO Meta Title & Description (Optional) */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  SEO Metadata (Optional)
                </span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Meta Title</label>
                    <input
                      type="text"
                      placeholder="e.g. BITSAT 2026 Preparation | 10Q Challenge"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Meta Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Master BITSAT with top BITSian mentors..."
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>{editingExam ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Safeguard Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Exam Category</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-slate-800">&ldquo;{deleteTarget.examName}&rdquo;</span>?
              </p>

              {(deleteTarget.associatedCoursesCount || 0) > 0 ? (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    <span>Integrity Safeguard Block</span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    This category is currently linked to <strong>{deleteTarget.associatedCoursesCount} course(s)</strong>.
                    To prevent broken relationships in Course Master, you must reassign or remove these courses before this category can be deleted.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">
                  This action will permanently remove this exam stream from the master catalogue.
                </p>
              )}

              {deleteError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteTarget.id)}
                  disabled={isDeleting || (deleteTarget.associatedCoursesCount || 0) > 0}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeleting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
