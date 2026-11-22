import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  BlogRecord,
  BlogStatus,
  BlogSEO,
  BlogRevision,
  BlogCategory,
  BlogAuthor,
  BlogRedirect,
  BlogDashboardMetrics,
} from '@/lib/content/types';
import { PreviewTokenService } from '@/lib/content/preview-token-service';

export const CANONICAL_CATEGORIES: BlogCategory[] = [
  { id: 'cat-bitsat', name: 'BITSAT', slug: 'bitsat', description: 'BITSAT preparation, syllabus, bonuses, and campus cutoff insights' },
  { id: 'cat-jee', name: 'JEE Main', slug: 'jee-main', description: 'JEE Main strategy, high-weightage chapters, and rank predictor' },
  { id: 'cat-comedk', name: 'COMEDK', slug: 'comedk', description: 'COMEDK UGET counseling, RVCE / BMS / MSRIT cutoffs' },
  { id: 'cat-viteee', name: 'VITEEE', slug: 'viteee', description: 'VIT Vellore admissions, category-wise fee slots, and exam pattern' },
  { id: 'cat-strategy', name: 'Study Strategy', slug: 'study-strategy', description: 'Time management, test-taking temperament, and revision calendars' },
  { id: 'cat-guidance', name: 'College Guidance', slug: 'college-guidance', description: 'Placement statistics, branch preferences, and campus life' },
  { id: 'cat-notes', name: 'Formula Sheets & Notes', slug: 'formula-sheets-notes', description: 'High-yield formula summaries and short revision PDFs' },
  { id: 'cat-general', name: 'General', slug: 'general', description: 'Educational news, announcements, and general motivation' },
];

export const CANONICAL_AUTHORS: BlogAuthor[] = [
  {
    id: 'auth-ritesh',
    name: 'Ritesh (BITS Pilani Alumni)',
    role: 'Founder & Lead Mentor',
    avatar: '/site/assets/img/team/ritesh.jpg',
    bio: 'BITS Pilani alumnus and founder of 10Q Challenge. Mentored 15,000+ engineering aspirants to top percentile ranks.',
    isVerified: true,
  },
  {
    id: 'auth-advisory',
    name: 'Academic Advisory Board',
    role: 'Senior Subject Matter Experts',
    avatar: '/site/assets/images/logo.png',
    bio: 'Panel of senior academicians, ex-IITians, and national Olympiad trainers specializing in high-speed CBT pedagogy.',
    isVerified: true,
  },
];

