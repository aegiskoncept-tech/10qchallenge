'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  Pin,
  Trash2,
  GraduationCap,
  Video,
  Clock,
  Sparkles,
  BookOpen,
  Tag,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { NoteModal } from '@/components/student/NoteModal';
import { StudentNoteRecord, NotesSummaryMetrics } from '@/lib/notes/types';
import { apiClient } from '@/lib/apiClient';

export default function StudentNotesPage() {
  const [notes, setNotes] = useState<StudentNoteRecord[]>([]);
  const [metrics, setMetrics] = useState<NotesSummaryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPinned, setFilterPinned] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudentNoteRecord | null>(null);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPinned) params.set('isPinned', 'true');
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await apiClient(`/api/student/notes?${params.toString()}`);
      if (res.ok) {
        const j = await res.json();
        if (j.success && Array.isArray(j.data)) {
          setNotes(j.data);
          if (j.metrics) setMetrics(j.metrics);
        }
      }
    } catch (err) {
      console.error('Error fetching student notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [filterPinned]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotes();
  };

  const togglePin = async (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    try {
      const res = await apiClient(`/api/student/notes/${noteId}/pin`, { method: 'POST' });
      if (res.ok) {
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this study note?')) return;
    try {
      const res = await apiClient(`/api/student/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (metrics) {
          setMetrics({ ...metrics, total: Math.max(0, metrics.total - 1) });
        }
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Derive unique courses for filter dropdown
  const uniqueCourses = Array.from(
    new Set(notes.map((n) => n.courseTitle).filter(Boolean))
  ) as string[];

  const displayedNotes = notes.filter((n) => {
    if (selectedCourse !== 'ALL' && n.courseTitle !== selectedCourse) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-indigo-600" />
            My Study Notes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Personal lecture summaries, formulas, and conceptual notes across all your enrolled courses.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingNote(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create New Note
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Notes</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{metrics?.total ?? notes.length}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pinned Notes</p>
            <p className="text-3xl font-bold text-amber-700 mt-1">
              {metrics?.pinned ?? notes.filter((n) => n.isPinned).length}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Pin className="h-6 w-6 fill-amber-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Courses Covered</p>
            <p className="text-3xl font-bold text-purple-700 mt-1">
              {metrics?.courseCount ?? uniqueCourses.length}
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes by title, content, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterPinned(!filterPinned)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              filterPinned
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Pin className={`h-3.5 w-3.5 ${filterPinned ? 'fill-amber-500' : ''}`} />
            <span>Pinned Only</span>
          </button>

          {uniqueCourses.length > 0 && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="py-2 px-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Courses</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-gray-200">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500 mt-2">Loading your notes...</p>
        </div>
      ) : displayedNotes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-gray-200 space-y-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <BookOpen className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">No study notes found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
              Capture your key formulas, shortcuts, and insights while watching classroom lectures.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingNote(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Write Your First Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => {
                setEditingNote(note);
                setIsModalOpen(true);
              }}
              className={`group bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                note.isPinned
                  ? 'border-amber-300 ring-1 ring-amber-100 bg-linear-to-b from-amber-50/20 to-white'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div>
                {/* Header row: Course & Pin button */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    {note.courseTitle && (
                      <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 truncate max-w-[170px]">
                        {note.courseTitle}
                      </span>
                    )}
                    {note.topicName && (
                      <span className="text-gray-400 truncate max-w-[120px]">
                        › {note.topicName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => togglePin(e, note.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        note.isPinned
                          ? 'text-amber-600 hover:bg-amber-100'
                          : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      title={note.isPinned ? 'Unpin' : 'Pin note'}
                    >
                      <Pin className={`h-4 w-4 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNote(e, note.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
                  {note.title}
                </h3>

                {/* Preview text */}
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-4 font-normal">
                  {note.plainTextPreview || '*No content*'}
                </p>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-3">
                    {note.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                      >
                        <Tag className="h-2.5 w-2.5 text-gray-400" />
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-[10px] text-gray-400">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(note.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span>v{note.version}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Edit / Create Modal */}
      <NoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        note={editingNote}
        onSaved={(savedNote) => {
          fetchNotes();
        }}
        onDeleted={(deletedId) => {
          setNotes((prev) => prev.filter((n) => n.id !== deletedId));
        }}
      />
    </div>
  );
}
