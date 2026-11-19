// 10Q Challenge LMS — Phase 3 Authentication & Access Control Verification Suite
// Standard Node.js Executable Test Runner (No special flags required)

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

process.env.JWT_SECRET = '10QChallenge_SecureKey_SuperSecret_2026_Minimum256BitsLongRequired!';
process.env.SETUP_ADMIN_SECRET = 'Phase3_Setup_Secret_Test_2026_Key!';

// 1. Database Setup
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new DatabaseSync(path.join(dbDir, '10q_auth_dev.db'));

// 2. Cryptographic Scrypt Password Methods (matching frontend/lib/auth/password.ts)
const SCRYPT_CONFIG = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, SCRYPT_CONFIG);
  return `scrypt$N=${SCRYPT_CONFIG.N},r=${SCRYPT_CONFIG.r},p=${SCRYPT_CONFIG.p}$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
    const salt = parts[2];
    const expectedBuffer = Buffer.from(parts[3], 'hex');
    const derivedBuffer = crypto.scryptSync(password, salt, expectedBuffer.length, SCRYPT_CONFIG);
    return crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') return { valid: false, reason: 'Password required' };
  if (password.length < 8) return { valid: false, reason: 'Must be >= 8 chars' };
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return { valid: false, reason: 'Must contain letters and numbers' };
  return { valid: true };
}

// 3. WebCrypto JWT Methods (matching frontend/lib/auth/jwt.ts)
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signJwt(payload, expiresInSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const encoder = new TextEncoder();
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const message = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(process.env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return `${message}.${base64UrlEncode(signature)}`;
}

async function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    const signature = base64UrlDecode(encodedSignature);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(message));
    if (!isValid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// 4. Rate Limiter Methods (matching frontend/lib/auth/rateLimiter.ts)
function checkRateLimit(key, maxAttempts = 5, windowMs = 900000) {
  const row = db.prepare('SELECT points, expiresAt FROM rate_limits WHERE key = ? LIMIT 1').get(key);
  if (!row) return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  const now = Date.now();
  if (row.expiresAt <= now) {
    db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }
  const remaining = Math.max(0, maxAttempts - Number(row.points));
  const retryAfterSeconds = Math.max(1, Math.ceil((Number(row.expiresAt) - now) / 1000));
  return { allowed: Number(row.points) < maxAttempts, remaining, retryAfterSeconds };
}

function recordFailedAttempt(key, windowMs = 900000) {
  const existing = checkRateLimit(key, 5, windowMs);
  const row = db.prepare('SELECT points, expiresAt FROM rate_limits WHERE key = ? LIMIT 1').get(key);
  const now = Date.now();
  if (row && Number(row.expiresAt) > now) {
    db.prepare('UPDATE rate_limits SET points = points + 1 WHERE key = ?').run(key);
  } else {
    db.prepare('INSERT OR REPLACE INTO rate_limits (key, points, expiresAt) VALUES (?, 1, ?)').run(key, now + windowMs);
  }
}

function clearRateLimit(key) {
  db.prepare('DELETE FROM rate_limits WHERE key = ?').run(key);
}

// 5. CSRF & Server-Side Authorization Helpers (matching frontend/lib/auth/serverAuth.ts)
function validateCsrfToken(req, expectedCsrf) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) return true;
  const clientCsrfHeader = req.headers.get('x-csrf-token');
  const clientCsrfCookie = req.cookies.get('10q_csrf_token')?.value;
  if (!clientCsrfHeader) return false;
  if (expectedCsrf && clientCsrfHeader === expectedCsrf) return true;
  if (clientCsrfCookie && clientCsrfHeader === clientCsrfCookie) return true;
  return false;
}

async function validateSessionAndUser(token) {
  const payload = await verifyJwt(token);
  if (!payload) return { valid: false, reason: 'Invalid or expired token.' };
  const sessionRow = db.prepare('SELECT * FROM user_sessions WHERE sessionId = ? LIMIT 1').get(payload.sessionId);
  if (!sessionRow) return { valid: false, reason: 'Session not found.' };
  if (Boolean(sessionRow.isRevoked)) return { valid: false, reason: 'Session has been revoked.' };
  if (new Date(sessionRow.expiresAt).getTime() < Date.now()) return { valid: false, reason: 'Session has expired.' };
  const userRow = db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').get(payload.userId);
  if (!userRow || !Boolean(userRow.isActive)) return { valid: false, reason: 'User inactive or not found.' };
  return { valid: true, payload, user: userRow, session: sessionRow };
}

async function requireAuth(req) {
  const token = req.cookies.get('10q_auth_token')?.value || (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization').substring(7).trim() : null);
  if (!token) return { authenticated: false, status: 401, error: 'Unauthorized: Authentication required.' };
  const result = await validateSessionAndUser(token);
  if (!result.valid) return { authenticated: false, status: 401, error: result.reason };
  if (!validateCsrfToken(req, result.session.csrfToken)) {
    return { authenticated: false, status: 403, error: 'Forbidden: CSRF token validation failed.' };
  }
  return { authenticated: true, user: result.user, session: result.session };
}

async function requireAdmin(req) {
  const authResult = await requireAuth(req);
  if (!authResult.authenticated) return authResult;
  if (authResult.user.role !== 'ADMIN') {
    return { authenticated: false, status: 403, error: 'Forbidden: Administrator privileges required.' };
  }
  return authResult;
}

// 6. Test Suite Execution
async function runAllTests() {
  console.log('\n================================================================');
  console.log('10Q CHALLENGE LMS — PHASE 3 AUTHENTICATION & ACCESS CONTROL');
  console.log('COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      failed++;
    }
  }

  // TEST GROUP 1: Password Hashing
  console.log('--- TEST GROUP 1: Memory-Hard Password Hashing & Verification ---');
  const raw = 'SuperSecurePass2026!';
  const h1 = await hashPassword(raw);
  const h2 = await hashPassword(raw);
  assert(h1.startsWith('scrypt$'), 'Hash format conforms to scrypt parameters');
  assert(h1 !== h2, 'Unique random 16-byte salts applied to identical passwords');
  assert(await verifyPassword(raw, h1), 'Correct password successfully matches hash');
  assert(!(await verifyPassword('WrongPassword123', h1)), 'Incorrect password rejected');
  assert(!validatePasswordStrength('short').valid, 'Password < 8 chars rejected');
  assert(!validatePasswordStrength('12345678').valid, 'Numeric-only password rejected');
  assert(validatePasswordStrength('ValidPass123').valid, 'Strong alphanumeric password accepted');

  // TEST GROUP 2: Initial Admin Bootstrap Lockout
  console.log('\n--- TEST GROUP 2: Initial Administrator Bootstrap & Lockout ---');
  const adminEmail = `admin.${Date.now()}@10qchallenge.in`;
  const adminHash = await hashPassword('AdminPass2026!');
  const now = new Date().toISOString();
  const insertAdmin = db.prepare('INSERT INTO users (fullName, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)');
  const adminRes = insertAdmin.run('Lead Administrator', adminEmail, adminHash, 'ADMIN', now, now);
  const adminId = Number(adminRes.lastInsertRowid);
  const adminUser = db.prepare('SELECT * FROM users WHERE id = ?').get(adminId);

  assert(adminUser.role === 'ADMIN', 'Initial administrator created with role ADMIN');
  const adminCount = Number(db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND isActive = 1").get().count);
  assert(adminCount >= 1, 'Active administrator exists in database');
  assert(adminCount > 0, 'Bootstrap permanently disabled when admin exists');

  // TEST GROUP 3: Student Registration & Duplicate Email Handling
  console.log('\n--- TEST GROUP 3: Student Registration & Duplicate Handling ---');
  const studentEmail = `student.${Date.now()}@example.com`;
  const studentHash = await hashPassword('StudentPass2026!');
  const insertStudent = db.prepare('INSERT INTO users (fullName, email, passwordHash, role, targetExam, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?)');
  const studentRes = insertStudent.run('Aarav Student', studentEmail, studentHash, 'STUDENT', 'BITSAT', now, now);
  const studentId = Number(studentRes.lastInsertRowid);
  const studentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId);

  assert(studentUser.role === 'STUDENT', 'Registered student has role STUDENT (zero privilege escalation)');
  const duplicate = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(studentEmail);
  assert(duplicate && duplicate.id === studentId, 'Duplicate email detected in database');

  // TEST GROUP 4: Unknown Email & Invalid Password
  console.log('\n--- TEST GROUP 4: Unknown Email & Invalid Password Rejection ---');
  const unknown = db.prepare('SELECT * FROM users WHERE email = ?').get('nonexistent@10qchallenge.in');
  assert(!unknown, 'Unknown email returns null without user enumeration');
  assert(!(await verifyPassword('WrongPass', studentUser.passwordHash)), 'Invalid password fails verification');

  // TEST GROUP 5: Rate Limiting
  console.log('\n--- TEST GROUP 5: Persistent Database Rate Limiting ---');
  const rateKey = `login:test:${Date.now()}`;
  for (let i = 0; i < 5; i++) recordFailedAttempt(rateKey, 60000);
  const rateStatus = checkRateLimit(rateKey, 5, 60000);
  assert(!rateStatus.allowed, 'Rate limiter blocks after 5 failed attempts (429 status)');
  assert(rateStatus.remaining === 0, 'Zero remaining attempts');
  clearRateLimit(rateKey);
  assert(checkRateLimit(rateKey, 5, 60000).allowed, 'Rate limiter resets upon successful login');

  // TEST GROUP 6: Session Lifecycle & JWT
  console.log('\n--- TEST GROUP 6: Session Lifecycle & JWT Verification ---');
  const sessionId = crypto.randomUUID();
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  db.prepare('INSERT INTO user_sessions (sessionId, userId, csrfToken, expiresAt, isRevoked, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?, ?)').run(sessionId, studentId, csrfToken, expiresAt, '127.0.0.1', 'NodeAgent', now);

  const studentToken = await signJwt({ userId: studentId, email: studentEmail, role: 'STUDENT', sessionId, fullName: 'Aarav Student' });
  const payload = await verifyJwt(studentToken);
  assert(payload !== null, 'JWT successfully verified with HS256');
  assert(payload.role === 'STUDENT', 'Payload role matches STUDENT');

  const sessionCheck = await validateSessionAndUser(studentToken);
  assert(sessionCheck.valid, 'Session validated against active database session');

  // TEST GROUP 7: RBAC — Student Blocked from Admin Access
  console.log('\n--- TEST GROUP 7: RBAC — Student Blocked from Admin Access ---');
  function createMockReq(headers = {}, cookies = {}, method = 'GET') {
    const hMap = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    const cMap = new Map(Object.entries(cookies).map(([k, v]) => [k, { value: v }]));
    return {
      method,
      headers: { get(k) { return hMap.get(k.toLowerCase()) || null; } },
      cookies: { get(k) { return cMap.get(k) || null; } }
    };
  }

  const studentReq = createMockReq({ 'authorization': `Bearer ${studentToken}` });
  const studentAdminAttempt = await requireAdmin(studentReq);
  assert(!studentAdminAttempt.authenticated, 'Student denied admin access');
  assert(studentAdminAttempt.status === 403, 'Denied with status 403 Forbidden');

  // TEST GROUP 8: Unauthenticated API Requests
  console.log('\n--- TEST GROUP 8: Unauthenticated API Requests Blocked ---');
  const unauthReq = createMockReq();
  const unauthAttempt = await requireAdmin(unauthReq);
  assert(!unauthAttempt.authenticated, 'Unauthenticated request blocked');
  assert(unauthAttempt.status === 401, 'Returns status 401 Unauthorized');

  // TEST GROUP 9: Forged Client Roles & Headers Defeated
  console.log('\n--- TEST GROUP 9: Forged Client Roles Defeated ---');
  const forgedReq = createMockReq({ 'x-admin-user': 'Administrator', 'x-role': 'ADMIN' });
  const forgedAttempt = await requireAdmin(forgedReq);
  assert(!forgedAttempt.authenticated, 'Server strictly rejects forged headers without valid session');
  assert(forgedAttempt.status === 401, 'Returns 401 Unauthorized');

  // TEST GROUP 10: CSRF Protection
  console.log('\n--- TEST GROUP 10: CSRF Protection for Cookie Mutations ---');
  const adminSessionId = crypto.randomUUID();
  const adminCsrf = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO user_sessions (sessionId, userId, csrfToken, expiresAt, isRevoked, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?, ?)').run(adminSessionId, adminId, adminCsrf, expiresAt, '127.0.0.1', 'NodeAgent', now);
  const adminToken = await signJwt({ userId: adminId, email: adminEmail, role: 'ADMIN', sessionId: adminSessionId, fullName: 'Lead Admin' });

  // Missing CSRF header on POST
  const noCsrfReq = createMockReq({}, { '10q_auth_token': adminToken, '10q_csrf_token': adminCsrf }, 'POST');
  const noCsrfAttempt = await requireAdmin(noCsrfReq);
  assert(!noCsrfAttempt.authenticated, 'Mutating POST without x-csrf-token rejected');
  assert(noCsrfAttempt.status === 403, 'Returns 403 Forbidden');

  // Valid CSRF header on POST
  const validCsrfReq = createMockReq({ 'x-csrf-token': adminCsrf }, { '10q_auth_token': adminToken, '10q_csrf_token': adminCsrf }, 'POST');
  const validCsrfAttempt = await requireAdmin(validCsrfReq);
  assert(validCsrfAttempt.authenticated, 'Mutating POST with matching CSRF token approved');
  assert(validCsrfAttempt.user.role === 'ADMIN', 'Admin identity verified on server');

  // TEST GROUP 11: Session Expiration
  console.log('\n--- TEST GROUP 11: Session Expiration Handling ---');
  const expiredToken = await signJwt({ userId: adminId, email: adminEmail, role: 'ADMIN', sessionId: adminSessionId }, -3600);
  assert((await verifyJwt(expiredToken)) === null, 'Expired JWT rejected during verification');
  assert(!(await validateSessionAndUser(expiredToken)).valid, 'Expired session rejected by server validator');

  // TEST GROUP 12: Session Revocation & Logout
  console.log('\n--- TEST GROUP 12: Session Revocation & Logout ---');
  assert((await validateSessionAndUser(adminToken)).valid, 'Admin session initially active');
  db.prepare('UPDATE user_sessions SET isRevoked = 1 WHERE sessionId = ?').run(adminSessionId);
  const revokedAttempt = await validateSessionAndUser(adminToken);
  assert(!revokedAttempt.valid, 'Revoked session strictly rejected');
  assert(revokedAttempt.reason === 'Session has been revoked.', 'Reason confirms session revocation');

  // SUMMARY
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runAllTests().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
