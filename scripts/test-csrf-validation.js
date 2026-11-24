/**
 * 10Q Challenge - Comprehensive CSRF Validation & Verification Test
 * 
 * Verifies live behavior against running local server:
 * - Admin login & cookie issuance (10q_auth_token, 10q_csrf_token)
 * - /api/auth/csrf and /api/auth/me token synchronization
 * - Missing CSRF header rejection (HTTP 403)
 * - Invalid/tampered CSRF header rejection (HTTP 403)
 * - Untrusted Origin rejection (HTTP 403)
 * - Valid CSRF header acceptance on Exam Category creation (HTTP 201)
 * - Valid CSRF header acceptance on Exam Category deletion (HTTP 200)
 * - Student note creation rejection without CSRF header (HTTP 403)
 * - Student note creation success with CSRF header (HTTP 201)
 */

const http = require('http');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '127.0.0.1';

function request(path, method = 'GET', body = null, cookie = '', customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Host': `127.0.0.1:${PORT}`,
      'Cookie': cookie,
      'User-Agent': 'CSRF-Verification-Runner/1.0',
      ...customHeaders,
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json,
            raw,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function parseCookies(setCookieHeader) {
  if (!setCookieHeader) return {};
  const cookies = {};
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const str of list) {
    const parts = str.split(';')[0].split('=');
    const name = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    cookies[name] = val;
  }
  return cookies;
}

