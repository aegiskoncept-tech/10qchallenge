// 10Q Challenge — One-Time Administrator Bootstrap Script
// Usage:
//   $env:SETUP_ADMIN_SECRET="your-secure-setup-secret-min-16-chars"
//   node scripts/bootstrap-admin.js admin@10qchallenge.in "Lead Administrator" "YourStrongPassword123"

const path = require('path');
const fs = require('fs');
const crypto = require('node:crypto');

// Verify Node.js version and sqlite
const { DatabaseSync } = require('node:sqlite');

const secret = process.env.SETUP_ADMIN_SECRET;
if (!secret || secret.length < 16) {
  console.error('\n[BOOTSTRAP ERROR] SETUP_ADMIN_SECRET environment variable must be set (minimum 16 characters).\n');
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args[0];
const fullName = args[1] || 'Lead Administrator';
const password = args[2];

if (!email || !password) {
  console.log(`
Usage:
  node scripts/bootstrap-admin.js <email> <fullName> <password>

Example:
  node scripts/bootstrap-admin.js admin@10qchallenge.in "Lead Administrator" "AdminPass2026!"
`);
  process.exit(1);
}

if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  console.error('\n[BOOTSTRAP ERROR] Password must be at least 8 characters long and contain both letters and numbers.\n');
  process.exit(1);
}

const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, '10q_auth_dev.db');
const db = new DatabaseSync(dbPath);

// Ensure tables exist
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
`);

// Check if an admin already exists
const countRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND isActive = 1").get();
if (Number(countRow.count) > 0) {
  console.error('\n[BOOTSTRAP REJECTED] An active administrator already exists in the database. Bootstrap is permanently closed.\n');
  process.exit(1);
}

// Hash password with memory-hard scrypt
const salt = crypto.randomBytes(16).toString('hex');
const derivedKey = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
const passwordHash = `scrypt$N=16384,r=8,p=1$${salt}$${derivedKey.toString('hex')}`;

const now = new Date().toISOString();
const insertStmt = db.prepare(`
  INSERT INTO users (fullName, email, mobileNumber, passwordHash, role, targetExam, isActive, createdAt, updatedAt)
  VALUES (?, ?, NULL, ?, 'ADMIN', NULL, 1, ?, ?)
`);

const result = insertStmt.run(fullName.trim(), email.trim().toLowerCase(), passwordHash, now, now);
const newAdminId = Number(result.lastInsertRowid);

// Log activity
db.prepare(`
  INSERT INTO admin_activity_logs (userId, action, module, entityId, ipAddress, userAgent, details, timestamp)
  VALUES (?, 'BOOTSTRAP_INITIAL_ADMIN', 'CLI', ?, '127.0.0.1', 'CLI-Script', ?, ?)
`).run(newAdminId, String(newAdminId), JSON.stringify({ email: email.trim().toLowerCase(), fullName: fullName.trim() }), now);

console.log('\n======================================================');
console.log('✓ Initial Administrator Successfully Bootstrapped!');
console.log('------------------------------------------------------');
console.log(`Admin ID:   ${newAdminId}`);
console.log(`Email:      ${email.trim().toLowerCase()}`);
console.log(`Full Name:  ${fullName.trim()}`);
console.log(`Role:       ADMIN`);
console.log(`Status:     Active`);
console.log('Bootstrap is now permanently closed.');
console.log('======================================================\n');
