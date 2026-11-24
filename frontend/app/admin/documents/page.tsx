'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Layers,
  UploadCloud,
  FileCheck,
  Tag,
  GraduationCap,
  ClipboardList,
  FolderOpen,
  Eye,
  FileUp,
  X,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { SecurePdfViewer } from '@/components/classroom/SecurePdfViewer';
import { apiClient } from '@/lib/apiClient';

interface DocumentItem {
  id: number;
  title: string;
  description?: string;
  category?: string;
  courseId?: number;
  courseTitle?: string;
  subjectId?: number;
  subject: string;
  chapterId?: number;
  chapter: string;
  topicId?: number;
  topicName?: string;
  fileType: 'PDF' | 'DOC' | 'DOCX';
  fileUrl: string;
  storedFilename?: string;
  originalFilename?: string;
  fileSizeBytes?: string;
  pageCount?: number;
  isFreePreview?: boolean;
  allowDownload?: boolean;
  status: 'Published' | 'Draft' | 'Archived';
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
}

interface CourseOption {
  id: number;
  title: string;
}

interface SubjectOption {
  id: number;
  subjectName: string;
}

interface ChapterOption {
  id: number;
  courseId: number;
  subjectId: number;
  chapterName: string;
}

interface TopicOption {
  id: number;
  chapterId: number;
  topicName: string;
}

