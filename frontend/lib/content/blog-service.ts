// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: CORE BLOG SERVICE (POSTGRESQL / PGLITE)
// ==============================================================================

import { getContentDb, ContentDbClient } from './db';
import {
  BlogRecord,
  BlogStatus,
  BlogSEO,
  BlogRevision,
  BlogDashboardMetrics,
  BlogRedirect,
} from './types';
import {
  sanitizeHtml,
  validateSlug,
  generateSlug,
  validateBlogInput,
  calculateContentSha256,
} from './security';

function rowToBlogRecord(row: any): BlogRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    author: row.author,
    authorId: row.author_id || undefined,
    category: row.category,
    readTime: row.read_time,
    coverImage: row.cover_image || undefined,
    coverImageAlt: row.cover_image_alt || undefined,
    coverImageCaption: row.cover_image_caption || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status as BlogStatus,
    scheduledPublishAt: row.scheduled_publish_at ? new Date(row.scheduled_publish_at).toISOString() : undefined,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    viewsCount: row.views_count || 0,
    seo: typeof row.seo === 'string' ? JSON.parse(row.seo) : row.seo || {},
    claimToken: row.claim_token || null,
    claimingWorkerId: row.claiming_worker_id || null,
    claimExpiresAt: row.claim_expires_at ? new Date(row.claim_expires_at).toISOString() : null,
    publishRetryCount: row.publish_retry_count || 0,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    updatedBy: row.updated_by || undefined,
  };
}

export class BlogService {
  /**
   * Creates a new blog article with sanitized content and initial revision
   */
  public static async createBlog(
    input: Partial<BlogRecord>,
    adminUser = 'System'
  ): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
    const validation = validateBlogInput(input);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    const slug = input.slug ? input.slug.trim() : generateSlug(input.title!);
    if (!validateSlug(slug)) {
      return { success: false, error: 'Generated or provided slug is invalid.' };
    }

    const db = await getContentDb();

    // Check slug uniqueness among active (non-archived) articles
    const existing = await db.query(
      `SELECT id FROM content.blogs WHERE slug = $1 AND status != 'Archived' LIMIT 1;`,
      [slug]
    );
    if (existing.rows.length > 0) {
      return { success: false, error: `An active article with slug "${slug}" already exists.` };
    }

    const sanitizedContent = sanitizeHtml(input.content!);
    const sanitizedExcerpt = sanitizeHtml(input.excerpt!);
    const status = input.status || 'Draft';
    const readTime = input.readTime || `${Math.max(1, Math.ceil(sanitizedContent.split(/\s+/).length / 200))} min read`;
    const seo = input.seo || {};

    const publishedAt = status === 'Published' ? new Date().toISOString() : null;

