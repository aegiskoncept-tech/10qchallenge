'use client';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from '@/src/compat/router';
import {
  Menu,
  Maximize2,
  Minimize2,
  User,
  LayoutGrid,
  GraduationCap,
  BookOpen,
  ClipboardList,
  BookMarked,
  HelpCircle,
  Video,
  FileText,
  Ticket,
  Bell,
  Edit3,
  Globe,
  MessageSquare,
  FileCheck,
  Receipt,
  Search,
  LogOut,
  Plus,
  ChevronRight,
  ChevronDown,
  Home,
  CheckCircle,
  CheckCircle2,
  TrendingUp,
  Award,
  Filter,
  Eye,
  Trash2,
  Edit,
  X,
  Send,
  Download,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Code,
  RotateCcw,
  RotateCw,
  MoreVertical,
  CircleDot,
  Settings,
  List,
  Layers
} from 'lucide-react';
import CourseContentAssignmentView from '@/components/admin/CourseContentAssignment';
import { coursesData as initialCourses, getStoredCourses, saveStoredCourses, fetchAdminCourses, apiCreateCourse, apiUpdateCourse, apiDeleteCourse, apiUploadFile } from '../data/courses';
import { getStoredExams, saveStoredExams, fetchAdminExams, fetchServerExams, apiCreateExam, apiUpdateExam, apiDeleteExam } from '../data/exams';
import { getStoredSubjects, saveStoredSubjects, fetchAdminSubjects, fetchServerSubjects, apiCreateSubject, apiUpdateSubject, apiDeleteSubject, fetchCourseSubjects, apiAssignCourseSubjects } from '../data/subjects';
import { fetchAdminChapters, apiCreateChapter, apiUpdateChapter, apiDeleteChapter } from '../data/chapters';
import { fetchAdminTopics, apiCreateTopic, apiUpdateTopic, apiDeleteTopic } from '../data/topics';
import { fetchAdminQuestions, apiCreateQuestion, apiUpdateQuestion, apiDeleteQuestion } from '../data/questions';
import { blogsData as initialBlogs } from '../data/blogs';
import { MASTER_QUESTION_BANK, SUBJECT_MASTER_LIST, CHAPTER_MASTER_LIST } from '../data/questionBank';

// Banner SVGs for Course Master cards matching screenshot 2
const bannerBitSat2026Crash = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23dc2626"/><stop offset="100%" stop-color="%237f1d1d"/></linearGradient></defs><rect width="800" height="450" fill="url(%23bg1)"/><rect x="30" y="30" width="360" height="50" rx="25" fill="%23000" opacity="0.6"/><text x="45" y="63" fill="%23fff" font-family="sans-serif" font-weight="900" font-size="24">Limited Seats - Enroll Now</text><text x="30" y="150" fill="%23fff" font-family="sans-serif" font-weight="900" font-size="52">BITSAT 2026</text><text x="30" y="215" fill="%23facc15" font-family="sans-serif" font-weight="900" font-size="46">Crash Course</text><rect x="30" y="245" width="280" height="55" rx="28" fill="%23991b1b"/><text x="65" y="282" fill="%23fff" font-family="sans-serif" font-weight="bold" font-size="30">Antim Batch</text><text x="30" y="335" fill="%23fef08a" font-family="sans-serif" font-weight="bold" font-size="20">Course Designed by BITSians</text><path d="M520 450 L520 220 L580 180 L640 220 L640 450 Z" fill="%23fde047" opacity="0.9"/><circle cx="580" cy="250" r="22" fill="%231e293b"/><path d="M580 235 L580 250 L590 250" stroke="%23fff" stroke-width="4" stroke-linecap="round"/><path d="M480 320 Q 550 280 620 340 T 780 320" fill="none" stroke="%23000" stroke-width="8"/><circle cx="510" cy="315" r="14" fill="%23eab308"/><circle cx="580" cy="310" r="14" fill="%23ef4444"/><circle cx="650" cy="335" r="14" fill="%2306b6d4"/><circle cx="720" cy="325" r="14" fill="%2322c55e"/></svg>`;

const bannerBitSat2026Master = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2316a34a"/><stop offset="100%" stop-color="%2314532d"/></linearGradient></defs><rect width="800" height="450" fill="url(%23bg2)"/><text x="30" y="110" fill="%23fff" font-family="sans-serif" font-weight="900" font-size="56">BITSAT 2026</text><text x="30" y="180" fill="%23facc15" font-family="sans-serif" font-weight="900" font-size="52">Master Course</text><rect x="30" y="215" width="460" height="65" rx="20" fill="%23fff"/><text x="50" y="258" fill="%2314532d" font-family="sans-serif" font-weight="900" font-size="28">Course by BITSians for future BITSians</text><path d="M560 450 L560 200 L620 160 L680 200 L680 450 Z" fill="%23fde047"/><circle cx="620" cy="230" r="22" fill="%231e293b"/><path d="M620 215 L620 230 L630 230" stroke="%23fff" stroke-width="4"/><path d="M500 360 Q 580 300 660 360 T 780 340" fill="none" stroke="%23000" stroke-width="8"/><circle cx="530" cy="345" r="14" fill="%23eab308"/><circle cx="600" cy="330" r="14" fill="%23ef4444"/><circle cx="670" cy="360" r="14" fill="%2306b6d4"/><circle cx="740" cy="345" r="14" fill="%2322c55e"/></svg>`;

const bannerBitSat2026Rapid = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%239333ea"/><stop offset="100%" stop-color="%23581c87"/></linearGradient></defs><rect width="800" height="450" fill="url(%23bg3)"/><text x="30" y="110" fill="%23fff" font-family="sans-serif" font-weight="900" font-size="56">BITSAT 2026</text><text x="30" y="180" fill="%23facc15" font-family="sans-serif" font-weight="900" font-size="46">Rapid Revision Course</text><rect x="30" y="215" width="460" height="65" rx="20" fill="%23fff"/><text x="50" y="258" fill="%23581c87" font-family="sans-serif" font-weight="900" font-size="28">Efficient Course for Last time prep</text><path d="M560 450 L560 200 L620 160 L680 200 L680 450 Z" fill="%23fde047"/><circle cx="620" cy="230" r="22" fill="%231e293b"/><path d="M500 360 Q 580 300 660 360 T 780 340" fill="none" stroke="%23000" stroke-width="8"/><circle cx="530" cy="345" r="14" fill="%23eab308"/><circle cx="600" cy="330" r="14" fill="%23ef4444"/></svg>`;

const bannerBitSat2027Champions = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="100%" stop-color="%23312e81"/></linearGradient></defs><rect width="800" height="450" fill="url(%23bg4)"/><text x="30" y="110" fill="%23fff" font-family="sans-serif" font-weight="900" font-size="56">BITSAT 2027</text><text x="30" y="180" fill="%23facc15" font-family="sans-serif" font-weight="900" font-size="44">Champions Course</text><rect x="30" y="215" width="340" height="180" rx="16" fill="%23fff" opacity="0.95"/><text x="50" y="250" fill="%231e1b4b" font-family="sans-serif" font-weight="bold" font-size="20">• Video Lectures</text><text x="210" y="250" fill="%231e1b4b" font-family="sans-serif" font-weight="bold" font-size="20">• Mock tests</text><text x="50" y="290" fill="%231e1b4b" font-family="sans-serif" font-weight="bold" font-size="20">• DPPs</text><text x="210" y="290" fill="%231e1b4b" font-family="sans-serif" font-weight="bold" font-size="20">• Short Notes</text><text x="50" y="330" fill="%231e1b4b" font-family="sans-serif" font-weight="bold" font-size="20">• Question bank</text><text x="210" y="330" fill="%231e1b4b" font-family="sans-serif" font-weight="bold" font-size="20">• Doubts Clearnace</text><path d="M560 450 L560 260 L620 220 L680 260 L680 450 Z" fill="%23fde047"/></svg>`;

const bannerBitSat2027Star = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23991b1b"/><stop offset="100%" stop-color="%23450a0a"/></linearGradient></defs><rect width="800" height="450" fill="url(%23bg5)"/><text x="30" y="110" fill="%23fff" font-family="sans-serif" font-weight="900" font-size="56">BITSAT 2027</text><text x="30" y="180" fill="%23facc15" font-family="sans-serif" font-weight="900" font-size="50">Star Program</text><rect x="30" y="215" width="460" height="85" rx="20" fill="%23fff"/><text x="50" y="268" fill="%237f1d1d" font-family="sans-serif" font-weight="900" font-size="26">Personal Mentorship + Complete Course material</text><path d="M560 450 L560 240 L620 200 L680 240 L680 450 Z" fill="%23fde047"/></svg>`;

