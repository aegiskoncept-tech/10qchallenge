// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: DATABASE ENVIRONMENT IDENTITY VERIFIER
// ==============================================================================
// Independent database-level environment identity verification layer.
// Ensures a PostgreSQL database explicitly proves its identity as staging before
// any Feature 13 migration DDL/DML or rollback operation is permitted.
//
// Fails closed on query errors, missing metadata, unexpected instances, or
// production identities. Operates strictly read-only; NEVER provisions identity.
// ==============================================================================

class DatabaseIdentityError extends Error {
  constructor(message, code = 'IDENTITY_VERIFICATION_FAILED') {
    super(message);
    this.name = 'DatabaseIdentityError';
    this.code = code;
  }
}

/**
 * Validates that an expected instance ID string is well-formed, non-empty,
 * and does not contain wildcard patterns.
 */
function validateExpectedInstanceId(instanceId) {
  if (!instanceId || typeof instanceId !== 'string' || instanceId.trim() === '') {
    throw new DatabaseIdentityError(
      'Explicit FEATURE13_EXPECTED_STAGING_INSTANCE_ID is required for staging database verification. None provided.',
      'MISSING_EXPECTED_INSTANCE_ID'
    );
  }

  const trimmed = instanceId.trim();
  if (trimmed.includes('*') || trimmed.includes('%') || trimmed.toLowerCase() === 'all') {
    throw new DatabaseIdentityError(
      `Wildcard pattern "${trimmed}" is strictly prohibited for FEATURE13_EXPECTED_STAGING_INSTANCE_ID.`,
      'WILDCARD_INSTANCE_ID_PROHIBITED'
    );
  }

  return trimmed;
}

/**
 * Verifies the database environment identity against explicit expected metadata.
 *
 * Runs AFTER host/database allowlist validation and connection establishment,
 * but BEFORE any DDL, DML, migration transaction, or rollback action.
 *
 * STRICTLY READ-ONLY: Never creates tables or inserts identity records.
 *
 * @param {Object} db Database client supporting query(sql, params)
 * @param {Object} options Configuration parameters
 * @returns {Promise<Object>} Verified identity metadata
 */
