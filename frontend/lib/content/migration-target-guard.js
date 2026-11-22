// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: MIGRATION & ROLLBACK TARGET SECURITY GUARD
// ==============================================================================
// Strict destination allowlist validation and unconditional production denial.
//
// Prevents accidental or malicious migration/rollback execution against production.
// Operates purely in-memory before any database client or network connection is created.
// ==============================================================================

class MigrationSecurityError extends Error {
  constructor(message, code = 'MIGRATION_TARGET_DENIED') {
    super(message);
    this.name = 'MigrationSecurityError';
    this.code = code;
  }
}

/**
 * Known production host patterns and indicators for unconditional refusal.
 */
const PRODUCTION_HOST_PATTERNS = [
  /hostinger/i,
  /production/i,
  /\bprod\b/i,
  /(^|\.)10qchallenge\.in$/i,
  /live-db/i,
  /srv.*\.hstgr/i,
];

/**
 * Known production database name patterns for unconditional refusal.
 */
const PRODUCTION_DB_PATTERNS = [
  /production/i,
  /\bprod\b/i,
  /10q_prod/i,
  /live/i,
  /^u\d+_/i, // Hostinger user-prefixed databases
];

/**
 * Validates that an allowlist does not contain permissive wildcards or empty entries.
 */
function parseAllowlist(rawString) {
  if (!rawString || typeof rawString !== 'string') return [];
  const entries = rawString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const entry of entries) {
    if (entry.includes('*') || entry.includes('%') || entry === 'all') {
      throw new MigrationSecurityError(
        `Wildcard allowlist pattern "${entry}" is strictly prohibited. All destinations must be explicit.`,
        'WILDCARD_ALLOWLIST_PROHIBITED'
      );
    }
  }

  return entries;
}

/**
 * Redacts passwords and credentials from a connection URL string.
 */
function redactConnectionUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '[NO_URL]';
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = '***';
    }
    return parsed.toString();
  } catch {
    return '[MALFORMED_URI_REDACTED]';
  }
}

/**
 * Validates the database destination against explicit environment allowlists and
 * unconditional production-refusal policies.
 *
 * Runs 100% locally in-memory BEFORE any database client or connection pool is constructed.
 *
 * @param {Object} options Configuration and environment parameters
 * @returns {Object} Validated destination metadata (with redacted credentials)
 */