export const CANONICAL_DEFAULT_BLOGS: BlogRecord[] = [
  {
    id: 1,
    title: 'How to Score 340+ in BITSAT 2026: Strategy from Pilani Rankers',
    slug: 'how-to-score-340-plus-in-bitsat-2026',
    excerpt: 'Key time management tactics, question selection sequence, and bonus questions roadmap.',
    content: `
# Mastering BITSAT 2026: The Comprehensive Preparation Blueprint

BITSAT is fundamentally an examination of speed, accuracy, and tactical temperament. With 130 questions to be solved in 180 minutes, you have approximately 1.38 minutes per question.

## 1. The Power of Speed and Accuracy
Unlike JEE Advanced, where profound theoretical derivations dictate success, BITSAT tests high-yield formula recall and quick computational agility. Maintaining accuracy above 85% is essential.

## 2. Bonus Questions Strategy
Attempting all 130 questions unlocks 12 bonus questions (3 Physics, 3 Chemistry, 3 Math/Bio, 3 English/LR) worth an additional 36 marks. Only attempt bonus questions if you have finished the main paper with at least 20 minutes to spare and an accuracy rate of 90%+.

## 3. Recommended Time Allocation
- **Physics (30 Qs):** 40 minutes
- **Chemistry (30 Qs):** 30 minutes
- **Mathematics (40 Qs):** 60 minutes
- **English Proficiency & Logical Reasoning (30 Qs):** 25 minutes
- **Buffer / Review / Bonus:** 25 minutes
    `.trim(),
    author: 'Ritesh (BITS Pilani Alumni)',
    authorId: 'auth-ritesh',
    category: 'BITSAT',
    readTime: '6 min read',
    coverImage: '/site/assets/img/blog/blog-1.jpg',
    coverImageAlt: 'BITSAT 2026 Strategy Roadmap by 10Q Challenge',
    coverImageCaption: 'Detailed time-split strategy for BITSAT aspirants',
    tags: ['BITSAT', 'Strategy', 'Physics', 'Mathematics'],
    status: 'Published',
    publishedAt: '2026-11-01T00:00:00.000Z',
    viewsCount: 342,
    seo: {
      seoTitle: 'How to Score 340+ in BITSAT 2026 | Strategy by BITS Pilani Mentors',
      metaDescription: 'Discover the exact 130-question speed formula, section time limits, and bonus questions roadmap to score 340+ in BITSAT 2026.',
      canonicalUrl: 'https://10qchallenge.in/blog/how-to-score-340-plus-in-bitsat-2026',
      focusKeyword: 'BITSAT 2026 strategy',
      secondaryKeywords: ['score 340 BITSAT', 'BITSAT bonus questions', 'BIT Pilani cutoffs'],
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: 'How to Score 340+ in BITSAT 2026: The Pilani Ranker Blueprint',
      ogDescription: 'Time management tactics, question sequence, and bonus questions roadmap.',
      ogImage: '/site/assets/img/blog/blog-1.jpg',
      twitterCard: 'summary_large_image',
    },
    revisions: [
      {
        revisionId: 'rev-init-1',
        timestamp: '2026-11-01T00:00:00.000Z',
        author: 'Ritesh (BITS Pilani Alumni)',
        title: 'How to Score 340+ in BITSAT 2026: Strategy from Pilani Rankers',
        content: 'Initial publication revision.',
        status: 'Published',
        summary: 'First official publication',
      },
    ],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    updatedBy: 'Ritesh (BITS Pilani Alumni)',
  },
  {
    id: 2,
    title: 'COMEDK vs BITSAT vs JEE Main: A Complete Analysis for Aspirants',
    slug: 'comedk-vs-bitsat-vs-jee-main-analysis',
    excerpt: 'Detailed comparison of negative marking schemes, college cutoffs, and seat matrices.',
    content: `
# Comparative Analysis: COMEDK, BITSAT & JEE Main

Understanding the distinct exam architectures is essential for optimizing your revision schedule.

- **BITSAT:** +3/-1 marking with 12 bonus questions. 130 questions in 180 minutes.
- **COMEDK:** 180 questions in 180 minutes with **0 negative marking**. Speed and guessing discipline are paramount.
- **JEE Main:** +4/-1 marking with numerical value section. High conceptual depth required.

## Key Takeaways
Always calibrate your mock test pacing to the specific penalty structure of the target exam.
    `.trim(),
    author: 'Academic Advisory Board',
    authorId: 'auth-advisory',
    category: 'College Guidance',
    readTime: '8 min read',
    coverImage: '/site/assets/img/blog/blog-2.jpg',
    coverImageAlt: 'Engineering Entrance Exam Comparison COMEDK BITSAT JEE',
    coverImageCaption: 'Detailed comparative analysis of top entrance tests',
    tags: ['COMEDK', 'BITSAT', 'JEE', 'College Guidance'],
    status: 'Published',
    publishedAt: '2026-11-02T00:00:00.000Z',
    viewsCount: 218,
    seo: {
      seoTitle: 'COMEDK vs BITSAT vs JEE Main: Complete Comparison & Cutoffs',
      metaDescription: 'Compare COMEDK, BITSAT and JEE Main: negative marking differences, difficulty levels, top college cutoffs and preparation tactics.',
      canonicalUrl: 'https://10qchallenge.in/blog/comedk-vs-bitsat-vs-jee-main-analysis',
      focusKeyword: 'COMEDK vs BITSAT vs JEE Main',
      secondaryKeywords: ['COMEDK negative marking', 'BITSAT vs JEE comparison', 'engineering exam difficulty'],
      robotsIndex: true,
      robotsFollow: true,
      ogTitle: 'COMEDK vs BITSAT vs JEE Main: Complete Comparison for Aspirants',
      ogDescription: 'Detailed breakdown of negative marking schemes, seat matrices, and college rankings.',
      ogImage: '/site/assets/img/blog/blog-2.jpg',
      twitterCard: 'summary_large_image',
    },
    revisions: [
      {
        revisionId: 'rev-init-2',
        timestamp: '2026-11-02T00:00:00.000Z',
        author: 'Academic Advisory Board',
        title: 'COMEDK vs BITSAT vs JEE Main: A Complete Analysis for Aspirants',
        content: 'Initial publication revision.',
        status: 'Published',
        summary: 'First official publication',
      },
    ],
    createdAt: '2026-11-02T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
    updatedBy: 'Academic Advisory Board',
  },
];

