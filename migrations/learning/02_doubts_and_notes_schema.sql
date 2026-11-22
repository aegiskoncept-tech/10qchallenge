-- ==============================================================================
-- 10Q CHALLENGE LMS — FEATURE 10: DOUBTS & NOTES SCHEMA MIGRATION (POSTGRESQL 16)
-- Schema: learning
-- Purpose: Authoritative persistent storage for student academic doubts,
--          threaded faculty conversation replies, assignment history,
--          and student private interactive notes with concurrency versioning.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS learning;

-- ------------------------------------------------------------------------------
-- 1. STUDENT DOUBTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.student_doubts (
    id SERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255),
    course_id INT NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    subject_id INT,
    subject_name VARCHAR(255),
    chapter_id INT,
    chapter_name VARCHAR(255),
    topic_id INT,
    topic_name VARCHAR(255),
    lesson_id INT,
    lesson_title VARCHAR(255),
    video_timestamp_minutes VARCHAR(20),
    document_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    assigned_faculty_id BIGINT,
    assigned_faculty_name VARCHAR(255),
    assigned_at TIMESTAMPTZ,
    assigned_by BIGINT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_doubt_status CHECK (
        status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ANSWERED', 'RESOLVED', 'REOPENED')
    )
);

CREATE INDEX IF NOT EXISTS idx_doubts_student ON learning.student_doubts(student_id);
CREATE INDEX IF NOT EXISTS idx_doubts_course ON learning.student_doubts(course_id);
CREATE INDEX IF NOT EXISTS idx_doubts_status ON learning.student_doubts(status);
CREATE INDEX IF NOT EXISTS idx_doubts_created_at ON learning.student_doubts(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. DOUBT THREADED REPLIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.doubt_replies (
    id SERIAL PRIMARY KEY,
    doubt_id INT NOT NULL REFERENCES learning.student_doubts(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    visibility VARCHAR(30) NOT NULL DEFAULT 'STUDENT_VISIBLE',
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reply_visibility CHECK (
        visibility IN ('STUDENT_VISIBLE', 'INTERNAL_NOTE')
    )
);

CREATE INDEX IF NOT EXISTS idx_doubt_replies_doubt_id ON learning.doubt_replies(doubt_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- 3. DOUBT ASSIGNMENT HISTORY TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.doubt_assignments (
    id SERIAL PRIMARY KEY,
    doubt_id INT NOT NULL REFERENCES learning.student_doubts(id) ON DELETE CASCADE,
    previous_faculty_id BIGINT,
    new_faculty_id BIGINT NOT NULL,
    new_faculty_name VARCHAR(255) NOT NULL,
    assigned_by BIGINT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doubt_assignments_doubt ON learning.doubt_assignments(doubt_id);

-- ------------------------------------------------------------------------------
-- 4. INTERACTIVE STUDENT NOTES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.student_notes (
    id SERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    course_id INT,
    course_title VARCHAR(255),
    subject_id INT,
    subject_name VARCHAR(255),
    chapter_id INT,
    chapter_name VARCHAR(255),
    topic_id INT,
    topic_name VARCHAR(255),
    video_id INT,
    video_title VARCHAR(255),
    document_id INT,
    document_title VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    plain_text_preview TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student ON learning.student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_course ON learning.student_notes(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_topic ON learning.student_notes(student_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_updated ON learning.student_notes(student_id, updated_at DESC);
