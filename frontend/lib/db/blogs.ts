import fs from 'fs';
import path from 'path';

export interface BlogRecord {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  readTime: string;
  coverImage?: string;
  tags?: string[];
  status: 'Published' | 'Draft' | 'Archived';
  createdAt: string;
  updatedAt: string;
}

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
Unlike JEE Advanced, where profound theoretical derivations dictate success, BITSAT tests high-yield formula recall and quick computational agility.

## 2. Bonus Questions Strategy
Attempting all 130 questions unlocks 12 bonus questions (3 Physics, 3 Chemistry, 3 Math/Bio, 3 English/LR) worth an additional 36 marks. Only attempt bonus questions if you have finished the main paper with at least 20 minutes to spare and an accuracy rate of 90%+.
    `,
    author: 'Ritesh (BITS Pilani Alumni)',
    category: 'Exam Strategy',
    readTime: '6 min read',
    coverImage: '/site/assets/blog-bitsat.jpg',
    tags: ['BITSAT', 'Strategy', 'Physics', 'Mathematics'],
    status: 'Published',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 2,
    title: 'COMEDK vs BITSAT vs JEE Main: A Complete Analysis for Aspirants',
    slug: 'comedk-vs-bitsat-vs-jee-main-analysis',
    excerpt: 'Detailed comparison of negative marking schemes, college cutoffs, and seat matrices.',
    content: `
# Comparative Analysis: COMEDK, BITSAT & JEE Main

Understanding the distinct exam architectures is essential for optimizing your revision schedule.

- **BITSAT:** +3/-1 marking with 12 bonus questions.
- **COMEDK:** 180 questions in 180 minutes with 0 negative marking.
- **JEE Main:** +4/-1 marking with numerical value section.
    `,
    author: 'Academic Advisory Board',
    category: 'College Guidance',
    readTime: '8 min read',
    coverImage: '/site/assets/blog-comparison.jpg',
    tags: ['COMEDK', 'BITSAT', 'JEE'],
    status: 'Published',
    createdAt: '2026-11-02T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
  },
];

function getBlogPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'blogs.json'), path.join(persistentDir, 'blogs.json')] : []),
    path.join(cwd, 'data', 'blogs.json'),
    path.join(cwd, 'frontend', 'data', 'blogs.json'),
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
    const fallback = path.join(cwd, 'data', 'blogs.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

export function readBlogsFromDb(): BlogRecord[] {
  const paths = getBlogPaths();
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (err) {}
  }
  writeBlogsToDb(CANONICAL_DEFAULT_BLOGS);
  return CANONICAL_DEFAULT_BLOGS;
}

export function writeBlogsToDb(items: BlogRecord[]): void {
  const json = JSON.stringify(items, null, 2);
  const paths = getBlogPaths();
  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, json, 'utf-8');
    } catch (err) {}
  }
}

export function getAdminBlogs(search?: string): BlogRecord[] {
  let list = readBlogsFromDb();
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getBlogBySlug(slug: string): BlogRecord | null {
  const all = readBlogsFromDb();
  return all.find((b) => b.slug.toLowerCase() === slug.toLowerCase()) || null;
}

export function getBlogById(id: number): BlogRecord | null {
  const all = readBlogsFromDb();
  return all.find((b) => Number(b.id) === Number(id)) || null;
}

export async function createBlog(
  data: Partial<BlogRecord>,
  user = 'Administrator'
): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
  if (!data.title?.trim()) return { success: false, error: 'Blog title is required.' };
  if (!data.content?.trim()) return { success: false, error: 'Content is required.' };

  const all = readBlogsFromDb();
  const newId = all.length > 0 ? Math.max(...all.map((b) => Number(b.id) || 0)) + 1 : 1;
  const now = new Date().toISOString();

  const slug =
    data.slug?.trim() ||
    data.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const newBlog: BlogRecord = {
    id: newId,
    title: data.title.trim(),
    slug,
    excerpt: data.excerpt?.trim() || data.title.trim(),
    content: data.content.trim(),
    author: data.author?.trim() || user,
    category: data.category?.trim() || 'General',
    readTime: data.readTime?.trim() || '5 min read',
    coverImage: data.coverImage?.trim() || undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    status: (data.status as any) || 'Published',
    createdAt: now,
    updatedAt: now,
  };

  all.push(newBlog);
  writeBlogsToDb(all);
  return { success: true, blog: newBlog };
}

export async function updateBlog(
  id: number,
  data: Partial<BlogRecord>
): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
  const all = readBlogsFromDb();
  const index = all.findIndex((b) => Number(b.id) === Number(id));
  if (index === -1) return { success: false, error: 'Blog not found.' };

  const existing = all[index];
  const updated: BlogRecord = {
    ...existing,
    ...data,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  all[index] = updated;
  writeBlogsToDb(all);
  return { success: true, blog: updated };
}

export async function deleteBlog(id: number): Promise<{ success: boolean; error?: string }> {
  const all = readBlogsFromDb();
  const index = all.findIndex((b) => Number(b.id) === Number(id));
  if (index === -1) return { success: false, error: 'Blog not found.' };

  all.splice(index, 1);
  writeBlogsToDb(all);
  return { success: true };
}
