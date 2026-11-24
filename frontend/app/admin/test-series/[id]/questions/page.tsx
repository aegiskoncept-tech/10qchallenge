'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Filter,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  X,
  Layers,
  Award,
  Clock,
  BookOpen,
  Hash,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckSquare,
  Square,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { MathText } from '@/components/student/MathText';
import { apiClient } from '@/lib/apiClient';

interface QuestionItem {
  id: number;
  questionNumber?: number;
  questionType: 'objective' | 'numerical';
  subjectId: number;
  subjectName: string;
  chapterId: number;
  chapterName: string;
  questionContent: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  numericalAnswer?: number | string;
  solution?: string;
  difficulty: string;
  marks?: number;
}

interface TestPaperMetadata {
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
  version: number;
  markingScheme: {
    positiveMarks: number;
    negativeMarks: number;
    sectionOverrides?: Record<string, { positiveMarks: number; negativeMarks: number }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface SubjectItem {
  id: number;
  subjectName: string;
  subjectCode: string;
}

interface ChapterItem {
  id: number;
  chapterName: string;
  subjectId: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TestSeriesQuestionLinkerPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const paperId = Number(resolvedParams.id);
  const router = useRouter();

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Paper & Master Data
  const [paper, setPaper] = useState<TestPaperMetadata | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionItem[]>([]);

  // Working State (Right Pane)
  const [linkedQuestions, setLinkedQuestions] = useState<QuestionItem[]>([]);
  const [initialQuestionIds, setInitialQuestionIds] = useState<number[]>([]);

  // Marking Scheme Working State
  const [markingPositive, setMarkingPositive] = useState<number>(3);
  const [markingNegative, setMarkingNegative] = useState<number>(1);
  const [initialMarking, setInitialMarking] = useState<{ positive: number; negative: number }>({
    positive: 3,
    negative: 1,
  });
  const [showMarkingSettings, setShowMarkingSettings] = useState(false);

  // Filter & Search (Left Pane)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');

  // Preview Modal State
  const [previewQuestion, setPreviewQuestion] = useState<QuestionItem | null>(null);

  // Save / Conflict State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Fetch full linker data
  const fetchData = async () => {
    setIsLoading(true);
    setLoadError(null);
    setConflictError(null);
    try {
      const res = await apiClient(`/api/admin/test-series/${paperId}/questions`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load test paper data.');
      }

      const d = json.data;
      setPaper(d.paper);
      setSubjects(d.subjects || []);
      setChapters(d.chapters || []);
      setAvailableQuestions(d.availableQuestions || []);
      setLinkedQuestions(d.linkedQuestions || []);

      const qIds = (d.linkedQuestions || []).map((q: QuestionItem) => q.id);
      setInitialQuestionIds(qIds);

      const pos = d.paper?.markingScheme?.positiveMarks ?? 3;
      const neg = d.paper?.markingScheme?.negativeMarks ?? 1;
      setMarkingPositive(pos);
      setMarkingNegative(neg);
      setInitialMarking({ positive: pos, negative: neg });
    } catch (err: any) {
      setLoadError(err.message || 'Error loading Question Linker.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [paperId]);

  // Dirty State Detection
  const isDirty = useMemo(() => {
    const currentIds = linkedQuestions.map((q) => q.id);
    if (currentIds.length !== initialQuestionIds.length) return true;
    for (let i = 0; i < currentIds.length; i++) {
      if (currentIds[i] !== initialQuestionIds[i]) return true;
    }
    if (markingPositive !== initialMarking.positive) return true;
    if (markingNegative !== initialMarking.negative) return true;
    return false;
  }, [linkedQuestions, initialQuestionIds, markingPositive, markingNegative, initialMarking]);

  // Linked Set for Fast Lookup
  const linkedIdSet = useMemo(() => {
    return new Set(linkedQuestions.map((q) => q.id));
  }, [linkedQuestions]);

  // Filtered Chapters based on selected subject
  const filteredChapters = useMemo(() => {
    if (selectedSubjectId === 'ALL') return chapters;
    return chapters.filter((c) => String(c.subjectId) === selectedSubjectId);
  }, [chapters, selectedSubjectId]);

  // Filtered Available Questions
  const displayedAvailableQuestions = useMemo(() => {
    return availableQuestions.filter((q) => {
      if (selectedSubjectId !== 'ALL' && String(q.subjectId) !== selectedSubjectId) return false;
      if (selectedChapterId !== 'ALL' && String(q.chapterId) !== selectedChapterId) return false;
      if (selectedType !== 'ALL' && q.questionType !== selectedType) return false;
      if (
        selectedDifficulty !== 'ALL' &&
        q.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase()
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesContent = q.questionContent.toLowerCase().includes(term);
        const matchesId = String(q.id) === term;
        const matchesSubject = q.subjectName.toLowerCase().includes(term);
        const matchesChapter = q.chapterName.toLowerCase().includes(term);
        if (!matchesContent && !matchesId && !matchesSubject && !matchesChapter) return false;
      }
      return true;
    });
  }, [
    availableQuestions,
    selectedSubjectId,
    selectedChapterId,
    selectedType,
    selectedDifficulty,
    searchTerm,
  ]);

  // Dynamic Subject & Chapter Metrics for Linked Questions
  const liveMetrics = useMemo(() => {
    const totalQ = linkedQuestions.length;
    const totalMarks = totalQ * markingPositive;

    const subMap = new Map<string, { count: number; marks: number }>();
    linkedQuestions.forEach((q) => {
      const s = q.subjectName || 'Unassigned';
      const cur = subMap.get(s) || { count: 0, marks: 0 };
      cur.count += 1;
      cur.marks += markingPositive;
      subMap.set(s, cur);
    });

    return {
      totalQuestions: totalQ,
      totalMarks,
      subjectBreakdown: Array.from(subMap.entries()).map(([name, stat]) => ({
        name,
        count: stat.count,
        marks: stat.marks,
      })),
    };
  }, [linkedQuestions, markingPositive]);

  // Handlers for Question Assignment
  const handleAddQuestion = (q: QuestionItem) => {
    if (linkedIdSet.has(q.id)) return;
    setLinkedQuestions((prev) => [...prev, q]);
    setSaveSuccess(false);
  };

  const handleRemoveQuestion = (qId: number) => {
    setLinkedQuestions((prev) => prev.filter((q) => q.id !== qId));
    setSaveSuccess(false);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setLinkedQuestions((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
    setSaveSuccess(false);
  };

  const handleMoveDown = (index: number) => {
    if (index >= linkedQuestions.length - 1) return;
    setLinkedQuestions((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
    setSaveSuccess(false);
  };

  const handleAddAllFiltered = () => {
    const toAdd = displayedAvailableQuestions.filter((q) => !linkedIdSet.has(q.id));
    if (toAdd.length === 0) return;
    setLinkedQuestions((prev) => [...prev, ...toAdd]);
    setSaveSuccess(false);
  };

  const handleClearAllSelected = () => {
    if (linkedQuestions.length === 0) return;
    if (window.confirm('Are you sure you want to remove all questions from this test?')) {
      setLinkedQuestions([]);
      setSaveSuccess(false);
    }
  };

  // Save Changes
  const handleSaveChanges = async () => {
    if (!paper) return;

    if (paper.status === 'Published' && linkedQuestions.length === 0) {
      setSaveError('Cannot save zero questions on a Published paper. Add questions or draft the paper.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setConflictError(null);
    setSaveSuccess(false);

    try {
      const questionIds = linkedQuestions.map((q) => q.id);
      const res = await apiClient(`/api/admin/test-series/${paperId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds,
          markingScheme: {
            positiveMarks: markingPositive,
            negativeMarks: markingNegative,
          },
          expectedVersion: paper.version,
        }),
      });

      const json = await res.json();

      if (res.status === 409) {
        setConflictError(json.error || 'Concurrent update conflict detected. Please reload.');
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save linked questions.');
      }

      // Update state with newly saved paper
      const updatedPaper = json.data.testSeries;
      setPaper(updatedPaper);
      setInitialQuestionIds(updatedPaper.questionIds || []);
      setInitialMarking({
        positive: updatedPaper.markingScheme?.positiveMarks ?? markingPositive,
        negative: updatedPaper.markingScheme?.negativeMarks ?? markingNegative,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm font-semibold text-slate-600">Loading Question Linker workspace...</p>
      </div>
    );
  }

  if (loadError || !paper) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-rose-200 shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Failed to Load Test Paper</h2>
          <p className="text-xs text-slate-600">{loadError || 'Paper could not be retrieved.'}</p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/admin/test-series"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Back to Test Series
            </Link>
            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Sticky Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin/test-series"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Return to Test Series list"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Question Linker
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-semibold text-slate-500">{paper.examTag}</span>
                <span className="text-slate-300">•</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                  v{paper.version}
                </span>
                {paper.status === 'Published' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Published
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {paper.status}
                  </span>
                )}
              </div>
              <h1 className="text-sm md:text-base font-extrabold text-slate-900 truncate max-w-md">
                {paper.title}
              </h1>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                Unsaved Changes
              </span>
            )}

            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Changes Saved!
              </span>
            )}

            <button
              onClick={() => setShowMarkingSettings(!showMarkingSettings)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Marking ({markingPositive > 0 ? `+${markingPositive}` : markingPositive}/{markingNegative > 0 ? `-${markingNegative}` : markingNegative})</span>
            </button>

            <button
              onClick={handleSaveChanges}
              disabled={isSaving || !isDirty}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                isDirty
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Paper'}</span>
            </button>
          </div>
        </div>

        {/* Marking Scheme Drawer */}
        {showMarkingSettings && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Positive Marks per Question:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={markingPositive}
                    onChange={(e) => setMarkingPositive(parseInt(e.target.value, 10) || 1)}
                    className="w-16 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Negative Penalty per Incorrect:</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={markingNegative}
                    onChange={(e) => setMarkingNegative(parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                Exam-standard defaults: BITSAT (+3 / -1), JEE Main (+4 / -1). Any change creates a new paper version upon save.
              </div>
            </div>
          </div>
        )}

        {/* Conflict / Save Error Notification */}
        {conflictError && (
          <div className="bg-rose-50 border-t border-rose-200 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{conflictError}</span>
            </div>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
            >
              <RefreshCw className="w-3 h-3" />
              Reload Latest
            </button>
          </div>
        )}

        {saveError && (
          <div className="bg-rose-50 border-t border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>{saveError}</span>
            <button onClick={() => setSaveError(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Main Two-Pane Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Question Bank (7 Columns) */}
        <section className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filter Bar Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Question Bank
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {displayedAvailableQuestions.length} Available
                </span>
              </div>
              <button
                onClick={handleAddAllFiltered}
                disabled={displayedAvailableQuestions.every((q) => linkedIdSet.has(q.id))}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                + Add All Filtered
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by question text, option text, or numeric ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Subject */}
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedChapterId('ALL');
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectName}
                  </option>
                ))}
              </select>

              {/* Chapter */}
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Chapters</option>
                {filteredChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.chapterName}
                  </option>
                ))}
              </select>

              {/* Question Type */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="objective">Objective (MCQ)</option>
                <option value="numerical">Numerical</option>
              </select>

              {/* Difficulty */}
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Question List */}
          <div className="divide-y divide-slate-100 max-h-[calc(100vh-280px)] overflow-y-auto">
            {displayedAvailableQuestions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-600">No questions match the selected filters.</p>
                <p className="text-[11px] text-slate-400 mt-1">Try resetting your search query or subject filters.</p>
              </div>
            ) : (
              displayedAvailableQuestions.map((q) => {
                const isAdded = linkedIdSet.has(q.id);
                return (
                  <div
                    key={q.id}
                    className={`p-3.5 transition-colors hover:bg-slate-50 ${
                      isAdded ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5 min-w-0">
                        {/* Tags Pill Row */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{q.id}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                            {q.subjectName}
                          </span>
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                            {q.chapterName}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              q.questionType === 'numerical'
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {q.questionType}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              q.difficulty?.toLowerCase() === 'hard'
                                ? 'bg-rose-50 text-rose-700'
                                : q.difficulty?.toLowerCase() === 'medium'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        </div>

                        {/* Question Snippet with KaTeX */}
                        <div className="text-xs font-medium text-slate-800 line-clamp-2">
                          <MathText content={q.questionContent} inline />
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          title="Preview Full Question & Solution"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isAdded ? (
                          <button
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Remove from paper"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddQuestion(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                            title="Add to paper"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT PANE: Selected Test Questions (5 Columns) */}
        <section className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden sticky top-20">
          {/* Header & Metrics Summary */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Paper Structure
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {liveMetrics.totalQuestions} Questions
                </span>
              </div>
              {linkedQuestions.length > 0 && (
                <button
                  onClick={handleClearAllSelected}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Score & Distribution Metric Pill */}
            <div className="bg-slate-900 text-slate-100 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Marks</p>
                <p className="text-lg font-black text-amber-400">{liveMetrics.totalMarks}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                <p className="text-sm font-bold text-slate-200">{paper.durationMinutes} mins</p>
              </div>
            </div>

            {/* Subject Breakdown Badges */}
            {liveMetrics.subjectBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {liveMetrics.subjectBreakdown.map((b) => (
                  <span
                    key={b.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    <span>{b.name}:</span>
                    <span className="text-indigo-600">{b.count}Q ({b.marks}M)</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Selected Questions Ordered List */}
          <div className="divide-y divide-slate-100 max-h-[calc(100vh-320px)] overflow-y-auto">
            {linkedQuestions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Sliders className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-600">No questions linked to this paper yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click "+ Add" on the questions in the left bank to include them.
                </p>
              </div>
            ) : (
              linkedQuestions.map((q, idx) => {
                return (
                  <div
                    key={q.id}
                    className="p-3 hover:bg-slate-50 transition-colors flex items-center gap-2 group"
                  >
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === linkedQuestions.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Order Number Badge */}
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Question Summary */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded truncate max-w-[120px]">
                          {q.subjectName}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">#{q.id}</span>
                        <span className="text-[9px] font-bold text-emerald-600 ml-auto">
                          +{markingPositive} / -{markingNegative}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-700 font-medium truncate">
                        <MathText content={q.questionContent} inline />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPreviewQuestion(q)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove from paper"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* QUESTION PREVIEW MODAL */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-slate-100 text-slate-700">
                  Question #{previewQuestion.id}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700">
                  {previewQuestion.subjectName}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium text-slate-600 bg-slate-100">
                  {previewQuestion.chapterName}
                </span>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question:</h4>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 leading-relaxed">
                <MathText content={previewQuestion.questionContent} />
              </div>
            </div>

            {/* Options if Objective */}
            {previewQuestion.questionType === 'objective' && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Options:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const optKey = `option${opt}` as keyof QuestionItem;
                    const optVal = previewQuestion[optKey] as string | undefined;
                    if (!optVal) return null;
                    const isCorrect = previewQuestion.correctOption === opt;
                    return (
                      <div
                        key={opt}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {opt}
                        </span>
                        <div className="flex-1">
                          <MathText content={optVal} inline />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Numerical Answer if Numerical */}
            {previewQuestion.questionType === 'numerical' && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold flex items-center justify-between">
                <span>Correct Numerical Value:</span>
                <span className="font-mono text-sm">{previewQuestion.numericalAnswer ?? 'N/A'}</span>
              </div>
            )}

            {/* Solution */}
            {previewQuestion.solution && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Official Solution / Explanation:
                </h4>
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 leading-relaxed">
                  <MathText content={previewQuestion.solution} />
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
