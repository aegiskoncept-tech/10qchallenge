'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  Upload,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  Send,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DoubtAttachmentItem } from '@/lib/doubts/types';

interface DoubtModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  courseTitle: string;
  subjectId?: number;
  subjectName?: string;
  chapterId?: number;
  chapterName?: string;
  topicId?: number;
  topicName?: string;
  lessonId?: number;
  lessonTitle?: string;
  videoTimestampSeconds?: number;
  documentId?: number;
  onDoubtCreated?: (doubt: any) => void;
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )10q_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export const DoubtModal: React.FC<DoubtModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  subjectId,
  subjectName,
  chapterId,
  chapterName,
  topicId,
  topicName,
  lessonId,
  lessonTitle,
  videoTimestampSeconds = 0,
  documentId,
  onDoubtCreated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [attachments, setAttachments] = useState<DoubtAttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setAttachments([]);
      setErrorMessage(null);
      setIsSuccess(false);
      if (videoTimestampSeconds > 0) {
        const mins = Math.floor(videoTimestampSeconds / 60);
        const secs = (videoTimestampSeconds % 60).toString().padStart(2, '0');
        setTimestamp(`${mins}:${secs}`);
      } else {
        setTimestamp('');
      }
    }
  }, [isOpen, videoTimestampSeconds]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const csrf = getCsrfToken();
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/student/doubts/upload', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
        body: fd,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to upload attachment.');
      }

      setAttachments((prev) => [...prev, json.attachment]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Attachment upload failed.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle || trimmedTitle.length < 3) {
      setErrorMessage('Please provide a specific doubt title (minimum 3 characters).');
      return;
    }
    if (!trimmedDesc || trimmedDesc.length < 5) {
      setErrorMessage('Please describe your query in detail (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const csrf = getCsrfToken();
      const res = await fetch('/api/student/doubts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({
          courseId,
          courseTitle,
          subjectId,
          subjectName,
          chapterId,
          chapterName,
          topicId,
          topicName,
          lessonId,
          lessonTitle,
          videoTimestampMinutes: timestamp || undefined,
          documentId,
          title: trimmedTitle,
          description: trimmedDesc,
          attachments,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit doubt.');
      }

      setIsSuccess(true);
      if (onDoubtCreated) onDoubtCreated(json.data);

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit doubt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E7E3F5] relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#F6F4FF] hover:bg-[#E7E3F5] text-[#6E6990] hover:text-[#17152A] flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#E8FAF0] text-[#16A34A] flex items-center justify-center shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-[#17152A]">Doubt Submitted Successfully!</h3>
            <p className="text-sm text-[#6E6990] max-w-sm">
              Our 10Q Master Faculty will review your query and post a step-by-step resolution. You can track this in My Doubts.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-[#FFE8ED] text-[#FF3F68] flex items-center justify-center font-bold">
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#17152A]">Ask Master Faculty</h3>
                <p className="text-xs text-[#6E6990]">1-on-1 step-by-step academic resolution</p>
              </div>
            </div>

            {/* Academic Context Badge */}
            <div className="bg-[#F6F4FF] p-3 rounded-2xl border border-[#E7E3F5] mb-5 text-xs text-[#3F328A] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3F328A]" />
                <span>Course: {courseTitle}</span>
              </div>
              {(chapterName || lessonTitle || topicName) && (
                <div className="text-[#6E6990] pl-3.5 space-y-0.5">
                  {subjectName && <div>Subject: <span className="font-semibold text-[#17152A]">{subjectName}</span></div>}
                  {chapterName && <div>Chapter: <span className="font-semibold text-[#17152A]">{chapterName}</span></div>}
                  {(topicName || lessonTitle) && (
                    <div>Lesson/Topic: <span className="font-semibold text-[#17152A]">{topicName || lessonTitle}</span></div>
                  )}
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Doubt Title */}
              <div>
                <label className="block text-xs font-bold text-[#17152A] mb-1.5">
                  Question Summary / Title <span className="text-[#FF3F68]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cross-product direction rule in 2D relative motion"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E7E3F5] text-sm focus:outline-none focus:border-[#3F328A] focus:ring-1 focus:ring-[#3F328A]"
                />
              </div>

              {/* Video Timestamp (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#17152A] mb-1.5 flex items-center gap-1.5">
                  <Clock size={13} className="text-[#6E6990]" />
                  <span>Video Timestamp (MM:SS, Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14:20"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E7E3F5] text-sm focus:outline-none focus:border-[#3F328A] focus:ring-1 focus:ring-[#3F328A]"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-[#17152A] mb-1.5">
                  Detailed Query Description <span className="text-[#FF3F68]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain exactly where you got stuck or paste the formula/equation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E3F5] text-sm focus:outline-none focus:border-[#3F328A] focus:ring-1 focus:ring-[#3F328A] resize-none"
                />
              </div>

              {/* Attachment Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#17152A] mb-1.5 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-[#6E6990]" />
                  <span>Attach Screenshot or PDF (Max 10MB)</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-4 py-2 rounded-xl border border-dashed border-[#3F328A]/40 hover:bg-[#F6F4FF] text-xs font-semibold text-[#3F328A] flex items-center gap-2 transition-colors">
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>{isUploading ? 'Uploading...' : 'Choose File (PDF/Image)'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                  {attachments.map((att, idx) => (
                    <div
                      key={att.id}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2"
                    >
                      <FileText size={13} className="text-[#3F328A]" />
                      <span className="truncate max-w-[140px] font-semibold">{att.originalFilename}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-gray-400 hover:text-red-500 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="w-full py-3.5 rounded-xl bg-[#3F328A] hover:bg-[#2D246B] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting Doubt...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Question to Faculty</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
