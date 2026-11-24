'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  GraduationCap,
  BookOpen,
  Clock,
  Award,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
  X,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface StudentSummary {
  id: number;
  fullName: string;
  email: string;
  mobileNumber?: string;
  role: string;
  targetExam: string;
  isActive: boolean;
  enrolledCoursesCount: number;
  testsAttemptedCount: number;
  lastLogin: string;
  createdAt: string;
}

interface StudentDetailData {
  student: StudentSummary;
  enrollments: Array<{
    id: string;
    courseId: string;
    courseTitle: string;
    accessState: string;
    enrolledAt: string;
    source: string;
  }>;
  attempts: Array<{
    id: string;
    paperId: number;
    paperTitle: string;
    examTag: string;
    status: string;
    startedAt: string;
    submittedAt?: string;
    result?: {
      finalScore: number;
      maximumMarks: number;
      accuracy: number;
    };
  }>;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Detail Drawer State
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/admin/students');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setStudents(j.data);
        }
      }
    } catch (err) {
      console.error('[AdminStudents] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openStudentDrawer = async (id: number) => {
    setSelectedStudentId(id);
    setIsLoadingDetail(true);
    setStudentDetail(null);
    try {
      const res = await apiClient(`/api/admin/students/${id}`);
      if (res.ok) {
        const j = await res.json();
        if (j.success && j.data) {
          setStudentDetail(j.data);
        }
      }
    } catch (err) {
      console.error('[AdminStudents] Fetch detail error:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleToggleStatus = async (studentId: number, currentActive: boolean) => {
    const actionText = currentActive ? 'suspend' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} this student's account?`)) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const res = await apiClient(`/api/admin/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !currentActive,
          revokeSessions: currentActive, // If suspending, immediately invalidate sessions
        }),
      });

      if (res.ok) {
        await fetchStudents();
        if (selectedStudentId === studentId && studentDetail) {
          setStudentDetail({
            ...studentDetail,
            student: { ...studentDetail.student, isActive: !currentActive },
          });
        }
      }
    } catch (err) {
      alert('Error updating student status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter === 'ACTIVE' && !s.isActive) return false;
      if (statusFilter === 'INACTIVE' && s.isActive) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = s.fullName.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesPhone = s.mobileNumber ? s.mobileNumber.includes(q) : false;
        const matchesExam = s.targetExam ? s.targetExam.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesExam) return false;
      }
      return true;
    });
  }, [students, statusFilter, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.isActive).length;
    const enrolled = students.filter((s) => s.enrolledCoursesCount > 0).length;
    const tests = students.reduce((acc, s) => acc + s.testsAttemptedCount, 0);
    return { total, active, enrolled, tests };
  }, [students]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
              User Directory & Accounts
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">{stats.total} Registered Aspirants</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Student Management</span>
          </h1>
        </div>

        <button
          onClick={fetchStudents}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Total Students</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Active Accounts</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Enrolled Students</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats.enrolled}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-black uppercase text-slate-400">Total Test Attempts</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{stats.tests}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search students by name, email, phone, or exam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Account Status</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Suspended Only</option>
        </select>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-semibold text-slate-500 mt-2">Loading students directory...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-slate-700">No Students Found</h3>
            <p className="text-xs text-slate-400 mt-1">Adjust your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Target Exam</th>
                  <th className="py-3 px-4">Courses</th>
                  <th className="py-3 px-4">Tests</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                          {s.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{s.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">ID: #{s.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{s.email}</div>
                      {s.mobileNumber && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{s.mobileNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        {s.targetExam}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.enrolledCoursesCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {s.enrolledCoursesCount} Enrolled
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.testsAttemptedCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {s.testsAttemptedCount} Attempts
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {s.isActive ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        <span>{s.isActive ? 'Active' : 'Suspended'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openStudentDrawer(s.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="View Student Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s.id, s.isActive)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            s.isActive
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={s.isActive ? 'Suspend Account' : 'Reactivate Account'}
                        >
                          {s.isActive ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
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

      {/* STUDENT DETAIL DRAWER / MODAL */}
      {selectedStudentId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {isLoadingDetail || !studentDetail ? (
              <div className="p-12 text-center">
                <LoadingSpinner size="lg" />
                <p className="text-xs font-semibold text-slate-500 mt-2">Loading student dossier...</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                      {studentDetail.student.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {studentDetail.student.fullName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-500">
                          #{studentDetail.student.id}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                            studentDetail.student.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {studentDetail.student.isActive ? 'Active Student' : 'Suspended'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contact and Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">
                      {studentDetail.student.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      {studentDetail.student.mobileNumber || 'No phone registered'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      Target: {studentDetail.student.targetExam || 'General'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      Joined: {new Date(studentDetail.student.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Enrolled Courses */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Enrolled Courses ({studentDetail.enrollments.length})</span>
                  </h4>
                  {studentDetail.enrollments.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Student has not enrolled in any paid courses yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {studentDetail.enrollments.map((en) => (
                        <div
                          key={en.id}
                          className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{en.courseTitle}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Enrolled {new Date(en.enrolledAt).toLocaleDateString()} via {en.source}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {en.accessState}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Test Attempts History */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>CBT Test History ({studentDetail.attempts.length})</span>
                  </h4>
                  {studentDetail.attempts.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No CBT mock tests attempted yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {studentDetail.attempts.map((att) => (
                        <div
                          key={att.id}
                          className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{att.paperTitle}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {att.examTag} • {att.status} •{' '}
                              {new Date(att.startedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            {att.result ? (
                              <span className="text-xs font-black text-indigo-600">
                                {att.result.finalScore} / {att.result.maximumMarks} Marks
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                In Progress
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Account Controls Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    disabled={isUpdatingStatus}
                    onClick={() =>
                      handleToggleStatus(studentDetail.student.id, studentDetail.student.isActive)
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      studentDetail.student.isActive
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {studentDetail.student.isActive ? 'Suspend Student Account' : 'Reactivate Account'}
                  </button>

                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  >
                    Close Dossier
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
