import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, validateSessionAndUser } from './session';
import { AuthDb, type UserEntity, type SessionEntity } from './database';

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

export function validateCsrfToken(req: NextRequest | any, expectedCsrfToken?: string): boolean {
  const method = req.method.toUpperCase();
  // Safe read-only HTTP methods do not require CSRF verification
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // If request uses Bearer token, it is not an automatic ambient cookie request
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }

  // For cookie-based sessions, verify CSRF token
  const clientCsrfHeader = req.headers.get('x-csrf-token') || req.headers.get('X-CSRF-Token');
  const clientCsrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!clientCsrfHeader) {
    return false;
  }

  if (expectedCsrfToken && clientCsrfHeader === expectedCsrfToken) {
    return true;
  }

  if (clientCsrfCookie && clientCsrfHeader === clientCsrfCookie) {
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
