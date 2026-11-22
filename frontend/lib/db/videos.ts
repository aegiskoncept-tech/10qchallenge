import fs from 'fs';
import path from 'path';
import { AcademicHierarchyValidator } from '@/lib/learning/validation';

export interface VideoRecord {
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
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export const CANONICAL_PROTECTED_VIDEO_IDS = [1, 2, 3];

export const APPROVED_CUSTOM_EMBED_DOMAINS = [
  'cloudflarestream.com',
  'videodelivery.net',
  'fast.wistia.net',
  'wistia.com',
  'loom.com',
  'www.loom.com',
  'player.vimeo.com',
  'vimeo.com',
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  '10qchallenge.in',
  'cdn.10qchallenge.in',
  'media.10qchallenge.in',
  'stream.10qchallenge.in',
];

/**
 * Helper to safely extract provider video ID from raw input or standard URLs
 */
export function extractProviderVideoId(provider: string, input: string): string {
  const trimmed = (input || '').trim();
  const prov = (provider || 'VIMEO').toUpperCase();

  if (prov === 'YOUTUBE') {
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match) return match[1];
  } else if (prov === 'VIMEO') {
    const match = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)(\d+))/);
    if (match) return match[1];
  }

  return trimmed;
}

export const CANONICAL_DEFAULT_VIDEOS: VideoRecord[] = [
  {
    id: 1,
    title: 'Mechanics & 1D Kinematics - Complete Masterclass',
    provider: 'VIMEO',
    providerVideoId: '824804225',
    vimeoVideoId: '824804225',
    courseId: 1,
    courseTitle: 'BITSAT 2026 Master Crash Course (Updated Batch)',
    subjectId: 1,
    subject: 'Physics',
    chapterId: 1,
    chapter: 'Mechanics & Kinematics',
    topicId: 1,
    topicName: 'Kinematics in 1D & Vectors',
    description: 'High-yield derivations, calculus applications, and shortcut tricks for BITSAT & JEE.',
    durationMinutes: 75,
    isFreePreview: true,
    status: 'Published',
    displayOrder: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 2,
    title: 'Rotational Dynamics & Moment of Inertia Shortcuts',
    provider: 'VIMEO',
    providerVideoId: '824804226',
    vimeoVideoId: '824804226',
    courseId: 1,
    courseTitle: 'BITSAT 2026 Master Crash Course (Updated Batch)',
    subjectId: 1,
    subject: 'Physics',
    chapterId: 2,
    chapter: 'Rotational Motion & Gravitation',
    topicId: 2,
    topicName: 'Moment of Inertia & Torque',
    description: 'Standard inertia formulas, parallel and perpendicular axes theorem with past-year problems.',
    durationMinutes: 60,
    isFreePreview: false,
    status: 'Published',
    displayOrder: 2,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
  {
    id: 3,
    title: 'Chemical Bonding & Hybridization Speed Techniques',
    provider: 'VIMEO',
    providerVideoId: '824804227',
    vimeoVideoId: '824804227',
    courseId: 1,
    courseTitle: 'BITSAT 2026 Master Crash Course (Updated Batch)',
    subjectId: 2,
    subject: 'Chemistry',
    chapterId: 3,
    chapter: 'Chemical Bonding & Molecular Structure',
    topicId: 3,
    topicName: 'VSEPR Theory & Hybridization',
    description: 'VSEPR geometry predictions, steric number rules, and magnetic moment calculations.',
    durationMinutes: 50,
    isFreePreview: true,
    status: 'Published',
    displayOrder: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    createdBy: 'System',
  },
];

class VideoAsyncMutex {
  private queue: Promise<any> = Promise.resolve();
  async run<T>(task: () => Promise<T> | T): Promise<T> {
    const res = this.queue.then(async () => {
      return await task();
    });
    this.queue = res.catch(() => { });
    return res;
  }
}

export const videoMutex = new VideoAsyncMutex();

function getVideoDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'videos.json'), path.join(persistentDir, 'videos.json')] : []),
    path.join(cwd, 'data', 'videos.json'),
    path.join(cwd, 'frontend', 'data', 'videos.json'),
  ];

  const uniqueDirs = new Set<string>();
  const validPaths: string[] = [];

  for (const p of candidates) {
    const dir = path.dirname(p);
    if (!uniqueDirs.has(dir) && fs.existsSync(dir)) {
      uniqueDirs.add(dir);
      validPaths.push(p);
    }
  }

  if (validPaths.length === 0) {
    const fallback = path.join(cwd, 'data', 'videos.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }

  return validPaths;
}

export function readVideosFromDb(): VideoRecord[] {
  const paths = getVideoDataPaths();
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (err) { }
  }
  writeVideosToDb(CANONICAL_DEFAULT_VIDEOS);
  return CANONICAL_DEFAULT_VIDEOS;
}

