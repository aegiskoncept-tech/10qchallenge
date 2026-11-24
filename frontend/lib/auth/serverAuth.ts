import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, validateSessionAndUser } from './session';
import { AuthDb, type UserEntity, type SessionEntity } from './database';

export { validateSessionAndUser };

export interface AuthContextResult {
  authenticated: boolean;
  user?: UserEntity;
  session?: SessionEntity;
  errorResponse?: NextResponse | Response;
}

export function extractAuthToken(req: NextRequest | any): string | null {
  // 1. Check HTTP-Only session cookie
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function validateOrigin(req: NextRequest | any): boolean {
  const method = (req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const target = origin || referer;

  // If no Origin or Referer header is sent, allow CSRF token check to decide
  if (!target) {
    return true;
  }

  try {
    const url = new URL(target);
    const targetHost = url.host.toLowerCase();
    const targetHostname = url.hostname.toLowerCase();

    // Trusted production, staging, and local development hosts
    const allowedHosts = new Set([
      '10qchallenge.com',
      'www.10qchallenge.com',
      'localhost:3000',
      '127.0.0.1:3000',
      'localhost',
      '127.0.0.1',
    ]);

    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
        allowedHosts.add(appUrl.host.toLowerCase());
        allowedHosts.add(appUrl.hostname.toLowerCase());
      } catch {}
    }

    if (process.env.APP_URL) {
      try {
        const appUrl = new URL(process.env.APP_URL);
        allowedHosts.add(appUrl.host.toLowerCase());
        allowedHosts.add(appUrl.hostname.toLowerCase());
      } catch {}
    }

    // Security: Never add unverified client-supplied Host or X-Forwarded-Host to allowedHosts.
    // The incoming Origin / Referer target must strictly match a pre-authorized trusted host.
    return allowedHosts.has(targetHost) || allowedHosts.has(targetHostname);
  } catch {
    return false;
  }
}

export function validateCsrfToken(req: NextRequest | any, expectedCsrfToken?: string): boolean {
  const method = (req.method || 'GET').toUpperCase();
  // Safe read-only HTTP methods do not require CSRF verification
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // If request uses Bearer token, it is not an automatic ambient cookie request
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }

  // Validate request origin against trusted domains
  if (!validateOrigin(req)) {
    return false;
  }

  // For cookie-based sessions, verify CSRF token from header (case-insensitive checks)
  const clientCsrfHeader =
    req.headers.get('x-csrf-token') ||
    req.headers.get('X-CSRF-Token') ||
    req.headers.get('x-xsrf-token') ||
    req.headers.get('X-XSRF-Token') ||
    req.headers.get('csrf-token') ||
    req.headers.get('CSRF-Token');

  const clientCsrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!clientCsrfHeader || typeof clientCsrfHeader !== 'string') {
    return false;
  }

  // 1. Verify against session CSRF token (database-bound) using constant-time comparison
  if (expectedCsrfToken && safeCompare(clientCsrfHeader, expectedCsrfToken)) {
    return true;
  }

  // 2. Verify against client CSRF cookie (double-submit cookie pattern) using constant-time comparison
  if (clientCsrfCookie && safeCompare(clientCsrfHeader, clientCsrfCookie)) {
    return true;
  }

  return false;
}

export async function requireAuth(req: NextRequest | any): Promise<AuthContextResult> {
  const token = extractAuthToken(req);
  if (!token) {
    return {
      authenticated: false,
      errorResponse: Response.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      ),
    };
  }

  const result = await validateSessionAndUser(token);
  if (!result.valid || !result.user || !result.session) {
    return {
      authenticated: false,
      errorResponse: Response.json(
        { success: false, error: result.reason || 'Unauthorized: Invalid or expired session.' },
        { status: 401 }
      ),
    };
  }

  // Validate CSRF for state-changing calls
  if (!validateCsrfToken(req, result.session.csrfToken)) {
    return {
      authenticated: false,
      errorResponse: Response.json(
        { success: false, error: 'Forbidden: CSRF token validation failed.' },
        { status: 403 }
      ),
    };
  }

  return {
    authenticated: true,
    user: result.user,
    session: result.session,
  };
}

export async function requireAdmin(
  req: NextRequest | any,
  moduleName?: string,
  actionName?: string
): Promise<AuthContextResult> {
  const authResult = await requireAuth(req);
  if (!authResult.authenticated || !authResult.user) {
    return authResult;
  }

  if (authResult.user.role !== 'ADMIN') {
    return {
      authenticated: false,
      errorResponse: Response.json(
        { success: false, error: 'Forbidden: Administrator privileges required.' },
        { status: 403 }
      ),
    };
  }

  // Optional audit logging for admin actions
  if (moduleName && actionName) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    AuthDb.logAdminActivity({
      userId: authResult.user.id,
      action: actionName,
      module: moduleName,
      ipAddress: ip,
      userAgent,
    });
  }

  return authResult;
}
