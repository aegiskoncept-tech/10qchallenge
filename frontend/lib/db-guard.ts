// ==============================================================================
// 10Q CHALLENGE LMS — FAIL-CLOSED DATABASE TARGET SECURITY GUARD
// Location: frontend/lib/db-guard.ts
// Purpose: Validates that database connections in isolated test mode NEVER touch
//          canonical development databases or production targets.
// ==============================================================================

import path from 'path';

export class DatabaseTargetSecurityError extends Error {
  constructor(message: string) {
    super(`[FAIL-CLOSED DB GUARD] ${message}`);
    this.name = 'DatabaseTargetSecurityError';
  }
}

/**
 * Asserts that a resolved database path is strictly valid and isolated.
 * Throws DatabaseTargetSecurityError if any check fails.
 *
 * @param targetPath - Target path to validate
 * @param dbType - Type of database ('sqlite' | 'pglite')
 */
export function assertSafeDatabaseTarget(targetPath: string, dbType: 'sqlite' | 'pglite'): void {
  const isIsolatedMode = process.env.TEST_DATABASE_MODE === 'isolated';
  const cwd = process.cwd();
  const canonicalSqlite = path.resolve(cwd, 'database', '10q_auth_dev.db');
  const canonicalPglite = path.resolve(cwd, 'database', 'pg_commerce_dev');

  if (!targetPath || typeof targetPath !== 'string') {
    if (isIsolatedMode) {
      throw new DatabaseTargetSecurityError(
        `TEST_DATABASE_MODE=isolated requires an explicit target path for ${dbType}. Received: ${targetPath}`
      );
    }
    return;
  }

  const resolvedTarget = path.resolve(targetPath);

  if (isIsolatedMode) {
    const testEnvRoot = process.env.TEST_ENV_ROOT;
    if (!testEnvRoot) {
      throw new DatabaseTargetSecurityError(
        `TEST_DATABASE_MODE=isolated requires TEST_ENV_ROOT environment variable to be set.`
      );
    }

    const resolvedRoot = path.resolve(testEnvRoot);

    // 1. Direct canonical development path rejection
    if (resolvedTarget === canonicalSqlite || resolvedTarget.includes('10q_auth_dev.db')) {
      throw new DatabaseTargetSecurityError(
        `CRITICAL SECURITY VIOLATION: Isolated test mode attempted to connect to canonical development SQLite at '${resolvedTarget}'.`
      );
    }

    if (resolvedTarget === canonicalPglite || resolvedTarget.includes('pg_commerce_dev')) {
      throw new DatabaseTargetSecurityError(
        `CRITICAL SECURITY VIOLATION: Isolated test mode attempted to connect to canonical development PGlite at '${resolvedTarget}'.`
      );
    }

    // 2. Production URL rejection
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
      throw new DatabaseTargetSecurityError(
        `CRITICAL SECURITY VIOLATION: Production DATABASE_URL detected during isolated test execution: ${dbUrl}`
      );
    }

    // 3. Approved test root boundary validation
    if (!resolvedTarget.startsWith(resolvedRoot)) {
      throw new DatabaseTargetSecurityError(
        `Target path '${resolvedTarget}' is outside approved TEST_ENV_ROOT '${resolvedRoot}'.`
      );
    }
  } else {
    // Development or non-isolated mode safety check
    if (process.env.NODE_ENV === 'production' && resolvedTarget.includes('test')) {
      throw new DatabaseTargetSecurityError(
        `Production environment targeting test database path: ${resolvedTarget}`
      );
    }
  }
}
