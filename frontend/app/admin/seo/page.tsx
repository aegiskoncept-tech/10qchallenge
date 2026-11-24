'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  Share2,
  FileCode,
  Tag,
  Check,
  Plus,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { apiClient } from '@/lib/apiClient';

interface SeoConfig {
  route: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string;
  jsonLd?: string;
  updatedAt: string;
  updatedBy?: string;
}

export default function AdminSeoPage() {
  const [configs, setConfigs] = useState<SeoConfig[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('/');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<SeoConfig>({
    route: '/',
    name: 'Homepage',
    metaTitle: '',
    metaDescription: '',
    keywords: [],
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    canonicalUrl: '',
    robots: 'index, follow',
    jsonLd: '',
    updatedAt: '',
  });
  const [keywordsInput, setKeywordsInput] = useState('');

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/admin/seo');
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setConfigs(j.data);
          const current = j.data.find((c: SeoConfig) => c.route === selectedRoute) || j.data[0];
          if (current) {
            setSelectedRoute(current.route);
            loadFormFromConfig(current);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load SEO configs.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFormFromConfig = (c: SeoConfig) => {
    setFormData({ ...c });
    setKeywordsInput(Array.isArray(c.keywords) ? c.keywords.join(', ') : '');
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSelectRoute = (route: string) => {
    setSelectedRoute(route);
    const found = configs.find((c) => c.route === route);
    if (found) {
      loadFormFromConfig(found);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.metaTitle.trim()) {
      setErrorMessage('Meta title is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const kwArray = keywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const payload = {
        ...formData,
        keywords: kwArray,
        ogTitle: formData.ogTitle?.trim() || formData.metaTitle,
        ogDescription: formData.ogDescription?.trim() || formData.metaDescription,
      };

      const res = await apiClient('/api/admin/seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save SEO config.');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      await fetchConfigs();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
              Search Engine Optimization
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">{configs.length} Routes Configured</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-indigo-600" />
            <span>SEO & Metadata Manager</span>
          </h1>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>SEO settings updated and saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Route Tabs Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {configs.map((c) => (
          <button
            key={c.route}
            onClick={() => handleSelectRoute(c.route)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedRoute === c.route
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c.name} ({c.route})
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Settings (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <span>Core Metadata for:</span>
            <span className="font-mono text-indigo-600">{formData.route}</span>
          </h2>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Page Meta Title *</label>
              <span className={`text-[11px] font-mono font-bold ${formData.metaTitle.length > 60 ? 'text-amber-600' : 'text-slate-400'}`}>
                {formData.metaTitle.length} / 60 chars
              </span>
            </div>
            <input
              type="text"
              required
              value={formData.metaTitle}
              onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Meta Description</label>
              <span className={`text-[11px] font-mono font-bold ${formData.metaDescription.length > 160 ? 'text-amber-600' : 'text-slate-400'}`}>
                {formData.metaDescription.length} / 160 chars
              </span>
            </div>
            <textarea
              rows={3}
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Keywords (Comma separated)</label>
            <input
              type="text"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Canonical URL</label>
              <input
                type="text"
                value={formData.canonicalUrl || ''}
                onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Robots Indexing</label>
              <select
                value={formData.robots || 'index, follow'}
                onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="index, follow">Index, Follow (Recommended)</option>
                <option value="noindex, follow">Noindex, Follow</option>
                <option value="noindex, nofollow">Noindex, Nofollow (Blocked)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Social Media & OpenGraph Sharing</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">OpenGraph Title</label>
              <input
                type="text"
                placeholder="Defaults to meta title if empty"
                value={formData.ogTitle || ''}
                onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">OpenGraph Image URL</label>
              <input
                type="text"
                placeholder="e.g. /site/assets/og-home.jpg or https://..."
                value={formData.ogImage || ''}
                onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* Right Column: Live SERP & Social Previews (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Google Search Result Preview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Google Search (SERP) Preview
              </h3>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 font-sans">
              <div className="text-[11px] text-slate-500 truncate font-mono">
                {formData.canonicalUrl || `https://10qchallenge.in${formData.route}`}
              </div>
              <div className="text-base font-semibold text-blue-700 hover:underline cursor-pointer truncate">
                {formData.metaTitle || '10Q Challenge | CBT Exam Preparation LMS'}
              </div>
              <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {formData.metaDescription ||
                  'Crack BITSAT, JEE Main, and engineering entrance exams with official CBT mock test practice and performance telemetry.'}
              </div>
            </div>
          </div>

          {/* Social OpenGraph Preview Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Social Card / WhatsApp / Twitter Preview
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <div className="h-32 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center text-white">
                <span className="text-xs font-black tracking-widest uppercase opacity-75">
                  {formData.ogImage ? '10Q Banner Active' : 'Default OG Cover'}
                </span>
              </div>
              <div className="p-3.5 space-y-1">
                <p className="text-[10px] font-mono text-slate-400 uppercase">10QCHALLENGE.IN</p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {formData.ogTitle || formData.metaTitle || '10Q Challenge Entrance Exam LMS'}
                </p>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  {formData.ogDescription || formData.metaDescription || 'Elite CBT preparation portal.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
