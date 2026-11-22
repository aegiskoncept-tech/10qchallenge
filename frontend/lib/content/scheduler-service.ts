// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: SCHEDULER SERVICE (TWO-STAGE FENCED PUBLISHER)
// ==============================================================================

import crypto from 'crypto';
import { getContentDb, ContentDbClient } from './db';
import {
  BlogRecord,
  PublicationClaim,
  PublicationAuditSnapshot,
  SchedulerResult,
} from './types';
import { calculateContentSha256 } from './security';

export class SchedulerService {
  /**
   * Stage A: Atomic Claim
   * Finds scheduled articles that are due, or articles stuck in 'Publishing' with expired claims.
   * Atomically claims them by setting a unique claim_token, worker_id, and lease expiry.
   */
  public static async claimDueArticles(
    workerId: string,
    batchSize = 10,
    leaseSeconds = 60
  ): Promise<{ claims: PublicationClaim[]; expiredRecovered: number; failedReaped: number }> {
    const db = await getContentDb();
    const token = crypto.randomBytes(24).toString('hex');

    // 1. Poison Reaper: Evict articles that failed repeatedly (retry count >= 5) to 'Failed'
    const reapRes = await db.query(
      `UPDATE content.blogs
       SET status = 'Failed',
           claim_token = NULL,
           claiming_worker_id = NULL,
           claim_expires_at = NULL,
           updated_at = NOW()
       WHERE status = 'Publishing'
         AND claim_expires_at < clock_timestamp()
         AND publish_retry_count >= 5
       RETURNING id;`
    );
    const failedReaped = reapRes.rowCount;

    // 2. Count expired leases being recovered
    const expiredCountRes = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM content.blogs
       WHERE status = 'Publishing'
         AND claim_expires_at < clock_timestamp()
         AND publish_retry_count < 5;`
    );
    const expiredRecovered = expiredCountRes.rows[0]?.count || 0;

    // 3. Stage A Atomic Claim CTE
    // Leases due articles: scheduled articles due, or expired claims
    const claimSql = `
      WITH candidates AS (
        SELECT id
        FROM content.blogs
        WHERE (
          (status = 'Scheduled' AND scheduled_publish_at <= clock_timestamp())
          OR
          (status = 'Publishing' AND claim_expires_at < clock_timestamp() AND publish_retry_count < 5)
        )
        ORDER BY scheduled_publish_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE content.blogs b
      SET
        status = 'Publishing',
        claim_token = $2,
        claiming_worker_id = $3,
        claim_expires_at = clock_timestamp() + ($4 || ' seconds')::interval,
        publish_retry_count = b.publish_retry_count + 1,
        updated_at = NOW()
      FROM candidates c
      WHERE b.id = c.id
      RETURNING b.id, b.claim_token, b.claiming_worker_id, b.claim_expires_at;
    `;

    const res = await db.query(claimSql, [batchSize, token, workerId, leaseSeconds]);

    const claims: PublicationClaim[] = res.rows.map((r: any) => ({
      blogId: r.id,
      claimToken: r.claim_token,
      claimingWorkerId: r.claiming_worker_id,
      claimExpiresAt: new Date(r.claim_expires_at).toISOString(),
    }));

    return { claims, expiredRecovered, failedReaped };
  }

  /**
   * Stage B: Lock-Then-Validate & Publish Transaction
   * Order:
   * 1. BEGIN
   * 2. Lock article row with SELECT ... FOR UPDATE
   * 3. Read database clock in a separate statement after lock acquired
   * 4. Validate publication state, claim token, worker ID, and lease expiry
   * 5. Construct complete 17-field immutable snapshot
   * 6. Update article to 'Published'
   * 7. Insert audit record into publication_audit_logs
   * 8. Insert outbox record into revalidation_events
   * 9. COMMIT
   */
  public static async publishClaimedArticle(
    blogId: number,
    claimToken: string,
    workerId: string
  ): Promise<{ success: boolean; blogId: number; error?: string }> {
    const db = await getContentDb();

    return await db.transaction(async (tx) => {
      // Step 2: Lock the article row
      const lockRes = await tx.query(
        `SELECT * FROM content.blogs WHERE id = $1 FOR UPDATE;`,
        [blogId]
      );

      if (lockRes.rows.length === 0) {
        throw new Error(`Article ${blogId} not found during publication lock.`);
      }

      const article = lockRes.rows[0];

      // Step 3: Fetch post-lock live database clock
      const clockRes = await tx.query(`SELECT clock_timestamp() AS post_lock_clock;`);
      const postLockClock = new Date(clockRes.rows[0].post_lock_clock);

      // Step 4: Strict validation checks
      if (article.status !== 'Publishing') {
        throw new Error(
          `Publication rejected: article ${blogId} status is "${article.status}", expected "Publishing".`
        );
      }

      if (article.claim_token !== claimToken) {
        throw new Error(
          `Publication rejected: claim token mismatch for article ${blogId}. Worker token is stale.`
        );
      }

      if (article.claiming_worker_id !== workerId) {
        throw new Error(
          `Publication rejected: claiming worker mismatch for article ${blogId}. Owned by "${article.claiming_worker_id}".`
        );
      }

      const claimExpiresAt = new Date(article.claim_expires_at);
      if (postLockClock > claimExpiresAt) {
        throw new Error(
          `Publication rejected: lease expired for article ${blogId}. Expiry: ${claimExpiresAt.toISOString()}, DB clock: ${postLockClock.toISOString()}.`
        );
      }

      if (article.scheduled_publish_at && new Date(article.scheduled_publish_at) > postLockClock) {
        throw new Error(
          `Publication rejected: scheduled timestamp ${article.scheduled_publish_at} is in the future relative to DB clock.`
        );
      }

      // Step 5: Construct complete 17-field canonical snapshot payload
      const contentSha = calculateContentSha256(article.content);
      const seoObj = typeof article.seo === 'string' ? JSON.parse(article.seo) : article.seo || {};
      const words = (article.content || '').split(/\s+/).filter(Boolean).length;
      const readMinutes = Math.max(1, Math.ceil(words / 200));

      const snapshot: PublicationAuditSnapshot = {
        id: article.id,
        slug: article.slug,
        title: article.title,
        status: 'Published',
        scheduledPublishAt: article.scheduled_publish_at ? new Date(article.scheduled_publish_at).toISOString() : null,
        publishedAt: postLockClock.toISOString(),
        authorId: article.author_id || null,
        authorName: article.author,
        categoryId: null,
        categorySlug: article.category.toLowerCase().replace(/\s+/g, '-'),
        canonicalUrl: seoObj.canonicalUrl || `https://10qchallenge.in/blog/${article.slug}`,
        tagsCount: Array.isArray(article.tags) ? article.tags.length : 0,
        wordCount: words,
        readTimeMinutes: readMinutes,
        seoTitle: seoObj.seoTitle || article.title,
        seoDescription: seoObj.metaDescription || article.excerpt,
        contentSha256: contentSha,
        fullContent: article.content,
        tags: Array.isArray(article.tags) ? article.tags : [],
        coverImage: article.cover_image || undefined,
        snapshotCreatedAt: postLockClock.toISOString(),
      };

      // Step 6: Update article to 'Published' with defense-in-depth predicates
      const updateRes = await tx.query(
        `UPDATE content.blogs
         SET status = 'Published',
             published_at = $1,
             claim_token = NULL,
             claiming_worker_id = NULL,
             claim_expires_at = NULL,
             updated_at = $1
         WHERE id = $2
           AND status = 'Publishing'
           AND claim_token = $3
           AND claiming_worker_id = $4
         RETURNING id;`,
        [postLockClock.toISOString(), blogId, claimToken, workerId]
      );

      if (updateRes.rows.length === 0) {
        throw new Error(`Defense-in-depth update failed: article ${blogId} was modified concurrently.`);
      }

      // Step 7: Insert publication audit log with immutable snapshot
      const auditRes = await tx.query(
        `INSERT INTO content.publication_audit_logs (
          blog_id, claim_token, worker_id, event_type, scheduled_publish_at,
          actual_published_at, article_snapshot, content_sha256
        ) VALUES ($1, $2, $3, 'PUBLISHED', $4, $5, $6, $7)
        ON CONFLICT (blog_id, claim_token) DO NOTHING
        RETURNING id;`,
        [
          blogId,
          claimToken,
          workerId,
          article.scheduled_publish_at,
          postLockClock.toISOString(),
          JSON.stringify(snapshot),
          contentSha,
        ]
      );

      // Strict Atomicity Enforcement: Audit insertion must affect exactly one row
      if (!auditRes.rows || auditRes.rows.length !== 1) {
        throw new Error(
          `Publication atomicity violation: audit record for article ${blogId} was not inserted (affected rows: ${auditRes.rowCount ?? 0}). Rolling back transaction.`
        );
      }

      // Step 8: Insert revalidation outbox event
      const targetPaths = ['/blog', `/blog/${article.slug}`, `/blog-detail/${article.slug}`];
      await tx.query(
        `INSERT INTO content.revalidation_events (
          blog_id, event_type, slug, target_paths, status
        ) VALUES ($1, 'REVALIDATE_BLOG', $2, $3, 'PENDING');`,
        [blogId, article.slug, targetPaths]
      );

      return { success: true, blogId };
    });
  }

  /**
   * Complete Publication Cycle for a worker
   * Stage A claims -> Stage B publishes each claimed article
   */
  public static async executeSchedulerCycle(
    workerId = `worker-${crypto.randomUUID()}`,
    batchSize = 10
  ): Promise<SchedulerResult> {
    const result: SchedulerResult = {
      workerId,
      timestamp: new Date().toISOString(),
      claimedCount: 0,
      publishedCount: 0,
      failedCount: 0,
      expiredLeasesRecovered: 0,
      revalidationProcessed: 0,
      errors: [],
    };

    try {
      // Stage A
      const claimResult = await this.claimDueArticles(workerId, batchSize);
      result.claimedCount = claimResult.claims.length;
      result.expiredLeasesRecovered = claimResult.expiredRecovered;

      // Stage B for each claim
      for (const claim of claimResult.claims) {
        try {
          await this.publishClaimedArticle(claim.blogId, claim.claimToken, workerId);
          result.publishedCount++;
        } catch (err: any) {
          result.failedCount++;
          result.errors.push(`Blog ${claim.blogId}: ${err.message}`);
        }
      }
    } catch (err: any) {
      result.errors.push(`Scheduler cycle failure: ${err.message}`);
    }

    return result;
  }
}
