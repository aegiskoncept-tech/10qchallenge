import fs from 'fs';
import path from 'path';

export interface SeoConfigRecord {
  route: string; // e.g. '/', '/courses', '/test-series', '/blog', 'global'
  name: string; // Display name e.g. 'Homepage', 'Course Catalogue'
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string; // 'index, follow' | 'noindex, nofollow'
  jsonLd?: string;
  updatedAt: string;
  updatedBy?: string;
}

export const CANONICAL_DEFAULT_SEO: SeoConfigRecord[] = [
  {
    route: '/',
    name: 'Homepage',
    metaTitle: '10Q Challenge | Speed & Accuracy CBT LMS for BITSAT & JEE',
    metaDescription: 'Crack BITSAT, JEE Main, COMEDK & VITEEE with precision question practice, AI time analytics, and official CBT exam simulations.',
    keywords: ['BITSAT mock test', 'JEE Main test series', '10Q Challenge', 'CBT exam practice', 'Pilani rankers strategy'],
    ogTitle: '10Q Challenge - Master Entrance Exams with Speed & Precision',
    ogDescription: 'Experience exact CBT simulations, formula masterclasses, and ranked percentile analysis.',
    ogImage: '/site/assets/og-home.jpg',
    canonicalUrl: 'https://10qchallenge.in',
    robots: 'index, follow',
    updatedAt: '2026-11-01T00:00:00.000Z',
    updatedBy: 'System',
  },
  {
    route: '/courses',
    name: 'Course Catalogue',
    metaTitle: 'Elite Academic Courses & Masterclasses | 10Q Challenge',
    metaDescription: 'Explore expert-curated physics, mathematics, chemistry and logical reasoning crash courses for BITSAT and top engineering entrance exams.',
    keywords: ['BITSAT crash course', 'JEE formula revision', 'engineering entrance preparation'],
    ogTitle: '10Q Challenge Academic Courses',
    ogDescription: 'Comprehensive video lectures and high-yield question banks.',
    ogImage: '/site/assets/og-courses.jpg',
    canonicalUrl: 'https://10qchallenge.in/courses',
    robots: 'index, follow',
    updatedAt: '2026-11-01T00:00:00.000Z',
    updatedBy: 'System',
  },
  {
    route: '/test-series',
    name: 'Test Series & Mocks',
    metaTitle: 'Full-Length CBT Mock Tests | 10Q Challenge',
    metaDescription: 'Practice with realistic CBT interfaces, instant scoring, speed-per-question telemetry, and complete step-by-step solutions.',
    keywords: ['BITSAT online test series', 'JEE mock tests', 'CBT test engine'],
    ogTitle: '10Q Challenge CBT Mock Test Engine',
    ogDescription: 'Simulate the exact examination hall environment before exam day.',
    ogImage: '/site/assets/og-tests.jpg',
    canonicalUrl: 'https://10qchallenge.in/tests',
    robots: 'index, follow',
    updatedAt: '2026-11-01T00:00:00.000Z',
    updatedBy: 'System',
  },
  {
    route: '/blog',
    name: 'Blog & Articles',
    metaTitle: 'Exam Preparation Insights & Strategy Articles | 10Q Challenge',
    metaDescription: 'Read proven ranker advice, subject masterclass breakdowns, and college admission cutoffs for top engineering universities.',
    keywords: ['BITSAT strategy blog', 'college cutoffs 2026', 'exam preparation tips'],
    ogTitle: '10Q Challenge Educational Blog',
    ogDescription: 'High-impact revision blueprints written by alumni and mentors.',
    ogImage: '/site/assets/og-blog.jpg',
    canonicalUrl: 'https://10qchallenge.in/blog',
    robots: 'index, follow',
    updatedAt: '2026-11-01T00:00:00.000Z',
    updatedBy: 'System',
  },
];

function getSeoDataPaths(): string[] {
  const cwd = process.cwd();
  const persistentDir = process.env.DATA_STORE_DIR;
  const candidates = [
    ...(persistentDir ? [path.join(persistentDir, 'data', 'seo-configs.json'), path.join(persistentDir, 'seo-configs.json')] : []),
    path.join(cwd, 'data', 'seo-configs.json'),
    path.join(cwd, 'frontend', 'data', 'seo-configs.json'),
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
    const fallback = path.join(cwd, 'data', 'seo-configs.json');
    const dir = path.dirname(fallback);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    validPaths.push(fallback);
  }
  return validPaths;
}

export function readSeoConfigs(): SeoConfigRecord[] {
  const paths = getSeoDataPaths();
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
  }
  writeSeoConfigs(CANONICAL_DEFAULT_SEO);
  return CANONICAL_DEFAULT_SEO;
}

export function writeSeoConfigs(items: SeoConfigRecord[]): void {
  const json = JSON.stringify(items, null, 2);
  const paths = getSeoDataPaths();
  for (const p of paths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, json, 'utf-8');
    } catch {}
  }
}

export function getSeoConfigByRoute(route: string): SeoConfigRecord | null {
  const all = readSeoConfigs();
  return all.find((s) => s.route.toLowerCase() === route.toLowerCase()) || null;
}

export async function upsertSeoConfig(
  config: Partial<SeoConfigRecord> & { route: string },
  user = 'Administrator'
): Promise<{ success: boolean; config?: SeoConfigRecord; error?: string }> {
  if (!config.route) return { success: false, error: 'Route is required.' };
  if (!config.metaTitle?.trim()) return { success: false, error: 'Meta title is required.' };

  const all = readSeoConfigs();
  const index = all.findIndex((s) => s.route.toLowerCase() === config.route.toLowerCase());
  const now = new Date().toISOString();

  let updated: SeoConfigRecord;
  if (index >= 0) {
    updated = {
      ...all[index],
      ...config,
      updatedAt: now,
      updatedBy: user,
    };
    all[index] = updated;
  } else {
    updated = {
      route: config.route,
      name: config.name || config.route,
      metaTitle: config.metaTitle.trim(),
      metaDescription: config.metaDescription?.trim() || '',
      keywords: Array.isArray(config.keywords) ? config.keywords : [],
      ogTitle: config.ogTitle?.trim() || config.metaTitle.trim(),
      ogDescription: config.ogDescription?.trim() || config.metaDescription?.trim() || '',
      ogImage: config.ogImage?.trim() || undefined,
      canonicalUrl: config.canonicalUrl?.trim() || undefined,
      robots: config.robots || 'index, follow',
      jsonLd: config.jsonLd?.trim() || undefined,
      updatedAt: now,
      updatedBy: user,
    };
    all.push(updated);
  }

  writeSeoConfigs(all);
  return { success: true, config: updated };
}
