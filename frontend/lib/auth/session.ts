import crypto from 'crypto';
import type { NextResponse } from 'next/server';
import { AuthDb, type UserEntity, type SessionEntity } from './database';
import { signJwt, verifyJwt, type JwtPayload } from './jwt';

export const AUTH_COOKIE_NAME = '10q_auth_token';
export const CSRF_COOKIE_NAME = '10q_csrf_token';
export const SESSION_DURATION_SECONDS = 7 * 24 * 3600; // 7 days

export interface AuthSessionResult {
  token: string;
  csrfToken: string;
  sessionId: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: 'ADMIN' | 'STUDENT' | 'FACULTY';
    targetExam?: string | null;
  };
}

export async function createAuthSession(
  user: UserEntity,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<AuthSessionResult> {
  const sessionId = crypto.randomUUID();
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

  // Persist session to relational database
  AuthDb.createSession({
    sessionId,
    userId: user.id,
    csrfToken,
    expiresAt,
    ipAddress,
    userAgent,
  });

  // Sign JWT
  const jwtPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
    fullName: user.fullName,
  };

  const token = await signJwt(jwtPayload, SESSION_DURATION_SECONDS);

  return {
    token,
    csrfToken,
    sessionId,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      targetExam: user.targetExam,
    },
  };
}

export function setAuthCookies(
  response: NextResponse,
  token: string,
  csrfToken: string
): void {
  const isProd = process.env.NODE_ENV === 'production';

  // Secure HTTP-Only session token
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });

  // Client-accessible CSRF cookie for double-submit header verification
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function validateSessionAndUser(token: string): Promise<{
  valid: boolean;
  payload?: JwtPayload;
  user?: UserEntity;
  session?: SessionEntity;
  reason?: string;
}> {
  const payload = await verifyJwt(token);
  if (!payload) {
    return { valid: false, reason: 'Invalid or expired token.' };
  }

  // Validate session in database
  const session = AuthDb.findSession(payload.sessionId);
  if (!session) {
    return { valid: false, reason: 'Session not found or terminated.' };
  }

  if (session.isRevoked) {
    return { valid: false, reason: 'Session has been revoked.' };
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: 'Session has expired.' };
  }

  // Validate user in database
  const user = AuthDb.findUserById(payload.userId);
  if (!user) {
    return { valid: false, reason: 'User not found.' };
  }

  if (!user.isActive) {
    return { valid: false, reason: 'User account is deactivated.' };
  }

  return {
    valid: true,
    payload,
    user,
    session,
  };
}
