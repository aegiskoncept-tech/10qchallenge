'use client';

import React, { useState, useEffect, use, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  Award,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Timer,
  Hash,
  Layers,
  RotateCcw,
  Bookmark,
  Check,
  Info,
  Menu,
  X,
  User,
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  CloudCheck,
  CloudOff,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { MathText } from '@/components/student/MathText';
import { apiClient } from '@/lib/apiClient';

export type QuestionPaletteState =
  | 'not_visited'
  | 'not_answered'
  | 'answered'
  | 'marked_for_review'
  | 'answered_marked_for_review';

interface SanitizedCbtQuestion {
  id: number;
  questionNumber: number;
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
  difficulty: string;
  orderNumber?: number;
}

interface AttemptMetadata {
  attemptId: string;
  paperId: number;
  paperTitle: string;
  examTag: string;
  targetYear: number;
  durationMinutes: number;
  markingScheme: {
    positiveMarks: number;
    negativeMarks: number;
  };
  startedAt: string;
  expiresAt: string;
  status?: string;
}

interface EvaluationSummary {
  attemptId: string;
  paperId: number;
  paperTitle: string;
  examTag: string;
  submittedAt: string;
  submissionReason: 'MANUAL' | 'TIMEOUT';
  evaluationStatus: 'COMPLETED';
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  incorrectQuestions: number;
  unattemptedQuestions: number;
  positiveMarks: number;
  negativeMarks: number;
  finalScore: number;
  maximumMarks: number;
  accuracy: number;
}

interface SubjectTab {
  id: number;
  name: string;
  questionCount: number;
}

interface AttemptSessionPageProps {
  params: Promise<{ attemptId: string }>;
}

export default function AttemptSessionPage({ params }: AttemptSessionPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const attemptId = resolvedParams.attemptId;

  // Attempt & Question State
  const [attempt, setAttempt] = useState<AttemptMetadata | null>(null);
  const [questions, setQuestions] = useState<SanitizedCbtQuestion[]>([]);
  const [subjects, setSubjects] = useState<SubjectTab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Authoritative Live Timer (recalculated from server expiresAt)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  // Navigation & CBT Session State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | 'ALL'>('ALL');
  const [answers, setAnswers] = useState<Record<number, string>>({}); // questionId -> answer
  const [visited, setVisited] = useState<Set<number>>(new Set()); // questionIds visited
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set()); // questionIds marked
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Autosave State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRetryRef = useRef<{ payload: any; attemptCount: number } | null>(null);

  // Submission State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<EvaluationSummary | null>(null);

  // Core Submission Dispatcher
  const handleSubmitAttempt = useCallback(
    async (reason: 'MANUAL' | 'TIMEOUT' = 'MANUAL') => {
      if (isSubmitting || isSubmitted) return;

      // 1. Flush any pending numerical debounce timer immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      setIsSubmitting(true);

      try {
        const res = await apiClient(
          `/api/student/tests/attempts/${encodeURIComponent(attemptId)}/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ submissionReason: reason }),
          }
        );

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to submit test attempt.');
        }

        setIsSubmitted(true);
        setSubmissionResult(data.result);
        setIsSubmitModalOpen(false);
      } catch (err: any) {
        alert(err?.message || 'Submission error. Please retry.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [attemptId, isSubmitting, isSubmitted]
  );

  // Core Server Save Dispatcher
  const dispatchSave = useCallback(
    async (payload: {
      questionId: number;
      questionType: 'objective' | 'numerical';
      selectedOption?: string | null;
      numericalValue?: string | null;
      isMarkedForReview?: boolean;
    }) => {
      if (isExpired) return;
      setSaveStatus('saving');
      setSaveError(null);

      try {
        const res = await apiClient(
          `/api/student/tests/attempts/${encodeURIComponent(attemptId)}/answers`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Server rejected response save');
        }

        setSaveStatus('saved');
        pendingRetryRef.current = null;
      } catch (err: any) {
        console.error('Autosave failure:', err);
        setSaveStatus('error');
        setSaveError(err?.message || 'Network error saving response');

        // Queue automatic retry if transient network failure
        pendingRetryRef.current = {
          payload,
          attemptCount: (pendingRetryRef.current?.attemptCount || 0) + 1,
        };

        if (pendingRetryRef.current.attemptCount <= 3) {
          setTimeout(() => {
            if (pendingRetryRef.current) {
              dispatchSave(pendingRetryRef.current.payload);
            }
          }, 2000);
        }
      }
    },
    [attemptId, isExpired]
  );

  // Fetch Attempt, Questions & Restored Saved Responses on Initial Load / Refresh
  useEffect(() => {
    if (!attemptId) {
      setError('Attempt identifier missing from request URL.');
      setIsLoading(false);
      return;
    }

    const fetchAttemptAndQuestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/student/tests/attempts/${encodeURIComponent(attemptId)}/questions`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (res.status === 401) {
            throw new Error('Authentication required. Please log in as a student to access this test.');
          }
          if (res.status === 403) {
            if (data.error?.toLowerCase().includes('completed')) {
              const attemptRes = await fetch(`/api/student/tests/attempts/${encodeURIComponent(attemptId)}`);
              const attemptData = await attemptRes.json();
              if (attemptData.success && attemptData.data?.result) {
                setAttempt(attemptData.data);
                setSubmissionResult(attemptData.data.result);
                setIsSubmitted(true);
                return;
              }
            }
            if (data.error?.includes('expired')) {
              setIsExpired(true);
              throw new Error('This test attempt has expired. Question access is locked.');
            }
            throw new Error(data.error || 'Access forbidden: this attempt belongs to another student.');
          }
          if (res.status === 404) {
            throw new Error(`Test attempt "${attemptId}" was not found.`);
          }
          throw new Error(data.error || `Failed to load test session (HTTP ${res.status}).`);
        }

        setAttempt({
          attemptId: data.attemptId,
          paperId: data.paperId,
          paperTitle: data.paperTitle,
          examTag: data.examTag,
          targetYear: data.targetYear,
          durationMinutes: data.durationMinutes,
          markingScheme: data.markingScheme,
          startedAt: data.startedAt,
          expiresAt: data.expiresAt,
        });

        const loadedQuestions: SanitizedCbtQuestion[] = data.questions || [];
        setQuestions(loadedQuestions);
        setSubjects(data.subjects || []);

        // Browser Refresh & Recovery: Restore authoritative answers & review flags
        const restoredAnswers: Record<number, string> = {};
        const restoredMarked = new Set<number>();
        const restoredVisited = new Set<number>(data.visitedQuestionIds || []);

        if (data.savedResponses && typeof data.savedResponses === 'object') {
          Object.values(data.savedResponses as Record<string, any>).forEach((resp: any) => {
            const qId = Number(resp.questionId);
            if (resp.selectedOption) {
              restoredAnswers[qId] = resp.selectedOption;
            } else if (resp.numericalValue !== null && resp.numericalValue !== undefined && resp.numericalValue !== '') {
              restoredAnswers[qId] = String(resp.numericalValue);
            }
            if (resp.isMarkedForReview) {
              restoredMarked.add(qId);
            }
            restoredVisited.add(qId);
          });
        }

        if (loadedQuestions.length > 0) {
          restoredVisited.add(loadedQuestions[0].id);
        }

        setAnswers(restoredAnswers);
        setMarkedForReview(restoredMarked);
        setVisited(restoredVisited);

        // Calculate authoritative time left
        if (data.expiresAt) {
          const expiryMs = new Date(data.expiresAt).getTime();
          const nowMs = Date.now();
          const diffSec = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
          setTimeLeftSeconds(diffSec);
          if (diffSec <= 0) {
            setIsExpired(true);
          }
        }
      } catch (err: any) {
        setError(err?.message || 'Unable to load test attempt.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttemptAndQuestions();
  }, [attemptId]);

  // Authoritative Live Timer Tick (always computed from server-issued expiresAt)
  useEffect(() => {
    if (!attempt?.expiresAt || isExpired) return;

    const tick = () => {
      const expiryMs = new Date(attempt.expiresAt).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
      setTimeLeftSeconds(diffSec);

      if (diffSec <= 0) {
        setIsExpired(true);
        if (!isSubmitted) {
          handleSubmitAttempt('TIMEOUT');
        }
      }
    };

    tick();
    const timerInterval = setInterval(tick, 1000);
    return () => clearInterval(timerInterval);
  }, [attempt?.expiresAt, isExpired]);

  // Current Question
  const currentQuestion = questions[currentIndex];

  // Mark current question as visited when index changes
  useEffect(() => {
    if (currentQuestion && !visited.has(currentQuestion.id)) {
      setVisited((prev) => new Set(prev).add(currentQuestion.id));
    }
  }, [currentIndex, currentQuestion, visited]);

  // Filtered Questions by Subject
  const filteredQuestionIndices = useMemo(() => {
    if (selectedSubjectId === 'ALL') {
      return questions.map((_, i) => i);
    }
    return questions
      .map((q, i) => (q.subjectId === selectedSubjectId ? i : -1))
      .filter((i) => i !== -1);
  }, [questions, selectedSubjectId]);

  // Determine authoritative state for a given question
  const getQuestionState = useCallback(
    (questionId: number): QuestionPaletteState => {
      const isVisited = visited.has(questionId);
      const isAnswered = Boolean(answers[questionId] && answers[questionId].trim() !== '');
      const isMarked = markedForReview.has(questionId);

      if (!isVisited) return 'not_visited';
      if (isAnswered && isMarked) return 'answered_marked_for_review';
      if (isMarked) return 'marked_for_review';
      if (isAnswered) return 'answered';
      return 'not_answered';
    },
    [visited, answers, markedForReview]
  );

  // Compute Live Statistics for Palette Legend
  const paletteStats = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let notVisited = 0;
    let marked = 0;
    let answeredMarked = 0;

    questions.forEach((q) => {
      const state = getQuestionState(q.id);
      switch (state) {
        case 'answered':
          answered++;
          break;
        case 'not_answered':
          notAnswered++;
          break;
        case 'not_visited':
          notVisited++;
          break;
        case 'marked_for_review':
          marked++;
          break;
        case 'answered_marked_for_review':
          answeredMarked++;
          break;
      }
    });

    return { answered, notAnswered, notVisited, marked, answeredMarked };
  }, [questions, getQuestionState]);

  // Format Countdown Timer
  const formattedCountdown = useMemo(() => {
    if (timeLeftSeconds === null) return '--:--:--';
    if (timeLeftSeconds <= 0) return '00:00:00';
    const hours = Math.floor(timeLeftSeconds / 3600);
    const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
    const seconds = timeLeftSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeftSeconds]);

  // Navigation Handlers
  const handleNext = () => {
    if (isExpired) return;
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (isExpired) return;
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    if (isExpired) return;
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setIsMobilePaletteOpen(false);
    }
  };

  // User Response Handlers with Server Autosave
  const handleSelectOption = (optionLetter: string) => {
    if (isExpired || !currentQuestion) return;

    // 1. Optimistic UI update
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionLetter,
    }));

    // 2. Immediate Autosave to Server
    dispatchSave({
      questionId: currentQuestion.id,
      questionType: 'objective',
      selectedOption: optionLetter,
      isMarkedForReview: markedForReview.has(currentQuestion.id),
    });
  };

  const handleNumericalInput = (value: string) => {
    if (isExpired || !currentQuestion) return;

    // 1. Optimistic UI update for smooth typing
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));

    // 2. Debounced Autosave (350ms) to prevent overwhelming server while typing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      dispatchSave({
        questionId: currentQuestion.id,
        questionType: 'numerical',
        numericalValue: value.trim() ? value.trim() : null,
        isMarkedForReview: markedForReview.has(currentQuestion.id),
      });
    }, 350);
  };

  const handleClearResponse = () => {
    if (isExpired || !currentQuestion) return;

    // 1. Optimistic UI clear
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });

    // 2. Persist cleared response on server
    dispatchSave({
      questionId: currentQuestion.id,
      questionType: currentQuestion.questionType,
      selectedOption: null,
      numericalValue: null,
      isMarkedForReview: markedForReview.has(currentQuestion.id),
    });
  };

  const handleMarkForReviewAndNext = () => {
    if (isExpired || !currentQuestion) return;

    // 1. Optimistic mark
    setMarkedForReview((prev) => new Set(prev).add(currentQuestion.id));

    // 2. Persist marked status with existing response
    dispatchSave({
      questionId: currentQuestion.id,
      questionType: currentQuestion.questionType,
      selectedOption: currentQuestion.questionType === 'objective' ? (answers[currentQuestion.id] || null) : null,
      numericalValue: currentQuestion.questionType === 'numerical' ? (answers[currentQuestion.id] || null) : null,
      isMarkedForReview: true,
    });

    handleNext();
  };

  const handleSaveAndNext = () => {
    if (isExpired || !currentQuestion) return;

    // 1. Unmark review if saving explicitly
    if (markedForReview.has(currentQuestion.id)) {
      setMarkedForReview((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(currentQuestion.id);
        return nextSet;
      });

      dispatchSave({
        questionId: currentQuestion.id,
        questionType: currentQuestion.questionType,
        selectedOption: currentQuestion.questionType === 'objective' ? (answers[currentQuestion.id] || null) : null,
        numericalValue: currentQuestion.questionType === 'numerical' ? (answers[currentQuestion.id] || null) : null,
        isMarkedForReview: false,
      });
    }

    handleNext();
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isExpired) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (currentQuestion?.questionType === 'objective') {
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(key)) {
          e.preventDefault();
          handleSelectOption(key);
        } else if (['1', '2', '3', '4'].includes(e.key)) {
          const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
          e.preventDefault();
          handleSelectOption(map[e.key]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentQuestion, isExpired]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Loading View
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-16 text-center max-w-lg mx-auto shadow-xs space-y-4 my-16">
        <LoadingSpinner size="lg" className="mx-auto" />
        <h3 className="font-extrabold text-base text-[#17152A]">Loading CBT Examination Session...</h3>
        <p className="text-xs text-[#6E6990]">
          Restoring authoritative saved answers and validating server timestamps for session{' '}
          <span className="font-mono text-[#5034EB] font-bold">{attemptId}</span>.
        </p>
      </div>
    );
  }

  // Error / Invalid / Forbidden View
  if (error || !attempt || questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-12 text-center max-w-lg mx-auto shadow-xs space-y-5 my-16">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="font-black text-xl text-[#17152A]">
            {isExpired ? 'Test Session Expired' : 'Unable to Access Examination'}
          </h2>
          <p className="text-xs text-[#6E6990] leading-relaxed max-w-sm mx-auto">
            {error || 'Question data is currently unavailable for this test attempt.'}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/student/tests"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs"
          >
            <ChevronLeft size={16} /> Return to Test Series
          </Link>
        </div>
      </div>
    );
  }

  // Test Submission Complete View
  if (isSubmitted && submissionResult) {
    return (
      <div className="bg-white rounded-3xl border border-[#E7E3F5] p-8 max-w-2xl mx-auto shadow-sm space-y-6 text-center animate-in fade-in zoom-in-95 my-12">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 size={36} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span>Test Completed & Evaluated</span>
          </div>
          <h2 className="text-2xl font-black text-[#17152A]">{submissionResult.paperTitle}</h2>
          <p className="text-xs text-[#6E6990]">
            Submitted via {submissionResult.submissionReason === 'TIMEOUT' ? 'Automatic Expiry Timer' : 'Student Confirmation'} at {new Date(submissionResult.submittedAt).toLocaleTimeString()}
          </p>
        </div>

        {/* Quick Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#F6F4FD] border border-[#E7E3F5]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] block">Score</span>
            <span className="text-2xl font-black text-[#5034EB]">
              {submissionResult.finalScore} <span className="text-xs font-bold text-[#6E6990]">/ {submissionResult.maximumMarks}</span>
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-[#F6F4FD] border border-[#E7E3F5]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] block">Accuracy</span>
            <span className="text-2xl font-black text-[#17152A]">{submissionResult.accuracy}%</span>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Correct</span>
            <span className="text-2xl font-black text-emerald-700">{submissionResult.correctQuestions}</span>
          </div>
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">Incorrect</span>
            <span className="text-2xl font-black text-red-700">{submissionResult.incorrectQuestions}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-[#6E6990] space-y-1 text-left">
          <div className="flex justify-between">
            <span>Attempted Questions:</span>
            <span className="font-bold text-[#17152A]">{submissionResult.attemptedQuestions} / {submissionResult.totalQuestions}</span>
          </div>
          <div className="flex justify-between">
            <span>Unattempted Questions:</span>
            <span className="font-bold text-[#17152A]">{submissionResult.unattemptedQuestions}</span>
          </div>
          <div className="flex justify-between">
            <span>Positive Marks Earned:</span>
            <span className="font-bold text-emerald-700">+{submissionResult.positiveMarks}.00</span>
          </div>
          <div className="flex justify-between">
            <span>Negative Deductions:</span>
            <span className="font-bold text-red-700">-{submissionResult.negativeMarks}.00</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/student/tests/results/${encodeURIComponent(attempt.attemptId)}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#5034EB] to-[#7962F7] hover:from-[#432bc4] hover:to-[#634de0] text-white text-xs font-bold transition-all shadow-xs"
          >
            <BarChart3 size={16} /> View Scorecard &amp; Analytics
          </Link>
          <Link
            href="/student/tests"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD] transition-colors"
          >
            <ChevronLeft size={16} /> Return to Test Series
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 select-none">
      {/* 1. Official CBT Header */}
      <header className="bg-white rounded-2xl border border-[#E7E3F5] px-6 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5034EB] text-white flex items-center justify-center font-black text-sm shrink-0">
            10Q
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#5034EB]/10 text-[#5034EB]">
                {attempt.examTag} CBT
              </span>
              <span className="text-xs font-mono font-bold text-[#6E6990]">
                Attempt ID: {attempt.attemptId}
              </span>
            </div>
            <h1 className="text-sm font-black text-[#17152A] truncate max-w-md">{attempt.paperTitle}</h1>
          </div>
        </div>

        {/* Center / Right: Live Timer, Autosave Status & Actions */}
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Live Autosave Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E3F5] bg-[#F6F4FD] text-xs font-bold">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-indigo-600">
                <RefreshCw size={13} className="animate-spin" />
                <span className="text-[11px]">Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 size={13} />
                <span className="text-[11px]">Saved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-red-600" title={saveError || 'Save error'}>
                <AlertCircle size={13} />
                <span className="text-[11px]">Save Error (Retrying)</span>
              </span>
            )}
          </div>

          {/* Authoritative Live Countdown Timer */}
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-colors ${
              isExpired
                ? 'bg-red-50 border-red-200 text-red-700'
                : timeLeftSeconds !== null && timeLeftSeconds < 300
                ? 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse'
                : 'bg-[#F6F4FD] border-[#E7E3F5] text-[#17152A]'
            }`}
          >
            <Timer size={18} className={isExpired ? 'text-red-600' : 'text-[#5034EB]'} />
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] block leading-none">
                {isExpired ? 'Status' : 'Time Left'}
              </span>
              <span className="font-mono text-base font-black tabular-nums leading-tight">
                {isExpired ? 'Time Expired' : formattedCountdown}
              </span>
            </div>
          </div>

          {/* Submit Test Action Button */}
          {!isSubmitted && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Submit Test</span>
                </>
              )}
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden md:flex p-2.5 rounded-xl border border-[#E7E3F5] text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD] transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Mobile Palette Drawer Trigger */}
          <button
            onClick={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#5034EB] bg-[#F6F4FD]"
          >
            <Menu size={16} />
            <span>Palette ({questions.length})</span>
          </button>
        </div>
      </header>

      {/* 2. Subject Filter Navigation Bar */}
      {subjects.length > 1 && (
        <nav className="bg-white rounded-2xl border border-[#E7E3F5] px-4 py-2 shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6E6990] px-2 whitespace-nowrap">
            Sections:
          </span>
          <button
            onClick={() => setSelectedSubjectId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedSubjectId === 'ALL'
                ? 'bg-[#5034EB] text-white shadow-xs'
                : 'bg-[#F6F4FD] text-[#6E6990] hover:text-[#17152A]'
            }`}
          >
            All Subjects ({questions.length})
          </button>
          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                setSelectedSubjectId(sub.id);
                // Jump to first question of this subject
                const firstIdx = questions.findIndex((q) => q.subjectId === sub.id);
                if (firstIdx !== -1) setCurrentIndex(firstIdx);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedSubjectId === sub.id
                  ? 'bg-[#5034EB] text-white shadow-xs'
                  : 'bg-[#F6F4FD] text-[#6E6990] hover:text-[#17152A]'
              }`}
            >
              {sub.name} ({sub.questionCount})
            </button>
          ))}
        </nav>
      )}

      {/* 3. Main Examination Canvas (Split Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Column: Question Area (8 Cols on Desktop) */}
        <main className="md:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-[#E7E3F5] p-6 sm:p-8 shadow-xs flex flex-col min-h-[580px] justify-between">
            {/* Question Header Meta */}
            <div>
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#E7E3F5] gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-[#5034EB] text-white font-black text-sm">
                    Q{currentQuestion.questionNumber}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#17152A]">{currentQuestion.subjectName}</span>
                      <span className="text-[11px] text-[#6E6990]">({currentQuestion.chapterName})</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#6E6990]">
                      {currentQuestion.questionType === 'objective'
                        ? 'Multiple Choice Question (MCQ)'
                        : 'Numerical Value Type (NVT)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    +{attempt.markingScheme.positiveMarks}.00
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    -{attempt.markingScheme.negativeMarks}.00
                  </span>
                </div>
              </div>

              {/* Question Content with Math/Formula Rendering */}
              <div className="py-6 space-y-4 text-base font-medium text-[#17152A]">
                <MathText content={currentQuestion.questionContent} />
              </div>

              {/* Answer Interaction Area */}
              <div className="pt-2 pb-6">
                {currentQuestion.questionType === 'objective' ? (
                  /* Objective MCQ: Options A, B, C, D */
                  <div className="space-y-3" role="radiogroup" aria-label="Question Options">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                      const optField = `option${optKey}` as keyof SanitizedCbtQuestion;
                      const optContent = currentQuestion[optField] as string | undefined;
                      if (!optContent) return null;

                      const isSelected = answers[currentQuestion.id] === optKey;

                      return (
                        <div
                          key={optKey}
                          onClick={() => handleSelectOption(optKey)}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectOption(optKey);
                            }
                          }}
                          className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#5034EB] bg-[#F6F4FD] shadow-xs'
                              : 'border-[#E7E3F5] bg-white hover:border-[#CBD5E1] hover:bg-slate-50/50'
                          } ${isExpired ? 'pointer-events-none opacity-60' : ''}`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-[#5034EB] text-white shadow-xs'
                                : 'bg-[#E7E3F5] text-[#6E6990]'
                            }`}
                          >
                            {optKey}
                          </div>
                          <div className="flex-1 pt-0.5 text-sm text-[#17152A]">
                            <MathText content={optContent} inline />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Numerical Value Type (NVT) Input */
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6E6990] mb-2">
                        Enter Numerical Answer:
                      </label>
                      <input
                        type="text"
                        disabled={isExpired}
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleNumericalInput(e.target.value)}
                        placeholder="e.g. 5.00 or -2.5"
                        className="w-full px-4 py-3 rounded-2xl border-2 border-[#E7E3F5] focus:border-[#5034EB] focus:outline-none font-mono text-base font-bold text-[#17152A] transition-colors"
                      />
                      <p className="text-[11px] text-[#6E6990] mt-1.5">
                        Accepts integers and decimal fractions with positive or negative signs. Autosaved to server.
                      </p>
                    </div>

                    {/* Quick On-Screen Keypad for Numerical Inputs */}
                    <div className="p-3 bg-[#F6F4FD] rounded-2xl border border-[#E7E3F5]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6990] mb-2">
                        Virtual Numerical Keypad
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '-'].map((k) => (
                          <button
                            key={k}
                            type="button"
                            disabled={isExpired}
                            onClick={() => {
                              const curr = answers[currentQuestion.id] || '';
                              handleNumericalInput(curr + k);
                            }}
                            className="py-2 rounded-xl bg-white border border-[#E7E3F5] hover:bg-[#5034EB] hover:text-white font-mono font-bold text-xs text-[#17152A] transition-colors active:scale-95"
                          >
                            {k}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={isExpired}
                          onClick={() => {
                            const curr = answers[currentQuestion.id] || '';
                            handleNumericalInput(curr.slice(0, -1));
                          }}
                          className="col-span-2 py-2 rounded-xl bg-slate-200 border border-slate-300 hover:bg-slate-300 font-bold text-xs text-[#17152A] transition-colors"
                        >
                          Backspace
                        </button>
                        <button
                          type="button"
                          disabled={isExpired}
                          onClick={handleClearResponse}
                          className="col-span-2 py-2 rounded-xl bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 font-bold text-xs transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action / Navigation Toolbar */}
            <div className="pt-6 border-t border-[#E7E3F5] flex flex-wrap items-center justify-between gap-3">
              {/* Left Actions: Review & Clear */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isExpired}
                  onClick={handleMarkForReviewAndNext}
                  className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Bookmark size={15} />
                  <span>Mark for Review & Next</span>
                </button>
                <button
                  type="button"
                  disabled={isExpired || !answers[currentQuestion.id]}
                  onClick={handleClearResponse}
                  className="px-4 py-2.5 rounded-xl border border-[#E7E3F5] text-[#6E6990] hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-40"
                >
                  Clear Response
                </button>
              </div>

              {/* Right Actions: Previous & Save & Next */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={currentIndex === 0 || isExpired}
                  onClick={handlePrev}
                  className="px-4 py-2.5 rounded-xl border border-[#E7E3F5] text-[#17152A] hover:bg-[#F6F4FD] text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={isExpired}
                  onClick={handleSaveAndNext}
                  className="px-5 py-2.5 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                >
                  <span>{currentIndex === questions.length - 1 ? 'Save & Review' : 'Save & Next'}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Session State / Feature 2.4 Persistence Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-[#E7E3F5] flex items-center gap-3 text-xs text-[#6E6990]">
            <CloudCheck size={16} className="text-[#5034EB] shrink-0" />
            <span>
              <strong>Server-Backed Persistent Autosave Active:</strong> All option selections, numerical inputs, and review flags
              are committed to authoritative attempt storage on the server. You can safely refresh your browser or change questions without losing progress.
            </span>
          </div>
        </main>

        {/* Right Column: Question Palette (4 Cols on Desktop, Modal Drawer on Mobile) */}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-[#E7E3F5] p-5 overflow-y-auto shadow-xl transition-transform md:static md:z-0 md:w-auto md:col-span-4 md:border md:rounded-3xl md:shadow-xs ${
            isMobilePaletteOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
          }`}
        >
          {/* Mobile Palette Close Bar */}
          <div className="flex md:hidden items-center justify-between pb-3 border-b border-[#E7E3F5] mb-4">
            <h3 className="font-black text-sm text-[#17152A]">Question Palette</h3>
            <button
              onClick={() => setIsMobilePaletteOpen(false)}
              className="p-1.5 rounded-lg border border-[#E7E3F5] text-[#6E6990]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Candidate Card */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F6F4FD] border border-[#E7E3F5]">
              <div className="w-10 h-10 rounded-xl bg-[#5034EB] text-white flex items-center justify-center font-bold text-sm shrink-0">
                <User size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-[#17152A] truncate">Candidate Session</p>
                <p className="text-[10px] text-[#6E6990] font-mono truncate">{attempt.attemptId}</p>
              </div>
            </div>

            {/* Official 5-State Legend */}
            <div className="space-y-2 border-y border-[#E7E3F5] py-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#6E6990]">Legend</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-[#17152A]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center">
                    {paletteStats.answered}
                  </span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-red-500 text-white font-bold text-[10px] flex items-center justify-center">
                    {paletteStats.notAnswered}
                  </span>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                    {paletteStats.notVisited}
                  </span>
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                    {paletteStats.marked}
                  </span>
                  <span>Review</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <span className="w-5 h-5 rounded-md bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center relative">
                    {paletteStats.answeredMarked}
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
                  </span>
                  <span>Answered & Review</span>
                </div>
              </div>
            </div>

            {/* Question Grid Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#17152A]">Choose Question</p>
                <span className="text-[11px] text-[#6E6990] font-bold">
                  {questions.length} Questions
                </span>
              </div>

              {/* Grid of Question Buttons */}
              <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                {questions.map((q, idx) => {
                  const state = getQuestionState(q.id);
                  const isCurrent = idx === currentIndex;

                  // Determine styling based on CBT state
                  let bgClass = 'bg-slate-100 border-slate-300 text-slate-700'; // not_visited
                  if (state === 'answered') {
                    bgClass = 'bg-emerald-500 text-white border-emerald-600';
                  } else if (state === 'not_answered') {
                    bgClass = 'bg-red-500 text-white border-red-600';
                  } else if (state === 'marked_for_review') {
                    bgClass = 'bg-purple-500 text-white border-purple-600';
                  } else if (state === 'answered_marked_for_review') {
                    bgClass = 'bg-purple-500 text-white border-purple-600';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={isExpired}
                      onClick={() => handleJumpToQuestion(idx)}
                      aria-label={`Jump to Question ${q.questionNumber} (${state.replace(/_/g, ' ')})`}
                      className={`relative h-10 rounded-xl font-bold text-xs border flex items-center justify-center transition-all ${bgClass} ${
                        isCurrent
                          ? 'ring-2 ring-[#5034EB] ring-offset-2 scale-105 shadow-md z-10'
                          : 'hover:opacity-90'
                      } ${isExpired ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {q.questionNumber}
                      {state === 'answered_marked_for_review' && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-[#E7E3F5] space-y-2">
              {!isSubmitted && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={16} /> Submit Test
                </button>
              )}
              <Link
                href="/student/tests"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD] transition-colors"
              >
                <ChevronLeft size={14} /> Return to Test Series
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* 4. Time Expired Modal Overlay */}
      {isExpired && !isSubmitted && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E7E3F5] max-w-md w-full p-8 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Clock size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#17152A]">Examination Time Concluded</h3>
              <p className="text-xs text-[#6E6990] leading-relaxed">
                Your allocated test duration for <strong>{attempt.paperTitle}</strong> has concluded. The question
                interface has been securely locked in accordance with CBT regulations.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/student/tests"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#5034EB] hover:bg-[#432bc4] text-white text-xs font-bold transition-all shadow-xs"
              >
                <ChevronLeft size={16} /> Return to Test Series
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5. Submit Confirmation Modal Overlay */}
      {isSubmitModalOpen && !isSubmitted && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E7E3F5] max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E3F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#17152A]">Submit Test</h3>
                  <p className="text-[11px] text-[#6E6990]">Confirm Final Submission</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-lg border border-[#E7E3F5] text-[#6E6990] hover:text-[#17152A] transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#6E6990]">
                Review your question summary below before submitting. Once submitted, your answers will be finalized and evaluated.
              </p>

              {/* Status Breakdown Table */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-[#E7E3F5] flex items-center justify-between">
                  <span className="text-[#6E6990] font-medium">Total Questions:</span>
                  <span className="font-black text-[#17152A]">{questions.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <span className="text-emerald-800 font-medium">Answered:</span>
                  <span className="font-black text-emerald-700">{paletteStats.answered}</span>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
                  <span className="text-red-800 font-medium">Not Answered:</span>
                  <span className="font-black text-red-700">{paletteStats.notAnswered}</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
                  <span className="text-purple-800 font-medium">Marked for Review:</span>
                  <span className="font-black text-purple-700">{paletteStats.marked}</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between col-span-2">
                  <span className="text-indigo-800 font-medium">Answered & Marked:</span>
                  <span className="font-black text-indigo-700">{paletteStats.answeredMarked}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Note:</strong> Questions marked for review with a selected answer will be considered for evaluation according to CBT rules.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E7E3F5] text-xs font-bold text-[#6E6990] hover:text-[#17152A] hover:bg-[#F6F4FD] transition-colors disabled:opacity-50"
              >
                Continue Test
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitAttempt('MANUAL')}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Submission</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
