// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: PREVIEW TOKEN SERVICE (PERSISTENT & HASHED)
// F13-01 Remediation: Persistent token storage using SHA-256 zero-knowledge hashing.
// Survives process restarts and works reliably across multi-worker PM2 / cluster instances.
// ==============================================================================

import { getContentDb } from './db';
import { generateSecurePreviewToken, hashPreviewToken } from './security';

export interface PreviewTokenRecord {
  id: number;
  blogId: number;
  tokenHash: string;
  createdBy: string | null;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export class PreviewTokenService {
  /**
   * Generates a cryptographically secure preview token (256-bit entropy).
   * Persists ONLY the SHA-256 hash in the database, never the plaintext token.
   *
   * @param blogId Target article ID
   * @param createdBy Author/Editor identity
   * @param expiresInHours Token validity window (default 2 hours)
   * @returns Raw token string returned ONCE to the authorized creator
   */
  public static async createPreviewToken(
    blogId: number,
    createdBy = 'Administrator',
    expiresInHours = 2
  ): Promise<{ token: string; expiresAt: string }> {
    if (!blogId || typeof blogId !== 'number' || blogId <= 0) {
      throw new Error('Valid positive blogId is required for preview token generation.');
    }

    const rawToken = generateSecurePreviewToken(32);
    const tokenHash = hashPreviewToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const db = await getContentDb();

    await db.query(
      `INSERT INTO content.blog_preview_tokens (
        blog_id, token_hash, created_by, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, NOW());`,
      [blogId, tokenHash, createdBy, expiresAt.toISOString()]
    );

    return {
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Validates a raw preview token against the persistent database.
   * Fails closed on any error, invalid hash, expiration, or revocation.
   *
   * @param rawToken Plaintext token provided in preview URL query
   * @returns Validation result with target blogId
   */
  public static async verifyPreviewToken(
    rawToken: string
  ): Promise<{ valid: boolean; blogId?: number; error?: string }> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
      return { valid: false, error: 'Preview token is missing or empty.' };
    }

    try {
      const tokenHash = hashPreviewToken(rawToken);
      const db = await getContentDb();

      const res = await db.query(
        `SELECT id, blog_id, expires_at, revoked_at
         FROM content.blog_preview_tokens
         WHERE token_hash = $1
         LIMIT 1;`,
        [tokenHash]
      );

      if (res.rows.length === 0) {
        return { valid: false, error: 'Preview token not found or invalid.' };
      }

      const row = res.rows[0];

      // Check Revocation
      if (row.revoked_at !== null && row.revoked_at !== undefined) {
        return { valid: false, error: 'Preview token has been revoked.' };
      }

      // Check Expiration
      const expiresAt = new Date(row.expires_at).getTime();
      const now = Date.now();
      if (now > expiresAt) {
        return { valid: false, error: 'Preview token has expired.' };
      }

      // Update last_used_at non-blocking
      db.query(
        `UPDATE content.blog_preview_tokens SET last_used_at = NOW() WHERE id = $1;`,
        [row.id]
      ).catch(() => {});

      return {
        valid: true,
        blogId: Number(row.blog_id),
      };
    } catch (err: any) {
      // Fail closed on database failure
      console.error('[PreviewTokenService] Verification failure (failing closed):', err.message);
      return { valid: false, error: 'Preview authorization error.' };
    }
  }

  /**
   * Revokes an individual preview token by raw token.
   * Immediately takes effect across all distributed workers.
   */
  public static async revokePreviewToken(rawToken: string): Promise<boolean> {
    if (!rawToken || typeof rawToken !== 'string') return false;

    try {
      const tokenHash = hashPreviewToken(rawToken);
      const db = await getContentDb();

      const res = await db.query(
        `UPDATE content.blog_preview_tokens
         SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL
         RETURNING id;`,
        [tokenHash]
      );

      return res.rows.length > 0;
    } catch (err: any) {
      console.error('[PreviewTokenService] Revocation error:', err.message);
      return false;
    }
  }

  /**
   * Revokes all active preview tokens associated with a blog article.
   * Automatically called when an article is deleted or unpublished.
   */
  public static async revokeAllTokensForBlog(blogId: number): Promise<number> {
    if (!blogId || typeof blogId !== 'number') return 0;

    try {
      const db = await getContentDb();

      const res = await db.query(
        `UPDATE content.blog_preview_tokens
         SET revoked_at = NOW()
         WHERE blog_id = $1 AND revoked_at IS NULL
         RETURNING id;`,
        [blogId]
      );

      return res.rowCount ?? res.rows.length;
    } catch (err: any) {
      console.error('[PreviewTokenService] Bulk revocation error:', err.message);
      return 0;
    }
  }

  /**
   * Checks whether a token has been explicitly revoked.
   */
  public static async isTokenRevoked(rawToken: string): Promise<boolean> {
    if (!rawToken || typeof rawToken !== 'string') return true;

    try {
      const tokenHash = hashPreviewToken(rawToken);
      const db = await getContentDb();

      const res = await db.query(
        `SELECT revoked_at FROM content.blog_preview_tokens WHERE token_hash = $1 LIMIT 1;`,
        [tokenHash]
      );

      if (res.rows.length === 0) return true;
      return res.rows[0].revoked_at !== null && res.rows[0].revoked_at !== undefined;
    } catch (err) {
      return true; // Fail closed
    }
  }
}