// Helper: atomic write via temporary file
function atomicWriteJson(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  try {
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Fallback if cross-device or Windows rename lock occurs
    fs.copyFileSync(tempPath, filePath);
    try { fs.unlinkSync(tempPath); } catch (_) {}
  }
}

function getCandidatePaths(filename: string): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', filename), path.join(persistentDir, filename)] : []),
    path.join(cwd, 'data', filename),
    path.join(cwd, 'frontend', 'data', filename),
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
    const fallback = path.join(cwd, 'data', filename);
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

// ----------------- BLOG ARTICLES CRUD -----------------

export function readBlogsFromDb(): BlogRecord[] {
  const paths = getCandidatePaths('blogs.json');
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Ensure normalization of newer fields (revisions, viewsCount, seo)
            return parsed.map((item: any) => ({
              ...item,
              status: item.status || 'Published',
              viewsCount: typeof item.viewsCount === 'number' ? item.viewsCount : 0,
              tags: Array.isArray(item.tags) ? item.tags : [],
              seo: item.seo || {
                seoTitle: item.title,
                metaDescription: item.excerpt,
                canonicalUrl: `https://10qchallenge.in/blog/${item.slug}`,
                robotsIndex: true,
                robotsFollow: true,
              },
              revisions: Array.isArray(item.revisions) ? item.revisions : [],
            }));
          }
        }
      }
    } catch (err) {}
  }
  writeBlogsToDb(CANONICAL_DEFAULT_BLOGS);
  return CANONICAL_DEFAULT_BLOGS;
}

export function writeBlogsToDb(items: BlogRecord[]): void {
  const paths = getCandidatePaths('blogs.json');
  for (const p of paths) {
    try {
      atomicWriteJson(p, items);
    } catch (err) {
      console.error(`[BlogDB] Failed writing to ${p}:`, err);
    }
  }

  // Also synchronize frontend/src/data/blogs.js for backward-compatible client bundles
  try {
    const jsPath = path.join(process.cwd(), 'frontend', 'src', 'data', 'blogs.js');
    if (fs.existsSync(path.dirname(jsPath))) {
      const jsContent = `export const blogsData = ${JSON.stringify(items, null, 2)};\n`;
      fs.writeFileSync(jsPath, jsContent, 'utf-8');
    }
  } catch (err) {}
}

