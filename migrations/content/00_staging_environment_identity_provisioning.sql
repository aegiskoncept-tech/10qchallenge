-- ==============================================================================
-- 10Q CHALLENGE LMS — FEATURE 13: STAGING DATABASE IDENTITY PROVISIONING TEMPLATE
-- ==============================================================================
-- Target Engine: PostgreSQL 16
-- Schema: content
-- Purpose: Provisions the controlled environment identity record for Hostinger Staging.
--
-- STRICT OPERATIONAL RULES:
-- 1. This script MUST be executed by a DBA / Administrative Provisioning Role.
-- 2. The application migration role (e.g. "cms_migrator") must ONLY have SELECT privilege.
-- 3. NEVER execute this script against a production database.
-- 4. NEVER grant INSERT, UPDATE, DELETE, or TRUNCATE permissions to the migration runner.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS content;

-- 1. Create Environment Identity Table
CREATE TABLE IF NOT EXISTS content.environment_identity (
    id SERIAL PRIMARY KEY,
    application VARCHAR(100) NOT NULL,
    component VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    instance_id VARCHAR(100) NOT NULL UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one active record can ever exist
CREATE UNIQUE INDEX IF NOT EXISTS uq_environment_identity_singleton ON content.environment_identity ((true));

-- 2. Insert Explicit Staging Identity (Executed by DBA only)
-- Replace 'stg-hostinger-cms-20261122-01' with the exact operator-chosen instance ID.
INSERT INTO content.environment_identity (
    application,
    component,
    environment,
    instance_id,
    metadata,
    created_at
) VALUES (
    '10q-challenge',
    'content-cms',
    'staging',
    'stg-hostinger-cms-20261122-01',
    '{"provisioned_by": "Hostinger_DBA", "phase": "Feature13_Staging"}'::jsonb,
    NOW()
)
ON CONFLICT ((true)) DO UPDATE SET
    application = EXCLUDED.application,
    component = EXCLUDED.component,
    environment = EXCLUDED.environment,
    instance_id = EXCLUDED.instance_id,
    metadata = EXCLUDED.metadata;

-- 3. Strict Least-Privilege Role Permissions Model
--
-- Application Migration Runner Role: "cms_migrator" (or configured DB user in DATABASE_URL)
-- GRANT SELECT ONLY: Allows verification before running migration DDL/DML.
-- REVOKE MUTATION: Migration runner CANNOT change production to staging.
--
-- Example SQL (uncomment for target environment deployment):
-- GRANT USAGE ON SCHEMA content TO cms_migrator;
-- GRANT SELECT ON content.environment_identity TO cms_migrator;
-- REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON content.environment_identity FROM cms_migrator;
