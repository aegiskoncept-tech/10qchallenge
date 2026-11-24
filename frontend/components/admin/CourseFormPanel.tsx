'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  Save,
  Trash2,
  ArrowLeft,
  Upload,
  FileText,
  Video,
  Layers,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { FormSection, FormField } from './ui/FormComponents';
import { PrimaryButton, SecondaryButton } from './ui/Buttons';
import { RichTextEditor } from './ui/RichTextEditor';
import { apiClient } from '@/lib/apiClient';

export interface CourseFormData {
  id?: number | null;
  title: string;
  shortDescription: string;
  description: string;
  exam: string;
  examId?: number | null;
  originalPrice: string | number;
  discountedPrice: string | number;
  price?: string | number;
  discount?: string;
  expiryDate: string;
  enrolledStudent: string | number;
  displayIndex: string | number;
  additionalDetails: string;
  image: string;
  bannerImage: string;
  altCourseImage: string;
  altBannerImage: string;
  scheduleFile: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  courseLink: string;
  isShowInIndex: boolean;
  isActive: boolean;
  isShowInMentorship: boolean;
  isShowInTestSeries: boolean;
  mentor?: string;
  selectedSubjectIds?: number[];
  rating?: string | number;
  reviewsCount?: number;
}

export interface ExamOption {
  id: number;
  examName: string;
  slug?: string;
  isActive?: boolean;
}

export interface SubjectOption {
  id: number;
  subjectName: string;
  subjectCode?: string;
  isActive?: boolean;
}