export function getAdminBlogs(
  search?: string,
  category?: string,
  status?: string,
  sortBy: 'date' | 'views' | 'title' = 'date'
): BlogRecord[] {
  let list = readBlogsFromDb();

  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (category && category !== 'ALL') {
    list = list.filter((b) => b.category.toLowerCase() === category.toLowerCase());
  }

  if (status && status !== 'ALL') {
    list = list.filter((b) => b.status === status);
  }

  // Check and auto-publish scheduled posts whose time has passed
  const now = new Date();
  let modified = false;
  list = list.map((b) => {
    if (b.status === 'Scheduled' && b.scheduledPublishAt && new Date(b.scheduledPublishAt) <= now) {
      modified = true;
      return {
        ...b,
        status: 'Published' as BlogStatus,
        publishedAt: b.publishedAt || now.toISOString(),
        updatedAt: now.toISOString(),
      };
    }
    return b;
  });

  if (modified) {
    writeBlogsToDb(list);
  }

  // Sort
  list.sort((a, b) => {
    if (sortBy === 'views') return b.viewsCount - a.viewsCount;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return list;
}

export function getBlogBySlug(slug: string): BlogRecord | null {
  const all = readBlogsFromDb();
  const cleanSlug = slug.toLowerCase().trim();
  
  // 1. Direct match
  const found = all.find((b) => b.slug.toLowerCase() === cleanSlug);
  if (found) return found;

  // 2. Check 301 redirects map
  const redirects = getRedirects();
  const redirect = redirects.find((r) => r.fromSlug.toLowerCase() === cleanSlug);
  if (redirect) {
    const target = all.find((b) => b.slug.toLowerCase() === redirect.toSlug.toLowerCase());
    if (target) return target;
  }

  return null;
}

export function getBlogById(id: number): BlogRecord | null {
  const all = readBlogsFromDb();
  return all.find((b) => Number(b.id) === Number(id)) || null;
}

export async function createBlog(
  data: Partial<BlogRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
  if (!data.title?.trim()) return { success: false, error: 'Article title is required.' };
  if (!data.content?.trim()) return { success: false, error: 'Article content is required.' };

  const all = readBlogsFromDb();
  const newId = all.length > 0 ? Math.max(...all.map((b) => Number(b.id) || 0)) + 1 : 1;
  const now = new Date().toISOString();

  // Slug derivation
  const rawSlug = data.slug?.trim() || data.title;
  let cleanSlug = rawSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!cleanSlug) cleanSlug = `article-${newId}`;

  // Check slug uniqueness
  if (all.some((b) => b.slug.toLowerCase() === cleanSlug)) {
    cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
  }

  // Auto calculate reading time if not explicitly provided
  const wordCount = (data.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  const calculatedReadTime = `${Math.max(2, Math.ceil(wordCount / 200))} min read`;

  const status: BlogStatus = data.status || 'Draft';
  const initialRevision: BlogRevision = {
    revisionId: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    author: user,
    title: data.title.trim(),
    content: data.content.trim(),
    status,
    summary: 'Initial article creation',
  };

  const newBlog: BlogRecord = {
    id: newId,
    title: data.title.trim(),
    slug: cleanSlug,
    excerpt: data.excerpt?.trim() || data.title.trim(),
    content: data.content.trim(),
    author: data.author?.trim() || user,
    authorId: data.authorId || undefined,
    category: data.category?.trim() || 'General',
    readTime: data.readTime?.trim() || calculatedReadTime,
    coverImage: data.coverImage?.trim() || '/site/assets/img/blog/blog-1.jpg',
    coverImageAlt: data.coverImageAlt?.trim() || data.title.trim(),
    coverImageCaption: data.coverImageCaption?.trim() || undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    status,
    scheduledPublishAt: data.scheduledPublishAt || undefined,
    publishedAt: status === 'Published' ? now : undefined,
    viewsCount: 0,
    seo: {
      seoTitle: data.seo?.seoTitle?.trim() || data.title.trim(),
      metaDescription: data.seo?.metaDescription?.trim() || data.excerpt?.trim() || data.title.trim(),
      canonicalUrl: data.seo?.canonicalUrl?.trim() || `https://10qchallenge.in/blog/${cleanSlug}`,
      focusKeyword: data.seo?.focusKeyword?.trim() || undefined,
      secondaryKeywords: data.seo?.secondaryKeywords || [],
      robotsIndex: data.seo?.robotsIndex !== false,
      robotsFollow: data.seo?.robotsFollow !== false,
      ogTitle: data.seo?.ogTitle?.trim() || data.title.trim(),
      ogDescription: data.seo?.ogDescription?.trim() || data.excerpt?.trim() || data.title.trim(),
      ogImage: data.seo?.ogImage?.trim() || data.coverImage?.trim() || '/site/assets/img/blog/blog-1.jpg',
      twitterCard: data.seo?.twitterCard || 'summary_large_image',
    },
    revisions: [initialRevision],
    createdAt: now,
    updatedAt: now,
    updatedBy: user,
  };

  all.push(newBlog);
  writeBlogsToDb(all);
  return { success: true, blog: newBlog };
}

export async function updateBlog(
  id: number,
  data: Partial<BlogRecord>,
  user = 'Administrator',
  revisionSummary = 'Editorial content update'
): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
  const all = readBlogsFromDb();
  const index = all.findIndex((b) => Number(b.id) === Number(id));
  if (index === -1) return { success: false, error: 'Article not found.' };

  const existing = all[index];
  const now = new Date().toISOString();

  // Slug check and 301 redirect generation
  let newSlug = existing.slug;
  if (data.slug && data.slug.trim().toLowerCase() !== existing.slug.toLowerCase()) {
    newSlug = data.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check conflict with other blogs
    const conflict = all.find((b) => Number(b.id) !== Number(id) && b.slug.toLowerCase() === newSlug);
    if (conflict) {
      return { success: false, error: `Slug "${newSlug}" is already in use by article #${conflict.id}.` };
    }

    // Auto-create 301 redirect from old slug to new slug
    addRedirect(existing.slug, newSlug, 301);
  }

  // Auto calculate read time if content changed
  let readTime = data.readTime || existing.readTime;
  if (data.content && data.content !== existing.content && !data.readTime) {
    const wordCount = data.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    readTime = `${Math.max(2, Math.ceil(wordCount / 200))} min read`;
  }

  const nextStatus = data.status || existing.status;
  const publishedAt =
    nextStatus === 'Published' && existing.status !== 'Published'
      ? now
      : existing.publishedAt || (nextStatus === 'Published' ? now : undefined);

  // New revision snapshot
  const newRevision: BlogRevision = {
    revisionId: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    author: user,
    title: data.title?.trim() || existing.title,
    content: data.content?.trim() || existing.content,
    status: nextStatus,
    summary: revisionSummary,
  };

  const existingRevisions = Array.isArray(existing.revisions) ? existing.revisions : [];
  // Keep last 25 revisions max
  const updatedRevisions = [newRevision, ...existingRevisions].slice(0, 25);

  const updated: BlogRecord = {
    ...existing,
    ...data,
    id: existing.id,
    slug: newSlug,
    readTime,
    status: nextStatus,
    publishedAt,
    seo: {
      ...existing.seo,
      ...(data.seo || {}),
    },
    revisions: updatedRevisions,
    updatedAt: now,
    updatedBy: user,
  };

  all[index] = updated;
  writeBlogsToDb(all);
  return { success: true, blog: updated };
}

export async function deleteBlog(id: number): Promise<{ success: boolean; error?: string }> {
  const all = readBlogsFromDb();
  const index = all.findIndex((b) => Number(b.id) === Number(id));
  if (index === -1) return { success: false, error: 'Article not found.' };

  all.splice(index, 1);
  writeBlogsToDb(all);

  // Invalidate all active preview tokens for the deleted article
  try {
    await PreviewTokenService.revokeAllTokensForBlog(Number(id));
  } catch (_) {}

  return { success: true };
}

export async function duplicateBlog(
  id: number,
  user = 'Administrator'
): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
  const original = getBlogById(id);
  if (!original) return { success: false, error: 'Original article not found.' };

  return createBlog(
    {
      title: `${original.title} (Copy)`,
      slug: `${original.slug}-copy`,
      excerpt: original.excerpt,
      content: original.content,
      author: user,
      category: original.category,
      coverImage: original.coverImage,
      coverImageAlt: original.coverImageAlt,
      tags: [...original.tags],
      status: 'Draft',
      seo: { ...original.seo, seoTitle: `${original.title} (Copy)` },
    },
    user
  );
}

