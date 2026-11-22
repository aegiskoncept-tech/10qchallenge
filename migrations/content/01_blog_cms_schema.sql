-- Migration 01: Blog CMS, Editorial Content Engine & SEO Foundation
-- Schema: content
-- Target Database: PostgreSQL 16 (Hostinger Production & Local Development Compatibility)

CREATE SCHEMA IF NOT EXISTS content;

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS content.categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Authors Table
CREATE TABLE IF NOT EXISTS content.authors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(150) NOT NULL,
    avatar VARCHAR(255),
    bio TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Blogs Table (Core Editorial Content)
CREATE TABLE IF NOT EXISTS content.blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(150) NOT NULL,
    author_id VARCHAR(50) REFERENCES content.authors(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    read_time VARCHAR(50) NOT NULL DEFAULT '5 min read',
    cover_image VARCHAR(255),
    cover_image_alt VARCHAR(255),
    cover_image_caption TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL CHECK (status IN ('Draft', 'In Review', 'Approved', 'Scheduled', 'Publishing', 'Published', 'Archived', 'Failed')),
    scheduled_publish_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    views_count INT NOT NULL DEFAULT 0,
    -- Structured SEO Configuration
    seo JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Concurrency & Fencing Token Fields
    claim_token VARCHAR(64),
    claiming_worker_id VARCHAR(100),
    claim_expires_at TIMESTAMPTZ,
    publish_retry_count INT NOT NULL DEFAULT 0,
    -- Audit Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(150)
);

-- Partial Unique Index on Active (Non-Archived) Slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_blogs_active_slug ON content.blogs(slug) WHERE status != 'Archived';

-- Supplementary Indexes for Query Performance & Scheduling
CREATE INDEX IF NOT EXISTS idx_content_blogs_slug ON content.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_content_blogs_status ON content.blogs(status);
CREATE INDEX IF NOT EXISTS idx_content_blogs_category ON content.blogs(category);
CREATE INDEX IF NOT EXISTS idx_content_blogs_published_at ON content.blogs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_blogs_scheduled ON content.blogs(status, scheduled_publish_at) WHERE status IN ('Scheduled', 'Publishing', 'Failed');

-- 4. Blog Revisions (Audit & Historical Versioning)
CREATE TABLE IF NOT EXISTS content.blog_revisions (
    id SERIAL PRIMARY KEY,
    blog_id INT NOT NULL REFERENCES content.blogs(id) ON DELETE CASCADE,
    revision_id VARCHAR(50) NOT NULL,
    author VARCHAR(150) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    summary VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_revisions_blog ON content.blog_revisions(blog_id, created_at DESC);

-- 5. URL Redirects Table (301/302 SEO Preservation Engine)
CREATE TABLE IF NOT EXISTS content.redirects (
    id SERIAL PRIMARY KEY,
    from_slug VARCHAR(255) NOT NULL UNIQUE,
    to_slug VARCHAR(255) NOT NULL,
    status_code INT NOT NULL DEFAULT 301,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_redirects_from ON content.redirects(from_slug);

-- 6. Publication Audit Logs (Immutable Historical Verification Snapshots)
CREATE TABLE IF NOT EXISTS content.publication_audit_logs (
    id SERIAL PRIMARY KEY,
    blog_id INT NOT NULL REFERENCES content.blogs(id) ON DELETE CASCADE,
    claim_token VARCHAR(64) NOT NULL,
    worker_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'PUBLISHED', 'SCHEDULED_CLAIMED', 'LEASE_EXPIRED', 'FAILED_RETRY_EXHAUSTED'
    scheduled_publish_at TIMESTAMPTZ,
    actual_published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    article_snapshot JSONB NOT NULL, -- Complete 17-field canonical snapshot payload
    content_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_audit_blog_token UNIQUE (blog_id, claim_token)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_blog ON content.publication_audit_logs(blog_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_worker ON content.publication_audit_logs(worker_id, created_at DESC);

-- 7. Revalidation Outbox Events (Durable Next.js Cache Invalidation Engine)
CREATE TABLE IF NOT EXISTS content.revalidation_events (
    id SERIAL PRIMARY KEY,
    blog_id INT NOT NULL REFERENCES content.blogs(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL DEFAULT 'REVALIDATE_BLOG',
    slug VARCHAR(255) NOT NULL,
    target_paths TEXT[] NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLAIMED', 'DELIVERED', 'RETRYABLE_FAILED', 'DEAD_LETTER')),
    claim_token VARCHAR(64),
    claiming_worker_id VARCHAR(100),
    claim_expires_at TIMESTAMPTZ,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reval_events_status ON content.revalidation_events(status, claim_expires_at);
CREATE INDEX IF NOT EXISTS idx_reval_events_blog ON content.revalidation_events(blog_id);

-- 8. Blog Preview Tokens (Persistent, Hashed & Revocable)
CREATE TABLE IF NOT EXISTS content.blog_preview_tokens (
    id SERIAL PRIMARY KEY,
    blog_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_by VARCHAR(150),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_preview_tokens_hash ON content.blog_preview_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_preview_tokens_blog ON content.blog_preview_tokens(blog_id);
CREATE INDEX IF NOT EXISTS idx_preview_tokens_validity ON content.blog_preview_tokens(token_hash, expires_at) WHERE revoked_at IS NULL;