    return await db.transaction(async (tx) => {
      const res = await tx.query(
        `INSERT INTO content.blogs (
          title, slug, excerpt, content, author, author_id, category, read_time,
          cover_image, cover_image_alt, cover_image_caption, tags, status,
          scheduled_publish_at, published_at, seo, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17
        ) RETURNING *;`,
        [
          input.title!.trim(),
          slug,
          sanitizedExcerpt,
          sanitizedContent,
          input.author!.trim(),
          input.authorId || null,
          input.category!.trim(),
          readTime,
          input.coverImage || null,
          input.coverImageAlt || null,
          input.coverImageCaption || null,
          input.tags || [],
          status,
          input.scheduledPublishAt || null,
          publishedAt,
          JSON.stringify(seo),
          adminUser,
        ]
      );

      const createdBlog = rowToBlogRecord(res.rows[0]);

      // Record initial revision
      const revId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await tx.query(
        `INSERT INTO content.blog_revisions (
          blog_id, revision_id, author, title, content, status, summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [createdBlog.id, revId, adminUser, createdBlog.title, createdBlog.content, createdBlog.status, 'Initial creation']
      );

      return { success: true, blog: createdBlog };
    });
  }

  /**
   * Updates an existing blog article
   */
  public static async updateBlog(
    id: number,
    input: Partial<BlogRecord>,
    adminUser = 'System'
  ): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
    const db = await getContentDb();

    const existingRes = await db.query(`SELECT * FROM content.blogs WHERE id = $1;`, [id]);
    if (existingRes.rows.length === 0) {
      return { success: false, error: 'Article not found.' };
    }

    const current = rowToBlogRecord(existingRes.rows[0]);

    let newSlug = current.slug;
    if (input.slug && input.slug !== current.slug) {
      if (!validateSlug(input.slug)) {
        return { success: false, error: 'Provided slug is invalid.' };
      }
      // Check collision
      const collision = await db.query(
        `SELECT id FROM content.blogs WHERE slug = $1 AND id != $2 AND status != 'Archived' LIMIT 1;`,
        [input.slug, id]
      );
      if (collision.rows.length > 0) {
        return { success: false, error: `Slug "${input.slug}" is already in use by another article.` };
      }
      newSlug = input.slug;
    }

    const title = input.title !== undefined ? input.title.trim() : current.title;
    const content = input.content !== undefined ? sanitizeHtml(input.content) : current.content;
    const excerpt = input.excerpt !== undefined ? sanitizeHtml(input.excerpt) : current.excerpt;
    const author = input.author !== undefined ? input.author.trim() : current.author;
    const category = input.category !== undefined ? input.category.trim() : current.category;
    const status = input.status !== undefined ? input.status : current.status;
    const tags = input.tags !== undefined ? input.tags : current.tags;
    const coverImage = input.coverImage !== undefined ? input.coverImage : current.coverImage;
    const coverImageAlt = input.coverImageAlt !== undefined ? input.coverImageAlt : current.coverImageAlt;
    const coverImageCaption = input.coverImageCaption !== undefined ? input.coverImageCaption : current.coverImageCaption;
    const seo = input.seo !== undefined ? input.seo : current.seo;
    const scheduledPublishAt = input.scheduledPublishAt !== undefined ? input.scheduledPublishAt : current.scheduledPublishAt;
    const readTime = input.readTime || `${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))} min read`;

    let publishedAt = current.publishedAt;
    if (status === 'Published' && !publishedAt) {
      publishedAt = new Date().toISOString();
    }

    return await db.transaction(async (tx) => {
      // If slug changed, create an automatic 301 redirect from old slug to new slug
      if (newSlug !== current.slug) {
        await tx.query(
          `INSERT INTO content.redirects (from_slug, to_slug, status_code)
           VALUES ($1, $2, 301)
           ON CONFLICT (from_slug) DO UPDATE SET to_slug = EXCLUDED.to_slug;`,
          [current.slug, newSlug]
        );
      }

      const res = await tx.query(
        `UPDATE content.blogs SET
          title = $1, slug = $2, excerpt = $3, content = $4, author = $5,
          category = $6, read_time = $7, cover_image = $8, cover_image_alt = $9,
          cover_image_caption = $10, tags = $11, status = $12,
          scheduled_publish_at = $13, published_at = $14, seo = $15,
          updated_at = NOW(), updated_by = $16
        WHERE id = $17 RETURNING *;`,
        [
          title,
          newSlug,
          excerpt,
          content,
          author,
          category,
          readTime,
          coverImage || null,
          coverImageAlt || null,
          coverImageCaption || null,
          tags,
          status,
          scheduledPublishAt || null,
          publishedAt || null,
          JSON.stringify(seo),
          adminUser,
          id,
        ]
      );

      const updatedBlog = rowToBlogRecord(res.rows[0]);

      // Record revision
      const revId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await tx.query(
        `INSERT INTO content.blog_revisions (
          blog_id, revision_id, author, title, content, status, summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [id, revId, adminUser, title, content, status, input.title ? 'Updated content & metadata' : 'Edited']
      );

      return { success: true, blog: updatedBlog };
    });
  }

  /**
   * Soft archives an article (preserves data and history, releases active slug uniqueness)
   */
  public static async softArchiveBlog(id: number, adminUser = 'System'): Promise<{ success: boolean; error?: string }> {
    const db = await getContentDb();
    const res = await db.query(
      `UPDATE content.blogs SET status = 'Archived', updated_at = NOW(), updated_by = $1 WHERE id = $2 RETURNING id;`,
      [adminUser, id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Article not found.' };
    }

    return { success: true };
  }

  /**
   * Restores an archived article
   */
  public static async restoreBlog(
    id: number,
    adminUser = 'System'
  ): Promise<{ success: boolean; blog?: BlogRecord; error?: string }> {
    const db = await getContentDb();
    const existingRes = await db.query(`SELECT * FROM content.blogs WHERE id = $1;`, [id]);
    if (existingRes.rows.length === 0) {
      return { success: false, error: 'Article not found.' };
    }

    const current = rowToBlogRecord(existingRes.rows[0]);
    if (current.status !== 'Archived') {
      return { success: false, error: 'Article is not archived.' };
    }

    // Verify slug conflict before restoring
    const conflict = await db.query(
      `SELECT id FROM content.blogs WHERE slug = $1 AND id != $2 AND status != 'Archived' LIMIT 1;`,
      [current.slug, id]
    );
    if (conflict.rows.length > 0) {
      return {
        success: false,
        error: `Cannot restore: an active article already exists with slug "${current.slug}". Change slug before restoring.`,
      };
    }

    const res = await db.query(
      `UPDATE content.blogs SET status = 'Draft', updated_at = NOW(), updated_by = $1 WHERE id = $2 RETURNING *;`,
      [adminUser, id]
    );

    return { success: true, blog: rowToBlogRecord(res.rows[0]) };
  }

  /**
   * Fetch article by ID
   */
  public static async getBlogById(id: number): Promise<BlogRecord | null> {
    const db = await getContentDb();
    const res = await db.query(`SELECT * FROM content.blogs WHERE id = $1;`, [id]);
    if (res.rows.length === 0) return null;
    return rowToBlogRecord(res.rows[0]);
  }

  /**
   * Fetch article by slug (checks active status first, or redirected slug)
   */
  public static async getBlogBySlug(slug: string): Promise<BlogRecord | null> {
    const db = await getContentDb();
    const res = await db.query(`SELECT * FROM content.blogs WHERE slug = $1 LIMIT 1;`, [slug]);
    if (res.rows.length === 0) return null;
    return rowToBlogRecord(res.rows[0]);
  }

  /**
   * Increments view count for an article
   */
  public static async incrementViews(id: number): Promise<void> {
    const db = await getContentDb();
    await db.query(`UPDATE content.blogs SET views_count = views_count + 1 WHERE id = $1;`, [id]);
  }

  /**
   * Lists articles with comprehensive filtering for admin
   */
  public static async listBlogs(options?: {
    search?: string;
    category?: string;
    tag?: string;
    status?: BlogStatus;
    sortBy?: 'date' | 'views' | 'title';
    page?: number;
    limit?: number;
  }): Promise<{ blogs: BlogRecord[]; total: number; page: number; limit: number }> {
    const db = await getContentDb();
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(100, options?.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (options?.status) {
      conditions.push(`status = $${pIdx++}`);
      params.push(options.status);
    }

    if (options?.category) {
      conditions.push(`LOWER(category) = LOWER($${pIdx++})`);
      params.push(options.category);
    }

    if (options?.tag) {
      conditions.push(`$${pIdx++} = ANY(tags)`);
      params.push(options.tag);
    }

    if (options?.search) {
      conditions.push(`(title ILIKE $${pIdx} OR excerpt ILIKE $${pIdx} OR content ILIKE $${pIdx})`);
      params.push(`%${options.search}%`);
      pIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'created_at DESC';
    if (options?.sortBy === 'views') orderBy = 'views_count DESC';
    else if (options?.sortBy === 'title') orderBy = 'title ASC';
    else if (options?.sortBy === 'date') orderBy = 'created_at DESC';

    const countRes = await db.query(`SELECT COUNT(*)::int AS count FROM content.blogs ${whereClause};`, params);
    const total = countRes.rows[0]?.count || 0;

    const listRes = await db.query(
      `SELECT * FROM content.blogs ${whereClause} ORDER BY ${orderBy} LIMIT $${pIdx++} OFFSET $${pIdx++};`,
      [...params, limit, offset]
    );

    return {
      blogs: listRes.rows.map(rowToBlogRecord),
      total,
      page,
      limit,
    };
  }

  /**
   * Lists published articles for public reader view
   */
  public static async getPublishedBlogs(options?: {
    search?: string;
    category?: string;
    tag?: string;
    page?: number;
    limit?: number;
  }): Promise<{ blogs: BlogRecord[]; total: number; page: number; limit: number }> {
    return this.listBlogs({
      ...options,
      status: 'Published',
      sortBy: 'date',
    });
  }

  /**
   * Fetches revisions for a blog
   */
  public static async getBlogRevisions(blogId: number): Promise<BlogRevision[]> {
    const db = await getContentDb();
    const res = await db.query(
      `SELECT * FROM content.blog_revisions WHERE blog_id = $1 ORDER BY created_at DESC;`,
      [blogId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      blogId: r.blog_id,
      revisionId: r.revision_id,
      timestamp: new Date(r.created_at).toISOString(),
      author: r.author,
      title: r.title,
      content: r.content,
      status: r.status as BlogStatus,
      summary: r.summary || undefined,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * Computes dashboard metrics
   */
  public static async getBlogDashboardMetrics(): Promise<BlogDashboardMetrics> {
    const db = await getContentDb();
    const res = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Published')::int AS published,
        COUNT(*) FILTER (WHERE status = 'Draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'In Review')::int AS in_review,
        COUNT(*) FILTER (WHERE status = 'Scheduled')::int AS scheduled,
        COUNT(*) FILTER (WHERE status = 'Archived')::int AS archived,
        COALESCE(SUM(views_count), 0)::int AS total_views,
        COUNT(*) FILTER (
          WHERE status = 'Published' AND (
            seo IS NULL OR
            seo->>'seoTitle' IS NULL OR
            seo->>'metaDescription' IS NULL OR
            LENGTH(seo->>'metaDescription') < 50
          )
        )::int AS seo_attention
      FROM content.blogs;
    `);

    const r = res.rows[0] || {};
    return {
      totalArticles: r.total || 0,
      publishedArticles: r.published || 0,
      draftArticles: r.draft || 0,
      inReviewArticles: r.in_review || 0,
      scheduledArticles: r.scheduled || 0,
      archivedArticles: r.archived || 0,
      totalViews: r.total_views || 0,
      seoAttentionNeeded: r.seo_attention || 0,
    };
  }

  /**
   * Resolves URL redirects
   */
  public static async getRedirect(fromSlug: string): Promise<BlogRedirect | null> {
    const db = await getContentDb();
    const res = await db.query(`SELECT * FROM content.redirects WHERE from_slug = $1 LIMIT 1;`, [fromSlug]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      fromSlug: r.from_slug,
      toSlug: r.to_slug,
      statusCode: r.status_code,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  /**
   * Registers a URL redirect
   */
  public static async createRedirect(
    fromSlug: string,
    toSlug: string,
    statusCode: 301 | 302 = 301
  ): Promise<BlogRedirect> {
    const db = await getContentDb();
    const res = await db.query(
      `INSERT INTO content.redirects (from_slug, to_slug, status_code)
       VALUES ($1, $2, $3)
       ON CONFLICT (from_slug) DO UPDATE SET to_slug = EXCLUDED.to_slug, status_code = EXCLUDED.status_code
       RETURNING *;`,
      [fromSlug, toSlug, statusCode]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      fromSlug: r.from_slug,
      toSlug: r.to_slug,
      statusCode: r.status_code,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }
}