export interface CourseFormPanelProps {
  initialData?: Partial<CourseFormData> | null;
  mode: 'create' | 'edit';
  exams?: ExamOption[];
  subjects?: SubjectOption[];
  onSave: (data: CourseFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<{ success: boolean; error?: string; dependencies?: any }>;
  onCancel: () => void;
  assignedVideosCount?: number;
  assignedDocsCount?: number;
}

export const CourseFormPanel: React.FC<CourseFormPanelProps> = ({
  initialData,
  mode,
  exams: initialExams = [],
  subjects: initialSubjects = [],
  onSave,
  onDelete,
  onCancel,
  assignedVideosCount = 0,
  assignedDocsCount = 0,
}) => {
  const [exams, setExams] = useState<ExamOption[]>(initialExams);
  const [subjects, setSubjects] = useState<SubjectOption[]>(initialSubjects);

  const defaultFormData: CourseFormData = {
    id: null,
    title: '',
    shortDescription: '',
    description: '',
    exam: initialExams.length > 0 ? initialExams[0].examName : 'BITSAT',
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
    selectedSubjectIds: [],
  };

  const [form, setForm] = useState<CourseFormData>(() => {
    if (initialData) {
      return {
        ...defaultFormData,
        ...initialData,
        discountedPrice: initialData.discountedPrice || initialData.price || '',
        selectedSubjectIds: Array.isArray(initialData.selectedSubjectIds) ? initialData.selectedSubjectIds : [],
      };
    }
    return defaultFormData;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteSafeguardError, setDeleteSafeguardError] = useState<{ message: string; dependencies?: any } | null>(
    null
  );

  // Fetch live exams & subjects if not provided
  useEffect(() => {
    if (exams.length === 0) {
      apiClient('/api/admin/exams')
        .then((r) => r.json())
        .then((j) => {
          if (j.success && Array.isArray(j.data)) {
            setExams(j.data);
          }
        })
        .catch(() => {});
    }

    if (subjects.length === 0) {
      apiClient('/api/admin/subjects')
        .then((r) => r.json())
        .then((j) => {
          if (j.success && Array.isArray(j.data)) {
            setSubjects(j.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Synchronize when initialData updates
  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
        discountedPrice: initialData.discountedPrice || initialData.price || '',
        selectedSubjectIds: Array.isArray(initialData.selectedSubjectIds)
          ? initialData.selectedSubjectIds
          : prev.selectedSubjectIds || [],
      }));
    }
  }, [initialData]);

  // Handle title changes with slug generation
  const handleTitleChange = (val: string) => {
    setForm((prev) => {
      const isAutoSlugEligible = mode === 'create' || !prev.id;
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return {
        ...prev,
        title: val,
        slug: isAutoSlugEligible ? generatedSlug : prev.slug,
        courseLink: isAutoSlugEligible ? `/course-detail/${generatedSlug}` : prev.courseLink,
      };
    });
  };

  // Image and PDF file upload handler
  const handleFileUpload = async (file: File, fieldName: 'image' | 'bannerImage' | 'scheduleFile') => {
    try {
      setUploadLoading(true);
      setUploadTarget(fieldName);
      setErrorMessage('');

      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.url) {
        throw new Error(json.error || 'Upload failed on server.');
      }

      setForm((prev) => ({ ...prev, [fieldName]: json.url }));
    } catch (err: any) {
      console.error(`[Upload Error] ${fieldName}:`, err);
      setErrorMessage(err?.message || `Failed to upload ${fieldName}. Verify file format and size.`);
    } finally {
      setUploadLoading(false);
      setUploadTarget(null);
    }
  };

  // Subject multi-select toggle
  const toggleSubject = (subjectId: number) => {
    setForm((prev) => {
      const current = prev.selectedSubjectIds || [];
      const exists = current.includes(subjectId);
      return {
        ...prev,
        selectedSubjectIds: exists ? current.filter((id) => id !== subjectId) : [...current, subjectId],
      };
    });
  };

  // Form submit handler with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setDeleteSafeguardError(null);

    if (!form.title.trim()) {
      setErrorMessage('Course Title is required.');
      return;
    }
    if (!form.exam.trim()) {
      setErrorMessage('Exam selection is required.');
      return;
    }

    const numOrig = Number(form.originalPrice) || 0;
    const numDisc = Number(form.discountedPrice) || 0;

    if (numOrig < 0 || numDisc < 0) {
      setErrorMessage('Prices cannot be negative numbers.');
      return;
    }

    if (numOrig > 0 && numDisc > numOrig) {
      setErrorMessage('Validation Error: Discounted Price cannot exceed Original Price.');
      return;
    }

    // Auto-compute discount label
    let discountStr = form.discount || '';
    if (numOrig > 0 && numDisc > 0 && numOrig > numDisc) {
      discountStr = `${Math.round(((numOrig - numDisc) / numOrig) * 100)}% OFF`;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...form,
        discount: discountStr,
        price: form.discountedPrice || form.originalPrice || '4999',
      });
      setSuccessMessage(mode === 'create' ? 'Course created successfully!' : 'Course updated successfully!');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('10q_courses_updated', { detail: { courseId: form.id } }));
        try {
          localStorage.setItem('10q_courses_updated_at', Date.now().toString());
        } catch {}
      }
    } catch (err: any) {
      console.error('[Course Form Save Error]', err);
      setErrorMessage(err?.message || 'Failed to save course. Please check all required fields.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete with server-side referential integrity safeguard
  const handleDeleteClick = async () => {
    if (!form.id || !onDelete) return;

    const confirmStandard = window.confirm(
      `Are you sure you want to delete course "${form.title}"? This action cannot be undone.`
    );
    if (!confirmStandard) return;

    setIsDeleting(true);
    setErrorMessage('');
    setDeleteSafeguardError(null);

    try {
      const res = await onDelete(form.id);
      if (!res.success) {
        setDeleteSafeguardError({
          message:
            res.error ||
            'Permanent course deletion is disabled to prevent data loss. Please archive or deactivate this course instead.',
          dependencies: res.dependencies,
        });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to execute course deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Safe Archive alternative
  const handleArchiveCourse = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...form,
        isActive: false,
        isShowInIndex: false,
      });
      setDeleteSafeguardError(null);
      setSuccessMessage('Course safely archived. Public purchase is disabled while existing student access is preserved.');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('10q_courses_updated', { detail: { courseId: form.id } }));
        try {
          localStorage.setItem('10q_courses_updated_at', Date.now().toString());
        } catch {}
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to archive course.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#E3E8F0] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#172B4D] tracking-tight">Course Master</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                mode === 'create'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {mode === 'create' ? 'Add New Course' : `Edit Course #${form.id || ''}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#6B7890] mt-1">
            <Link href="/admin/dashboard" className="hover:text-[#1455C0] flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
            <span>/</span>
            <Link href="/admin/courses" className="hover:text-[#1455C0]">
              Courses
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#172B4D]">{mode === 'create' ? 'Create' : 'Edit'}</span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} className="text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </SecondaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={isSaving} className="text-xs">
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{mode === 'create' ? 'Save Course' : 'Update Course'}</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-red-900">Operation Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-emerald-900">Success</p>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* REFERENTIAL INTEGRITY SAFEGUARD DIALOG */}
      {deleteSafeguardError && (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-3 shadow-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-sm text-amber-950">Deletion Safeguard Active</h3>
              <p className="mt-1 leading-relaxed text-amber-900">{deleteSafeguardError.message}</p>
              {deleteSafeguardError.dependencies && deleteSafeguardError.dependencies.details && (
                <ul className="mt-2 list-disc list-inside space-y-1 font-semibold text-amber-800">
                  {deleteSafeguardError.dependencies.details.map((d: string, idx: number) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setDeleteSafeguardError(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleArchiveCourse}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive Course Instead</span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =========================================================================
         * SECTION 1: BASIC INFORMATION
         * ========================================================================= */}
        <FormSection
          title="Section 1: Basic Information"
          description="Enter core course identification, title, and formatted course description."
        >
          <div className="space-y-4">
            <FormField label="Course Title" required>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. BITSAT 2026 Master Crash Course (Updated Batch)"
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                required
              />
            </FormField>

            <FormField label="Short Description" description="Brief summary for catalogue preview cards.">
              <textarea
                rows={2}
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                placeholder="Complete 60-day intensive crash course by BITSians with full mocks and shortcuts."
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
              />
            </FormField>

            <FormField
              label="Course Description (WYSIWYG Rich Text)"
              description="Full formatted syllabus, lecture breakdown, prerequisites, and features."
            >
              <RichTextEditor
                value={form.description}
                onChange={(val) => setForm({ ...form, description: val })}
                minHeight="220px"
              />
            </FormField>
          </div>
        </FormSection>

        {/* =========================================================================
         * SECTION 2: DETAILS
         * ========================================================================= */}
        <FormSection
          title="Section 2: Details & Pricing"
          description="Select competitive exam, set pricing, expiry validity, and assign curriculum subjects."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Exam Category" required>
                <select
                  value={form.exam}
                  onChange={(e) => {
                    const selected = exams.find((x) => x.examName === e.target.value);
                    setForm({
                      ...form,
                      exam: e.target.value,
                      examId: selected ? selected.id : form.examId,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0] bg-white"
                  required
                >
                  {exams.length > 0 ? (
                    exams.map((x) => (
                      <option key={x.id} value={x.examName}>
                        {x.examName}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="BITSAT">BITSAT</option>
                      <option value="JEE">JEE Main</option>
                      <option value="NEET">NEET</option>
                    </>
                  )}
                </select>
              </FormField>

              <FormField label="Original Price (MRP ₹)">
                <input
                  type="text"
                  value={form.originalPrice}
                  onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                  placeholder="e.g. 9999"
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                />
              </FormField>

              <FormField label="Discounted Selling Price (₹)">
                <input
                  type="text"
                  value={form.discountedPrice}
                  onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })}
                  placeholder="e.g. 4999"
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                />
              </FormField>

              <FormField label="Expiry / Validity Date">
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Enrolled Students Metric">
                <input
                  type="number"
                  value={form.enrolledStudent}
                  onChange={(e) => setForm({ ...form, enrolledStudent: e.target.value })}
                  placeholder="e.g. 1450"
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                />
              </FormField>

              <FormField label="Display Priority Order">
                <input
                  type="number"
                  value={form.displayIndex}
                  onChange={(e) => setForm({ ...form, displayIndex: e.target.value })}
                  placeholder="1"
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                />
              </FormField>

              <FormField label="Lead Mentor / Faculty">
                <input
                  type="text"
                  value={form.mentor || ''}
                  onChange={(e) => setForm({ ...form, mentor: e.target.value })}
                  placeholder="e.g. Harshal Jain"
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                />
              </FormField>
            </div>

            <FormField label="Additional Batch Details">
              <textarea
                rows={2}
                value={form.additionalDetails}
                onChange={(e) => setForm({ ...form, additionalDetails: e.target.value })}
                placeholder="Includes 1-on-1 mentorship sessions, formula cheatsheets & 25 full CBT mock tests."
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
              />
            </FormField>

            {/* Curriculum Subjects Assignment (CourseSubject Junction) */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-[#172B4D] mb-2">
                Assigned Curriculum Subjects ({form.selectedSubjectIds?.length || 0} selected)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50">
                {subjects.map((sub) => {
                  const isChecked = (form.selectedSubjectIds || []).includes(sub.id);
                  return (
                    <label
                      key={sub.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'border-[#1455C0] bg-blue-50/70 text-[#1455C0] font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSubject(sub.id)}
                        className="w-3.5 h-3.5 rounded text-[#1455C0] focus:ring-0 cursor-pointer"
                      />
                      <span className="truncate">{sub.subjectName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </FormSection>

        {/* =========================================================================
         * SECTION 3: COURSE IMAGE & BANNER UPLOADS
         * ========================================================================= */}
        <FormSection
          title="Section 3: Course Image & Banner Uploads"
          description="Upload card thumbnail and header banner assets with SEO ALT tags."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thumbnail Upload */}
            <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172B4D]">Course Card Thumbnail (4:3)</span>
                {uploadLoading && uploadTarget === 'image' && (
                  <span className="text-[11px] text-[#1455C0] font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Uploading...
                  </span>
                )}
              </div>

              {form.image ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900 group aspect-video">
                  <Image
                    src={form.image}
                    alt={form.altCourseImage || 'Course thumbnail'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image: '' })}
                      className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#1455C0] cursor-pointer bg-white transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700">Upload Thumbnail Image</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'image');
                    }}
                    className="hidden"
                  />
                </label>
              )}

              <FormField label="Thumbnail ALT Text (SEO)">
                <input
                  type="text"
                  value={form.altCourseImage}
                  onChange={(e) => setForm({ ...form, altCourseImage: e.target.value })}
                  placeholder="e.g. BITSAT 2026 Crash Course Thumbnail"
                  className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                />
              </FormField>
            </div>

            {/* Banner Upload */}
            <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172B4D]">Header Banner Image (16:9)</span>
                {uploadLoading && uploadTarget === 'bannerImage' && (
                  <span className="text-[11px] text-[#1455C0] font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Uploading...
                  </span>
                )}
              </div>

              {form.bannerImage ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900 group aspect-video">
                  <Image
                    src={form.bannerImage}
                    alt={form.altBannerImage || 'Course banner'}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, bannerImage: '' })}
                      className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#1455C0] cursor-pointer bg-white transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700">Upload Banner Image</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Wide header image up to 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'bannerImage');
                    }}
                    className="hidden"
                  />
                </label>
              )}

              <FormField label="Banner ALT Text (SEO)">
                <input
                  type="text"
                  value={form.altBannerImage}
                  onChange={(e) => setForm({ ...form, altBannerImage: e.target.value })}
                  placeholder="e.g. BITSAT 2026 Batch Banner"
                  className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                />
              </FormField>
            </div>
          </div>
        </FormSection>

        {/* =========================================================================
         * SECTION 4: COURSE SCHEDULE FILE
         * ========================================================================= */}
        <FormSection
          title="Section 4: Course Schedule PDF File"
          description="Upload student batch roadmap, lecture timetable, and test calendar."
        >
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            {form.scheduleFile ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Assigned Schedule Roadmap</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-sm">{form.scheduleFile}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={form.scheduleFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                  >
                    <span>View PDF</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, scheduleFile: '' })}
                    className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#1455C0] cursor-pointer bg-white transition-colors">
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-700">Upload Schedule / Timetable PDF</span>
                <span className="text-[10px] text-slate-400 mt-0.5">PDF documents up to 25MB</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'scheduleFile');
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </FormSection>

        {/* =========================================================================
         * SECTION 5: SEO & COURSE URL INFORMATION
         * ========================================================================= */}
        <FormSection
          title="Section 5: SEO & Public URL Information"
          description="Manage canonical search engine titles, descriptions, and URL slug."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="URL Slug (Permanent Keyword Route)" required>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      courseLink: `/course-detail/${e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    })
                  }
                  placeholder="bitsat-2026-master-crash-course"
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
                  required
                />
              </FormField>

              <FormField label="Canonical Course Link">
                <input
                  type="text"
                  value={form.courseLink}
                  readOnly
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg font-mono bg-slate-100 text-slate-600 cursor-not-allowed"
                />
              </FormField>
            </div>

            <FormField label="Meta Title (Google Search Header)">
              <input
                type="text"
                value={form.metaTitle}
                onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                placeholder="BITSAT 2026 Master Crash Course | 10Q Challenge"
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
              />
            </FormField>

            <FormField label="Meta Description (Search Snippet Description)">
              <textarea
                rows={2}
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                placeholder="Crack BITSAT 2026 with toppers guidance, shortcut techniques, formula books, and CBT mocks."
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1455C0]"
              />
            </FormField>

            {/* Live Search Snippet Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Google Search Engine Result Snippet Preview
              </span>
              <p className="text-xs font-semibold text-[#1a0dab] truncate">
                {form.metaTitle || `${form.title || 'Course Title'} | 10Q Challenge`}
              </p>
              <p className="text-[11px] text-[#006621] truncate font-mono">
                https://10qchallenge.in/course-detail/{form.slug || 'course-slug'}
              </p>
              <p className="text-[11px] text-[#545454] line-clamp-2 mt-0.5">
                {form.metaDescription || form.shortDescription || 'Course overview and registration portal.'}
              </p>
            </div>
          </div>
        </FormSection>

        {/* =========================================================================
         * SECTION 6: COURSE VISIBILITY & MODULE SETTINGS
         * ========================================================================= */}
        <FormSection
          title="Section 6: Course Visibility & Module Settings"
          description="Control public visibility, index listing, and feature tabs."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer select-none">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Active Status</span>
                <span className="text-[10px] text-slate-500">Enable purchasing & student enrollments</span>
              </div>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-[#1455C0] focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer select-none">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Show on Homepage</span>
                <span className="text-[10px] text-slate-500">Feature in main course catalog</span>
              </div>
              <input
                type="checkbox"
                checked={form.isShowInIndex}
                onChange={(e) => setForm({ ...form, isShowInIndex: e.target.checked })}
                className="w-4 h-4 rounded text-[#1455C0] focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer select-none">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Show in Mentorship</span>
                <span className="text-[10px] text-slate-500">Feature in Mentorship tab</span>
              </div>
              <input
                type="checkbox"
                checked={form.isShowInMentorship}
                onChange={(e) => setForm({ ...form, isShowInMentorship: e.target.checked })}
                className="w-4 h-4 rounded text-[#1455C0] focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer select-none">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Show in Test Series</span>
                <span className="text-[10px] text-slate-500">Feature in Test Series tab</span>
              </div>
              <input
                type="checkbox"
                checked={form.isShowInTestSeries}
                onChange={(e) => setForm({ ...form, isShowInTestSeries: e.target.checked })}
                className="w-4 h-4 rounded text-[#1455C0] focus:ring-0"
              />
            </label>
          </div>
        </FormSection>

        {/* =========================================================================
         * SECTION 7: BOTTOM ACTION BAR & CURRICULUM SHORTCUTS
         * ========================================================================= */}
        <div className="pt-4 border-t border-[#E3E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Curriculum shortcuts in edit mode */}
          {mode === 'edit' && form.id && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/assignments?courseId=${form.id}`}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Curriculum Content</span>
              </Link>
              <Link
                href={`/admin/videos?courseId=${form.id}`}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5 text-purple-600" />
                <span>Videos ({assignedVideosCount})</span>
              </Link>
              <Link
                href={`/admin/documents?courseId=${form.id}`}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Notes & Docs ({assignedDocsCount})</span>
              </Link>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2.5 ml-auto">
            {mode === 'edit' && onDelete && form.id && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isDeleting || isSaving}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs flex items-center gap-1.5 border border-red-200 transition-colors"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Course</span>
              </button>
            )}

            <SecondaryButton onClick={onCancel} className="text-xs">
              <span>Cancel</span>
            </SecondaryButton>

            <PrimaryButton onClick={handleSubmit} disabled={isSaving} className="text-xs">
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{mode === 'create' ? 'Save Course' : 'Update Course'}</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};
