import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { assertSafeDatabaseTarget } from '../db-guard';

export interface UserEntity {
  id: number;
  fullName: string;
  email: string;
  mobileNumber?: string | null;
  passwordHash: string;
  role: 'ADMIN' | 'STUDENT' | 'FACULTY';
  targetExam?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionEntity {
  id: number;
  sessionId: string;
  userId: number;
  csrfToken: string;
  expiresAt: string;
  isRevoked: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AdminActivityLogEntity {
  id?: number;
  userId: number;
  action: string;
  module: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
  timestamp?: string;
}

export interface RateLimitEntity {
  key: string;
  points: number;
  expiresAt: number;
}

// Global reference for database singleton
let sqliteDbInstance: any = null;
let hasLoggedStartup = false;

function getSqliteDb() {
  if (sqliteDbInstance) return sqliteDbInstance;

  let DatabaseSync: any;
  if (typeof process !== 'undefined' && typeof (process as any).getBuiltinModule === 'function') {
    try {
      DatabaseSync = (process as any).getBuiltinModule('node:sqlite')?.DatabaseSync;
    } catch (e) {}
  }
  if (!DatabaseSync) {
    try {
      DatabaseSync = eval('require')('node:sqlite').DatabaseSync;
    } catch (e) {
      const nodeRequire = createRequire(import.meta.url);
      DatabaseSync = nodeRequire('node:sqlite').DatabaseSync;
    }
  }
  
  // Establish database directory in project root / database / 10q_auth_dev.db or isolated test target
  const isIsolatedMode = process.env.TEST_DATABASE_MODE === 'isolated';
  let dbPath: string;

  if (isIsolatedMode) {
    const testSqlitePath = process.env.TEST_SQLITE_PATH;
    if (!testSqlitePath) {
      throw new Error('[FAIL-CLOSED DB GUARD] TEST_DATABASE_MODE=isolated requires TEST_SQLITE_PATH to be specified.');
    }
    assertSafeDatabaseTarget(testSqlitePath, 'sqlite');
    dbPath = path.resolve(testSqlitePath);
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true, mode: 0o750 });
    }
  } else {
    const isProduction = process.env.NODE_ENV === 'production';
    const dataStoreDir = process.env.DATA_STORE_DIR?.trim();

    // In production, DATA_STORE_DIR is strictly mandatory to prevent ephemeral database resets
    if (isProduction && !dataStoreDir) {
      throw new Error(
        '[FAIL-CLOSED PERSISTENT STORAGE GUARD] DATA_STORE_DIR environment variable is mandatory in production. ' +
        'It must point to a persistent directory outside the application deployment workspace ' +
        'to prevent database recreation and data loss across deployments. (e.g., DATA_STORE_DIR=/home/uXXXXXXX/persistent_data)'
      );
    }

    const baseDir = dataStoreDir ? path.resolve(dataStoreDir) : process.cwd();
    const dbDir = path.join(baseDir, 'database');

    // Create database directory recursively when necessary
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true, mode: 0o750 });
      } catch (mkdirErr: any) {
        throw new Error(`[FAIL-CLOSED PERSISTENT STORAGE GUARD] Failed to create database directory '${dbDir}': ${mkdirErr.message}`);
      }
    }

    // Verify directory permissions and write access
    try {
      fs.accessSync(dbDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (accessErr: any) {
      throw new Error(`[FAIL-CLOSED PERSISTENT STORAGE GUARD] Database directory '${dbDir}' is not readable/writable: ${accessErr.message}`);
    }

    dbPath = path.join(dbDir, '10q_auth_dev.db');

    // Verify existing database file permissions, or test write capability in directory if creating new
    if (fs.existsSync(dbPath)) {
      try {
        fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      } catch (fileErr: any) {
        throw new Error(`[FAIL-CLOSED PERSISTENT STORAGE GUARD] Database file '${dbPath}' exists but is not readable/writable: ${fileErr.message}`);
      }
    } else {
      try {
        const probeFile = path.join(dbDir, `.probe_write_${Date.now()}_${process.pid}`);
        fs.writeFileSync(probeFile, 'ok', { flag: 'wx' });
        fs.unlinkSync(probeFile);
      } catch (probeErr: any) {
        throw new Error(`[FAIL-CLOSED PERSISTENT STORAGE GUARD] Cannot create files in database directory '${dbDir}': ${probeErr.message}`);
      }
    }

    // Safe startup validation reporting resolved path without exposing credentials or secrets
    if (!hasLoggedStartup) {
      const persistenceType = dataStoreDir ? 'External Persistent Directory' : 'Local Workspace (Development Mode)';
      console.log(`[AUTH-DB-INITIALIZED] SQLite database active at: ${dbPath} (${persistenceType})`);
      hasLoggedStartup = true;
    }
  }

  const db = new DatabaseSync(dbPath);

  // Enable WAL and foreign keys for concurrency and integrity
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  // Initialize relational tables matching Prisma schema specifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      mobileNumber TEXT,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      targetExam TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      csrfToken TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      isRevoked INTEGER NOT NULL DEFAULT 0,
      ipAddress TEXT,
      userAgent TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      entityId TEXT,
      ipAddress TEXT,
      userAgent TEXT,
      details TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      points INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_sessions_sid ON user_sessions(sessionId);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_logs_user ON admin_activity_logs(userId);
  `);

  sqliteDbInstance = db;
  return db;
}

export const AuthDb = {
  // User operations
  findUserByEmail(email: string): UserEntity | null {
    const db = getSqliteDb();
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE LIMIT 1');
    const row = stmt.get(email.trim().toLowerCase()) as any;
    if (!row) return null;
    return {
      id: Number(row.id),
      fullName: row.fullName,
      email: row.email,
      mobileNumber: row.mobileNumber,
      passwordHash: row.passwordHash,
      role: row.role as 'ADMIN' | 'STUDENT' | 'FACULTY',
      targetExam: row.targetExam,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  findUserById(id: number): UserEntity | null {
    const db = getSqliteDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: Number(row.id),
      fullName: row.fullName,
      email: row.email,
      mobileNumber: row.mobileNumber,
      passwordHash: row.passwordHash,
      role: row.role as 'ADMIN' | 'STUDENT' | 'FACULTY',
      targetExam: row.targetExam,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  getDb(): any {
    return getSqliteDb();
  },

  getDatabaseInfo(): { dbPath: string; isPersistent: boolean; exists: boolean } {
    const isIsolatedMode = process.env.TEST_DATABASE_MODE === 'isolated';
    if (isIsolatedMode) {
      const p = process.env.TEST_SQLITE_PATH ? path.resolve(process.env.TEST_SQLITE_PATH) : '';
      return { dbPath: p, isPersistent: false, exists: fs.existsSync(p) };
    }
    const dataStoreDir = process.env.DATA_STORE_DIR?.trim();
    const baseDir = dataStoreDir ? path.resolve(dataStoreDir) : process.cwd();
    const resolvedPath = path.join(baseDir, 'database', '10q_auth_dev.db');
    return {
      dbPath: resolvedPath,
      isPersistent: Boolean(dataStoreDir),
      exists: fs.existsSync(resolvedPath),
    };
  },

  listUsers(options?: {
    role?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): { users: UserEntity[]; total: number } {
    const db = getSqliteDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (options?.role && options.role !== 'ALL') {
      conditions.push('role = ?');
      params.push(options.role.toUpperCase());
    }

    if (options?.search && options.search.trim()) {
      const q = `%${options.search.trim().toLowerCase()}%`;
      conditions.push('(LOWER(fullName) LIKE ? OR LOWER(email) LIKE ? OR mobileNumber LIKE ?)');
      params.push(q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countStmt = db.prepare(countSql);
    const totalRow = (countStmt.get(...params) as any) || { total: 0 };
    const total = Number(totalRow.total || 0);

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const querySql = `SELECT * FROM users ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const queryStmt = db.prepare(querySql);
    const rows = queryStmt.all(...params, limit, offset) as any[];

    const users: UserEntity[] = rows.map((row) => ({
      id: Number(row.id),
      fullName: row.fullName,
      email: row.email,
      mobileNumber: row.mobileNumber,
      passwordHash: row.passwordHash,
      role: row.role as 'ADMIN' | 'STUDENT' | 'FACULTY',
      targetExam: row.targetExam,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { users, total };
  },

  countAdmins(): number {
    const db = getSqliteDb();
    const stmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND isActive = 1");
    const row = stmt.get() as any;
    return Number(row?.count || 0);
  },

  createUser(user: {
    fullName: string;
    email: string;
    mobileNumber?: string | null;
    passwordHash: string;
    role: 'ADMIN' | 'STUDENT' | 'FACULTY';
    targetExam?: string | null;
    isActive?: boolean;
  }): UserEntity {
    const db = getSqliteDb();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (fullName, email, mobileNumber, passwordHash, role, targetExam, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.fullName.trim(),
      user.email.trim().toLowerCase(),
      user.mobileNumber || null,
      user.passwordHash,
      user.role,
      user.targetExam || null,
      user.isActive !== false ? 1 : 0,
      now,
      now
    );

    const insertedId = Number(result.lastInsertRowid);
    return {
      id: insertedId,
      fullName: user.fullName.trim(),
      email: user.email.trim().toLowerCase(),
      mobileNumber: user.mobileNumber || null,
      passwordHash: user.passwordHash,
      role: user.role,
      targetExam: user.targetExam || null,
      isActive: user.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
  },

  updateUser(
    id: number,
    data: {
      fullName?: string;
      mobileNumber?: string | null;
      targetExam?: string | null;
    }
  ): UserEntity | null {
    const db = getSqliteDb();
    const existing = this.findUserById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (data.fullName !== undefined) {
      updates.push('fullName = ?');
      params.push(data.fullName.trim());
    }

    if (data.mobileNumber !== undefined) {
      updates.push('mobileNumber = ?');
      params.push(data.mobileNumber ? data.mobileNumber.trim() : null);
    }

    if (data.targetExam !== undefined) {
      updates.push('targetExam = ?');
      params.push(data.targetExam ? data.targetExam.trim() : null);
    }

    if (updates.length === 0) {
      return existing;
    }

    const now = new Date().toISOString();
    updates.push('updatedAt = ?');
    params.push(now);

    params.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...params);

    return this.findUserById(id);
  },

  // Session operations
  createSession(session: {
    sessionId: string;
    userId: number;
    csrfToken: string;
    expiresAt: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): SessionEntity {
    const db = getSqliteDb();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO user_sessions (sessionId, userId, csrfToken, expiresAt, isRevoked, ipAddress, userAgent, createdAt)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?)
    `);

    const result = stmt.run(
      session.sessionId,
      session.userId,
      session.csrfToken,
      session.expiresAt,
      session.ipAddress || null,
      session.userAgent || null,
      now
    );

    return {
      id: Number(result.lastInsertRowid),
      sessionId: session.sessionId,
      userId: session.userId,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
      isRevoked: false,
      ipAddress: session.ipAddress || null,
      userAgent: session.userAgent || null,
      createdAt: now,
    };
  },

  findSession(sessionId: string): SessionEntity | null {
    const db = getSqliteDb();
    const stmt = db.prepare('SELECT * FROM user_sessions WHERE sessionId = ? LIMIT 1');
    const row = stmt.get(sessionId) as any;
    if (!row) return null;
    return {
      id: Number(row.id),
      sessionId: row.sessionId,
      userId: Number(row.userId),
      csrfToken: row.csrfToken,
      expiresAt: row.expiresAt,
      isRevoked: Boolean(row.isRevoked),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    };
  },

  revokeSession(sessionId: string): boolean {
    const db = getSqliteDb();
    const stmt = db.prepare('UPDATE user_sessions SET isRevoked = 1 WHERE sessionId = ?');
    const result = stmt.run(sessionId);
    return result.changes > 0;
  },

  revokeAllUserSessions(userId: number): number {
    const db = getSqliteDb();
    const stmt = db.prepare('UPDATE user_sessions SET isRevoked = 1 WHERE userId = ?');
    const result = stmt.run(userId);
    return Number(result.changes);
  },

  // Activity Log
  logAdminActivity(log: AdminActivityLogEntity): void {
    try {
      const db = getSqliteDb();
      const now = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT INTO admin_activity_logs (userId, action, module, entityId, ipAddress, userAgent, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        log.userId,
        log.action,
        log.module,
        log.entityId || null,
        log.ipAddress || null,
        log.userAgent || null,
        log.details || null,
        now
      );
    } catch (e) {
      console.error('[AdminActivityLog Error]', e);
    }
  },

  // Rate Limiting
  getRateLimit(key: string): { points: number; expiresAt: number } | null {
    const db = getSqliteDb();
    const now = Date.now();
    const stmt = db.prepare('SELECT points, expiresAt FROM rate_limits WHERE key = ? LIMIT 1');
    const row = stmt.get(key) as any;
    if (!row) return null;
    if (row.expiresAt <= now) {
      db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
      return null;
    }
    return { points: Number(row.points), expiresAt: Number(row.expiresAt) };
  },

  incrementRateLimit(key: string, windowMs: number): { points: number; expiresAt: number } {
    const db = getSqliteDb();
    const now = Date.now();
    const existing = this.getRateLimit(key);

    if (existing) {
      const newPoints = existing.points + 1;
      db.prepare('UPDATE rate_limits SET points = ? WHERE key = ?').run(newPoints, key);
      return { points: newPoints, expiresAt: existing.expiresAt };
    } else {
      const expiresAt = now + windowMs;
      db.prepare('INSERT OR REPLACE INTO rate_limits (key, points, expiresAt) VALUES (?, 1, ?)').run(key, expiresAt);
      return { points: 1, expiresAt };
    }
  },

  resetRateLimit(key: string): void {
    const db = getSqliteDb();
    db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
  },
};

export function closeSqliteDb(): void {
  if (sqliteDbInstance) {
    try {
      sqliteDbInstance.close();
    } catch (_) {}
    sqliteDbInstance = null;
  }
}
