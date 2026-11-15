/**
 * Client Data Service for Chapter Topic Master
 * Communicates with server-side /api/admin/topics routes
 */

export async function fetchAdminTopics(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.chapterId) params.append('chapterId', filters.chapterId);
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined && filters.isActive !== 'ALL') {
      params.append('isActive', filters.isActive);
    }

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/admin/topics${qs}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch topics: HTTP ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.error('[fetchAdminTopics Error]', err);
    return [];
  }
}

export async function fetchTopicsByChapter(chapterId) {
  try {
    if (!chapterId) return [];
    const res = await fetch(`/api/topics?chapterId=${chapterId}`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.error('[fetchTopicsByChapter Error]', err);
    return [];
  }
}

export async function apiCreateTopic(payload) {
  const res = await fetch('/api/admin/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create topic.');
  }

  return data.data;
}

export async function apiUpdateTopic(id, payload) {
  const res = await fetch(`/api/admin/topics/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update topic.');
  }

  return data.data;
}

export async function apiDeleteTopic(id) {
  const res = await fetch(`/api/admin/topics/${id}`, {
    method: 'DELETE'
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete topic.');
  }

  return data.data;
}