async function verifyDatabaseEnvironmentIdentity(db, options = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new DatabaseIdentityError(
      'Valid database client with query() method is required for identity verification.',
      'INVALID_DB_CLIENT'
    );
  }

  const targetEnv = (options.targetEnv || process.env.TARGET_ENV || '').toLowerCase().trim();
  if (!targetEnv) {
    throw new DatabaseIdentityError(
      'TARGET_ENV must be specified for database identity verification.',
      'MISSING_TARGET_ENV'
    );
  }

  // 1. Staging Environment Identity Verification
  if (targetEnv === 'staging') {
    const rawExpectedId = options.expectedInstanceId !== undefined
      ? options.expectedInstanceId
      : process.env.FEATURE13_EXPECTED_STAGING_INSTANCE_ID;

    const expectedInstanceId = validateExpectedInstanceId(rawExpectedId);

    let res;
    try {
      res = await db.query(
        `SELECT application, component, environment, instance_id, created_at
         FROM content.environment_identity
         LIMIT 5;`
      );
    } catch (err) {
      throw new DatabaseIdentityError(
        `Database identity check query failed: ${err.message}. Table content.environment_identity must be provisioned by a DBA before staging operations.`,
        'IDENTITY_QUERY_FAILED'
      );
    }

    if (!res || !Array.isArray(res.rows) || res.rows.length === 0) {
      throw new DatabaseIdentityError(
        'Zero environment identity records found in content.environment_identity. Staging database identity has not been provisioned.',
        'IDENTITY_NOT_FOUND'
      );
    }

    if (res.rows.length > 1) {
      throw new DatabaseIdentityError(
        `Ambiguous database identity: expected exactly 1 identity record, found ${res.rows.length}. Refusing operation.`,
        'MULTIPLE_IDENTITIES_FOUND'
      );
    }

    const row = res.rows[0];

    // Field-level existence checks
    if (!row || typeof row !== 'object') {
      throw new DatabaseIdentityError('Malformed identity record returned from database.', 'MALFORMED_IDENTITY');
    }

    const app = (row.application || '').trim();
    const component = (row.component || '').trim();
    const env = (row.environment || '').trim().toLowerCase();
    const instanceId = (row.instance_id || '').trim();

    // 2. Unconditional Production Identity Denials
    if (env === 'production' || env === 'prod' || /prod/i.test(env)) {
      throw new DatabaseIdentityError(
        `FATAL SAFETY VIOLATION: Database explicitly identifies its environment as "${row.environment}". Staging operations against production databases are unconditionally prohibited.`,
        'PRODUCTION_IDENTITY_DENIED'
      );
    }

    // 3. Application Verification
    if (app !== '10q-challenge') {
      throw new DatabaseIdentityError(
        `Database application mismatch: expected "10q-challenge", found "${row.application}".`,
        'INVALID_APPLICATION'
      );
    }

    // 4. Component Verification
    if (component !== 'content-cms') {
      throw new DatabaseIdentityError(
        `Database component mismatch: expected "content-cms", found "${row.component}".`,
        'INVALID_COMPONENT'
      );
    }

    // 5. Environment Verification
    if (env !== 'staging') {
      throw new DatabaseIdentityError(
        `Database environment mismatch: expected "staging", found "${row.environment}".`,
        'INVALID_ENVIRONMENT'
      );
    }

    // 6. Instance ID Verification
    if (!instanceId) {
      throw new DatabaseIdentityError(
        'Database environment identity record contains an empty or missing instance_id.',
        'MISSING_INSTANCE_ID'
      );
    }

    if (instanceId !== expectedInstanceId) {
      throw new DatabaseIdentityError(
        `Database instance ID mismatch: expected "${expectedInstanceId}", found "${instanceId}". Target is not the intended staging instance.`,
        'INSTANCE_ID_MISMATCH'
      );
    }

    return {
      verified: true,
      targetEnv: 'staging',
      application: app,
      component,
      environment: env,
      instanceId,
      createdAt: row.created_at || null,
    };
  }

  // 2. Local Development Environment
  if (targetEnv === 'local') {
    // In local development, if content.environment_identity exists, verify it doesn't claim production
    try {
      const res = await db.query(
        `SELECT application, component, environment, instance_id
         FROM content.environment_identity
         LIMIT 5;`
      );

      if (res && Array.isArray(res.rows) && res.rows.length > 0) {
        const row = res.rows[0];
        const env = (row.environment || '').trim().toLowerCase();
        if (env === 'production' || env === 'prod' || /prod/i.test(env)) {
          throw new DatabaseIdentityError(
            `Local target contains database marked as PRODUCTION ("${row.environment}"). Connection refused.`,
            'PRODUCTION_IDENTITY_DENIED'
          );
        }

        return {
          verified: true,
          targetEnv: 'local',
          application: (row.application || '').trim(),
          component: (row.component || '').trim(),
          environment: env,
          instanceId: (row.instance_id || '').trim(),
        };
      }
    } catch (err) {
      if (err instanceof DatabaseIdentityError) throw err;
      // In local mode without provisioned identity table, allow development to proceed
    }

    return {
      verified: true,
      targetEnv: 'local',
      application: '10q-challenge',
      component: 'content-cms',
      environment: 'local',
      instanceId: 'local-dev-instance',
      isDefaultLocal: true,
    };
  }

  throw new DatabaseIdentityError(
    `Unsupported target environment "${targetEnv}". Identity verification supports "staging" and "local".`,
    'UNSUPPORTED_TARGET_ENV'
  );
}

module.exports = {
  verifyDatabaseEnvironmentIdentity,
  validateExpectedInstanceId,
  DatabaseIdentityError,
};
