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
  FileText,
  Send,
  Lock,
  UserCheck,
  AlertCircle,
  Paperclip,
  Eye,
  ChevronRight,
  Shield,
  CornerDownRight,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';
import { MathRenderer } from '@/components/ui/MathRenderer';
import { DoubtRecord, DoubtReply, DoubtStatus, DoubtSummaryMetrics } from '@/lib/doubts/types';

const STATUS_CONFIG: Record<
  DoubtStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  OPEN: {
    label: 'Open',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: HelpCircle,
  },
  ASSIGNED: {
    label: 'Assigned',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: UserCheck,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Clock,
  },
  ANSWERED: {
    label: 'Answered',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    icon: Sparkles,
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  REOPENED: {
    label: 'Reopened',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: RotateCcw,
  },
};

const DEFAULT_FACULTY_LIST = [
  { id: 101, name: 'Dr. Vikramaditya (BITS Pilani - Physics Lead)' },
  { id: 102, name: 'Prof. Sneha Verma (IIT Delhi - Mathematics Faculty)' },
  { id: 103, name: 'Dr. Rajesh Nair (IIT Madras - Chemistry Lead)' },
  { id: 104, name: 'Academic Support Desk (General Queries)' },
];

export default function AdminDoubtsPage() {
  const [doubts, setDoubts] = useState<DoubtRecord[]>([]);
  const [metrics, setMetrics] = useState<DoubtSummaryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Detail Modal / Drawer state
  const [selectedDoubtId, setSelectedDoubtId] = useState<number | null>(null);
  const [doubtDetail, setDoubtDetail] = useState<DoubtRecord | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Reply Composer state
  const [replyText, setReplyText] = useState('');
  const [replyVisibility, setReplyVisibility] = useState<'STUDENT_VISIBLE' | 'INTERNAL_NOTE'>('STUDENT_VISIBLE');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Assignment Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number>(DEFAULT_FACULTY_LIST[0].id);
  const [assignmentNote, setAssignmentNote] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchDoubts = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter !== 'ALL'
        ? `/api/admin/doubts?status=${encodeURIComponent(statusFilter)}`
        : '/api/admin/doubts';
      const res = await apiClient(url);
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setDoubts(j.data);
          if (j.metrics) setMetrics(j.metrics);
        }
      }
    } catch (err) {
      console.error('Error fetching admin doubts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
  }, [statusFilter]);

  const loadDoubtDetail = async (id: number) => {
    setSelectedDoubtId(id);
    setIsDetailLoading(true);
    setReplyError(null);
    setReplyText('');
    try {
      const res = await apiClient(`/api/admin/doubts/${id}`);
      if (res.ok) {
        const j = await res.json();
        if (j.success && j.data) {
          setDoubtDetail(j.data);
        }
      }
    } catch (err) {
      console.error('Error loading doubt detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtDetail || !replyText.trim()) return;

    setIsSendingReply(true);
    setReplyError(null);
    try {
      const endpoint =
        replyVisibility === 'INTERNAL_NOTE'
          ? `/api/admin/doubts/${doubtDetail.id}/internal-notes`
          : `/api/admin/doubts/${doubtDetail.id}/replies`;

      const payload =
        replyVisibility === 'INTERNAL_NOTE'
          ? { note: replyText.trim() }
          : { message: replyText.trim(), visibility: 'STUDENT_VISIBLE' };

      const res = await apiClient(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit reply.');
      }

      setReplyText('');
      // Reload detail and list
      await loadDoubtDetail(doubtDetail.id);
      await fetchDoubts();
    } catch (err: any) {
      setReplyError(err.message || 'Error submitting reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: DoubtStatus) => {
    if (!doubtDetail) return;
    try {
      const res = await apiClient(`/api/admin/doubts/${doubtDetail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadDoubtDetail(doubtDetail.id);
        await fetchDoubts();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAssignFaculty = async () => {
    if (!doubtDetail) return;
    const faculty = DEFAULT_FACULTY_LIST.find((f) => f.id === selectedFacultyId);
    if (!faculty) return;

    setIsAssigning(true);
    try {
      const res = await apiClient(`/api/admin/doubts/${doubtDetail.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyId: faculty.id,
          facultyName: faculty.name,
          notes: assignmentNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        setIsAssignModalOpen(false);
        setAssignmentNote('');
        await loadDoubtDetail(doubtDetail.id);
        await fetchDoubts();
      }
    } catch (err) {
      console.error('Failed to assign faculty:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredDoubts = doubts.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.studentName && d.studentName.toLowerCase().includes(q)) ||
      (d.courseTitle && d.courseTitle.toLowerCase().includes(q)) ||
      (d.subjectName && d.subjectName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-indigo-600" />
            Student Doubts & Mentorship Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Resolve student classroom queries, assign mentors, collaborate via internal staff notes, and maintain full academic lineage.
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
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.total ?? doubts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Open</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{metrics?.open ?? doubts.filter(d => d.status === 'OPEN').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Assigned</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{doubts.filter(d => d.status === 'ASSIGNED').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20">
          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{metrics?.inProgress ?? doubts.filter(d => d.status === 'IN_PROGRESS').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-cyan-200 shadow-xs bg-cyan-50/20">
          <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">Answered</p>
          <p className="text-2xl font-bold text-cyan-800 mt-1">{metrics?.answered ?? doubts.filter(d => d.status === 'ANSWERED').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Resolved</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{metrics?.resolved ?? doubts.filter(d => d.status === 'RESOLVED').length}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search queries by keywords, student name, course or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open (Needs Action)</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ANSWERED">Answered</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REOPENED">Reopened</option>
        </select>
      </div>

      {/* Main Doubts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-500 mt-2">Loading doubts list...</p>
          </div>
        ) : filteredDoubts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900">No student doubts found</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Student queries asked from the classroom lecture player and study modules will appear here.
            </p>
          </div>
        ) : (
          filteredDoubts.map((d) => {
            const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.OPEN;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3 hover:border-indigo-200 transition-all cursor-pointer"
                onClick={() => loadDoubtDetail(d.id)}
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
                    {d.subjectName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {d.subjectName}
                      </span>
                    )}
                    {d.topicName && (
                      <span className="text-gray-500">
                        › {d.topicName}
                      </span>
                    )}
                    {d.videoTimestampMinutes && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-100">
                        <Video className="h-3 w-3" />
                        @ {d.videoTimestampMinutes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadDoubtDetail(d.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      View & Manage <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Question preview */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{d.title}</h3>
                  <div className="text-xs text-gray-600 line-clamp-2">
                    <MathRenderer content={d.description} />
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <div className="flex items-center gap-3">
                    {d.assignedFacultyName ? (
                      <span className="text-indigo-600 font-medium flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" />
                        Assigned to: {d.assignedFacultyName}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">Unassigned</span>
                    )}
                    <span>•</span>
                    <span>{d.replyCount ?? 0} {d.replyCount === 1 ? 'reply' : 'replies'}</span>
                  </div>
                  <span>{new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Doubt Detail & Action Modal */}
      {selectedDoubtId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Doubt Thread #{selectedDoubtId}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {doubtDetail?.studentName} • {doubtDetail?.courseTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedDoubtId(null);
                  setDoubtDetail(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailLoading || !doubtDetail ? (
                <div className="py-16 text-center">
                  <LoadingSpinner size="lg" />
                  <p className="text-xs text-gray-500 mt-2">Loading conversation thread...</p>
                </div>
              ) : (
                <>
                  {/* Status & Assignment Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Status:</span>
                      <select
                        value={doubtDetail.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as DoubtStatus)}
                        className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="ANSWERED">ANSWERED</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="REOPENED">REOPENED</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      {doubtDetail.assignedFacultyName ? (
                        <span className="text-xs text-slate-700 font-medium">
                          Assigned: <strong>{doubtDetail.assignedFacultyName}</strong>
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Not assigned yet
                        </span>
                      )}
                      <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-100"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                        {doubtDetail.assignedFacultyName ? 'Reassign' : 'Assign Faculty'}
                      </button>
                    </div>
                  </div>

                  {/* Student Question Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-2">
                      <span className="font-bold text-gray-800">Original Student Query</span>
                      <span>{new Date(doubtDetail.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <h4 className="text-base font-bold text-gray-900">{doubtDetail.title}</h4>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      <MathRenderer content={doubtDetail.description} />
                    </div>

                    {/* Academic context tags */}
                    <div className="flex flex-wrap gap-2 pt-2 text-xs text-gray-500">
                      {doubtDetail.subjectName && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          Subject: {doubtDetail.subjectName}
                        </span>
                      )}
                      {doubtDetail.topicName && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          Topic: {doubtDetail.topicName}
                        </span>
                      )}
                      {doubtDetail.videoTimestampMinutes && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-medium rounded border border-purple-100 flex items-center gap-1">
                          <Video className="h-3 w-3" /> @ {doubtDetail.videoTimestampMinutes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thread Replies */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Conversation History & Internal Notes
                    </h4>

                    {(!doubtDetail.replies || doubtDetail.replies.length === 0) ? (
                      <p className="text-xs text-gray-400 italic">No replies posted yet.</p>
                    ) : (
                      doubtDetail.replies.map((r) => {
                        const isInternal = r.visibility === 'INTERNAL_NOTE';
                        return (
                          <div
                            key={r.id}
                            className={`p-4 rounded-xl border text-xs space-y-2 ${
                              isInternal
                                ? 'bg-amber-50/70 border-amber-300'
                                : r.authorRole === 'STUDENT'
                                ? 'bg-white border-gray-200'
                                : 'bg-indigo-50/50 border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{r.authorName}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    r.authorRole === 'STUDENT'
                                      ? 'bg-gray-200 text-gray-700'
                                      : 'bg-indigo-200 text-indigo-800'
                                  }`}
                                >
                                  {r.authorRole}
                                </span>
                                {isInternal && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                                    <Lock className="h-2.5 w-2.5" /> INTERNAL STAFF NOTE (Hidden from Student)
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-400 text-[11px]">
                                {new Date(r.createdAt).toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div className="text-gray-800 leading-relaxed text-sm">
                              <MathRenderer content={r.message} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Composer */}
                  <form onSubmit={handleSendReply} className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Add Reply / Note:</span>
                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-gray-700">
                          <input
                            type="radio"
                            name="visibility"
                            checked={replyVisibility === 'STUDENT_VISIBLE'}
                            onChange={() => setReplyVisibility('STUDENT_VISIBLE')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Public Student Reply</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-amber-700 font-medium">
                          <input
                            type="radio"
                            name="visibility"
                            checked={replyVisibility === 'INTERNAL_NOTE'}
                            onChange={() => setReplyVisibility('INTERNAL_NOTE')}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span className="flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Internal Staff Note
                          </span>
                        </label>
                      </div>
                    </div>

                    {replyError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {replyError}
                      </div>
                    )}

                    <textarea
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        replyVisibility === 'INTERNAL_NOTE'
                          ? 'Add internal notes or instructions for faculty (never visible to student)...'
                          : 'Write comprehensive solution or guidance for the student (supports LaTeX)...'
                      }
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      required
                    />

                    <div className="flex items-center justify-between">
                      <div className="text-[11px] text-gray-400">
                        {replyVisibility === 'STUDENT_VISIBLE' ? (
                          <span>Student will be notified and status will update to ANSWERED</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Internal notes remain completely confidential</span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isSendingReply || !replyText.trim()}
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-xs disabled:opacity-50 transition-colors ${
                          replyVisibility === 'INTERNAL_NOTE'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {isSendingReply ? (
                          <LoadingSpinner size="sm" className="p-0 text-white" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {replyVisibility === 'INTERNAL_NOTE' ? 'Post Internal Note' : 'Send Student Reply'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Faculty Modal */}
      {isAssignModalOpen && doubtDetail && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-2">
              Assign Doubt to Faculty
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select an academic faculty member to take ownership of this student query.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Faculty
                </label>
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DEFAULT_FACULTY_LIST.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assignment Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                  placeholder="e.g. Needs step-by-step calculus derivation for rotation..."
                  className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignFaculty}
                  disabled={isAssigning}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {isAssigning && <LoadingSpinner size="sm" className="p-0 text-white" />}
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