export async function restoreRevision(
  blogId: number,
  revisionId: string,
  user = 'Administrator'
): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
  const blog = getBlogById(blogId);
  if (!blog) return { success: false, error: 'Article not found.' };

  const targetRevision = (blog.revisions || []).find((r) => r.revisionId === revisionId);
  if (!targetRevision) return { success: false, error: 'Revision not found.' };

  return updateBlog(
    blogId,
    {
      title: targetRevision.title,
      content: targetRevision.content,
      status: targetRevision.status,
    },
    user,
    `Restored from revision ${revisionId} (${new Date(targetRevision.timestamp).toLocaleDateString()})`
  );
}

export function incrementBlogViews(id: number): void {
  const all = readBlogsFromDb();
  const b = all.find((item) => Number(item.id) === Number(id));
  if (b) {
    b.viewsCount = (b.viewsCount || 0) + 1;
    writeBlogsToDb(all);
  }
}

// ----------------- PREVIEW TOKEN ENGINE (F13-01 PERSISTENT & HASHED) -----------------

export async function createPreviewToken(blogId: number, user = 'Administrator'): Promise<string> {
  const numId = Number(blogId);
  if (!numId || isNaN(numId) || numId <= 0) {
    throw new Error('Valid positive blogId is required for preview token generation.');
  }

  const blog = getBlogById(numId);
  if (!blog) throw new Error('Article not found.');

  const res = await PreviewTokenService.createPreviewToken(numId, user, 2);
  return res.token;
}

