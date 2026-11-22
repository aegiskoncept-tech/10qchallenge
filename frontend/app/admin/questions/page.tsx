'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Layers,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  X,
  Check,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Calculator,
  Hash,
  ArrowUpDown,
  SlidersHorizontal,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { MathText } from '@/components/student/MathText';

interface Question {
  id: number;
  questionType: 'objective' | 'numerical';
  courseId?: number;
  courseTitle?: string;
  courseExam?: string;
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  chapterId: number;
  chapterName: string;
  chapterCode?: string;
  topicId?: number;
  topicName?: string;
  questionContent: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: 'A' | 'B' | 'C' | 'D';
  rangeFrom?: number | string;
  rangeTo?: number | string;
  tolerance?: number | string;
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  difficulty: 'Low' | 'Medium' | 'High';
  orderNumber?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

interface ChapterOption {
  id: number;
  courseId: number;
  subjectId: number;
  chapterName: string;
  chapterCode?: string;
}

interface TopicOption {
  id: number;
  courseId: number;
  subjectId: number;
  chapterId: number;
  topicName: string;
  topicCode?: string;
}

const MATH_SHORTCUTS = [
  { label: 'Fraction', insert: '$\\frac{a}{b}$' },
  { label: 'Power', insert: '$x^2$' },
  { label: 'Subscript', insert: '$x_1$' },
  { label: 'Square Root', insert: '$\\sqrt{x}$' },
  { label: 'Integral', insert: '$\\int_{a}^{b} f(x)\\,dx$' },
  { label: 'Sum', insert: '$\\sum_{i=1}^{n} x_i$' },
  { label: 'α (Alpha)', insert: '$\\alpha$' },
  { label: 'β (Beta)', insert: '$\\beta$' },
  { label: 'θ (Theta)', insert: '$\\theta$' },
  { label: 'π (Pi)', insert: '$\\pi$' },
  { label: '± (Plus/Minus)', insert: '$\\pm$' },
  { label: 'Matrix', insert: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$' },
];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [chapterFilter, setChapterFilter] = useState<string>('ALL');
  const [topicFilter, setTopicFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'objective' | 'numerical'>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'Low' | 'Medium' | 'High'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    questionType: 'objective' as 'objective' | 'numerical',
    courseId: '',
    subjectId: '',
    chapterId: '',
    topicId: '',
    questionContent: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A' as 'A' | 'B' | 'C' | 'D',
    rangeFrom: '',
    rangeTo: '',
    tolerance: '0.05',
    marks: 3,
    negativeMarks: -1,
    explanation: '',
    difficulty: 'Medium' as 'Low' | 'Medium' | 'High',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewSelectedOption, setPreviewSelectedOption] = useState<string | null>(null);
  const [previewShowExplanation, setPreviewShowExplanation] = useState(false);

  // Delete State & Safeguards
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<Question | null>(null);
  const [deleteDependencies, setDeleteDependencies] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch initial master data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [qRes, cRes, sRes, chRes, tRes] = await Promise.all([
        fetch('/api/admin/questions'),
        fetch('/api/admin/courses'),
        fetch('/api/admin/subjects'),
        fetch('/api/admin/chapters'),
        fetch('/api/admin/topics'),
      ]);

      if (qRes.ok) {
        const j = await qRes.json();
        if (j.success && Array.isArray(j.data)) setQuestions(j.data);
      }
      if (cRes.ok) {
        const j = await cRes.json();
        if (j.success && Array.isArray(j.data)) setCourses(j.data);
      }
      if (sRes.ok) {
        const j = await sRes.json();
        if (j.success && Array.isArray(j.data)) setSubjects(j.data);
      }
      if (chRes.ok) {
        const j = await chRes.json();
        if (j.success && Array.isArray(j.data)) setChapters(j.data);
      }
      if (tRes.ok) {
        const j = await tRes.json();
        if (j.success && Array.isArray(j.data)) setTopics(j.data);
      }
    } catch (err) {
      console.error('[AdminQuestionsPage fetch error]', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered dropdown options based on hierarchy selections in filter bar
  const filteredSubjectsForFilter = useMemo(() => {
    if (courseFilter === 'ALL') return subjects;
    const course = courses.find((c) => String(c.id) === courseFilter);
    if (!course || !Array.isArray(course.subjectIds)) return subjects;
    return subjects.filter((s) => course.subjectIds!.includes(s.id));
  }, [courseFilter, courses, subjects]);

  const filteredChaptersForFilter = useMemo(() => {
    let list = chapters;
    if (courseFilter !== 'ALL') {
      list = list.filter((ch) => String(ch.courseId) === courseFilter);
    }
    if (subjectFilter !== 'ALL') {
      list = list.filter((ch) => String(ch.subjectId) === subjectFilter);
    }
    return list;
  }, [courseFilter, subjectFilter, chapters]);

  const filteredTopicsForFilter = useMemo(() => {
    let list = topics;
    if (chapterFilter !== 'ALL') {
      list = list.filter((t) => String(t.chapterId) === chapterFilter);
    } else if (subjectFilter !== 'ALL') {
      list = list.filter((t) => String(t.subjectId) === subjectFilter);
    }
    return list;
  }, [chapterFilter, subjectFilter, topics]);

  // Filtered options inside Form Modal (Strict Hierarchy)
  const formAvailableSubjects = useMemo(() => {
    if (!formData.courseId) return subjects;
    const course = courses.find((c) => String(c.id) === formData.courseId);
    if (!course || !Array.isArray(course.subjectIds)) return subjects;
    return subjects.filter((s) => course.subjectIds!.includes(s.id));
  }, [formData.courseId, courses, subjects]);

  const formAvailableChapters = useMemo(() => {
    if (!formData.subjectId) return [];
    return chapters.filter((ch) => {
      const matchSub = String(ch.subjectId) === formData.subjectId;
      if (formData.courseId) {
        return matchSub && String(ch.courseId) === formData.courseId;
      }
      return matchSub;
    });
  }, [formData.courseId, formData.subjectId, chapters]);

  const formAvailableTopics = useMemo(() => {
    if (!formData.chapterId) return [];
    return topics.filter((t) => String(t.chapterId) === formData.chapterId);
  }, [formData.chapterId, topics]);

  // Main list filtering
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const inId = String(q.id).includes(query);
        const inContent = q.questionContent.toLowerCase().includes(query);
        const inExpl = q.explanation ? q.explanation.toLowerCase().includes(query) : false;
        const inOptA = q.optionA ? q.optionA.toLowerCase().includes(query) : false;
        const inOptB = q.optionB ? q.optionB.toLowerCase().includes(query) : false;
        const inOptC = q.optionC ? q.optionC.toLowerCase().includes(query) : false;
        const inOptD = q.optionD ? q.optionD.toLowerCase().includes(query) : false;
        const inSub = q.subjectName ? q.subjectName.toLowerCase().includes(query) : false;
        const inChap = q.chapterName ? q.chapterName.toLowerCase().includes(query) : false;
        const inCourse = q.courseTitle ? q.courseTitle.toLowerCase().includes(query) : false;
        if (!inId && !inContent && !inExpl && !inOptA && !inOptB && !inOptC && !inOptD && !inSub && !inChap && !inCourse) {
          return false;
        }
      }

      // 2. Course filter
      if (courseFilter !== 'ALL') {
        const cId = Number(courseFilter);
        if (q.courseId && q.courseId !== cId) return false;
        if (!q.courseId) {
          const ch = chapters.find((c) => c.id === q.chapterId);
          if (!ch || ch.courseId !== cId) return false;
        }
      }

      // 3. Subject filter
      if (subjectFilter !== 'ALL' && String(q.subjectId) !== subjectFilter) {
        return false;
      }

      // 4. Chapter filter
      if (chapterFilter !== 'ALL' && String(q.chapterId) !== chapterFilter) {
        return false;
      }

      // 5. Topic filter
      if (topicFilter !== 'ALL' && String(q.topicId) !== topicFilter) {
        return false;
      }

      // 6. Question Type filter
      if (typeFilter !== 'ALL' && q.questionType !== typeFilter) {
        return false;
      }

      // 7. Difficulty filter
      if (difficultyFilter !== 'ALL' && q.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) {
        return false;
      }

      // 8. Status filter
      if (statusFilter === 'ACTIVE' && q.isActive === false) return false;
      if (statusFilter === 'INACTIVE' && q.isActive !== false) return false;

      return true;
    });
  }, [
    questions,
    searchTerm,
    courseFilter,
    subjectFilter,
    chapterFilter,
    topicFilter,
    typeFilter,
    difficultyFilter,
    statusFilter,
    chapters,
  ]);

  // Metric counts
  const totalCount = questions.length;
  const objectiveCount = questions.filter((q) => q.questionType === 'objective').length;
  const numericalCount = questions.filter((q) => q.questionType === 'numerical').length;
  const activeCount = questions.filter((q) => q.isActive !== false).length;

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingQuestion(null);
    setFormError(null);

    // Smart pre-fill from active filters if present
    const defaultCourse = courseFilter !== 'ALL' ? courseFilter : courses.length > 0 ? String(courses[0].id) : '';
    const defaultSubject = subjectFilter !== 'ALL' ? subjectFilter : subjects.length > 0 ? String(subjects[0].id) : '';
    const defaultChapter = chapterFilter !== 'ALL' ? chapterFilter : '';

    setFormData({
      questionType: 'objective',
      courseId: defaultCourse,
      subjectId: defaultSubject,
      chapterId: defaultChapter,
      topicId: '',
      questionContent: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'A',
      rangeFrom: '',
      rangeTo: '',
      tolerance: '0.05',
      marks: 3,
      negativeMarks: -1,
      explanation: '',
      difficulty: 'Medium',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormError(null);

    // Derive courseId if missing on record
    let derivedCourseId = q.courseId ? String(q.courseId) : '';
    if (!derivedCourseId) {
      const ch = chapters.find((c) => c.id === q.chapterId);
      if (ch && ch.courseId) derivedCourseId = String(ch.courseId);
    }

    setFormData({
      questionType: q.questionType,
      courseId: derivedCourseId,
      subjectId: String(q.subjectId),
      chapterId: String(q.chapterId),
      topicId: q.topicId ? String(q.topicId) : '',
      questionContent: q.questionContent,
      optionA: q.optionA || '',
      optionB: q.optionB || '',
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      correctOption: q.correctOption || 'A',
      rangeFrom: q.rangeFrom !== undefined ? String(q.rangeFrom) : '',
      rangeTo: q.rangeTo !== undefined ? String(q.rangeTo) : '',
      tolerance: q.tolerance !== undefined ? String(q.tolerance) : '0.05',
      marks: q.marks !== undefined ? q.marks : 3,
      negativeMarks: q.negativeMarks !== undefined ? q.negativeMarks : -1,
      explanation: q.explanation || '',
      difficulty: q.difficulty,
      isActive: q.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Insert math notation into question text
  const handleInsertMath = (snippet: string) => {
    setFormData((prev) => ({
      ...prev,
      questionContent: prev.questionContent ? `${prev.questionContent} ${snippet}` : snippet,
    }));
  };

  // Handle Form Submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.subjectId) {
      setFormError('Please select a valid Subject.');
      return;
    }
    if (!formData.chapterId) {
      setFormError('Please select a valid Chapter.');
      return;
    }
    if (!formData.questionContent.trim()) {
      setFormError('Question Content statement is required.');
      return;
    }

    if (formData.questionType === 'objective') {
      if (!formData.optionA.trim() || !formData.optionB.trim() || !formData.optionC.trim() || !formData.optionD.trim()) {
        setFormError('All 4 options (Option A, B, C, D) are required for objective questions.');
        return;
      }
      if (!['A', 'B', 'C', 'D'].includes(formData.correctOption)) {
        setFormError('Please select a valid Correct Answer option (A, B, C, or D).');
        return;
      }
    } else if (formData.questionType === 'numerical') {
      if (formData.rangeFrom.trim() === '' || formData.rangeTo.trim() === '') {
        setFormError('Both Range From and Range To values are required for numerical questions.');
        return;
      }
      const numFrom = Number(formData.rangeFrom);
      const numTo = Number(formData.rangeTo);
      if (isNaN(numFrom) || isNaN(numTo)) {
        setFormError('Range From and Range To must be valid numerical values.');
        return;
      }
      if (numFrom > numTo) {
        setFormError('Validation Error: Range From cannot exceed Range To.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        questionType: formData.questionType,
        courseId: formData.courseId ? Number(formData.courseId) : undefined,
        subjectId: Number(formData.subjectId),
        chapterId: Number(formData.chapterId),
        topicId: formData.topicId ? Number(formData.topicId) : undefined,
        questionContent: formData.questionContent.trim(),
        difficulty: formData.difficulty,
        marks: Number(formData.marks) || 3,
        negativeMarks: Number(formData.negativeMarks) !== undefined ? Number(formData.negativeMarks) : -1,
        explanation: formData.explanation.trim(),
        isActive: Boolean(formData.isActive),
      };

      if (formData.questionType === 'objective') {
        payload.optionA = formData.optionA.trim();
        payload.optionB = formData.optionB.trim();
        payload.optionC = formData.optionC.trim();
        payload.optionD = formData.optionD.trim();
        payload.correctOption = formData.correctOption;
      } else {
        payload.rangeFrom = formData.rangeFrom.trim();
        payload.rangeTo = formData.rangeTo.trim();
        payload.tolerance = formData.tolerance.trim();
      }

      let res;
      if (editingQuestion) {
        res = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save question.');
      }

      // Success
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to process question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (q: Question) => {
    setPreviewQuestion(q);
    setPreviewSelectedOption(null);
    setPreviewShowExplanation(false);
  };

  // Open Delete Safeguard Confirmation
  const handleOpenDelete = async (q: Question) => {
    setDeleteConfirmQuestion(q);
    setDeleteError(null);
    setDeleteDependencies(null);

    // Probe dependencies
    try {
      const res = await fetch(`/api/admin/questions/${q.id}`);
      if (res.ok) {
        // Safe check
      }
    } catch {}
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirmQuestion) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/questions/${deleteConfirmQuestion.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        // Caught by dependency guard
        setDeleteError(json.error || 'Failed to delete question.');
        return;
      }

      // Succeeded
      setDeleteConfirmQuestion(null);
      await fetchData();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to execute deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Alternative: Safe Deactivate
  const handleSafeDeactivate = async () => {
    if (!deleteConfirmQuestion) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/questions/${deleteConfirmQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to deactivate question.');
      }
      setDeleteConfirmQuestion(null);
      await fetchData();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to deactivate.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER & METRIC COUNTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Question Master</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              Exam Bank
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Central repository of entrance exam questions with KaTeX LaTeX formulas, numerical ranges, and academic hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh Question Bank"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Question</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Questions</span>
            <HelpCircle className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Across all subjects</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Objective (MCQ)</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{objectiveCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">4-Option single correct</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Numerical (NVT)</span>
            <Calculator className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{numericalCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Decimal &amp; range matched</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Status</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Available for Test Series</p>
        </div>
      </div>

      {/* 3. DEPENDENT ACADEMIC FILTERS & SEARCH */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search question text, options, ID or formula..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Type & Difficulty Toggles */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="ALL">All Question Types</option>
              <option value="objective">Objective MCQ</option>
              <option value="numerical">Numerical NVT</option>
            </select>

            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as any)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Archived Only</option>
            </select>
          </div>
        </div>

        {/* Dependent Academic Dropdowns: Course -> Subject -> Chapter -> Topic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Course
            </label>
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setSubjectFilter('ALL');
                setChapterFilter('ALL');
                setTopicFilter('ALL');
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold"
            >
              <option value="ALL">All Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Subject
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setChapterFilter('ALL');
                setTopicFilter('ALL');
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold"
            >
              <option value="ALL">All Subjects ({filteredSubjectsForFilter.length})</option>
              {filteredSubjectsForFilter.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectName} ({s.subjectCode || s.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Chapter
            </label>
            <select
              value={chapterFilter}
              onChange={(e) => {
                setChapterFilter(e.target.value);
                setTopicFilter('ALL');
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold"
            >
              <option value="ALL">All Chapters ({filteredChaptersForFilter.length})</option>
              {filteredChaptersForFilter.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.chapterName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Topic
            </label>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold"
            >
              <option value="ALL">All Topics ({filteredTopicsForFilter.length})</option>
              {filteredTopicsForFilter.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.topicName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. QUESTIONS LIST */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs font-bold text-slate-500">Loading Question Master...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-extrabold text-slate-700">No questions match your current filters</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria, clearing the academic filters, or add a new question to this topic.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setCourseFilter('ALL');
              setSubjectFilter('ALL');
              setChapterFilter('ALL');
              setTopicFilter('ALL');
              setTypeFilter('ALL');
              setDifficultyFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-purple-200 transition-all shadow-xs space-y-3"
            >
              {/* Card Header: Badges & Hierarchy Path */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    Q#{q.id}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      q.questionType === 'objective'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {q.questionType === 'objective' ? 'MCQ Single Correct' : 'Numerical (NVT)'}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      q.difficulty === 'Low'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : q.difficulty === 'High'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {q.difficulty}
                  </span>

                  {q.isActive === false && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                      Archived
                    </span>
                  )}
                </div>

                {/* Academic Path */}
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span className="text-purple-700 font-bold">{q.courseTitle || 'All Courses'}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="text-slate-800 font-bold">{q.subjectName}</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="text-slate-600">{q.chapterName}</span>
                  {q.topicName && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                      <span className="text-slate-500 italic">{q.topicName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Question Statement with KaTeX */}
              <div className="text-sm font-medium text-slate-900 leading-relaxed pt-1">
                <MathText content={q.questionContent} />
              </div>

              {/* Options Breakdown for Objective Questions */}
              {q.questionType === 'objective' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                    const optText = q[`option${optKey}` as keyof Question] as string;
                    const isCorrect = q.correctOption === optKey;
                    return (
                      <div
                        key={optKey}
                        className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                          isCorrect
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-slate-50/50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {optKey}
                        </span>
                        <div className="flex-1 overflow-x-auto">
                          <MathText content={optText || ''} inline />
                        </div>
                        {isCorrect && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 rounded-md shrink-0">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Numerical Range Info for Numerical Questions */}
              {q.questionType === 'numerical' && (
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs flex flex-wrap items-center gap-4 text-emerald-950 font-semibold">
                  <span>
                    Range: <strong className="font-mono">{q.rangeFrom}</strong> to <strong className="font-mono">{q.rangeTo}</strong>
                  </span>
                  <span>
                    Tolerance: <strong className="font-mono">±{q.tolerance || '0.00'}</strong>
                  </span>
                </div>
              )}

              {/* Solution / Explanation Preview */}
              {q.explanation && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Official Solution / Explanation:
                  </span>
                  <div className="text-slate-700 leading-relaxed">
                    <MathText content={q.explanation} />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenPreview(q)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Student View</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(q)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleOpenDelete(q)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. CREATE / EDIT QUESTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  {editingQuestion ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingQuestion ? `Edit Question #${editingQuestion.id}` : 'Create New Question'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Entrance exam question with KaTeX LaTeX math support and academic hierarchy.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-3 p-1.5 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, questionType: 'objective' })}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    formData.questionType === 'objective'
                      ? 'bg-white text-blue-800 shadow-xs border border-blue-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Objective (MCQ Single Correct)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, questionType: 'numerical' })}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    formData.questionType === 'numerical'
                      ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Numerical Value Type (NVT)</span>
                </button>
              </div>

              {/* Dependent Academic Hierarchy: Course -> Subject -> Chapter -> Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        courseId: e.target.value,
                        subjectId: '',
                        chapterId: '',
                        topicId: '',
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                  >
                    <option value="">Any Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        subjectId: e.target.value,
                        chapterId: '',
                        topicId: '',
                      });
                    }}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                  >
                    <option value="">Select Subject</option>
                    {formAvailableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subjectName} ({s.subjectCode || s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chapter <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.chapterId}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        chapterId: e.target.value,
                        topicId: '',
                      });
                    }}
                    required
                    disabled={!formData.subjectId}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-medium disabled:opacity-50"
                  >
                    <option value="">
                      {!formData.subjectId ? 'Select Subject First' : 'Select Chapter'}
                    </option>
                    {formAvailableChapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.chapterName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Topic <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.topicId}
                    onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                    disabled={!formData.chapterId}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-medium disabled:opacity-50"
                  >
                    <option value="">
                      {!formData.chapterId ? 'Select Chapter First' : 'All Topics / General'}
                    </option>
                    {formAvailableTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.topicName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Difficulty & Marks Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty Level</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-medium"
                  >
                    <option value="Low">Low (Basic Application)</option>
                    <option value="Medium">Medium (Entrance Standard)</option>
                    <option value="High">High (Challenging Multi-Concept)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marks (+ Awarded)</label>
                  <input
                    type="number"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                    placeholder="3"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Negative Marks (- Penalty)</label>
                  <input
                    type="number"
                    value={formData.negativeMarks}
                    onChange={(e) => setFormData({ ...formData, negativeMarks: Number(e.target.value) })}
                    placeholder="-1"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Question Content Editor & LaTeX Math Toolbar */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-900">
                    Question Statement <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Supports KaTeX: use <code className="bg-slate-100 px-1 py-0.5 rounded">$...$</code> for inline and <code className="bg-slate-100 px-1 py-0.5 rounded">$$...$$</code> for block math
                  </span>
                </div>

                {/* Math Quick-Insert Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-slate-100/80 border border-slate-200 text-[11px]">
                  <span className="text-slate-500 font-bold mr-1">Quick Math:</span>
                  {MATH_SHORTCUTS.map((s, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleInsertMath(s.insert)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-purple-50 hover:text-purple-700 border border-slate-200 text-slate-700 font-mono text-[11px] transition-colors cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={formData.questionContent}
                  onChange={(e) => setFormData({ ...formData, questionContent: e.target.value })}
                  placeholder="Enter entrance exam question statement. LaTeX expressions like $x^2 + y^2 = r^2$ or $$\int_0^1 f(x) dx$$ will render automatically..."
                  required
                  className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono leading-relaxed"
                />

                {/* Live Real-Time KaTeX Math Preview */}
                {formData.questionContent && (
                  <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                      Live KaTeX Math Preview:
                    </span>
                    <div className="text-xs text-slate-900 font-medium">
                      <MathText content={formData.questionContent} />
                    </div>
                  </div>
                )}
              </div>

              {/* Type-Specific Options Editor */}
              {formData.questionType === 'objective' ? (
                /* Objective 4-Option MCQ with Correct Selector */
                <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-slate-900">
                      Answer Options (A, B, C, D) &amp; Answer Key
                    </label>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Mark the radio button next to the single correct option
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                      const isSelected = formData.correctOption === optKey;
                      const val = formData[`option${optKey}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'];
                      return (
                        <div
                          key={optKey}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="correctOption"
                                checked={isSelected}
                                onChange={() => setFormData({ ...formData, correctOption: optKey })}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="font-extrabold text-xs text-slate-800">
                                Option {optKey} {isSelected && <span className="text-emerald-700 font-black">(Correct Key)</span>}
                              </span>
                            </label>
                          </div>

                          <input
                            type="text"
                            value={val}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                [`option${optKey}`]: e.target.value,
                              })
                            }
                            placeholder={`Enter text or LaTeX formula for Option ${optKey}...`}
                            required
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 bg-white"
                          />

                          {val && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[11px] text-slate-700">
                              <MathText content={val} inline />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Numerical Range Answer Configuration */
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-emerald-950">
                      Numerical Value Range Configuration (NVT)
                    </label>
                    <span className="text-[11px] text-emerald-800 font-semibold">
                      Student response matches if within [Range From, Range To] ± Tolerance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Range From <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.rangeFrom}
                        onChange={(e) => setFormData({ ...formData, rangeFrom: e.target.value })}
                        placeholder="e.g. 5.00"
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Range To <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.rangeTo}
                        onChange={(e) => setFormData({ ...formData, rangeTo: e.target.value })}
                        placeholder="e.g. 5.00"
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tolerance (± Error)</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.tolerance}
                        onChange={(e) => setFormData({ ...formData, tolerance: e.target.value })}
                        placeholder="0.05"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation / Solution Statement */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Step-by-Step Solution &amp; Explanation <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Explain the step-by-step mathematical derivation and shortcut formulas for students review..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono leading-relaxed"
                />
                {formData.explanation && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Solution Preview:
                    </span>
                    <div className="text-slate-800 mt-1">
                      <MathText content={formData.explanation} />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Toggle */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Active (Question is immediately available to be linked into Test Series)
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingQuestion ? 'Update Question' : 'Save Question to Bank'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CBT STUDENT-FACING PREVIEW MODAL */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-[#17152A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-mono text-xs font-black">
                  CBT Simulation
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {previewQuestion.subjectName} • {previewQuestion.chapterName}
                </span>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
                <span>
                  Type: {previewQuestion.questionType === 'objective' ? 'MCQ (Single Choice)' : 'Numerical Value Type'}
                </span>
                <span className="text-emerald-700 font-extrabold">
                  Marks: +{previewQuestion.marks || 3}, Negative: {previewQuestion.negativeMarks !== undefined ? previewQuestion.negativeMarks : -1}
                </span>
              </div>

              {/* Statement */}
              <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                <MathText content={previewQuestion.questionContent} />
              </div>

              {/* Options */}
              {previewQuestion.questionType === 'objective' ? (
                <div className="space-y-2.5">
                  {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                    const text = previewQuestion[`option${optKey}` as keyof Question] as string;
                    const isSelected = previewSelectedOption === optKey;
                    return (
                      <div
                        key={optKey}
                        onClick={() => setPreviewSelectedOption(optKey)}
                        className={`p-3 rounded-xl border text-xs flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50 border-purple-400 text-purple-950 font-bold shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {optKey}
                        </span>
                        <div className="flex-1">
                          <MathText content={text || ''} inline />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Enter Your Numerical Answer:</label>
                  <input
                    type="number"
                    placeholder="Enter answer"
                    className="w-48 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Range Answer: [{previewQuestion.rangeFrom} to {previewQuestion.rangeTo}]
                  </p>
                </div>
              )}

              {/* Explanation Toggle */}
              {previewQuestion.explanation && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPreviewShowExplanation(!previewShowExplanation)}
                    className="flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                  >
                    <span>{previewShowExplanation ? 'Hide Official Solution' : 'View Official Solution &amp; Answer Key'}</span>
                    {previewShowExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {previewShowExplanation && (
                    <div className="p-4 mt-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                      <div className="font-bold text-emerald-950">
                        {previewQuestion.questionType === 'objective'
                          ? `Correct Answer: Option ${previewQuestion.correctOption}`
                          : `Acceptable Range: ${previewQuestion.rangeFrom} - ${previewQuestion.rangeTo} (±${previewQuestion.tolerance || '0.00'})`}
                      </div>
                      <div className="text-slate-700 leading-relaxed">
                        <MathText content={previewQuestion.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETION SAFEGUARD MODAL */}
      {deleteConfirmQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-base text-slate-900">Delete Question #{deleteConfirmQuestion.id}?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Entrance exam question records may be linked to active Test Series papers or historical student attempts.
              </p>
            </div>

            {deleteError ? (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-2">
                <p className="font-extrabold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Deletion Safeguard Triggered</span>
                </p>
                <p className="text-red-700 leading-relaxed">{deleteError}</p>
                <div className="pt-2 border-t border-red-200/80 flex items-center justify-end gap-2">
                  <button
                    onClick={handleSafeDeactivate}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    Archive Question Instead
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  {deleteConfirmQuestion.questionContent.slice(0, 100)}...
                </p>
                <p className="text-[11px] text-slate-500">
                  Subject: {deleteConfirmQuestion.subjectName} • Chapter: {deleteConfirmQuestion.chapterName}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmQuestion(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
