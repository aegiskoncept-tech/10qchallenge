import { AuthDb } from './database';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  try {
    const existing = AuthDb.getRateLimit(key);
    if (!existing) {
      return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
    }

    const remaining = Math.max(0, maxAttempts - existing.points);
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.expiresAt - Date.now()) / 1000));

    if (existing.points >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remaining,
      retryAfterSeconds: 0,
    };
  } catch (err) {
    console.error('[RateLimiter Error]', err);
    // Fail open in case of rate-limiter table glitch during development
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }
}

export function recordFailedAttempt(
  key: string,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  try {
    const record = AuthDb.incrementRateLimit(key, windowMs);
    const remaining = Math.max(0, DEFAULT_MAX_ATTEMPTS - record.points);
    const retryAfterSeconds = Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000));

    return {
      allowed: record.points < DEFAULT_MAX_ATTEMPTS,
      remaining,
      retryAfterSeconds,
    };
  } catch (err) {
    console.error('[RateLimiter Increment Error]', err);
    return { allowed: true, remaining: DEFAULT_MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }
}

export function clearRateLimit(key: string): void {
  try {
    AuthDb.resetRateLimit(key);
  } catch (err) {
    console.error('[RateLimiter Reset Error]', err);
  }
}