export async function verifyPreviewToken(token: string): Promise<BlogRecord | null> {
  const res = await PreviewTokenService.verifyPreviewToken(token);
  if (!res.valid || !res.blogId) return null;
  return getBlogById(res.blogId);
}

export async function revokePreviewToken(token: string): Promise<boolean> {
  return await PreviewTokenService.revokePreviewToken(token);
}

export async function revokeAllPreviewTokensForBlog(blogId: number): Promise<number> {
  return await PreviewTokenService.revokeAllTokensForBlog(Number(blogId));
}

// ----------------- METRICS ENGINE -----------------

export function getBlogDashboardMetrics(): BlogDashboardMetrics {
  const blogs = readBlogsFromDb();
  const totalArticles = blogs.length;
  let publishedArticles = 0;
  let draftArticles = 0;
  let inReviewArticles = 0;
  let scheduledArticles = 0;
  let archivedArticles = 0;
  let totalViews = 0;
  let seoAttentionNeeded = 0;

  for (const b of blogs) {
    if (b.status === 'Published') publishedArticles++;
    else if (b.status === 'Draft') draftArticles++;
    else if (b.status === 'In Review') inReviewArticles++;
    else if (b.status === 'Scheduled') scheduledArticles++;
    else if (b.status === 'Archived') archivedArticles++;

    totalViews += b.viewsCount || 0;

    // SEO evaluation: missing title, meta desc < 50 chars, missing cover or alt
    const seo = b.seo || {};
    const titleMissing = !seo.seoTitle || seo.seoTitle.length < 15;
    const descMissing = !seo.metaDescription || seo.metaDescription.length < 40;
    const imgMissing = !b.coverImage || !b.coverImageAlt;
    if (titleMissing || descMissing || imgMissing) {
      seoAttentionNeeded++;
    }
  }

  return {
    totalArticles,
    publishedArticles,
    draftArticles,
    inReviewArticles,
    scheduledArticles,
    archivedArticles,
    totalViews,
    seoAttentionNeeded,
  };
}

// ----------------- TAXONOMY & METADATA (CATEGORIES, AUTHORS, REDIRECTS) -----------------

