/**
 * Client Data Service for Chapter Master
 * Communicates with server-side /api/admin/chapters routes
 */

export async function fetchAdminChapters(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined && filters.isActive !== 'ALL') {
      params.append('isActive', filters.isActive);
    }

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/admin/chapters${qs}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch chapters: HTTP ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.error('[fetchAdminChapters Error]', err);
    return [];
  }
}

export async function fetchChaptersByCourseAndSubject(courseId, subjectId) {
  try {
    if (!courseId || !subjectId) return [];
    const res = await fetch(`/api/chapters?courseId=${courseId}&subjectId=${subjectId}`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.error('[fetchChaptersByCourseAndSubject Error]', err);
    return [];
  }
}

export async function apiCreateChapter(payload) {
  const res = await fetch('/api/admin/chapters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create chapter.');
  }

  return data.data;
}

export async function apiUpdateChapter(id, payload) {
  const res = await fetch(`/api/admin/chapters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update chapter.');
  }

  return data.data;
}

export async function apiDeleteChapter(id) {
  const res = await fetch(`/api/admin/chapters/${id}`, {
    method: 'DELETE'
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete chapter.');
  }

  return data.data;
}
