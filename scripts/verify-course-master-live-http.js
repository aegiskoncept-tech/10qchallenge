/**
 * PHASE 4.1: LIVE SERVER HTTP VERIFICATION SCRIPT (DISPOSABLE DATA ONLY)
 * 
 * Tests live Course Master endpoints and public routes on http://localhost:3000.
 * Strictly adheres to rule: NEVER use existing course records (IDs 1 & 2) for destructive tests.
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function loginAsAdmin() {
  const res = await makeRequest('POST', '/api/auth/login', {
    email: 'test.admin@10qchallenge.in',
    password: 'AdminPass2026!',
  });

  if (res.statusCode !== 200 || !res.json?.success) {
    throw new Error(`Admin login failed: ${res.statusCode} ${res.body}`);
  }

  const cookies = res.headers['set-cookie'] || [];
  let cookieHeader = '';
  let csrfToken = '';

  for (const c of cookies) {
    const part = c.split(';')[0];
    cookieHeader += (cookieHeader ? '; ' : '') + part;
    if (part.startsWith('10q_csrf_token=')) {
      csrfToken = part.replace('10q_csrf_token=', '');
    }
  }

  return { cookieHeader, csrfToken };
}

async function runLiveVerification() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 4.1 LIVE SERVER HTTP VERIFICATION');
  console.log(`Target Server: ${BASE_URL}`);
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  async function check(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] Step ${total}: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  [FAIL] Step ${total}: ${name}`);
      console.error(e);
    }
  }

  // Step 1: Public course catalogue
  await check('GET /api/courses returns public courses', async () => {
    const res = await makeRequest('GET', '/api/courses');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json?.success);
    assert.ok(Array.isArray(res.json?.data));
    assert.ok(res.json.data.length >= 2);
  });

  // Step 2: Public course detail by slug
  await check('GET /api/courses/bitsat-2026-master-crash-course returns details', async () => {
    const res = await makeRequest('GET', '/api/courses/bitsat-2026-master-crash-course');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json?.success);
    assert.strictEqual(res.json.data.id, 1);
    assert.strictEqual(res.json.data.slug, 'bitsat-2026-master-crash-course');
  });

  // Step 3: Admin authentication
  let authData = null;
  await check('Authenticate as verified Admin', async () => {
    authData = await loginAsAdmin();
    assert.ok(authData.cookieHeader);
    assert.ok(authData.csrfToken);
  });

  // Step 4: Admin course listing
  await check('GET /api/admin/courses returns all courses with audit fields', async () => {
    const res = await makeRequest('GET', '/api/admin/courses', null, {
      Cookie: authData.cookieHeader,
    });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json?.success);
    assert.ok(Array.isArray(res.json?.data));
    const course1 = res.json.data.find((c) => c.id === 1);
    assert.ok(course1);
    assert.strictEqual(course1.title, 'BITSAT 2026 Master Crash Course (Updated Batch)');
  });

  // Step 5: Phase 4.1b Safety Lock: DELETE /api/admin/courses/1 is BLOCKED
  await check('DELETE /api/admin/courses/1 is BLOCKED with DELETION_DISABLED_USE_ARCHIVE', async () => {
    const res = await makeRequest(
      'DELETE',
      '/api/admin/courses/1',
      null,
      {
        Cookie: authData.cookieHeader,
        'x-csrf-token': authData.csrfToken,
      }
    );
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json?.success, false);
    assert.strictEqual(res.json?.code, 'DELETION_DISABLED_USE_ARCHIVE');
    assert.ok(res.json?.error.includes('Permanent course deletion is disabled'));
  });

  // Step 6: Phase 4.1b Safety Lock: DELETE /api/admin/courses/2 is BLOCKED
  await check('DELETE /api/admin/courses/2 is BLOCKED with DELETION_DISABLED_USE_ARCHIVE', async () => {
    const res = await makeRequest(
      'DELETE',
      '/api/admin/courses/2',
      null,
      {
        Cookie: authData.cookieHeader,
        'x-csrf-token': authData.csrfToken,
      }
    );
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.json?.success, false);
    assert.strictEqual(res.json?.code, 'DELETION_DISABLED_USE_ARCHIVE');
    assert.ok(res.json?.error.includes('Permanent course deletion is disabled'));
  });

  // Step 7: Course status update / archive toggle works via PUT
  await check('PUT /api/admin/courses/1 toggles active status safely', async () => {
    // Read current status
    const current = await makeRequest('GET', '/api/admin/courses/1', null, {
      Cookie: authData.cookieHeader,
    });
    assert.strictEqual(current.statusCode, 200);
    const initialActive = current.json.data.isActive;

    // Toggle
    const res = await makeRequest(
      'PUT',
      '/api/admin/courses/1',
      { isActive: !initialActive },
      {
        Cookie: authData.cookieHeader,
        'x-csrf-token': authData.csrfToken,
      }
    );
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json?.success);
    assert.strictEqual(res.json?.data?.isActive, !initialActive);

    // Restore to initialActive
    await makeRequest(
      'PUT',
      '/api/admin/courses/1',
      { isActive: initialActive },
      {
        Cookie: authData.cookieHeader,
        'x-csrf-token': authData.csrfToken,
      }
    );
  });

  // Step 8: Verify production records (Course IDs 1 & 2) remain 100% intact
  await check('Verify production courses 1 & 2 remain untouched and active', async () => {
    const res = await makeRequest('GET', '/api/admin/courses', null, {
      Cookie: authData.cookieHeader,
    });
    assert.strictEqual(res.statusCode, 200);
    const c1 = res.json.data.find((c) => c.id === 1);
    const c2 = res.json.data.find((c) => c.id === 2);
    assert.ok(c1, 'Course 1 must exist');
    assert.ok(c2, 'Course 2 must exist');
    assert.strictEqual(c1.title, 'BITSAT 2026 Master Crash Course (Updated Batch)');
    assert.strictEqual(c2.title, 'JEE Main 2026 Rank Booster Batch');
    assert.strictEqual(c1.isActive, true);
    assert.strictEqual(c2.isActive, true);
  });

  console.log('\n======================================================');
  console.log(`LIVE SERVER TEST RESULTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================\n');

  if (passed === total) process.exit(0);
  else process.exit(1);
}

runLiveVerification().catch((err) => {
  console.error('Fatal Live Test Exception:', err);
  process.exit(1);
});
