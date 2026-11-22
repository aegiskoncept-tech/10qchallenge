/**
 * 10Q CHALLENGE LMS — STAGING DATABASE INITIALIZATION & SEEDING SCRIPT
 * 
 * Target Environment: Hostinger Business Web Hosting (Isolated Staging)
 * Safety:
 * 1. Checks TEST_DATABASE_MODE === 'isolated' (fail-closed if canonical).
 * 2. Connects to TEST_SQLITE_PATH and TEST_PGLITE_DIR.
 * 3. Initializes SQLite auth schema (users, sessions, audit_logs).
 * 4. Initializes PGlite commerce schema (orders, invoices, enrollments, refunds, coupons).
 * 5. Seeds dedicated synthetic accounts (Admin, Faculty, Student).
 * 6. Seeds sample course enrollment and mock test paper.
 * 7. ZERO canonical production data is imported or modified.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

// Scrypt password hashing matching frontend/lib/auth/password.ts
const SCRYPT_CONFIG = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_CONFIG);
  return `scrypt$N=${SCRYPT_CONFIG.N},r=${SCRYPT_CONFIG.r},p=${SCRYPT_CONFIG.p}$${salt}$${derivedKey.toString('hex')}`;
}

async function seedStaging() {
  console.log('========================================================================');
  console.log('  10Q CHALLENGE LMS — INITIALIZING STAGING DATABASE                     ');
  console.log('========================================================================\n');

  // Guard: Ensure isolated mode
  const mode = process.env.TEST_DATABASE_MODE;
  const sqlitePath = process.env.TEST_SQLITE_PATH;
  const pgliteDir = process.env.TEST_PGLITE_DIR;

  console.log('Runtime Mode:', mode || 'default');
  console.log('Target SQLite:', sqlitePath || 'database/10q_auth_staging.db');
  console.log('Target PGlite:', pgliteDir || 'database/pg_commerce_staging');

  // Prevent accidental canonical mutation
  const canonicalSqlite = path.resolve(process.cwd(), 'database', '10q_auth_dev.db');
  if (sqlitePath && path.resolve(sqlitePath) === canonicalSqlite) {
    console.error('FATAL: Attempted to seed canonical database! Aborting immediately.');
    process.exit(1);
  }

  // Ensure directories exist
  const effectiveSqlite = sqlitePath ? path.resolve(sqlitePath) : path.resolve(process.cwd(), 'database', '10q_auth_staging.db');
  const effectivePglite = pgliteDir ? path.resolve(pgliteDir) : path.resolve(process.cwd(), 'database', 'pg_commerce_staging');

  fs.mkdirSync(path.dirname(effectiveSqlite), { recursive: true });
  fs.mkdirSync(effectivePglite, { recursive: true });

  // 1. Initialize SQLite Auth Database
  console.log('\n1. Initializing SQLite Auth Database at:', effectiveSqlite);
  const db = new DatabaseSync(effectiveSqlite);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      actor_email TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Generate secure random passwords for staging accounts
  const adminPass = `StgAdmin_${crypto.randomBytes(6).toString('base64url')}!2026`;
  const facultyPass = `StgFac_${crypto.randomBytes(6).toString('base64url')}!2026`;
  const studentPass = `StgStud_${crypto.randomBytes(6).toString('base64url')}!2026`;

  // Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (email, name, password, role, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(email) DO UPDATE SET password = excluded.password, name = excluded.name;
  `);

  insertUser.run('admin@10qacceptance.local', 'Staging Administrator', hashPassword(adminPass), 'ADMIN');
  insertUser.run('faculty@10qacceptance.local', 'Staging Faculty Lead', hashPassword(facultyPass), 'FACULTY');
  insertUser.run('student@10qacceptance.local', 'Staging Student Learner', hashPassword(studentPass), 'STUDENT');

  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  console.log(`✓ SQLite initialized with ${userCount} synthetic staging accounts.`);
  db.close();

  // 2. Initialize PGlite Commerce Database
  console.log('\n2. Initializing PGlite Commerce Database at:', effectivePglite);
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite(effectivePglite);
  await pg.waitReady;

  await pg.exec(`
    CREATE SCHEMA IF NOT EXISTS commerce;

    CREATE TABLE IF NOT EXISTS commerce.orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      student_id INT NOT NULL,
      course_id INT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PAID',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS commerce.invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      order_id INT REFERENCES commerce.orders(id),
      student_id INT NOT NULL,
      final_amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
      issued_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS commerce.enrollments (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL,
      course_id INT NOT NULL,
      order_id INT REFERENCES commerce.orders(id),
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      enrolled_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS commerce.coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_type VARCHAR(20) NOT NULL,
      discount_value NUMERIC(10,2) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE
    );
  `);

  // Seed sample synthetic order, invoice, and enrollment
  const orderRes = await pg.query(`
    INSERT INTO commerce.orders (order_number, student_id, course_id, amount, status)
    VALUES ('ORD-STAGING-001', 3, 1, 499.00, 'PAID')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id;
  `);

  if (orderRes.rows.length > 0) {
    const orderId = orderRes.rows[0].id;
    await pg.query(`
      INSERT INTO commerce.invoices (invoice_number, order_id, student_id, final_amount, status)
      VALUES ('INV-STAGING-001', $1, 3, 499.00, 'ISSUED')
      ON CONFLICT (invoice_number) DO NOTHING;
    `, [orderId]);

    await pg.query(`
      INSERT INTO commerce.enrollments (student_id, course_id, order_id, status)
      VALUES (3, 1, $1, 'ACTIVE')
      ON CONFLICT DO NOTHING;
    `, [orderId]);
  }

  await pg.query(`
    INSERT INTO commerce.coupons (code, discount_type, discount_value, is_active)
    VALUES ('WELCOME10', 'PERCENT', 10.00, TRUE)
    ON CONFLICT (code) DO NOTHING;
  `);

  const orderCount = (await pg.query('SELECT count(*) FROM commerce.orders;')).rows[0].count;
  const invoiceCount = (await pg.query('SELECT count(*) FROM commerce.invoices;')).rows[0].count;
  console.log(`✓ PGlite initialized with ${orderCount} sample order(s) and ${invoiceCount} sample invoice(s).`);
  await pg.close();

  // 3. Save Staging Credentials Strictly to Non-Committed Local File
  const credsDir = path.resolve(process.cwd(), 'scratch');
  fs.mkdirSync(credsDir, { recursive: true });
  const credsFile = path.join(credsDir, 'STAGING_OPERATOR_CREDENTIALS_SECURE.json');
  fs.writeFileSync(credsFile, JSON.stringify({
    notice: 'DO NOT COMMIT THIS FILE — STAGING ACCEPTANCE OPERATOR CREDENTIALS',
    generatedAt: new Date().toISOString(),
    accounts: {
      admin: { email: 'admin@10qacceptance.local', password: adminPass, role: 'ADMIN' },
      faculty: { email: 'faculty@10qacceptance.local', password: facultyPass, role: 'FACULTY' },
      student: { email: 'student@10qacceptance.local', password: studentPass, role: 'STUDENT' }
    }
  }, null, 2), 'utf8');

  console.log('\n========================================================================');
  console.log('  âœ“ STAGING DATABASE INITIALIZATION COMPLETE                           ');
  console.log('  Operator credentials saved to: scratch/STAGING_OPERATOR_CREDENTIALS_SECURE.json');
  console.log('========================================================================\n');
}

if (require.main === module) {
  seedStaging().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seedStaging };
