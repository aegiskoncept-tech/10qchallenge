'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  GraduationCap,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface Chapter {
  id: number;
  courseId: number;
  subjectId: number;
  chapterName: string;
  chapterCode?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  courseTitle: string;
  courseExam?: string;
  subjectName: string;
  subjectCode?: string;
}

interface CourseOption {
  id: number;
  title: string;
  exam?: string;
  subjectIds?: number[];
}

interface SubjectOption {
  id: number;
  subjectName: string;
  subjectCode?: string;
}

export default function AdminChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [formData, setFormData] = useState({
    courseId: '',
    subjectId: '',
    chapterName: '',
    chapterCode: '',
    description: '',
    displayOrder: 1,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [chapRes, courseRes, subjRes] = await Promise.all([
        apiClient('/api/admin/chapters'),
        apiClient('/api/admin/courses'),
        apiClient('/api/admin/subjects'),
      ]);

      if (chapRes.ok) {
        const j = await chapRes.json();
        if (j.success && Array.isArray(j.data)) setChapters(j.data);
      }
      if (courseRes.ok) {
        const j = await courseRes.json();
        if (j.success && Array.isArray(j.data)) setCourses(j.data);
      }
      if (subjRes.ok) {
        const j = await subjRes.json();
        if (j.success && Array.isArray(j.data)) setSubjects(j.data);
      }
    } catch (err) {
      console.error('[AdminChapters] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingChapter(null);
    const defaultCourseId = courses.length > 0 ? String(courses[0].id) : '';
    const defaultSubjectId = subjects.length > 0 ? String(subjects[0].id) : '';
    setFormData({
      courseId: defaultCourseId,
      subjectId: defaultSubjectId,
      chapterName: '',
      chapterCode: '',
      description: '',
      displayOrder: chapters.length + 1,
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      courseId: String(chapter.courseId),
      subjectId: String(chapter.subjectId),
      chapterName: chapter.chapterName,
      chapterCode: chapter.chapterCode || '',
      description: chapter.description || '',
      displayOrder: chapter.displayOrder || 1,
      isActive: chapter.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.courseId) {
      setFormError('Please select a course.');
      return;
    }
    if (!formData.subjectId) {
      setFormError('Please select a subject.');
      return;
    }
    if (!formData.chapterName.trim()) {
      setFormError('Chapter name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        courseId: Number(formData.courseId),
        subjectId: Number(formData.subjectId),
        chapterName: formData.chapterName.trim(),
        chapterCode: formData.chapterCode.trim() || undefined,
        description: formData.description.trim() || undefined,
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive,
      };

      const url = editingChapter
        ? `/api/admin/chapters/${editingChapter.id}`
        : '/api/admin/chapters';
      const method = editingChapter ? 'PUT' : 'POST';

      const res = await apiClient(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Operation failed.');
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving chapter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await apiClient(`/api/admin/chapters/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete chapter.');
      }
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting chapter.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered chapters list
  const filteredChapters = chapters.filter((ch) => {
    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = ch.chapterName.toLowerCase().includes(q);
      const matchCode = ch.chapterCode?.toLowerCase().includes(q) || false;
      const matchCourse = ch.courseTitle?.toLowerCase().includes(q) || false;
      const matchSubj = ch.subjectName?.toLowerCase().includes(q) || false;
      if (!matchName && !matchCode && !matchCourse && !matchSubj) return false;
    }
    // Course filter
    if (courseFilter !== 'ALL' && String(ch.courseId) !== courseFilter) return false;
    // Subject filter
    if (subjectFilter !== 'ALL' && String(ch.subjectId) !== subjectFilter) return false;
    // Status filter
    if (statusFilter === 'ACTIVE' && !ch.isActive) return false;
    if (statusFilter === 'INACTIVE' && ch.isActive) return false;

    return true;
  });

  const activeCount = chapters.filter((c) => c.isActive).length;
  const inactiveCount = chapters.length - activeCount;
  const uniqueCoursesCount = new Set(chapters.map((c) => c.courseId)).size;

  // For the modal: filter subjects assigned to the selected course, if applicable
  const selectedCourseObj = courses.find((c) => String(c.id) === formData.courseId);
  const availableSubjectsForModal = subjects.filter((s) => {
    if (!selectedCourseObj || !selectedCourseObj.subjectIds || selectedCourseObj.subjectIds.length === 0) {
      return true; // If no mapping specified, show all
    }
    return selectedCourseObj.subjectIds.includes(Number(s.id));
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-7 w-7 text-indigo-600" />
            Chapter Master
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Curriculum chapter division mapped under specific Course-Subject pairs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Chapter
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Chapters</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{chapters.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Chapters</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inactive Chapters</p>
          <p className="text-2xl font-bold text-gray-600 mt-2">{inactiveCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Courses Covered</p>
          <p className="text-2xl font-bold text-indigo-700 mt-2">{uniqueCoursesCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chapters or codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.subjectName} ({s.subjectCode || 'No Code'})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Delete Error Notification */}
      {deleteError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Cannot Delete Chapter</p>
            <p className="text-sm text-red-700 mt-0.5">{deleteError}</p>
          </div>
          <button
            onClick={() => setDeleteError(null)}
            className="text-red-400 hover:text-red-600 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Chapters Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 mt-2">Loading chapter directory...</p>
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900">No chapters found</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {searchTerm || courseFilter !== 'ALL' || subjectFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Get started by creating your first academic chapter.'}
            </p>
            {!searchTerm && courseFilter === 'ALL' && subjectFilter === 'ALL' && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add Chapter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-16">Order</th>
                  <th className="py-3.5 px-4">Chapter Name</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredChapters.map((chapter) => (
                  <tr key={chapter.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-xs">
                      #{chapter.displayOrder || 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {chapter.chapterName}
                          {chapter.chapterCode && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                              {chapter.chapterCode}
                            </span>
                          )}
                        </div>
                        {chapter.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {chapter.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <GraduationCap className="h-3 w-3 text-indigo-500" />
                        {chapter.courseTitle}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <BookOpen className="h-3 w-3 text-amber-600" />
                        {chapter.subjectName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {chapter.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(chapter)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
                          title="Edit Chapter"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(chapter.id)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Chapter"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Course Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Course <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Subject</option>
                  {availableSubjectsForModal.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.subjectName} {s.subjectCode ? `(${s.subjectCode})` : ''}
                    </option>
                  ))}
                </select>
                {selectedCourseObj && selectedCourseObj.subjectIds && selectedCourseObj.subjectIds.length > 0 && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Showing subjects assigned to {selectedCourseObj.title} in Course Master.
                  </p>
                )}
              </div>

              {/* Chapter Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chapter Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mechanics & Kinematics"
                  value={formData.chapterName}
                  onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Chapter Code & Display Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Chapter Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BIT-PHY-01"
                    value={formData.chapterCode}
                    onChange={(e) => setFormData({ ...formData, chapterCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description / Topics Covered (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of syllabus covered in this chapter..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chapterIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="chapterIsActive" className="text-sm font-medium text-gray-700">
                  Active (Visible to students and test generation)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting && <LoadingSpinner size="sm" className="p-0 text-white" />}
                  {editingChapter ? 'Save Changes' : 'Create Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center">Delete Chapter?</h3>
            <p className="text-xs text-gray-500 text-center mt-1">
              Are you sure you want to permanently delete this chapter? This operation will fail if any topics or questions reference this chapter.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isDeleting && <LoadingSpinner size="sm" className="p-0 text-white" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
