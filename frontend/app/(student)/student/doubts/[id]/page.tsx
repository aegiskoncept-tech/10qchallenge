'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Upload,
  FileText,
  HelpCircle,
  AlertCircle,
  RotateCcw,
  Check,
  ShieldCheck,
  Loader2,
  Download,
} from 'lucide-react';
import { DoubtRecord, DoubtReply, DoubtStatus, DoubtAttachmentItem } from '@/lib/doubts/types';

interface DoubtDetailPageProps {
  params: Promise<{ id: string }>;
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )10q_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function StudentDoubtDetailPage({ params }: DoubtDetailPageProps) {
  const resolvedParams = use(params);
  const doubtId = parseInt(resolvedParams.id, 10);

  const [doubt, setDoubt] = useState<DoubtRecord | null>(null);
  const [replies, setReplies] = useState<DoubtReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ status: number; message: string } | null>(null);

  // Reply form state
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<DoubtAttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDoubtDetail = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await fetch(`/api/student/doubts/${doubtId}`, { cache: 'no-store' });
      if (res.status === 401) {
        setErrorState({ status: 401, message: 'Please sign in to view your doubt conversation.' });
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setErrorState({ status: 403, message: 'Forbidden: You do not have permission to view another student\'s doubt.' });
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setErrorState({ status: 404, message: `Doubt #${doubtId} was not found.` });
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setDoubt(json.data);
        setReplies(json.data.replies || []);
      } else {
        setErrorState({ status: res.status, message: json.error || 'Failed to load doubt conversation.' });
      }
    } catch (err: any) {
      setErrorState({ status: 500, message: 'Network error connecting to doubt server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoubtDetail();
  }, [doubtId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionError(null);
    setIsUploading(true);

    try {
      const csrf = getCsrfToken();
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/student/doubts/upload', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
        body: fd,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to upload attachment.');
      }

      setReplyAttachments((prev) => [...prev, json.attachment]);
    } catch (err: any) {
      setActionError(err.message || 'Attachment upload failed.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && replyAttachments.length === 0) return;

    setIsSubmittingReply(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/student/doubts/${doubtId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({
          message: replyText.trim(),
          attachments: replyAttachments,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to post reply.');
      }

      setReplyText('');
      setReplyAttachments([]);
      setActionSuccess('Reply posted! Our faculty has been notified.');
      await loadDoubtDetail();
    } catch (err: any) {
      setActionError(err.message || 'Failed to post reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleMarkResolved = async () => {
    setActionError(null);
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/student/doubts/${doubtId}/resolve`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess('Doubt marked as resolved! Great job on your learning.');
        await loadDoubtDetail();
      } else {
        setActionError(json.error || 'Failed to resolve doubt.');
      }
    } catch {
      setActionError('Network error while resolving doubt.');
    }
  };

  const handleReopen = async () => {
    const reason = prompt('Please explain why you need further clarification:');
    if (reason === null) return;

    setActionError(null);
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/student/doubts/${doubtId}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess('Doubt reopened for further faculty review.');
        await loadDoubtDetail();
      } else {
        setActionError(json.error || 'Failed to reopen doubt.');
      }
    } catch {
      setActionError('Network error while reopening doubt.');
    }
  };

  const getStatusBadge = (status: DoubtStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Open Query</span>;
      case 'ASSIGNED':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Faculty Assigned</span>;
      case 'IN_PROGRESS':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">Under Review</span>;
      case 'ANSWERED':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 size={13} /> Faculty Answered</span>;
      case 'RESOLVED':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">Resolved</span>;
      case 'REOPENED':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Reopened</span>;
      default:
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-gray-50 text-gray-600">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-3">
        <Loader2 className="w-8 h-8 text-[#3F328A] animate-spin" />
        <p className="text-xs text-[#6E6990]">Loading doubt conversation thread...</p>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-[#E7E3F5] text-center space-y-5 shadow-xs">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-rose-50 text-rose-600">
          <AlertCircle size={32} />
        </div>
        <div>
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
            HTTP {errorState.status} • Access Barrier
          </span>
          <h2 className="text-xl font-black text-[#17152A] mt-1">{errorState.message}</h2>
        </div>
        <Link
          href="/student/doubts"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3F328A] text-white text-xs font-bold"
        >
          <ArrowLeft size={14} />
          <span>Return to My Doubts</span>
        </Link>
      </div>
    );
  }

  if (!doubt) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Header Navigation & Academic Meta */}
      <div className="bg-white rounded-3xl p-6 border border-[#E7E3F5] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1EFFB]">
          <div className="flex items-center gap-3">
            <Link
              href="/student/doubts"
              className="p-2.5 rounded-xl bg-[#F6F4FF] hover:bg-[#E7E3F5] text-[#3F328A] transition-colors"
              title="Back to My Doubts"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#3F328A] uppercase tracking-wider">
                <span>Doubt #{doubt.id}</span>
                <span>•</span>
                <span>{doubt.courseTitle}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-[#17152A] mt-0.5 line-clamp-1">
                {doubt.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(doubt.status)}
          </div>
        </div>

        {/* Academic Hierarchy Context */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6990]">
          {doubt.subjectName && (
            <span className="px-2.5 py-1 rounded-lg bg-[#F6F4FF] text-[#3F328A] font-bold">
              {doubt.subjectName}
            </span>
          )}
          {doubt.chapterName && (
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-semibold">
              Chapter: {doubt.chapterName}
            </span>
          )}
          {doubt.topicName && (
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 font-semibold">
              Topic: {doubt.topicName}
            </span>
          )}
          {doubt.videoTimestampMinutes && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold flex items-center gap-1">
              <Clock size={12} />
              Video @ {doubt.videoTimestampMinutes}
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)}>✕</button>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)}>✕</button>
        </div>
      )}

      {/* 2. Original Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E3F5] shadow-xs space-y-4">
        <div className="flex items-center justify-between text-xs pb-3 border-b border-[#F1EFFB]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#3F328A] text-white flex items-center justify-center font-black text-xs">
              {doubt.studentName.charAt(0)}
            </div>
            <div>
              <span className="font-bold text-[#17152A]">{doubt.studentName}</span>
              <span className="text-[#6E6990] ml-2 text-[11px]">(You)</span>
            </div>
          </div>
          <span className="text-[#6E6990] text-[11px]">
            {new Date(doubt.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="text-sm text-[#17152A] leading-relaxed whitespace-pre-wrap">
          {doubt.description}
        </div>
      </div>

      {/* 3. Conversation Replies Stream */}
      <div className="space-y-4">
        {replies.length > 0 && (
          <div className="text-xs font-bold text-[#6E6990] uppercase tracking-wider px-2">
            Conversation Thread ({replies.length} replies)
          </div>
        )}

        {replies.map((reply) => {
          const isStudent = reply.authorRole === 'STUDENT';

          return (
            <div
              key={reply.id}
              className={`p-6 rounded-3xl border shadow-xs space-y-3 ${
                isStudent
                  ? 'bg-white border-[#E7E3F5] mr-4 sm:mr-12'
                  : 'bg-[#F9F8FE] border-[#DCD6F7] ml-4 sm:ml-12'
              }`}
            >
              <div className="flex items-center justify-between text-xs pb-2 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isStudent
                        ? 'bg-[#3F328A] text-white'
                        : 'bg-[#20D66B] text-[#17152A]'
                    }`}
                  >
                    {isStudent ? 'S' : 'F'}
                  </div>
                  <div>
                    <span className="font-bold text-[#17152A]">{reply.authorName}</span>
                    {!isStudent && (
                      <span className="ml-2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
                        <ShieldCheck size={11} /> Faculty Response
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-[#6E6990]">
                  {new Date(reply.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="text-sm text-[#17152A] leading-relaxed whitespace-pre-wrap">
                {reply.message}
              </div>

              {/* Attachments */}
              {reply.attachments && reply.attachments.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {reply.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E3F5] text-xs font-bold text-[#3F328A] hover:bg-[#F6F4FF] transition"
                    >
                      <FileText size={14} />
                      <span className="truncate max-w-[180px]">{att.originalFilename}</span>
                      <Download size={12} className="text-gray-400" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Action Buttons (Resolve / Reopen) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#E7E3F5] shadow-xs">
        <div className="text-xs text-[#6E6990]">
          {doubt.status === 'RESOLVED' ? (
            <span className="text-emerald-700 font-semibold">✓ This doubt has been marked resolved.</span>
          ) : doubt.status === 'ANSWERED' ? (
            <span>Is your doubt resolved? Mark it resolved or reply for clarification.</span>
          ) : (
            <span>Awaiting master faculty response.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {['ANSWERED', 'RESOLVED'].includes(doubt.status) && (
            <button
              onClick={handleReopen}
              className="px-4 py-2 rounded-xl bg-[#F6F4FF] hover:bg-[#E7E3F5] text-[#3F328A] text-xs font-bold transition flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Need More Help? Reopen</span>
            </button>
          )}

          {doubt.status !== 'RESOLVED' && (
            <button
              onClick={handleMarkResolved}
              className="px-4 py-2 rounded-xl bg-[#E8FAF0] hover:bg-[#D2F6E1] text-[#16A34A] border border-[#C5F3D8] text-xs font-bold transition flex items-center gap-1.5"
            >
              <Check size={13} />
              <span>Mark as Resolved</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Reply Composer */}
      {doubt.status !== 'RESOLVED' ? (
        <form onSubmit={handleSendReply} className="bg-white rounded-3xl p-6 border border-[#E7E3F5] shadow-xs space-y-4">
          <h4 className="text-xs font-bold text-[#17152A] uppercase tracking-wider">
            Add Your Reply / Clarification
          </h4>

          <textarea
            rows={3}
            required
            placeholder="Type your response to faculty or explain which step you need clarified..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-[#E7E3F5] text-sm focus:outline-none focus:border-[#3F328A] focus:ring-1 focus:ring-[#3F328A] resize-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3.5 py-1.5 rounded-xl border border-dashed border-[#3F328A]/40 hover:bg-[#F6F4FF] text-xs font-semibold text-[#3F328A] flex items-center gap-1.5 transition">
                {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                <span>{isUploading ? 'Uploading...' : 'Attach File (PDF/Image)'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              {replyAttachments.map((att, idx) => (
                <div
                  key={att.id}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-1.5"
                >
                  <FileText size={12} />
                  <span className="truncate max-w-[120px]">{att.originalFilename}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-gray-400 hover:text-red-500 font-bold ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmittingReply || (!replyText.trim() && replyAttachments.length === 0)}
              className="px-6 py-2.5 rounded-xl bg-[#3F328A] hover:bg-[#2D246B] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingReply ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Reply</span>
                  <Send size={13} />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-[#6E6990]">
          This doubt is resolved. If you have additional questions on this topic, click "Reopen" above or ask a new question.
        </div>
      )}
    </div>
  );
}
