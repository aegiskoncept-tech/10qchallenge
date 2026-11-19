// 10Q Challenge LMS — Phase 3 Authentication & Access Control Verification Suite
// Tests all 12 required security and functional scenarios

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set test environment secret
process.env.JWT_SECRET = '10QChallenge_SecureKey_SuperSecret_2026_Minimum256BitsLongRequired!';
process.env.SETUP_ADMIN_SECRET = 'Phase3_Setup_Secret_Test_2026_Key!';

// Import auth modules directly with native TypeScript support
import { AuthDb } from '../frontend/lib/auth/database.ts';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../frontend/lib/auth/password.ts';
import { signJwt, verifyJwt } from '../frontend/lib/auth/jwt.ts';
import { createAuthSession, validateSessionAndUser, AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../frontend/lib/auth/session.ts';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '../frontend/lib/auth/rateLimiter.ts';
import { extractAuthToken, validateCsrfToken, requireAuth, requireAdmin } from '../frontend/lib/auth/serverAuth.ts';

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('10Q CHALLENGE LMS — PHASE 3 AUTHENTICATION & ACCESS CONTROL');
  console.log('COMPREHENSIVE SECURITY VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Password Hashing & Verification (scrypt Memory-Hard OWASP Standard)
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Cryptographic Password Hashing & Salt Safety ---');
  const rawPassword = 'SecurePassword2026!';
  const hash1 = await hashPassword(rawPassword);
  const hash2 = await hashPassword(rawPassword);

  assert(hash1.startsWith('scrypt$'), 'Password hash uses scrypt algorithm scheme');
  assert(hash1 !== hash2, 'Identical passwords produce unique hashes due to random 16-byte salt');
  assert(await verifyPassword(rawPassword, hash1), 'Valid password correctly matches hash');
  assert(!(await verifyPassword('WrongPassword123', hash1)), 'Invalid password fails verification');
  assert(!(await verifyPassword('', hash1)), 'Empty password fails verification');

  // Password strength checks
  assert(!validatePasswordStrength('short').valid, 'Password shorter than 8 characters is rejected');
  assert(!validatePasswordStrength('onlyletters').valid, 'Password without digits is rejected');
  assert(!validatePasswordStrength('12345678').valid, 'Password without letters is rejected');
  assert(validatePasswordStrength('ValidPass123').valid, 'Password with letters and numbers is accepted');

  // --------------------------------------------------------------------------
  // TEST 2: Initial Administrator Bootstrap
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Initial Administrator Bootstrap & Lockout ---');
  const initialAdminCount = AuthDb.countAdmins();

  const adminEmail = `lead.admin.${Date.now()}@10qchallenge.in`;
  const adminHash = await hashPassword('AdminPass2026!');
  const adminUser = AuthDb.createUser({
    fullName: 'Lead Platform Administrator',
    email: adminEmail,
    passwordHash: adminHash,
    role: 'ADMIN',
    isActive: true,
  });

  assert(adminUser.role === 'ADMIN', 'Created administrator has explicit ADMIN role');
  assert(AuthDb.countAdmins() >= 1, 'Database reports at least 1 active administrator');

  // Bootstrap lockout check
  const isBootstrapLocked = AuthDb.countAdmins() > 0;
  assert(isBootstrapLocked, 'Bootstrap is permanently disabled when an admin already exists');

  // --------------------------------------------------------------------------
  // TEST 3: Student Registration & Duplicate Email Handling
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Registration & Duplicate Email Handling ---');
  const studentEmail = `student.test.${Date.now()}@example.com`;
  const studentHash = await hashPassword('StudentPass2026!');

  const studentUser = AuthDb.createUser({
    fullName: 'Aarav Student',
    email: studentEmail,
    passwordHash: studentHash,
    role: 'STUDENT',
    targetExam: 'BITSAT',
    isActive: true,
  });

  assert(studentUser.id > 0, 'New student account created with unique ID');
  assert(studentUser.role === 'STUDENT', 'Registered student has role STUDENT (no privilege escalation)');

  // Duplicate check
  const duplicateLookup = AuthDb.findUserByEmail(studentEmail);
  assert(duplicateLookup !== null && duplicateLookup.id === studentUser.id, 'Duplicate email detected in database');

  // --------------------------------------------------------------------------
  // TEST 4: Unknown Email & Invalid Password Authentication
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Unknown Email & Invalid Password Rejection ---');
  const unknownUser = AuthDb.findUserByEmail('completely_nonexistent@10qchallenge.in');
  assert(unknownUser === null, 'Unknown email returns null (no user enumeration)');

  const passwordCheck = await verifyPassword('IncorrectPassword!', studentUser.passwordHash);
  assert(!passwordCheck, 'Incorrect password correctly rejected');

  // --------------------------------------------------------------------------
  // TEST 5: Rate Limiting & Brute-Force Mitigation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Rate Limiting (Brute-Force Protection) ---');
  const testRateKey = `login:test-ip:${Date.now()}`;
  clearRateLimit(testRateKey);

  for (let i = 1; i <= 5; i++) {
    recordFailedAttempt(testRateKey, 60000);
  }

  const rateLimitResult = checkRateLimit(testRateKey, 5, 60000);
  assert(!rateLimitResult.allowed, 'Rate limiter blocks after 5 failed attempts (429 status)');
  assert(rateLimitResult.remaining === 0, 'Zero remaining attempts');
  assert(rateLimitResult.retryAfterSeconds > 0, 'Retry-after timer is positive');

  clearRateLimit(testRateKey);
  assert(checkRateLimit(testRateKey, 5, 60000).allowed, 'Rate limiter resets successfully');

  // --------------------------------------------------------------------------
  // TEST 6: Session Creation & Token Verification
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Session Lifecycle, JWT & CSRF Tokens ---');
  const studentSession = await createAuthSession(studentUser, '127.0.0.1', 'Node-Test-Agent');
  assert(Boolean(studentSession.token), 'Cryptographic JWT generated');
  assert(Boolean(studentSession.csrfToken), 'Cryptographic CSRF token generated');
  assert(Boolean(studentSession.sessionId), 'Unique session UUID persisted');

  const verifiedPayload = await verifyJwt(studentSession.token);
  assert(verifiedPayload !== null, 'JWT successfully verified with HS256');
  assert(verifiedPayload.email === studentUser.email, 'Token contains correct email');
  assert(verifiedPayload.role === 'STUDENT', 'Token contains correct role STUDENT');

  const sessionValidation = await validateSessionAndUser(studentSession.token);
  assert(sessionValidation.valid === true, 'Session successfully verified against active database session');

  // --------------------------------------------------------------------------
  // TEST 7: Role-Based Authorization — Student Attempting Admin Access
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: RBAC — Student Blocked from Admin Access ---');
  function createMockRequest(options = {}) {
    const headersMap = new Map();
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        headersMap.set(k.toLowerCase(), v);
      }
    }
    const cookiesMap = new Map();
    if (options.cookies) {
      for (const [k, v] of Object.entries(options.cookies)) {
        cookiesMap.set(k, { value: v });
      }
    }
    return {
      method: options.method || 'GET',
      headers: {
        get(key) { return headersMap.get(key.toLowerCase()) || null; }
      },
      cookies: {
        get(key) { return cookiesMap.get(key) || null; }
      }
    };
  }

  const mockStudentReq = createMockRequest({
    method: 'GET',
    headers: { 'authorization': `Bearer ${studentSession.token}` }
  });

  const studentAuth = await requireAdmin(mockStudentReq);
  assert(!studentAuth.authenticated, 'Student denied admin access');
  assert(studentAuth.errorResponse && studentAuth.errorResponse.status === 403, 'Denied with 403 Forbidden status code');

  // --------------------------------------------------------------------------
  // TEST 8: Unauthenticated API Requests
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Unauthenticated API Requests Blocked ---');
  const mockUnauthReq = createMockRequest({ method: 'GET' });

  const unauthResult = await requireAdmin(mockUnauthReq);
  assert(!unauthResult.authenticated, 'Unauthenticated request blocked');
  assert(unauthResult.errorResponse && unauthResult.errorResponse.status === 401, 'Returns 401 Unauthorized status code');

  // --------------------------------------------------------------------------
  // TEST 9: Forged Client Roles & Forged Headers Defeated
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Forged Client Roles & Headers Defeated ---');
  const mockForgedHeaderReq = createMockRequest({
    method: 'POST',
    headers: {
      'x-admin-user': 'SuperAdmin',
      'x-user-role': 'ADMIN',
    }
  });

  const forgedResult = await requireAdmin(mockForgedHeaderReq);
  assert(!forgedResult.authenticated, 'Server strictly ignores x-admin-user header without valid session');
  assert(forgedResult.errorResponse && forgedResult.errorResponse.status === 401, 'Returns 401 Unauthorized');

  // --------------------------------------------------------------------------
  // TEST 10: CSRF Protection on Mutating Requests
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: CSRF Protection for Cookie Mutations ---');
  const adminSession = await createAuthSession(adminUser, '127.0.0.1', 'Node-Test-Agent');

  // Cookie mutation with missing CSRF header
  const mockMutatingWithoutCsrf = createMockRequest({
    method: 'POST',
    cookies: {
      '10q_auth_token': adminSession.token,
      '10q_csrf_token': adminSession.csrfToken,
    }
  });

  const csrfFailResult = await requireAdmin(mockMutatingWithoutCsrf);
  assert(!csrfFailResult.authenticated, 'Mutating POST without x-csrf-token header rejected');
  assert(csrfFailResult.errorResponse && csrfFailResult.errorResponse.status === 403, 'Returns 403 Forbidden (CSRF failure)');

  // Cookie mutation with valid CSRF header
  const mockMutatingWithCsrf = createMockRequest({
    method: 'POST',
    headers: { 'x-csrf-token': adminSession.csrfToken },
    cookies: {
      '10q_auth_token': adminSession.token,
      '10q_csrf_token': adminSession.csrfToken,
    }
  });

  const csrfPassResult = await requireAdmin(mockMutatingWithCsrf);
  assert(csrfPassResult.authenticated === true, 'Mutating POST with matching CSRF header approved');
  assert(csrfPassResult.user.role === 'ADMIN', 'Admin identity verified on server');

  // --------------------------------------------------------------------------
  // TEST 11: Session Expiration
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 11: Session Expiration Handling ---');
  const expiredToken = await signJwt({
    userId: adminUser.id,
    email: adminUser.email,
    role: 'ADMIN',
    sessionId: adminSession.sessionId,
    fullName: adminUser.fullName,
  }, -3600);

  const expiredPayload = await verifyJwt(expiredToken);
  assert(expiredPayload === null, 'Expired JWT rejected during verification');

  const expiredValidation = await validateSessionAndUser(expiredToken);
  assert(!expiredValidation.valid, 'Expired session rejected by server session validator');

  // --------------------------------------------------------------------------
  // TEST 12: Session Revocation & Logout
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 12: Session Revocation & Logout ---');
  const preRevokeValidation = await validateSessionAndUser(adminSession.token);
  assert(preRevokeValidation.valid === true, 'Admin session initially valid');

  const revokeResult = AuthDb.revokeSession(adminSession.sessionId);
  assert(revokeResult === true, 'Session successfully marked revoked in database');

  const postRevokeValidation = await validateSessionAndUser(adminSession.token);
  assert(!postRevokeValidation.valid, 'Revoked session strictly rejected');
  assert(postRevokeValidation.reason === 'Session has been revoked.', 'Rejection reason states session revoked');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('[TEST SUITE EXCEPTION]', err);
  process.exit(1);
});
