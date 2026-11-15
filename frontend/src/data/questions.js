/**
 * Client Data Service for Question Management
 * Communicates with server-side /api/admin/questions routes
 */

export async function fetchAdminQuestions(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.chapterId) params.append('chapterId', filters.chapterId);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined && filters.isActive !== 'ALL') {
      params.append('isActive', filters.isActive);
    }

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/admin/questions${qs}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch questions: HTTP ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.error('[fetchAdminQuestions Error]', err);
    return [];
  }
}

export async function apiCreateQuestion(payload) {
  const res = await fetch('/api/admin/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create question.');
  }

  return data.data;
}

export async function apiUpdateQuestion(id, payload) {
  const res = await fetch(`/api/admin/questions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update question.');
  }

  return data.data;
}

export async function apiDeleteQuestion(id) {
  const res = await fetch(`/api/admin/questions/${id}`, {
    method: 'DELETE'
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete question.');
  }

  return data.data;
}
