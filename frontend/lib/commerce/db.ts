// ==============================================================================
// 10Q CHALLENGE LMS — COMMERCE DATABASE CONNECTION LAYER
// Engine: PostgreSQL 16
// Supports: Dedicated external PostgreSQL (via pg.Pool) OR
//           Isolated local PostgreSQL 16 engine (via PGlite)
// Schema: commerce
// ==============================================================================

import * as path from 'path';
import * as fs from 'fs';
import { assertSafeDatabaseTarget } from '../db-guard';

let pgliteInstance: any = null;
let pgPoolInstance: any = null;

export interface CommerceDbClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  transaction<T>(fn: (client: CommerceDbClient) => Promise<T>): Promise<T>;
}

export async function getCommerceDb(): Promise<CommerceDbClient> {
  const databaseUrl = process.env.DATABASE_URL;

  // 1. If external PostgreSQL connection string is provided, use pg.Pool
  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    if (!pgPoolInstance) {
      const { Pool } = await import('pg');
      const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
      let sslConfig: any = false;
      if (!isLocalhost) {
        const caCert = process.env.DATABASE_SSL_CA || (process.env.PGSSLROOTCERT && fs.existsSync(process.env.PGSSLROOTCERT) ? fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8') : null);
        const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true;
        sslConfig = {
          rejectUnauthorized,
          ...(caCert ? { ca: caCert } : {})
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
    return {
      async query(sql: string, params?: any[]) {
        const res = await pgPoolInstance.query(sql, params);
        return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
      },
      async transaction<T>(fn: (client: CommerceDbClient) => Promise<T>): Promise<T> {
        const client = await pgPoolInstance.connect();
        try {
          await client.query('BEGIN');
          const txClient: CommerceDbClient = {
            async query(sql: string, params?: any[]) {
              const res = await client.query(sql, params);
              return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
            },
            async transaction() {
              throw new Error('Nested transactions not supported.');
            },
          };
          const result = await fn(txClient);
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      },
    };
  }

  // 2. Otherwise, use isolated local PostgreSQL 16 engine via PGlite
  if (!pgliteInstance) {
    const { PGlite } = await import('@electric-sql/pglite');
    const isIsolatedMode = process.env.TEST_DATABASE_MODE === 'isolated';
    let dataDir: string;

    if (isIsolatedMode) {
      const testPgliteDir = process.env.TEST_PGLITE_DIR;
      if (!testPgliteDir) {
        throw new Error('[FAIL-CLOSED DB GUARD] TEST_DATABASE_MODE=isolated requires TEST_PGLITE_DIR to be specified.');
      }
      assertSafeDatabaseTarget(testPgliteDir, 'pglite');
      dataDir = path.resolve(testPgliteDir);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } else {
      const baseDir = process.env.DATA_STORE_DIR || process.cwd();
      dataDir = path.join(baseDir, 'database', 'pg_commerce_dev');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.waitReady;
  }

  const db = pgliteInstance;

  return {
    async query(sql: string, params?: any[]) {
      const res = await db.query(sql, params);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    },
    async transaction<T>(fn: (client: CommerceDbClient) => Promise<T>): Promise<T> {
      return await db.transaction(async (tx: any) => {
        const txClient: CommerceDbClient = {
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
}

export async function closeCommerceDb(): Promise<void> {
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  if (pgPoolInstance) {
    await pgPoolInstance.end();
    pgPoolInstance = null;
  }
}