export function writeVideosToDb(videos: VideoRecord[]): void {
  const json = JSON.stringify(videos, null, 2);
  const paths = getVideoDataPaths();
  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, json, 'utf-8');
    } catch (err) { }
  }
}

/**
 * Strict server-side validation for video providers, IDs, protocols, and stream URLs.
 * Prevents XSS, SSRF, loopback attacks, and arbitrary protocol injection.
 */
export function validateVideoProviderSecurity(params: {
  provider?: string;
  providerVideoId?: string;
  vimeoVideoId?: string;
  videoUrl?: string;
}): { valid: boolean; error?: string } {
  const rawProvider = (params.provider || 'VIMEO').toUpperCase();
  if (!['VIMEO', 'YOUTUBE', 'CUSTOM', 'HLS'].includes(rawProvider)) {
    return {
      valid: false,
      error: `Invalid video provider "${params.provider}". Permitted providers are strictly: VIMEO, YOUTUBE, CUSTOM, HLS.`,
    };
  }

  const rawId = (params.providerVideoId || params.vimeoVideoId || '').trim();
  if (!rawId) {
    return { valid: false, error: 'Video Provider ID or Vimeo ID is required.' };
  }

  // Provider-specific ID validation
  if (rawProvider === 'VIMEO') {
    if (!/^\d{5,15}$/.test(rawId)) {
      return {
        valid: false,
        error: `Invalid Vimeo ID "${rawId}". Vimeo Video IDs must contain only numeric digits (5-15 digits).`,
      };
    }
  } else if (rawProvider === 'YOUTUBE') {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(rawId)) {
      return {
        valid: false,
        error: `Invalid YouTube Video ID "${rawId}". YouTube Video IDs must be exactly 11 characters (letters, numbers, underscores, and dashes only).`,
      };
    }
  } else if (rawProvider === 'CUSTOM' || rawProvider === 'HLS') {
    if (!/^[a-zA-Z0-9_\-\.\/]{1,120}$/.test(rawId)) {
      return {
        valid: false,
        error: `Invalid stream identifier "${rawId}". Custom/HLS IDs must be safe alphanumeric strings (up to 120 chars).`,
      };
    }
  }

  // URL security validation if direct URL provided
  if (params.videoUrl && params.videoUrl.trim()) {
    const rawUrl = params.videoUrl.trim();

    // Rejection of dangerous schemes
    if (/^(javascript|data|vbscript|file):/i.test(rawUrl)) {
      return {
        valid: false,
        error: 'Dangerous URL scheme rejected. Only secure HTTPS URLs are permitted.',
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { valid: false, error: 'Malformed or invalid video URL format.' };
    }

    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Insecure URL protocol. Video URLs must strictly use https:// scheme.',
      };
    }

    // SSRF and private network protection
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      !host.includes('.')
    ) {
      return {
        valid: false,
        error: 'Video URL rejected: Target host points to an internal or private network address.',
      };
    }

    // Custom Embed Provider Domain Allowlist Validation
    if (rawProvider === 'CUSTOM') {
      const isApproved = APPROVED_CUSTOM_EMBED_DOMAINS.some(
        (domain) => host === domain || host.endsWith('.' + domain)
      );
      if (!isApproved) {
        return {
          valid: false,
          error: `Custom embed domain "${host}" is not on the approved provider whitelist. Permitted domains: Cloudflare Stream, Wistia, Loom, Vimeo, YouTube, 10Q Challenge CDN.`,
        };
      }
    }

    // HLS Stream Validation
    if (rawProvider === 'HLS' && !parsed.pathname.endsWith('.m3u8') && !parsed.pathname.includes('/hls')) {
      return {
        valid: false,
        error: 'HLS stream URLs must point to a valid .m3u8 playlist or /hls/ stream path.',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates video academic hierarchy against canonical data.
 */
export function validateVideoHierarchy(params: {
  courseId: number;
  subjectId: number;
  chapterId: number;
  topicId?: number;
}): {
  valid: boolean;
  courseTitle: string;
  subjectName: string;
  chapterName: string;
  topicName?: string;
  error?: string;
} {
  const courses = AcademicHierarchyValidator.getCourses();
  const subjects = AcademicHierarchyValidator.getSubjects();
  const chapters = AcademicHierarchyValidator.getChapters();
  const topics = AcademicHierarchyValidator.getTopics();

  const course = courses.find((c) => Number(c.id) === Number(params.courseId));
  if (!course) {
    return {
      valid: false,
      courseTitle: '',
      subjectName: '',
      chapterName: '',
      error: `Course #${params.courseId} does not exist in Course Master.`,
    };
  }

  const subject = subjects.find((s) => Number(s.id) === Number(params.subjectId));
  if (!subject) {
    return {
      valid: false,
      courseTitle: course.title,
      subjectName: '',
      chapterName: '',
      error: `Subject #${params.subjectId} does not exist in Subject Master.`,
    };
  }

  const chapter = chapters.find((ch) => Number(ch.id) === Number(params.chapterId));
  if (!chapter) {
    return {
      valid: false,
      courseTitle: course.title,
      subjectName: subject.subjectName,
      chapterName: '',
      error: `Chapter #${params.chapterId} does not exist in Chapter Master.`,
    };
  }

  // Hierarchy containment verification
  if (Number(chapter.courseId) !== Number(params.courseId)) {
    return {
      valid: false,
      courseTitle: course.title,
      subjectName: subject.subjectName,
      chapterName: chapter.chapterName,
      error: `Hierarchy mismatch: Chapter "${chapter.chapterName}" belongs to Course #${chapter.courseId}, not Course #${params.courseId}.`,
    };
  }

  if (Number(chapter.subjectId) !== Number(params.subjectId)) {
    return {
      valid: false,
      courseTitle: course.title,
      subjectName: subject.subjectName,
      chapterName: chapter.chapterName,
      error: `Hierarchy mismatch: Chapter "${chapter.chapterName}" belongs to Subject #${chapter.subjectId}, not Subject #${params.subjectId}.`,
    };
  }

  let topicName: string | undefined = undefined;
  if (params.topicId && Number(params.topicId) > 0) {
    const topic = topics.find((t) => Number(t.id) === Number(params.topicId));
    if (!topic) {
      return {
        valid: false,
        courseTitle: course.title,
        subjectName: subject.subjectName,
        chapterName: chapter.chapterName,
        error: `Topic #${params.topicId} does not exist in Topic Master.`,
      };
    }
    if (Number(topic.chapterId) !== Number(params.chapterId)) {
      return {
        valid: false,
        courseTitle: course.title,
        subjectName: subject.subjectName,
        chapterName: chapter.chapterName,
        error: `Hierarchy mismatch: Topic "${topic.topicName}" belongs to Chapter #${topic.chapterId}, not Chapter #${params.chapterId}.`,
      };
    }
    topicName = topic.topicName;
  }

  return {
    valid: true,
    courseTitle: course.title,
    subjectName: subject.subjectName,
    chapterName: chapter.chapterName,
    topicName,
  };
}

export function getAdminVideos(
  search?: string,
  subject?: string,
  courseId?: number,
  provider?: string
): VideoRecord[] {
  let list = readVideosFromDb();
  if (courseId && Number(courseId) > 0) {
    list = list.filter((v) => Number(v.courseId) === Number(courseId));
  }
  if (subject && subject !== 'ALL') {
    list = list.filter((v) => v.subject.toLowerCase() === subject.toLowerCase());
  }
  if (provider && provider !== 'ALL') {
    list = list.filter((v) => (v.provider || 'VIMEO').toUpperCase() === provider.toUpperCase());
  }
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.chapter.toLowerCase().includes(q) ||
        v.subject.toLowerCase().includes(q) ||
        (v.courseTitle && v.courseTitle.toLowerCase().includes(q)) ||
        (v.topicName && v.topicName.toLowerCase().includes(q)) ||
        (v.vimeoVideoId && v.vimeoVideoId.toLowerCase().includes(q)) ||
        (v.providerVideoId && v.providerVideoId.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q))
    );
  }
  return list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
}

