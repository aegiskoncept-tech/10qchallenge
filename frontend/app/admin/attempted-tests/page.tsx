'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Award,
  FileCheck,
  TrendingUp,
  Eye,
  X,
  Target,
  User,
  BookOpen,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface AttemptSummary {
  id: string;
  studentId: number;
  studentName: string;
  studentEmail: string;
  paperId: number;
  paperTitle: string;
  examTag: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'EXPIRED';
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  score: number | null;
  accuracy: number | null;
  startedAt: string;
  submittedAt: string | null;
  submissionReason: string | null;
}

interface AttemptMetrics {
  total: number;
  completedCount: number;
  inProgressCount: number;
  avgScore: number;
  topScore: number;
}

export default function AdminAttemptedTestsPage() {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [metrics, setMetrics] = useState<AttemptMetrics>({
    total: 0,
    completedCount: 0,
    inProgressCount: 0,
    avgScore: 0,
    topScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Inspection Modal State
  const [inspectAttemptId, setInspectAttemptId] = useState<string | null>(null);
  const [inspectDetail, setInspectDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchAttempts = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/admin/attempted-tests');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setAttempts(j.data);
          if (j.metrics) setMetrics(j.metrics);
        }
      }
    } catch (err) {
      console.error('[AdminAttemptedTests] Error fetching attempts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  const openInspection = async (attemptId: string) => {
    setInspectAttemptId(attemptId);
    setIsLoadingDetail(true);
    setInspectDetail(null);
    try {
      const res = await apiClient(`/api/admin/attempted-tests/${attemptId}`);
      if (res.ok) {
        const j = await res.json();
        if (j.success && j.data) {
          setInspectDetail(j.data);
        }
      }
    } catch (err) {
      console.error('[AdminAttemptedTests] Error loading scorecard:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const filteredAttempts = useMemo(() => {
    return attempts.filter((a) => {
      if (examFilter !== 'ALL' && a.examTag?.toLowerCase() !== examFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'ALL' && a.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesId = a.id.toLowerCase().includes(q);
        const matchesName = a.studentName.toLowerCase().includes(q);
        const matchesEmail = a.studentEmail.toLowerCase().includes(q);
        const matchesPaper = a.paperTitle.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesEmail && !matchesPaper) return false;
      }
      return true;
    });
  }, [attempts, examFilter, statusFilter, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-500">
              CBT Analytics & Submissions
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">{metrics.total} Recorded Attempts</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-indigo-600" />
            <span>Attempted Tests & Performance Analytics</span>
          </h1>
        </div>

        <button
          onClick={fetchAttempts}
          className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Total Attempts</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Completed & Evaluated</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.completedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">In-Progress CBT Sessions</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{metrics.inProgressCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Top Mock Score</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {metrics.completedCount > 0 ? `${metrics.topScore} Marks` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search attempts by attempt ID, student name, email, or paper..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={examFilter}
          onChange={(e) => setExamFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Exam Tags</option>
          <option value="BITSAT">BITSAT</option>
          <option value="JEE Main">JEE Main</option>
          <option value="COMEDK">COMEDK</option>
          <option value="MET">MET</option>
          <option value="VITEEE">VITEEE</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Attempt Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
        </select>
      </div>

      {/* Attempts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-semibold text-slate-500 mt-2">Loading attempt records...</p>
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-slate-700">No Attempt Records Found</h3>
            <p className="text-xs text-slate-400 mt-1">Adjust your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Attempt ID</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Test Paper</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredAttempts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {a.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{a.studentName}</div>
                      <div className="text-[11px] text-slate-400">{a.studentEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div className="font-semibold text-slate-900 truncate">{a.paperTitle}</div>
                      <div className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5">
                        {a.examTag}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {a.score !== null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-indigo-600 text-sm">
                            {a.score} / {a.totalMarks}
                          </span>
                          {a.accuracy !== null && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                              {a.accuracy}% Acc
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unsubmitted</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(a.startedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          a.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {a.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{a.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openInspection(a.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                        title="Inspect Scorecard"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SCORECARD INSPECTION MODAL */}
      {inspectAttemptId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {isLoadingDetail || !inspectDetail ? (
              <div className="p-12 text-center">
                <LoadingSpinner size="lg" />
                <p className="text-xs font-semibold text-slate-500 mt-2">Loading scorecard evaluation...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Scorecard: {inspectDetail.paperTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Attempt #{inspectDetail.id} • Student #{inspectDetail.studentId} ({inspectDetail.studentName})
                    </p>
                  </div>
                  <button
                    onClick={() => setInspectAttemptId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score Header Pill */}
                {inspectDetail.result ? (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Final Evaluated Score</p>
                      <p className="text-2xl font-black text-amber-400">
                        {inspectDetail.result.finalScore} / {inspectDetail.result.maximumMarks} Marks
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs font-bold text-emerald-400">
                        {inspectDetail.result.correctQuestions} Correct • {inspectDetail.result.incorrectQuestions} Incorrect
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Accuracy: {inspectDetail.result.accuracy}% • +{inspectDetail.result.positiveMarks} / -{inspectDetail.result.negativeMarks} Marks
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold">
                    This attempt is currently IN_PROGRESS or has not completed formal evaluation.
                  </div>
                )}

                {/* Question-by-Question Evaluation Breakdown */}
                {inspectDetail.result?.questionDetails && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Question Response Breakdown
                    </h4>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {inspectDetail.result.questionDetails.map((qd: any, i: number) => (
                        <div
                          key={qd.questionId || i}
                          className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 font-black text-[11px] flex items-center justify-center text-slate-700">
                              #{i + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">
                                Question ID: {qd.questionId} ({qd.questionType})
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Response: {qd.studentResponse?.selectedOption || qd.studentResponse?.numericalValue || 'Unattempted'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                qd.evaluationStatus === 'CORRECT'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : qd.evaluationStatus === 'INCORRECT'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {qd.evaluationStatus}
                            </span>
                            <span className="font-bold text-xs text-slate-900 w-12 text-right">
                              {qd.marksAwarded > 0 ? `+${qd.marksAwarded}` : qd.marksAwarded} M
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setInspectAttemptId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  >
                    Close Scorecard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
