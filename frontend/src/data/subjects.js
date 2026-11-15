// Centralized Subject Master & Course-Subject Integration Data Service
// Authoritative bridge between React components and central server persistent database

export const subjectsStorageKey = '10q_subjects_master';

export function getStoredSubjects() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(subjectsStorageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read stored subjects:', err);
    return [];
  }
}

export function saveStoredSubjects(subjects) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(subjectsStorageKey, JSON.stringify(subjects));
    window.dispatchEvent(new Event('10q_subjects_updated'));
  } catch (err) {
    console.error('Failed to store subjects cache:', err);
  }
}

// Fetch active public subjects
export async function fetchServerSubjects() {
  try {
    const res = await fetch('/api/subjects', {
      cache: 'no-store',
      headers: { Pragma: 'no-cache' },
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      saveStoredSubjects(json.data);
      return json.data;
    }
    return getStoredSubjects();
  } catch (err) {
    console.warn('[Subjects Service] Server fetch failed, using cache:', err);
    return getStoredSubjects();
  }
}

// Fetch all subjects for Admin Panel with associated courses counts
export async function fetchAdminSubjects(searchTerm = '') {
  try {
    const url = searchTerm
      ? `/api/admin/subjects?search=${encodeURIComponent(searchTerm)}`
      : '/api/admin/subjects';
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Pragma: 'no-cache' },
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      saveStoredSubjects(json.data);
      return json.data;
    }
    return getStoredSubjects();
  } catch (err) {
    console.warn('[Admin Subjects Service] Failed to fetch admin subjects:', err);
    return getStoredSubjects();
  }
}

// Create new subject in central server database
export async function apiCreateSubject(subjectData, adminUser = 'Administrator') {
  try {
    const res = await fetch('/api/admin/subjects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-user': adminUser,
      },
      body: JSON.stringify(subjectData),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create subject in Subject Master.');
    }

    await fetchAdminSubjects();
    return json.data;
  } catch (err) {
    console.error('[Create Subject Error]', err);
    throw err;
  }
}

// Update existing subject in central database
export async function apiUpdateSubject(id, subjectData, adminUser = 'Administrator') {
  try {
    const res = await fetch(`/api/admin/subjects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-user': adminUser,
      },
      body: JSON.stringify(subjectData),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update subject in Subject Master.');
    }

    await fetchAdminSubjects();
    return json.data;
  } catch (err) {
    console.error('[Update Subject Error]', err);
    throw err;
  }
}

// Delete subject with dependency check
export async function apiDeleteSubject(id) {
  try {
    const res = await fetch(`/api/admin/subjects/${id}`, {
      method: 'DELETE',
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete subject.');
    }

    await fetchAdminSubjects();
    return true;
  } catch (err) {
    console.error('[Delete Subject Error]', err);
    throw err;
  }
}

// Fetch subjects assigned to a specific course
export async function fetchCourseSubjects(courseId) {
  try {
    const res = await fetch(`/api/admin/courses/${courseId}/subjects`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.warn(`[Course Subjects] Failed to fetch subjects for course ${courseId}:`, err);
    return [];
  }
}

// Assign subjects to a course
export async function apiAssignCourseSubjects(courseId, subjectIds) {
  try {
    const res = await fetch(`/api/admin/courses/${courseId}/subjects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectIds }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update course subjects.');
    }
    return json.data;
  } catch (err) {
    console.error('[Assign Course Subjects Error]', err);
    throw err;
  }
}