export default function AdminDashboard({ initialTab = 'Exam Master' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Submenu Collapse State
  const [expandedMenus, setExpandedMenus] = useState({
    'Chapter Management': true,
    'Question Management': true,
    'Notification': true
  });

  const toggleMenuExpand = (menuName) => {
    setExpandedMenus((prev) => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  // 1. EXAM MASTER STATE (Connected to Central Database Engine)
  const [examList, setExamList] = useState(() => {
    const cached = getStoredExams();
    return cached.length > 0 ? cached : [];
  });
  const [examLoading, setExamLoading] = useState(false);
  const [examForm, setExamForm] = useState({
    id: null,
    examName: '',
    slug: '',
    description: '',
    metaTitle: '',
    metaDescription: '',
    isActive: true,
  });
  const [examSearchTerm, setExamSearchTerm] = useState('');

  // Synchronize exams from central server database
  const loadExams = async (term = '') => {
    try {
      const data = await fetchAdminExams(term);
      if (Array.isArray(data)) {
        setExamList(data);
      }
    } catch (err) {
      console.warn('[Exam Master] Failed to fetch server exams:', err);
    }
  };

  useEffect(() => {
    loadExams();

    const handleExamUpdate = () => {
      loadExams();
    };

    window.addEventListener('10q_exams_updated', handleExamUpdate);
    window.addEventListener('storage', handleExamUpdate);

    return () => {
      window.removeEventListener('10q_exams_updated', handleExamUpdate);
      window.removeEventListener('storage', handleExamUpdate);
    };
  }, []);

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examForm.examName?.trim()) {
      alert('Exam name is required.');
      return;
    }
    const autoSlug = examForm.slug?.trim() || examForm.examName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Get current logged-in admin identifier for audit tracking
    const currentAdminUser = (() => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('10q_user') : null;
        return raw ? JSON.parse(raw)?.email || JSON.parse(raw)?.name : 'Administrator';
      } catch {
        return 'Administrator';
      }
    })();

    setExamLoading(true);
    try {
      const payload = {
        ...examForm,
        examName: examForm.examName.trim(),
        slug: autoSlug,
        isActive: examForm.isActive !== undefined ? examForm.isActive : true,
      };

      if (examForm.id) {
        await apiUpdateExam(examForm.id, payload, currentAdminUser);
        alert('Exam updated successfully!');
      } else {
        await apiCreateExam(payload, currentAdminUser);
        alert('Exam created successfully in Exam Master!');
      }

      setExamForm({ id: null, examName: '', slug: '', description: '', metaTitle: '', metaDescription: '', isActive: true });
      await loadExams();
    } catch (err) {
      alert(err.message || 'Failed to save exam.');
    } finally {
      setExamLoading(false);
    }
  };

  const handleEditExam = (exam) => {
    setExamForm({
      id: exam.id,
      examName: exam.examName || '',
      slug: exam.slug || '',
      description: exam.description || '',
      metaTitle: exam.metaTitle || '',
      metaDescription: exam.metaDescription || '',
      isActive: exam.isActive !== undefined ? exam.isActive : true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExam = async (exam) => {
    const courseCount = exam.associatedCoursesCount || 0;
    if (courseCount > 0) {
      alert(`⚠️ Unsafe Deletion Blocked!\n\n${courseCount} course(s) are currently associated with "${exam.examName}".\n\nTo protect existing website data, this exam cannot be deleted while courses depend on it. You can deactivate the exam instead.`);
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete "${exam.examName}" from Exam Master?`)) {
      try {
        await apiDeleteExam(exam.id);
        alert('Exam successfully removed from master catalogue.');
        await loadExams();
      } catch (err) {
        alert(err.message || 'Failed to delete exam.');
      }
    }
  };

  const handleToggleExamStatus = async (exam) => {
    const newStatus = !exam.isActive;
    try {
      await apiUpdateExam(exam.id, { ...exam, isActive: newStatus });
      await loadExams();
    } catch (err) {
      alert(err.message || 'Failed to update exam status.');
    }
  };

  // 2. SUBJECT MASTER STATE (Centralized & Database Persistent)
  const [subjectList, setSubjectList] = useState(() => {
    const cached = getStoredSubjects();
    return Array.isArray(cached) && cached.length > 0 ? cached : [];
  });
  const [subjectForm, setSubjectForm] = useState({
    id: null,
    subjectCode: '',
    subjectName: '',
    description: '',
    displayIndex: '1',
    isActive: true,
  });
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [subjectStatusFilter, setSubjectStatusFilter] = useState('All');
  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [viewingAssignedSubject, setViewingAssignedSubject] = useState(null);

  // Synchronize subjects from central server database
  const loadSubjects = async (term = '') => {
    try {
      const data = await fetchAdminSubjects(term);
      if (Array.isArray(data)) {
        setSubjectList(data);
      }
    } catch (err) {
      console.warn('[Subject Master] Failed to fetch server subjects:', err);
    }
  };

  useEffect(() => {
    loadSubjects();

    const handleSubjectUpdate = () => {
      loadSubjects();
    };

    window.addEventListener('10q_subjects_updated', handleSubjectUpdate);
    window.addEventListener('storage', handleSubjectUpdate);

    return () => {
      window.removeEventListener('10q_subjects_updated', handleSubjectUpdate);
      window.removeEventListener('storage', handleSubjectUpdate);
    };
  }, []);

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.subjectCode?.trim()) {
      alert('Subject Code is required.');
      return;
    }
    if (!subjectForm.subjectName?.trim()) {
      alert('Subject Name is required.');
      return;
    }

    setIsSavingSubject(true);

    try {
      const payload = {
        subjectCode: subjectForm.subjectCode.trim(),
        subjectName: subjectForm.subjectName.trim(),
        description: subjectForm.description?.trim() || '',
        displayIndex: Number(subjectForm.displayIndex) || 1,
        isActive: subjectForm.isActive !== undefined ? Boolean(subjectForm.isActive) : true,
      };

      if (subjectForm.id) {
        await apiUpdateSubject(subjectForm.id, payload);
        alert('Subject updated successfully in Subject Master!');
      } else {
        await apiCreateSubject(payload);
        alert('Subject created and registered successfully in Subject Master!');
      }

      await loadSubjects();
      setSubjectForm({ id: null, subjectCode: '', subjectName: '', description: '', displayIndex: '1', isActive: true });
    } catch (err) {
      console.error('[Subject Save Error]', err);
      alert(err.message || 'Failed to save subject.');
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleEditSubject = (subject) => {
    setSubjectForm({
      id: subject.id,
      subjectCode: subject.subjectCode || '',
      subjectName: subject.subjectName || '',
      description: subject.description || '',
      displayIndex: String(subject.displayIndex || subject.id),
      isActive: subject.isActive !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSubjectStatus = async (subject) => {
    try {
      await apiUpdateSubject(subject.id, { isActive: !subject.isActive });
      await loadSubjects();
    } catch (err) {
      alert(err.message || 'Failed to update subject status.');
    }
  };

  const handleDeleteSubject = async (subject) => {
    if (subject.associatedCoursesCount > 0) {
      const courseNames = (subject.associatedCourses || []).map((c) => `• ${c.title}`).join('\n');
      alert(
        `Cannot delete subject '${subject.subjectName}'.\n\nIt is currently assigned to ${subject.associatedCoursesCount} course(s):\n${courseNames}\n\nPlease remove this subject from the assigned courses or deactivate the subject instead.`
      );
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to permanently delete '${subject.subjectName}' (${subject.subjectCode})? This action cannot be undone.`
      )
    ) {
      try {
        await apiDeleteSubject(subject.id);
        await loadSubjects();
        alert('Subject successfully removed from master catalogue.');
      } catch (err) {
        alert(err.message || 'Failed to delete subject.');
      }
    }
  };

  // 3. CHAPTER MASTER TABBED STATE
  const [chapterActiveTab, setChapterActiveTab] = useState('Table'); // 'Basic Information' or 'Table'
  const [chapterList, setChapterList] = useState([]);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterCourseFilter, setChapterCourseFilter] = useState('');
  const [chapterSubjectFilter, setChapterSubjectFilter] = useState('');
  const [chapterStatusFilter, setChapterStatusFilter] = useState('ALL');
  const [chapterSearchTerm, setChapterSearchTerm] = useState('');

  const defaultChapterForm = {
    id: null,
    courseId: '',
    subjectId: '',
    chapterName: '',
    chapterCode: '',
    description: '',
    displayOrder: '1',
    isActive: true
  };

  const [chapterForm, setChapterForm] = useState(defaultChapterForm);

  const loadChapters = async () => {
    setChapterLoading(true);
    try {
      const data = await fetchAdminChapters();
      if (Array.isArray(data)) {
        setChapterList(data);
      }
    } catch (err) {
      console.error('[Chapter Load Error]', err);
    } finally {
      setChapterLoading(false);
    }
  };

  useEffect(() => {
    loadChapters();
  }, []);

  // Helper to determine subjects available for a selected course
  const getAssignedSubjectsForCourse = (cId) => {
    if (!cId) return [];
    const course = courseList.find(c => Number(c.id) === Number(cId));
    if (!course) return [];
    if (Array.isArray(course.subjectIds) && course.subjectIds.length > 0) {
      return subjects.filter(s => course.subjectIds.includes(Number(s.id)));
    }
    return subjects.filter(s => s.isActive !== false);
  };

  const handleChapterCourseChange = (newCourseId) => {
    const allowed = getAssignedSubjectsForCourse(newCourseId);
    const isStillValid = allowed.some(s => String(s.id) === String(chapterForm.subjectId));
    setChapterForm({
      ...chapterForm,
      courseId: newCourseId,
      subjectId: isStillValid ? chapterForm.subjectId : (allowed.length > 0 ? String(allowed[0].id) : '')
    });
  };

  const handleSaveChapter = async (e) => {
    e.preventDefault();
    if (!chapterForm.courseId) {
      alert('Validation Error: Please select a Course.');
      return;
    }
    if (!chapterForm.subjectId) {
      alert('Validation Error: Please select a Subject assigned to this course.');
      return;
    }
    if (!chapterForm.chapterName.trim()) {
      alert('Validation Error: Chapter Name is required.');
      return;
    }

    setChapterSaving(true);
    try {
      const payload = {
        courseId: Number(chapterForm.courseId),
        subjectId: Number(chapterForm.subjectId),
        chapterName: chapterForm.chapterName.trim(),
        chapterCode: chapterForm.chapterCode.trim() || undefined,
        description: chapterForm.description.trim(),
        displayOrder: Number(chapterForm.displayOrder) || 1,
        isActive: Boolean(chapterForm.isActive)
      };

      if (chapterForm.id) {
        await apiUpdateChapter(chapterForm.id, payload);
        alert('Chapter updated successfully!');
      } else {
        await apiCreateChapter(payload);
        alert('Chapter created successfully!');
      }

      await loadChapters();
      setChapterForm(defaultChapterForm);
      setChapterActiveTab('Table');
    } catch (err) {
      alert(err.message || 'Failed to save chapter.');
    } finally {
      setChapterSaving(false);
    }
  };

  const handleEditChapter = (chapter) => {
    setChapterForm({
      id: chapter.id,
      courseId: String(chapter.courseId || ''),
      subjectId: String(chapter.subjectId || ''),
      chapterName: chapter.chapterName || '',
      chapterCode: chapter.chapterCode || '',
      description: chapter.description || '',
      displayOrder: String(chapter.displayOrder || '1'),
      isActive: chapter.isActive !== false
    });
    setChapterActiveTab('Basic Information');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteChapter = async (id, chapterName) => {
    if (window.confirm(`Are you sure you want to delete chapter "${chapterName || id}"? This action cannot be undone.`)) {
      try {
        await apiDeleteChapter(id);
        await loadChapters();
        alert('Chapter deleted successfully.');
      } catch (err) {
        alert(err.message || 'Failed to delete chapter.');
      }
    }
  };

  const handleToggleChapterStatus = async (chapter) => {
    try {
      await apiUpdateChapter(chapter.id, { isActive: !chapter.isActive });
      await loadChapters();
    } catch (err) {
      alert(err.message || 'Failed to toggle chapter status.');
    }
  };

  // 4. CHAPTER TOPIC MASTER TABBED STATE
  const [topicActiveTab, setTopicActiveTab] = useState('Table'); // 'Basic Information' or 'Table'
  const [topicList, setTopicList] = useState([]);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicSaving, setTopicSaving] = useState(false);
  const [topicCourseFilter, setTopicCourseFilter] = useState('');
  const [topicSubjectFilter, setTopicSubjectFilter] = useState('');
  const [topicChapterFilter, setTopicChapterFilter] = useState('');
  const [topicStatusFilter, setTopicStatusFilter] = useState('ALL');
  const [topicSearchTerm, setTopicSearchTerm] = useState('');

  const defaultTopicForm = {
    id: null,
    courseId: '',
    subjectId: '',
    chapterId: '',
    topicName: '',
    topicCode: '',
    description: '',
    displayOrder: '1',
    isActive: true
  };

  const [topicForm, setTopicForm] = useState(defaultTopicForm);

  const loadTopics = async () => {
    setTopicLoading(true);
    try {
      const data = await fetchAdminTopics();
      if (Array.isArray(data)) {
        setTopicList(data);
      }
    } catch (err) {
      console.error('[Topic Load Error]', err);
    } finally {
      setTopicLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  // Cascading helpers for Topic Form
  const handleTopicCourseChange = (newCourseId) => {
    setTopicForm({
      ...topicForm,
      courseId: newCourseId,
      subjectId: '',
      chapterId: ''
    });
  };

  const handleTopicSubjectChange = (newSubjectId) => {
    setTopicForm({
      ...topicForm,
      subjectId: newSubjectId,
      chapterId: ''
    });
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!topicForm.courseId) {
      alert('Validation Error: Please select a Course.');
      return;
    }
    if (!topicForm.subjectId) {
      alert('Validation Error: Please select a Subject.');
      return;
    }
    if (!topicForm.chapterId) {
      alert('Validation Error: Please select a Chapter.');
      return;
    }
    if (!topicForm.topicName.trim()) {
      alert('Validation Error: Topic Name is required.');
      return;
    }

    setTopicSaving(true);
    try {
      const payload = {
        courseId: Number(topicForm.courseId),
        subjectId: Number(topicForm.subjectId),
        chapterId: Number(topicForm.chapterId),
        topicName: topicForm.topicName.trim(),
        topicCode: topicForm.topicCode.trim() || undefined,
        description: topicForm.description.trim(),
        displayOrder: Number(topicForm.displayOrder) || 1,
        isActive: Boolean(topicForm.isActive)
      };

      if (topicForm.id) {
        await apiUpdateTopic(topicForm.id, payload);
        alert('Topic updated successfully!');
      } else {
        await apiCreateTopic(payload);
        alert('Topic created successfully!');
      }

      await loadTopics();
      setTopicForm(defaultTopicForm);
      setTopicActiveTab('Table');
    } catch (err) {
      alert(err.message || 'Failed to save topic.');
    } finally {
      setTopicSaving(false);
    }
  };

  const handleEditTopic = (topic) => {
    setTopicForm({
      id: topic.id,
      courseId: String(topic.courseId || ''),
      subjectId: String(topic.subjectId || ''),
      chapterId: String(topic.chapterId || ''),
      topicName: topic.topicName || '',
      topicCode: topic.topicCode || '',
      description: topic.description || '',
      displayOrder: String(topic.displayOrder || '1'),
      isActive: topic.isActive !== false
    });
    setTopicActiveTab('Basic Information');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTopic = async (id, topicName) => {
    if (window.confirm(`Are you sure you want to delete topic "${topicName || id}"? This action cannot be undone.`)) {
      try {
        await apiDeleteTopic(id);
        await loadTopics();
        alert('Topic deleted successfully.');
      } catch (err) {
        alert(err.message || 'Failed to delete topic.');
      }
    }
  };

  const handleToggleTopicStatus = async (topic) => {
    try {
      await apiUpdateTopic(topic.id, { isActive: !topic.isActive });
      await loadTopics();
    } catch (err) {
      alert(err.message || 'Failed to toggle topic status.');
    }
  };

  // 5. OBJECTIVE QUESTION STATE (PERSISTENT & REUSABLE QUESTION BANK)
  const [objectiveQuestionList, setObjectiveQuestionList] = useState([]);
  const [objModalOpen, setObjModalOpen] = useState(false);
  const [objSubjectFilter, setObjSubjectFilter] = useState('');
  const [objChapterFilter, setObjChapterFilter] = useState('');
  const [objDifficultyFilter, setObjDifficultyFilter] = useState('');
  const [objSearchTerm, setObjSearchTerm] = useState('');
  const [objEditorTab, setObjEditorTab] = useState('Question'); // 'Question' | 'Answer 1' | 'Answer 2' | 'Answer 3' | 'Answer 4' | 'Answer Explanation'
  const [isSavingObjQuestion, setIsSavingObjQuestion] = useState(false);

  const defaultObjQuestionForm = {
    id: null,
    subjectId: '',
    chapterId: '',
    questionContent: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
    difficulty: 'Medium',
    orderNumber: '1',
    isActive: true
  };
  const [objQuestionForm, setObjQuestionForm] = useState(defaultObjQuestionForm);

  // 6. NUMERICAL QUESTION STATE (PERSISTENT & REUSABLE QUESTION BANK)
  const [numericalQuestionList, setNumericalQuestionList] = useState([]);
  const [numModalOpen, setNumModalOpen] = useState(false);
  const [numSubjectFilter, setNumSubjectFilter] = useState('');
  const [numChapterFilter, setNumChapterFilter] = useState('');
  const [numDifficultyFilter, setNumDifficultyFilter] = useState('');
  const [numSearchTerm, setNumSearchTerm] = useState('');
  const [numEditorTab, setNumEditorTab] = useState('Question'); // 'Question' | 'Answer' | 'Answer Explanation'
  const [isSavingNumQuestion, setIsSavingNumQuestion] = useState(false);

  const defaultNumQuestionForm = {
    id: null,
    subjectId: '',
    chapterId: '',
    questionContent: '',
    rangeFrom: '',
    rangeTo: '',
    tolerance: '0.05',
    explanation: '',
    difficulty: 'Medium',
    orderNumber: '1',
    isActive: true
  };
  const [numQuestionForm, setNumQuestionForm] = useState(defaultNumQuestionForm);

  // Load questions from master database on mount
  const loadQuestions = async () => {
    try {
      const [objData, numData] = await Promise.all([
        fetchAdminQuestions({ type: 'objective' }),
        fetchAdminQuestions({ type: 'numerical' })
      ]);
      if (Array.isArray(objData)) setObjectiveQuestionList(objData);
      if (Array.isArray(numData)) setNumericalQuestionList(numData);
    } catch (err) {
      console.error('[Questions Load Error]', err);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // Helper to get chapters belonging to a subject
  const getChaptersForSubject = (sId) => {
    if (!sId) return [];
    return chapterList.filter(ch => String(ch.subjectId) === String(sId));
  };

  const getSubjectName = (sId) => {
    if (!sId) return '—';
    const s = subjectList.find(sub => String(sub.id) === String(sId));
    return s ? s.name : `Subject #${sId}`;
  };

  const getChapterName = (cId) => {
    if (!cId) return '—';
    const c = chapterList.find(ch => String(ch.id) === String(cId));
    return c ? c.name : `Chapter #${cId}`;
  };

  // Objective Question Handlers
  const handleSaveObjQuestion = async (e) => {
    e.preventDefault();
    if (!objQuestionForm.subjectId) {
      alert('Validation Error: Subject is required.');
      return;
    }
    if (!objQuestionForm.chapterId) {
      alert('Validation Error: Chapter is required.');
      return;
    }
    if (!objQuestionForm.questionContent.trim()) {
      alert('Validation Error: Question Content is required.');
      return;
    }
    if (!objQuestionForm.optionA.trim() || !objQuestionForm.optionB.trim() || !objQuestionForm.optionC.trim() || !objQuestionForm.optionD.trim()) {
      alert('Validation Error: All 4 answer options (Option 1, 2, 3, 4) are required.');
      return;
    }
    if (!['A', 'B', 'C', 'D'].includes(String(objQuestionForm.correctOption).toUpperCase())) {
      alert('Validation Error: Exactly one correct answer option (Option 1, 2, 3, or 4) must be marked correct.');
      return;
    }

    setIsSavingObjQuestion(true);
    try {
      const payload = {
        questionType: 'objective',
        subjectId: Number(objQuestionForm.subjectId),
        chapterId: Number(objQuestionForm.chapterId),
        questionContent: objQuestionForm.questionContent.trim(),
        optionA: objQuestionForm.optionA.trim(),
        optionB: objQuestionForm.optionB.trim(),
        optionC: objQuestionForm.optionC.trim(),
        optionD: objQuestionForm.optionD.trim(),
        correctOption: String(objQuestionForm.correctOption).toUpperCase(),
        explanation: objQuestionForm.explanation.trim(),
        difficulty: objQuestionForm.difficulty || 'Medium',
        orderNumber: Number(objQuestionForm.orderNumber) || 1,
        isActive: Boolean(objQuestionForm.isActive)
      };

      if (objQuestionForm.id) {
        await apiUpdateQuestion(objQuestionForm.id, payload);
        alert('Objective Question updated successfully!');
      } else {
        await apiCreateQuestion(payload);
        alert('Objective Question created successfully in Question Bank!');
      }

      await loadQuestions();
      setObjQuestionForm(defaultObjQuestionForm);
      setObjEditorTab('Question');
      setObjModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to save question.');
    } finally {
      setIsSavingObjQuestion(false);
    }
  };

  const handleEditObjQuestion = (q) => {
    setObjQuestionForm({
      id: q.id,
      subjectId: String(q.subjectId || ''),
      chapterId: String(q.chapterId || ''),
      questionContent: q.questionContent || q.question || '',
      optionA: q.optionA || '',
      optionB: q.optionB || '',
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      correctOption: q.correctOption ? q.correctOption.replace(/^Option\s+/i, '').toUpperCase() : 'A',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'Medium',
      orderNumber: String(q.orderNumber || '1'),
      isActive: q.isActive !== false
    });
    setObjEditorTab('Question');
    setObjModalOpen(true);
  };

  const handleDeleteObjQuestion = async (id) => {
    if (window.confirm('Are you sure you want to delete this objective question from the Question Bank?')) {
      try {
        await apiDeleteQuestion(id);
        await loadQuestions();
        alert('Question deleted successfully.');
      } catch (err) {
        alert(err.message || 'Failed to delete question.');
      }
    }
  };

  // Numerical Question Handlers
  const handleSaveNumQuestion = async (e) => {
    e.preventDefault();
    if (!numQuestionForm.subjectId) {
      alert('Validation Error: Subject is required.');
      return;
    }
    if (!numQuestionForm.chapterId) {
      alert('Validation Error: Chapter is required.');
      return;
    }
    if (!numQuestionForm.questionContent.trim()) {
      alert('Validation Error: Question Content is required.');
      return;
    }
    if (numQuestionForm.rangeFrom === undefined || String(numQuestionForm.rangeFrom).trim() === '') {
      alert('Validation Error: Range From value is required.');
      return;
    }
    if (numQuestionForm.rangeTo === undefined || String(numQuestionForm.rangeTo).trim() === '') {
      alert('Validation Error: Range To value is required.');
      return;
    }

    const numFrom = Number(numQuestionForm.rangeFrom);
    const numTo = Number(numQuestionForm.rangeTo);
    if (isNaN(numFrom) || isNaN(numTo)) {
      alert('Validation Error: Range From and Range To must be valid numbers.');
      return;
    }
    if (numFrom > numTo) {
      alert('Validation Error: Range From cannot be greater than Range To.');
      return;
    }

    setIsSavingNumQuestion(true);
    try {
      const payload = {
        questionType: 'numerical',
        subjectId: Number(numQuestionForm.subjectId),
        chapterId: Number(numQuestionForm.chapterId),
        questionContent: numQuestionForm.questionContent.trim(),
        rangeFrom: String(numQuestionForm.rangeFrom).trim(),
        rangeTo: String(numQuestionForm.rangeTo).trim(),
        tolerance: String(numQuestionForm.tolerance || '0.05').trim(),
        explanation: numQuestionForm.explanation.trim(),
        difficulty: numQuestionForm.difficulty || 'Medium',
        orderNumber: Number(numQuestionForm.orderNumber) || 1,
        isActive: Boolean(numQuestionForm.isActive)
      };

      if (numQuestionForm.id) {
        await apiUpdateQuestion(numQuestionForm.id, payload);
        alert('Numerical Question updated successfully!');
      } else {
        await apiCreateQuestion(payload);
        alert('Numerical Question created successfully in Question Bank!');
      }

      await loadQuestions();
      setNumQuestionForm(defaultNumQuestionForm);
      setNumEditorTab('Question');
      setNumModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to save question.');
    } finally {
      setIsSavingNumQuestion(false);
    }
  };

  const handleEditNumQuestion = (q) => {
    setNumQuestionForm({
      id: q.id,
      subjectId: String(q.subjectId || ''),
      chapterId: String(q.chapterId || ''),
      questionContent: q.questionContent || q.question || '',
      rangeFrom: q.rangeFrom !== undefined ? String(q.rangeFrom) : (q.numericalValue !== undefined ? String(q.numericalValue) : ''),
      rangeTo: q.rangeTo !== undefined ? String(q.rangeTo) : (q.numericalValue !== undefined ? String(q.numericalValue) : ''),
      tolerance: q.tolerance !== undefined ? String(q.tolerance) : '0.05',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'Medium',
      orderNumber: String(q.orderNumber || '1'),
      isActive: q.isActive !== false
    });
    setNumEditorTab('Question');
    setNumModalOpen(true);
  };

  const handleDeleteNumQuestion = async (id) => {
    if (window.confirm('Are you sure you want to delete this numerical question from the Question Bank?')) {
      try {
        await apiDeleteQuestion(id);
        await loadQuestions();
        alert('Question deleted successfully.');
      } catch (err) {
        alert(err.message || 'Failed to delete question.');
      }
    }
  };

  // 7. COURSE MASTER STATE
  const [courseActiveTab, setCourseActiveTab] = useState('Table'); // 'Basic Information' or 'Table'
  const [courseList, setCourseList] = useState(() => getStoredCourses());
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [courseUploadLoading, setCourseUploadLoading] = useState(false);
  const [courseSaveError, setCourseSaveError] = useState('');

  // Fetch courses from server database on mount to guarantee multi-admin sync
  useEffect(() => {
    fetchAdminCourses().then((data) => {
      if (Array.isArray(data)) {
        setCourseList(data);
      }
    });
  }, []);

  // Keep persistent storage updated whenever courseList changes
  useEffect(() => {
    saveStoredCourses(courseList);
  }, [courseList]);

  const defaultCourseForm = {
    id: null,
    title: '',
    shortDescription: '',
    description: '',
    exam: 'BITSAT',
    originalPrice: '',
    discountedPrice: '',
    expiryDate: '',
    enrolledStudent: '',
    displayIndex: '1',
    additionalDetails: '',
    image: '',
    bannerImage: '',
    altCourseImage: '',
    altBannerImage: '',
    scheduleFile: '',
    slug: '',
    metaTitle: '',
    metaDescription: '',
    courseLink: '',
    isShowInIndex: true,
    isActive: true,
    isShowInMentorship: false,
    isShowInTestSeries: false,
    mentor: 'Harshal Jain',
    selectedSubjectIds: []
  };

  const [courseForm, setCourseForm] = useState(defaultCourseForm);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title.trim()) {
      alert('Course Title is required.');
      return;
    }
    if (!courseForm.exam?.trim()) {
      alert('Exam is required.');
      return;
    }

    const autoSlug = courseForm.slug?.trim() || courseForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const priceFormatted = courseForm.discountedPrice || courseForm.originalPrice || '4999';
    const origPriceFormatted = courseForm.originalPrice || (parseInt(priceFormatted) * 2).toString();

    // Validate that discounted price does not exceed original price
    const numOrig = Number(origPriceFormatted) || 0;
    const numDisc = Number(priceFormatted) || 0;
    if (numOrig > 0 && numDisc > numOrig) {
      alert('Validation Error: Discounted Price cannot be greater than Original Price.');
      return;
    }

    const discountFormatted = courseForm.discount || (numOrig > numDisc && numOrig > 0 ? `${Math.round(((numOrig - numDisc) / numOrig) * 100)}% OFF` : '50% OFF');

    setIsSavingCourse(true);
    setCourseSaveError('');

    try {
      const matchedExam = examList.find(e => e.examName.toLowerCase().trim() === courseForm.exam.toLowerCase().trim());
      const payload = {
        ...courseForm,
        examId: matchedExam ? matchedExam.id : (courseForm.examId || undefined),
        subjectIds: Array.isArray(courseForm.selectedSubjectIds) ? courseForm.selectedSubjectIds : [],
        slug: autoSlug,
        price: priceFormatted,
        discountedPrice: priceFormatted,
        originalPrice: origPriceFormatted,
        discount: discountFormatted,
        rating: courseForm.rating || '4.9',
        reviewsCount: courseForm.reviewsCount || 128,
        studentsCount: courseForm.enrolledStudent || 1250,
        duration: courseForm.duration || '60+ Hours',
        lectures: courseForm.lectures || '80+ Lectures',
        tests: courseForm.tests || '20+ Mock Tests',
        tag: courseForm.tag || 'NEW BATCH',
        image: courseForm.image || bannerBitSat2026Master,
        bannerImage: courseForm.bannerImage || bannerBitSat2026Master
      };

      if (courseForm.id) {
        await apiUpdateCourse(courseForm.id, payload);
      } else {
        await apiCreateCourse(payload);
      }

      // Re-fetch latest from central server database
      const refreshed = await fetchAdminCourses();
      setCourseList(refreshed);

      setCourseForm(defaultCourseForm);
      setCourseActiveTab('Table');
      setCourseModalOpen(false);
      alert(courseForm.id ? 'Course updated successfully!' : 'Course created and published successfully!');
    } catch (err) {
      console.error('[Course Save Error]', err);
      const msg = err.message || 'Failed to save course to server database.';
      setCourseSaveError(msg);
      alert(msg);
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleEditCourse = async (course) => {
    let assignedSubjectIds = Array.isArray(course.subjectIds) ? course.subjectIds : [];
    if (assignedSubjectIds.length === 0 && course.id) {
      try {
        const fetchedSubs = await fetchCourseSubjects(course.id);
        if (Array.isArray(fetchedSubs)) {
          assignedSubjectIds = fetchedSubs.map((s) => s.id);
        }
      } catch {}
    }
    setCourseForm({
      ...defaultCourseForm,
      ...course,
      selectedSubjectIds: assignedSubjectIds,
    });
    setCourseActiveTab('Basic Information');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCourse = async (id) => {
    if (window.confirm('Are you sure you want to delete this course from the master catalogue?')) {
      try {
        await apiDeleteCourse(id);
        const refreshed = await fetchAdminCourses();
        setCourseList(refreshed);
        alert('Course deleted successfully.');
      } catch (err) {
        console.error('[Course Delete Error]', err);
        alert(err.message || 'Failed to delete course.');
      }
    }
  };

  // 8. VIDEO MASTER STATE
  const [videoActiveTab, setVideoActiveTab] = useState('Basic Information');
  const [videoCourseFilter, setVideoCourseFilter] = useState('');
  const [videoList, setVideoList] = useState([]);
  const [videoForm, setVideoForm] = useState({
    id: null,
    course: '',
    subject: 'Physics',
    chapter: '',
    title: '',
    description: '',
    videoLink: '',
    orderNumber: '1',
    liveVideo: false,
    enabled: true
  });
  const [videoSubjectFilter, setVideoSubjectFilter] = useState('');
  const [videoSearchTerm, setVideoSearchTerm] = useState('');

  const handleSaveVideo = (e) => {
    e.preventDefault();
    if (!videoForm.title.trim()) return;
    if (videoForm.id) {
      setVideoList(videoList.map(v => v.id === videoForm.id ? { ...videoForm } : v));
    } else {
      const newId = videoList.length ? Math.max(...videoList.map(v => v.id)) + 1 : 1;
      setVideoList([...videoList, { ...videoForm, id: newId }]);
    }
    setVideoForm({
      id: null,
      course: videoForm.course || '',
      subject: 'Physics',
      chapter: '',
      title: '',
      description: '',
      videoLink: '',
      orderNumber: '1',
      liveVideo: false,
      enabled: true
    });
    setVideoActiveTab('Table');
  };

  const handleEditVideo = (video) => {
    setVideoForm(video);
    setVideoActiveTab('Basic Information');
  };

  const handleDeleteVideo = (id) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      setVideoList(videoList.filter(v => v.id !== id));
    }
  };

  // 9. DOCUMENT MASTER STATE
  const [docActiveTab, setDocActiveTab] = useState('Basic Information');
  const [docCourseFilter, setDocCourseFilter] = useState('');
  const [docList, setDocList] = useState([]);
  const [docForm, setDocForm] = useState({
    id: null,
    course: '',
    subject: 'Physics',
    chapter: '',
    title: '',
    description: '',
    fileName: '',
    orderNumber: '1',
    enabled: true
  });
  const [docSubjectFilter, setDocSubjectFilter] = useState('');
  const [docSearchTerm, setDocSearchTerm] = useState('');

  const handleSaveDoc = (e) => {
    e.preventDefault();
    if (!docForm.title.trim()) return;
    if (docForm.id) {
      setDocList(docList.map(d => d.id === docForm.id ? { ...docForm } : d));
    } else {
      const newId = docList.length ? Math.max(...docList.map(d => d.id)) + 1 : 1;
      setDocList([...docList, { ...docForm, id: newId }]);
    }
    setDocForm({
      id: null,
      course: docForm.course || '',
      subject: 'Physics',
      chapter: '',
      title: '',
      description: '',
      fileName: '',
      orderNumber: '1',
      enabled: true
    });
    setDocActiveTab('Table');
  };

  const handleEditDoc = (doc) => {
    setDocForm(doc);
    setDocActiveTab('Basic Information');
  };

  const handleDeleteDoc = (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDocList(docList.filter(d => d.id !== id));
    }
  };

  // 10. COUPON MASTER STATE
  const [couponList, setCouponList] = useState([]);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    id: null,
    code: '',
    validFrom: '',
    expiryDate: '',
    discount: '',
    usageAllowed: '10',
    usageUsed: '0'
  });
  const [couponSearchTerm, setCouponSearchTerm] = useState('');

  const handleSaveCoupon = (e) => {
    e.preventDefault();
    if (!couponForm.code.trim()) return;
    const formattedUsage = `${couponForm.usageAllowed || '10'} / ${couponForm.usageUsed || '0'}`;
    if (couponForm.id) {
      setCouponList(couponList.map(c => c.id === couponForm.id ? { ...couponForm, usage: formattedUsage } : c));
    } else {
      const newId = couponList.length ? Math.max(...couponList.map(c => c.id)) + 1 : 1;
      setCouponList([...couponList, { ...couponForm, id: newId, usage: formattedUsage }]);
    }
    setCouponForm({
      id: null,
      code: '',
      validFrom: '',
      expiryDate: '',
      discount: '',
      usageAllowed: '10',
      usageUsed: '0'
    });
    setCouponModalOpen(false);
  };

  const handleEditCoupon = (coupon) => {
    const parts = coupon.usage ? coupon.usage.split('/') : ['10', '0'];
    setCouponForm({
      ...coupon,
      usageAllowed: parts[0] ? parts[0].trim() : '10',
      usageUsed: parts[1] ? parts[1].trim() : '0'
    });
    setCouponModalOpen(true);
  };

  const handleDeleteCoupon = (id) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      setCouponList(couponList.filter(c => c.id !== id));
    }
  };

  // 10. BLOG MASTER STATE & HANDLERS MATCHING USER SCREENSHOT
  const [blogList, setBlogList] = useState(() => {
    return initialBlogs.map((b, idx) => ({
      id: b.id || idx + 1,
      exam: b.exam || 'BITSAT',
      title: b.title || 'BITSAT Preparation Strategy',
      slug: b.slug || 'bitsat-strategy',
      description: b.contentHtml || b.excerpt || '',
      smallImage: b.image || '',
      largeImage: b.image || '',
      altSmall: b.title || '',
      altLarge: b.title || '',
      metaTitle: b.title || '',
      metaDescription: b.excerpt || '',
      published: true
    }));
  });

  const [blogActiveTab, setBlogActiveTab] = useState('Basic Information');
  const [blogSearchTerm, setBlogSearchTerm] = useState('');

  const [blogForm, setBlogForm] = useState({
    id: null,
    exam: 'BITSAT',
    title: '',
    slug: '',
    description: '',
    smallImage: '',
    largeImage: '',
    altSmall: '',
    altLarge: '',
    metaTitle: '',
    metaDescription: '',
    published: true
  });

  const handleSaveBlog = (e) => {
    e.preventDefault();
    if (!blogForm.title.trim()) return;

    const newSlug = blogForm.slug.trim() || blogForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    if (blogForm.id) {
      setBlogList(blogList.map(b => b.id === blogForm.id ? { ...blogForm, slug: newSlug } : b));
    } else {
      const newId = blogList.length ? Math.max(...blogList.map(b => b.id)) + 1 : 1;
      setBlogList([{ ...blogForm, id: newId, slug: newSlug }, ...blogList]);
    }

    setBlogForm({
      id: null,
      exam: 'BITSAT',
      title: '',
      slug: '',
      description: '',
      smallImage: '',
      largeImage: '',
      altSmall: '',
      altLarge: '',
      metaTitle: '',
      metaDescription: '',
      published: true
    });
    setBlogActiveTab('Table');
  };

  const handleEditBlog = (blog) => {
    setBlogForm({ ...blog });
    setBlogActiveTab('Basic Information');
  };

  const handleDeleteBlog = (id) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      setBlogList(blogList.filter(b => b.id !== id));
    }
  };

  const handleAddNewBlog = () => {
    setBlogForm({
      id: null,
      exam: 'BITSAT',
      title: '',
      slug: '',
      description: '',
      smallImage: '',
      largeImage: '',
      altSmall: '',
      altLarge: '',
      metaTitle: '',
      metaDescription: '',
      published: true
    });
    setBlogActiveTab('Basic Information');
  };

  // 11. SEO PAGE MASTER STATE & HANDLERS
  const [seoList, setSeoList] = useState([
    {
      id: 1,
      pageName: 'bitsat',
      metaTitle: 'BITSAT 2026 Entrance Prep & Test Series | 10Q Challenge',
      metaDescription: 'Comprehensive BITSAT 2026 preparation with mock tests and BITSian mentorship.'
    },
    {
      id: 2,
      pageName: 'comedk',
      metaTitle: 'COMEDK 2026 Test Series & Practice Courses | 10Q Challenge',
      metaDescription: 'Target top rank in COMEDK 2026 with curated question bank and mocks.'
    },
    {
      id: 3,
      pageName: 'jee',
      metaTitle: 'JEE Main & Advanced 2026 Preparation | 10Q Challenge',
      metaDescription: 'Master JEE Main & Advanced with chapterwise tests and video solutions.'
    },
    {
      id: 4,
      pageName: 'home',
      metaTitle: '10Q Challenge - Premier Online Exam Preparation Platform',
      metaDescription: 'India\'s leading test series and mentorship platform for engineering aspirants.'
    },
    {
      id: 5,
      pageName: 'blog',
      metaTitle: '10Q Challenge Blog - Preparation Tips, News & Strategies',
      metaDescription: 'Read latest exam updates, preparation strategies, and toppers advice.'
    },
    {
      id: 6,
      pageName: 'contact-us',
      metaTitle: 'Contact Us - 10Q Challenge Support',
      metaDescription: 'Get in touch with 10Q Challenge team for support and inquiries.'
    }
  ]);

  const [seoForm, setSeoForm] = useState({
    id: null,
    pageName: '',
    metaTitle: '',
    metaDescription: ''
  });

  const [seoSearchTerm, setSeoSearchTerm] = useState('');

  const handleSaveSeo = (e) => {
    e.preventDefault();
    if (!seoForm.pageName.trim()) return;

    if (seoForm.id) {
      setSeoList(seoList.map(s => s.id === seoForm.id ? { ...seoForm } : s));
    } else {
      const existing = seoList.find(s => s.pageName.toLowerCase() === seoForm.pageName.toLowerCase());
      if (existing) {
        setSeoList(seoList.map(s => s.id === existing.id ? { ...seoForm, id: existing.id } : s));
      } else {
        const newId = seoList.length ? Math.max(...seoList.map(s => s.id)) + 1 : 1;
        setSeoList([...seoList, { ...seoForm, id: newId }]);
      }
    }

    setSeoForm({ id: null, pageName: '', metaTitle: '', metaDescription: '' });
  };

  const handleEditSeo = (item) => {
    setSeoForm({ ...item });
  };

  // 12. NOTIFICATION STATE & HANDLERS
  const [siteNotifications, setSiteNotifications] = useState([]);

  const [studentNotifications, setStudentNotifications] = useState([]);

  const [siteNotifForm, setSiteNotifForm] = useState({
    title: '',
    message: '',
    target: 'All Visitors'
  });

  const [studentNotifForm, setStudentNotifForm] = useState({
    studentEmail: '',
    title: '',
    message: ''
  });

  const handleSendSiteNotif = (e) => {
    e.preventDefault();
    if (!siteNotifForm.title.trim()) return;
    const newNotif = {
      id: siteNotifications.length + 1,
      ...siteNotifForm,
      date: new Date().toLocaleString()
    };
    setSiteNotifications([newNotif, ...siteNotifications]);
    setSiteNotifForm({ title: '', message: '', target: 'All Visitors' });
  };

  const handleSendStudentNotif = (e) => {
    e.preventDefault();
    if (!studentNotifForm.title.trim()) return;
    const newNotif = {
      id: studentNotifications.length + 1,
      studentName: studentNotifForm.studentEmail ? studentNotifForm.studentEmail.split('@')[0] : 'Student',
      studentEmail: studentNotifForm.studentEmail || 'all@students.com',
      title: studentNotifForm.title,
      message: studentNotifForm.message,
      status: 'Delivered',
      sentAt: new Date().toLocaleString()
    };
    setStudentNotifications([newNotif, ...studentNotifications]);
    setStudentNotifForm({ studentEmail: '', title: '', message: '' });
  };

  // 13. STUDENT INVOICES STATE
  const [invoiceList, setInvoiceList] = useState([]);
  const [invoiceCriteria, setInvoiceCriteria] = useState('All');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // 14. STUDENT ATTEMPTED TEST STATE
  const [attemptedTestList, setAttemptedTestList] = useState([]);
  const [attemptedTestSearch, setAttemptedTestSearch] = useState('');

  // 15. STUDENT DOUBTS STATE
  const [doubtList, setDoubtList] = useState([]);
  const [doubtSearch, setDoubtSearch] = useState('');
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [doubtReplyInput, setDoubtReplyInput] = useState('');

  const handleReplyDoubt = (e) => {
    e.preventDefault();
    if (!selectedDoubt || !doubtReplyInput.trim()) return;
    setDoubtList(doubtList.map(d => d.id === selectedDoubt.id ? { ...d, status: 'Answered', reply: doubtReplyInput } : d));
    setSelectedDoubt(null);
    setDoubtReplyInput('');
  };

  const navigate = useNavigate();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const [globalAdminSearch, setGlobalAdminSearch] = useState('');
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const menuGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', icon: LayoutGrid, badge: 'Live', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      ]
    },
    {
      title: 'PRODUCT CATALOG',
      items: [
        { name: 'Course Master', icon: BookOpen, count: courseList.length },
        { name: 'Course Content Assignment', icon: Layers, badge: 'Hub', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' },
        { name: 'Exam Master', icon: GraduationCap, count: examList.length },
        { name: 'Subject Master', icon: ClipboardList, count: subjectList.length },
        {
          name: 'Chapter Management',
          icon: BookMarked,
          hasSub: true,
          subItems: [
            { name: 'Chapter Master' },
            { name: 'Chapter Topic Master' }
          ]
        }
      ]
    },
    {
      title: 'CONTENT & TESTS',
      items: [
        {
          name: 'Question Management',
          icon: HelpCircle,
          hasSub: true,
          subItems: [
            { name: 'Objective Question' },
            { name: 'Numerical Question' }
          ]
        },
        { name: 'Video Master', icon: Video, count: videoList.length },
        { name: 'Document Master', icon: FileText, count: docList.length },
        { name: 'Test Series Master', icon: FileCheck },
        { name: 'Live Session Management', icon: Video }
      ]
    },
    {
      title: 'STUDENTS & CRM',
      items: [
        {
          name: 'Student Doubt',
          icon: MessageSquare,
          badge: doubtList.filter(d => d.status === 'Pending').length ? `${doubtList.filter(d => d.status === 'Pending').length} Pending` : null,
          badgeColor: 'bg-amber-100 text-amber-800'
        },
        { name: 'Student Attempted Test', icon: FileCheck, count: attemptedTestList.length },
        { name: 'Student Invoices', icon: Receipt, count: invoiceList.length }
      ]
    },
    {
      title: 'MARKETING & SEO',
      items: [
        { name: 'Coupon', icon: Ticket, count: couponList.length },
        { name: 'Blog Master', icon: Edit3, count: blogList.length },
        { name: 'SEO Page', icon: Globe, count: seoList.length },
        {
          name: 'Notification',
          icon: Bell,
          hasSub: true,
          subItems: [
            { name: 'Site Notification' },
            { name: 'Student Notification' }
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* SHOPIFY-STYLE TOP GLOBAL NAVBAR */}
      <header className="bg-white border-b border-slate-200/80 h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 shadow-xs backdrop-blur-md bg-white/95">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center text-amber-400 font-black text-sm shadow-sm border border-slate-800">
              10Q
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">10Q Challenge</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-900 text-amber-400">ADMIN</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Enterprise Academic Control</p>
            </div>
          </Link>
        </div>

        {/* Global Instant Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courses, questions, chapters, doubts, invoices... (Press /)"
              value={globalAdminSearch}
              onChange={(e) => setGlobalAdminSearch(e.target.value)}
              className="w-full pl-9 pr-12 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-2xs"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-3xs">
              /
            </span>
          </div>
        </div>

        {/* Right Action Icons & Harshal Jain Profile */}
        <div className="flex items-center space-x-3">
          {/* Quick Create Dropdown */}
          <div className="relative">
            <button
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-amber-400 font-extrabold text-xs transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create</span>
              <ChevronDown className="w-3 h-3 text-amber-300" />
            </button>

            {quickCreateOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => { setActiveTab('Course Master'); setCourseModalOpen(true); setQuickCreateOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>New Course Batch</span>
                </button>
                <button
                  onClick={() => { setActiveTab('Objective Question'); setObjModalOpen(true); setQuickCreateOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Add MCQ Question</span>
                </button>
                <button
                  onClick={() => { setActiveTab('Video Master'); setVideoActiveTab('Basic Information'); setQuickCreateOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Video className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Upload Video Lecture</span>
                </button>
                <button
                  onClick={() => { setActiveTab('Blog Master'); setBlogActiveTab('Basic Information'); setQuickCreateOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Write Blog Article</span>
                </button>
              </div>
            )}
          </div>

          <Link
            to="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all border border-slate-200/60"
          >
            <span>Live Site</span>
            <span>↗</span>
          </Link>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Admin Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="p-1 sm:px-3 sm:py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center space-x-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                HJ
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-900 leading-none">Harshal Jain</p>
                <p className="text-[10px] text-emerald-600 font-bold leading-none mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Master Admin
                </p>
              </div>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                  <p className="text-xs font-extrabold text-slate-900">Harshal Jain</p>
                  <p className="text-[11px] text-amber-600 font-bold">Master Administrator</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">admin@10qchallenge.in</p>
                </div>
                <div className="py-1">
                  <Link to="/" className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium">
                    View Live Public Site
                  </Link>
                  <Link to="/student/dashboard" className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium">
                    Inspect Student LMS View
                  </Link>
                </div>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY WRAPPER: SHOPIFY-STYLE CATEGORIZED SIDEBAR + VIEWPORT */}
      <div className="flex flex-1 min-h-[calc(100vh-4rem)]">

        {/* LEFT SHOPIFY-STYLE SIDEBAR */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-16'
          } bg-white border-r border-slate-200/80 transition-all duration-200 flex flex-col justify-between flex-shrink-0 z-40 select-none`}
        >
          <div className="py-3 overflow-y-auto space-y-4">
            {menuGroups.map((group) => (
              <div key={group.title} className="px-3">
                {sidebarOpen ? (
                  <div className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {group.title}
                  </div>
                ) : (
                  <div className="py-1 text-center text-[9px] text-slate-300">•</div>
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name || (item.subItems && item.subItems.some(s => s.name === activeTab));
                    const isExpanded = expandedMenus[item.name];

                    return (
                      <div key={item.name} className="w-full">
                        <button
                          onClick={() => {
                            if (item.hasSub) {
                              toggleMenuExpand(item.name);
                            } else {
                              setActiveTab(item.name);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                            {sidebarOpen && <span className="truncate">{item.name}</span>}
                          </div>

                          {sidebarOpen && (
                            <div className="flex items-center space-x-1.5">
                              {item.badge && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                                  {item.badge}
                                </span>
                              )}
                              {item.count !== undefined && !item.badge && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isActive ? 'text-slate-300 bg-slate-800' : 'text-slate-400 bg-slate-100'}`}>
                                  {item.count}
                                </span>
                              )}
                              {item.hasSub && (
                                isExpanded ? (
                                  <ChevronDown className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                                ) : (
                                  <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                                )
                              )}
                            </div>
                          )}
                        </button>

                        {/* Submenu Accordion */}
                        {sidebarOpen && item.hasSub && isExpanded && item.subItems && (
                          <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-0.5 py-0.5">
                            {item.subItems.map((sub) => {
                              const isSubActive = activeTab === sub.name;
                              return (
                                <button
                                  key={sub.name}
                                  onClick={() => setActiveTab(sub.name)}
                                  className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                    isSubActive
                                      ? 'bg-amber-50 text-amber-900 font-extrabold border border-amber-200'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                  <span className="truncate">{sub.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer Status Banner */}
          {sidebarOpen && (
            <div className="p-3 m-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700">Database</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">10Q Challenge v3.4 Enterprise</p>
            </div>
          )}
        </aside>

        {/* MAIN VIEWPORT CONTENT */}
        <main className="flex-1 bg-[#F8FAFC] p-6 sm:p-8 overflow-y-auto min-w-0">

          {/* ========================================================= */}
          {/* SHOPIFY-LEVEL EXECUTIVE DASHBOARD OVERVIEW */}
          {/* ========================================================= */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in">
              {/* Header Welcome Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-amber-500/10 to-transparent blur-3xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-bold mb-2 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Academic Operations • All Systems Operational</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Welcome, Harshal Jain
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Here is your live revenue, student enrollment, doubt SLA, and academic catalog pulse.
                  </p>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                  <button
                    onClick={() => { setActiveTab('Course Master'); setCourseModalOpen(true); }}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Course</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('Student Doubt')}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/10 flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Review Doubts</span>
                  </button>
                </div>
              </div>

              {/* 4 Top KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-slate-500 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Gross Enrollment Revenue</span>
                    <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">₹0</div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold mt-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{invoiceList.length} total invoices</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-slate-500 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Courses</span>
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">{courseList.length}</div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold mt-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Published in catalog</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-slate-500 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">CBT Tests Attempted</span>
                    <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <FileCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">{attemptedTestList.length}</div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold mt-2">
                    <Award className="w-3.5 h-3.5" />
                    <span>{objectiveQuestionList.length + numericalQuestionList.length} questions in bank</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-slate-500 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Student Doubts</span>
                    <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">{doubtList.length}</div>
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{doubtList.filter(d => d.status === 'Pending').length} pending resolution</span>
                  </div>
                </div>
              </div>

              {/* 2-Column Split: Recent Live Orders & Urgent Doubts Queue */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Recent Orders Table */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Recent Student Orders &amp; Invoices</h3>
                      <p className="text-xs text-slate-500">Live transactions across BITSAT, JEE and Mentorship batches</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('Student Invoices')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      View All Orders →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold">
                          <th className="py-2.5">Invoice</th>
                          <th className="py-2.5">Student</th>
                          <th className="py-2.5">Amount</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {invoiceList.slice(0, 5).map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 font-mono font-bold text-indigo-700">{inv.invoiceNo}</td>
                            <td className="py-3 font-bold text-slate-900">{inv.studentName}</td>
                            <td className="py-3 font-bold text-slate-900">{inv.invoiceAmount}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                inv.invoiceStatus === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : inv.invoiceStatus === 'Pending'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {inv.invoiceStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RIGHT: Urgent Doubts Queue */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Student Doubts Queue</h3>
                      <p className="text-xs text-slate-500">Queries needing BITSian mentor resolution</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('Student Doubt')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Open Queue ({doubtList.filter(d => d.status === 'Pending').length}) →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {doubtList.slice(0, 3).map((doubt) => (
                      <div key={doubt.id} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900">{doubt.studentName}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            doubt.status === 'Answered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {doubt.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                          {doubt.doubtText}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <span>{doubt.module}</span>
                          <button
                            onClick={() => { setActiveTab('Student Doubt'); setSelectedDoubt(doubt); }}
                            className="font-bold text-indigo-600 hover:underline"
                          >
                            Reply Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Jump Academic Shortcuts */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-extrabold text-base text-slate-900">Academic Master Modules Hub</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { title: 'Course Master', desc: `${courseList.length} Batches`, tab: 'Course Master', icon: BookOpen, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                    { title: 'Question Bank', desc: 'MCQ & Numerical', tab: 'Objective Question', icon: HelpCircle, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                    { title: 'Video Lectures', desc: 'Vimeo Streams', tab: 'Video Master', icon: Video, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    { title: 'Document PDFs', desc: 'Notes & Formulae', tab: 'Document Master', icon: FileText, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { title: 'Discount Coupons', desc: 'Promo Codes', tab: 'Coupon', icon: Ticket, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                    { title: 'SEO Pages', desc: 'Meta Tags & URLs', tab: 'SEO Page', icon: Globe, color: 'bg-rose-50 text-rose-700 border-rose-200' },
                  ].map((shortcut) => {
                    const SIcon = shortcut.icon;
                    return (
                      <button
                        key={shortcut.title}
                        onClick={() => setActiveTab(shortcut.tab)}
                        className={`p-4 rounded-2xl border text-left transition-all hover:scale-102 hover:shadow-sm ${shortcut.color} flex flex-col justify-between`}
                      >
                        <SIcon className="w-5 h-5 mb-2" />
                        <div>
                          <div className="font-extrabold text-xs">{shortcut.title}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">{shortcut.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* EXAM MASTER VIEW */}
          {activeTab === 'Exam Master' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Exam Master</h1>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>/</span>
                  <span className="text-slate-700 font-semibold uppercase">EXAM MASTER</span>
                </div>
              </div>

              {/* EXAM FORM */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                    {examForm.id ? 'Edit Exam' : 'Exam'}
                  </h3>
                </div>

                <form onSubmit={handleSaveExam} className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Exam<span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Exam"
                      value={examForm.examName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExamForm({
                          ...examForm,
                          examName: val,
                          slug: examForm.id ? examForm.slug : val.toLowerCase().replace(/\s+/g, '-')
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Slug<span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Slug"
                      value={examForm.slug}
                      onChange={(e) => setExamForm({ ...examForm, slug: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Exam Description
                    </label>

                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 text-slate-600">
                        <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Source"><Code className="w-3.5 h-3.5" /></button>
                        <span className="w-px h-4 bg-slate-300 mx-0.5" />
                        <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                        <span className="w-px h-4 bg-slate-300 mx-0.5" />
                        <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                      </div>

                      <textarea
                        rows={6}
                        placeholder="Enter exam description details..."
                        value={examForm.description}
                        onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                        className="w-full p-3 text-xs focus:outline-none text-slate-800 resize-y"
                      />

                      <div className="h-2 bg-[#1e40af] w-full" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Meta Title"
                      value={examForm.metaTitle}
                      onChange={(e) => setExamForm({ ...examForm, metaTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Meta Description
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Meta Description"
                      value={examForm.metaDescription}
                      onChange={(e) => setExamForm({ ...examForm, metaDescription: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="examIsActive"
                      checked={examForm.isActive !== false}
                      onChange={(e) => setExamForm({ ...examForm, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="examIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Active (Available for Course Master assignments)
                    </label>
                  </div>

                  <div className="pt-2 flex items-center space-x-3">
                    <button
                      type="submit"
                      disabled={examLoading}
                      className="px-5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs rounded-md shadow-sm transition-colors disabled:opacity-50"
                    >
                      {examLoading ? 'Saving...' : examForm.id ? 'Update Exam' : 'Save Exam'}
                    </button>
                    {examForm.id && (
                      <button
                        type="button"
                        onClick={() => setExamForm({ id: null, examName: '', slug: '', description: '', metaTitle: '', metaDescription: '', isActive: true })}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* EXAM TABLE */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 w-full sm:w-80">
                    <span className="text-xs font-medium text-slate-600">Search:</span>
                    <input
                      type="text"
                      placeholder="Search by exam name or slug..."
                      value={examSearchTerm}
                      onChange={(e) => setExamSearchTerm(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    Total Exams: <span className="font-bold text-slate-800">{examList.length}</span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3 border-r border-slate-200">Exam Name</th>
                        <th className="p-3 border-r border-slate-200">Slug</th>
                        <th className="p-3 border-r border-slate-200 text-center">Associated Courses</th>
                        <th className="p-3 border-r border-slate-200 text-center">Status</th>
                        <th className="p-3 border-r border-slate-200 text-center">Last Updated</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {examList
                        .filter(ex => 
                          (ex.examName || '').toLowerCase().includes(examSearchTerm.toLowerCase()) ||
                          (ex.slug || '').toLowerCase().includes(examSearchTerm.toLowerCase())
                        )
                        .map((ex) => {
                          const courseCount = ex.associatedCoursesCount || 0;
                          return (
                            <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 border-r border-slate-200 font-bold text-slate-800">
                                <span>{ex.examName}</span>
                              </td>
                              <td className="p-3 border-r border-slate-200 font-mono text-[11px] text-slate-600">
                                {ex.slug}
                              </td>
                              <td className="p-3 border-r border-slate-200 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  courseCount > 0 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {courseCount} {courseCount === 1 ? 'course' : 'courses'}
                                </span>
                              </td>
                              <td className="p-3 border-r border-slate-200 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleExamStatus(ex)}
                                  title={ex.isActive !== false ? 'Click to deactivate exam' : 'Click to activate exam'}
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                    ex.isActive !== false
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${ex.isActive !== false ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {ex.isActive !== false ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="p-3 border-r border-slate-200 text-center text-slate-500 text-[11px]">
                                {ex.updatedAt ? new Date(ex.updatedAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="p-3 text-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditExam(ex)}
                                  title="Edit Exam"
                                  className="p-1.5 border border-slate-300 hover:border-slate-500 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExam(ex)}
                                  title={courseCount > 0 ? `Cannot delete: ${courseCount} course(s) depend on this exam` : 'Delete Exam'}
                                  className={`p-1.5 border rounded-md transition-colors ${
                                    courseCount > 0
                                      ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                      : 'border-rose-200 hover:border-rose-400 text-rose-600 hover:bg-rose-50'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* SUBJECT MASTER VIEW (Database Connected & Relational) */}
          {activeTab === 'Subject Master' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subject Master</h1>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>/</span>
                    <span className="text-slate-700 font-semibold">Subject Master</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold">
                    {subjectList.length} Total Master Subjects
                  </span>
                </div>
              </div>

              {/* SUBJECT FORM */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                    {subjectForm.id ? `EDIT SUBJECT: ${subjectForm.subjectName}` : 'ADD NEW SUBJECT'}
                  </h3>
                  {subjectForm.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setSubjectForm({
                          id: null,
                          subjectCode: '',
                          subjectName: '',
                          description: '',
                          displayIndex: '1',
                          isActive: true,
                        })
                      }
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveSubject} className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subject Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 101, PHY, MATH"
                        value={subjectForm.subjectCode}
                        onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subject Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Physics, Mathematics, LR & English"
                        value={subjectForm.subjectName}
                        onChange={(e) => setSubjectForm({ ...subjectForm, subjectName: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold focus:outline-none focus:border-blue-500 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Description (Optional)</label>
                      <input
                        type="text"
                        placeholder="Brief overview of the subject curriculum"
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Display Order</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1, 2, 3..."
                        value={subjectForm.displayIndex}
                        onChange={(e) => setSubjectForm({ ...subjectForm, displayIndex: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="subActiveCheck"
                      checked={subjectForm.isActive}
                      onChange={(e) => setSubjectForm({ ...subjectForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="subActiveCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      Active (Available for Course Assignments)
                    </label>
                  </div>

                  <div className="pt-2 flex items-center space-x-3">
                    <button
                      type="submit"
                      disabled={isSavingSubject}
                      className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white font-bold text-xs rounded-md shadow-sm transition-colors cursor-pointer"
                    >
                      {isSavingSubject ? 'Saving...' : subjectForm.id ? 'Update Subject' : 'Save Subject'}
                    </button>
                    {subjectForm.id && (
                      <button
                        type="button"
                        onClick={() =>
                          setSubjectForm({
                            id: null,
                            subjectCode: '',
                            subjectName: '',
                            description: '',
                            displayIndex: '1',
                            isActive: true,
                          })
                        }
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* SUBJECT TABLE */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Search by code, name, description..."
                      value={subjectSearchTerm}
                      onChange={(e) => setSubjectSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-500 font-medium mr-1">Status:</span>
                    {['All', 'Active', 'Inactive'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setSubjectStatusFilter(st)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          subjectStatusFilter === st
                            ? 'bg-[#1d4ed8] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3 border-r border-slate-200 w-24">SUBJECT CODE</th>
                        <th className="p-3 border-r border-slate-200">SUBJECT NAME</th>
                        <th className="p-3 border-r border-slate-200 w-44">ASSIGNED COURSES</th>
                        <th className="p-3 border-r border-slate-200 w-28 text-center">STATUS</th>
                        <th className="p-3 border-r border-slate-200 w-32">CREATED DATE</th>
                        <th className="p-3 text-center w-28">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {subjectList
                        .filter((s) => {
                          const matchesSearch =
                            s.subjectCode.toLowerCase().includes(subjectSearchTerm.toLowerCase()) ||
                            s.subjectName.toLowerCase().includes(subjectSearchTerm.toLowerCase()) ||
                            (s.description && s.description.toLowerCase().includes(subjectSearchTerm.toLowerCase()));

                          const matchesStatus =
                            subjectStatusFilter === 'All'
                              ? true
                              : subjectStatusFilter === 'Active'
                              ? s.isActive !== false
                              : s.isActive === false;

                          return matchesSearch && matchesStatus;
                        })
                        .map((s) => {
                          const courseCount = Number(s.associatedCoursesCount) || 0;
                          return (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 border-r border-slate-200 font-mono font-bold text-blue-700">
                                {s.subjectCode}
                              </td>
                              <td className="p-3 border-r border-slate-200">
                                <div className="font-bold text-slate-900">{s.subjectName}</div>
                                {s.description && (
                                  <div className="text-[11px] text-slate-400 line-clamp-1">{s.description}</div>
                                )}
                              </td>
                              <td className="p-3 border-r border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setViewingAssignedSubject(s)}
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    courseCount > 0
                                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                                  }`}
                                >
                                  <span>{courseCount} {courseCount === 1 ? 'Course' : 'Courses'}</span>
                                  {courseCount > 0 && <span className="text-[10px]">👁</span>}
                                </button>
                              </td>
                              <td className="p-3 border-r border-slate-200 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSubjectStatus(s)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                    s.isActive !== false
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  {s.isActive !== false ? 'Active' : 'Inactive'}
                                </button>
                              </td>
                              <td className="p-3 border-r border-slate-200 text-slate-500 text-[11px]">
                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </td>
                              <td className="p-3 text-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditSubject(s)}
                                  title="Edit Subject"
                                  className="p-1.5 border border-slate-300 hover:border-slate-500 rounded-md text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubject(s)}
                                  title={courseCount > 0 ? `Cannot delete: assigned to ${courseCount} course(s)` : 'Delete Subject'}
                                  className={`p-1.5 border rounded-md transition-colors cursor-pointer ${
                                    courseCount > 0
                                      ? 'border-slate-200 text-slate-300 hover:bg-slate-50'
                                      : 'border-rose-200 hover:border-rose-400 text-rose-600 hover:bg-rose-50'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                  <div>Showing {subjectList.length} total subjects in master catalogue</div>
                </div>
              </div>

              {/* POPUP: VIEW ASSIGNED COURSES */}
              {viewingAssignedSubject && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900">
                          Courses Using {viewingAssignedSubject.subjectName}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          Code: {viewingAssignedSubject.subjectCode} • ID: {viewingAssignedSubject.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingAssignedSubject(null)}
                        className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(viewingAssignedSubject.associatedCourses || []).length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                          No courses currently reference this subject.
                        </div>
                      ) : (
                        (viewingAssignedSubject.associatedCourses || []).map((c) => (
                          <div
                            key={c.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-bold text-xs text-slate-800">{c.title}</div>
                              {c.exam && (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                                  {c.exam}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">Course ID #{c.id}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setViewingAssignedSubject(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHAPTER MASTER TABBED VIEW */}
          {activeTab === 'Chapter Master' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Header Title & Breadcrumb */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Chapter Master</h1>
                  <nav className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                    <button onClick={() => setActiveTab('Dashboard')} className="hover:text-slate-900 flex items-center gap-1 cursor-pointer">
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <span>/</span>
                    <span className="text-slate-800 font-bold">
                      {chapterActiveTab === 'Basic Information' ? (chapterForm.id ? 'Edit Chapter' : 'Add New Chapter') : 'Chapter Catalogue'}
                    </span>
                  </nav>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChapterForm(defaultChapterForm);
                      setChapterActiveTab('Basic Information');
                    }}
                    className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Chapter</span>
                  </button>
                </div>
              </div>

              {/* CARD WITH TABBED NAVIGATION */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* TABS NAVIGATION BAR */}
                <div className="flex border-b border-slate-200 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setChapterActiveTab('Basic Information')}
                    className={`flex items-center space-x-2 px-6 py-3.5 text-xs font-extrabold transition-all cursor-pointer ${
                      chapterActiveTab === 'Basic Information'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>{chapterForm.id ? 'Edit Chapter Details' : 'Basic Information & Setup'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChapterActiveTab('Table')}
                    className={`flex items-center space-x-2 px-6 py-3.5 text-xs font-extrabold transition-all cursor-pointer ${
                      chapterActiveTab === 'Table'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span>Chapters Catalogue ({chapterList.length})</span>
                  </button>
                </div>

                {/* TAB 1: FORM */}
                {chapterActiveTab === 'Basic Information' && (
                  <form onSubmit={handleSaveChapter} className="p-6 sm:p-8 space-y-6">
                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-5">
                      <div className="border-b border-slate-200 pb-3">
                        <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                          {chapterForm.id ? `EDIT CHAPTER (#${chapterForm.id})` : 'NEW CHAPTER INFORMATION'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Organize academic chapters strictly under Course → Subject hierarchy.
                        </p>
                      </div>

                      {/* ROW 1: COURSE & SUBJECT CASCADING SELECTORS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* SELECT COURSE */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            SELECT COURSE <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={chapterForm.courseId}
                            onChange={(e) => handleChapterCourseChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs cursor-pointer"
                          >
                            <option value="">-- Choose Course --</option>
                            {courseList.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.title} ({course.exam || 'General'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* SELECT SUBJECT (CASCADING FILTERED) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            SELECT SUBJECT <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            disabled={!chapterForm.courseId}
                            value={chapterForm.subjectId}
                            onChange={(e) => setChapterForm({ ...chapterForm, subjectId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                          >
                            <option value="">
                              {!chapterForm.courseId ? '-- Select a Course First --' : '-- Choose Subject --'}
                            </option>
                            {getAssignedSubjectsForCourse(chapterForm.courseId).map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.subjectName} (Code: {sub.subjectCode || sub.id})
                              </option>
                            ))}
                          </select>
                          {chapterForm.courseId && getAssignedSubjectsForCourse(chapterForm.courseId).length === 0 && (
                            <p className="text-[11px] text-amber-600 mt-1 font-medium">
                              No subjects assigned to this course. Please assign subjects in Course Master.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ROW 2: CHAPTER NAME & CHAPTER CODE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* CHAPTER NAME */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            CHAPTER NAME <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rotational Motion & Dynamics"
                            value={chapterForm.chapterName}
                            onChange={(e) => setChapterForm({ ...chapterForm, chapterName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        {/* CHAPTER CODE */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            CHAPTER CODE (OPTIONAL)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. PHY-02 or BIT-PHY-01"
                            value={chapterForm.chapterCode}
                            onChange={(e) => setChapterForm({ ...chapterForm, chapterCode: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* ROW 3: DESCRIPTION */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          BRIEF DESCRIPTION &amp; SYLLABUS OVERVIEW
                        </label>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 text-slate-600 text-xs">
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Source"><Code className="w-3.5 h-3.5" /></button>
                            <span className="w-px h-4 bg-slate-300 mx-0.5" />
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                            <span className="w-px h-4 bg-slate-300 mx-0.5" />
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                          </div>
                          <textarea
                            rows={4}
                            placeholder="Enter detailed syllabus subtopics, learning outcomes, or chapter notes..."
                            value={chapterForm.description}
                            onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                            className="w-full p-4 text-xs font-normal focus:outline-none text-slate-800 resize-y leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* ROW 4: ORDER & ACTIVE STATUS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            DISPLAY ORDER NUMBER
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={chapterForm.displayOrder}
                            onChange={(e) => setChapterForm({ ...chapterForm, displayOrder: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div className="flex items-center pt-6">
                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={chapterForm.isActive}
                              onChange={(e) => setChapterForm({ ...chapterForm, isActive: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-bold text-slate-800">
                              Active / Published (Visible in Course Curriculum)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* SUBMIT BUTTONS */}
                      <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setChapterForm(defaultChapterForm);
                            setChapterActiveTab('Table');
                          }}
                          className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={chapterSaving}
                          className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {chapterSaving ? 'Saving...' : (chapterForm.id ? 'Update Chapter' : 'Save Chapter')}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* TAB 2: CHAPTER CATALOGUE TABLE */}
                {chapterActiveTab === 'Table' && (
                  <div className="p-6 sm:p-8 space-y-5">
                    {/* FILTER & SEARCH CONTROL BAR */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search chapters or codes..."
                          value={chapterSearchTerm}
                          onChange={(e) => setChapterSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs"
                        />
                      </div>

                      {/* Course Filter */}
                      <div>
                        <select
                          value={chapterCourseFilter}
                          onChange={(e) => {
                            setChapterCourseFilter(e.target.value);
                            setChapterSubjectFilter(''); // Reset subject filter when course filter changes
                          }}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="">All Courses ({courseList.length})</option>
                          {courseList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Subject Filter */}
                      <div>
                        <select
                          value={chapterSubjectFilter}
                          onChange={(e) => setChapterSubjectFilter(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="">All Subjects</option>
                          {(chapterCourseFilter ? getAssignedSubjectsForCourse(chapterCourseFilter) : subjects).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.subjectName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <select
                          value={chapterStatusFilter}
                          onChange={(e) => setChapterStatusFilter(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="ALL">All Status</option>
                          <option value="ACTIVE">Active Only</option>
                          <option value="INACTIVE">Inactive Only</option>
                        </select>
                      </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs bg-white">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider">
                          <tr>
                            <th className="p-3.5">CHAPTER NAME</th>
                            <th className="p-3.5">COURSE</th>
                            <th className="p-3.5">SUBJECT</th>
                            <th className="p-3.5 text-center">ORDER</th>
                            <th className="p-3.5 text-center">STATUS</th>
                            <th className="p-3.5 text-center">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {chapterList
                            .filter((c) => {
                              // Course filter
                              if (chapterCourseFilter && String(c.courseId) !== String(chapterCourseFilter)) return false;
                              // Subject filter
                              if (chapterSubjectFilter && String(c.subjectId) !== String(chapterSubjectFilter)) return false;
                              // Status filter
                              if (chapterStatusFilter === 'ACTIVE' && c.isActive === false) return false;
                              if (chapterStatusFilter === 'INACTIVE' && c.isActive !== false) return false;
                              // Search filter
                              if (chapterSearchTerm.trim()) {
                                const q = chapterSearchTerm.toLowerCase();
                                const nameMatch = (c.chapterName || '').toLowerCase().includes(q);
                                const codeMatch = (c.chapterCode || '').toLowerCase().includes(q);
                                const courseMatch = (c.courseTitle || '').toLowerCase().includes(q);
                                const subMatch = (c.subjectName || '').toLowerCase().includes(q);
                                return nameMatch || codeMatch || courseMatch || subMatch;
                              }
                              return true;
                            })
                            .map((chapter) => (
                              <tr key={chapter.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3.5">
                                  <div className="font-extrabold text-slate-900 text-xs">
                                    {chapter.chapterName}
                                  </div>
                                  {chapter.chapterCode && (
                                    <div className="text-[10px] text-slate-400 font-semibold tracking-wide">
                                      Code: {chapter.chapterCode}
                                    </div>
                                  )}
                                </td>

                                <td className="p-3.5 text-slate-800">
                                  <span className="font-bold text-slate-900">{chapter.courseTitle}</span>
                                  {chapter.courseExam && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-600 uppercase">
                                      {chapter.courseExam}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                    {chapter.subjectName}
                                  </span>
                                </td>

                                <td className="p-3.5 text-center font-bold text-slate-700">
                                  {chapter.displayOrder || 1}
                                </td>

                                <td className="p-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleChapterStatus(chapter)}
                                    title="Click to toggle status"
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                                      chapter.isActive !== false
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                    }`}
                                  >
                                    {chapter.isActive !== false ? 'Active' : 'Inactive'}
                                  </button>
                                </td>

                                <td className="p-3.5 text-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditChapter(chapter)}
                                    className="p-1.5 border border-blue-200 hover:border-blue-400 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
                                    title="Edit Chapter"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChapter(chapter.id, chapter.chapterName)}
                                    className="p-1.5 border border-rose-200 hover:border-rose-400 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
                                    title="Delete Chapter"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>

                      {chapterList.length === 0 && !chapterLoading && (
                        <div className="p-8 text-center text-xs text-slate-400">
                          No chapters found. Click &quot;Add New Chapter&quot; above to create one.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHAPTER TOPIC MASTER TABBED VIEW */}
          {activeTab === 'Chapter Topic Master' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Header Title & Breadcrumb */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Chapter Topic Master</h1>
                  <nav className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                    <button onClick={() => setActiveTab('Dashboard')} className="hover:text-slate-900 flex items-center gap-1 cursor-pointer">
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <span>/</span>
                    <span className="text-slate-800 font-bold">
                      {topicActiveTab === 'Basic Information' ? (topicForm.id ? 'Edit Topic' : 'Add New Topic') : 'Topics Catalogue'}
                    </span>
                  </nav>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTopicForm(defaultTopicForm);
                      setTopicActiveTab('Basic Information');
                    }}
                    className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Topic</span>
                  </button>
                </div>
              </div>

              {/* CARD WITH TABBED NAVIGATION */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* TABS NAVIGATION BAR */}
                <div className="flex border-b border-slate-200 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setTopicActiveTab('Basic Information')}
                    className={`flex items-center space-x-2 px-6 py-3.5 text-xs font-extrabold transition-all cursor-pointer ${
                      topicActiveTab === 'Basic Information'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>{topicForm.id ? 'Edit Topic Details' : 'Basic Information & Setup'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTopicActiveTab('Table')}
                    className={`flex items-center space-x-2 px-6 py-3.5 text-xs font-extrabold transition-all cursor-pointer ${
                      topicActiveTab === 'Table'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span>Topics Catalogue ({topicList.length})</span>
                  </button>
                </div>

                {/* TAB 1: BASIC INFORMATION FORM */}
                {topicActiveTab === 'Basic Information' && (
                  <form onSubmit={handleSaveTopic} className="p-6 sm:p-8 space-y-6">
                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-5">
                      <div className="border-b border-slate-200 pb-3">
                        <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                          {topicForm.id ? `EDIT TOPIC (#${topicForm.id})` : 'NEW TOPIC INFORMATION'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Academic hierarchy: Course → Subject → Chapter → Topic
                        </p>
                      </div>

                      {/* ROW 1: CASCADING 3-TIER SELECTORS: COURSE, SUBJECT, CHAPTER */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* SELECT COURSE */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            SELECT COURSE <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={topicForm.courseId}
                            onChange={(e) => handleTopicCourseChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs cursor-pointer"
                          >
                            <option value="">-- Choose Course --</option>
                            {courseList.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.title} ({course.exam || 'General'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* SELECT SUBJECT */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            SELECT SUBJECT <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            disabled={!topicForm.courseId}
                            value={topicForm.subjectId}
                            onChange={(e) => handleTopicSubjectChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                          >
                            <option value="">
                              {!topicForm.courseId ? '-- Select Course First --' : '-- Choose Subject --'}
                            </option>
                            {getAssignedSubjectsForCourse(topicForm.courseId).map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.subjectName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* SELECT CHAPTER */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            SELECT CHAPTER <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            disabled={!topicForm.subjectId}
                            value={topicForm.chapterId}
                            onChange={(e) => setTopicForm({ ...topicForm, chapterId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                          >
                            <option value="">
                              {!topicForm.subjectId ? '-- Select Subject First --' : '-- Choose Chapter --'}
                            </option>
                            {chapterList
                              .filter(
                                (ch) =>
                                  String(ch.courseId) === String(topicForm.courseId) &&
                                  String(ch.subjectId) === String(topicForm.subjectId)
                              )
                              .map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  {ch.chapterName} {ch.chapterCode ? `(${ch.chapterCode})` : ''}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* ROW 2: TOPIC NAME & CODE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* TOPIC NAME */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            TOPIC NAME <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Newton's Second Law & Momentum"
                            value={topicForm.topicName}
                            onChange={(e) => setTopicForm({ ...topicForm, topicName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        {/* TOPIC CODE */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            TOPIC CODE (OPTIONAL)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. TOP-PHY-03"
                            value={topicForm.topicCode}
                            onChange={(e) => setTopicForm({ ...topicForm, topicCode: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* ROW 3: DESCRIPTION */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          BRIEF DESCRIPTION &amp; LEARNING OBJECTIVES
                        </label>
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 text-slate-600 text-xs">
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Source"><Code className="w-3.5 h-3.5" /></button>
                            <span className="w-px h-4 bg-slate-300 mx-0.5" />
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                            <span className="w-px h-4 bg-slate-300 mx-0.5" />
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                          </div>
                          <textarea
                            rows={4}
                            placeholder="Enter detailed key concepts, formulas, and topic summary..."
                            value={topicForm.description}
                            onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                            className="w-full p-4 text-xs font-normal focus:outline-none text-slate-800 resize-y leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* ROW 4: ORDER & ACTIVE STATUS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            DISPLAY ORDER NUMBER
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={topicForm.displayOrder}
                            onChange={(e) => setTopicForm({ ...topicForm, displayOrder: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div className="flex items-center pt-6">
                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={topicForm.isActive}
                              onChange={(e) => setTopicForm({ ...topicForm, isActive: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-bold text-slate-800">
                              Active / Published (Available for Video &amp; DPP Assignments)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* SUBMIT BUTTONS */}
                      <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setTopicForm(defaultTopicForm);
                            setTopicActiveTab('Table');
                          }}
                          className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={topicSaving}
                          className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {topicSaving ? 'Saving...' : (topicForm.id ? 'Update Topic' : 'Save Topic')}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* TAB 2: TOPICS CATALOGUE TABLE */}
                {topicActiveTab === 'Table' && (
                  <div className="p-6 sm:p-8 space-y-5">
                    {/* FILTERS & SEARCH */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search topics or codes..."
                          value={topicSearchTerm}
                          onChange={(e) => setTopicSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs"
                        />
                      </div>

                      {/* Course Filter */}
                      <div>
                        <select
                          value={topicCourseFilter}
                          onChange={(e) => {
                            setTopicCourseFilter(e.target.value);
                            setTopicSubjectFilter('');
                            setTopicChapterFilter('');
                          }}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="">All Courses ({courseList.length})</option>
                          {courseList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Subject Filter */}
                      <div>
                        <select
                          value={topicSubjectFilter}
                          onChange={(e) => {
                            setTopicSubjectFilter(e.target.value);
                            setTopicChapterFilter('');
                          }}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="">All Subjects</option>
                          {(topicCourseFilter ? getAssignedSubjectsForCourse(topicCourseFilter) : subjects).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.subjectName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Chapter Filter */}
                      <div>
                        <select
                          value={topicChapterFilter}
                          onChange={(e) => setTopicChapterFilter(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="">All Chapters</option>
                          {chapterList
                            .filter((ch) => {
                              if (topicCourseFilter && String(ch.courseId) !== String(topicCourseFilter)) return false;
                              if (topicSubjectFilter && String(ch.subjectId) !== String(topicSubjectFilter)) return false;
                              return true;
                            })
                            .map((ch) => (
                              <option key={ch.id} value={ch.id}>
                                {ch.chapterName}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <select
                          value={topicStatusFilter}
                          onChange={(e) => setTopicStatusFilter(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs cursor-pointer"
                        >
                          <option value="ALL">All Status</option>
                          <option value="ACTIVE">Active Only</option>
                          <option value="INACTIVE">Inactive Only</option>
                        </select>
                      </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs bg-white">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider">
                          <tr>
                            <th className="p-3.5">TOPIC NAME</th>
                            <th className="p-3.5">COURSE</th>
                            <th className="p-3.5">SUBJECT</th>
                            <th className="p-3.5">CHAPTER</th>
                            <th className="p-3.5 text-center">ORDER</th>
                            <th className="p-3.5 text-center">STATUS</th>
                            <th className="p-3.5 text-center">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {topicList
                            .filter((t) => {
                              if (topicCourseFilter && String(t.courseId) !== String(topicCourseFilter)) return false;
                              if (topicSubjectFilter && String(t.subjectId) !== String(topicSubjectFilter)) return false;
                              if (topicChapterFilter && String(t.chapterId) !== String(topicChapterFilter)) return false;
                              if (topicStatusFilter === 'ACTIVE' && t.isActive === false) return false;
                              if (topicStatusFilter === 'INACTIVE' && t.isActive !== false) return false;
                              if (topicSearchTerm.trim()) {
                                const q = topicSearchTerm.toLowerCase();
                                const nameMatch = (t.topicName || '').toLowerCase().includes(q);
                                const codeMatch = (t.topicCode || '').toLowerCase().includes(q);
                                const courseMatch = (t.courseTitle || '').toLowerCase().includes(q);
                                const subMatch = (t.subjectName || '').toLowerCase().includes(q);
                                const chMatch = (t.chapterName || '').toLowerCase().includes(q);
                                return nameMatch || codeMatch || courseMatch || subMatch || chMatch;
                              }
                              return true;
                            })
                            .map((topic) => (
                              <tr key={topic.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3.5">
                                  <div className="font-extrabold text-slate-900 text-xs">
                                    {topic.topicName}
                                  </div>
                                  {topic.topicCode && (
                                    <div className="text-[10px] text-slate-400 font-semibold tracking-wide">
                                      Code: {topic.topicCode}
                                    </div>
                                  )}
                                </td>

                                <td className="p-3.5 text-slate-800">
                                  <span className="font-bold text-slate-900">{topic.courseTitle}</span>
                                  {topic.courseExam && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-600 uppercase">
                                      {topic.courseExam}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                    {topic.subjectName}
                                  </span>
                                </td>

                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                    {topic.chapterName}
                                  </span>
                                </td>

                                <td className="p-3.5 text-center font-bold text-slate-700">
                                  {topic.displayOrder || 1}
                                </td>

                                <td className="p-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTopicStatus(topic)}
                                    title="Click to toggle status"
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                                      topic.isActive !== false
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                    }`}
                                  >
                                    {topic.isActive !== false ? 'Active' : 'Inactive'}
                                  </button>
                                </td>

                                <td className="p-3.5 text-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditTopic(topic)}
                                    className="p-1.5 border border-blue-200 hover:border-blue-400 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
                                    title="Edit Topic"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTopic(topic.id, topic.topicName)}
                                    className="p-1.5 border border-rose-200 hover:border-rose-400 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
                                    title="Delete Topic"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>

                      {topicList.length === 0 && !topicLoading && (
                        <div className="p-8 text-center text-xs text-slate-400">
                          No topics found. Click &quot;Add New Topic&quot; above to create one.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBMENU PAGE 3: OBJECTIVE QUESTION (QUESTION BANK) */}
          {activeTab === 'Objective Question' && (
            <div className="space-y-6">
              {/* Header Title, Breadcrumb & Top-Right Add Question Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Objective Question List</h1>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>/</span>
                    <span className="text-slate-700 font-semibold">Questions</span>
                    <span>/</span>
                    <span className="text-slate-500">Objective Question Master</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setObjQuestionForm({
                      id: null,
                      subjectId: objSubjectFilter || (subjectList[0]?.id ? String(subjectList[0].id) : ''),
                      chapterId: '',
                      questionContent: '',
                      optionA: '',
                      optionB: '',
                      optionC: '',
                      optionD: '',
                      correctOption: 'A',
                      explanation: '',
                      difficulty: 'Medium',
                      orderNumber: '1',
                      isActive: true
                    });
                    setObjEditorTab('Question');
                    setObjModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs rounded shadow-sm transition-colors self-start sm:self-auto flex items-center space-x-1.5"
                >
                  <span>+ Add Question</span>
                </button>
              </div>

              {/* CARD CONTAINER WITH FILTERS */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                {/* FILTER GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* SUBJECT FILTER */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={objSubjectFilter}
                      onChange={(e) => {
                        setObjSubjectFilter(e.target.value);
                        setObjChapterFilter('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    >
                      <option value="">All Subjects</option>
                      {subjectList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CHAPTER CASCADING FILTER */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chapter
                    </label>
                    <select
                      value={objChapterFilter}
                      onChange={(e) => setObjChapterFilter(e.target.value)}
                      disabled={!objSubjectFilter}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">All Chapters</option>
                      {getChaptersForSubject(objSubjectFilter).map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DIFFICULTY FILTER */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={objDifficultyFilter}
                      onChange={(e) => setObjDifficultyFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    >
                      <option value="">All Difficulties</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* FULL WIDTH SEARCH INPUT WITH ATTACHED BLUE SEARCH BUTTON */}
                <div className="relative w-full flex items-center">
                  <input
                    type="text"
                    placeholder="Search by question text or ID..."
                    value={objSearchTerm}
                    onChange={(e) => setObjSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-l text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-r flex items-center justify-center"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* TABLE OF OBJECTIVE QUESTIONS */}
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3 border-r border-slate-200 w-1/2">QUESTIONS</th>
                        <th className="p-3 border-r border-slate-200 w-1/6">SUBJECT</th>
                        <th className="p-3 border-r border-slate-200 w-1/6">CHAPTER</th>
                        <th className="p-3 border-r border-slate-200 text-center w-24">DIFFICULTY</th>
                        <th className="p-3 text-center w-24">
                          <div className="inline-flex items-center space-x-1">
                            <span>ACTION</span>
                            <span className="text-[10px] text-slate-400">⇅</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {objectiveQuestionList
                        .filter((q) => {
                          if (objSubjectFilter && String(q.subjectId) !== String(objSubjectFilter)) return false;
                          if (objChapterFilter && String(q.chapterId) !== String(objChapterFilter)) return false;
                          if (objDifficultyFilter && q.difficulty !== objDifficultyFilter) return false;
                          if (objSearchTerm) {
                            const term = objSearchTerm.toLowerCase();
                            const matchPrompt = (q.questionContent || q.question || '').toLowerCase().includes(term);
                            const matchId = String(q.id).toLowerCase().includes(term);
                            if (!matchPrompt && !matchId) return false;
                          }
                          return true;
                        })
                        .map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 border-r border-slate-200 text-slate-800">
                              <div className="flex items-start space-x-2">
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono shrink-0">
                                  #{q.id}
                                </span>
                                <span className="line-clamp-2">
                                  {q.questionContent || q.question}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                              {getSubjectName(q.subjectId)}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                              {getChapterName(q.chapterId)}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  q.difficulty === 'High' || q.difficulty === 'Hard'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : q.difficulty === 'Low' || q.difficulty === 'Easy'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {q.difficulty || 'Medium'}
                              </span>
                            </td>
                            <td className="p-3 text-center space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => handleEditObjQuestion(q)}
                                className="p-1.5 border border-slate-300 hover:border-slate-500 rounded-full text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
                                title="Edit Question"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteObjQuestion(q.id)}
                                className="p-1.5 border border-rose-200 hover:border-rose-400 rounded-full text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center"
                                title="Delete Question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {objectiveQuestionList.filter((q) => {
                    if (objSubjectFilter && String(q.subjectId) !== String(objSubjectFilter)) return false;
                    if (objChapterFilter && String(q.chapterId) !== String(objChapterFilter)) return false;
                    if (objDifficultyFilter && q.difficulty !== objDifficultyFilter) return false;
                    if (objSearchTerm) {
                      const term = objSearchTerm.toLowerCase();
                      const matchPrompt = (q.questionContent || q.question || '').toLowerCase().includes(term);
                      const matchId = String(q.id).toLowerCase().includes(term);
                      if (!matchPrompt && !matchId) return false;
                    }
                    return true;
                  }).length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No objective questions found matching your filter criteria. Click &quot;Add Question&quot; above to create one.
                    </div>
                  )}
                </div>

                {/* TABLE FOOTER / PAGINATION */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                  <div>
                    Showing 1 to{' '}
                    {
                      objectiveQuestionList.filter((q) => {
                        if (objSubjectFilter && String(q.subjectId) !== String(objSubjectFilter)) return false;
                        if (objChapterFilter && String(q.chapterId) !== String(objChapterFilter)) return false;
                        if (objDifficultyFilter && q.difficulty !== objDifficultyFilter) return false;
                        if (objSearchTerm) {
                          const term = objSearchTerm.toLowerCase();
                          const matchPrompt = (q.questionContent || q.question || '').toLowerCase().includes(term);
                          const matchId = String(q.id).toLowerCase().includes(term);
                          if (!matchPrompt && !matchId) return false;
                        }
                        return true;
                      }).length
                    }{' '}
                    of {objectiveQuestionList.length} entries
                  </div>

                  <div className="flex items-center space-x-1">
                    <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px] disabled:opacity-50">
                      Previous
                    </button>
                    <button className="px-2.5 py-1 bg-[#1d4ed8] text-white font-bold rounded text-[11px]">
                      1
                    </button>
                    <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px]">
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* MODAL FOR ADD / EDIT OBJECTIVE QUESTION (WITH 6 TABBED SECTIONS) */}
              {objModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                    {/* MODAL HEADER */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {objQuestionForm.id ? `Edit Objective Question #${objQuestionForm.id}` : 'Add Objective Question'}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Reusable Master Question Bank • Subject → Chapter → Objective MCQ
                        </p>
                      </div>
                      <button
                        onClick={() => setObjModalOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* TAB NAVIGATION BAR (6 TABS) */}
                    <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-2 space-x-1 overflow-x-auto shrink-0">
                      {[
                        { id: 'Question', label: 'Question' },
                        { id: 'Answer 1', label: 'Answer 1', isCorrect: objQuestionForm.correctOption === 'A' },
                        { id: 'Answer 2', label: 'Answer 2', isCorrect: objQuestionForm.correctOption === 'B' },
                        { id: 'Answer 3', label: 'Answer 3', isCorrect: objQuestionForm.correctOption === 'C' },
                        { id: 'Answer 4', label: 'Answer 4', isCorrect: objQuestionForm.correctOption === 'D' },
                        { id: 'Answer Explanation', label: 'Answer Explanation' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setObjEditorTab(tab.id)}
                          className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-l border-r flex items-center space-x-1.5 whitespace-nowrap ${
                            objEditorTab === tab.id
                              ? 'bg-white text-blue-600 border-slate-200 border-b-white -mb-px shadow-sm'
                              : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.isCorrect && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Correct Option" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* MODAL BODY */}
                    <form onSubmit={handleSaveObjQuestion} className="flex flex-col flex-1 overflow-hidden">
                      <div className="p-6 overflow-y-auto flex-1 space-y-4">
                        {/* TAB 1: QUESTION */}
                        {objEditorTab === 'Question' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Subject <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  required
                                  value={objQuestionForm.subjectId}
                                  onChange={(e) => {
                                    setObjQuestionForm({
                                      ...objQuestionForm,
                                      subjectId: e.target.value,
                                      chapterId: ''
                                    });
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                >
                                  <option value="">Select Subject</option>
                                  {subjectList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Chapter <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  required
                                  value={objQuestionForm.chapterId}
                                  onChange={(e) => setObjQuestionForm({ ...objQuestionForm, chapterId: e.target.value })}
                                  disabled={!objQuestionForm.subjectId}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                                >
                                  <option value="">
                                    {objQuestionForm.subjectId ? 'Select Chapter' : 'Select Subject First'}
                                  </option>
                                  {getChaptersForSubject(objQuestionForm.subjectId).map((ch) => (
                                    <option key={ch.id} value={ch.id}>
                                      {ch.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Difficulty Level
                                </label>
                                <select
                                  value={objQuestionForm.difficulty}
                                  onChange={(e) => setObjQuestionForm({ ...objQuestionForm, difficulty: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                >
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Display Order
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={objQuestionForm.orderNumber}
                                  onChange={(e) => setObjQuestionForm({ ...objQuestionForm, orderNumber: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Status
                                </label>
                                <select
                                  value={objQuestionForm.isActive ? 'true' : 'false'}
                                  onChange={(e) => setObjQuestionForm({ ...objQuestionForm, isActive: e.target.value === 'true' })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                >
                                  <option value="true">Active (Visible)</option>
                                  <option value="false">Inactive (Draft)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Question Prompt / Content <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[11px] text-slate-400">HTML & Math expressions supported</span>
                              </div>
                              <div className="border border-slate-200 rounded overflow-hidden bg-white">
                                <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 text-slate-600 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setObjQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + '<b></b>' }))}
                                    className="px-1.5 py-1 hover:bg-slate-200 rounded font-bold"
                                    title="Bold"
                                  >
                                    B
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setObjQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + '<i></i>' }))}
                                    className="px-1.5 py-1 hover:bg-slate-200 rounded italic"
                                    title="Italic"
                                  >
                                    I
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setObjQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + '<u></u>' }))}
                                    className="px-1.5 py-1 hover:bg-slate-200 rounded underline"
                                    title="Underline"
                                  >
                                    U
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setObjQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + '<code></code>' }))}
                                    className="px-1.5 py-1 hover:bg-slate-200 rounded font-mono text-[11px]"
                                    title="Code"
                                  >
                                    &lt;&gt;
                                  </button>
                                  <div className="h-4 w-px bg-slate-300 mx-1" />
                                  {['√', 'π', 'θ', 'λ', 'Δ', '²', '³', '±', '≈', '≠', '∫'].map((sym) => (
                                    <button
                                      key={sym}
                                      type="button"
                                      onClick={() => setObjQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + sym }))}
                                      className="px-1.5 py-0.5 hover:bg-slate-200 rounded text-slate-700 font-serif"
                                      title={`Insert ${sym}`}
                                    >
                                      {sym}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  rows={5}
                                  required
                                  placeholder="Enter the full question text or problem statement..."
                                  value={objQuestionForm.questionContent}
                                  onChange={(e) => setObjQuestionForm({ ...objQuestionForm, questionContent: e.target.value })}
                                  className="w-full p-3 text-xs focus:outline-none text-slate-800 resize-y"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB 2: ANSWER 1 (OPTION A) */}
                        {objEditorTab === 'Answer 1' && (
                          <div className="space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                                  A
                                </span>
                                <span>Answer Option 1</span>
                              </span>
                              <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                <input
                                  type="radio"
                                  name="correctOptionRadio"
                                  checked={objQuestionForm.correctOption === 'A'}
                                  onChange={() => setObjQuestionForm({ ...objQuestionForm, correctOption: 'A' })}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">
                                  Mark as Correct Answer
                                </span>
                              </label>
                            </div>
                            <div>
                              <textarea
                                rows={4}
                                required
                                placeholder="Enter Option 1 content..."
                                value={objQuestionForm.optionA}
                                onChange={(e) => setObjQuestionForm({ ...objQuestionForm, optionA: e.target.value })}
                                className="w-full p-3 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                              />
                            </div>
                            {objQuestionForm.correctOption === 'A' && (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Option 1 is marked as the correct answer.</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 3: ANSWER 2 (OPTION B) */}
                        {objEditorTab === 'Answer 2' && (
                          <div className="space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                                  B
                                </span>
                                <span>Answer Option 2</span>
                              </span>
                              <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                <input
                                  type="radio"
                                  name="correctOptionRadio"
                                  checked={objQuestionForm.correctOption === 'B'}
                                  onChange={() => setObjQuestionForm({ ...objQuestionForm, correctOption: 'B' })}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">
                                  Mark as Correct Answer
                                </span>
                              </label>
                            </div>
                            <div>
                              <textarea
                                rows={4}
                                required
                                placeholder="Enter Option 2 content..."
                                value={objQuestionForm.optionB}
                                onChange={(e) => setObjQuestionForm({ ...objQuestionForm, optionB: e.target.value })}
                                className="w-full p-3 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                              />
                            </div>
                            {objQuestionForm.correctOption === 'B' && (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Option 2 is marked as the correct answer.</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 4: ANSWER 3 (OPTION C) */}
                        {objEditorTab === 'Answer 3' && (
                          <div className="space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                                  C
                                </span>
                                <span>Answer Option 3</span>
                              </span>
                              <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                <input
                                  type="radio"
                                  name="correctOptionRadio"
                                  checked={objQuestionForm.correctOption === 'C'}
                                  onChange={() => setObjQuestionForm({ ...objQuestionForm, correctOption: 'C' })}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">
                                  Mark as Correct Answer
                                </span>
                              </label>
                            </div>
                            <div>
                              <textarea
                                rows={4}
                                required
                                placeholder="Enter Option 3 content..."
                                value={objQuestionForm.optionC}
                                onChange={(e) => setObjQuestionForm({ ...objQuestionForm, optionC: e.target.value })}
                                className="w-full p-3 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                              />
                            </div>
                            {objQuestionForm.correctOption === 'C' && (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Option 3 is marked as the correct answer.</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 5: ANSWER 4 (OPTION D) */}
                        {objEditorTab === 'Answer 4' && (
                          <div className="space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">
                                  D
                                </span>
                                <span>Answer Option 4</span>
                              </span>
                              <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                <input
                                  type="radio"
                                  name="correctOptionRadio"
                                  checked={objQuestionForm.correctOption === 'D'}
                                  onChange={() => setObjQuestionForm({ ...objQuestionForm, correctOption: 'D' })}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">
                                  Mark as Correct Answer
                                </span>
                              </label>
                            </div>
                            <div>
                              <textarea
                                rows={4}
                                required
                                placeholder="Enter Option 4 content..."
                                value={objQuestionForm.optionD}
                                onChange={(e) => setObjQuestionForm({ ...objQuestionForm, optionD: e.target.value })}
                                className="w-full p-3 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                              />
                            </div>
                            {objQuestionForm.correctOption === 'D' && (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Option 4 is marked as the correct answer.</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 6: ANSWER EXPLANATION */}
                        {objEditorTab === 'Answer Explanation' && (
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Answer Explanation & Solution
                                </label>
                                <span className="text-[11px] text-slate-400">Displayed to students after submission</span>
                              </div>
                              <textarea
                                rows={6}
                                placeholder="Provide step-by-step mathematical reasoning, derivation, or conceptual justification..."
                                value={objQuestionForm.explanation}
                                onChange={(e) => setObjQuestionForm({ ...objQuestionForm, explanation: e.target.value })}
                                className="w-full p-3 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 resize-y"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* MODAL FOOTER */}
                      <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                        {/* TAB PREV / NEXT SHORTCUTS */}
                        <div className="flex items-center space-x-2">
                          {objEditorTab !== 'Question' && (
                            <button
                              type="button"
                              onClick={() => {
                                const tabs = ['Question', 'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Answer Explanation'];
                                const currIdx = tabs.indexOf(objEditorTab);
                                if (currIdx > 0) setObjEditorTab(tabs[currIdx - 1]);
                              }}
                              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 hover:bg-slate-100 rounded"
                            >
                              ← Prev Tab
                            </button>
                          )}
                          {objEditorTab !== 'Answer Explanation' && (
                            <button
                              type="button"
                              onClick={() => {
                                const tabs = ['Question', 'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Answer Explanation'];
                                const currIdx = tabs.indexOf(objEditorTab);
                                if (currIdx < tabs.length - 1) setObjEditorTab(tabs[currIdx + 1]);
                              }}
                              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 hover:bg-slate-100 rounded"
                            >
                              Next Tab →
                            </button>
                          )}
                        </div>

                        {/* CANCEL & SAVE BUTTONS */}
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => setObjModalOpen(false)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingObjQuestion}
                            className="px-5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs rounded shadow-sm disabled:opacity-50"
                          >
                            {isSavingObjQuestion
                              ? 'Saving...'
                              : objQuestionForm.id
                              ? 'Update Question'
                              : 'Save Question'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBMENU PAGE 4: NUMERICAL QUESTION (QUESTION BANK) */}
          {activeTab === 'Numerical Question' && (
            <div className="space-y-6">
              {/* Header Title, Breadcrumb & Top-Right Add Question Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Numerical Question List</h1>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>/</span>
                    <span className="text-slate-700 font-semibold">Questions</span>
                    <span>/</span>
                    <span className="text-slate-500">Numerical Question Master</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setNumQuestionForm({
                      id: null,
                      subjectId: numSubjectFilter || (subjectList[0]?.id ? String(subjectList[0].id) : ''),
                      chapterId: '',
                      questionContent: '',
                      rangeFrom: '',
                      rangeTo: '',
                      tolerance: '0.05',
                      explanation: '',
                      difficulty: 'Medium',
                      orderNumber: '1',
                      isActive: true
                    });
                    setNumEditorTab('Question');
                    setNumModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs rounded shadow-sm transition-colors self-start sm:self-auto flex items-center space-x-1.5"
                >
                  <span>+ Add Question</span>
                </button>
              </div>

              {/* CARD CONTAINER WITH FILTERS */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                {/* FILTER GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* SUBJECT FILTER */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={numSubjectFilter}
                      onChange={(e) => {
                        setNumSubjectFilter(e.target.value);
                        setNumChapterFilter('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    >
                      <option value="">All Subjects</option>
                      {subjectList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CHAPTER CASCADING FILTER */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chapter
                    </label>
                    <select
                      value={numChapterFilter}
                      onChange={(e) => setNumChapterFilter(e.target.value)}
                      disabled={!numSubjectFilter}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">All Chapters</option>
                      {getChaptersForSubject(numSubjectFilter).map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DIFFICULTY FILTER */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={numDifficultyFilter}
                      onChange={(e) => setNumDifficultyFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    >
                      <option value="">All Difficulties</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* FULL WIDTH SEARCH INPUT WITH ATTACHED BLUE SEARCH BUTTON */}
                <div className="relative w-full flex items-center">
                  <input
                    type="text"
                    placeholder="Search by question text or ID..."
                    value={numSearchTerm}
                    onChange={(e) => setNumSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-l text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-r flex items-center justify-center"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* TABLE OF NUMERICAL QUESTIONS */}
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3 border-r border-slate-200 w-1/2">QUESTIONS</th>
                        <th className="p-3 border-r border-slate-200 w-1/6">SUBJECT</th>
                        <th className="p-3 border-r border-slate-200 w-1/6">CHAPTER</th>
                        <th className="p-3 border-r border-slate-200 text-center w-24">DIFFICULTY</th>
                        <th className="p-3 text-center w-24">
                          <div className="inline-flex items-center space-x-1">
                            <span>ACTION</span>
                            <span className="text-[10px] text-slate-400">⇅</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {numericalQuestionList
                        .filter((q) => {
                          if (numSubjectFilter && String(q.subjectId) !== String(numSubjectFilter)) return false;
                          if (numChapterFilter && String(q.chapterId) !== String(numChapterFilter)) return false;
                          if (numDifficultyFilter && q.difficulty !== numDifficultyFilter) return false;
                          if (numSearchTerm) {
                            const term = numSearchTerm.toLowerCase();
                            const matchPrompt = (q.questionContent || q.question || '').toLowerCase().includes(term);
                            const matchId = String(q.id).toLowerCase().includes(term);
                            if (!matchPrompt && !matchId) return false;
                          }
                          return true;
                        })
                        .map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 border-r border-slate-200 text-slate-800">
                              <div className="flex items-start space-x-2">
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono shrink-0">
                                  #{q.id}
                                </span>
                                <span className="line-clamp-2">
                                  {q.questionContent || q.question}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                              {getSubjectName(q.subjectId)}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                              {getChapterName(q.chapterId)}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  q.difficulty === 'High' || q.difficulty === 'Hard'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : q.difficulty === 'Low' || q.difficulty === 'Easy'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {q.difficulty || 'Medium'}
                              </span>
                            </td>
                            <td className="p-3 text-center space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => handleEditNumQuestion(q)}
                                className="p-1.5 border border-slate-300 hover:border-slate-500 rounded-full text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
                                title="Edit Question"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteNumQuestion(q.id)}
                                className="p-1.5 border border-rose-200 hover:border-rose-400 rounded-full text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center"
                                title="Delete Question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {numericalQuestionList.filter((q) => {
                    if (numSubjectFilter && String(q.subjectId) !== String(numSubjectFilter)) return false;
                    if (numChapterFilter && String(q.chapterId) !== String(numChapterFilter)) return false;
                    if (numDifficultyFilter && q.difficulty !== numDifficultyFilter) return false;
                    if (numSearchTerm) {
                      const term = numSearchTerm.toLowerCase();
                      const matchPrompt = (q.questionContent || q.question || '').toLowerCase().includes(term);
                      const matchId = String(q.id).toLowerCase().includes(term);
                      if (!matchPrompt && !matchId) return false;
                    }
                    return true;
                  }).length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No numerical questions found matching your filter criteria. Click &quot;Add Question&quot; above to create one.
                    </div>
                  )}
                </div>

                {/* TABLE FOOTER / PAGINATION */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                  <div>
                    Showing 1 to{' '}
                    {
                      numericalQuestionList.filter((q) => {
                        if (numSubjectFilter && String(q.subjectId) !== String(numSubjectFilter)) return false;
                        if (numChapterFilter && String(q.chapterId) !== String(numChapterFilter)) return false;
                        if (numDifficultyFilter && q.difficulty !== numDifficultyFilter) return false;
                        if (numSearchTerm) {
                          const term = numSearchTerm.toLowerCase();
                          const matchPrompt = (q.questionContent || q.question || '').toLowerCase().includes(term);
                          const matchId = String(q.id).toLowerCase().includes(term);
                          if (!matchPrompt && !matchId) return false;
                        }
                        return true;
                      }).length
                    }{' '}
                    of {numericalQuestionList.length} entries
                  </div>

                  <div className="flex items-center space-x-1">
                    <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px] disabled:opacity-50">
                      Previous
                    </button>
                    <button className="px-2.5 py-1 bg-[#1d4ed8] text-white font-bold rounded text-[11px]">
                      1
                    </button>
                    <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px]">
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* MODAL FOR ADD / EDIT NUMERICAL QUESTION (WITH 3 TABBED SECTIONS) */}
              {numModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                    {/* MODAL HEADER */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {numQuestionForm.id ? `Edit Numerical Question #${numQuestionForm.id}` : 'Add Numerical Question'}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Reusable Master Question Bank • Subject → Chapter → Numerical Value Range
                        </p>
                      </div>
                      <button
                        onClick={() => setNumModalOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* TAB NAVIGATION BAR (3 TABS) */}
                    <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-2 space-x-1 overflow-x-auto shrink-0">
                      {[
                        { id: 'Question', label: 'Question' },
                        { id: 'Answer', label: 'Answer (Range From & To)' },
                        { id: 'Answer Explanation', label: 'Answer Explanation' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setNumEditorTab(tab.id)}
                          className={`px-3 py-2 text-xs font-semibold rounded-t-md transition-colors border-t border-l border-r whitespace-nowrap ${
                            numEditorTab === tab.id
                              ? 'bg-white text-blue-600 border-slate-200 border-b-white -mb-px shadow-sm'
                              : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* MODAL BODY */}
                    <form onSubmit={handleSaveNumQuestion} className="flex flex-col flex-1 overflow-hidden">
                      <div className="p-6 overflow-y-auto flex-1 space-y-4">
                        {/* TAB 1: QUESTION */}
                        {numEditorTab === 'Question' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Subject <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  required
                                  value={numQuestionForm.subjectId}
                                  onChange={(e) => {
                                    setNumQuestionForm({
                                      ...numQuestionForm,
                                      subjectId: e.target.value,
                                      chapterId: ''
                                    });
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                >
                                  <option value="">Select Subject</option>
                                  {subjectList.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Chapter <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  required
                                  value={numQuestionForm.chapterId}
                                  onChange={(e) => setNumQuestionForm({ ...numQuestionForm, chapterId: e.target.value })}
                                  disabled={!numQuestionForm.subjectId}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                                >
                                  <option value="">
                                    {numQuestionForm.subjectId ? 'Select Chapter' : 'Select Subject First'}
                                  </option>
                                  {getChaptersForSubject(numQuestionForm.subjectId).map((ch) => (
                                    <option key={ch.id} value={ch.id}>
                                      {ch.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Difficulty Level
                                </label>
                                <select
                                  value={numQuestionForm.difficulty}
                                  onChange={(e) => setNumQuestionForm({ ...numQuestionForm, difficulty: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                >
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Display Order
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={numQuestionForm.orderNumber}
                                  onChange={(e) => setNumQuestionForm({ ...numQuestionForm, orderNumber: e.target.value })}
                                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Status
                                </label>
                                <select
                                  value={numQuestionForm.isActive ? 'true' : 'false'}
                                  onChange={(e) => setNumQuestionForm({ ...numQuestionForm, isActive: e.target.value === 'true' })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                                >
                                  <option value="true">Active (Visible)</option>
                                  <option value="false">Inactive (Draft)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Question Prompt / Numerical Problem <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[11px] text-slate-400">HTML & Math expressions supported</span>
                              </div>
                              <div className="border border-slate-200 rounded overflow-hidden bg-white">
                                <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 text-slate-600 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setNumQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + '<b></b>' }))}
                                    className="px-1.5 py-1 hover:bg-slate-200 rounded font-bold"
                                    title="Bold"
                                  >
                                    B
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNumQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + '<i></i>' }))}
                                    className="px-1.5 py-1 hover:bg-slate-200 rounded italic"
                                    title="Italic"
                                  >
                                    I
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNumQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + '<u></u>' }))}
                                    className="px-1.5 py-1 hover:bg-slate-200 rounded underline"
                                    title="Underline"
                                  >
                                    U
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNumQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + '<code></code>' }))}
                                    className="px-1.5 py-1 hover:bg-slate-200 rounded font-mono text-[11px]"
                                    title="Code"
                                  >
                                    &lt;&gt;
                                  </button>
                                  <div className="h-4 w-px bg-slate-300 mx-1" />
                                  {['√', 'π', 'θ', 'λ', 'Δ', '²', '³', '±', '≈', '≠', '∫'].map((sym) => (
                                    <button
                                      key={sym}
                                      type="button"
                                      onClick={() => setNumQuestionForm(prev => ({ ...prev, questionContent: prev.questionContent + sym }))}
                                      className="px-1.5 py-0.5 hover:bg-slate-200 rounded text-slate-700 font-serif"
                                      title={`Insert ${sym}`}
                                    >
                                      {sym}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  rows={5}
                                  required
                                  placeholder="Enter the numerical problem statement and unit requirements..."
                                  value={numQuestionForm.questionContent}
                                  onChange={(e) => setNumQuestionForm({ ...numQuestionForm, questionContent: e.target.value })}
                                  className="w-full p-3 text-xs focus:outline-none text-slate-800 resize-y"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB 2: ANSWER (RANGE FROM & RANGE TO) */}
                        {numEditorTab === 'Answer' && (
                          <div className="space-y-4 bg-slate-50/50 p-5 rounded-lg border border-slate-200">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs mb-1">
                                Numerical Answer Value Range
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Specify the acceptable inclusive numerical value range. For exact single-value answers, set both <b>Range From</b> and <b>Range To</b> to the same number (e.g. 14.5 to 14.5). Both negative and decimal values are fully supported.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Range From (Inclusive Lower Bound) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 14.50 or -5.25"
                                  value={numQuestionForm.rangeFrom}
                                  onChange={(e) => setNumQuestionForm({ ...numQuestionForm, rangeFrom: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-mono"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  Supports negative and decimal numbers
                                </span>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Range To (Inclusive Upper Bound) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. 14.50 or -5.20"
                                  value={numQuestionForm.rangeTo}
                                  onChange={(e) => setNumQuestionForm({ ...numQuestionForm, rangeTo: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-mono"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  Must be greater than or equal to Range From
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Tolerance Precision (+/-)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 0.05"
                                value={numQuestionForm.tolerance}
                                onChange={(e) => setNumQuestionForm({ ...numQuestionForm, tolerance: e.target.value })}
                                className="w-full max-w-xs px-3 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {/* TAB 3: ANSWER EXPLANATION */}
                        {numEditorTab === 'Answer Explanation' && (
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Answer Explanation & Calculation Steps
                                </label>
                                <span className="text-[11px] text-slate-400">Displayed to students after submission</span>
                              </div>
                              <textarea
                                rows={6}
                                placeholder="Provide the complete mathematical derivation, formulas used, calculation steps, and final value..."
                                value={numQuestionForm.explanation}
                                onChange={(e) => setNumQuestionForm({ ...numQuestionForm, explanation: e.target.value })}
                                className="w-full p-3 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800 resize-y"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* MODAL FOOTER */}
                      <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                        {/* TAB PREV / NEXT SHORTCUTS */}
                        <div className="flex items-center space-x-2">
                          {numEditorTab !== 'Question' && (
                            <button
                              type="button"
                              onClick={() => {
                                const tabs = ['Question', 'Answer', 'Answer Explanation'];
                                const currIdx = tabs.indexOf(numEditorTab);
                                if (currIdx > 0) setNumEditorTab(tabs[currIdx - 1]);
                              }}
                              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 hover:bg-slate-100 rounded"
                            >
                              ← Prev Tab
                            </button>
                          )}
                          {numEditorTab !== 'Answer Explanation' && (
                            <button
                              type="button"
                              onClick={() => {
                                const tabs = ['Question', 'Answer', 'Answer Explanation'];
                                const currIdx = tabs.indexOf(numEditorTab);
                                if (currIdx < tabs.length - 1) setNumEditorTab(tabs[currIdx + 1]);
                              }}
                              className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 hover:bg-slate-100 rounded"
                            >
                              Next Tab →
                            </button>
                          )}
                        </div>

                        {/* CANCEL & SAVE BUTTONS */}
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => setNumModalOpen(false)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingNumQuestion}
                            className="px-5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs rounded shadow-sm disabled:opacity-50"
                          >
                            {isSavingNumQuestion
                              ? 'Saving...'
                              : numQuestionForm.id
                              ? 'Update Question'
                              : 'Save Question'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 7. COURSE MASTER VIEW (MATCHING USER SCREENSHOTS 1, 2 & 3) */}
          {/* ========================================================= */}
          {activeTab === 'Course Master' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Header Title & Breadcrumb */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Course Master</h1>
                  <nav className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                    <button onClick={() => setActiveTab('Dashboard')} className="hover:text-slate-900 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <span>/</span>
                    <span className="text-slate-800 font-bold">
                      {courseActiveTab === 'Basic Information' ? 'Course Details' : 'Courses'}
                    </span>
                  </nav>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCourseForm(defaultCourseForm);
                      setCourseActiveTab('Basic Information');
                    }}
                    className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Course</span>
                  </button>
                </div>
              </div>

              {/* CARD WITH TABBED NAVIGATION */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* TABS NAVIGATION BAR (Basic Information vs Table) */}
                <div className="flex border-b border-slate-200 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setCourseActiveTab('Basic Information')}
                    className={`flex items-center space-x-2 px-6 py-3.5 text-xs font-extrabold transition-all ${
                      courseActiveTab === 'Basic Information'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Basic Information &amp; Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCourseActiveTab('Table')}
                    className={`flex items-center space-x-2 px-6 py-3.5 text-xs font-extrabold transition-all ${
                      courseActiveTab === 'Table'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span>Courses Catalogue ({courseList.length})</span>
                  </button>
                </div>

                {/* TAB 1: BASIC INFORMATION & DETAILS FORM (MATCHING SCREENSHOTS 1, 2 & 3) */}
                {courseActiveTab === 'Basic Information' && (
                  <form onSubmit={handleSaveCourse} className="p-6 sm:p-8 space-y-8">
                    
                    {/* SECTION 1: BASIC INFORMATION (SCREENSHOT 1) */}
                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-5">
                      <div className="border-b border-slate-200 pb-3">
                        <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider text-slate-800">
                          BASIC INFORMATION
                        </h3>
                      </div>

                      {/* COURSE TITLE */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          COURSE TITLE <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Course Title"
                          value={courseForm.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCourseForm({
                              ...courseForm,
                              title: val,
                              slug: courseForm.id ? courseForm.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                            });
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                        />
                      </div>

                      {/* SHORT DESCRIPTION */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          SHORT DESCRIPTION
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Short Description"
                          value={courseForm.shortDescription}
                          onChange={(e) => setCourseForm({ ...courseForm, shortDescription: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                        />
                      </div>

                      {/* COURSE DESCRIPTION (RICH WYSIWYG EDITOR) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          COURSE DESCRIPTION
                        </label>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                          {/* Rich Text Toolbar Matching CKEditor in Screenshot 1 */}
                          <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 text-slate-600 text-xs">
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Source Code"><Code className="w-3.5 h-3.5" /></button>
                            <span className="w-px h-4 bg-slate-300 mx-0.5" />
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                            <span className="w-px h-4 bg-slate-300 mx-0.5" />
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                            <span className="w-px h-4 bg-slate-300 mx-0.5" />
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Justify"><AlignJustify className="w-3.5 h-3.5" /></button>
                            <span className="w-px h-4 bg-slate-300 mx-0.5" />
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Insert Link"><LinkIcon className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Insert Image"><ImageIcon className="w-3.5 h-3.5" /></button>
                            <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Insert Table"><TableIcon className="w-3.5 h-3.5" /></button>
                          </div>

                          <textarea
                            rows={8}
                            placeholder="Enter detailed course syllabus, mentor overview, and feature breakdown..."
                            value={courseForm.description}
                            onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                            className="w-full p-4 text-xs font-normal focus:outline-none text-slate-800 resize-y leading-relaxed"
                          />
                          <div className="h-2 bg-[#1e40af] w-full" />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: DETAILS (SCREENSHOT 2 & 3) */}
                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-5">
                      <div className="border-b border-slate-200 pb-3">
                        <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wider text-slate-800">
                          DETAILS
                        </h3>
                      </div>

                      {/* EXAM DROPDOWN */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          EXAM <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={courseForm.exam}
                          onChange={(e) => setCourseForm({ ...courseForm, exam: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                        >
                          <option value="">Select Exam</option>
                          {examList
                            .filter((exam) => exam.isActive !== false || exam.examName === courseForm.exam)
                            .map((exam) => (
                              <option key={exam.id} value={exam.examName}>
                                {exam.examName}{!exam.isActive ? ' (Inactive)' : ''}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* ASSIGNED SUBJECTS (MULTI-SELECT CHECKBOXES) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                            ASSIGNED SUBJECTS
                          </label>
                          <span className="text-[11px] text-blue-600 font-bold">
                            {(courseForm.selectedSubjectIds || []).length} selected
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Select academic subjects for this course curriculum. Subjects are reusable across courses.
                        </p>
                        <div className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto shadow-2xs">
                          {subjects
                            .filter((sub) => sub.isActive !== false || (courseForm.selectedSubjectIds || []).includes(sub.id))
                            .map((sub) => {
                              const isChecked = (courseForm.selectedSubjectIds || []).includes(sub.id);
                              return (
                                <label
                                  key={sub.id}
                                  className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-2xs'
                                      : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const current = courseForm.selectedSubjectIds || [];
                                      const updated = e.target.checked
                                        ? [...current, sub.id]
                                        : current.filter((id) => id !== sub.id);
                                      setCourseForm({ ...courseForm, selectedSubjectIds: updated });
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  />
                                  <span className="truncate">{sub.subjectName}</span>
                                </label>
                              );
                            })}
                          {subjects.length === 0 && (
                            <div className="col-span-full text-center py-2 text-xs text-slate-400">
                              No subjects available in Subject Master.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ORIGINAL PRICE & DISCOUNTED PRICE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            ORIGINAL PRICE (₹) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="Enter Original Price (e.g. 14999)"
                            value={courseForm.originalPrice}
                            onChange={(e) => setCourseForm({ ...courseForm, originalPrice: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            DISCOUNTED PRICE (₹) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="Enter Discounted Price (e.g. 4999)"
                            value={courseForm.discountedPrice}
                            onChange={(e) => setCourseForm({ ...courseForm, discountedPrice: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* EXPIRY DATE, ENROLLED STUDENT, DISPLAY INDEX */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            EXPIRY DATE
                          </label>
                          <input
                            type="date"
                            value={courseForm.expiryDate}
                            onChange={(e) => setCourseForm({ ...courseForm, expiryDate: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            ENROLLED STUDENT
                          </label>
                          <input
                            type="text"
                            placeholder="Enter Enrolled Student (e.g. 1420)"
                            value={courseForm.enrolledStudent}
                            onChange={(e) => setCourseForm({ ...courseForm, enrolledStudent: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            DISPLAY INDEX
                          </label>
                          <input
                            type="number"
                            placeholder="Enter Display Index (e.g. 1)"
                            value={courseForm.displayIndex}
                            onChange={(e) => setCourseForm({ ...courseForm, displayIndex: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* ADDITIONAL DETAILS */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          ADDITIONAL DETAILS
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Additional Details (e.g. Includes 1-on-1 mentorship & WhatsApp doubt group)"
                          value={courseForm.additionalDetails}
                          onChange={(e) => setCourseForm({ ...courseForm, additionalDetails: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                        />
                      </div>

                      {/* COURSE IMAGE SMALL & BANNER IMAGE LARGE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                            COURSE IMAGE Small
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    setCourseUploadLoading(true);
                                    const res = await apiUploadFile(file);
                                    if (res.url) {
                                      setCourseForm(prev => ({ ...prev, image: res.url }));
                                    }
                                  } catch (err) {
                                    alert(err.message || 'Failed to upload image.');
                                  } finally {
                                    setCourseUploadLoading(false);
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                            />
                          </div>
                          {courseForm.image && (
                            <div className="relative inline-block mt-2">
                              <img
                                src={courseForm.image}
                                alt="Course Preview"
                                className="w-40 h-24 object-cover rounded-xl border border-slate-200 shadow-xs"
                              />
                              <span className="absolute bottom-1 right-1 bg-slate-900/80 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                Saved on Server
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                            BANNER IMAGE Large
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    setCourseUploadLoading(true);
                                    const res = await apiUploadFile(file);
                                    if (res.url) {
                                      setCourseForm(prev => ({ ...prev, bannerImage: res.url }));
                                    }
                                  } catch (err) {
                                    alert(err.message || 'Failed to upload banner.');
                                  } finally {
                                    setCourseUploadLoading(false);
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                            />
                          </div>
                          {courseForm.bannerImage && (
                            <div className="relative inline-block mt-2">
                              <img
                                src={courseForm.bannerImage}
                                alt="Banner Preview"
                                className="w-40 h-24 object-cover rounded-xl border border-slate-200 shadow-xs"
                              />
                              <span className="absolute bottom-1 right-1 bg-slate-900/80 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                Saved on Server
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ALT TAGS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            Alt Tag Course Image
                          </label>
                          <input
                            type="text"
                            placeholder="Enter AltTag_CourseImage"
                            value={courseForm.altCourseImage}
                            onChange={(e) => setCourseForm({ ...courseForm, altCourseImage: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            Alt Tag Banner Image
                          </label>
                          <input
                            type="text"
                            placeholder="Enter AltTag_BannerImage"
                            value={courseForm.altBannerImage}
                            onChange={(e) => setCourseForm({ ...courseForm, altBannerImage: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* COURSE SCHEDULE FILE */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          Course Schedule File (PDF Roadmap)
                        </label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setCourseUploadLoading(true);
                                const res = await apiUploadFile(file);
                                if (res.url) {
                                  setCourseForm(prev => ({ ...prev, scheduleFile: res.url }));
                                }
                              } catch (err) {
                                alert(err.message || 'Failed to upload PDF.');
                              } finally {
                                setCourseUploadLoading(false);
                              }
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                        />
                        {courseForm.scheduleFile && (
                          <div className="mt-2 text-xs flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold">Roadmap PDF Attached:</span>
                            <a href={courseForm.scheduleFile} target="_blank" rel="noreferrer" className="underline font-mono">
                              {courseForm.scheduleFile.split('/').pop()}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* SLUG, META TITLE, META DESCRIPTION & COURSE LINK */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            Course Slug <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter Slug (e.g. bitsat-2026-crash-course)"
                            value={courseForm.slug}
                            onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            Course Meta Title
                          </label>
                          <input
                            type="text"
                            placeholder="Enter Meta Title for Google Search"
                            value={courseForm.metaTitle}
                            onChange={(e) => setCourseForm({ ...courseForm, metaTitle: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            Course Meta Description
                          </label>
                          <input
                            type="text"
                            placeholder="Enter Meta Description"
                            value={courseForm.metaDescription}
                            onChange={(e) => setCourseForm({ ...courseForm, metaDescription: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            Course Link
                          </label>
                          <input
                            type="text"
                            placeholder="Enter Course Link URL"
                            value={courseForm.courseLink}
                            onChange={(e) => setCourseForm({ ...courseForm, courseLink: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* 4 CHECKBOXES MATCHING SCREENSHOT 3 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            id="chkShowInIndex"
                            checked={courseForm.isShowInIndex}
                            onChange={(e) => setCourseForm({ ...courseForm, isShowInIndex: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <label htmlFor="chkShowInIndex" className="text-xs font-bold text-slate-800 cursor-pointer">
                            Show In Index (Homepage)
                          </label>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            id="chkActive"
                            checked={courseForm.isActive}
                            onChange={(e) => setCourseForm({ ...courseForm, isActive: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <label htmlFor="chkActive" className="text-xs font-bold text-slate-800 cursor-pointer">
                            Active (Published)
                          </label>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            id="chkShowInMentorship"
                            checked={courseForm.isShowInMentorship}
                            onChange={(e) => setCourseForm({ ...courseForm, isShowInMentorship: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <label htmlFor="chkShowInMentorship" className="text-xs font-bold text-slate-800 cursor-pointer">
                            Show In Mentorship
                          </label>
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            id="chkShowInTestSeries"
                            checked={courseForm.isShowInTestSeries}
                            onChange={(e) => setCourseForm({ ...courseForm, isShowInTestSeries: e.target.checked })}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                          />
                          <label htmlFor="chkShowInTestSeries" className="text-xs font-bold text-slate-800 cursor-pointer">
                            Show In TestSeries
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* BOX FOOTER & ACTION BUTTONS MATCHING SCREENSHOT 3 */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="submit"
                          disabled={isSavingCourse || courseUploadLoading}
                          className="px-6 py-2.5 bg-[#0052cc] hover:bg-[#003e99] disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {isSavingCourse && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                          <span>{isSavingCourse ? 'Saving to Database...' : (courseForm.id ? 'Update Course' : 'Save Course')}</span>
                        </button>

                        {courseForm.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(courseForm.id)}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
                          >
                            Delete
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setCourseForm(defaultCourseForm);
                            setCourseActiveTab('Table');
                          }}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Course Workflow Linking Shortcuts */}
                      {courseForm.id && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setVideoForm(prev => ({
                                ...prev,
                                course: courseForm.title,
                                subject: 'Physics',
                                chapter: 'Rotational Motion'
                              }));
                              setVideoCourseFilter(courseForm.title);
                              setActiveTab('Video Master');
                              setVideoActiveTab('Basic Information');
                            }}
                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Assign Videos ({videoList.filter(v => v.course === courseForm.title).length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDocForm(prev => ({
                                ...prev,
                                course: courseForm.title,
                                subject: 'Physics',
                                chapter: 'Rotational Motion'
                              }));
                              setDocCourseFilter(courseForm.title);
                              setActiveTab('Document Master');
                              setDocActiveTab('Basic Information');
                            }}
                            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Assign Notes (PDF) ({docList.filter(d => d.course === courseForm.title).length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('Course Content Assignment');
                            }}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Course Content Assignment Hub →</span>
                          </button>

                          <Link
                            to={`/course-detail/${courseForm.slug}`}
                            target="_blank"
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-amber-400 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <span>Preview Live Page</span>
                            <span>↗</span>
                          </Link>
                        </div>
                      )}
                    </div>

                  </form>
                )}

                {/* TAB 2: COURSE CATALOGUE & CARDS TABLE VIEW */}
                {courseActiveTab === 'Table' && (
                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Search Bar */}
                    <div className="relative w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search courses by title, exam, or slug..."
                        value={courseSearchTerm}
                        onChange={(e) => setCourseSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Courses Grid Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {courseList
                        .filter(c =>
                          c.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
                          c.exam.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
                          c.slug.toLowerCase().includes(courseSearchTerm.toLowerCase())
                        )
                        .map((course) => {
                          const assignedVideosCount = videoList.filter(v => v.course === course.title).length;
                          const assignedDocsCount = docList.filter(d => d.course === course.title).length;

                          return (
                            <div
                              key={course.id}
                              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all"
                            >
                              <div>
                                {/* Course Banner Thumbnail */}
                                <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden">
                                  <img
                                    src={course.image}
                                    alt={course.title}
                                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                                  />
                                  <div className="absolute top-2 left-2 flex items-center gap-1">
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-900/90 text-amber-400 backdrop-blur-xs">
                                      {course.exam}
                                    </span>
                                    {course.isActive && (
                                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Details Body */}
                                <div className="p-4 space-y-3">
                                  <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                    {course.title}
                                  </h4>
                                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {course.shortDescription || 'Full course curriculum with video lectures, DPPs, and mock tests.'}
                                  </p>

                                  {/* Assigned Subjects Badges */}
                                  <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                    {Array.isArray(course.subjectIds) && course.subjectIds.length > 0 ? (
                                      course.subjectIds.map((subId) => {
                                        const sub = subjects.find((s) => s.id === subId);
                                        return (
                                          <span
                                            key={subId}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                            title={sub ? sub.subjectName : `Subject #${subId}`}
                                          >
                                            {sub ? sub.subjectName : `Subject #${subId}`}
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">No subjects assigned</span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                    <div>
                                      <span className="text-[10px] text-slate-400 block leading-none">Selling Price</span>
                                      <span className="font-black text-slate-900 text-sm">₹{course.discountedPrice || course.price}</span>
                                      {course.originalPrice && (
                                        <span className="text-[10px] text-slate-400 line-through ml-1.5">₹{course.originalPrice}</span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[10px] text-slate-400 block leading-none">Enrolled</span>
                                      <span className="font-bold text-slate-700 text-xs">{course.enrolledStudent || '1200+'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons Bar */}
                              <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1">
                                <button
                                  onClick={() => handleEditCourse(course)}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors flex items-center gap-1"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setVideoForm(prev => ({
                                      ...prev,
                                      course: course.title,
                                      subject: 'Physics',
                                      chapter: 'Rotational Motion'
                                    }));
                                    setVideoCourseFilter(course.title);
                                    setActiveTab('Video Master');
                                    setVideoActiveTab('Basic Information');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center gap-1"
                                  title="Assign Videos to this course"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Videos ({assignedVideosCount})</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setDocForm(prev => ({
                                      ...prev,
                                      course: course.title,
                                      subject: 'Physics',
                                      chapter: 'Rotational Motion'
                                    }));
                                    setDocCourseFilter(course.title);
                                    setActiveTab('Document Master');
                                    setDocActiveTab('Basic Information');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition-colors flex items-center gap-1"
                                  title="Assign Documents & Notes to this course"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Notes ({assignedDocsCount})</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveTab('Course Content Assignment');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-extrabold text-xs transition-colors flex items-center gap-1 border border-amber-300"
                                  title="Open Course Content Assignment hub"
                                >
                                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Assign Content</span>
                                </button>

                                <Link
                                  to={`/course-detail/${course.slug}`}
                                  target="_blank"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                                  title="Preview Landing Page"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>

                                <button
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Delete Course"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIDEO MASTER (MATCHING SCREENSHOTS 1 & 2 FOR VIDEOS) */}
          {activeTab === 'Video Master' && (
            <div className="space-y-6">
              {/* Header Title & Breadcrumb */}
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Videos</h1>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>/</span>
                  <span className="text-slate-700 font-semibold">Video Master</span>
                </div>
              </div>

              {/* CARD WITH TABBED NAVIGATION */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* TABS NAVIGATION BAR (Basic Information vs Table) */}
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setVideoActiveTab('Basic Information')}
                    className={`flex items-center space-x-2 px-6 py-3 text-xs font-bold transition-colors ${
                      videoActiveTab === 'Basic Information'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Basic Information</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoActiveTab('Table')}
                    className={`flex items-center space-x-2 px-6 py-3 text-xs font-bold transition-colors ${
                      videoActiveTab === 'Table'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                </div>

                {/* TAB 1: BASIC INFORMATION FORM (MATCHING SCREENSHOT 1) */}
                {videoActiveTab === 'Basic Information' && (
                  <form onSubmit={handleSaveVideo} className="p-6 space-y-5">
                    {/* ROW 0: COURSE SELECTION */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        COURSE / BATCH <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={videoForm.course}
                        onChange={(e) => setVideoForm({ ...videoForm, course: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                      >
                        <option value="">Select Course</option>
                        {courseList.map(c => (
                          <option key={c.id} value={c.title}>
                            {c.title} ({c.exam})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ROW 1: SUBJECT & CHAPTER DROPDOWNS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          SUBJECT <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={videoForm.subject}
                          onChange={(e) => setVideoForm({ ...videoForm, subject: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-slate-800"
                        >
                          <option value="">Select Subject</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Maths">Maths</option>
                          <option value="LR & English">LR & English</option>
                          <option value="Aptitude">Aptitude</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          CHAPTER <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={videoForm.chapter}
                          onChange={(e) => setVideoForm({ ...videoForm, chapter: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-slate-800"
                        >
                          <option value="">Select Chapter</option>
                          <option value="Rotational Motion">Rotational Motion</option>
                          <option value="Alcohols Phenols and Ethers">Alcohols Phenols and Ethers</option>
                          <option value="Integration & Calculus">Integration & Calculus</option>
                          <option value="Electrostatics & Capacitance">Electrostatics & Capacitance</option>
                          <option value="Aldehydes Ketones and Carboxylic Acids">Aldehydes Ketones and Carboxylic Acids</option>
                        </select>
                      </div>
                    </div>

                    {/* ROW 2: VIDEO TITLE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        VIDEO TITLE <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter Video Lecture Title"
                        value={videoForm.title}
                        onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-slate-800"
                      />
                    </div>

                    {/* ROW 3: BRIEF DESCRIPTION RICH TEXT EDITOR */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        BRIEF DESCRIPTION
                      </label>
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 text-slate-600">
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Code"><Code className="w-3.5 h-3.5" /></button>
                          <span className="w-px h-4 bg-slate-300 mx-0.5" />
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                          <span className="w-px h-4 bg-slate-300 mx-0.5" />
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                        </div>
                        <textarea
                          rows={4}
                          placeholder="Enter brief lecture synopsis, timestamps, and prerequisites..."
                          value={videoForm.description}
                          onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                          className="w-full p-3 text-xs focus:outline-none text-slate-800 resize-y"
                        />
                        <div className="h-2 bg-[#1e40af] w-full" />
                      </div>
                    </div>

                    {/* ROW 4: VIDEO LINK & ORDER NUMBER */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          VIDEO LINK (URL / Vimeo / YouTube ID)
                        </label>
                        <input
                          type="text"
                          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                          value={videoForm.videoLink}
                          onChange={(e) => setVideoForm({ ...videoForm, videoLink: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          ORDER NUMBER
                        </label>
                        <input
                          type="number"
                          placeholder="Enter Order Number"
                          value={videoForm.orderNumber}
                          onChange={(e) => setVideoForm({ ...videoForm, orderNumber: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* ROW 5: CHECKBOXES */}
                    <div className="flex items-center space-x-8 pt-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="liveVideoCheck"
                          checked={videoForm.liveVideo}
                          onChange={(e) => setVideoForm({ ...videoForm, liveVideo: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <label htmlFor="liveVideoCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                          Live Video Stream
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enabledVideoCheck"
                          checked={videoForm.enabled}
                          onChange={(e) => setVideoForm({ ...videoForm, enabled: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <label htmlFor="enabledVideoCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                          Enabled &amp; Published
                        </label>
                      </div>
                    </div>

                    {/* SAVE BUTTON */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        {videoForm.id ? 'Update Video' : 'Save Video'}
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: TABLE VIEW (MATCHING SCREENSHOT 2) */}
                {videoActiveTab === 'Table' && (
                  <div className="p-6 space-y-4">
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                          FILTER BY COURSE
                        </label>
                        <select
                          value={videoCourseFilter}
                          onChange={(e) => setVideoCourseFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Courses ({courseList.length})</option>
                          {courseList.map(c => (
                            <option key={c.id} value={c.title}>{c.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                          FILTER BY SUBJECT
                        </label>
                        <select
                          value={videoSubjectFilter}
                          onChange={(e) => setVideoSubjectFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Subjects</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Maths">Maths</option>
                          <option value="LR & English">LR & English</option>
                          <option value="Aptitude">Aptitude</option>
                        </select>
                      </div>
                    </div>

                    <div className="relative w-full flex items-center">
                      <input
                        type="text"
                        placeholder="Search video lectures by title, chapter or course..."
                        value={videoSearchTerm}
                        onChange={(e) => setVideoSearchTerm(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-l-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                      <button
                        type="button"
                        className="px-4 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-r-xl flex items-center justify-center"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                          <tr>
                            <th className="p-3 border-r border-slate-200 w-1/3">VIDEO TITLE</th>
                            <th className="p-3 border-r border-slate-200 w-1/4">COURSE / SUBJECT</th>
                            <th className="p-3 border-r border-slate-200 w-1/4">CHAPTER</th>
                            <th className="p-3 text-center w-1/6">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {videoList
                            .filter(v =>
                              (!videoCourseFilter || v.course === videoCourseFilter) &&
                              (!videoSubjectFilter || v.subject === videoSubjectFilter) &&
                              (v.title.toLowerCase().includes(videoSearchTerm.toLowerCase()) ||
                               (v.chapter && v.chapter.toLowerCase().includes(videoSearchTerm.toLowerCase())) ||
                               (v.course && v.course.toLowerCase().includes(videoSearchTerm.toLowerCase())))
                            )
                            .map((v) => (
                              <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 border-r border-slate-200 text-slate-800 font-bold">
                                  <div className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <span>{v.title}</span>
                                  </div>
                                </td>
                                <td className="p-3 border-r border-slate-200 text-slate-600">
                                  <div className="text-[11px] font-bold text-slate-900 truncate max-w-[200px]">{v.course || 'All Courses'}</div>
                                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                                    {v.subject}
                                  </span>
                                </td>
                                <td className="p-3 border-r border-slate-200 text-slate-700 font-medium">
                                  {v.chapter}
                                </td>
                                <td className="p-3 text-center space-x-2">
                                  <button
                                    onClick={() => handleEditVideo(v)}
                                    className="p-1.5 border border-slate-300 hover:border-slate-500 rounded-full text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
                                    title="Edit Video"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVideo(v.id)}
                                    className="p-1.5 border border-rose-200 hover:border-rose-400 rounded-full text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center"
                                    title="Delete Video"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                      <div>
                        Showing 1 to {
                          videoList.filter(v =>
                            (!videoCourseFilter || v.course === videoCourseFilter) &&
                            (!videoSubjectFilter || v.subject === videoSubjectFilter) &&
                            v.title.toLowerCase().includes(videoSearchTerm.toLowerCase())
                          ).length
                        } of {videoList.length} entries
                      </div>

                      <div className="flex items-center space-x-1">
                        <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px] disabled:opacity-50">
                          Previous
                        </button>
                        <button className="px-2.5 py-1 bg-[#1d4ed8] text-white font-bold rounded text-[11px]">
                          1
                        </button>
                        <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px]">
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DOCUMENT MASTER (MATCHING SCREENSHOT 3 FOR DOCUMENTS) */}
          {activeTab === 'Document Master' && (
            <div className="space-y-6">
              {/* Header Title & Breadcrumb */}
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Documents</h1>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>/</span>
                  <span className="text-slate-700 font-semibold">Document Master</span>
                </div>
              </div>

              {/* CARD WITH TABBED NAVIGATION */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* TABS NAVIGATION BAR (Basic Information vs Table) */}
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setDocActiveTab('Basic Information')}
                    className={`flex items-center space-x-2 px-6 py-3 text-xs font-bold transition-colors ${
                      docActiveTab === 'Basic Information'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Basic Information</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocActiveTab('Table')}
                    className={`flex items-center space-x-2 px-6 py-3 text-xs font-bold transition-colors ${
                      docActiveTab === 'Table'
                        ? 'bg-[#1d4ed8] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                </div>

                {/* TAB 1: BASIC INFORMATION FORM (MATCHING SCREENSHOT 3) */}
                {docActiveTab === 'Basic Information' && (
                  <form onSubmit={handleSaveDoc} className="p-6 space-y-5">
                    {/* ROW 0: COURSE SELECTION */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        COURSE / BATCH <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={docForm.course}
                        onChange={(e) => setDocForm({ ...docForm, course: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                      >
                        <option value="">Select Course</option>
                        {courseList.map(c => (
                          <option key={c.id} value={c.title}>
                            {c.title} ({c.exam})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ROW 1: SUBJECT & CHAPTER DROPDOWNS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          SUBJECT <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={docForm.subject}
                          onChange={(e) => setDocForm({ ...docForm, subject: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-slate-800"
                        >
                          <option value="">Select Subject</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Maths">Maths</option>
                          <option value="LR & English">LR & English</option>
                          <option value="Aptitude">Aptitude</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          CHAPTER <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={docForm.chapter}
                          onChange={(e) => setDocForm({ ...docForm, chapter: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-slate-800"
                        >
                          <option value="">Select Chapter</option>
                          <option value="Rotational Motion">Rotational Motion</option>
                          <option value="Alcohols Phenols and Ethers">Alcohols Phenols and Ethers</option>
                          <option value="Integration & Calculus">Integration & Calculus</option>
                          <option value="Electrostatics & Capacitance">Electrostatics & Capacitance</option>
                          <option value="Aldehydes Ketones and Carboxylic Acids">Aldehydes Ketones and Carboxylic Acids</option>
                        </select>
                      </div>
                    </div>

                    {/* ROW 2: DOCUMENT TITLE */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        DOCUMENT / NOTES TITLE <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter DPP / Short Notes / Formula Sheet Title"
                        value={docForm.title}
                        onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-slate-800"
                      />
                    </div>

                    {/* ROW 3: BRIEF DESCRIPTION RICH TEXT EDITOR */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                        BRIEF DESCRIPTION
                      </label>
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 text-slate-600">
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Code"><Code className="w-3.5 h-3.5" /></button>
                          <span className="w-px h-4 bg-slate-300 mx-0.5" />
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Undo"><RotateCcw className="w-3.5 h-3.5" /></button>
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Redo"><RotateCw className="w-3.5 h-3.5" /></button>
                          <span className="w-px h-4 bg-slate-300 mx-0.5" />
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                          <button type="button" className="p-1 hover:bg-slate-200 rounded" title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></button>
                        </div>
                        <textarea
                          rows={4}
                          placeholder="Enter brief summary of document contents and key formulas..."
                          value={docForm.description}
                          onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                          className="w-full p-3 text-xs focus:outline-none text-slate-800 resize-y"
                        />
                        <div className="h-2 bg-[#1e40af] w-full" />
                      </div>
                    </div>

                    {/* ROW 4: DOCUMENT FILE & ORDER NUMBER */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          DOCUMENT PDF FILE
                        </label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setDocForm({ ...docForm, fileName: e.target.files[0].name });
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          ORDER NUMBER
                        </label>
                        <input
                          type="number"
                          placeholder="Enter Order Number"
                          value={docForm.orderNumber}
                          onChange={(e) => setDocForm({ ...docForm, orderNumber: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    {/* ROW 5: ENABLED CHECKBOX */}
                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="checkbox"
                        id="enabledDocCheck"
                        checked={docForm.enabled}
                        onChange={(e) => setDocForm({ ...docForm, enabled: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <label htmlFor="enabledDocCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Enabled &amp; Downloadable
                      </label>
                    </div>

                    {/* SAVE BUTTON */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
                      >
                        {docForm.id ? 'Update Document' : 'Save Document'}
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: TABLE VIEW */}
                {docActiveTab === 'Table' && (
                  <div className="p-6 space-y-4">
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                          FILTER BY COURSE
                        </label>
                        <select
                          value={docCourseFilter}
                          onChange={(e) => setDocCourseFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Courses ({courseList.length})</option>
                          {courseList.map(c => (
                            <option key={c.id} value={c.title}>{c.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                          FILTER BY SUBJECT
                        </label>
                        <select
                          value={docSubjectFilter}
                          onChange={(e) => setDocSubjectFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Subjects</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Maths">Maths</option>
                          <option value="LR & English">LR & English</option>
                          <option value="Aptitude">Aptitude</option>
                        </select>
                      </div>
                    </div>

                    <div className="relative w-full flex items-center">
                      <input
                        type="text"
                        placeholder="Search documents by title, chapter or course..."
                        value={docSearchTerm}
                        onChange={(e) => setDocSearchTerm(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-l-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                      <button
                        type="button"
                        className="px-4 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-r-xl flex items-center justify-center"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                          <tr>
                            <th className="p-3 border-r border-slate-200 w-1/3">DOCUMENT / NOTES</th>
                            <th className="p-3 border-r border-slate-200 w-1/4">COURSE / SUBJECT</th>
                            <th className="p-3 border-r border-slate-200 w-1/4">CHAPTER</th>
                            <th className="p-3 text-center w-1/6">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {docList
                            .filter(d =>
                              (!docCourseFilter || d.course === docCourseFilter) &&
                              (!docSubjectFilter || d.subject === docSubjectFilter) &&
                              (d.title.toLowerCase().includes(docSearchTerm.toLowerCase()) ||
                               (d.chapter && d.chapter.toLowerCase().includes(docSearchTerm.toLowerCase())) ||
                               (d.course && d.course.toLowerCase().includes(docSearchTerm.toLowerCase())))
                            )
                            .map((d) => (
                              <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 border-r border-slate-200 text-slate-800 font-bold">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span>{d.title}</span>
                                  </div>
                                </td>
                                <td className="p-3 border-r border-slate-200 text-slate-600">
                                  <div className="text-[11px] font-bold text-slate-900 truncate max-w-[200px]">{d.course || 'All Courses'}</div>
                                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                                    {d.subject}
                                  </span>
                                </td>
                                <td className="p-3 border-r border-slate-200 text-slate-700 font-medium">
                                  {d.chapter}
                                </td>
                                <td className="p-3 text-center space-x-2">
                                  <button
                                    onClick={() => handleEditDoc(d)}
                                    className="p-1.5 border border-slate-300 hover:border-slate-500 rounded-full text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
                                    title="Edit Document"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDoc(d.id)}
                                    className="p-1.5 border border-rose-200 hover:border-rose-400 rounded-full text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center"
                                    title="Delete Document"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                      <div>
                        Showing 1 to {
                          docList.filter(d =>
                            (!docCourseFilter || d.course === docCourseFilter) &&
                            (!docSubjectFilter || d.subject === docSubjectFilter) &&
                            d.title.toLowerCase().includes(docSearchTerm.toLowerCase())
                          ).length
                        } of {docList.length} entries
                      </div>

                      <div className="flex items-center space-x-1">
                        <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px] disabled:opacity-50">
                          Previous
                        </button>
                        <button className="px-2.5 py-1 bg-[#1d4ed8] text-white font-bold rounded text-[11px]">
                          1
                        </button>
                        <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px]">
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COUPONS (MATCHING SCREENSHOT 4 FOR COUPON LIST) */}
          {activeTab === 'Coupon' && (
            <div className="space-y-6">
              {/* Header Title & Top Right Add Coupon Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Coupons</h1>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span>/</span>
                    <span className="text-slate-700 font-semibold">Coupon List</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCouponForm({
                      id: null,
                      code: '',
                      validFrom: '',
                      expiryDate: '',
                      discount: '',
                      usageAllowed: '10',
                      usageUsed: '0'
                    });
                    setCouponModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs rounded shadow-sm transition-colors self-start sm:self-auto"
                >
                  Add Coupon
                </button>
              </div>

              {/* CARD CONTAINER MATCHING SCREENSHOT 4 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                {/* SEARCH BAR WITH ATTACHED BLUE SEARCH BUTTON */}
                <div className="relative w-full flex items-center">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={couponSearchTerm}
                    onChange={(e) => setCouponSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-l text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-r flex items-center justify-center"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* TABLE MATCHING SCREENSHOT 4 */}
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3 border-r border-slate-200">
                          <div className="flex items-center justify-between">
                            <span>COUPON</span>
                            <span className="text-[10px] text-slate-400">⇅</span>
                          </div>
                        </th>
                        <th className="p-3 border-r border-slate-200">
                          <div className="flex items-center justify-between">
                            <span>VALID FROM</span>
                            <span className="text-[10px] text-slate-400">⇅</span>
                          </div>
                        </th>
                        <th className="p-3 border-r border-slate-200">
                          <div className="flex items-center justify-between">
                            <span>EXPIRY DATE</span>
                            <span className="text-[10px] text-slate-400">⇅</span>
                          </div>
                        </th>
                        <th className="p-3 border-r border-slate-200">
                          <div className="flex items-center justify-between">
                            <span>DISCOUNT</span>
                            <span className="text-[10px] text-slate-400">⇅</span>
                          </div>
                        </th>
                        <th className="p-3 border-r border-slate-200">
                          <div className="flex items-center justify-between">
                            <span>USAGE ALLOWED / USED</span>
                            <span className="text-[10px] text-slate-400">⇅</span>
                          </div>
                        </th>
                        <th className="p-3 text-center">
                          <div className="inline-flex items-center space-x-1">
                            <span>ACTION</span>
                            <span className="text-[10px] text-slate-400">⇅</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {couponList
                        .filter(c => c.code.toLowerCase().includes(couponSearchTerm.toLowerCase()))
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 border-r border-slate-200 text-slate-900 font-semibold">
                              {c.code}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-slate-600">
                              {c.validFrom}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-slate-600">
                              {c.expiryDate}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-slate-800 font-medium">
                              {c.discount}
                            </td>
                            <td className="p-3 border-r border-slate-200 text-slate-600">
                              {c.usage}
                            </td>
                            <td className="p-3 text-center space-x-2">
                              <button
                                onClick={() => handleEditCoupon(c)}
                                className="p-1.5 border border-slate-300 hover:border-slate-500 rounded-full text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
                                title="Edit Coupon"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(c.id)}
                                className="p-1.5 border border-rose-200 hover:border-rose-400 rounded-full text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center"
                                title="Delete Coupon"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* TABLE FOOTER / PAGINATION MATCHING SCREENSHOT 4 */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                  <div>
                    Showing 1 to {couponList.filter(c => c.code.toLowerCase().includes(couponSearchTerm.toLowerCase())).length} of {couponList.length} entries
                  </div>

                  <div className="flex items-center space-x-1">
                    <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px] disabled:opacity-50">
                      Previous
                    </button>
                    <button className="px-2.5 py-1 bg-[#1d4ed8] text-white font-bold rounded text-[11px]">
                      1
                    </button>
                    <button className="px-2.5 py-1 text-slate-400 border border-slate-200 rounded text-[11px]">
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* MODAL FOR ADD / EDIT COUPON */}
              {couponModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 text-sm">
                        {couponForm.id ? 'Edit Coupon' : 'Add Coupon'}
                      </h3>
                      <button onClick={() => setCouponModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveCoupon} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code*</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BITS2026"
                          value={couponForm.code}
                          onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Valid From</label>
                          <input
                            type="text"
                            placeholder="e.g. 01/Aug/2026"
                            value={couponForm.validFrom}
                            onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                          <input
                            type="text"
                            placeholder="e.g. 30/Nov/2026"
                            value={couponForm.expiryDate}
                            onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Value</label>
                          <input
                            type="text"
                            placeholder="e.g. 100% or 1500"
                            value={couponForm.discount}
                            onChange={(e) => setCouponForm({ ...couponForm, discount: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Usage Limit</label>
                          <input
                            type="text"
                            placeholder="e.g. 10"
                            value={couponForm.usageAllowed}
                            onChange={(e) => setCouponForm({ ...couponForm, usageAllowed: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setCouponModalOpen(false)}
                          className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#1d4ed8] text-white font-semibold text-xs rounded hover:bg-[#1e40af]"
                        >
                          {couponForm.id ? 'Update Coupon' : 'Save Coupon'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 10. BLOG MASTER */}
          {activeTab === 'Blog Master' && (
            <div className="space-y-6">
              {/* Header & Breadcrumb */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Blog</h2>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                    <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setActiveTab('Dashboard')}>Home</span>
                    <span>/</span>
                    <span>Blog Master</span>
                  </div>
                </div>
              </div>

              {/* Main Card Container */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {/* Tabs Header Bar */}
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setBlogActiveTab('Basic Information')}
                    className={`flex items-center space-x-2 px-6 py-3 text-xs font-semibold transition-all ${
                      blogActiveTab === 'Basic Information'
                        ? 'bg-[#0052cc] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80"></span>
                    <span>Basic Information</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlogActiveTab('Table')}
                    className={`flex items-center space-x-2 px-6 py-3 text-xs font-semibold transition-all ${
                      blogActiveTab === 'Table'
                        ? 'bg-[#0052cc] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80"></span>
                    <span>Table</span>
                  </button>
                </div>

                {/* TAB 1: BASIC INFORMATION (FORM VIEW) */}
                {blogActiveTab === 'Basic Information' && (
                  <form onSubmit={handleSaveBlog} className="p-6 space-y-6">
                    {/* EXAM */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                        EXAM
                      </label>
                      <div className="relative">
                        <select
                          value={blogForm.exam}
                          onChange={(e) => setBlogForm({ ...blogForm, exam: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none pr-8 cursor-pointer"
                        >
                          <option value="BITSAT">BITSAT Exam</option>
                          <option value="JEE Main">JEE Main</option>
                          <option value="JEE Advanced">JEE Advanced</option>
                          <option value="VITEEE">VITEEE</option>
                          <option value="MET">MET</option>
                          <option value="COMEDK">COMEDK</option>
                          <option value="General">General / Other</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* BLOG TITLE */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                        BLOG TITLE
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter Blog Title"
                        value={blogForm.title}
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          const autoSlug = blogForm.id ? blogForm.slug : newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                          setBlogForm({
                            ...blogForm,
                            title: newTitle,
                            slug: autoSlug,
                            metaTitle: blogForm.metaTitle || newTitle
                          });
                        }}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    {/* BLOG DESCRIPTION WITH TOOLBAR */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                        BLOG DESCRIPTION
                      </label>
                      <div className="border border-slate-300 rounded overflow-hidden shadow-xs">
                        {/* Editor Toolbar */}
                        <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 text-slate-700 text-xs">
                          <div className="flex items-center space-x-1 border-r border-slate-300 pr-2 mr-1">
                            <button type="button" title="Source Code" className="p-1 hover:bg-slate-200 rounded text-slate-600 text-[11px] font-mono">Source</button>
                            <button type="button" title="Undo" className="p-1 hover:bg-slate-200 rounded text-slate-600">↺</button>
                            <button type="button" title="Redo" className="p-1 hover:bg-slate-200 rounded text-slate-600">↻</button>
                          </div>
                          
                          <div className="flex items-center space-x-1 border-r border-slate-300 pr-2 mr-1">
                            <button type="button" onClick={() => setBlogForm(f => ({ ...f, description: f.description + '<b></b>' }))} title="Bold" className="p-1 font-bold hover:bg-slate-200 rounded px-1.5">B</button>
                            <button type="button" onClick={() => setBlogForm(f => ({ ...f, description: f.description + '<i></i>' }))} title="Italic" className="p-1 italic hover:bg-slate-200 rounded px-1.5">I</button>
                            <button type="button" onClick={() => setBlogForm(f => ({ ...f, description: f.description + '<u></u>' }))} title="Underline" className="p-1 underline hover:bg-slate-200 rounded px-1.5">U</button>
                            <button type="button" onClick={() => setBlogForm(f => ({ ...f, description: f.description + '<s></s>' }))} title="Strikethrough" className="p-1 line-through hover:bg-slate-200 rounded px-1.5">S</button>
                          </div>

                          <div className="flex items-center space-x-1 border-r border-slate-300 pr-2 mr-1">
                            <button type="button" title="Align Left" className="p-1 hover:bg-slate-200 rounded">≡</button>
                            <button type="button" title="Align Center" className="p-1 hover:bg-slate-200 rounded">≡</button>
                            <button type="button" title="Align Right" className="p-1 hover:bg-slate-200 rounded">≡</button>
                          </div>

                          <div className="flex items-center space-x-1 border-r border-slate-300 pr-2 mr-1">
                            <button type="button" title="Insert Link" className="p-1 hover:bg-slate-200 rounded text-blue-600 font-semibold">🔗</button>
                            <button type="button" title="Insert Image" className="p-1 hover:bg-slate-200 rounded">🖼️</button>
                            <button type="button" title="Insert Table" className="p-1 hover:bg-slate-200 rounded">▦</button>
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                            <span>Font: Standard</span>
                            <span>Size: Normal</span>
                          </div>
                        </div>

                        {/* Textarea Area */}
                        <textarea
                          rows={8}
                          placeholder="Enter Blog Description here..."
                          value={blogForm.description}
                          onChange={(e) => setBlogForm({ ...blogForm, description: e.target.value })}
                          className="w-full p-3 text-xs text-slate-800 focus:outline-none resize-y min-h-[160px]"
                        />
                        <div className="h-1 bg-[#0052cc]"></div>
                      </div>
                    </div>

                    {/* SUBSECTION: DETAILS */}
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase">
                        DETAILS
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Blog Image Part Small */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-slate-600">
                            Blog Image Part Small
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setBlogForm({ ...blogForm, smallImage: url });
                              }
                            }}
                            className="w-full text-xs text-slate-500 border border-slate-300 rounded file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                          />
                          {blogForm.smallImage && (
                            <img src={blogForm.smallImage} alt="Small preview" className="h-12 w-auto object-cover rounded border border-slate-200 mt-1" />
                          )}
                        </div>

                        {/* Blog Image Part Large */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-semibold text-slate-600">
                            Blog Image Part Large
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setBlogForm({ ...blogForm, largeImage: url });
                              }
                            }}
                            className="w-full text-xs text-slate-500 border border-slate-300 rounded file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                          />
                          {blogForm.largeImage && (
                            <img src={blogForm.largeImage} alt="Large preview" className="h-12 w-auto object-cover rounded border border-slate-200 mt-1" />
                          )}
                        </div>
                      </div>

                      {/* Alt Tag Description Small */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Alt Tag Description Small
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Alt Tag Description Small"
                          value={blogForm.altSmall}
                          onChange={(e) => setBlogForm({ ...blogForm, altSmall: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      {/* Alt Tag Description Large */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Alt Tag Description Large
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Alt Tag Description Large"
                          value={blogForm.altLarge}
                          onChange={(e) => setBlogForm({ ...blogForm, altLarge: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      {/* Blog Slug */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Blog Slug
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter Blog Slug"
                          value={blogForm.slug}
                          onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      {/* Blog Meta Title */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Blog Meta Title
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Blog Title"
                          value={blogForm.metaTitle}
                          onChange={(e) => setBlogForm({ ...blogForm, metaTitle: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      {/* Blog Meta Description */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-slate-600">
                          Blog Meta Description
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Description"
                          value={blogForm.metaDescription}
                          onChange={(e) => setBlogForm({ ...blogForm, metaDescription: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      {/* Publish Checkbox */}
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="checkbox"
                          id="blogPublishCheck"
                          checked={blogForm.published}
                          onChange={(e) => setBlogForm({ ...blogForm, published: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="blogPublishCheck" className="text-xs text-slate-700 cursor-pointer select-none">
                          Publish
                        </label>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 flex items-center space-x-3">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#0052cc] hover:bg-[#003e99] text-white font-semibold text-xs rounded transition-colors shadow-sm"
                      >
                        {blogForm.id ? 'Update Blog' : 'Save'}
                      </button>
                      {blogForm.id && (
                        <button
                          type="button"
                          onClick={() => {
                            handleAddNewBlog();
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded transition-colors"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* TAB 2: TABLE VIEW */}
                {blogActiveTab === 'Table' && (
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                      {/* Search */}
                      <div className="flex items-center space-x-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                          <input
                            type="text"
                            placeholder="Search by title, exam, or slug..."
                            value={blogSearchTerm}
                            onChange={(e) => setBlogSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 pl-8"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>
                        {blogSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setBlogSearchTerm('')}
                            className="text-xs text-slate-500 hover:text-slate-700 underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Add Blog Button */}
                      <button
                        type="button"
                        onClick={handleAddNewBlog}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-[#0052cc] hover:bg-[#003e99] text-white text-xs font-semibold rounded shadow-sm transition-colors w-full md:w-auto justify-center"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Blog</span>
                      </button>
                    </div>

                    {/* Table */}
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="p-3 w-12 text-center">#</th>
                            <th className="p-3">Exam</th>
                            <th className="p-3">Blog Title</th>
                            <th className="p-3">Slug</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center w-28">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {blogList
                            .filter(b => 
                              b.title.toLowerCase().includes(blogSearchTerm.toLowerCase()) ||
                              b.exam.toLowerCase().includes(blogSearchTerm.toLowerCase()) ||
                              b.slug.toLowerCase().includes(blogSearchTerm.toLowerCase())
                            )
                            .map((blog, idx) => (
                              <tr key={blog.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                                <td className="p-3 font-medium text-slate-700">{blog.exam}</td>
                                <td className="p-3 font-semibold text-slate-900 max-w-xs truncate">{blog.title}</td>
                                <td className="p-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">{blog.slug}</td>
                                <td className="p-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    blog.published !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {blog.published !== false ? 'Published' : 'Draft'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleEditBlog(blog)}
                                      title="Edit Blog"
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBlog(blog.id)}
                                      title="Delete Blog"
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={`/blog/${blog.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="View Post"
                                      className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          {blogList.filter(b => 
                              b.title.toLowerCase().includes(blogSearchTerm.toLowerCase()) ||
                              b.exam.toLowerCase().includes(blogSearchTerm.toLowerCase()) ||
                              b.slug.toLowerCase().includes(blogSearchTerm.toLowerCase())
                            ).length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-500">
                                No blog posts found. Click "Add New Blog" to create one.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination / Item Count footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                      <span>
                        Showing 1 to {blogList.length} of {blogList.length} entries
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 11. SEO PAGE MASTER */}
          {activeTab === 'SEO Page' && (
            <div className="space-y-6">
              {/* Header & Breadcrumb */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">SEO Page</h2>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                    <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setActiveTab('Dashboard')}>Home</span>
                    <span>/</span>
                    <span>SEO Page</span>
                  </div>
                </div>
              </div>

              {/* Top Card: SEO Page Form */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Banner Tab */}
                <div className="border-b border-slate-200 bg-slate-50/50">
                  <div className="inline-block bg-[#0052cc] text-white px-6 py-2.5 text-xs font-semibold">
                    SEO Page
                  </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveSeo} className="p-6 space-y-4">
                  {/* Page Name */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Page Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Page Name"
                      value={seoForm.pageName}
                      onChange={(e) => setSeoForm({ ...seoForm, pageName: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Page Meta Title */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Page Meta Title
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Page Meta Title"
                      value={seoForm.metaTitle}
                      onChange={(e) => setSeoForm({ ...seoForm, metaTitle: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Page Meta Description */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Page Meta Description
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Page Meta Description"
                      value={seoForm.metaDescription}
                      onChange={(e) => setSeoForm({ ...seoForm, metaDescription: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Update Button */}
                  <div className="pt-2 flex items-center space-x-3">
                    <button
                      type="submit"
                      className="px-5 py-2 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold text-xs rounded transition-colors"
                    >
                      Update
                    </button>
                    {seoForm.id && (
                      <button
                        type="button"
                        onClick={() => setSeoForm({ id: null, pageName: '', metaTitle: '', metaDescription: '' })}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Bottom Card: Table View */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
                {/* Search Bar */}
                <div className="w-full">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={seoSearchTerm}
                    onChange={(e) => setSeoSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-3">Page Name</th>
                        <th className="p-3 text-right pr-6">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {seoList
                        .filter(s => s.pageName.toLowerCase().includes(seoSearchTerm.toLowerCase()) || s.metaTitle.toLowerCase().includes(seoSearchTerm.toLowerCase()))
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 text-slate-700 font-medium">{item.pageName}</td>
                            <td className="p-3 text-right pr-6">
                              <button
                                type="button"
                                onClick={() => handleEditSeo(item)}
                                title="Edit SEO Details"
                                className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      {seoList.filter(s => s.pageName.toLowerCase().includes(seoSearchTerm.toLowerCase())).length === 0 && (
                        <tr>
                          <td colSpan={2} className="p-6 text-center text-slate-500">
                            No SEO pages found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 12. SITE NOTIFICATION */}
          {activeTab === 'Site Notification' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Site Notification</h2>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                    <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setActiveTab('Dashboard')}>Home</span>
                    <span>/</span>
                    <span>Notification</span>
                    <span>/</span>
                    <span>Site Notification</span>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/50">
                  <div className="inline-block bg-[#0052cc] text-white px-6 py-2.5 text-xs font-semibold">
                    Broadcast Site Notification
                  </div>
                </div>
                <form onSubmit={handleSendSiteNotif} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">Notification Title</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Title"
                      value={siteNotifForm.title}
                      onChange={(e) => setSiteNotifForm({ ...siteNotifForm, title: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">Notification Message</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter notification message to broadcast..."
                      value={siteNotifForm.message}
                      onChange={(e) => setSiteNotifForm({ ...siteNotifForm, message: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">Target Audience</label>
                    <select
                      value={siteNotifForm.target}
                      onChange={(e) => setSiteNotifForm({ ...siteNotifForm, target: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 flex cursor-pointer"
                    >
                      <option value="All Visitors">All Visitors & Enrolled Students</option>
                      <option value="Registered Users Only">Registered Users Only</option>
                      <option value="Enrolled Course Students">Enrolled Course Students</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0052cc] hover:bg-[#003e99] text-white font-semibold text-xs rounded transition-colors"
                  >
                    Send Site Notification
                  </button>
                </form>
              </div>

              {/* Sent Notifications History */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Sent Site Notifications</h3>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-3">#</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Message</th>
                        <th className="p-3">Target</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {siteNotifications.map((notif, idx) => (
                        <tr key={notif.id} className="hover:bg-slate-50/70">
                          <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-900">{notif.title}</td>
                          <td className="p-3 text-slate-600 max-w-md truncate">{notif.message}</td>
                          <td className="p-3 text-slate-700">{notif.target}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{notif.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 13. STUDENT NOTIFICATION */}
          {activeTab === 'Student Notification' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Student Notification</h2>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                    <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setActiveTab('Dashboard')}>Home</span>
                    <span>/</span>
                    <span>Notification</span>
                    <span>/</span>
                    <span>Student Notification</span>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/50">
                  <div className="inline-block bg-[#0052cc] text-white px-6 py-2.5 text-xs font-semibold">
                    Send Student Direct Notification
                  </div>
                </div>
                <form onSubmit={handleSendStudentNotif} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">Student Email / ID (Leave blank for all students)</label>
                    <input
                      type="email"
                      placeholder="e.g. student@gmail.com"
                      value={studentNotifForm.studentEmail}
                      onChange={(e) => setStudentNotifForm({ ...studentNotifForm, studentEmail: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">Notification Title</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter Notification Title"
                      value={studentNotifForm.title}
                      onChange={(e) => setStudentNotifForm({ ...studentNotifForm, title: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600">Message Content</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter detailed notification content..."
                      value={studentNotifForm.message}
                      onChange={(e) => setStudentNotifForm({ ...studentNotifForm, message: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0052cc] hover:bg-[#003e99] text-white font-semibold text-xs rounded transition-colors"
                  >
                    Send to Student
                  </button>
                </form>
              </div>

              {/* Sent Student Notifications History */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Sent Student Notifications Log</h3>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-3">#</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Sent At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentNotifications.map((notif, idx) => (
                        <tr key={notif.id} className="hover:bg-slate-50/70">
                          <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-900">{notif.studentName}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{notif.studentEmail}</td>
                          <td className="p-3 text-slate-800 font-medium">{notif.title}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {notif.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{notif.sentAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 14. STUDENT INVOICES */}
          {activeTab === 'Student Invoices' && (
            <div className="space-y-6">
              {/* Header & Breadcrumbs */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Invoice List</h2>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                    <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setActiveTab('Dashboard')}>Home</span>
                    <span>-</span>
                    <span>Invoice List</span>
                  </div>
                </div>
              </div>

              {/* Main Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
                {/* Criteria Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Criteria</label>
                  <div className="relative">
                    <select
                      value={invoiceCriteria}
                      onChange={(e) => setInvoiceCriteria(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 appearance-none pr-8 cursor-pointer"
                    >
                      <option value="All">All</option>
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Search Bar with Blue Search Button */}
                <div className="flex items-center space-x-0 border border-slate-300 rounded overflow-hidden">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                  <button type="button" className="px-4 py-2 bg-[#0052cc] hover:bg-[#003e99] text-white transition-colors flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* Table */}
                <div className="border-t border-slate-100 pt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Invoice Date</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Coupon</th>
                        <th className="p-3">Invoice Amount</th>
                        <th className="p-3">Invoice Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceList
                        .filter(inv => invoiceCriteria === 'All' || inv.invoiceStatus === invoiceCriteria)
                        .filter(inv => 
                          inv.invoiceNo.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                          inv.studentName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                          inv.coupon.toLowerCase().includes(invoiceSearch.toLowerCase())
                        )
                        .map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/70">
                            <td className="p-3 font-semibold text-slate-900 font-mono">{inv.invoiceNo}</td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">{inv.invoiceDate}</td>
                            <td className="p-3 font-medium text-slate-800">{inv.studentName}</td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">{inv.coupon}</td>
                            <td className="p-3 font-semibold text-slate-900">{inv.invoiceAmount}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                inv.invoiceStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                inv.invoiceStatus === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {inv.invoiceStatus}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button type="button" title="View Invoice" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Pagination */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Showing 1 to {invoiceList.length} of {invoiceList.length} entries</span>
                  <div className="flex items-center space-x-1">
                    <button type="button" className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-200">Previous</button>
                    <button type="button" className="px-3 py-1 bg-[#0052cc] text-white font-semibold rounded text-xs">1</button>
                    <button type="button" className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-200">Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 15. STUDENT ATTEMPTED TEST */}
          {activeTab === 'Student Attempted Test' && (
            <div className="space-y-6">
              {/* Header & Breadcrumbs */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Attempted Test</h2>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                    <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setActiveTab('Dashboard')}>Home</span>
                    <span>-</span>
                    <span>Attempted Test</span>
                  </div>
                </div>
              </div>

              {/* Main Card */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
                {/* Header row inside card */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-700">Your performances</h3>
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={attemptedTestSearch}
                      onChange={(e) => setAttemptedTestSearch(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 pr-8"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Course Name</th>
                        <th className="p-3">Exam Name</th>
                        <th className="p-3">Marks</th>
                        <th className="p-3">Attempt date</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attemptedTestList
                        .filter(t =>
                          t.studentName.toLowerCase().includes(attemptedTestSearch.toLowerCase()) ||
                          t.courseName.toLowerCase().includes(attemptedTestSearch.toLowerCase()) ||
                          t.examName.toLowerCase().includes(attemptedTestSearch.toLowerCase())
                        )
                        .map((test) => (
                          <tr key={test.id} className="hover:bg-slate-50/70">
                            <td className="p-3 font-semibold text-slate-900">{test.studentName}</td>
                            <td className="p-3 text-slate-700 font-medium">{test.courseName}</td>
                            <td className="p-3 text-slate-700 font-medium">{test.examName}</td>
                            <td className="p-3 font-bold text-blue-600 font-mono">{test.marks}</td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">{test.attemptDate}</td>
                            <td className="p-3 text-center">
                              <button type="button" title="View Scorecard" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Pagination */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span>Showing 1 to 10 of 57 entries</span>
                  <div className="flex items-center space-x-1">
                    <button type="button" className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-200">Previous</button>
                    <button type="button" className="px-3 py-1 bg-[#0052cc] text-white font-semibold rounded text-xs">1</button>
                    <button type="button" className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-200">2</button>
                    <button type="button" className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-200">Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 16. STUDENT DOUBTS */}
          {activeTab === 'Student Doubt' && (
            <div className="space-y-6">
              {/* Header & Breadcrumbs */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Doubts</h2>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                    <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setActiveTab('Dashboard')}>Home</span>
                    <span>-</span>
                    <span>Doubts</span>
                  </div>
                </div>
              </div>

              {/* Search input */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search doubts by student, topic, or question..."
                    value={doubtSearch}
                    onChange={(e) => setDoubtSearch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 pl-8"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              {/* Doubt cards list matching Screenshot 3 */}
              <div className="space-y-4">
                {doubtList
                  .filter(d => 
                    d.doubtText.toLowerCase().includes(doubtSearch.toLowerCase()) ||
                    d.studentName.toLowerCase().includes(doubtSearch.toLowerCase()) ||
                    d.module.toLowerCase().includes(doubtSearch.toLowerCase())
                  )
                  .map((doubt) => (
                    <div key={doubt.id} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
                      {/* Doubt text */}
                      <p className="text-xs text-slate-800 leading-relaxed font-sans">
                        {doubt.doubtText}
                      </p>

                      {/* View button */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedDoubt(doubt)}
                          className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#003e99] text-white text-xs font-semibold rounded shadow-xs transition-colors"
                        >
                          VIEW
                        </button>
                      </div>

                      {/* Reply preview if answered */}
                      {doubt.reply && (
                        <div className="bg-blue-50/60 border-l-2 border-blue-600 p-2.5 text-xs text-slate-700 rounded-r">
                          <span className="font-semibold text-blue-700">Answer: </span>
                          {doubt.reply}
                        </div>
                      )}

                      {/* Grey Footer metadata banner matching screenshot */}
                      <div className="bg-slate-100/90 rounded px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="font-medium text-slate-700">{doubt.studentName}</span>
                          </span>
                          <span>|</span>
                          <span className="flex items-center space-x-1">
                            <BookOpen className="w-3 h-3 text-slate-400" />
                            <span>{doubt.module}</span>
                          </span>
                          <span>|</span>
                          <span className="font-mono text-[10px] text-slate-500">{doubt.date}</span>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            doubt.status === 'Answered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {doubt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Reply Modal */}
              {selectedDoubt && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-slate-900 text-sm">Respond to Doubt</h3>
                      <button type="button" onClick={() => setSelectedDoubt(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs text-slate-800 space-y-1">
                      <p className="font-semibold text-slate-900">{selectedDoubt.studentName}:</p>
                      <p>{selectedDoubt.doubtText}</p>
                    </div>
                    <form onSubmit={handleReplyDoubt} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Your Answer / Resolution</label>
                        <textarea
                          rows={4}
                          required
                          placeholder="Type answer or solution details here..."
                          value={doubtReplyInput}
                          onChange={(e) => setDoubtReplyInput(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button type="button" onClick={() => setSelectedDoubt(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded hover:bg-slate-200">
                          Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-[#0052cc] text-white font-semibold text-xs rounded hover:bg-[#003e99]">
                          Submit Answer
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COURSE CONTENT ASSIGNMENT TAB */}
          {activeTab === 'Course Content Assignment' && (
            <div className="space-y-6 animate-in fade-in">
              <CourseContentAssignmentView />
            </div>
          )}

          {/* TEST SERIES MASTER TAB */}
          {activeTab === 'Test Series Master' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Test Series Master</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Central repository of CBT examination test papers and mock series.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('Course Content Assignment')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Assign to Courses</span>
                  </button>
                  <Link
                    to="/admin/tests"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Manage CBT Question Papers →
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Reusable CBT Test Series:</span> Create test series once in Test Series Master. Tests can be linked across BITSAT, JEE Main, COMEDK, and other courses without duplicating question sets.
                  </div>
                </div>
                <div className="mt-6">
                  <CourseContentAssignmentView defaultTab="testSeries" />
                </div>
              </div>
            </div>
          )}

          {/* LIVE SESSION MANAGEMENT TAB */}
          {activeTab === 'Live Session Management' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Live Session Management</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Schedule interactive masterclasses and link them to multiple courses.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('Course Content Assignment')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Assign to Courses</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Multi-Course Live Classes:</span> Schedule live sessions with date, time, subject, and meeting URL once. Link the session to any course in Course Content Assignment to grant enrolled students access.
                  </div>
                </div>
                <div className="mt-6">
                  <CourseContentAssignmentView defaultTab="liveSessions" />
                </div>
              </div>
            </div>
          )}

          {/* FALLBACK FOR OTHER TABS */}
          {!['Exam Master', 'Subject Master', 'Chapter Master', 'Chapter Topic Master', 'Objective Question', 'Numerical Question', 'Course Master', 'Course Content Assignment', 'Test Series Master', 'Live Session Management', 'Video Master', 'Document Master', 'Coupon', 'Blog Master', 'SEO Page', 'Site Notification', 'Student Notification', 'Student Invoices', 'Student Attempted Test', 'Student Doubt', 'Dashboard'].includes(activeTab) && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">{activeTab} Management</h3>
              <p className="text-slate-500 text-xs">
                Manage settings and data entries for {activeTab}.
              </p>
              <button
                onClick={() => setActiveTab('Dashboard')}
                className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-lg"
              >
                Back to Dashboard
              </button>
            </div>
          )}

        </main>

      </div>

      {/* MODAL FOR ADD / EDIT COURSE */}
      {courseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {courseForm.id ? 'Edit Course' : 'Add New Course'}
              </h3>
              <button onClick={() => setCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Title*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BITSAT 2026 Crash Course"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹)*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14,999"
                  value={courseForm.price}
                  onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1d4ed8] text-white font-semibold text-xs rounded hover:bg-[#1e40af]"
                >
                  {courseForm.id ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
