'use client';

import React, { useState, useEffect, use, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Info,
  Layers,
  Lock,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Video,
  AlertCircle,
  Loader2,
  FileCheck,
  Menu,
  X,
} from 'lucide-react';
import {
  ClassroomCurriculumData,
  ClassroomSubject,
  ClassroomChapter,
  TopicProgressItem,
  SanitizedClassroomVideo,
  SanitizedClassroomDocument,
  TopicProgressStatus,
} from '@/lib/learning/types';
import { VimeoPlayer, UniversalVideoPlayer } from '@/components/student/VimeoPlayer';
import { SecurePdfViewer } from '@/components/classroom/SecurePdfViewer';
import { DoubtModal } from '@/components/student/DoubtModal';
import { NoteModal } from '@/components/student/NoteModal';

interface ClassroomPageProps {
  params: Promise<{ id?: string; courseId?: string }>;
}

interface FlatLessonItem {
  id: string;
  type: 'TOPIC' | 'VIDEO' | 'DOCUMENT';
  subjectId: number;
  subjectName: string;
  chapterId: number;
  chapterName: string;
  item: TopicProgressItem | SanitizedClassroomVideo | SanitizedClassroomDocument;
  title: string;
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )10q_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function ClassroomLoadingSkeleton() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-[#F6F4FF] border border-[#E7E3F5] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#3F328A] animate-spin" />
      </div>
      <div>
        <h3 className="text-base font-extrabold text-[#17152A]">Loading Classroom...</h3>
        <p className="text-xs text-[#6E6990] mt-1">
          Authorizing enrollment and retrieving course curriculum
        </p>
      </div>
    </div>
  );
}

