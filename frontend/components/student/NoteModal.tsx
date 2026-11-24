'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Pin,
  Check,
  AlertCircle,
  Clock,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Code,
  Quote,
  Sparkles,
  Trash2,
  Tag,
  GraduationCap,
  Video,
  FileText,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/ui/LoadingSpinner';
import { MathRenderer } from '@/components/ui/MathRenderer';
import { StudentNoteRecord } from '@/lib/notes/types';
import { apiClient } from '@/lib/apiClient';

interface NoteContext {
  courseId?: number;
  courseTitle?: string;
  subjectId?: number;
  subjectName?: string;
  chapterId?: number;
  chapterName?: string;
  topicId?: number;
  topicName?: string;
  videoId?: number;
  videoTitle?: string;
  videoTimestampMinutes?: string;
  documentId?: number;
  documentTitle?: string;
}

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: StudentNoteRecord | null;
  context?: NoteContext;
  onSaved?: (savedNote: StudentNoteRecord) => void;
  onDeleted?: (noteId: number) => void;
}

type SaveStatus = 'SAVED' | 'SAVING' | 'UNSAVED' | 'CONFLICT' | 'ERROR';

export function NoteModal({
  isOpen,
  onClose,
  note,
  context,
  onSaved,
  onDeleted,
}: NoteModalProps) {
  const [activeNote, setActiveNote] = useState<StudentNoteRecord | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('SAVED');
  const [statusMessage, setStatusMessage] = useState('');
  const [version, setVersion] = useState<number>(1);
  const [previewMode, setPreviewMode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Initialize form when opened or note changes
  useEffect(() => {
    if (isOpen) {
      if (note) {
        setActiveNote(note);
        setTitle(note.title);
        setContent(note.content);
        setTagsInput((note.tags || []).join(', '));
        setIsPinned(note.isPinned);
        setVersion(note.version);
        setSaveStatus('SAVED');
      } else {
        setActiveNote(null);
        setTitle('');
        setContent('');
        setTagsInput('');
        setIsPinned(false);
        setVersion(1);
        setSaveStatus('SAVED');
      }
      isInitialMount.current = true;
    }
  }, [isOpen, note]);

  // Execute Save Function
  const executeSave = useCallback(
    async (overrideTitle?: string, overrideContent?: string, overridePinned?: boolean) => {
      const currentTitle = (overrideTitle !== undefined ? overrideTitle : title).trim() || 'Untitled Note';
      const currentContent = overrideContent !== undefined ? overrideContent : content;
      const currentPinned = overridePinned !== undefined ? overridePinned : isPinned;

      const currentTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      setSaveStatus('SAVING');
      setStatusMessage('Saving...');

      try {
        if (activeNote?.id) {
          // PATCH existing note
          const res = await apiClient(`/api/student/notes/${activeNote.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: currentTitle,
              content: currentContent,
              isPinned: currentPinned,
              tags: currentTags,
              expectedVersion: version,
            }),
          });

          const data = await res.json();
          if (res.status === 409) {
            setSaveStatus('CONFLICT');
            setStatusMessage('Conflict: note modified elsewhere. Refresh needed.');
            return;
          }

          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to save note');
          }

          setActiveNote(data.data);
          setVersion(data.data.version);
          setSaveStatus('SAVED');
          setStatusMessage('All changes saved');
          if (onSaved) onSaved(data.data);
        } else {
          // POST new note
          const res = await apiClient('/api/student/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: currentTitle,
              content: currentContent,
              isPinned: currentPinned,
              tags: currentTags,
              courseId: context?.courseId,
              courseTitle: context?.courseTitle,
              subjectId: context?.subjectId,
              subjectName: context?.subjectName,
              chapterId: context?.chapterId,
              chapterName: context?.chapterName,
              topicId: context?.topicId,
              topicName: context?.topicName,
              videoId: context?.videoId,
              videoTitle: context?.videoTitle,
              documentId: context?.documentId,
              documentTitle: context?.documentTitle,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to create note');
          }

          setActiveNote(data.data);
          setVersion(data.data.version);
          setSaveStatus('SAVED');
          setStatusMessage('Note created & saved');
          if (onSaved) onSaved(data.data);
        }
      } catch (err: any) {
        console.error('Autosave error:', err);
        setSaveStatus('ERROR');
        setStatusMessage(err.message || 'Save failed - Retry');
      }
    },
    [title, content, tagsInput, isPinned, version, activeNote, context, onSaved]
  );

  // Debounced Autosave on content/title change (1500ms)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isOpen) return;

    setSaveStatus('UNSAVED');
    setStatusMessage('Unsaved changes');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Only autosave if there is some title or content
    if (title.trim() || content.trim()) {
      autosaveTimerRef.current = setTimeout(() => {
        executeSave();
      }, 1500);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [title, content, tagsInput, isPinned]);

  // Insert markdown tag helper
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);

    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const nextContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(nextContent);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 0);
  };

  const handleDelete = async () => {
    if (!activeNote?.id) {
      onClose();
      return;
    }
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const res = await apiClient(`/api/student/notes/${activeNote.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDeleted) onDeleted(activeNote.id);
        onClose();
      }
    } catch (err) {
      console.error('Delete note failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const nextPinned = !isPinned;
                setIsPinned(nextPinned);
                executeSave(undefined, undefined, nextPinned);
              }}
              className={`p-2 rounded-lg transition-colors border ${
                isPinned
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'
              }`}
              title={isPinned ? 'Pinned note' : 'Pin to top'}
            >
              <Pin className={`h-4 w-4 ${isPinned ? 'fill-amber-500' : ''}`} />
            </button>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {activeNote?.id ? 'Edit Study Note' : 'Create New Note'}
              </h3>
              {/* Academic context tags */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                {(context?.courseTitle || activeNote?.courseTitle) && (
                  <span className="flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    <GraduationCap className="h-3 w-3" />
                    {context?.courseTitle || activeNote?.courseTitle}
                  </span>
                )}
                {(context?.topicName || activeNote?.topicName) && (
                  <span className="text-gray-600">
                    › {context?.topicName || activeNote?.topicName}
                  </span>
                )}
                {(context?.videoTimestampMinutes) && (
                  <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                    <Video className="h-3 w-3" /> @ {context.videoTimestampMinutes}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === 'SAVED' && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
              {saveStatus === 'SAVING' && (
                <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                  <LoadingSpinner size="sm" className="p-0 text-indigo-600" /> Saving...
                </span>
              )}
              {saveStatus === 'UNSAVED' && (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <Clock className="h-3.5 w-3.5" /> Unsaved
                </span>
              )}
              {saveStatus === 'CONFLICT' && (
                <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                  <AlertCircle className="h-3.5 w-3.5" /> Version conflict
                </span>
              )}
              {saveStatus === 'ERROR' && (
                <button
                  onClick={() => executeSave()}
                  className="inline-flex items-center gap-1 text-rose-600 underline font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5" /> Retry save
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (saveStatus === 'UNSAVED') executeSave();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none p-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="px-6 py-2 border-b border-gray-100 flex items-center justify-between bg-white text-gray-600">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Bold (**text**)"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Italic (*text*)"
            >
              <Italic className="h-4 w-4" />
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => insertFormatting('# ')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Heading 1 (# Heading)"
            >
              <Heading1 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('## ')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Heading 2 (## Heading)"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={() => insertFormatting('- ')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Bullet List (- item)"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```\n', '\n```')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Code Block (```)"
            >
              <Code className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('> ')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
              title="Quote (> quote)"
            >
              <Quote className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('$$', '$$')}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-700 font-serif font-bold text-xs"
              title="Math LaTeX ($$ formula $$)"
            >
              fx
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
              previewMode
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {previewMode ? 'Edit Mode' : 'Live Preview'}
          </button>
        </div>

        {/* Conflict Alert Banner if any */}
        {saveStatus === 'CONFLICT' && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 flex items-center justify-between">
            <span>
              <strong>Conflict Detected:</strong> This note was modified in another window.
            </span>
            <button
              type="button"
              onClick={() => executeSave()}
              className="bg-rose-600 text-white px-2.5 py-1 rounded text-xs font-semibold hover:bg-rose-700"
            >
              Overwrite Anyway
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Note Title (e.g. Center of Mass Integration Steps)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg font-bold text-gray-900 placeholder:text-gray-300 border-none outline-none focus:ring-0 p-0"
            />
          </div>

          {previewMode ? (
            <div className="min-h-[220px] p-4 bg-slate-50/50 rounded-xl border border-gray-200 text-sm leading-relaxed text-gray-800">
              <MathRenderer content={content || '*No content yet...*'} />
            </div>
          ) : (
            <div>
              <textarea
                ref={textareaRef}
                rows={10}
                placeholder="Write your study notes, formulas, step-by-step solutions, key reminders... (Supports Markdown and LaTeX)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-sm text-gray-800 placeholder:text-gray-300 border-none outline-none focus:ring-0 p-0 resize-none font-sans leading-relaxed"
              />
            </div>
          )}

          {/* Tags bar */}
          <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
            <Tag className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Add tags separated by comma (e.g. Physics, Formula, Revision)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full text-xs text-gray-700 placeholder:text-gray-400 border-none outline-none focus:ring-0 p-0"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-slate-50 text-xs">
          <div className="flex items-center gap-3">
            {activeNote?.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete Note"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
            <span className="text-gray-400">
              {version > 1 ? `v${version}` : 'New note'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (saveStatus === 'UNSAVED') executeSave();
                onClose();
              }}
              className="px-4 py-1.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => executeSave()}
              disabled={saveStatus === 'SAVING'}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs disabled:opacity-50"
            >
              {saveStatus === 'SAVING' ? 'Saving...' : 'Save Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
