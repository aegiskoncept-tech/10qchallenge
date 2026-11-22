// 10Q Challenge Central API Service Module
// Connects React Frontend with Node.js / C# Backend APIs

const API_BASE_URL = '/api';

function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )10q_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function fetchAPI(endpoint, method = 'POST', body = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      headers['x-csrf-token'] = csrfToken;
    }

    const options = {
      method,
      headers,
      credentials: 'same-origin',
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error || `API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`[API Call Warning] Failed to reach ${endpoint}:`, error);
    throw error;
  }
}

// 1. MASTER COURSES API
export const apiGetCourses = async () => {
  return fetchAPI('/mastercourse/getsitecourse', 'POST');
};

export const apiGetCourseDetail = async (id) => {
  return fetchAPI('/mastercourse/getsitecoursedetail', 'POST', { id });
};

// 2. MASTER BLOGS API
export const apiGetBlogs = async () => {
  try {
    const res = await fetch('/api/blogs');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) return { data: json.data };
    }
  } catch (_) {}
  return fetchAPI('/masterblog/masterblogselect', 'POST');
};

export const apiGetBlogBySlugOrId = async ({ id, slug }) => {
  try {
    const target = slug || id;
    const res = await fetch(`/api/blogs/${target}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return { data: [json.data] };
    }
  } catch (_) {}
  return fetchAPI('/masterblog/masterblogselectbyid', 'POST', { masterblogid: id, slug });
};

// 3. MASTER EXAMS API
export const apiGetExams = async () => {
  return fetchAPI('/masterexam/getexam', 'POST');
};

// 4. USER AUTH & ACCOUNTS API
export const apiLoginUser = async (email, password) => {
  return fetchAPI('/auth/login', 'POST', { email, password });
};

export const apiRegisterUser = async (userData) => {
  return fetchAPI('/auth/register', 'POST', userData);
};

// 5. MASTER COUPONS API
export const apiGetCoupons = async () => {
  return fetchAPI('/mastercoupon/getcoupons', 'POST');
};

// 6. STUDENT DOUBTS API
export const apiGetStudentDoubts = async () => {
  return fetchAPI('/studentdoubt/getdoubts', 'POST');
};

// 7. INVOICES API
export const apiGetInvoices = async () => {
  return fetchAPI('/invoice/getinvoices', 'POST');
};
