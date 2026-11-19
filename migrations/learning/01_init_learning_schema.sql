-- ==============================================================================
-- 10Q CHALLENGE LMS — LEARNING PROGRESS SCHEMA MIGRATION (POSTGRESQL 16)
-- Schema: learning
-- Purpose: Authoritative persistent storage for student topic progress,
--          learning content progress, learning event history, and course activity.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS learning;

-- ------------------------------------------------------------------------------
-- 1. STUDENT TOPIC PROGRESS
-- Authoritative current progress state per student and topic leaf node.
-- Missing rows represent NOT_STARTED; rows exist only for IN_PROGRESS or COMPLETED.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.student_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    course_id INT NOT NULL,
    subject_id INT NOT NULL,
    chapter_id INT NOT NULL,
    topic_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_topic_progress_status CHECK (
        status IN ('IN_PROGRESS', 'COMPLETED')
    ),
    CONSTRAINT uq_student_topic_unique UNIQUE (user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_progress_user_course 
    ON learning.student_topic_progress(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_topic_progress_user_chapter 
    ON learning.student_topic_progress(user_id, chapter_id);

CREATE INDEX IF NOT EXISTS idx_topic_progress_last_activity 
    ON learning.student_topic_progress(user_id, last_activity_at DESC);

-- ------------------------------------------------------------------------------
-- 2. STUDENT CONTENT PROGRESS
-- Authoritative content-level tracking for Vimeo videos and PDF documents.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.student_content_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    course_id INT NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    content_identifier VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_content_progress_type CHECK (
        content_type IN ('VIDEO', 'PDF')
    ),
    CONSTRAINT chk_content_progress_status CHECK (
        status IN ('IN_PROGRESS', 'COMPLETED')
    ),
    CONSTRAINT uq_student_content_unique UNIQUE (user_id, content_type, content_identifier)
);

CREATE INDEX IF NOT EXISTS idx_content_progress_user_course 
    ON learning.student_content_progress(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_content_progress_last_activity 
    ON learning.student_content_progress(user_id, last_activity_at DESC);

-- ------------------------------------------------------------------------------
-- 3. STUDENT LEARNING EVENTS
-- Historical append-only ledger of learning actions for audit & future analytics.
-- Protected against duplicate submission via optional idempotency_key.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.student_learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    course_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    content_type VARCHAR(20),
    content_identifier VARCHAR(128),
    subject_id INT,
    chapter_id INT,
    topic_id INT,
    event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idempotency_key VARCHAR(128) UNIQUE,
    metadata JSONB,
    CONSTRAINT chk_learning_event_type CHECK (
        event_type IN (
            'TOPIC_STARTED',
            'TOPIC_COMPLETED',
            'VIDEO_STARTED',
            'VIDEO_COMPLETED',
            'DOCUMENT_OPENED',
            'DOCUMENT_COMPLETED'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_course_time 
    ON learning.student_learning_events(user_id, course_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_topic 
    ON learning.student_learning_events(user_id, topic_id);

-- ------------------------------------------------------------------------------
-- 4. STUDENT COURSE ACTIVITY
-- Highest-level snapshot recording the student's latest learning location in each course.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning.student_course_activity (
    user_id BIGINT NOT NULL,
    course_id INT NOT NULL,
    last_accessed_subject_id INT,
    last_accessed_chapter_id INT,
    last_accessed_topic_id INT,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_activity_last_activity 
    ON learning.student_course_activity(user_id, last_activity_at DESC);