function validateMigrationTarget(options = {}) {
  const env = options.env || process.env;
  const operation = options.operation || 'migration'; // 'migration' or 'rollback'

  const targetEnv = (options.targetEnv || env.TARGET_ENV || '').toLowerCase().trim();
  const nodeEnv = (options.nodeEnv || env.NODE_ENV || '').toLowerCase().trim();
  const rawDbUrl = options.databaseUrl !== undefined ? options.databaseUrl : env.DATABASE_URL;

  // 1. Mandatory Target Environment Identification
  if (!targetEnv) {
    throw new MigrationSecurityError(
      'Explicit TARGET_ENV environment variable is required (must be "local" or "staging").',
      'MISSING_TARGET_ENV'
    );
  }

  // 2. Unconditional Production Environment Rejection
  if (targetEnv === 'production' || targetEnv === 'prod') {
    throw new MigrationSecurityError(
      'Target environment "production" is strictly forbidden. Automated cutover or migration to production is prohibited in this phase.',
      'PRODUCTION_TARGET_FORBIDDEN'
    );
  }

  if (nodeEnv === 'production') {
    throw new MigrationSecurityError(
      'Runtime NODE_ENV="production" is strictly forbidden for migration execution in this phase.',
      'PRODUCTION_RUNTIME_FORBIDDEN'
    );
  }

  // 3. Supported Environment Enforcement
  if (targetEnv !== 'local' && targetEnv !== 'staging') {
    throw new MigrationSecurityError(
      `Unrecognized TARGET_ENV "${targetEnv}". Only "local" and "staging" are supported.`,
      'UNRECOGNIZED_TARGET_ENV'
    );
  }

  // 4. Destination Allowlist Resolution
  const localAllowedHosts = parseAllowlist(
    env.FEATURE13_LOCAL_DB_HOSTS || 'localhost,127.0.0.1'
  ).map((h) => h.toLowerCase());

  const localAllowedDbs = parseAllowlist(
    env.FEATURE13_LOCAL_DB_NAMES || 'pg_content_dev,10q_local_test,10q_dev,postgres'
  );

  const stagingAllowedHosts = parseAllowlist(env.FEATURE13_STAGING_DB_HOSTS).map((h) =>
    h.toLowerCase()
  );
  const stagingAllowedDbs = parseAllowlist(env.FEATURE13_STAGING_DB_NAMES);

  // 5. Database URL & Destination Parsing
  let parsedUrl = null;
  let isEmbeddedLocal = false;
  let targetHost = '';
  let targetPort = 5432;
  let targetDb = '';

  if (!rawDbUrl || rawDbUrl.trim() === '') {
    if (targetEnv === 'local') {
      // Local development without DATABASE_URL defaults to embedded PGlite
      isEmbeddedLocal = true;
      targetHost = 'embedded (local)';
      targetDb = env.CONTENT_DATA_STORE_DIR || 'database/pg_content_dev';
    } else {
      throw new MigrationSecurityError(
        `TARGET_ENV="staging" requires an explicit DATABASE_URL. None was provided.`,
        'MISSING_DATABASE_URL'
      );
    }
  } else {
    // Validate protocol and parse URL
    if (typeof rawDbUrl !== 'string' || !rawDbUrl.includes('://')) {
      throw new MigrationSecurityError(
        'DATABASE_URL is malformed. A valid postgresql:// connection URL is required.',
        'MALFORMED_DATABASE_URL'
      );
    }

    try {
      parsedUrl = new URL(rawDbUrl);
    } catch (err) {
      throw new MigrationSecurityError(
        `Failed to parse DATABASE_URL: ${err.message}`,
        'INVALID_DATABASE_URL'
      );
    }

    // Enforce PostgreSQL protocol only
    if (parsedUrl.protocol !== 'postgresql:' && parsedUrl.protocol !== 'postgres:') {
      throw new MigrationSecurityError(
        `Unsupported database protocol "${parsedUrl.protocol}". Only "postgresql:" or "postgres:" is allowed.`,
        'UNSUPPORTED_PROTOCOL'
      );
    }

    targetHost = (parsedUrl.hostname || '').toLowerCase().trim();
    targetPort = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432;
    targetDb = (parsedUrl.pathname || '').replace(/^\//, '').trim();

    if (!targetHost) {
      throw new MigrationSecurityError(
        'DATABASE_URL does not contain a valid hostname.',
        'MISSING_DB_HOST'
      );
    }

    if (isNaN(targetPort) || targetPort < 1 || targetPort > 65535) {
      throw new MigrationSecurityError(
        `DATABASE_URL contains an invalid port number: "${parsedUrl.port}".`,
        'INVALID_PORT'
      );
    }

    if (!targetDb) {
      throw new MigrationSecurityError(
        'DATABASE_URL does not specify a database name in its path.',
        'MISSING_DB_NAME'
      );
    }

    // Inspect URL query parameters for production markers or dangerous security downgrades
    const searchParams = parsedUrl.searchParams;
    for (const [k, v] of searchParams.entries()) {
      const lowerK = k.toLowerCase();
      const lowerV = v.toLowerCase();

      if (lowerK === 'env' || lowerK === 'environment') {
        if (lowerV.includes('prod')) {
          throw new MigrationSecurityError(
            `DATABASE_URL contains explicit production marker "${k}=${v}". Execution refused.`,
            'PRODUCTION_MARKER_DETECTED'
          );
        }
      }

      if (targetEnv === 'staging' && lowerK === 'sslmode' && lowerV === 'disable') {
        throw new MigrationSecurityError(
          'Remote staging database cannot use sslmode=disable. TLS encryption is mandatory for staging connections.',
          'INSECURE_TLS_POLICY'
        );
      }
    }
  }

  // 6. Unconditional Production Destination Host and Database Denial Rules
  if (!isEmbeddedLocal) {
    for (const pattern of PRODUCTION_HOST_PATTERNS) {
      if (pattern.test(targetHost)) {
        throw new MigrationSecurityError(
          `Destination host "${targetHost}" matches production pattern ${pattern}. Connection refused.`,
          'PRODUCTION_HOST_DENIED'
        );
      }
    }

    for (const pattern of PRODUCTION_DB_PATTERNS) {
      if (pattern.test(targetDb)) {
        throw new MigrationSecurityError(
          `Destination database "${targetDb}" matches production pattern ${pattern}. Connection refused.`,
          'PRODUCTION_DB_DENIED'
        );
      }
    }
  }

  // 7. Destination Allowlist Matching (Exact Matches Only)
  if (targetEnv === 'local') {
    if (!isEmbeddedLocal) {
      // Local with PostgreSQL URL must match local host allowlist exactly
      if (!localAllowedHosts.includes(targetHost)) {
        throw new MigrationSecurityError(
          `TARGET_ENV="local" cannot connect to remote host "${targetHost}". Must match exact local allowlist: [${localAllowedHosts.join(', ')}].`,
          'LOCAL_REMOTE_HOST_DISALLOWED'
        );
      }

      if (localAllowedDbs.length > 0 && !localAllowedDbs.includes(targetDb)) {
        throw new MigrationSecurityError(
          `Local database name "${targetDb}" is not in the approved local database allowlist: [${localAllowedDbs.join(', ')}].`,
          'LOCAL_DB_NAME_DISALLOWED'
        );
      }
    }
  } else if (targetEnv === 'staging') {
    // Staging MUST have explicit allowlists configured
    if (stagingAllowedHosts.length === 0) {
      throw new MigrationSecurityError(
        'Staging database host allowlist (FEATURE13_STAGING_DB_HOSTS) is not configured. Staging execution fails closed.',
        'STAGING_HOSTS_ALLOWLIST_EMPTY'
      );
    }

    if (stagingAllowedDbs.length === 0) {
      throw new MigrationSecurityError(
        'Staging database name allowlist (FEATURE13_STAGING_DB_NAMES) is not configured. Staging execution fails closed.',
        'STAGING_DBS_ALLOWLIST_EMPTY'
      );
    }

    // Exact host match (preventing lookalike or substring attacks)
    if (!stagingAllowedHosts.includes(targetHost)) {
      throw new MigrationSecurityError(
        `Destination host "${targetHost}" is not in the approved staging host allowlist: [${stagingAllowedHosts.join(', ')}].`,
        'STAGING_HOST_NOT_ALLOWLISTED'
      );
    }

    // Exact database name match
    if (!stagingAllowedDbs.includes(targetDb)) {
      throw new MigrationSecurityError(
        `Destination database "${targetDb}" is not in the approved staging database allowlist: [${stagingAllowedDbs.join(', ')}].`,
        'STAGING_DB_NOT_ALLOWLISTED'
      );
    }
  }

  // 8. Operation Confirmation Check (Evaluated strictly AFTER destination validation)
  const isMigration = operation === 'migration';
  const isRollback = operation === 'rollback';

  let isConfirmed = false;
  if (isMigration) {
    isConfirmed = options.confirm === true || env.CONFIRM_MIGRATION === 'true';
  } else if (isRollback) {
    isConfirmed = options.confirm === true || env.CONFIRM_ROLLBACK === 'true' || (options.argv && options.argv.includes('--confirm'));
  }

  const result = {
    isSafe: true,
    targetEnv,
    operation,
    isEmbeddedLocal,
    engine: isEmbeddedLocal ? 'PGlite (Embedded Local)' : 'PostgreSQL 16',
    host: targetHost,
    port: isEmbeddedLocal ? null : targetPort,
    database: targetDb,
    redactedUrl: isEmbeddedLocal ? null : redactConnectionUrl(rawDbUrl),
    isConfirmed,
  };

  return result;
}

module.exports = {
  validateMigrationTarget,
  redactConnectionUrl,
  MigrationSecurityError,
};
