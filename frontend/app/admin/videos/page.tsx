'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Search,
  Edit2,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  ExternalLink,
  BookOpen,
  Layers,
  GraduationCap,
  Eye,
  X,
  Tv,
  Film,
  Lock,
  Unlock,
  Info,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )10q_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

interface VideoItem {
  id: number;
  title: string;
  provider?: 'VIMEO' | 'YOUTUBE' | 'CUSTOM' | 'HLS';
  providerVideoId?: string;
  vimeoVideoId: string;
  videoUrl?: string;
  courseId?: number;
  courseTitle?: string;
  subjectId?: number;
  subject: string;
  chapterId?: number;
  chapter: string;
  topicId?: number;
  topicName?: string;
  description?: string;
  thumbnailUrl?: string;
  durationMinutes: number;
  isFreePreview: boolean;
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

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState<'VIMEO' | 'YOUTUBE' | 'CUSTOM' | 'HLS'>('VIMEO');
  const [providerVideoId, setProviderVideoId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('none');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [isFreePreview, setIsFreePreview] = useState<boolean>(false);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<'Published' | 'Draft' | 'Archived'>('Published');

  // Preview Modal
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);

  // Delete State
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState<VideoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast / Feedback
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [vidsRes, coursesRes, subsRes, chapsRes, topsRes] = await Promise.all([
        fetch('/api/admin/videos'),
        fetch('/api/admin/courses'),
        fetch('/api/admin/subjects'),
        fetch('/api/admin/chapters'),
        fetch('/api/admin/topics'),
      ]);

