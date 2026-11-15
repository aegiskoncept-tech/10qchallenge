import fs from 'fs';
import path from 'path';

export interface CourseRecord {
  id: number;
  title: string;
  shortDescription?: string;
  description?: string;
  exam: string;
  examId?: number;
  originalPrice: number | string;
  discountedPrice: number | string;
  price: number | string;
  discount?: string;
  expiryDate?: string;
  enrolledStudent?: number | string;
  displayIndex?: number | string;
  additionalDetails?: string;
  image?: string;
  bannerImage?: string;
  altCourseImage?: string;
  altBannerImage?: string;
  scheduleFile?: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  courseLink?: string;
  isShowInIndex: boolean;
  isActive: boolean;
  isShowInMentorship: boolean;
  isShowInTestSeries: boolean;
  rating?: number | string;
  reviewsCount?: number | string;
  studentsCount?: number | string;
  duration?: string;
  lectures?: string;
  tests?: string;
  tag?: string;
  language?: string;
  validity?: string;
  mentor?: string;
  highlights?: string[];
  overviewTitle?: string;
  overviewParagraphs?: string[];
  targetAudience?: string[];
  requirements?: string[];
  syllabusModules?: Array<{
    title: string;
    duration?: string;
    lessonsCount?: number;
    topics: string[];
  }>;
  whatYouWillLearn?: string[];
  faqs?: Array<{ q: string; a: string }>;
  reviews?: Array<{
    name: string;
    college?: string;
    score?: string;
    rating?: number;
    review: string;
    avatar?: string;
  }>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Find primary and secondary file paths for storage synchronization
function getDataPaths(): string[] {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'data', 'courses.json'),
    path.join(cwd, 'frontend', 'data', 'courses.json'),
    path.join(cwd, '..', 'data', 'courses.json'),
  ];

  const uniqueDirs = new Set<string>();
  const validPaths: string[] = [];

  for (const p of candidates) {
    const dir = path.dirname(p);
    // Don't create data folders at the root of drive like D:\data
    if (dir === 'D:\\' || dir === 'C:\\' || dir === '/' || dir === '\\') {
      continue;
    }
    if (!uniqueDirs.has(dir)) {
      uniqueDirs.add(dir);
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        validPaths.push(p);
      } catch (err) {
        // directory creation fallback
      }
    } else {
      validPaths.push(p);
    }
  }

  return validPaths.length > 0 ? validPaths : [path.join(cwd, 'data', 'courses.json')];
}

// Read courses from disk with safe caching, multi-path fallback & auto-synchronization
export function readCoursesFromDb(): CourseRecord[] {
  const paths = getDataPaths();
  let candidateWithData: { path: string; data: CourseRecord[] } | null = null;
  let emptyPaths: string[] = [];

  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (parsed.length > 0) {
              candidateWithData = { path: filePath, data: parsed };
              break;
            } else {
              emptyPaths.push(filePath);
            }
          }
        }
      } else {
        emptyPaths.push(filePath);
      }
    } catch (err) {
      console.error(`[DB Error] Reading courses from ${filePath}:`, err);
    }
  }

  // If one store has data while another was empty, synchronize the other immediately
  if (candidateWithData) {
    for (const emptyPath of emptyPaths) {
      try {
        const dir = path.dirname(emptyPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(emptyPath, JSON.stringify(candidateWithData.data, null, 2), 'utf-8');
      } catch {
        // silent sync fallback
      }
    }
    return candidateWithData.data;
  }

  return [];
}

// Write courses to disk atomically across all valid data paths
export function writeCoursesToDb(courses: CourseRecord[]): void {
  const json = JSON.stringify(courses, null, 2);
  const paths = getDataPaths();

  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, json, 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      console.error(`[DB Error] Writing courses to ${filePath}:`, err);
      try {
        fs.writeFileSync(filePath, json, 'utf-8');
      } catch (innerErr) {
        console.error(`[DB Fatal] Direct write failed for ${filePath}:`, innerErr);
      }
    }
  }
}