export function getVideoById(id: number): VideoRecord | null {
  const all = readVideosFromDb();
  return all.find((v) => Number(v.id) === Number(id)) || null;
}

export async function createVideo(
  data: Partial<VideoRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; video?: VideoRecord; error?: string }> {
  return videoMutex.run(async () => {
    if (!data.title?.trim()) return { success: false, error: 'Video title is required.' };

    const rawProviderId = (data.providerVideoId || data.vimeoVideoId || '').trim();
    if (!rawProviderId) return { success: false, error: 'Video Provider ID or Vimeo ID is required.' };

    const providerSecurity = validateVideoProviderSecurity({
      provider: data.provider,
      providerVideoId: data.providerVideoId,
      vimeoVideoId: data.vimeoVideoId,
      videoUrl: data.videoUrl,
    });
    if (!providerSecurity.valid) {
      return { success: false, error: providerSecurity.error };
    }

    const provider: 'VIMEO' | 'YOUTUBE' | 'CUSTOM' | 'HLS' = ((data.provider || 'VIMEO') as string).toUpperCase() as any;

    let verifiedCourseTitle = data.courseTitle || 'General';
    let verifiedSubjectName = data.subject || 'General';
    let verifiedChapterName = data.chapter || 'General';
    let verifiedTopicName = data.topicName;

    if (data.courseId && data.subjectId && data.chapterId) {
      const hierarchy = validateVideoHierarchy({
        courseId: Number(data.courseId),
        subjectId: Number(data.subjectId),
        chapterId: Number(data.chapterId),
        topicId: data.topicId ? Number(data.topicId) : undefined,
      });

      if (!hierarchy.valid) {
        return { success: false, error: hierarchy.error };
      }

      verifiedCourseTitle = hierarchy.courseTitle;
      verifiedSubjectName = hierarchy.subjectName;
      verifiedChapterName = hierarchy.chapterName;
      verifiedTopicName = hierarchy.topicName;
    }

    const all = readVideosFromDb();
    const newId = all.length > 0 ? Math.max(...all.map((v) => Number(v.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();
    const cleanId = extractProviderVideoId(provider, rawProviderId);

    const newVideo: VideoRecord = {
      id: newId,
      title: data.title.trim(),
      provider,
      providerVideoId: cleanId,
      vimeoVideoId: cleanId,
      videoUrl: data.videoUrl?.trim() || undefined,
      courseId: data.courseId ? Number(data.courseId) : undefined,
      courseTitle: verifiedCourseTitle,
      subjectId: data.subjectId ? Number(data.subjectId) : undefined,
      subject: verifiedSubjectName,
      chapterId: data.chapterId ? Number(data.chapterId) : undefined,
      chapter: verifiedChapterName,
      topicId: data.topicId ? Number(data.topicId) : undefined,
      topicName: verifiedTopicName,
      description: data.description?.trim() || '',
      thumbnailUrl: data.thumbnailUrl?.trim() || undefined,
      durationMinutes: Number(data.durationMinutes) || 45,
      isFreePreview: Boolean(data.isFreePreview),
      status: (data.status as any) || 'Published',
      displayOrder: Number(data.displayOrder) || (all.length + 1),
      createdAt: now,
      updatedAt: now,
      createdBy: user,
    };

    all.push(newVideo);
    writeVideosToDb(all);
    return { success: true, video: newVideo };
  });
}

export async function updateVideo(
  id: number,
  data: Partial<VideoRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; video?: VideoRecord; error?: string }> {
  return videoMutex.run(async () => {
    const all = readVideosFromDb();
    const index = all.findIndex((v) => Number(v.id) === Number(id));
    if (index === -1) return { success: false, error: `Video with ID ${id} not found.` };

    const existing = all[index];

    const courseId = data.courseId !== undefined ? (data.courseId ? Number(data.courseId) : undefined) : existing.courseId;
    const subjectId = data.subjectId !== undefined ? (data.subjectId ? Number(data.subjectId) : undefined) : existing.subjectId;
    const chapterId = data.chapterId !== undefined ? (data.chapterId ? Number(data.chapterId) : undefined) : existing.chapterId;
    const topicId = data.topicId !== undefined ? (data.topicId ? Number(data.topicId) : undefined) : existing.topicId;

    let verifiedCourseTitle = existing.courseTitle;
    let verifiedSubjectName = data.subject || existing.subject;
    let verifiedChapterName = data.chapter || existing.chapter;
    let verifiedTopicName = data.topicName !== undefined ? data.topicName : existing.topicName;

    if (courseId && subjectId && chapterId) {
      const hierarchy = validateVideoHierarchy({
        courseId,
        subjectId,
        chapterId,
        topicId,
      });

      if (!hierarchy.valid) {
        return { success: false, error: hierarchy.error };
      }

      verifiedCourseTitle = hierarchy.courseTitle;
      verifiedSubjectName = hierarchy.subjectName;
      verifiedChapterName = hierarchy.chapterName;
      verifiedTopicName = hierarchy.topicName;
    }

    const provider = ((data.provider || existing.provider || 'VIMEO') as string).toUpperCase() as any;
    const providerVideoId = (data.providerVideoId !== undefined ? data.providerVideoId : existing.providerVideoId) || (data.vimeoVideoId !== undefined ? data.vimeoVideoId : existing.vimeoVideoId);
    const vimeoVideoId = (data.vimeoVideoId !== undefined ? data.vimeoVideoId : existing.vimeoVideoId) || providerVideoId || '';
    const videoUrl = data.videoUrl !== undefined ? data.videoUrl : existing.videoUrl;

    if (data.provider !== undefined || data.providerVideoId !== undefined || data.vimeoVideoId !== undefined || data.videoUrl !== undefined) {
      const providerSecurity = validateVideoProviderSecurity({
        provider,
        providerVideoId,
        vimeoVideoId,
        videoUrl,
      });
      if (!providerSecurity.valid) {
        return { success: false, error: providerSecurity.error };
      }
    }

    const cleanProviderVideoId = extractProviderVideoId(provider, providerVideoId);
    const cleanVimeoVideoId = extractProviderVideoId(provider, vimeoVideoId);

    const updated: VideoRecord = {
      ...existing,
      ...data,
      id: existing.id,
      provider,
      providerVideoId: cleanProviderVideoId,
      vimeoVideoId: cleanVimeoVideoId,
      videoUrl: videoUrl?.trim() || undefined,
      courseId,
      courseTitle: verifiedCourseTitle,
      subjectId,
      subject: verifiedSubjectName,
      chapterId,
      chapter: verifiedChapterName,
      topicId,
      topicName: verifiedTopicName,
      updatedAt: new Date().toISOString(),
      updatedBy: user,
    };

    all[index] = updated;
    writeVideosToDb(all);
    return { success: true, video: updated };
  });
}

export async function deleteVideo(
  id: number,
  checkDependencies = true
): Promise<{ success: boolean; error?: string }> {
  return videoMutex.run(async () => {
    const all = readVideosFromDb();
    const index = all.findIndex((v) => Number(v.id) === Number(id));
    if (index === -1) return { success: false, error: `Video with ID ${id} not found.` };

    const video = all[index];

    if (CANONICAL_PROTECTED_VIDEO_IDS.includes(Number(id))) {
      return {
        success: false,
        error: `Cannot delete canonical lecture video #${id} (Protected System Fixture). You may set its status to "Archived" instead.`,
      };
    }

    // Dependency check: student learning progress
    if (checkDependencies) {
      // Reserved for external learning progress database check
    }

    all.splice(index, 1);
    writeVideosToDb(all);
    return { success: true };
  });
}
