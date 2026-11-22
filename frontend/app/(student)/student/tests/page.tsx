'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileQuestion,
  Clock,
  Sparkles,
  Play,
  Flame,
  Search,
  AlertCircle,
  RefreshCw,
  Award,
  CheckCircle2,
  XCircle,
  ArrowRight,
  History,
  TrendingUp,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

export interface StudentTestPaper {
  id: number;
  title: string;
  examTag: string;
  targetYear: number;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  price: number;
  status: string;
}

export interface StudentAttemptItem {
  id: string;
  attemptNumber: number;
  paperId: number;
  paperTitle: string;
  examTag: string;
  targetYear: number;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  startedAt: string;
  expiresAt: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  submittedAt: string | null;
  submissionReason: string | null;
  score: number | null;
  maximumMarks: number;
  percentage: number | null;
  accuracy: number | null;
  attemptedQuestions: number | null;
  correctQuestions: number | null;
  incorrectQuestions: number | null;
  unattemptedQuestions: number | null;
}

export default function StudentTestsHubPage() {
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [tests, setTests] = useState<StudentTestPaper[]>([]);
  const [attempts, setAttempts] = useState<StudentAttemptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'FULL_MOCK' | 'CHAPTER_TEST'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [testRes, attemptsRes] = await Promise.all([
        fetch('/api/student/tests'),
        fetch('/api/student/tests/attempts'),
      ]);

      if (testRes.ok) {
        const testData = await testRes.json();
        if (testData.success) {
          setTests(testData.data || []);
        }
      }

      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        if (attemptsData.success) {
          setAttempts(attemptsData.data || []);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to test series service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const filteredTests = tests.filter((test) => {
    const examTag = test.examTag || 'BITSAT';
    const matchesSearch =
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      examTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategory === 'FULL_MOCK') {
      return test.title.toLowerCase().includes('full') || test.title.toLowerCase().includes('mock');
    }
    if (selectedCategory === 'CHAPTER_TEST') {
      return !test.title.toLowerCase().includes('full') && !test.title.toLowerCase().includes('mock');
    }
    return true;
  });

  const filteredAttempts = attempts.filter((attempt) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      attempt.paperTitle.toLowerCase().includes(q) ||
      attempt.examTag.toLowerCase().includes(q) ||
      attempt.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#17152A] via-[#2A2356] to-[#3F328A] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-[#FF3F68]/20 to-transparent blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-bold mb-3 border border-white/10">
            <Sparkles size={14} className="animate-spin" />
            <span>NTA &amp; BITSAT CBT Simulator 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            Computer-Based Test (CBT) Series
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Practice real exam-pattern mock tests with live countdown timers, section switching, review flags, and detailed post-test score analysis.
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs: Available Mocks vs Attempt History */}
      <div className="flex border-b border-[#E7E3F5] gap-4">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'available'
              ? 'border-[#3F328A] text-[#3F328A]'
              : 'border-transparent text-[#6E6990] hover:text-[#17152A]'
          }`}
        >
          <FileQuestion size={16} />
          <span>Available Mock Tests ({tests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-[#3F328A] text-[#3F328A]'
              : 'border-transparent text-[#6E6990] hover:text-[#17152A]'
          }`}
        >
          <History size={16} />
          <span>My Test Attempts ({attempts.length})</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {activeTab === 'available' ? (
          <div className="flex bg-white p-1 rounded-2xl border border-[#E7E3F5] text-xs font-bold shadow-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-xl transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-[#3F328A] text-white shadow-xs'
                  : 'text-[#6E6990] hover:text-[#17152A]'
              }`}
            >
              All Tests ({tests.length})
            </button>
            <button
              onClick={() => setSelectedCategory('FULL_MOCK')}
              className={`px-4 py-2 rounded-xl transition-all ${
                selectedCategory === 'FULL_MOCK'
                  ? 'bg-[#3F328A] text-white shadow-xs'
                  : 'text-[#6E6990] hover:text-[#17152A]'
              }`}
            >
              Full-Length Mocks
            </button>
            <button
              onClick={() => setSelectedCategory('CHAPTER_TEST')}
              className={`px-4 py-2 rounded-xl transition-all ${
                selectedCategory === 'CHAPTER_TEST'
                  ? 'bg-[#3F328A] text-white shadow-xs'
                  : 'text-[#6E6990] hover:text-[#17152A]'
              }`}
            >
              Chapter Practice Tests
            </button>
          </div>
        ) : (
          <div className="text-xs text-[#6E6990] font-semibold flex items-center gap-1.5">
            <Award size={16} className="text-[#3F328A]" />
            <span>Completed &amp; in-progress examinations associated with your account</span>
          </div>
        )}

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6990]" />
          <input
            type="text"
            placeholder={activeTab === 'available' ? 'Search test name or exam...' : 'Search attempt history...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white border border-[#E7E3F5] rounded-xl text-xs font-medium text-[#17152A] placeholder-[#6E6990] focus:outline-none focus:border-[#3F328A]"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-3xl border border-[#E7E3F5] p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
          <LoadingSpinner size="md" className="mx-auto" />
          <p className="text-xs font-semibold text-[#6E6990]">Loading examinations &amp; attempt records...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-red-50 rounded-3xl border border-red-200 p-8 text-center max-w-md mx-auto space-y-3">
          <AlertCircle size={32} className="text-red-600 mx-auto" />
          <h3 className="font-extrabold text-sm text-red-900">Failed to Load Examination Data</h3>
          <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          <button
            onClick={fetchTests}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* TAB 1: Available Mock Tests */}
      {!isLoading && !error && activeTab === 'available' && (
        <>
          {filteredTests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E7E3F5] p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
              <FileQuestion size={36} className="text-[#3F328A] mx-auto" />
              <h3 className="font-extrabold text-base text-[#17152A]">No CBT Mock Tests Available</h3>
              <p className="text-xs text-[#6E6990] leading-relaxed">
                {searchTerm || selectedCategory !== 'ALL'
                  ? 'No tests match your current search or filter criteria.'
                  : 'CBT mock tests will appear here once published from the Admin Panel.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map((test) => {
                const userAttemptsForThis = attempts.filter((a) => a.paperId === test.id);
                const hasActive = userAttemptsForThis.some((a) => a.status === 'IN_PROGRESS');

                return (
                  <div
                    key={test.id}
                    className="bg-white rounded-3xl border border-[#E7E3F5] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#F0EDFD] text-[#3F328A] border border-[#E2DCFB]">
                          {test.examTag || 'BITSAT'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Flame size={12} /> {test.totalMarks} Marks
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base text-[#17152A] group-hover:text-[#3F328A] transition-colors line-clamp-2 mb-2">
                        {test.title}
                      </h3>
                      <p className="text-xs text-[#6E6990] line-clamp-2 mb-4 leading-relaxed">
                        {test.description || 'Simulate official exam conditions with exact pattern, negative marking, and real-time timer.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[#F6F4FF] border border-[#F1EFFB] text-xs mb-4">
                        <div className="flex items-center gap-1.5 text-[#17152A] font-semibold">
                          <Clock size={14} className="text-[#3F328A]" />
                          <span>{test.durationMinutes} Mins</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#17152A] font-semibold">
                          <FileQuestion size={14} className="text-[#3F328A]" />
                          <span>{test.totalQuestions} Questions</span>
                        </div>
                      </div>

                      {userAttemptsForThis.length > 0 && (
                        <div className="mb-4 text-[11px] text-[#6E6990] flex items-center justify-between px-1">
                          <span>Attempts Taken: <strong className="text-[#17152A]">{userAttemptsForThis.length}</strong></span>
                          {hasActive && (
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Active Session
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/student/tests/${test.id}`}
                      className="w-full py-3 rounded-xl bg-[#3F328A] hover:bg-[#2A2356] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md"
                    >
                      <Play size={14} className="fill-current" />
                      <span>{hasActive ? 'Resume Active Test' : 'View Details & Instructions'}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: Attempt History */}
      {!isLoading && !error && activeTab === 'history' && (
        <>
          {filteredAttempts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#E7E3F5] p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
              <History size={36} className="text-[#3F328A] mx-auto" />
              <h3 className="font-extrabold text-base text-[#17152A]">No Attempts Found</h3>
              <p className="text-xs text-[#6E6990] leading-relaxed">
                {searchTerm
                  ? 'No examination attempt matches your search.'
                  : 'You have not attempted any mock tests yet. Choose a test from the Available Mock Tests tab to start!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAttempts.map((attempt) => {
                const isCompleted = attempt.status === 'COMPLETED';
                const isInProgress = attempt.status === 'IN_PROGRESS';

                return (
                  <div
                    key={attempt.id}
                    className="bg-white rounded-2xl border border-[#E7E3F5] p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F0EDFD] text-[#3F328A]">
                          {attempt.examTag}
                        </span>
                        <span className="text-xs font-mono text-[#6E6990]">
                          Attempt #{attempt.attemptNumber}
                        </span>
                        <span className="text-xs text-[#6E6990]">•</span>
                        <span className="text-xs text-[#6E6990]">
                          {new Date(attempt.startedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          <span>{isCompleted ? 'Completed' : 'In Progress'}</span>
                        </span>
                      </div>

                      <h3 className="font-black text-base text-[#17152A]">{attempt.paperTitle}</h3>

                      <div className="flex items-center gap-4 text-xs text-[#6E6990] flex-wrap pt-1">
                        <span>Duration: {attempt.durationMinutes} mins</span>
                        <span>•</span>
                        <span>Questions: {attempt.totalQuestions}</span>
                        {isCompleted && attempt.score !== null && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-[#17152A]">
                              Score: {attempt.score} / {attempt.maximumMarks}
                            </span>
                            {attempt.accuracy !== null && (
                              <>
                                <span>•</span>
                                <span className="font-bold text-emerald-700">
                                  Accuracy: {attempt.accuracy}%
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      {isCompleted ? (
                        <Link
                          href={`/student/tests/results/${attempt.id}`}
                          className="px-5 py-2.5 rounded-xl bg-[#3F328A] hover:bg-[#2A2356] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                        >
                          <Award size={14} />
                          <span>View Scorecard</span>
                          <ArrowRight size={14} />
                        </Link>
                      ) : (
                        <Link
                          href={`/student/tests/session/${attempt.id}`}
                          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                        >
                          <Play size={14} className="fill-current" />
                          <span>Resume Test</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