function ClassroomPageContent({ params }: ClassroomPageProps) {
  const resolvedParams = use(params);
  const rawId = resolvedParams.courseId || resolvedParams.id;
  const courseId = parseInt(rawId || '0', 10);

  const searchParams = useSearchParams();
  const querySubjectId = searchParams?.get('subject') ? parseInt(searchParams.get('subject')!, 10) : null;
  const queryChapterId = searchParams?.get('chapter') ? parseInt(searchParams.get('chapter')!, 10) : null;
  const queryTopicId = searchParams?.get('topic') ? parseInt(searchParams.get('topic')!, 10) : null;
  const queryVideoId = searchParams?.get('video') ? parseInt(searchParams.get('video')!, 10) : null;
  const queryDocId = searchParams?.get('document') ? parseInt(searchParams.get('document')!, 10) : null;

  // Authoritative curriculum state loaded from PostgreSQL via GET /api/student/classroom/[courseId]
  const [curriculum, setCurriculum] = useState<ClassroomCurriculumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{
    status: number;
    title: string;
    message: string;
  } | null>(null);

  // Navigation selections
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<number>>(new Set());

  // Active workspace viewport
  const [contentType, setContentType] = useState<'TOPIC' | 'VIDEO' | 'DOCUMENT'>('TOPIC');
  const [activeTopic, setActiveTopic] = useState<TopicProgressItem | null>(null);
  const [activeVideo, setActiveVideo] = useState<SanitizedClassroomVideo | null>(null);
  const [activeDocument, setActiveDocument] = useState<SanitizedClassroomDocument | null>(null);
  const [activeChapter, setActiveChapter] = useState<ClassroomChapter | null>(null);

  // Mobile syllabus drawer toggle
  const [showMobileSyllabus, setShowMobileSyllabus] = useState(false);

  // Video playback configuration fetched from GET /api/student/classroom/[courseId]/video/[videoId]
  const [videoPlaybackConfig, setVideoPlaybackConfig] = useState<any | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Mutation and interactive state
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteModalContext, setNoteModalContext] = useState<any>(null);
  const [mutatingTopicId, setMutatingTopicId] = useState<number | null>(null);
  const [mutatingVideoId, setMutatingVideoId] = useState<number | null>(null);
  const [mutatingDocId, setMutatingDocId] = useState<number | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const openNoteModal = (customContext?: any) => {
    setNoteModalContext({
      courseId,
      courseTitle: curriculum?.courseTitle,
      subjectId: selectedSubjectId || undefined,
      subjectName: currentSubject?.subjectName,
      chapterId: activeChapter?.chapterId,
      chapterName: activeChapter?.chapterName,
      topicId: activeTopic?.topicId,
      topicName: activeTopic?.topicName,
      videoId: activeVideo?.id,
      videoTitle: activeVideo?.title,
      documentId: activeDocument?.id,
      documentTitle: activeDocument?.title,
      ...customContext,
    });
    setIsNoteModalOpen(true);
  };

  // Flattened sequential curriculum list for linear Previous / Next navigation
  const flatLessons: FlatLessonItem[] = useMemo(() => {
    if (!curriculum?.subjects) return [];
    const list: FlatLessonItem[] = [];
    for (const sub of curriculum.subjects) {
      for (const chap of sub.chapters || []) {
        for (const top of chap.topics || []) {
          list.push({
            id: `TOPIC-${top.topicId}`,
            type: 'TOPIC',
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            chapterId: chap.chapterId,
            chapterName: chap.chapterName,
            item: top,
            title: top.topicName,
          });
        }
        for (const vid of chap.videos || []) {
          list.push({
            id: `VIDEO-${vid.id}`,
            type: 'VIDEO',
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            chapterId: chap.chapterId,
            chapterName: chap.chapterName,
            item: vid,
            title: vid.title,
          });
        }
        for (const doc of chap.documents || []) {
          list.push({
            id: `DOCUMENT-${doc.id}`,
            type: 'DOCUMENT',
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            chapterId: chap.chapterId,
            chapterName: chap.chapterName,
            item: doc,
            title: doc.title,
          });
        }
      }
    }
    return list;
  }, [curriculum]);

  // Current linear index in flattened sequence
  const currentLessonIndex = useMemo(() => {
    if (contentType === 'TOPIC' && activeTopic) {
      return flatLessons.findIndex(
        (l) => l.type === 'TOPIC' && (l.item as TopicProgressItem).topicId === activeTopic.topicId
      );
    }
    if (contentType === 'VIDEO' && activeVideo) {
      return flatLessons.findIndex(
        (l) => l.type === 'VIDEO' && (l.item as SanitizedClassroomVideo).id === activeVideo.id
      );
    }
    if (contentType === 'DOCUMENT' && activeDocument) {
      return flatLessons.findIndex(
        (l) => l.type === 'DOCUMENT' && (l.item as SanitizedClassroomDocument).id === activeDocument.id
      );
    }
    return -1;
  }, [flatLessons, contentType, activeTopic, activeVideo, activeDocument]);

  const prevLesson = currentLessonIndex > 0 ? flatLessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < flatLessons.length - 1
      ? flatLessons[currentLessonIndex + 1]
      : null;

  // Navigate to target lesson from linear sequence
  const navigateToFlatLesson = (target: FlatLessonItem) => {
    setSelectedSubjectId(target.subjectId);
    setExpandedChapterIds((prev) => new Set([...prev, target.chapterId]));

    const targetSub = curriculum?.subjects.find((s) => s.subjectId === target.subjectId);
    const targetChap = targetSub?.chapters?.find((c) => c.chapterId === target.chapterId) || null;
    if (targetChap) setActiveChapter(targetChap);

    if (target.type === 'TOPIC') {
      setContentType('TOPIC');
      setActiveTopic(target.item as TopicProgressItem);
      setActiveVideo(null);
      setActiveDocument(null);
    } else if (target.type === 'VIDEO') {
      setContentType('VIDEO');
      setActiveVideo(target.item as SanitizedClassroomVideo);
      setActiveTopic(null);
      setActiveDocument(null);
    } else if (target.type === 'DOCUMENT') {
      setContentType('DOCUMENT');
      setActiveDocument(target.item as SanitizedClassroomDocument);
      setActiveTopic(null);
      setActiveVideo(null);
    }
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setShowMobileSyllabus(false);
  };

  // Synchronize browser URL query parameters dynamically without full refresh
  useEffect(() => {
    if (typeof window !== 'undefined' && courseId > 0 && selectedSubjectId && activeChapter?.chapterId) {
      const sp = new URLSearchParams();
      sp.set('subject', String(selectedSubjectId));
      sp.set('chapter', String(activeChapter.chapterId));
      if (contentType === 'TOPIC' && activeTopic) {
        sp.set('topic', String(activeTopic.topicId));
      } else if (contentType === 'VIDEO' && activeVideo) {
        sp.set('video', String(activeVideo.id));
      } else if (contentType === 'DOCUMENT' && activeDocument) {
        sp.set('document', String(activeDocument.id));
      }
      const newUrl = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [
    courseId,
    selectedSubjectId,
    activeChapter?.chapterId,
    contentType,
    activeTopic?.topicId,
    activeVideo?.id,
    activeDocument?.id,
  ]);

  // Load authoritative curriculum from server
  const loadCurriculum = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      setErrorState(null);

      try {
        const res = await fetch(`/api/student/classroom/${courseId}`, {
          cache: 'no-store',
        });

        if (res.status === 401) {
          setErrorState({
            status: 401,
            title: 'Authentication Required',
            message: 'Please sign in to access your course classroom and learning materials.',
          });
          setLoading(false);
          return;
        }

        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          setErrorState({
            status: 403,
            title: 'Access Restricted',
            message:
              data.error ||
              'You do not have an active settled enrollment for this course. Classroom access is reserved for enrolled students.',
          });
          setLoading(false);
          return;
        }

        if (res.status === 404) {
          setErrorState({
            status: 404,
            title: 'Course Not Found',
            message: `Course #${courseId} does not exist in the curriculum catalog.`,
          });
          setLoading(false);
          return;
        }

        if (res.status === 429) {
          setErrorState({
            status: 429,
            title: 'Rate Limit Reached',
            message: 'Too many requests. Please wait a moment and refresh.',
          });
          setLoading(false);
          return;
        }

        if (!res.ok) {
          setErrorState({
            status: res.status,
            title: 'Failed to Load Classroom',
            message: 'An unexpected error occurred while loading course curriculum.',
          });
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (json.success && json.data) {
          const data: ClassroomCurriculumData = json.data;
          setCurriculum(data);

          // On initial load, resolve selections prioritizing deep links, then lastActivity, then first subject/chapter
          if (isInitial && data.subjects && data.subjects.length > 0) {
            let matchedSubject: ClassroomSubject | null = null;
            let matchedChapter: ClassroomChapter | null = null;
            let matchedTopic: TopicProgressItem | null = null;
            let matchedVideo: SanitizedClassroomVideo | null = null;
            let matchedDoc: SanitizedClassroomDocument | null = null;

            // 1. Deep link: Topic ID
            if (queryTopicId) {
              for (const sub of data.subjects) {
                for (const chap of sub.chapters || []) {
                  const top = chap.topics?.find((t) => t.topicId === queryTopicId);
                  if (top) {
                    matchedSubject = sub;
                    matchedChapter = chap;
                    matchedTopic = top;
                    break;
                  }
                }
                if (matchedTopic) break;
              }
            }

            // 2. Deep link: Video ID
            if (!matchedTopic && queryVideoId) {
              for (const sub of data.subjects) {
                for (const chap of sub.chapters || []) {
                  const vid = chap.videos?.find((v) => v.id === queryVideoId);
                  if (vid) {
                    matchedSubject = sub;
                    matchedChapter = chap;
                    matchedVideo = vid;
                    break;
                  }
                }
                if (matchedVideo) break;
              }
            }

            // 3. Deep link: Document ID
            if (!matchedTopic && !matchedVideo && queryDocId) {
              for (const sub of data.subjects) {
                for (const chap of sub.chapters || []) {
                  const doc = chap.documents?.find((d) => d.id === queryDocId);
                  if (doc) {
                    matchedSubject = sub;
                    matchedChapter = chap;
                    matchedDoc = doc;
                    break;
                  }
                }
                if (matchedDoc) break;
              }
            }

            // 4. Deep link: Chapter ID
            if (!matchedChapter && queryChapterId) {
              for (const sub of data.subjects) {
                const chap = sub.chapters?.find((c) => c.chapterId === queryChapterId);
                if (chap) {
                  matchedSubject = sub;
                  matchedChapter = chap;
                  break;
                }
              }
            }

            // 5. Deep link: Subject ID
            if (!matchedSubject && querySubjectId) {
              matchedSubject = data.subjects.find((s) => s.subjectId === querySubjectId) || null;
              if (matchedSubject && matchedSubject.chapters?.length > 0) {
                matchedChapter = matchedSubject.chapters[0];
              }
            }

            // 6. Last Activity from server
            if (!matchedSubject && data.lastActivity?.subjectId) {
              const actSub = data.subjects.find((s) => s.subjectId === data.lastActivity!.subjectId);
              if (actSub) {
                matchedSubject = actSub;
                if (data.lastActivity.chapterId) {
                  matchedChapter = actSub.chapters?.find((c) => c.chapterId === data.lastActivity!.chapterId) || null;
                }
              }
            }

            // 7. Default fallback: First subject & First chapter
            if (!matchedSubject) {
              matchedSubject = data.subjects[0];
            }
            if (!matchedChapter && matchedSubject.chapters && matchedSubject.chapters.length > 0) {
              matchedChapter = matchedSubject.chapters[0];
            }

            setSelectedSubjectId(matchedSubject.subjectId);
            if (matchedChapter) {
              setExpandedChapterIds(new Set([matchedChapter.chapterId]));
              setActiveChapter(matchedChapter);

              if (matchedTopic) {
                setContentType('TOPIC');
                setActiveTopic(matchedTopic);
                setActiveVideo(null);
                setActiveDocument(null);
              } else if (matchedVideo) {
                setContentType('VIDEO');
                setActiveVideo(matchedVideo);
                setActiveTopic(null);
                setActiveDocument(null);
              } else if (matchedDoc) {
                setContentType('DOCUMENT');
                setActiveDocument(matchedDoc);
                setActiveTopic(null);
                setActiveVideo(null);
              } else if (matchedChapter.topics && matchedChapter.topics.length > 0) {
                setContentType('TOPIC');
                setActiveTopic(matchedChapter.topics[0]);
                setActiveVideo(null);
                setActiveDocument(null);
              } else if (matchedChapter.videos && matchedChapter.videos.length > 0) {
                setContentType('VIDEO');
                setActiveVideo(matchedChapter.videos[0]);
                setActiveTopic(null);
                setActiveDocument(null);
              } else if (matchedChapter.documents && matchedChapter.documents.length > 0) {
                setContentType('DOCUMENT');
                setActiveDocument(matchedChapter.documents[0]);
                setActiveTopic(null);
                setActiveVideo(null);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to load classroom:', err);
        setErrorState({
          status: 500,
          title: 'Connection Error',
          message: 'Unable to reach the classroom server. Please check your network connection.',
        });
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [courseId, querySubjectId, queryChapterId, queryTopicId, queryVideoId, queryDocId]
  );

  useEffect(() => {
    loadCurriculum(true);
  }, [loadCurriculum]);

  // Load Video Playback Config from Stage 3 endpoint when an active video is selected
  useEffect(() => {
    if (contentType !== 'VIDEO' || !activeVideo) {
      setVideoPlaybackConfig(null);
      setVideoError(null);
      return;
    }

    let isMounted = true;
    setVideoLoading(true);
    setVideoError(null);

    async function fetchVideoConfig() {
      try {
        const res = await fetch(`/api/student/classroom/${courseId}/video/${activeVideo!.id}`, {
          cache: 'no-store',
        });

        if (!isMounted) return;

        if (res.status === 401 || res.status === 403) {
          setVideoError('Video playback is restricted to enrolled students with active access.');
          setVideoLoading(false);
          return;
        }

        if (res.status === 404) {
          setVideoError('Lecture video recording is not yet available for this chapter.');
          setVideoLoading(false);
          return;
        }

        const data = await res.json();
        if (isMounted) {
          const pbConfig = data.data?.playbackConfig || data.playbackConfig;
          if (data.success && pbConfig) {
            setVideoPlaybackConfig(pbConfig);
          } else {
            setVideoError(data.error || 'Video playback configuration is unavailable.');
          }
          setVideoLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setVideoError('Unable to load video playback configuration.');
          setVideoLoading(false);
        }
      }
    }

    fetchVideoConfig();

    return () => {
      isMounted = false;
    };
  }, [courseId, contentType, activeVideo]);

  // Expand / collapse chapters
  const toggleChapterExpanded = (chapterId: number) => {
    setExpandedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  // Switch active item in main workspace
  const handleSelectTopic = (topic: TopicProgressItem, chapter: ClassroomChapter) => {
    setContentType('TOPIC');
    setActiveTopic(topic);
    setActiveVideo(null);
    setActiveDocument(null);
    setActiveChapter(chapter);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setShowMobileSyllabus(false);
  };

  const handleSelectVideo = (video: SanitizedClassroomVideo, chapter: ClassroomChapter) => {
    setContentType('VIDEO');
    setActiveVideo(video);
    setActiveTopic(null);
    setActiveDocument(null);
    setActiveChapter(chapter);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setShowMobileSyllabus(false);
  };

  const handleSelectDocument = (doc: SanitizedClassroomDocument, chapter: ClassroomChapter) => {
    setContentType('DOCUMENT');
    setActiveDocument(doc);
    setActiveTopic(null);
    setActiveVideo(null);
    setActiveChapter(chapter);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setShowMobileSyllabus(false);
  };

  // Mark Topic Complete using authenticated API
  const handleMarkTopicComplete = async (topicId: number) => {
    if (!curriculum || mutatingTopicId !== null) return;

    const isAlreadyCompleted = activeTopic?.topicId === topicId && activeTopic.status === 'COMPLETED';
    if (isAlreadyCompleted) return;

    setMutatingTopicId(topicId);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch('/api/student/progress/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          courseId,
          topicId,
          status: 'COMPLETED',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMessage('Topic marked as completed! Learning progress updated.');

        if (activeTopic && activeTopic.topicId === topicId) {
          setActiveTopic({
            ...activeTopic,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          });
        }

        await loadCurriculum(false);
      } else {
        setActionErrorMessage(data.error || 'Failed to update topic progress.');
      }
    } catch (err) {
      setActionErrorMessage('Network error while saving progress.');
    } finally {
      setMutatingTopicId(null);
    }
  };

  // Mark Video Watched using authenticated API
  const handleMarkVideoComplete = async (videoId: number) => {
    if (!curriculum || mutatingVideoId !== null) return;

    const isAlreadyCompleted = activeVideo?.id === videoId && activeVideo.status === 'COMPLETED';
    if (isAlreadyCompleted) return;

    setMutatingVideoId(videoId);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch('/api/student/progress/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          courseId,
          contentType: 'VIDEO',
          contentIdentifier: String(videoId),
          status: 'COMPLETED',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMessage('Video marked as watched! Progress recorded.');

        if (activeVideo && activeVideo.id === videoId) {
          setActiveVideo({
            ...activeVideo,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          });
        }

        await loadCurriculum(false);
      } else {
        setActionErrorMessage(data.error || 'Failed to record video completion.');
      }
    } catch (err) {
      setActionErrorMessage('Network error while saving video progress.');
    } finally {
      setMutatingVideoId(null);
    }
  };

  // Mark Document Completed using authenticated API
  const handleMarkDocumentCompleted = async (docId: number) => {
    if (!courseId || mutatingDocId !== null) return;
    const isAlreadyCompleted = activeDocument?.id === docId && (activeDocument as any).status === 'COMPLETED';
    if (isAlreadyCompleted) return;

    setMutatingDocId(docId);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch('/api/student/progress/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          courseId,
          contentType: 'PDF',
          contentIdentifier: String(docId),
          status: 'COMPLETED',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMessage('Study material marked as completed! Progress updated.');
        if (activeDocument && activeDocument.id === docId) {
          setActiveDocument({
            ...activeDocument,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          });
        }
        await loadCurriculum(false);
      } else {
        setActionErrorMessage(data.error || 'Failed to record document progress.');
      }
    } catch (err) {
      setActionErrorMessage('Network error while saving document progress.');
    } finally {
      setMutatingDocId(null);
    }
  };

  // 1. Loading State
  if (loading) {
    return <ClassroomLoadingSkeleton />;
  }

  // 2. Error / Access Denied States
  if (errorState) {
    const isAuth = errorState.status === 401;
    const isForbidden = errorState.status === 403;

    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-[#E7E3F5] shadow-xs text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-[#FFE8ED] text-[#FF3F68]">
          {isForbidden ? (
            <Lock className="w-8 h-8" />
          ) : isAuth ? (
            <ShieldAlert className="w-8 h-8" />
          ) : (
            <AlertCircle className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#FF3F68] uppercase tracking-wider">
            HTTP {errorState.status} • {isForbidden ? 'Enrollment Required' : 'Access Notice'}
          </span>
          <h2 className="text-2xl font-black text-[#17152A]">{errorState.title}</h2>
          <p className="text-sm text-[#6E6990] max-w-md mx-auto leading-relaxed">
            {errorState.message}
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/student/courses"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#F6F4FF] hover:bg-[#E7E3F5] text-[#3F328A] text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            <span>Back to My Courses</span>
          </Link>

          {isAuth ? (
            <Link
              href={`/login?redirect=/student/courses/${courseId}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3F328A] hover:bg-[#2D246B] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Sign In to Your Account</span>
            </Link>
          ) : isForbidden ? (
            <Link
              href="/courses"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3F328A] hover:bg-[#2D246B] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Explore Available Courses</span>
              <ExternalLink size={14} />
            </Link>
          ) : (
            <button
              onClick={() => loadCurriculum(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#3F328A] hover:bg-[#2D246B] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <RotateCcw size={14} />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!curriculum) return null;

  // Active Subject selection
  const subjects = curriculum.subjects || [];
  const currentSubject: ClassroomSubject | undefined =
    subjects.find((s) => s.subjectId === selectedSubjectId) || subjects[0];
  const currentChapters = currentSubject?.chapters || [];

  // Reusable Lesson Navigation Footer Component
  const renderLessonNavigationFooter = () => {
    if (flatLessons.length <= 1) return null;
    return (
      <div className="flex items-center justify-between pt-6 border-t border-[#F1EFFB]">
        {prevLesson ? (
          <button
            onClick={() => navigateToFlatLesson(prevLesson)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#3F328A] bg-[#F6F4FF] hover:bg-[#E7E3F5] transition"
            title={prevLesson.title}
          >
            <ChevronLeft size={16} />
            <div className="text-left">
              <div className="text-[10px] text-[#6E6990] uppercase font-bold">Previous Lesson</div>
              <div className="truncate max-w-[120px] sm:max-w-[180px] font-bold text-[#17152A]">
                {prevLesson.title}
              </div>
            </div>
          </button>
        ) : (
          <div />
        )}

        <span className="text-[11px] font-semibold text-[#6E6990] hidden sm:inline">
          Lesson {currentLessonIndex >= 0 ? currentLessonIndex + 1 : 1} of {flatLessons.length}
        </span>

        {nextLesson ? (
          <button
            onClick={() => navigateToFlatLesson(nextLesson)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#3F328A] hover:bg-[#2D246B] transition shadow-xs"
            title={nextLesson.title}
          >
            <div className="text-right">
              <div className="text-[10px] text-white/80 uppercase font-bold">Next Lesson</div>
              <div className="truncate max-w-[120px] sm:max-w-[180px] font-bold text-white">
                {nextLesson.title}
              </div>
            </div>
            <ChevronRight size={16} />
          </button>
        ) : (
          <div />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & METRIC SUMMARY */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E3F5] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1EFFB]">
          <div className="flex items-center gap-3">
            <Link
              href="/student/courses"
              className="p-2.5 rounded-xl bg-white border border-[#E7E3F5] text-[#3F328A] hover:bg-[#F6F4FF] transition-colors"
              title="Return to My Courses"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#3F328A] uppercase tracking-wider">
                <span>{curriculum.examTag || 'Competitive Exam'}</span>
                <span>•</span>
                <span>Active Classroom</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#17152A] line-clamp-1 mt-0.5">
                {curriculum.courseTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Syllabus Toggle Button */}
            <button
              onClick={() => setShowMobileSyllabus(!showMobileSyllabus)}
              className="lg:hidden px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#F6F4FF] text-[#3F328A] border border-[#E7E3F5] flex items-center gap-1.5"
            >
              {showMobileSyllabus ? <X size={14} /> : <Menu size={14} />}
              <span>{showMobileSyllabus ? 'Close Syllabus' : 'View Syllabus'}</span>
            </button>

            <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#E8FAF0] text-[#16A34A] flex items-center gap-1.5 border border-[#C5F3D8]">
              <CheckCircle2 size={14} /> Enrolled &amp; Active
            </span>
          </div>
        </div>

        {/* Real Server-Side Learning Progress Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAFAFD] border border-[#E7E3F5]">
            <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider">
              Course Completion
            </span>
            <div className="text-xl font-black text-[#3F328A] mt-1">
              {curriculum.progress.completionPercentage.toFixed(1)}%
            </div>
            <div className="w-full bg-[#E7E3F5] h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-[#3F328A] h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, curriculum.progress.completionPercentage)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAFAFD] border border-[#E7E3F5]">
            <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider">
              Topics Mastered
            </span>
            <div className="text-xl font-black text-[#17152A] mt-1">
              {curriculum.progress.completedTopics}{' '}
              <span className="text-xs text-[#6E6990] font-semibold">
                / {curriculum.progress.totalTopics}
              </span>
            </div>
            <p className="text-[11px] text-[#6E6990] mt-1">
              {curriculum.progress.remainingTopics} remaining in syllabus
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAFAFD] border border-[#E7E3F5]">
            <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider">
              Video Lectures
            </span>
            <div className="text-xl font-black text-[#17152A] mt-1">
              {curriculum.progress.completedVideos}{' '}
              <span className="text-xs text-[#6E6990] font-semibold">
                / {curriculum.progress.totalVideos}
              </span>
            </div>
            <p className="text-[11px] text-[#6E6990] mt-1">Watched video lessons</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAFAFD] border border-[#E7E3F5]">
            <span className="text-[10px] font-bold text-[#6E6990] uppercase tracking-wider">
              Curated Documents
            </span>
            <div className="text-xl font-black text-[#17152A] mt-1">
              {curriculum.progress.totalDocuments}{' '}
              <span className="text-xs text-[#6E6990] font-semibold">Handbooks</span>
            </div>
            <p className="text-[11px] text-[#6E6990] mt-1">Formula sheets &amp; notes</p>
          </div>
        </div>
      </div>

      {/* 2. SUBJECT SELECTOR TABS */}
      {subjects.length > 0 && (
        <div className="bg-white p-2 rounded-2xl border border-[#E7E3F5] shadow-xs flex items-center gap-2 overflow-x-auto">
          {subjects.map((sub) => {
            const isSelected = sub.subjectId === currentSubject?.subjectId;
            return (
              <button
                key={sub.subjectId}
                onClick={() => {
                  setSelectedSubjectId(sub.subjectId);
                  if (sub.chapters.length > 0) {
                    const firstChap = sub.chapters[0];
                    setExpandedChapterIds(new Set([firstChap.chapterId]));
                    setActiveChapter(firstChap);
                    if (firstChap.topics && firstChap.topics.length > 0) {
                      setContentType('TOPIC');
                      setActiveTopic(firstChap.topics[0]);
                    } else if (firstChap.videos && firstChap.videos.length > 0) {
                      setContentType('VIDEO');
                      setActiveVideo(firstChap.videos[0]);
                    } else if (firstChap.documents && firstChap.documents.length > 0) {
                      setContentType('DOCUMENT');
                      setActiveDocument(firstChap.documents[0]);
                    }
                  }
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#3F328A] text-white shadow-sm'
                    : 'bg-[#F6F4FF] text-[#6E6990] hover:text-[#17152A] hover:bg-[#E7E3F5]'
                }`}
              >
                <BookOpen size={14} />
                <span>{sub.subjectName}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#6E6990]'
                  }`}
                >
                  {sub.completedTopics}/{sub.totalTopics} Topics • {sub.completionPercentage.toFixed(0)}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Action Notification Banners */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-[#E8FAF0] border border-[#C5F3D8] text-[#16A34A] text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-[#16A34A] hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-2xl bg-[#FFE8ED] border border-[#FFCCD6] text-[#FF3F68] text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{actionErrorMessage}</span>
          </div>
          <button
            onClick={() => setActionErrorMessage(null)}
            className="text-[#FF3F68] hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. MAIN WORKSPACE (Two-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Topic / Video / Document Viewer (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* VIEWPORT A: TOPIC WORKSPACE */}
          {contentType === 'TOPIC' && activeTopic && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E3F5] shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F1EFFB]">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#3F328A] uppercase tracking-wider mb-1">
                    <span>{currentSubject?.subjectName}</span>
                    <span>•</span>
                    <span>{activeChapter?.chapterName}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#17152A]">
                    {activeTopic.topicName}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-[#6E6990] mt-1.5">
                    <span className="flex items-center gap-1 font-semibold">
                      Status:{' '}
                      <span
                        className={
                          activeTopic.status === 'COMPLETED'
                            ? 'text-[#16A34A]'
                            : activeTopic.status === 'IN_PROGRESS'
                            ? 'text-[#5034EB]'
                            : 'text-[#6E6990]'
                        }
                      >
                        {activeTopic.status.replace('_', ' ')}
                      </span>
                    </span>
                    {activeTopic.completedAt && (
                      <span>
                        • Completed on {new Date(activeTopic.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDoubtModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#FFE8ED] hover:bg-[#FFCCD6] text-[#FF3F68] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <HelpCircle size={15} />
                    <span>Ask Faculty Doubt</span>
                  </button>

                  <button
                    onClick={() => openNoteModal()}
                    className="px-4 py-2.5 rounded-xl bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <BookOpen size={15} />
                    <span>Topic Notes</span>
                  </button>

                  <button
                    onClick={() => handleMarkTopicComplete(activeTopic.topicId)}
                    disabled={activeTopic.status === 'COMPLETED' || mutatingTopicId === activeTopic.topicId}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeTopic.status === 'COMPLETED'
                        ? 'bg-[#E8FAF0] text-[#16A34A] border border-[#C5F3D8] cursor-default'
                        : 'bg-[#3F328A] hover:bg-[#2D246B] text-white shadow-xs'
                    }`}
                  >
                    {mutatingTopicId === activeTopic.topicId ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : activeTopic.status === 'COMPLETED' ? (
                      <>
                        <Check size={14} />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Mark Topic Complete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Topic Syllabus Context & Associated Chapter Resources */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#17152A] uppercase tracking-wider">
                  Chapter Learning Materials
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Linked Chapter Video if available */}
                  {activeChapter?.videos && activeChapter.videos.length > 0 ? (
                    <button
                      onClick={() => handleSelectVideo(activeChapter.videos[0], activeChapter)}
                      className="p-4 rounded-2xl bg-[#FAFAFD] hover:bg-[#F6F4FF] border border-[#E7E3F5] text-left transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-[#F6F4FF] text-[#3F328A] group-hover:bg-[#3F328A] group-hover:text-white transition-colors">
                          <Video size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-[#3F328A] bg-white px-2 py-0.5 rounded-md border border-[#E7E3F5]">
                          {activeChapter.videos[0].durationMinutes} Mins
                        </span>
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-[#17152A] line-clamp-1">
                          {activeChapter.videos[0].title}
                        </h5>
                        <p className="text-[11px] text-[#6E6990] mt-0.5">
                          Watch chapter video masterclass
                        </p>
                      </div>
                    </button>
                  ) : null}

                  {/* Linked Chapter Document if available */}
                  {activeChapter?.documents && activeChapter.documents.length > 0 ? (
                    <button
                      onClick={() => handleSelectDocument(activeChapter.documents[0], activeChapter)}
                      className="p-4 rounded-2xl bg-[#FAFAFD] hover:bg-[#F6F4FF] border border-[#E7E3F5] text-left transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-[#F6F4FF] text-[#3F328A] group-hover:bg-[#3F328A] group-hover:text-white transition-colors">
                          <FileText size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-[#6E6990] bg-white px-2 py-0.5 rounded-md border border-[#E7E3F5]">
                          Study Notes
                        </span>
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-[#17152A] line-clamp-1">
                          {activeChapter.documents[0].title}
                        </h5>
                        <p className="text-[11px] text-[#6E6990] mt-0.5">
                          View curated formula sheet &amp; notes
                        </p>
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Linear Lesson Navigation (Previous / Next Lesson) */}
              {renderLessonNavigationFooter()}
            </div>
          )}

          {/* VIEWPORT B: VIDEO PLAYER WORKSPACE */}
          {contentType === 'VIDEO' && activeVideo && (
            <div className="space-y-6">
              {/* Critical Vimeo Restriction: Suppress 3rd-party sample video from being embedded */}
              {activeVideo.vimeoVideoId === '824804225' ? (
                <div className="w-full aspect-[16/9] bg-[#17152A] rounded-2xl flex flex-col items-center justify-center text-white p-6 sm:p-8 text-center space-y-3 border border-[#2D246B]">
                  <div className="p-3.5 rounded-2xl bg-[#2D246B] text-[#FF3F68]">
                    <Video size={36} />
                  </div>
                  <h4 className="font-extrabold text-base sm:text-lg">Lecture Video Pending Production</h4>
                  <p className="text-xs text-white/70 max-w-lg leading-relaxed">
                    The official 10Q Challenge masterclass recording for this lecture is currently in studio post-production by the academic faculty.
                  </p>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 max-w-md">
                    Note: Development test fixtures (Sample ID: {activeVideo.vimeoVideoId}) are strictly suppressed in the student interface to protect curriculum integrity.
                  </div>
                </div>
              ) : videoLoading ? (
                <div className="w-full aspect-[16/9] bg-[#17152A] rounded-2xl flex flex-col items-center justify-center text-white space-y-3">
                  <Loader2 size={32} className="animate-spin text-[#3F328A]" />
                  <p className="text-xs text-white/70">Authorizing stream and loading player...</p>
                </div>
              ) : videoError ? (
                <div className="w-full aspect-[16/9] bg-[#17152A] rounded-2xl flex flex-col items-center justify-center text-white p-6 text-center space-y-3 border border-[#2D246B]">
                  <AlertCircle size={36} className="text-[#FF3F68]" />
                  <h4 className="font-bold text-base">Lecture Video Scheduled for Upload</h4>
                  <p className="text-xs text-white/70 max-w-md">{videoError}</p>
                  <p className="text-[10px] text-white/40">
                    Video ID: {activeVideo.id} • Scheduled for faculty upload
                  </p>
                </div>
              ) : videoPlaybackConfig ? (
                <UniversalVideoPlayer
                  key={activeVideo.id}
                  provider={videoPlaybackConfig.provider}
                  videoId={videoPlaybackConfig.providerVideoId || videoPlaybackConfig.vimeoVideoId}
                  videoUrl={videoPlaybackConfig.videoUrl}
                  title={activeVideo.title}
                  initialTime={videoPlaybackConfig.initialTime || 0}
                  onProgress={(percent) => {
                    if (percent >= 90 && activeVideo.status !== 'COMPLETED') {
                      handleMarkVideoComplete(activeVideo.id);
                    }
                  }}
                  onEnded={() => {
                    handleMarkVideoComplete(activeVideo.id);
                  }}
                />
              ) : (
                <div className="w-full aspect-[16/9] bg-[#17152A] rounded-2xl flex flex-col items-center justify-center text-white p-6 text-center space-y-2">
                  <Video size={36} className="text-[#6E6990]" />
                  <h4 className="font-bold text-sm">Video Stream Offline</h4>
                  <p className="text-xs text-white/60">
                    Playback configuration could not be loaded. Please try again.
                  </p>
                </div>
              )}

              {/* Video Information & Progress Control */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E3F5] shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-[#3F328A] uppercase tracking-wider mb-1">
                      <span>{currentSubject?.subjectName}</span>
                      <span>•</span>
                      <span>{activeChapter?.chapterName}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#17152A]">
                      {activeVideo.title}
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-[#6E6990] mt-1.5">
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {activeVideo.durationMinutes} Minutes
                      </span>
                      {activeVideo.isFreePreview && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Free Preview
                        </span>
                      )}
                      {activeVideo.status === 'COMPLETED' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                          <Check size={10} /> Watched
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsDoubtModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#FFE8ED] hover:bg-[#FFCCD6] text-[#FF3F68] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <HelpCircle size={15} />
                      <span>Ask Faculty Doubt</span>
                    </button>

                    <button
                      onClick={() => openNoteModal({ videoId: activeVideo.id, videoTitle: activeVideo.title })}
                      className="px-4 py-2.5 rounded-xl bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <BookOpen size={15} />
                      <span>Add Video Note</span>
                    </button>

                    <button
                      onClick={() => handleMarkVideoComplete(activeVideo.id)}
                      disabled={activeVideo.status === 'COMPLETED' || mutatingVideoId === activeVideo.id}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        activeVideo.status === 'COMPLETED'
                          ? 'bg-[#E8FAF0] text-[#16A34A] border border-[#C5F3D8] cursor-default'
                          : 'bg-[#3F328A] hover:bg-[#2D246B] text-white shadow-xs'
                      }`}
                    >
                      {mutatingVideoId === activeVideo.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : activeVideo.status === 'COMPLETED' ? (
                        <>
                          <Check size={14} />
                          <span>Watched</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Mark Video Watched</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Linear Lesson Navigation (Previous / Next Lesson) */}
                {renderLessonNavigationFooter()}
              </div>
            </div>
          )}

          {/* VIEWPORT C: DOCUMENT / STUDY MATERIAL WORKSPACE */}
          {contentType === 'DOCUMENT' && activeDocument && (
            <div className="space-y-4">
              <SecurePdfViewer
                documentId={activeDocument.id}
                title={activeDocument.title}
                category={activeDocument.category}
                fileSizeBytes={activeDocument.fileSizeBytes}
                pageCount={activeDocument.pageCount}
                streamUrl={`/api/student/classroom/${courseId}/document/${activeDocument.id}`}
                allowDownload={activeDocument.allowDownload !== false}
                studentName="Enrolled Student"
                courseTitle={curriculum?.courseTitle || '10Q Challenge LMS'}
              />

              {/* Progress & Chapter Context Card */}
              <div className="bg-white rounded-2xl p-5 border border-[#E7E3F5] shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {activeDocument.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Chapter: {activeChapter?.chapterName || 'Curriculum'} • Format: PDF
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDoubtModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#FFE8ED] hover:bg-[#FFCCD6] text-[#FF3F68] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <HelpCircle size={14} />
                    <span>Ask Doubt</span>
                  </button>
                  <button
                    onClick={() => openNoteModal({ documentId: activeDocument.id, documentTitle: activeDocument.title })}
                    className="px-4 py-2 rounded-xl bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <BookOpen size={14} />
                    <span>Study Note</span>
                  </button>
                  <button
                    onClick={() => handleMarkDocumentCompleted(activeDocument.id)}
                    disabled={mutatingDocId === activeDocument.id}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark as Read / Completed</span>
                  </button>
                </div>
              </div>

              {/* Linear Lesson Navigation (Previous / Next Lesson) */}
              <div className="bg-white rounded-2xl p-5 border border-[#E7E3F5] shadow-xs">
                {renderLessonNavigationFooter()}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Curriculum Navigation Tree (lg:col-span-4) */}
        <div
          className={`lg:col-span-4 bg-white rounded-3xl border border-[#E7E3F5] shadow-sm overflow-hidden sticky top-24 space-y-0 ${
            showMobileSyllabus ? 'block fixed inset-x-4 top-20 z-50 max-h-[80vh] overflow-y-auto' : 'hidden lg:block'
          }`}
        >
          <div className="p-5 border-b border-[#F1EFFB] bg-[#FAFAFD] flex items-center justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3F328A] uppercase tracking-wider">
                  {currentSubject?.subjectName}
                </span>
                <span className="text-xs font-bold text-[#6E6990] ml-3">
                  {currentChapters.length} Chapters
                </span>
              </div>
              <h3 className="font-black text-base text-[#17152A] mt-1">
                Course Syllabus
              </h3>
            </div>
            {showMobileSyllabus && (
              <button
                onClick={() => setShowMobileSyllabus(false)}
                className="lg:hidden p-2 rounded-xl bg-white border border-[#E7E3F5] text-[#6E6990]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="divide-y divide-[#F1EFFB] max-h-[680px] overflow-y-auto">
            {currentChapters.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6E6990]">
                No chapters configured for this subject yet.
              </div>
            ) : (
              currentChapters.map((chapter, chapIdx) => {
                const isExpanded = expandedChapterIds.has(chapter.chapterId);
                const chapTopics = chapter.topics || [];
                const chapVideos = chapter.videos || [];
                const chapDocs = chapter.documents || [];

                return (
                  <div key={chapter.chapterId}>
                    {/* Chapter Accordion Header */}
                    <button
                      onClick={() => toggleChapterExpanded(chapter.chapterId)}
                      className={`w-full p-4 text-left transition-colors flex items-center justify-between text-xs sm:text-sm font-extrabold ${
                        isExpanded
                          ? 'bg-[#F6F4FF] text-[#3F328A]'
                          : 'hover:bg-[#FAFAFD] text-[#17152A]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                        <span className="w-5 h-5 rounded-full bg-[#E7E3F5] text-[#3F328A] text-[10px] flex items-center justify-center shrink-0 font-bold">
                          {chapIdx + 1}
                        </span>
                        <span className="truncate">{chapter.chapterName}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {chapter.isCompleted && (
                          <CheckCircle2 size={14} className="text-[#16A34A]" />
                        )}
                        <ChevronDown
                          size={16}
                          className={`text-[#6E6990] transition-transform ${
                            isExpanded ? 'rotate-180 text-[#3F328A]' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Chapter Content Items (Topics, Videos, Documents) */}
                    {isExpanded && (
                      <div className="bg-[#FAFAFD] p-3 space-y-1.5 border-t border-[#F1EFFB]">
                        {/* 1. Topics */}
                        {chapTopics.map((topic) => {
                          const isSelected =
                            contentType === 'TOPIC' && activeTopic?.topicId === topic.topicId;
                          const isDone = topic.status === 'COMPLETED';

                          return (
                            <button
                              key={`t-${topic.topicId}`}
                              onClick={() => handleSelectTopic(topic, chapter)}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between text-xs font-semibold ${
                                isSelected
                                  ? 'bg-[#3F328A] text-white shadow-xs'
                                  : 'hover:bg-white text-[#17152A]'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden pr-2">
                                <BookOpen
                                  size={14}
                                  className={isSelected ? 'text-white' : 'text-[#6E6990]'}
                                />
                                <span className="truncate">{topic.topicName}</span>
                              </div>

                              <span className="shrink-0">
                                {isDone ? (
                                  <CheckCircle2
                                    size={14}
                                    className={isSelected ? 'text-white' : 'text-[#16A34A]'}
                                  />
                                ) : (
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      isSelected ? 'bg-white/40' : 'bg-[#E7E3F5]'
                                    }`}
                                  />
                                )}
                              </span>
                            </button>
                          );
                        })}

                        {/* 2. Video Lectures */}
                        {chapVideos.map((vid) => {
                          const isSelected =
                            contentType === 'VIDEO' && activeVideo?.id === vid.id;
                          const isDone = vid.status === 'COMPLETED';

                          return (
                            <button
                              key={`v-${vid.id}`}
                              onClick={() => handleSelectVideo(vid, chapter)}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between text-xs font-semibold ${
                                isSelected
                                  ? 'bg-[#3F328A] text-white shadow-xs'
                                  : 'hover:bg-white text-[#17152A]'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden pr-2">
                                <Video
                                  size={14}
                                  className={isSelected ? 'text-white' : 'text-[#5034EB]'}
                                />
                                <span className="truncate">{vid.title}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[10px] ${
                                    isSelected ? 'text-white/80' : 'text-[#6E6990]'
                                  }`}
                                >
                                  {vid.durationMinutes}m
                                </span>
                                {isDone && (
                                  <CheckCircle2
                                    size={14}
                                    className={isSelected ? 'text-white' : 'text-[#16A34A]'}
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {/* 3. Curated Documents */}
                        {chapDocs.map((doc) => {
                          const isSelected =
                            contentType === 'DOCUMENT' && activeDocument?.id === doc.id;
                          const isDone = (doc as any).status === 'COMPLETED';

                          return (
                            <button
                              key={`d-${doc.id}`}
                              onClick={() => handleSelectDocument(doc, chapter)}
                              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between text-xs font-semibold ${
                                isSelected
                                  ? 'bg-[#3F328A] text-white shadow-xs'
                                  : 'hover:bg-white text-[#17152A]'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden pr-2">
                                <FileText
                                  size={14}
                                  className={isSelected ? 'text-white' : 'text-[#FF3F68]'}
                                />
                                <span className="truncate">{doc.title}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isDone && (
                                  <CheckCircle2
                                    size={14}
                                    className={isSelected ? 'text-white' : 'text-[#16A34A]'}
                                  />
                                )}
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-[#F0EDFD] text-[#3F328A]'
                                  }`}
                                >
                                  NOTES
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Faculty Doubt Modal */}
      <DoubtModal
        isOpen={isDoubtModalOpen}
        onClose={() => setIsDoubtModalOpen(false)}
        courseId={courseId}
        courseTitle={curriculum.courseTitle}
        subjectId={selectedSubjectId || undefined}
        subjectName={currentSubject?.subjectName}
        chapterId={activeChapter?.chapterId}
        chapterName={activeChapter?.chapterName}
        topicId={activeTopic?.topicId}
        topicName={activeTopic?.topicName}
        lessonId={activeVideo?.id}
        lessonTitle={activeTopic?.topicName || activeVideo?.title || activeDocument?.title || 'General Curriculum Question'}
        documentId={activeDocument?.id}
      />

      {/* Student Study Note Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        context={noteModalContext}
      />
    </div>
  );
}

export default function ClassroomPage(props: ClassroomPageProps) {
  return (
    <Suspense fallback={<ClassroomLoadingSkeleton />}>
      <ClassroomPageContent {...props} />
    </Suspense>
  );
}
