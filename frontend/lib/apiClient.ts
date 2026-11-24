/**
 * 10Q Challenge - Centralized Hardened API Client
 * Enforces automatic CSRF token injection, credentials: 'same-origin',
 * and seamless retry on token expiration for all application mutations.
 */

const CSRF_COOKIE_NAME = '10q_csrf_token';
let cachedCsrfToken: string | null = null;
let csrfFetchPromise: Promise<string | null> | null = null;

/**
 * Reads the CSRF token directly from document.cookie
 */
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )10q_csrf_token=([^;]*)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
}

/**
 * Fetches a fresh CSRF token from /api/auth/csrf (deduplicating in-flight requests)
 */
export async function refreshCsrfToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = (async () => {
    try {
      const res = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.csrfToken) {
          cachedCsrfToken = data.csrfToken;
          return data.csrfToken;
        }
      }
    } catch (err) {
      console.warn('[apiClient] Failed to refresh CSRF token:', err);
    } finally {
      csrfFetchPromise = null;
    }

    return getCsrfTokenFromCookie() || cachedCsrfToken;
  })();

  return csrfFetchPromise;
}

/**
 * Ensures a valid CSRF token is available, checking cookie first then fetching if absent.
 */
export async function getCsrfToken(): Promise<string> {
  const fromCookie = getCsrfTokenFromCookie();
  if (fromCookie) {
    cachedCsrfToken = fromCookie;
    return fromCookie;
  }

  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  const freshToken = await refreshCsrfToken();
  return freshToken || '';
}

/**
 * Prime the CSRF token early (e.g. on layout or app mount)
 */
export function primeCsrfToken(): void {
  if (typeof window === 'undefined') return;
  getCsrfToken().catch(() => {});
}

export interface ApiClientOptions extends RequestInit {
  skipCsrf?: boolean;
  skipRetry?: boolean;
}

/**
 * Centralized fetch wrapper that guarantees CSRF tokens, credentials, and error handling.
 * Returns standard Response object for 100% compatibility with existing fetch calls.
 */
export async function apiClient(url: string, options: ApiClientOptions = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // Clone headers object
  const headers = new Headers(options.headers || {});

  // For mutations, inject CSRF token if not explicitly disabled
  if (isMutation && !options.skipCsrf) {
    let token = await getCsrfToken();
    if (!token) {
      token = (await refreshCsrfToken()) || '';
    }
    if (token && !headers.has('x-csrf-token')) {
      headers.set('x-csrf-token', token);
    }
  }

  // Set default JSON Content-Type if body is string and header is unset
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure same-origin credentials for cookies
  const requestInit: RequestInit = {
    ...options,
    method,
    headers,
    credentials: options.credentials || 'same-origin',
  };

  let response = await fetch(url, requestInit);

  // If 403 Forbidden with exact CSRF failure, attempt a single automatic refresh and retry.
  // Ordinary 401 or 403 authorization failures (e.g., non-admin, invalid permissions) are never retried.
  if (response.status === 403 && isMutation && !options.skipRetry) {
    try {
      const cloned = response.clone();
      const errJson = await cloned.json().catch(() => null);
      const isCsrfError =
        errJson?.error &&
        typeof errJson.error === 'string' &&
        (errJson.error === 'Forbidden: CSRF token validation failed.' ||
          errJson.error.toLowerCase().includes('csrf token validation failed'));

      if (isCsrfError) {
        console.warn(`[apiClient] CSRF token rejected on ${method} ${url}. Refreshing token and retrying...`);
        const freshToken = await refreshCsrfToken();
        if (freshToken) {
          headers.set('x-csrf-token', freshToken);
          // Execute single retry with skipRetry flag
          response = await fetch(url, {
            ...requestInit,
            headers,
          });
        }
      }
    } catch {
      // Return initial response if retry handling fails
    }
  }

  return response;
}

// Convenient shortcut methods
apiClient.get = (url: string, options?: ApiClientOptions) =>
  apiClient(url, { ...options, method: 'GET' });

apiClient.post = (url: string, body?: any, options?: ApiClientOptions) =>
  apiClient(url, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : typeof body === 'string' ? body : JSON.stringify(body),
  });

apiClient.put = (url: string, body?: any, options?: ApiClientOptions) =>
  apiClient(url, {
    ...options,
    method: 'PUT',
    body: body instanceof FormData ? body : typeof body === 'string' ? body : JSON.stringify(body),
  });

apiClient.patch = (url: string, body?: any, options?: ApiClientOptions) =>
  apiClient(url, {
    ...options,
    method: 'PATCH',
    body: body instanceof FormData ? body : typeof body === 'string' ? body : JSON.stringify(body),
  });

apiClient.delete = (url: string, options?: ApiClientOptions) =>
  apiClient(url, { ...options, method: 'DELETE' });

export default apiClient;
