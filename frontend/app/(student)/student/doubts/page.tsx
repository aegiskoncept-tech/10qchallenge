'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  Filter,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { DoubtRecord, DoubtSummaryMetrics, DoubtStatus } from '@/lib/doubts/types';
import { DoubtModal } from '@/components/student/DoubtModal';

export default function StudentDoubtsPage() {
  const [doubts, setDoubts] = useState<DoubtRecord[]>([]);
  const [metrics, setMetrics] = useState<DoubtSummaryMetrics>({
    total: 0,
    open: 0,
    inProgress: 0,
    answered: 0,
    resolved: 0,
    reopened: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDoubts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (selectedStatus !== 'ALL') sp.set('status', selectedStatus);
      if (searchTerm.trim()) sp.set('search', searchTerm.trim());

      const res = await fetch(`/api/student/doubts?${sp.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success) {
        setDoubts(json.data || []);
        if (json.metrics) setMetrics(json.metrics);
      } else {
        setError(json.error || 'Failed to load doubts.');
      }
    } catch (err: any) {
      setError('Unable to load doubts. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoubts();
  };

  const getStatusBadge = (status: DoubtStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Open</span>;
      case 'ASSIGNED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Assigned</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">In Progress</span>;
      case 'ANSWERED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 size={12} /> Answered</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">Resolved</span>;
      case 'REOPENED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Reopened</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-50 text-gray-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Quick CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#17152A]">
            My Academic Doubts
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6990] mt-1">
            Get 1-on-1 step-by-step guidance from BITS Pilani &amp; IIT faculty for your courses.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-[#3F328A] hover:bg-[#2D246B] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Ask Faculty Doubt</span>
        </button>
      </div>

      {/* 2. Overview Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E3F5] shadow-xs">
          <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider">Total Doubts</span>
          <div className="text-2xl font-black text-[#17152A] mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E7E3F5] shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Open</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{metrics.open}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E7E3F5] shadow-xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">In Review</span>
          <div className="text-2xl font-black text-purple-700 mt-1">{metrics.inProgress}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E7E3F5] shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Answered</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.answered}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E7E3F5] shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resolved</span>
          <div className="text-2xl font-black text-gray-700 mt-1">{metrics.resolved}</div>
        </div>
      </div>

      {/* 3. Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E7E3F5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'ANSWERED', 'RESOLVED', 'REOPENED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedStatus === st
                  ? 'bg-[#3F328A] text-white shadow-xs'
                  : 'bg-[#F6F4FF] text-[#6E6990] hover:text-[#17152A] hover:bg-[#E7E3F5]'
              }`}
            >
              {st === 'ALL'
                ? 'All Doubts'
                : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6990]" />
          <input
            type="text"
            placeholder="Search doubts or courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E7E3F5] text-xs focus:outline-none focus:border-[#3F328A] focus:ring-1 focus:ring-[#3F328A]"
          />
        </form>
      </div>

      {/* 4. Doubts Feed */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-[#3F328A] mx-auto" />
          <p className="text-xs text-[#6E6990]">Loading your academic doubts...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-3">
          <AlertCircle size={28} className="text-rose-600 mx-auto" />
          <h4 className="text-sm font-bold text-rose-900">Failed to load doubts</h4>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchDoubts}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : doubts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E7E3F5] shadow-xs space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#F6F4FF] text-[#3F328A] flex items-center justify-center mx-auto">
            <HelpCircle size={32} />
          </div>
          <h3 className="text-lg font-black text-[#17152A]">No Doubts Found</h3>
          <p className="text-xs text-[#6E6990] leading-relaxed">
            {searchTerm || selectedStatus !== 'ALL'
              ? 'No doubts match your current search filters. Try clearing the filters.'
              : 'You have not submitted any doubts yet. When studying lectures or mock tests, click "Ask Faculty Doubt" to get 1-on-1 academic assistance.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-[#3F328A] text-white text-xs font-bold hover:bg-[#2D246B] transition shadow-xs"
          >
            Ask Your First Question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {doubts.map((doubt) => (
            <Link
              key={doubt.id}
              href={`/student/doubts/${doubt.id}`}
              className="block bg-white rounded-3xl p-6 border border-[#E7E3F5] shadow-xs hover:border-[#3F328A]/40 hover:shadow-md transition-all space-y-4 group"
            >
              {/* Top Row: Academic Context & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-[#F0EDFD] text-[#3F328A]">
                    {doubt.courseTitle}
                  </span>
                  {doubt.subjectName && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 text-[#17152A]">
                      {doubt.subjectName}
                    </span>
                  )}
                  {doubt.chapterName && (
                    <span className="text-[11px] text-[#6E6990] hidden sm:inline">
                      • Chapter: {doubt.chapterName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(doubt.status)}
                </div>
              </div>

              {/* Doubt Title & Description Preview */}
              <div>
                <h3 className="text-base font-black text-[#17152A] group-hover:text-[#3F328A] transition-colors line-clamp-1">
                  {doubt.title}
                </h3>
                <p className="text-xs text-[#6E6990] mt-1 line-clamp-2 leading-relaxed">
                  {doubt.description}
                </p>
              </div>

              {/* Bottom Row: Metadata & Reply Stats */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F1EFFB] text-[11px] text-[#6E6990]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    Asked on {new Date(doubt.createdAt).toLocaleDateString()}
                  </span>
                  {doubt.assignedFacultyName && (
                    <span className="font-semibold text-[#17152A]">
                      Faculty: {doubt.assignedFacultyName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-bold text-[#3F328A]">
                    <MessageSquare size={13} />
                    {doubt.replyCount || 0} Replies
                  </span>
                  <div className="flex items-center text-xs font-bold text-[#3F328A] group-hover:translate-x-0.5 transition-transform">
                    <span>View Thread</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Floating Doubt Creation Modal */}
      <DoubtModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchDoubts();
        }}
        courseId={1}
        courseTitle="General Curriculum Question"
        onDoubtCreated={() => {
          fetchDoubts();
        }}
      />
    </div>
  );
}