const CATEGORIES = [
  'Study Notes',
  'Lecture Notes',
  'Chapter Notes',
  'Practice Worksheets',
  'Formula Sheet',
  'Mind Map',
  'DPP',
  'Previous Year Papers',
  'Sample Papers',
  'Answer Keys',
  'Solutions',
  'Reference Materials',
  'Assignments',
  'Revision Notes',
  'Handbook',
  'Other Resources',
];

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('none');
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [pageCount, setPageCount] = useState<number>(10);
  const [status, setStatus] = useState<'Published' | 'Draft' | 'Archived'>('Published');
  const [allowDownload, setAllowDownload] = useState<boolean>(true);
  const [isFreePreview, setIsFreePreview] = useState<boolean>(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete State
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast / Feedback
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [docsRes, coursesRes, subsRes, chapsRes, topsRes] = await Promise.all([
        apiClient('/api/admin/documents'),
        apiClient('/api/admin/courses'),
        apiClient('/api/admin/subjects'),
        apiClient('/api/admin/chapters'),
        apiClient('/api/admin/topics'),
      ]);

      if (docsRes.ok) {
        const j = await docsRes.json();
        if (j.success && Array.isArray(j.data)) setDocuments(j.data);
      }
      if (coursesRes.ok) {
        const j = await coursesRes.json();
        if (j.success && Array.isArray(j.data)) setCourses(j.data);
      }
      if (subsRes.ok) {
        const j = await subsRes.json();
        if (j.success && Array.isArray(j.data)) setSubjects(j.data);
      }
      if (chapsRes.ok) {
        const j = await chapsRes.json();
        if (j.success && Array.isArray(j.data)) setChapters(j.data);
      }
      if (topsRes.ok) {
        const j = await topsRes.json();
        if (j.success && Array.isArray(j.data)) setTopics(j.data);
      }
    } catch (err) {
      console.error('[AdminDocuments] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered dropdown options based on selected parent hierarchy
  const availableSubjectsForCourse = selectedCourseId
    ? subjects.filter((s) => {
        const courseChaps = chapters.filter((c) => String(c.courseId) === String(selectedCourseId));
        return courseChaps.some((c) => String(c.subjectId) === String(s.id));
      })
    : subjects;

  const availableChaptersForSelection = selectedCourseId && selectedSubjectId
    ? chapters.filter(
        (c) =>
          String(c.courseId) === String(selectedCourseId) &&
          String(c.subjectId) === String(selectedSubjectId)
      )
    : [];

  const availableTopicsForSelection = selectedChapterId
    ? topics.filter((t) => String(t.chapterId) === String(selectedChapterId))
    : [];

  // Reset child selectors when parent selector changes in modal
  const handleCourseChange = (cId: string) => {
    setSelectedCourseId(cId);
    setSelectedSubjectId('');
    setSelectedChapterId('');
    setSelectedTopicId('none');
  };

  const handleSubjectChange = (sId: string) => {
    setSelectedSubjectId(sId);
    setSelectedChapterId('');
    setSelectedTopicId('none');
  };

  const handleChapterChange = (chId: string) => {
    setSelectedChapterId(chId);
    setSelectedTopicId('none');
  };

  const openCreateModal = () => {
    setEditingDoc(null);
    setTitle('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setSelectedCourseId(courses[0] ? String(courses[0].id) : '');
    setSelectedSubjectId('');
    setSelectedChapterId('');
    setSelectedTopicId('none');
    setDisplayOrder(documents.length + 1);
    setPageCount(10);
    setStatus('Published');
    setAllowDownload(true);
    setIsFreePreview(false);
    setSelectedFile(null);
    setFormError(null);
    setUploadProgress(null);
    setIsModalOpen(true);
  };

  const openEditModal = (d: DocumentItem) => {
    setEditingDoc(d);
    setTitle(d.title);
    setDescription(d.description || '');
    setCategory(d.category || CATEGORIES[0]);
    setSelectedCourseId(d.courseId ? String(d.courseId) : (courses[0] ? String(courses[0].id) : ''));
    setSelectedSubjectId(d.subjectId ? String(d.subjectId) : '');
    setSelectedChapterId(d.chapterId ? String(d.chapterId) : '');
    setSelectedTopicId(d.topicId ? String(d.topicId) : 'none');
    setDisplayOrder(d.displayOrder || 1);
    setPageCount(d.pageCount || 10);
    setStatus(d.status || 'Published');
    setAllowDownload(d.allowDownload !== undefined ? d.allowDownload : true);
    setIsFreePreview(Boolean(d.isFreePreview));
    setSelectedFile(null); // Optional replacement
    setFormError(null);
    setUploadProgress(null);
    setIsModalOpen(true);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setFormError(null);
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setFormError('Only PDF files are supported.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setFormError('File size exceeds 25MB limit.');
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Document title is required.');
      return;
    }
    if (!selectedCourseId) {
      setFormError('Please select a Course.');
      return;
    }
    if (!selectedSubjectId) {
      setFormError('Please select a Subject.');
      return;
    }
    if (!selectedChapterId) {
      setFormError('Please select a Chapter.');
      return;
    }
    if (!editingDoc && !selectedFile) {
      setFormError('Please select or drop a PDF file to upload.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(20);

    try {
      const url = editingDoc ? `/api/admin/documents/${editingDoc.id}` : '/api/admin/documents';
      const method = editingDoc ? 'PUT' : 'POST';

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category.trim());
      formData.append('courseId', selectedCourseId);
      formData.append('subjectId', selectedSubjectId);
      formData.append('chapterId', selectedChapterId);
      if (selectedTopicId && selectedTopicId !== 'none') {
        formData.append('topicId', selectedTopicId);
      }
      formData.append('displayOrder', String(displayOrder));
      formData.append('pageCount', String(pageCount));
      formData.append('status', status);
      formData.append('allowDownload', String(allowDownload));
      formData.append('isFreePreview', String(isFreePreview));

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      setUploadProgress(50);

      const res = await apiClient(url, {
        method,
        body: formData,
      });

      setUploadProgress(85);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save document.');
      }

      setUploadProgress(100);
      setIsModalOpen(false);
      setSuccessFeedback(editingDoc ? 'Document updated successfully.' : 'New document uploaded successfully.');
      setTimeout(() => setSuccessFeedback(null), 4000);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving document.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await apiClient(`/api/admin/documents/${doc.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete document.');
      }
      setDeleteConfirmDoc(null);
      setSuccessFeedback(`Document #${doc.id} deleted successfully.`);
      setTimeout(() => setSuccessFeedback(null), 4000);
      await fetchData();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting document.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered documents list
  const filteredDocs = documents.filter((d) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const match =
        d.title.toLowerCase().includes(q) ||
        d.chapter.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        (d.courseTitle && d.courseTitle.toLowerCase().includes(q)) ||
        (d.category && d.category.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (courseFilter !== 'ALL' && String(d.courseId) !== courseFilter) {
      return false;
    }
    if (subjectFilter !== 'ALL' && d.subject.toLowerCase() !== subjectFilter.toLowerCase()) {
      return false;
    }
    if (categoryFilter !== 'ALL' && (d.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter !== 'ALL' && d.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const publishedCount = documents.filter((d) => d.status === 'Published').length;
  const draftCount = documents.filter((d) => d.status === 'Draft').length;
  const totalPages = documents.reduce((sum, d) => sum + (d.pageCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successFeedback && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-lg flex items-center gap-2.5 transition-all">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{successFeedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-indigo-600" />
            Document Master
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Curriculum study materials, formula handbooks, mind maps, and daily practice problem (DPP) PDFs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Documents"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Documents</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{documents.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Published in Classroom</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{publishedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Drafts / In Review</p>
          <p className="text-2xl font-bold text-amber-700 mt-2">{draftCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Total Pages</p>
          <p className="text-2xl font-bold text-indigo-700 mt-2">{totalPages}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents by title, chapter, subject, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Course filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Subject filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.subjectName}>
                {s.subjectName}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" className="mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Loading curriculum documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No documents found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {searchTerm || courseFilter !== 'ALL' || subjectFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filters.'
                : 'Upload your first study material PDF to make it available in the student classroom.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/75 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Document</th>
                  <th className="px-5 py-3.5">Academic Placement</th>
                  <th className="px-4 py-3.5">File Details</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Order</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 line-clamp-1">{doc.title}</p>
                          {doc.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{doc.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                              <Tag className="w-3 h-3 mr-1" />
                              {doc.category || 'Study Material'}
                            </span>
                            {doc.originalFilename && (
                              <span className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]">
                                {doc.originalFilename}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-800 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="line-clamp-1">{doc.courseTitle || `Course #${doc.courseId || 1}`}</span>
                        </p>
                        <p className="text-xs text-gray-600 flex items-center gap-1.5">
                          <ClipboardList className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>{doc.subject}</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-gray-700 font-medium line-clamp-1">{doc.chapter}</span>
                        </p>
                        {doc.topicName && (
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Layers className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="line-clamp-1">{doc.topicName}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {doc.fileType}
                        </span>
                        <p className="text-xs text-gray-500 font-mono">{doc.fileSizeBytes || '—'}</p>
                        <p className="text-[11px] text-gray-400">{doc.pageCount || 10} pages</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          doc.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.status === 'Draft'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">
                      #{doc.displayOrder}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Preview PDF Document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Document"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmDoc(doc)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Upload & Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 transition-all max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileUp className="h-5 w-5 text-indigo-600" />
                {editingDoc ? 'Edit Document & Replace File' : 'Upload Study Material PDF'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* PDF Drag & Drop Zone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  PDF File Attachment {editingDoc ? '(Optional: Leave blank to retain existing file)' : <span className="text-red-500">*</span>}
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : selectedFile
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        validateAndSetFile(e.target.files[0]);
                      }
                    }}
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <FileCheck className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : editingDoc ? (
                    <div className="space-y-1">
                      <UploadCloud className="h-8 w-8 text-indigo-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-gray-700">
                        Current: <span className="font-mono text-indigo-600">{editingDoc.originalFilename || editingDoc.storedFilename}</span>
                      </p>
                      <p className="text-xs text-gray-400">Drag & drop or click to replace with a new PDF (max 25MB)</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="h-8 w-8 text-indigo-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-gray-700">Drag and drop your PDF here, or click to browse</p>
                      <p className="text-xs text-gray-400">PDF documents only • Maximum 25MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Document Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kinematics & Mechanics Formula Handbook"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Academic Hierarchy Cascading Selectors */}
              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  Academic Placement Hierarchy <span className="text-red-500">*</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Course */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">1. Course</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">2. Subject</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      disabled={!selectedCourseId}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Subject...</option>
                      {availableSubjectsForCourse.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chapter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">3. Chapter</label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => handleChapterChange(e.target.value)}
                      disabled={!selectedSubjectId}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Chapter...</option>
                      {availableChaptersForSelection.map((ch) => (
                        <option key={ch.id} value={String(ch.id)}>
                          {ch.chapterName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Topic */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    4. Specific Topic Link <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    disabled={!selectedChapterId}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="none">Chapter-wide Resource (No specific topic)</option>
                    {availableTopicsForSelection.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.topicName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status, Display Order, Page Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Publication Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Published">Published (Classroom Visible)</option>
                    <option value="Draft">Draft (Admin Only)</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estimated Pages</label>
                  <input
                    type="number"
                    min="1"
                    value={pageCount}
                    onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Revision Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of formulas, derivations, or problem sets contained in this PDF..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Processing & Storing PDF...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Permissions & Visibility */}
              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2.5">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Access &amp; Download Permissions
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Allow student file download (Disable for view-only reading in classroom)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFreePreview}
                    onChange={(e) => setIsFreePreview(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Free preview document (Prospective students can read before course enrollment)
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting && <LoadingSpinner size="sm" className="p-0 text-white" />}
                  {editingDoc ? 'Save Document Changes' : 'Upload & Publish PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Delete Document?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Are you sure you want to delete <span className="font-semibold text-gray-800 font-mono">"{deleteConfirmDoc.title}"</span>?
            </p>

            {deleteError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 text-left">
                {deleteError}
              </div>
            )}

            <p className="text-[11px] text-gray-400 mt-3 text-left bg-gray-50 p-2.5 rounded-lg border border-gray-200">
              Note: If students have actively tracked completion for this document, deletion will be blocked to safeguard academic progress integrity.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmDoc(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteConfirmDoc)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isDeleting && <LoadingSpinner size="sm" className="p-0 text-white" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Admin PDF Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 text-white bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{previewDoc.title}</h3>
                  <p className="text-xs text-slate-400">
                    {previewDoc.courseTitle || 'Curriculum'} • {previewDoc.subject} / {previewDoc.chapter}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <SecurePdfViewer
                documentId={previewDoc.id}
                title={previewDoc.title}
                category={previewDoc.category}
                fileSizeBytes={previewDoc.fileSizeBytes}
                pageCount={previewDoc.pageCount}
                streamUrl={`/api/admin/documents/${previewDoc.id}/preview`}
                allowDownload={previewDoc.allowDownload !== false}
                studentName="Administrator"
                courseTitle={previewDoc.courseTitle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