      if (vidsRes.ok) {
        const j = await vidsRes.json();
        if (j.success && Array.isArray(j.data)) setVideos(j.data);
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
      console.error('[AdminVideos] Fetch error:', err);
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

  // Open Create Modal
  const openCreateModal = () => {
    setEditingVideo(null);
    setTitle('');
    setProvider('VIMEO');
    setProviderVideoId('');
    setVideoUrl('');
    setDescription('');
    setThumbnailUrl('');

    // Preselect first course and subject if available
    const defaultCourse = courses[0]?.id ? String(courses[0].id) : '';
    setSelectedCourseId(defaultCourse);

    const defaultSubs = defaultCourse
      ? subjects.filter((s) =>
          chapters.some(
            (c) => String(c.courseId) === defaultCourse && String(c.subjectId) === String(s.id)
          )
        )
      : subjects;

    const defaultSub = defaultSubs[0]?.id ? String(defaultSubs[0].id) : '';
    setSelectedSubjectId(defaultSub);

    const defaultChaps = defaultCourse && defaultSub
      ? chapters.filter(
          (c) => String(c.courseId) === defaultCourse && String(c.subjectId) === defaultSub
        )
      : [];

    const defaultChap = defaultChaps[0]?.id ? String(defaultChaps[0].id) : '';
    setSelectedChapterId(defaultChap);

    setSelectedTopicId('none');
    setDurationMinutes(45);
    setIsFreePreview(false);
    setDisplayOrder(videos.length + 1);
    setStatus('Published');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (vid: VideoItem) => {
    setEditingVideo(vid);
    setTitle(vid.title);
    setProvider(vid.provider || 'VIMEO');
    setProviderVideoId(vid.providerVideoId || vid.vimeoVideoId || '');
    setVideoUrl(vid.videoUrl || '');
    setDescription(vid.description || '');
    setThumbnailUrl(vid.thumbnailUrl || '');
    setSelectedCourseId(vid.courseId ? String(vid.courseId) : '');
    setSelectedSubjectId(vid.subjectId ? String(vid.subjectId) : '');
    setSelectedChapterId(vid.chapterId ? String(vid.chapterId) : '');
    setSelectedTopicId(vid.topicId ? String(vid.topicId) : 'none');
    setDurationMinutes(vid.durationMinutes || 45);
    setIsFreePreview(Boolean(vid.isFreePreview));
    setDisplayOrder(vid.displayOrder || 1);
    setStatus(vid.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save Video (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Please enter a video title.');
      return;
    }

    if (!providerVideoId.trim()) {
      setFormError('Please enter a valid Video ID or Embed ID.');
      return;
    }

    if (!selectedCourseId || !selectedSubjectId || !selectedChapterId) {
      setFormError('Please select Course, Subject, and Chapter to assign this video to the curriculum.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        provider,
        providerVideoId: providerVideoId.trim(),
        vimeoVideoId: providerVideoId.trim(),
        videoUrl: videoUrl.trim() || undefined,
        description: description.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        courseId: parseInt(selectedCourseId, 10),
        subjectId: parseInt(selectedSubjectId, 10),
        chapterId: parseInt(selectedChapterId, 10),
        topicId: selectedTopicId && selectedTopicId !== 'none' ? parseInt(selectedTopicId, 10) : undefined,
        durationMinutes: Number(durationMinutes) || 45,
        isFreePreview,
        displayOrder: Number(displayOrder) || 1,
        status,
      };

      const url = editingVideo ? `/api/admin/videos/${editingVideo.id}` : '/api/admin/videos';
      const method = editingVideo ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save video.');
      }

      setSuccessFeedback(editingVideo ? 'Video updated successfully!' : 'Video created successfully!');
      setTimeout(() => setSuccessFeedback(null), 4000);

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the video.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Video
  const handleDeleteVideo = async () => {
    if (!deleteConfirmVideo) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/videos/${deleteConfirmVideo.id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': getCsrfToken(),
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete video.');
      }

      setSuccessFeedback(`Video #${deleteConfirmVideo.id} was deleted successfully.`);
      setTimeout(() => setSuccessFeedback(null), 4000);

      setDeleteConfirmVideo(null);
      await fetchData();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete video.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered display list
  const filteredVideos = videos.filter((vid) => {
    if (courseFilter !== 'ALL' && String(vid.courseId) !== courseFilter) return false;
    if (subjectFilter !== 'ALL' && vid.subject.toLowerCase() !== subjectFilter.toLowerCase()) return false;
    if (statusFilter !== 'ALL' && vid.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        vid.title.toLowerCase().includes(q) ||
        vid.chapter.toLowerCase().includes(q) ||
        vid.subject.toLowerCase().includes(q) ||
        (vid.courseTitle && vid.courseTitle.toLowerCase().includes(q)) ||
        (vid.providerVideoId && vid.providerVideoId.toLowerCase().includes(q)) ||
        (vid.vimeoVideoId && vid.vimeoVideoId.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalVideos = videos.length;
  const publishedVideos = videos.filter((v) => v.status === 'Published').length;
  const draftVideos = videos.filter((v) => v.status === 'Draft' || v.status === 'Archived').length;
  const totalMinutes = videos.reduce((acc, v) => acc + (Number(v.durationMinutes) || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {successFeedback && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{successFeedback}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Video className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Video Master</h1>
            <p className="text-sm text-slate-500">
              Manage lecture masterclasses, video providers, preview controls, and student classroom delivery.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="Refresh Videos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lecture Video</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Lectures</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalVideos}</h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Film className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Published</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{publishedVideos}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Draft / Archived</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{draftVideos}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Duration</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{totalHours} hrs</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, chapter, subject, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700"
          >
            <option value="ALL">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.subjectName}>
                {s.subjectName}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Videos Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-slate-500">Loading lecture videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 bg-purple-50 text-purple-600 rounded-2xl mb-3">
              <Video className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No lecture videos found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm || courseFilter !== 'ALL' || subjectFilter !== 'ALL'
                ? 'Try adjusting your filters or search keywords.'
                : 'Click "Add Lecture Video" to create your first lecture video.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-100 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-16">#</th>
                  <th className="px-5 py-3.5">Video Details</th>
                  <th className="px-5 py-3.5">Curriculum Placement</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Access</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVideos.map((vid) => (
                  <tr key={vid.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">
                      #{vid.id}
                    </td>
                    <td className="px-5 py-4">
                      <div className="max-w-md">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900 line-clamp-1">{vid.title}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-700 uppercase">
                            {vid.provider || 'VIMEO'}
                          </span>
                        </div>
                        {vid.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{vid.description}</p>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          ID: {vid.providerVideoId || vid.vimeoVideoId}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs space-y-0.5">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {vid.courseTitle || 'All Courses'}
                        </div>
                        <div className="text-slate-500 flex items-center space-x-1">
                          <span className="font-medium text-purple-700">{vid.subject}</span>
                          <span>•</span>
                          <span className="line-clamp-1">{vid.chapter}</span>
                        </div>
                        {vid.topicName && (
                          <div className="text-slate-400 text-[11px] line-clamp-1">
                            Topic: {vid.topicName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-slate-700 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{vid.durationMinutes || 0} mins</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {vid.isFreePreview ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Unlock className="w-3 h-3" />
                          <span>Free Preview</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <Lock className="w-3 h-3" />
                          <span>Enrolled Only</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          vid.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : vid.status === 'Draft'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {vid.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => setPreviewVideo(vid)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="Preview Lecture Video"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(vid)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Video"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteConfirmVideo(vid);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Video"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Video Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingVideo ? `Edit Video #${editingVideo.id}` : 'Add New Lecture Video'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure video provider, curriculum placement, and access rules.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Video Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mechanics & 1D Kinematics - Complete Masterclass"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Provider & Video ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Provider *
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="VIMEO">Vimeo</option>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="CUSTOM">Custom Embed</option>
                    <option value="HLS">HLS Stream</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {provider === 'VIMEO'
                      ? 'Vimeo Video ID *'
                      : provider === 'YOUTUBE'
                      ? 'YouTube Video ID *'
                      : 'Stream ID / Video Path *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={providerVideoId}
                    onChange={(e) => setProviderVideoId(e.target.value)}
                    placeholder={
                      provider === 'VIMEO'
                        ? 'e.g. 824804225'
                        : provider === 'YOUTUBE'
                        ? 'e.g. dQw4w9WgXcQ'
                        : 'e.g. lecture-video-stream-01'
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono text-xs"
                  />
                </div>
              </div>

              {provider !== 'VIMEO' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start space-x-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Notice:</strong> The student classroom currently officially supports Vimeo playback. Other providers will display a stream notice to students.
                  </span>
                </div>
              )}

              {/* Academic Hierarchy Cascading Selectors */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <span>Curriculum Alignment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Course Dropdown */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Course *</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        const newCourse = e.target.value;
                        setSelectedCourseId(newCourse);
                        // Cascade reset subject and chapter
                        const validSubs = newCourse
                          ? subjects.filter((s) =>
                              chapters.some(
                                (c) =>
                                  String(c.courseId) === newCourse && String(c.subjectId) === String(s.id)
                              )
                            )
                          : subjects;
                        setSelectedSubjectId(validSubs[0]?.id ? String(validSubs[0].id) : '');
                        setSelectedChapterId('');
                        setSelectedTopicId('none');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    >
                      <option value="">Select Course</option>
                      {courses.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Dropdown */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Subject *</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        const newSub = e.target.value;
                        setSelectedSubjectId(newSub);
                        // Cascade reset chapter
                        const validChaps =
                          selectedCourseId && newSub
                            ? chapters.filter(
                                (c) =>
                                  String(c.courseId) === selectedCourseId &&
                                  String(c.subjectId) === newSub
                              )
                            : [];
                        setSelectedChapterId(validChaps[0]?.id ? String(validChaps[0].id) : '');
                        setSelectedTopicId('none');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    >
                      <option value="">Select Subject</option>
                      {availableSubjectsForCourse.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.subjectName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chapter Dropdown */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Chapter *</label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => {
                        setSelectedChapterId(e.target.value);
                        setSelectedTopicId('none');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    >
                      <option value="">Select Chapter</option>
                      {availableChaptersForSelection.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.chapterName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Topic Dropdown (Optional) */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Topic (Optional)
                    </label>
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    >
                      <option value="none">Whole Chapter / No Specific Topic</option>
                      {availableTopicsForSelection.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.topicName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Duration & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Free Preview Checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="freePreviewCheckbox"
                  checked={isFreePreview}
                  onChange={(e) => setIsFreePreview(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <label htmlFor="freePreviewCheckbox" className="text-xs font-medium text-slate-700">
                  Allow Free Preview (Non-enrolled prospective students can watch this lecture)
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Study Guidance
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key concepts, high-yield tricks, and prerequisite notes..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingVideo ? 'Update Video' : 'Create Video'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-900">{previewVideo.title}</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100 text-purple-700 uppercase font-semibold">
                    {previewVideo.provider || 'VIMEO'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {previewVideo.subject} • {previewVideo.chapter} • {previewVideo.durationMinutes} mins
                </p>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Embed */}
            <div className="mt-4 aspect-video bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              {previewVideo.provider === 'YOUTUBE' ? (
                <iframe
                  src={`https://www.youtube.com/embed/${previewVideo.providerVideoId || previewVideo.vimeoVideoId}?autoplay=1`}
                  title={previewVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : previewVideo.provider === 'CUSTOM' || previewVideo.provider === 'HLS' ? (
                <video
                  src={previewVideo.videoUrl || ''}
                  controls
                  autoPlay
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <iframe
                  src={`https://player.vimeo.com/video/${previewVideo.providerVideoId || previewVideo.vimeoVideoId}?autoplay=1&title=0&byline=0&portrait=0`}
                  title={previewVideo.title}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">
                Provider ID: {previewVideo.providerVideoId || previewVideo.vimeoVideoId}
              </span>
              <button
                onClick={() => setPreviewVideo(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmVideo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Video Deletion</h3>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 font-semibold">"{deleteConfirmVideo.title}"</strong> (Video #{deleteConfirmVideo.id})?
            </p>

            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              <strong>Dependency Protection:</strong> If any enrolled students have watched or recorded progress against this video, deletion will be blocked by the server to protect student learning history.
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmVideo(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVideo}
                disabled={isDeleting}
                className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Video</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
