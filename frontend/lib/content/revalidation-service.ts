// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: REVALIDATION OUTBOX SERVICE
// ==============================================================================

import crypto from 'crypto';
import { getContentDb } from './db';
import { RevalidationEvent, RevalidationStatus } from './types';
import { generateHmacSignature } from './security';

export class RevalidationService {
  /**
   * Atomically claims pending or retryable outbox events for processing
   */
  public static async claimPendingEvents(
    workerId: string,
    batchSize = 10,
    leaseSeconds = 30
  ): Promise<RevalidationEvent[]> {
    const db = await getContentDb();
    const token = crypto.randomBytes(24).toString('hex');

    const claimSql = `
      WITH candidates AS (
        SELECT id
        FROM content.revalidation_events
        WHERE (
          status = 'PENDING'
          OR (status = 'RETRYABLE_FAILED' AND (claim_expires_at IS NULL OR claim_expires_at < clock_timestamp()))
          OR (status = 'CLAIMED' AND claim_expires_at < clock_timestamp())
        )
        AND retry_count < max_retries
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE content.revalidation_events r
      SET
        status = 'CLAIMED',
        claim_token = $2,
        claiming_worker_id = $3,
        claim_expires_at = clock_timestamp() + ($4 || ' seconds')::interval
      FROM candidates c
      WHERE r.id = c.id
      RETURNING r.*;
    `;

    const res = await db.query(claimSql, [batchSize, token, workerId, leaseSeconds]);

    return res.rows.map((row: any) => ({
      id: row.id,
      blogId: row.blog_id,
      eventType: row.event_type,
      slug: row.slug,
      targetPaths: Array.isArray(row.target_paths) ? row.target_paths : [],
      status: row.status as RevalidationStatus,
      claimToken: row.claim_token,
      claimingWorkerId: row.claiming_worker_id,
      claimExpiresAt: row.claim_expires_at ? new Date(row.claim_expires_at).toISOString() : null,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      lastError: row.last_error || null,
      createdAt: new Date(row.created_at).toISOString(),
      processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
    }));
  }

  /**
   * Marks outbox event as successfully delivered
   */
  public static async markEventDelivered(id: number, claimToken: string): Promise<void> {
    const db = await getContentDb();
    await db.query(
      `UPDATE content.revalidation_events
       SET status = 'DELIVERED',
           claim_token = NULL,
           claiming_worker_id = NULL,
           claim_expires_at = NULL,
           processed_at = NOW()
       WHERE id = $1 AND claim_token = $2;`,
      [id, claimToken]
    );
  }

  /**
   * Records a delivery failure with exponential backoff or dead-letter eviction
   */
  public static async markEventFailed(id: number, claimToken: string, error: string): Promise<void> {
    const db = await getContentDb();

    await db.query(
      `UPDATE content.revalidation_events
       SET
         retry_count = retry_count + 1,
         status = CASE
           WHEN retry_count + 1 >= max_retries THEN 'DEAD_LETTER'::varchar
           ELSE 'RETRYABLE_FAILED'::varchar
         END,
         claim_token = NULL,
         claiming_worker_id = NULL,
         claim_expires_at = CASE
           WHEN retry_count + 1 >= max_retries THEN NULL
           ELSE clock_timestamp() + ((POWER(2, retry_count) * 5) || ' seconds')::interval
         END,
         last_error = $1
       WHERE id = $2 AND claim_token = $3;`,
      [error, id, claimToken]
    );
  }

  /**
   * Processes a batch of outbox events
   * Can either hit the Next.js revalidation endpoint via HTTP or revalidate directly
   */
  public static async processOutbox(
    workerId = `reval-${crypto.randomUUID()}`,
    batchSize = 10,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    secret = process.env.INTERNAL_REVALIDATION_SECRET || 'dev-reval-secret-key-10q'
  ): Promise<{ processed: number; delivered: number; failed: number }> {
    const events = await this.claimPendingEvents(workerId, batchSize);
    let delivered = 0;
    let failed = 0;

    for (const event of events) {
      try {
        const payload = JSON.stringify({
          eventId: event.id,
          blogId: event.blogId,
          slug: event.slug,
          targetPaths: event.targetPaths,
        });

        const timestamp = Date.now().toString();
        const signature = generateHmacSignature(`${timestamp}:${payload}`, secret);

        const res = await fetch(`${baseUrl}/api/internal/cache/revalidate-outbox`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-timestamp': timestamp,
            'x-internal-signature': signature,
          },
          body: payload,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        await this.markEventDelivered(event.id, event.claimToken!);
        delivered++;
      } catch (err: any) {
        failed++;
        await this.markEventFailed(event.id, event.claimToken!, err.message);
      }
    }

    return { processed: events.length, delivered, failed };
  }
}
