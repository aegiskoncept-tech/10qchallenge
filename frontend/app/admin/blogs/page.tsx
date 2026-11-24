'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Tag,
  Clock,
  User,
  Eye,
  X,
  Copy,
  Calendar,
  Layers,
  Sparkles,
  Globe,
  Share2,
  Image as ImageIcon,
  Check,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  History,
  ArrowRight,
  Maximize2,
  Code,
  List,
  Type,
  Video,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';
import {
  BlogRecord,
  BlogStatus,
  BlogCategory,
  BlogAuthor,
  BlogMediaItem,
  BlogDashboardMetrics,
  BlogRevision,
} from '@/lib/content/types';

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [metrics, setMetrics] = useState<BlogDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'title'>('date');

  // Categories & Authors & Media
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [mediaItems, setMediaItems] = useState<BlogMediaItem[]>([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaSearch, setMediaSearch] = useState('');

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'revisions'>('content');
  const [editingBlog, setEditingBlog] = useState<BlogRecord | null>(null);
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: 'Ritesh (BITS Pilani Alumni)',
    authorId: 'auth-ritesh',
    category: 'BITSAT',
    readTime: '5 min read',
    coverImage: '/site/assets/img/blog/blog-1.jpg',
    coverImageAlt: '',
    coverImageCaption: '',
    tags: '',
    status: 'Draft' as BlogStatus,
    scheduledPublishAt: '',
    seoTitle: '',
    metaDescription: '',
    focusKeyword: '',
    canonicalUrl: '',
    robotsIndex: true,
    robotsFollow: true,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterCard: 'summary_large_image' as 'summary' | 'summary_large_image',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Quick Action States
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scheduleModalBlog, setScheduleModalBlog] = useState<BlogRecord | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [previewTokenUrl, setPreviewTokenUrl] = useState<string | null>(null);

  const fetchBlogs = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (searchTerm) q.set('search', searchTerm);
      if (categoryFilter !== 'ALL') q.set('category', categoryFilter);
      if (statusFilter !== 'ALL') q.set('status', statusFilter);
      q.set('sortBy', sortBy);

      const res = await apiClient(`/api/admin/blogs?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setBlogs(json.data);
          if (json.metrics) setMetrics(json.metrics);
        }
      }
    } catch (err) {
      console.error('[AdminBlogs] Error fetching blogs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaxonomyAndMedia = async () => {
    try {
      const [catsRes, authsRes, mediaRes] = await Promise.all([
        apiClient('/api/admin/blogs/categories'),
        apiClient('/api/admin/blogs/authors'),
        apiClient('/api/admin/blogs/media'),
      ]);
      if (catsRes.ok) {
        const data = await catsRes.json();
        if (data.success) setCategories(data.data);
      }
      if (authsRes.ok) {
        const data = await authsRes.json();
        if (data.success) setAuthors(data.data);
      }
      if (mediaRes.ok) {
        const data = await mediaRes.json();
        if (data.success) setMediaItems(data.data);
      }
    } catch (err) {
      console.error('[AdminBlogs] Taxonomy fetch error:', err);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [categoryFilter, statusFilter, sortBy]);

  useEffect(() => {
    fetchTaxonomyAndMedia();
  }, []);

  // Title -> Slug auto derive
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => {
      const updated = { ...prev, title };
      if (!isManualSlug) {
        updated.slug = title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      if (!prev.seoTitle || prev.seoTitle === prev.title) {
        updated.seoTitle = title;
      }
      if (!prev.ogTitle || prev.ogTitle === prev.title) {
        updated.ogTitle = title;
      }
      return updated;
    });
  };

  // Content word count & read-time auto calculation
  const handleContentChange = (content: string) => {
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    const calcReadTime = `${Math.max(2, Math.ceil(wordCount / 200))} min read`;
    setFormData((prev) => ({
      ...prev,
      content,
      readTime: calcReadTime,
    }));
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBlog(null);
    setIsManualSlug(false);
    setPreviewMode(false);
    setActiveTab('content');
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      author: authors[0]?.name || 'Ritesh (BITS Pilani Alumni)',
      authorId: authors[0]?.id || 'auth-ritesh',
      category: categories[0]?.name || 'BITSAT',
      readTime: '5 min read',
      coverImage: mediaItems[0]?.url || '/site/assets/img/blog/blog-1.jpg',
      coverImageAlt: '',
      coverImageCaption: '',
      tags: 'BITSAT, Exam Strategy',
      status: 'Draft',
      scheduledPublishAt: '',
      seoTitle: '',
      metaDescription: '',
      focusKeyword: '',
      canonicalUrl: '',
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: '',
      ogDescription: '',
      ogImage: mediaItems[0]?.url || '/site/assets/img/blog/blog-1.jpg',
      twitterCard: 'summary_large_image',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (blog: BlogRecord) => {
    setEditingBlog(blog);
    setIsManualSlug(true);
    setPreviewMode(false);
    setActiveTab('content');
    setFormError(null);
    setFormSuccess(null);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      author: blog.author,
      authorId: blog.authorId || '',
      category: blog.category,
      readTime: blog.readTime,
      coverImage: blog.coverImage || '/site/assets/img/blog/blog-1.jpg',
      coverImageAlt: blog.coverImageAlt || '',
      coverImageCaption: blog.coverImageCaption || '',
      tags: blog.tags.join(', '),
      status: blog.status,
      scheduledPublishAt: blog.scheduledPublishAt || '',
      seoTitle: blog.seo?.seoTitle || blog.title,
      metaDescription: blog.seo?.metaDescription || blog.excerpt,
      focusKeyword: blog.seo?.focusKeyword || '',
      canonicalUrl: blog.seo?.canonicalUrl || `https://10qchallenge.in/blog/${blog.slug}`,
      robotsIndex: blog.seo?.robotsIndex !== false,
      robotsFollow: blog.seo?.robotsFollow !== false,
      ogTitle: blog.seo?.ogTitle || blog.title,
      ogDescription: blog.seo?.ogDescription || blog.excerpt,
      ogImage: blog.seo?.ogImage || blog.coverImage || '',
      twitterCard: blog.seo?.twitterCard || 'summary_large_image',
    });
    setIsModalOpen(true);
  };

  // Submit Save or Update
  const handleSubmit = async (overrideStatus?: BlogStatus) => {
    setFormError(null);
    setFormSuccess(null);

    if (!formData.title.trim()) {
      setFormError('Article title is required.');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('Article content is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalStatus = overrideStatus || formData.status;
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        excerpt: formData.excerpt.trim() || formData.title.trim(),
        content: formData.content.trim(),
        author: formData.author.trim(),
        authorId: formData.authorId || undefined,
        category: formData.category.trim(),
        readTime: formData.readTime,
        coverImage: formData.coverImage,
        coverImageAlt: formData.coverImageAlt.trim(),
        coverImageCaption: formData.coverImageCaption.trim() || undefined,
        tags: tagsArray,
        status: finalStatus,
        scheduledPublishAt: formData.scheduledPublishAt || undefined,
        seo: {
          seoTitle: formData.seoTitle.trim() || formData.title.trim(),
          metaDescription: formData.metaDescription.trim() || formData.excerpt.trim(),
          focusKeyword: formData.focusKeyword.trim() || undefined,
          canonicalUrl: formData.canonicalUrl.trim() || `https://10qchallenge.in/blog/${formData.slug}`,
          robotsIndex: formData.robotsIndex,
          robotsFollow: formData.robotsFollow,
          ogTitle: formData.ogTitle.trim() || formData.title.trim(),
          ogDescription: formData.ogDescription.trim() || formData.excerpt.trim(),
          ogImage: formData.ogImage || formData.coverImage,
          twitterCard: formData.twitterCard,
        },
      };

      let res: Response;
      if (editingBlog) {
        res = await apiClient(`/api/admin/blogs/${editingBlog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            revisionSummary: `Updated via CMS (${finalStatus})`,
          }),
        });
      } else {
        res = await apiClient('/api/admin/blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save article.');
      }

      setFormSuccess(
        editingBlog ? `Article updated successfully (${finalStatus})!` : `Article created successfully (${finalStatus})!`
      );
      fetchBlogs();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 900);
    } catch (err: any) {
      setFormError(err.message || 'Error saving article.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action Handlers
  const handleQuickAction = async (id: number, action: 'publish' | 'archive' | 'restore' | 'duplicate') => {
    try {
      const res = await apiClient(`/api/admin/blogs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBlogs();
      } else {
        alert(data.error || 'Action failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleModalBlog || !scheduleDateTime) return;
    try {
      const res = await apiClient(`/api/admin/blogs/${scheduleModalBlog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          scheduledPublishAt: new Date(scheduleDateTime).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScheduleModalBlog(null);
        setScheduleDateTime('');
        fetchBlogs();
      } else {
        alert(data.error || 'Scheduling failed.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      const res = await apiClient(`/api/admin/blogs/${deleteConfirmId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirmId(null);
        fetchBlogs();
      } else {
        alert(data.error || 'Deletion failed.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGeneratePreviewLink = async (blogId: number) => {
    try {
      const res = await apiClient('/api/admin/blogs/preview-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      });
      const data = await res.json();
      if (data.success && data.previewUrl) {
        setPreviewTokenUrl(window.location.origin + data.previewUrl);
      }
    } catch (err) {
      alert('Failed to generate preview token.');
    }
  };

  // Restore Revision Handler
  const handleRestoreRevision = async (revisionId: string) => {
    if (!editingBlog) return;
    if (!confirm('Are you sure you want to restore this revision? It will overwrite current form fields.')) return;

    try {
      const res = await apiClient(`/api/admin/blogs/${editingBlog.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        handleOpenEdit(data.data);
        alert('Revision successfully restored!');
      } else {
        alert(data.error || 'Restore failed.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toolbar Insert Helpers
  const insertContentSnippet = (snippet: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content ? `${prev.content}\n\n${snippet}` : snippet,
    }));
  };

  // Filtered media in modal
  const filteredMedia = useMemo(() => {
    if (!mediaSearch) return mediaItems;
    return mediaItems.filter((m) => m.filename.toLowerCase().includes(mediaSearch.toLowerCase()));
  }, [mediaItems, mediaSearch]);

  // SEO Score Calculator for current form
  const currentSeoScore = useMemo(() => {
    let score = 0;
    if (formData.title.length >= 20 && formData.title.length <= 70) score += 20;
    if (formData.metaDescription.length >= 60 && formData.metaDescription.length <= 160) score += 20;
    if (formData.focusKeyword && formData.content.toLowerCase().includes(formData.focusKeyword.toLowerCase())) score += 20;
    if (formData.coverImage && formData.coverImageAlt) score += 20;
    if (formData.content.length > 300) score += 20;
    return score;
  }, [formData]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100">Blog CMS & Editorial Studio</h1>
              <p className="text-xs text-slate-400">Author, schedule, review and optimize educational articles with full SEO control</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/blog"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all"
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span>Public Blog</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
          <button
            onClick={fetchBlogs}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition-all"
            title="Refresh articles"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Article</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total</span>
            <span className="text-2xl font-black text-slate-100 mt-1">{metrics.totalArticles}</span>
            <span className="text-[10px] text-slate-500 mt-1">All database items</span>
          </div>
          <div className="bg-slate-900/90 border border-emerald-500/20 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Published</span>
            <span className="text-2xl font-black text-emerald-400 mt-1">{metrics.publishedArticles}</span>
            <span className="text-[10px] text-emerald-500/70 mt-1">Live to students</span>
          </div>
          <div className="bg-slate-900/90 border border-amber-500/20 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Drafts</span>
            <span className="text-2xl font-black text-amber-400 mt-1">{metrics.draftArticles}</span>
            <span className="text-[10px] text-amber-500/70 mt-1">Private WIP</span>
          </div>
          <div className="bg-slate-900/90 border border-blue-500/20 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">In Review</span>
            <span className="text-2xl font-black text-blue-400 mt-1">{metrics.inReviewArticles}</span>
            <span className="text-[10px] text-blue-500/70 mt-1">Editorial check</span>
          </div>
          <div className="bg-slate-900/90 border border-purple-500/20 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Scheduled</span>
            <span className="text-2xl font-black text-purple-400 mt-1">{metrics.scheduledArticles}</span>
            <span className="text-[10px] text-purple-500/70 mt-1">Timed releases</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Archived</span>
            <span className="text-2xl font-black text-slate-300 mt-1">{metrics.archivedArticles}</span>
            <span className="text-[10px] text-slate-500 mt-1">Hidden history</span>
          </div>
          <div className="bg-slate-900/90 border border-cyan-500/20 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Total Views</span>
            <span className="text-2xl font-black text-cyan-400 mt-1">{metrics.totalViews.toLocaleString()}</span>
            <span className="text-[10px] text-cyan-500/70 mt-1">Real page hits</span>
          </div>
          <div className="bg-slate-900/90 border border-rose-500/20 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">SEO Alerts</span>
            <span className="text-2xl font-black text-rose-400 mt-1">{metrics.seoAttentionNeeded}</span>
            <span className="text-[10px] text-rose-500/70 mt-1">Needs metadata</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchBlogs()}
              placeholder="Search by title, slug, tag, or author..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
            >
              <option value="date">Sort by Date</option>
              <option value="views">Sort by Views</option>
              <option value="title">Sort by Title</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-3">
          {(['ALL', 'Published', 'Draft', 'In Review', 'Scheduled', 'Archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-slate-500">Loading editorial database...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No articles found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No educational articles match your search or filter criteria. Try resetting filters or create a new article.
            </p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-500 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create First Article</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Author</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 text-center">Views</th>
                  <th className="py-3.5 px-3">SEO Health</th>
                  <th className="py-3.5 px-3">Last Modified</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {blogs.map((b) => {
                  const seoAlert = !b.seo?.seoTitle || !b.seo?.metaDescription || !b.coverImage;
                  return (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.coverImage || '/site/assets/img/blog/blog-1.jpg'}
                            alt={b.coverImageAlt || b.title}
                            className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700/60 shrink-0"
                            onError={(e: any) => {
                              e.currentTarget.src = '/site/assets/img/blog/blog-1.jpg';
                            }}
                          />
                          <div className="min-w-0 max-w-sm">
                            <h4 className="font-bold text-slate-200 truncate group-hover:text-amber-400 transition-colors">
                              {b.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono truncate">/{b.slug}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {b.readTime}
                              </span>
                              {b.revisions && b.revisions.length > 1 && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5 bg-slate-800 px-1.5 py-0.5 rounded">
                                  <History className="w-2.5 h-2.5" /> v{b.revisions.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700/60">
                          {b.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate max-w-[120px]">{b.author}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            b.status === 'Published'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : b.status === 'Draft'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : b.status === 'In Review'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : b.status === 'Scheduled'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                              : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                          }`}
                        >
                          {b.status}
                        </span>
                        {b.status === 'Scheduled' && b.scheduledPublishAt && (
                          <p className="text-[10px] text-purple-400/80 mt-0.5 font-mono">
                            {new Date(b.scheduledPublishAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-300 font-mono font-bold">
                        {b.viewsCount || 0}
                      </td>

                      <td className="py-3.5 px-3">
                        {seoAlert ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3" /> Needs Attention
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" /> Optimized
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(b.updatedAt || b.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Action */}
                          {b.status === 'Published' ? (
                            <Link
                              href={`/blog/${b.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              title="View Public Article"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleGeneratePreviewLink(b.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                              title="Generate Private Preview Link"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Action */}
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            title="Edit Article"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate Action */}
                          <button
                            onClick={() => handleQuickAction(b.id, 'duplicate')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Duplicate as Draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Publish / Archive */}
                          {b.status !== 'Published' ? (
                            <button
                              onClick={() => handleQuickAction(b.id, 'publish')}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                              title="Publish Now"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickAction(b.id, 'archive')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Archive Article"
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Schedule Action */}
                          {b.status !== 'Published' && (
                            <button
                              onClick={() => {
                                setScheduleModalBlog(b);
                                setScheduleDateTime(b.scheduledPublishAt ? b.scheduledPublishAt.slice(0, 16) : '');
                              }}
                              className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-colors"
                              title="Schedule Publication"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Action */}
                          <button
                            onClick={() => setDeleteConfirmId(b.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Article"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================== FULL CMS ARTICLE EDITOR MODAL ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col my-8 max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">
                    {editingBlog ? `Edit Article: #${editingBlog.id}` : 'Create Educational Article'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Draft, structure and preview rich content with built-in SEO scoring
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'content' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Content Editor
                </button>
                <button
                  onClick={() => setActiveTab('seo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeTab === 'seo' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>SEO Engine</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      currentSeoScore >= 80 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {currentSeoScore}%
                  </span>
                </button>
                {editingBlog && (
                  <button
                    onClick={() => setActiveTab('revisions')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'revisions' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Revisions ({editingBlog.revisions?.length || 1})
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* TAB 1: CONTENT EDITOR */}
              {activeTab === 'content' && (
                <div className="space-y-5">
                  {/* Title & Slug */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Article Title <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={handleTitleChange}
                        placeholder="e.g. How to Score 340+ in BITSAT 2026: Strategy from Pilani Rankers"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          Canonical URL Slug (/blog/{formData.slug || '...'})
                        </label>
                        <input
                          type="text"
                          value={formData.slug}
                          disabled={!isManualSlug}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''),
                            }))
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-slate-300 disabled:opacity-60 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsManualSlug(!isManualSlug)}
                        className="mt-5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {isManualSlug ? 'Lock Auto' : 'Custom Slug'}
                      </button>
                    </div>
                  </div>

                  {/* Taxonomy & Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Author</label>
                      <select
                        value={formData.author}
                        onChange={(e) => {
                          const match = authors.find((a) => a.name === e.target.value);
                          setFormData({
                            ...formData,
                            author: e.target.value,
                            authorId: match?.id || '',
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      >
                        {authors.map((a) => (
                          <option key={a.id} value={a.name}>
                            {a.name} ({a.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Reading Time</label>
                      <input
                        type="text"
                        value={formData.readTime}
                        onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Short Excerpt / Summary <span className="text-slate-500 text-[10px]">(Card & search teaser)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="High-converting brief summary of what the student will learn..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Featured Cover Image & Alt Text */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">Featured Cover Image URL</label>
                        <button
                          type="button"
                          onClick={() => setIsMediaModalOpen(true)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Pick from Media Library</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.coverImage}
                        onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                        placeholder="/site/assets/img/blog/blog-1.jpg"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      />
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={formData.coverImage || '/site/assets/img/blog/blog-1.jpg'}
                          alt={formData.coverImageAlt || 'Cover preview'}
                          className="w-16 h-12 object-cover rounded-lg border border-slate-800 bg-slate-950"
                          onError={(e: any) => {
                            e.currentTarget.src = '/site/assets/img/blog/blog-1.jpg';
                          }}
                        />
                        <span className="text-[11px] text-slate-500">Preview of active thumbnail</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Cover Image Alt Text <span className="text-amber-400 text-[10px]">(Crucial for SEO)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.coverImageAlt}
                          onChange={(e) => setFormData({ ...formData, coverImageAlt: e.target.value })}
                          placeholder="e.g. BITSAT 2026 preparation timetable flowchart"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Image Caption</label>
                        <input
                          type="text"
                          value={formData.coverImageCaption}
                          onChange={(e) => setFormData({ ...formData, coverImageCaption: e.target.value })}
                          placeholder="e.g. Source: 10Q Challenge Editorial Team"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rich Content Editor with Formatting Toolbar */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 p-2.5 rounded-2xl">
                      {/* Structure Snippets */}
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => insertContentSnippet('## Section Heading')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          title="H2 Heading"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => insertContentSnippet('### Subsection Heading')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          title="H3 Heading"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => insertContentSnippet('- Key bullet point\n- Second important point\n- Third key takeaway')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          title="Bullet List"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertContentSnippet('> **Important Note:** Consistent daily revision is the single biggest determinant of high accuracy.')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          title="Quote / Callout"
                        >
                          Quote
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertContentSnippet(
                              '| Exam | Questions | Time Limit | Marking Scheme |\n|---|---|---|---|\n| BITSAT | 130 | 180 mins | +3 / -1 |\n| COMEDK | 180 | 180 mins | +1 / 0 |'
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          title="Table Block"
                        >
                          Table
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertContentSnippet(
                              '```python\n# Formula for computational speed\nspeed = questions_attempted / elapsed_minutes\n```'
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          title="Code Block"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertContentSnippet(
                              '```youtube\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n```'
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
                          title="YouTube Embed"
                        >
                          <Video className="w-3.5 h-3.5 text-rose-400" />
                          <span>Video</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            insertContentSnippet(
                              '### Frequently Asked Questions\n\n**Q: When will BITSAT 2026 Session 1 be held?**\nA: Expected in the third week of May 2026.'
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
                          title="FAQ Block"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>FAQ</span>
                        </button>
                      </div>

                      {/* View Switcher */}
                      <button
                        type="button"
                        onClick={() => setPreviewMode(!previewMode)}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                      >
                        {previewMode ? 'Switch to Raw Editor' : 'Live Preview'}
                      </button>
                    </div>

                    {previewMode ? (
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 min-h-[300px] text-slate-200 prose prose-invert max-w-none text-xs leading-relaxed space-y-4">
                        <div className="border-b border-slate-800 pb-4 mb-4">
                          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                            Live Content Preview
                          </span>
                          <h2 className="text-xl font-black text-slate-100 mt-1">{formData.title || 'Untitled Article'}</h2>
                        </div>
                        <div className="whitespace-pre-wrap">{formData.content}</div>
                      </div>
                    ) : (
                      <textarea
                        rows={14}
                        value={formData.content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder="Write article content using markdown, headings (##, ###), tables, lists, and embeds..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 leading-relaxed"
                      />
                    )}
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tags <span className="text-slate-500 text-[10px]">(Comma separated)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="BITSAT, Strategy, Physics, Bonus Questions"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: SEO CONTROL PANEL */}
              {activeTab === 'seo' && (
                <div className="space-y-6">
                  {/* SEO Score Banner */}
                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">SEO Quality Score: {currentSeoScore} / 100</h4>
                        <p className="text-xs text-slate-500">
                          {currentSeoScore >= 80
                            ? 'Excellent metadata configuration ready for organic crawling'
                            : 'Review the checklist below to improve search visibility'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Google Search Snippet Preview */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Google Search Result Preview
                    </span>
                    <div className="bg-[#202124] p-4 rounded-xl space-y-1 font-sans">
                      <div className="text-[11px] text-[#bdc1c6] flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-[9px]">
                          10
                        </span>
                        <span>10qchallenge.in &gt; blog &gt; {formData.slug || 'article-slug'}</span>
                      </div>
                      <h4 className="text-base text-[#8ab4f8] hover:underline cursor-pointer font-medium leading-snug">
                        {formData.seoTitle || formData.title || 'Article Title'}
                      </h4>
                      <p className="text-xs text-[#bdc1c6] leading-relaxed">
                        {formData.metaDescription || formData.excerpt || 'Article meta description will appear here in search engine results.'}
                      </p>
                    </div>
                  </div>

                  {/* SEO Fields Grid */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">SEO Title Tag</label>
                        <span
                          className={`text-[10px] ${
                            formData.seoTitle.length > 60 ? 'text-rose-400 font-bold' : 'text-slate-500'
                          }`}
                        >
                          {formData.seoTitle.length} / 60 chars
                        </span>
                      </div>
                      <input
                        type="text"
                        value={formData.seoTitle}
                        onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                        placeholder="Keyword-rich page title (recommended 50-60 characters)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300">Meta Description</label>
                        <span
                          className={`text-[10px] ${
                            formData.metaDescription.length > 160 ? 'text-rose-400 font-bold' : 'text-slate-500'
                          }`}
                        >
                          {formData.metaDescription.length} / 160 chars
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={formData.metaDescription}
                        onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                        placeholder="Compelling search snippet description (recommended 120-155 characters)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Primary Focus Keyword</label>
                        <input
                          type="text"
                          value={formData.focusKeyword}
                          onChange={(e) => setFormData({ ...formData, focusKeyword: e.target.value })}
                          placeholder="e.g. BITSAT 2026 strategy"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Canonical URL</label>
                        <input
                          type="text"
                          value={formData.canonicalUrl}
                          onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                          placeholder="https://10qchallenge.in/blog/..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Robots Directives */}
                    <div className="flex items-center gap-6 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.robotsIndex}
                          onChange={(e) => setFormData({ ...formData, robotsIndex: e.target.checked })}
                          className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0"
                        />
                        <span>Robots Index (Allow in search engines)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.robotsFollow}
                          onChange={(e) => setFormData({ ...formData, robotsFollow: e.target.checked })}
                          className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0"
                        />
                        <span>Robots Follow (Follow links)</span>
                      </label>
                    </div>

                    {/* Social OpenGraph Preview */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Social Card Preview (WhatsApp / X / LinkedIn)
                      </span>
                      <div className="border border-slate-800 rounded-xl overflow-hidden max-w-sm bg-slate-900">
                        <img
                          src={formData.ogImage || formData.coverImage || '/site/assets/img/blog/blog-1.jpg'}
                          alt="Social preview"
                          className="w-full h-36 object-cover bg-slate-950"
                          onError={(e: any) => {
                            e.currentTarget.src = '/site/assets/img/blog/blog-1.jpg';
                          }}
                        />
                        <div className="p-3 space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-mono">10qchallenge.in</span>
                          <h5 className="text-xs font-bold text-slate-200 truncate">
                            {formData.ogTitle || formData.title || 'Article Title'}
                          </h5>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {formData.ogDescription || formData.excerpt || 'Article summary snippet'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: REVISIONS HISTORY */}
              {activeTab === 'revisions' && editingBlog && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <h4 className="text-sm font-bold text-slate-200">Editorial Audit & Revision Timeline</h4>
                    <p className="text-xs text-slate-500">
                      Every update automatically generates an immutable snapshot. You can restore previous versions at any time.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {(editingBlog.revisions || []).map((rev, idx) => (
                      <div
                        key={rev.revisionId || idx}
                        className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200 font-mono">
                              {rev.revisionId}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                              {rev.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{rev.summary || 'Content revision'}</p>
                          <span className="text-[10px] text-slate-500">
                            By {rev.author} &bull; {new Date(rev.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRestoreRevision(rev.revisionId)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-xs font-bold text-slate-400">Target Status:</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                >
                  <option value="Draft">Draft</option>
                  <option value="In Review">In Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit('Draft')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-400/20 transition-all"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>{editingBlog ? 'Save Changes' : 'Save Article'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MEDIA LIBRARY MODAL ===================== */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Media Library ({mediaItems.length} Available Assets)
                </h3>
              </div>
              <button onClick={() => setIsMediaModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                placeholder="Search media files by name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200"
              />
            </div>

            <div className="overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 flex-1 p-1">
              {filteredMedia.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      coverImage: m.url,
                      coverImageAlt: prev.coverImageAlt || m.altText,
                      ogImage: prev.ogImage || m.url,
                    }));
                    setIsMediaModalOpen(false);
                  }}
                  className="group cursor-pointer bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-amber-400 transition-all flex flex-col justify-between"
                >
                  <img src={m.url} alt={m.altText} className="w-full h-24 object-cover" />
                  <div className="p-2 space-y-0.5">
                    <p className="text-[10px] font-mono text-slate-300 truncate" title={m.filename}>
                      {m.filename}
                    </p>
                    <span className="text-[9px] text-slate-500">{m.fileSize}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== SCHEDULE MODAL ===================== */}
      {scheduleModalBlog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Schedule Publication</h4>
                <p className="text-xs text-slate-500 truncate max-w-[280px]">{scheduleModalBlog.title}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Release Date & Time</label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
              <p className="text-[10px] text-slate-500">
                The article will automatically transition to Published when this time arrives.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setScheduleModalBlog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSubmit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-600 text-white"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== PREVIEW TOKEN MODAL ===================== */}
      {previewTokenUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Private Preview Link Generated</h4>
                <p className="text-xs text-slate-500">Valid for 2 hours &bull; Does not require login</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-400 break-all select-all">
              {previewTokenUrl}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewTokenUrl);
                  alert('Preview link copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
              <Link
                href={previewTokenUrl}
                target="_blank"
                onClick={() => setPreviewTokenUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5"
              >
                <span>Open Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setPreviewTokenUrl(null)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-100">Permanently Delete Article?</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to delete article #{deleteConfirmId}? This action cannot be undone. You may choose to Archive it instead.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
