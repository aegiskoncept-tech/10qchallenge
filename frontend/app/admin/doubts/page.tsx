'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  User,
  GraduationCap,
  Video,
  Send,
  Trash2,
  Check,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { MathRenderer } from '@/components/ui/MathRenderer';

interface DoubtRecord {
  id: number;
  studentId: number | string;
  studentName: string;
  studentEmail?: string;
  courseId: number;
  courseTitle: string;
  lessonId?: number;
  lessonTitle?: string;
  subject?: string;
  queryText: string;
  timestampMinutes?: string;
  screenshotUrl?: string;
  status: 'PENDING' | 'RESOLVED';
  facultyName?: string;
  solutionText?: string;
  createdAt: string;
  solvedAt?: string;
}

export default function AdminDoubtsPage() {
  const [doubts, setDoubts] = useState<DoubtRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');

  // Solution Modal
  const [activeDoubt, setActiveDoubt] = useState<DoubtRecord | null>(null);
  const [solutionText, setSolutionText] = useState('');
  const [facultyName, setFacultyName] = useState('Dr. Vikramaditya (BITS Pilani)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDoubts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/doubts');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) setDoubts(j.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
  }, []);

  const openResolveModal = (d: DoubtRecord) => {
    setActiveDoubt(d);
    setSolutionText(d.solutionText || '');
    setFacultyName(d.facultyName || 'Dr. Vikramaditya (BITS Pilani)');
    setFormError(null);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoubt) return;
    if (!solutionText.trim()) {
      setFormError('Solution text is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/doubts/${activeDoubt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionText, facultyName }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to submit solution.');

      setActiveDoubt(null);
      await fetchDoubts();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this doubt record?')) return;
    try {
      await fetch(`/api/admin/doubts/${id}`, { method: 'DELETE' });
      await fetchDoubts();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDoubts = doubts.filter((d) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const match =
        d.queryText.toLowerCase().includes(q) ||
        d.studentName.toLowerCase().includes(q) ||
        d.courseTitle.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (subjectFilter !== 'ALL' && d.subject?.toLowerCase() !== subjectFilter.toLowerCase()) return false;
    return true;
  });

  const pendingCount = doubts.filter((d) => d.status === 'PENDING').length;
  const resolvedCount = doubts.filter((d) => d.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-indigo-600" />
            Student Doubts & Mentorship
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review student lecture questions, post step-by-step LaTeX solutions, and track mentor responses.
          </p>
        </div>
        <button
          onClick={fetchDoubts}
          disabled={isLoading}
          className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Refresh Doubts"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Queries</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{doubts.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Action</p>
          <p className="text-2xl font-bold text-amber-700 mt-2">{pendingCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved Queries</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{resolvedCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search queries by keywords, student, or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending Only</option>
          <option value="RESOLVED">Resolved Only</option>
        </select>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Subjects</option>
          <option value="Physics">Physics</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Mathematics">Mathematics</option>
        </select>
      </div>

      {/* Doubts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 mt-2">Loading doubts...</p>
          </div>
        ) : filteredDoubts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900">No student doubts found</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Student queries asked during video lectures and test reviews will appear here.
            </p>
          </div>
        ) : (
          filteredDoubts.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3 hover:border-indigo-200 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-400" />
                    {d.studentName}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                    <GraduationCap className="h-3 w-3" />
                    {d.courseTitle}
                  </span>
                  {d.lessonTitle && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-100">
                      <Video className="h-3 w-3" />
                      {d.lessonTitle} {d.timestampMinutes ? `(@ ${d.timestampMinutes})` : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {d.status === 'RESOLVED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  )}
                  <button
                    onClick={() => openResolveModal(d)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {d.status === 'RESOLVED' ? 'Edit Solution' : 'Answer'}
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Delete query"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Student Query */}
              <div className="text-gray-900 text-sm font-medium">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Student Query:
                </span>
                <MathRenderer content={d.queryText} />
              </div>

              {/* Faculty Solution */}
              {d.solutionText && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      Faculty Solution by {d.facultyName || 'Faculty'}:
                    </span>
                    {d.solvedAt && (
                      <span className="text-[11px] text-emerald-700">
                        {new Date(d.solvedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                  <div className="pl-3 border-l-2 border-emerald-400 mt-2 text-slate-800 leading-relaxed">
                    <MathRenderer content={d.solutionText} />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Answer Modal */}
      {activeDoubt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                Answer Student Doubt (Q#{activeDoubt.id})
              </h3>
              <button
                onClick={() => setActiveDoubt(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs space-y-1">
                <p className="text-gray-500 font-medium">Student: {activeDoubt.studentName}</p>
                <p className="font-semibold text-gray-900">
                  <MathRenderer content={activeDoubt.queryText} />
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Faculty / Mentor Name
                </label>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Detailed Solution (Supports LaTeX with $...$ or $$...$$)
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide clear step-by-step conceptual guidance..."
                  value={solutionText}
                  onChange={(e) => setSolutionText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {solutionText && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <p className="font-bold text-emerald-800 uppercase text-[10px] mb-1">
                    Live Solution Preview:
                  </p>
                  <MathRenderer content={solutionText} />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveDoubt(null)}
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
                  Submit Solution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
