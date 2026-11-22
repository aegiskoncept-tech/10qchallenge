-- Migration 02: Blog Preview Tokens (Persistent, Hashed & Revocable)
-- Schema: content
-- Target Engine: PostgreSQL 16 / PGlite Local Development
-- Compatibility: Multi-Worker Node.js PM2, Process Restarts, Zero-Knowledge Hashing

CREATE SCHEMA IF NOT EXISTS content;

-- 8. Blog Preview Tokens Table
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

-- Cryptographic Hash Fast Lookup Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_preview_tokens_hash ON content.blog_preview_tokens(token_hash);

-- Per-Blog Association Index (for Bulk Invalidation on Article Deletion/Update)
CREATE INDEX IF NOT EXISTS idx_preview_tokens_blog ON content.blog_preview_tokens(blog_id);

-- Filtered Validity Index for Unrevoked Active Tokens
CREATE INDEX IF NOT EXISTS idx_preview_tokens_validity ON content.blog_preview_tokens(token_hash, expires_at) WHERE revoked_at IS NULL;
