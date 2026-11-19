'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileQuestion,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Award,
  Layers,
  IndianRupee,
  ListOrdered,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

interface TestSeriesItem {
  id: number;
  title: string;
  examTag: string;
  targetYear: number;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  price: number;
  status: 'Published' | 'Draft' | 'Archived';
  createdAt: string;
}

export default function AdminTestSeriesPage() {
  const [tests, setTests] = useState<TestSeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestSeriesItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    examTag: 'BITSAT',
    targetYear: 2026,
    description: '',
    durationMinutes: 180,
    totalQuestions: 130,
    totalMarks: 390,
    price: 499,
    status: 'Published' as 'Published' | 'Draft' | 'Archived',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/test-series');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) setTests(j.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const openCreateModal = () => {
    setEditingTest(null);
    setFormData({
      title: '',
      examTag: 'BITSAT',
      targetYear: 2026,
      description: '',
      durationMinutes: 180,
      totalQuestions: 130,
      totalMarks: 390,
      price: 499,
      status: 'Published',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: TestSeriesItem) => {
    setEditingTest(t);
    setFormData({
      title: t.title,
      examTag: t.examTag,
      targetYear: t.targetYear || 2026,
      description: t.description || '',
      durationMinutes: t.durationMinutes || 180,
      totalQuestions: t.totalQuestions || 130,
      totalMarks: t.totalMarks || 390,
      price: t.price || 0,
      status: t.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('Test title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingTest ? `/api/admin/test-series/${editingTest.id}` : '/api/admin/test-series';
      const method = editingTest ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save test series.');

      setIsModalOpen(false);
      await fetchTests();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/test-series/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete.');
      setDeleteConfirmId(null);
      await fetchTests();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const match =
        t.title.toLowerCase().includes(q) ||
        t.examTag.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (examFilter !== 'ALL' && t.examTag.toLowerCase() !== examFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  const publishedCount = tests.filter((t) => t.status === 'Published').length;
  const totalQuestionsSum = tests.reduce((sum, t) => sum + (t.totalQuestions || 0), 0);
  const uniqueExamsCount = new Set(tests.map((t) => t.examTag)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileQuestion className="h-7 w-7 text-indigo-600" />
            Test Series Master
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Authoritative CBT mock examination packs, timing rules, question pool binding, and pricing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTests}
            disabled={isLoading}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Tests"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Test
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Mock Tests</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{tests.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Published</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{publishedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Test Questions</p>
          <p className="text-2xl font-bold text-purple-700 mt-2">{totalQuestionsSum}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Exams Covered</p>
          <p className="text-2xl font-bold text-indigo-700 mt-2">{uniqueExamsCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search mock tests by name, exam tag, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={examFilter}
          onChange={(e) => setExamFilter(e.target.value)}
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Entrance Exams</option>
          <option value="BITSAT">BITSAT</option>
          <option value="JEE Main">JEE Main</option>
          <option value="COMEDK">COMEDK</option>
          <option value="MET">MET</option>
          <option value="VITEEE">VITEEE</option>
        </select>
      </div>

      {/* Tests Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 mt-2">Loading mock test directory...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="p-12 text-center">
            <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900">No mock tests found</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Create your first full-length CBT mock test for students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Test Title</th>
                  <th className="py-3.5 px-4">Exam Tag</th>
                  <th className="py-3.5 px-4">Structure</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTests.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {t.title}
                        <span className="text-[11px] font-mono text-gray-400">({t.targetYear})</span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {t.examTag}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      <div>
                        <span>{t.totalQuestions} Questions • {t.durationMinutes} mins</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">Total Marks: {t.totalMarks}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-xs text-gray-900">
                      {t.price > 0 ? `₹${t.price}` : <span className="text-emerald-700">Free</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          t.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {t.status === 'Published' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/test-series/${t.id}/questions`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                          title="Manage Paper Questions"
                        >
                          <ListOrdered className="w-3.5 h-3.5" />
                          <span>Questions</span>
                        </Link>
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
                          title="Edit Test"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(t.id)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Test"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTest ? 'Edit Mock Test' : 'Create New CBT Mock Test'}
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Test Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BITSAT 2026 Full Syllabus CBT Mock 01"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Exam Tag
                  </label>
                  <select
                    value={formData.examTag}
                    onChange={(e) => setFormData({ ...formData, examTag: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="BITSAT">BITSAT</option>
                    <option value="JEE Main">JEE Main</option>
                    <option value="COMEDK">COMEDK</option>
                    <option value="MET">MET</option>
                    <option value="VITEEE">VITEEE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Year
                  </label>
                  <input
                    type="number"
                    value={formData.targetYear}
                    onChange={(e) => setFormData({ ...formData, targetYear: Number(e.target.value) || 2026 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) || 180 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Total Questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalQuestions}
                    onChange={(e) => setFormData({ ...formData, totalQuestions: Number(e.target.value) || 130 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) || 390 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Standalone Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Exam pattern highlights, bonus question instructions, etc."
                />
              </div>

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
                  {editingTest ? 'Save Changes' : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Mock Test?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to delete this test?
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