export function getCategories(): BlogCategory[] {
  const paths = getCandidatePaths('blog-categories.json');
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (_) {}
  }
  saveCategories(CANONICAL_CATEGORIES);
  return CANONICAL_CATEGORIES;
}

export function saveCategories(items: BlogCategory[]): void {
  const paths = getCandidatePaths('blog-categories.json');
  for (const p of paths) {
    try { atomicWriteJson(p, items); } catch (_) {}
  }
}

export function getAuthors(): BlogAuthor[] {
  const paths = getCandidatePaths('blog-authors.json');
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (_) {}
  }
  saveAuthors(CANONICAL_AUTHORS);
  return CANONICAL_AUTHORS;
}

export function saveAuthors(items: BlogAuthor[]): void {
  const paths = getCandidatePaths('blog-authors.json');
  for (const p of paths) {
    try { atomicWriteJson(p, items); } catch (_) {}
  }
}

export function getRedirects(): BlogRedirect[] {
  const paths = getCandidatePaths('blog-redirects.json');
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (_) {}
  }
  return [];
}

export function addRedirect(fromSlug: string, toSlug: string, statusCode: 301 | 302 = 301): void {
  if (fromSlug.toLowerCase() === toSlug.toLowerCase()) return;
  const list = getRedirects();
  const existingIdx = list.findIndex((r) => r.fromSlug.toLowerCase() === fromSlug.toLowerCase());
  const entry: BlogRedirect = {
    fromSlug: fromSlug.toLowerCase().trim(),
    toSlug: toSlug.toLowerCase().trim(),
    statusCode,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    list[existingIdx] = entry;
  } else {
    list.push(entry);
  }

  const paths = getCandidatePaths('blog-redirects.json');
  for (const p of paths) {
    try { atomicWriteJson(p, list); } catch (_) {}
  }
}

// ----------------- SITEMAP & RSS GENERATORS -----------------

export function generateBlogSitemapXml(): string {
  const blogs = readBlogsFromDb().filter((b) => b.status === 'Published');
  const baseUrl = 'https://10qchallenge.in';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Hub page
  xml += `  <url>\n`;
  xml += `    <loc>${baseUrl}/blog</loc>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `  </url>\n`;

  // Each published article
  for (const b of blogs) {
    if (b.seo?.robotsIndex === false) continue;
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/blog/${b.slug}</loc>\n`;
    xml += `    <lastmod>${new Date(b.updatedAt || b.publishedAt || b.createdAt).toISOString()}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

export function generateBlogRssXml(): string {
  const blogs = readBlogsFromDb().filter((b) => b.status === 'Published');
  const baseUrl = 'https://10qchallenge.in';

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
  rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
  rss += `<channel>\n`;
  rss += `  <title>10Q Challenge Blog | BITSAT, JEE & Engineering Preparation</title>\n`;
  rss += `  <link>${baseUrl}/blog</link>\n`;
  rss += `  <description>Proven time management tactics, question sequence, and exam strategy from BITS Pilani rankers.</description>\n`;
  rss += `  <language>en-in</language>\n`;
  rss += `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
  rss += `  <atom:link href="${baseUrl}/api/blogs/feed.xml" rel="self" type="application/rss+xml" />\n`;

  for (const b of blogs) {
    rss += `  <item>\n`;
    rss += `    <title><![CDATA[${b.title}]]></title>\n`;
    rss += `    <link>${baseUrl}/blog/${b.slug}</link>\n`;
    rss += `    <guid isPermaLink="true">${baseUrl}/blog/${b.slug}</guid>\n`;
    rss += `    <pubDate>${new Date(b.publishedAt || b.createdAt).toUTCString()}</pubDate>\n`;
    rss += `    <description><![CDATA[${b.excerpt}]]></description>\n`;
    rss += `    <category>${b.category}</category>\n`;
    rss += `    <author>${b.author}</author>\n`;
    rss += `  </item>\n`;
  }

  rss += `</channel>\n`;
  rss += `</rss>`;
  return rss;
}
