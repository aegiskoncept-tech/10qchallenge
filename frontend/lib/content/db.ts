// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 13: CONTENT DATABASE CONNECTION LAYER
// Engine: PostgreSQL 16
// Supports: Dedicated external PostgreSQL (via pg.Pool) OR
//           Isolated local PostgreSQL 16 engine (via PGlite)
// Schema: content
// ==============================================================================

import * as path from 'path';
import * as fs from 'fs';

let pgliteInstance: any = null;
let pgPoolInstance: any = null;
let schemaInitialized = false;

export interface ContentDbClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  transaction<T>(fn: (client: ContentDbClient) => Promise<T>): Promise<T>;
}

/**
 * Ensures the 'content' schema and all required tables exist
 */
export async function ensureContentSchema(client: ContentDbClient): Promise<void> {
  if (schemaInitialized) return;

  try {
    const check = await client.query(
      `SELECT to_regclass('content.blogs') AS tbl_exists;`
    );
    if (!check.rows[0]?.tbl_exists) {
      // Find migration file
      const candidatePaths = [
        path.join(process.cwd(), 'migrations', 'content', '01_blog_cms_schema.sql'),
        path.join(process.cwd(), '..', 'migrations', 'content', '01_blog_cms_schema.sql'),
      ];
      let migrationSql = '';
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          migrationSql = fs.readFileSync(p, 'utf8');
          break;
        }
      }

      if (migrationSql) {
        if (pgliteInstance && typeof pgliteInstance.exec === 'function') {
          await pgliteInstance.exec(migrationSql);
        } else {
          await client.query(migrationSql);
        }
      }
    }

    // Ensure preview tokens table exists even if content.blogs was created earlier
    const tokenCheck = await client.query(
      `SELECT to_regclass('content.blog_preview_tokens') AS tbl_exists;`
    );
    if (!tokenCheck.rows[0]?.tbl_exists) {
      const previewTableSql = `
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
      `;
      if (pgliteInstance && typeof pgliteInstance.exec === 'function') {
        await pgliteInstance.exec(previewTableSql);
      } else {
        await client.query(previewTableSql);
      }
    }

    schemaInitialized = true;
  } catch (err: any) {
    console.error('[ContentDb] Schema initialization warning:', err.message);
  }
}

export async function getContentDb(): Promise<ContentDbClient> {
  const databaseUrl = process.env.DATABASE_URL;

  // 1. If external PostgreSQL connection string is provided, use pg.Pool
  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    if (!pgPoolInstance) {
      const { Pool } = await import('pg');
      const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
      let sslConfig: any = false;
      if (!isLocalhost) {
        const caCert =
          process.env.DATABASE_SSL_CA ||
          (process.env.PGSSLROOTCERT && fs.existsSync(process.env.PGSSLROOTCERT)
            ? fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8')
            : null);
        const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true;
        sslConfig = {
          rejectUnauthorized,
          ...(caCert ? { ca: caCert } : {}),
        };
      }
      pgPoolInstance = new Pool({
        connectionString: databaseUrl,
        ssl: sslConfig,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    const client: ContentDbClient = {
      async query(sql: string, params?: any[]) {
        const res = await pgPoolInstance.query(sql, params);
        return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
      },
      async transaction<T>(fn: (client: ContentDbClient) => Promise<T>): Promise<T> {
        const conn = await pgPoolInstance.connect();
        try {
          await conn.query('BEGIN');
          const txClient: ContentDbClient = {
            async query(sql: string, params?: any[]) {
              const res = await conn.query(sql, params);
              return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
            },
            async transaction() {
              throw new Error('Nested transactions not supported.');
            },
          };
          const result = await fn(txClient);
          await conn.query('COMMIT');
          return result;
        } catch (err) {
          await conn.query('ROLLBACK');
          throw err;
        } finally {
          conn.release();
        }
      },
    };

    await ensureContentSchema(client);
    return client;
  }

  // 2. Otherwise, use isolated local PostgreSQL 16 engine via PGlite
  if (!pgliteInstance) {
    const { PGlite } = await import('@electric-sql/pglite');
    const baseDir = process.env.CONTENT_DATA_STORE_DIR || process.env.DATA_STORE_DIR || process.cwd();
    const dataDir = path.join(baseDir, 'database', 'pg_content_dev');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
  }

  const db = pgliteInstance;

  const client: ContentDbClient = {
    async query(sql: string, params?: any[]) {
      const res = await db.query(sql, params);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    },
    async transaction<T>(fn: (client: ContentDbClient) => Promise<T>): Promise<T> {
      return await db.transaction(async (tx: any) => {
        const txClient: ContentDbClient = {
          async query(sql: string, params?: any[]) {
            const res = await tx.query(sql, params);
            return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
          },
          async transaction() {
            throw new Error('Nested transactions not supported.');
          },
        };
        return await fn(txClient);
      });
    },
  };

  await ensureContentSchema(client);
  return client;
}

export async function closeContentDb(): Promise<void> {
  schemaInitialized = false;
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  if (pgPoolInstance) {
    await pgPoolInstance.end();
    pgPoolInstance = null;
  }
}
