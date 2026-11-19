// Live HTTP Integration Verification against running Next.js server on port 3000

async function testRunningServer() {
  console.log('\n================================================================');
  console.log('LIVE RUNNING SERVER HTTP VERIFICATION (http://localhost:3000)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? '— ' + details : ''}`);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:3000';

  // Helper to extract cookies from fetch response
  function getCookieHeader(response) {
    const rawHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    if (rawHeaders.length > 0) {
      return rawHeaders.map(c => c.split(';')[0]).join('; ');
    }
    const single = response.headers.get('set-cookie');
    return single ? single.split(';')[0] : '';
  }

  function getCookieValue(cookieStr, name) {
    const match = cookieStr.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  }

  // --------------------------------------------------------------------------
  // TEST 1: Unauthenticated request to /api/admin/courses
  // --------------------------------------------------------------------------
  console.log('--- 1. Testing Unauthenticated Access to Admin API ---');
  const res1 = await fetch(`${BASE_URL}/api/admin/courses`);
  const body1 = await res1.json();
  assert(res1.status === 401, 'Unauthenticated GET /api/admin/courses returns 401', `Got status ${res1.status}`);
  assert(body1.success === false, 'Response body contains success: false');

  // --------------------------------------------------------------------------
  // TEST 2: Forged x-admin-user and x-user-role headers
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Forged Headers Impersonation Defeat ---');
  const res2 = await fetch(`${BASE_URL}/api/admin/courses`, {
    headers: {
      'x-admin-user': 'Administrator',
      'x-user-role': 'ADMIN',
      'x-authenticated': 'true',
    }
  });
  assert(res2.status === 401, 'Forged header request strictly rejected with 401', `Got status ${res2.status}`);

  // --------------------------------------------------------------------------
  // TEST 3: Login with Invalid Password
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Login with Invalid Password ---');
  const res3 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.admin@10qchallenge.in', password: 'WrongPassword123' })
  });
  const body3 = await res3.json();
  assert(res3.status === 401, 'Invalid password returns 401 Unauthorized', `Got status ${res3.status}`);
  assert(body3.error === 'Invalid email or password.', 'Generic error message returned (no credential leakage)');

  // --------------------------------------------------------------------------
  // TEST 4: Login with Unknown Email
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Login with Unknown Email ---');
  const res4 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'unknown.user.99@10qchallenge.in', password: 'SomePassword123' })
  });
  assert(res4.status === 401, 'Unknown email returns 401 Unauthorized', `Got status ${res4.status}`);

  // --------------------------------------------------------------------------
  // TEST 5: Student Login & Student Role Enforcement
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Student Login & Privilege Boundaries ---');
  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' })
  });
  assert(studentLoginRes.status === 200, 'Student login returns 200 OK');
  const studentLoginBody = await studentLoginRes.json();
  assert(studentLoginBody.user.role === 'STUDENT', 'Authenticated student has role STUDENT');

  const studentCookies = getCookieHeader(studentLoginRes);
  assert(studentCookies.includes('10q_auth_token='), 'HTTP-Only session cookie issued to student');

  // Attempt to access admin API using student session cookie
  const studentAdminAttempt = await fetch(`${BASE_URL}/api/admin/courses`, {
    headers: {
      'Cookie': studentCookies,
    }
  });
  assert(studentAdminAttempt.status === 403, 'Student cookie accessing /api/admin/courses returns 403 Forbidden', `Got status ${studentAdminAttempt.status}`);

  // --------------------------------------------------------------------------
  // TEST 6: Admin Login & Authorized Access
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Testing Admin Login & Authorized Access ---');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test.admin@10qchallenge.in', password: 'AdminPass2026!' })
  });
  assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
  const adminLoginBody = await adminLoginRes.json();
  assert(adminLoginBody.user.role === 'ADMIN', 'Authenticated admin has role ADMIN');

  const adminCookies = getCookieHeader(adminLoginRes);
  const csrfToken = getCookieValue(adminCookies, '10q_csrf_token') || adminLoginBody.csrfToken;
  assert(Boolean(csrfToken), 'CSRF token issued');

  // Access admin API using admin session cookie
  const adminApiRes = await fetch(`${BASE_URL}/api/admin/courses`, {
    headers: {
      'Cookie': adminCookies,
    }
  });
  assert(adminApiRes.status === 200, 'Admin cookie accessing /api/admin/courses returns 200 OK', `Got status ${adminApiRes.status}`);
  const adminApiBody = await adminApiRes.json();
  assert(adminApiBody.success === true, 'Admin API returned success: true');

  // --------------------------------------------------------------------------
  // TEST 7: CSRF Protection on Mutating Requests
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Testing Live CSRF Protection on Mutating Requests ---');
  // Mutating POST without CSRF header
  const mutatingNoCsrf = await fetch(`${BASE_URL}/api/admin/courses`, {
    method: 'POST',
    headers: {
      'Cookie': adminCookies,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: 'Unauthorized Course' })
  });
  assert(mutatingNoCsrf.status === 403, 'Mutating POST without x-csrf-token returns 403 Forbidden', `Got status ${mutatingNoCsrf.status}`);

  // Mutating POST with valid CSRF header (validation passes authorization gate)
  const mutatingWithCsrf = await fetch(`${BASE_URL}/api/admin/courses`, {
    method: 'POST',
    headers: {
      'Cookie': adminCookies,
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ title: '' }) // deliberately empty to verify it passed auth and reached validation
  });
  // If it passed auth and reached body validation, it will return 400 Bad Request ("Title is required") or similar, NOT 401 or 403!
  assert(mutatingWithCsrf.status !== 401 && mutatingWithCsrf.status !== 403, 'Mutating POST with matching CSRF passes auth check', `Got status ${mutatingWithCsrf.status}`);

  // --------------------------------------------------------------------------
  // TEST 8: Session Restoration (/api/auth/me)
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Testing Session Restoration (/api/auth/me) ---');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': adminCookies }
  });
  assert(meRes.status === 200, 'GET /api/auth/me with cookie returns 200 OK');
  const meBody = await meRes.json();
  assert(meBody.authenticated === true && meBody.user.role === 'ADMIN', 'Session restored correctly for admin');

  // --------------------------------------------------------------------------
  // TEST 9: Session Revocation & Logout
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Testing Session Revocation & Logout ---');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': adminCookies }
  });
  assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');

  // Attempt using the logged-out admin cookie
  const postLogoutMe = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': adminCookies }
  });
  assert(postLogoutMe.status === 401, 'Logged-out session rejected with 401 on /api/auth/me', `Got status ${postLogoutMe.status}`);

  const postLogoutAdminApi = await fetch(`${BASE_URL}/api/admin/courses`, {
    headers: { 'Cookie': adminCookies }
  });
  assert(postLogoutAdminApi.status === 401, 'Logged-out session rejected on /api/admin/courses', `Got status ${postLogoutAdminApi.status}`);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`LIVE SERVER TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

testRunningServer().catch(err => {
  console.error('[LIVE SERVER TEST EXCEPTION]', err);
  process.exit(1);
});