// Normalize a string into a clean URL-friendly slug
export function toSlug(str: string): string {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Calculate discount string from prices
export function computeDiscountString(originalPrice: number | string, discountedPrice: number | string): string {
  const orig = Number(String(originalPrice).replace(/[^0-9.]/g, '')) || 0;
  const disc = Number(String(discountedPrice).replace(/[^0-9.]/g, '')) || 0;

  if (orig > 0 && disc > 0 && orig > disc) {
    const pct = Math.round(((orig - disc) / orig) * 100);
    return `${pct}% OFF`;
  }
  return 'SPECIAL OFFER';
}

// Public Query: Get active published courses with filtering & ordering
export function getPublicCourses(options?: {
  exam?: string;
  showInIndex?: boolean;
  mentorship?: boolean;
  testSeries?: boolean;
  search?: string;
}): CourseRecord[] {
  const all = readCoursesFromDb();

  return all
    .filter((c) => {
      // Must be Active (Published)
      if (c.isActive === false) return false;

      // Filter by Exam
      if (options?.exam && options.exam !== 'All' && options.exam !== 'ALL') {
        if (c.exam?.toUpperCase() !== options.exam.toUpperCase()) {
          return false;
        }
      }

      // Filter for Homepage Index
      if (options?.showInIndex && !c.isShowInIndex) {
        return false;
      }

      // Filter for Mentorship section
      if (options?.mentorship && !c.isShowInMentorship) {
        return false;
      }

      // Filter for Test Series section
      if (options?.testSeries && !c.isShowInTestSeries) {
        return false;
      }

      // Search term
      if (options?.search) {
        const query = options.search.toLowerCase().trim();
        const inTitle = c.title?.toLowerCase().includes(query);
        const inExam = c.exam?.toLowerCase().includes(query);
        const inSlug = c.slug?.toLowerCase().includes(query);
        if (!inTitle && !inExam && !inSlug) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Order by displayIndex ascending (1, 2, 3...)
      const orderA = Number(a.displayIndex) || 999;
      const orderB = Number(b.displayIndex) || 999;
      if (orderA !== orderB) return orderA - orderB;

      // Then by creation date descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

// Admin Query: Get all courses with optional search
export function getAdminCourses(searchTerm?: string): CourseRecord[] {
  const all = readCoursesFromDb();

  if (!searchTerm) {
    return all.sort((a, b) => (Number(a.displayIndex) || 999) - (Number(b.displayIndex) || 999));
  }

  const query = searchTerm.toLowerCase().trim();
  return all
    .filter((c) =>
      c.title?.toLowerCase().includes(query) ||
      c.exam?.toLowerCase().includes(query) ||
      c.slug?.toLowerCase().includes(query)
    )
    .sort((a, b) => (Number(a.displayIndex) || 999) - (Number(b.displayIndex) || 999));
}

// Find single course by slug or ID
export function getCourseBySlugOrId(slugOrId: string | number, includeInactive = false): CourseRecord | null {
  if (!slugOrId) return null;

  const raw = decodeURIComponent(String(slugOrId)).trim();
  const normalized = raw.toLowerCase();
  const dashed = toSlug(normalized);
  const all = readCoursesFromDb();

  const found = all.find((c) => {
    const cId = String(c.id).trim();
    const cSlug = String(c.slug || '').trim().toLowerCase();
    const cSlugDashed = toSlug(cSlug);
    const cTitleDashed = toSlug(c.title);

    return (
      cId === raw ||
      cId === dashed ||
      cSlug === normalized ||
      cSlugDashed === dashed ||
      cTitleDashed === dashed
    );
  });

  if (!found) return null;
  if (!includeInactive && found.isActive === false) return null;

  return found;
}

// Check slug uniqueness (excluding optional existing course ID)
export function isSlugTaken(slug: string, excludeId?: number): boolean {
  const target = toSlug(slug);
  const all = readCoursesFromDb();
  return all.some((c) => {
    if (excludeId && c.id === excludeId) return false;
    return toSlug(c.slug) === target;
  });
}

// Create new course
export function createCourse(data: Partial<CourseRecord> & Record<string, any>, user = 'Admin'): { success: boolean; course?: CourseRecord; error?: string } {
  if (!data.title?.trim()) {
    return { success: false, error: 'Course title is required.' };
  }
  const examVal = (data.exam || data.examTag || 'BITSAT').trim();
  if (!examVal) {
    return { success: false, error: 'Exam category is required.' };
  }

  const slug = toSlug(data.slug?.trim() || data.title.trim());
  if (isSlugTaken(slug)) {
    return { success: false, error: `The slug '${slug}' is already in use by another course.` };
  }

  const all = readCoursesFromDb();
  const newId = all.length > 0 ? Math.max(...all.map((c) => Number(c.id) || 0)) + 1 : 1;
  const now = new Date().toISOString();

  const priceVal = data.discountedPrice || data.discountPrice || data.price || data.originalPrice || '4999';
  const origPriceVal = data.originalPrice || priceVal;
  const discountVal = data.discount || computeDiscountString(origPriceVal, priceVal);

  const imageVal = data.image || data.thumbnailUrl || '/site/assets/img/banner.png';
  const bannerVal = data.bannerImage || data.bannerUrl || imageVal;

  const newCourse: CourseRecord & Record<string, any> = {
    id: newId,
    title: data.title.trim(),
    shortDescription: data.shortDescription?.trim() || data.description?.trim() || '',
    description: data.description?.trim() || data.shortDescription?.trim() || '',
    exam: examVal,
    examTag: examVal,
    examId: data.examId ? Number(data.examId) : undefined,
    originalPrice: origPriceVal,
    discountedPrice: priceVal,
    discountPrice: Number(priceVal) || 4999,
    price: priceVal,
    discount: discountVal,
    expiryDate: data.expiryDate || '',
    enrolledStudent: data.enrolledStudent || '1250',
    displayIndex: data.displayIndex || '1',
    additionalDetails: data.additionalDetails?.trim() || '',
    image: imageVal,
    thumbnailUrl: imageVal,
    bannerImage: bannerVal,
    bannerUrl: bannerVal,
    altCourseImage: data.altCourseImage?.trim() || data.title.trim(),
    altBannerImage: data.altBannerImage?.trim() || data.title.trim(),
    scheduleFile: data.scheduleFile?.trim() || '',
    slug: slug,
    metaTitle: data.metaTitle?.trim() || `${data.title.trim()} | 10Q Challenge`,
    metaDescription: data.metaDescription?.trim() || data.shortDescription?.trim() || '',
    courseLink: data.courseLink?.trim() || `/course-detail/${slug}`,
    isShowInIndex: data.isShowInIndex !== undefined ? Boolean(data.isShowInIndex) : true,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    isShowInMentorship: Boolean(data.isShowInMentorship),
    isShowInTestSeries: Boolean(data.isShowInTestSeries),
    rating: data.rating || 4.9,
    reviewsCount: Number(data.reviewsCount || data.reviewCount) || 128,
    studentsCount: Number(data.enrolledStudent || data.enrolledCount) || 1250,
    duration: data.duration || '60+ Hours Live & Recorded',
    lectures: data.lectures || '80+ Lectures',
    tests: data.tests || '20+ Mock Tests',
    tag: data.tag || 'NEW BATCH',
    language: data.language || 'English + Hinglish',
    validity: data.validity || 'Valid Till Exam 2026',
    mentor: data.mentor || 'Harshal Jain',
    features: Array.isArray(data.features) ? data.features : ['Live Demo Access', 'Formula PDF Notes', '24/7 Doubt Resolution'],
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    chapters: Array.isArray(data.chapters) ? data.chapters : [],
    createdBy: user,
    updatedBy: user,
    createdAt: now,
    updatedAt: now,
  };

  all.unshift(newCourse);
  writeCoursesToDb(all);

  return { success: true, course: newCourse };
}

// Update existing course
export function updateCourse(id: number, data: Partial<CourseRecord> & Record<string, any>, user = 'Admin'): { success: boolean; course?: CourseRecord; error?: string } {
  const all = readCoursesFromDb();
  const index = all.findIndex((c) => Number(c.id) === Number(id));

  if (index === -1) {
    return { success: false, error: `Course with ID ${id} not found.` };
  }

  const existing = all[index] as any;
  const newSlug = data.slug ? toSlug(data.slug) : existing.slug;

  if (newSlug !== existing.slug && isSlugTaken(newSlug, id)) {
    return { success: false, error: `The slug '${newSlug}' is already in use by another course.` };
  }

  const priceVal = data.discountedPrice || data.discountPrice || data.price || existing.discountedPrice || existing.price;
  const origPriceVal = data.originalPrice || existing.originalPrice || priceVal;
  const discountVal = data.discount || computeDiscountString(origPriceVal, priceVal);

  const examVal = (data.exam || data.examTag || existing.exam || existing.examTag || 'BITSAT').trim();
  const imageVal = data.image || data.thumbnailUrl || existing.image || existing.thumbnailUrl;
  const bannerVal = data.bannerImage || data.bannerUrl || data.image || existing.bannerImage || existing.bannerUrl || imageVal;

  const updated: CourseRecord & Record<string, any> = {
    ...existing,
    ...data,
    id: existing.id,
    title: data.title !== undefined ? data.title.trim() : existing.title,
    slug: newSlug,
    exam: examVal,
    examTag: examVal,
    examId: data.examId ? Number(data.examId) : existing.examId,
    price: priceVal,
    discountedPrice: priceVal,
    discountPrice: Number(priceVal) || 4999,
    originalPrice: origPriceVal,
    discount: discountVal,
    image: imageVal,
    thumbnailUrl: imageVal,
    bannerImage: bannerVal,
    bannerUrl: bannerVal,
    updatedBy: user,
    updatedAt: new Date().toISOString(),
  };

  all[index] = updated;
  writeCoursesToDb(all);

  return { success: true, course: updated };
}

// Delete course by ID
export function deleteCourse(id: number): { success: boolean; error?: string } {
  const all = readCoursesFromDb();
  const filtered = all.filter((c) => Number(c.id) !== Number(id));

  if (filtered.length === all.length) {
    return { success: false, error: `Course with ID ${id} not found.` };
  }

  writeCoursesToDb(filtered);
  return { success: true };
}
