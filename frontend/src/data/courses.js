// Central Courses Data Store with Production Server Synchronization
// Connects React Frontend to Central Server Database & APIs with Local Storage Cache

const STORAGE_KEY = '10q_courses_data_fresh_v1';

// Synchronous local cache retrieval for instant client render
export function getStoredCourses() {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse courses from localStorage:', err);
    return [];
  }
}

// Local storage write + event broadcast
export function saveStoredCourses(courses) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    window.dispatchEvent(new Event('10q_courses_updated'));
  } catch (err) {
    console.error('Failed to save courses to localStorage:', err);
  }
}

// Server API: Fetch Public Courses (all published courses across all admins)
export async function fetchServerCourses(options = {}) {
  try {
    const query = new URLSearchParams();
    if (options.exam) query.set('exam', options.exam);
    if (options.showInIndex) query.set('showInIndex', 'true');
    if (options.mentorship) query.set('mentorship', 'true');
    if (options.testSeries) query.set('testSeries', 'true');
    if (options.search) query.set('search', options.search);

    const url = `/api/courses${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        saveStoredCourses(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Courses API] Failed to fetch server courses, falling back to local store:', err);
  }
  return getStoredCourses();
}

// Server API: Fetch Admin Courses (all courses including drafts)
export async function fetchAdminCourses(search = '') {
  try {
    const url = `/api/admin/courses${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        saveStoredCourses(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Admin Courses API] Failed to fetch server courses:', err);
  }
  return getStoredCourses();
}

// Server API: Create Course in Central Database
export async function apiCreateCourse(courseData, adminUser = 'Administrator') {
  try {
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-user': adminUser,
      },
      body: JSON.stringify(courseData),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create course on server.');
    }

    // Refresh local cache with latest server list
    await fetchAdminCourses();
    return json.data;
  } catch (err) {
    console.error('[Create Course API Error]', err);
    throw err;
  }
}

// Server API: Update Course in Central Database
export async function apiUpdateCourse(id, courseData, adminUser = 'Administrator') {
  try {
    const res = await fetch(`/api/admin/courses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-user': adminUser,
      },
      body: JSON.stringify(courseData),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update course on server.');
    }

    await fetchAdminCourses();
    return json.data;
  } catch (err) {
    console.error('[Update Course API Error]', err);
    throw err;
  }
}

// Server API: Delete Course from Central Database
export async function apiDeleteCourse(id) {
  try {
    const res = await fetch(`/api/admin/courses/${id}`, {
      method: 'DELETE',
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete course on server.');
    }

    await fetchAdminCourses();
    return true;
  } catch (err) {
    console.error('[Delete Course API Error]', err);
    throw err;
  }
}

// Server API: Permanent File Upload (Image or PDF Roadmap)
export async function apiUploadFile(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to upload file.');
    }

    return json;
  } catch (err) {
    console.error('[Upload File API Error]', err);
    throw err;
  }
}

// Fallback empty array for static SSR evaluation
export const coursesData = [];

// Resolve single course by slug or ID with resilient matching
export const getCourseBySlug = (rawSlug) => {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(String(rawSlug)).trim();
  const normalized = decoded.toLowerCase();
  const dashed = normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const currentCourses = getStoredCourses();
  const searchList = currentCourses.length > 0 ? currentCourses : coursesData;

  return (
    searchList.find((c) => {
      if (!c) return false;
      const cId = String(c.id).trim();
      const cSlug = String(c.slug || '').trim().toLowerCase();
      const cSlugDashed = cSlug.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const cTitleDashed = String(c.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      return (
        cId === decoded ||
        cId === dashed ||
        cSlug === normalized ||
        cSlugDashed === dashed ||
        cTitleDashed === dashed
      );
    }) || null
  );
};

// Automatic background sync on client mount
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchServerCourses();
  }, 100);
}