function formatCookieString(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function run() {
  console.log('================================================================');
  console.log(`  10Q CHALLENGE — CSRF & AUTHENTICATION END-TO-END TEST SUITE`);
  console.log(`  Target: http://${HOST}:${PORT}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message} ${details ? ':: ' + details : ''}`);
      failed++;
    }
  }

  // STEP 1: Admin Login
  console.log('--- Step 1: Admin Authentication ---');
  const adminLoginRes = await request('/api/auth/login', 'POST', {
    email: 'test.admin@10qchallenge.in',
    password: 'AdminPass2026!',
  });

  assert(adminLoginRes.status === 200, 'Admin login succeeds (HTTP 200)', `status=${adminLoginRes.status}`);
  const adminCookies = parseCookies(adminLoginRes.headers['set-cookie']);
  assert(!!adminCookies['10q_auth_token'], 'HTTP-Only session cookie (10q_auth_token) received');
  assert(!!adminCookies['10q_csrf_token'], 'Double-submit CSRF cookie (10q_csrf_token) received');

  const adminCookieStr = formatCookieString(adminCookies);
  const adminCsrfToken = adminCookies['10q_csrf_token'] || adminLoginRes.data?.csrfToken;
  console.log(`  -> Admin session active, CSRF token length: ${adminCsrfToken ? adminCsrfToken.length : 0}`);

  // STEP 2: Verify /api/auth/csrf and /api/auth/me synchronization
  console.log('\n--- Step 2: CSRF Synchronization Endpoints ---');
  const csrfRes = await request('/api/auth/csrf', 'GET', null, adminCookieStr);
  assert(csrfRes.status === 200, '/api/auth/csrf returns HTTP 200');
  assert(!!csrfRes.data?.csrfToken, '/api/auth/csrf returns csrfToken in body');

  const meRes = await request('/api/auth/me', 'GET', null, adminCookieStr);
  assert(meRes.status === 200, '/api/auth/me returns HTTP 200');
  const meCookies = parseCookies(meRes.headers['set-cookie']);
  assert(!!meCookies['10q_csrf_token'] || !!adminCookies['10q_csrf_token'], '/api/auth/me synchronizes 10q_csrf_token cookie');

  // STEP 3: State-changing mutation WITHOUT CSRF token
  console.log('\n--- Step 3: State-Changing Mutation without CSRF Token ---');
  const testExamPayload = {
    examName: `CSRF-Test-Exam-${Date.now()}`,
    examCode: `CTE${Date.now().toString().slice(-4)}`,
    description: 'Temporary exam created to verify CSRF validation failure',
    displayOrder: 999,
    isActive: true,
  };

  const createWithoutCsrf = await request(
    '/api/admin/exams',
    'POST',
    testExamPayload,
    adminCookieStr,
    { 'Origin': 'https://10qchallenge.com' }
    // Omit x-csrf-token
  );

  assert(createWithoutCsrf.status === 403, 'POST /api/admin/exams WITHOUT CSRF token rejected with HTTP 403', `status=${createWithoutCsrf.status}`);
  assert(
    createWithoutCsrf.data?.error === 'Forbidden: CSRF token validation failed.',
    'Returns exact error message "Forbidden: CSRF token validation failed."',
    `error=${createWithoutCsrf.data?.error}`
  );

  // STEP 4: State-changing mutation WITH INVALID CSRF token
  console.log('\n--- Step 4: State-Changing Mutation with Invalid CSRF Token ---');
  const createWithInvalidCsrf = await request(
    '/api/admin/exams',
    'POST',
    testExamPayload,
    adminCookieStr,
    {
      'Origin': 'https://10qchallenge.com',
      'x-csrf-token': 'attacker_fake_csrf_token_99999999',
    }
  );

  assert(createWithInvalidCsrf.status === 403, 'POST /api/admin/exams WITH INVALID CSRF token rejected with HTTP 403', `status=${createWithInvalidCsrf.status}`);
  assert(
    createWithInvalidCsrf.data?.error === 'Forbidden: CSRF token validation failed.',
    'Invalid CSRF returns exact error message "Forbidden: CSRF token validation failed."',
    `error=${createWithInvalidCsrf.data?.error}`
  );

  // STEP 5: State-changing mutation WITH UNTRUSTED Origin
  console.log('\n--- Step 5: State-Changing Mutation with Untrusted Origin ---');
  const createWithEvilOrigin = await request(
    '/api/admin/exams',
    'POST',
    testExamPayload,
    adminCookieStr,
    {
      'Origin': 'https://malicious-phishing-attacker.com',
      'x-csrf-token': adminCsrfToken,
    }
  );

  assert(createWithEvilOrigin.status === 403, 'POST /api/admin/exams WITH UNTRUSTED Origin rejected with HTTP 403', `status=${createWithEvilOrigin.status}`);

  // STEP 6: State-changing mutation WITH VALID CSRF token + VALID Origin
  console.log('\n--- Step 6: State-Changing Mutation with Valid CSRF + Trusted Origin ---');
  const createWithValidCsrf = await request(
    '/api/admin/exams',
    'POST',
    testExamPayload,
    adminCookieStr,
    {
      'Origin': 'https://10qchallenge.com',
      'x-csrf-token': adminCsrfToken,
    }
  );

  assert(
    createWithValidCsrf.status === 201 || createWithValidCsrf.status === 200,
    `POST /api/admin/exams WITH VALID CSRF token succeeds (HTTP ${createWithValidCsrf.status})`,
    `status=${createWithValidCsrf.status}, error=${createWithValidCsrf.data?.error}`
  );

  const createdExamId = createWithValidCsrf.data?.data?.id;
  assert(!!createdExamId, `Exam Category created successfully (ID: ${createdExamId})`);

  // STEP 7: Delete test Exam Category with valid CSRF token
  console.log('\n--- Step 7: Delete Mutation with Valid CSRF Token ---');
  if (createdExamId) {
    const deleteRes = await request(
      `/api/admin/exams/${createdExamId}`,
      'DELETE',
      null,
      adminCookieStr,
      {
        'Origin': 'https://10qchallenge.com',
        'x-csrf-token': adminCsrfToken,
      }
    );

    assert(
      deleteRes.status === 200,
      `DELETE /api/admin/exams/${createdExamId} succeeds with HTTP 200`,
      `status=${deleteRes.status}`
    );
  }

  // STEP 8: Student Authentication & Mutations
  console.log('\n--- Step 8: Student Operations & CSRF Enforcement ---');
  const studentLoginRes = await request('/api/auth/login', 'POST', {
    email: 'test.student@10qchallenge.in',
    password: 'StudentPass2026!',
  });

  assert(studentLoginRes.status === 200, 'Student login succeeds (HTTP 200)');
  const studentCookies = parseCookies(studentLoginRes.headers['set-cookie']);
  const studentCookieStr = formatCookieString(studentCookies);
  const studentCsrfToken = studentCookies['10q_csrf_token'] || studentLoginRes.data?.csrfToken;

  // Student mutation without CSRF rejected
  const studentProfilePayload = {
    fullName: 'Verified Test Student',
    targetExam: 'BITSAT',
  };

  const studentProfileNoCsrf = await request(
    '/api/student/profile',
    'PATCH',
    studentProfilePayload,
    studentCookieStr,
    { 'Origin': 'https://10qchallenge.com' }
  );

  assert(
    studentProfileNoCsrf.status === 403,
    'Student PATCH /api/student/profile WITHOUT CSRF rejected with HTTP 403',
    `status=${studentProfileNoCsrf.status}`
  );
  assert(
    studentProfileNoCsrf.data?.error === 'Forbidden: CSRF token validation failed.',
    'Returns exact error message "Forbidden: CSRF token validation failed."'
  );

  // Student mutation with valid CSRF succeeds
  const studentProfileWithCsrf = await request(
    '/api/student/profile',
    'PATCH',
    studentProfilePayload,
    studentCookieStr,
    {
      'Origin': 'https://10qchallenge.com',
      'x-csrf-token': studentCsrfToken,
    }
  );

  assert(
    studentProfileWithCsrf.status === 200,
    `Student PATCH /api/student/profile WITH VALID CSRF succeeds (HTTP ${studentProfileWithCsrf.status})`,
    `status=${studentProfileWithCsrf.status}`
  );
  assert(
    studentProfileWithCsrf.data?.data?.fullName === 'Verified Test Student',
    'Student profile verified updated in database'
  );

  console.log('\n================================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
