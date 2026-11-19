// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 2.1: STUDENT TEST PAPER & LISTING VERIFICATION
// ==============================================================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCookieHeader(response) {
  const rawHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (rawHeaders.length > 0) {
    return rawHeaders.map((c) => c.split(';')[0]).join('; ');
  }
  const single = response.headers.get('set-cookie');
  return single ? single.split(';')[0] : '';
}

async function probeUrl(url, options = {}) {
  const startTime = Date.now();
  try {
    const res = await fetch(url, options);
    const latency = Date.now() - startTime;
    let json = null;
    let text = '';
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        json = await res.json();
      } catch (e) {
        text = await res.text();
      }
    } else {
      text = await res.text();
    }
    return {
      ok: res.ok,
      status: res.status,
      contentType,
      latency,
      json,
      text,
      headers: res.headers,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      latency: Date.now() - startTime,
      error: err,
    };
  }
}

async function runStudentTestSeriesTests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 2.1 STUDENT TEST SERIES SUITE');
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

  // --- PART 1: DATA-ACCESS LAYER AUDIT ---
  console.log('--- 1. Data-Access Layer & Authoritative Storage Audit ---');
  const dataPath = path.join(process.cwd(), 'data', 'test-series.json');
  assert(fs.existsSync(dataPath), 'data/test-series.json exists in root storage');

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  assert(Array.isArray(rawData) && rawData.length >= 4, `Authoritative test store has ${rawData.length} records`);
  assert(rawData.every((t) => t.id && t.title && t.durationMinutes && t.totalMarks), 'All test records have required core fields');

  // --- PART 2: SERVER LIFECYCLE & LIVE HTTP PROBING ---
  console.log('\n--- 2. Spawning Local Next.js Server (Port 3000) ---');
  let spawnedServer = false;
  let serverProcess = null;

  // Check if server is already running
  const initialProbe = await probeUrl('http://localhost:3000/');
  if (initialProbe.status === 200) {
    console.log('  ✓ Existing active server detected on port 3000');
  } else {
    console.log('  Starting server via node server.js...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    spawnedServer = true;

    let ready = false;
    for (let attempt = 1; attempt <= 30; attempt++) {
      await wait(1000);
      const probe = await probeUrl('http://localhost:3000/');
      if (probe.status > 0) {
        ready = true;
        console.log(`  ✓ Server reachable on attempt ${attempt}`);
        break;
      }
    }
    if (!ready) {
      console.error('  ✗ Timed out waiting for server to start.');
      if (serverProcess) serverProcess.kill('SIGTERM');
      process.exit(1);
    }
  }

  try {
    const BASE_URL = 'http://localhost:3000';

    // TEST 1: Unauthenticated request to student tests API
    console.log('\n--- 3. Testing Access Control & Security Guards ---');
    const unauthList = await probeUrl(`${BASE_URL}/api/student/tests`);
    assert(unauthList.status === 401, 'Unauthenticated GET /api/student/tests returns 401 Unauthorized', `Got ${unauthList.status}`);

    const unauthDetail = await probeUrl(`${BASE_URL}/api/student/tests/1`);
    assert(unauthDetail.status === 401, 'Unauthenticated GET /api/student/tests/1 returns 401 Unauthorized', `Got ${unauthDetail.status}`);

    // TEST 2: Authenticate Student
    console.log('\n--- 4. Authenticating Student Session ---');
    const studentLogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    assert(studentLogin.status === 200, 'Student authenticated successfully (HTTP 200)');
    assert(studentLogin.json?.user?.role === 'STUDENT', 'User role is STUDENT');

    const studentCookie = getCookieHeader(studentLogin);
    assert(studentCookie.includes('10q_auth_token='), 'HTTP-Only session cookie issued to student');

    // TEST 3: Authenticated Fetch of Test Papers
    console.log('\n--- 5. Testing Student Test Papers Retrieval & Filtering ---');
    const authListRes = await probeUrl(`${BASE_URL}/api/student/tests`, {
      headers: { Cookie: studentCookie },
    });
    assert(authListRes.status === 200, 'Authenticated GET /api/student/tests returns 200 OK');
    assert(authListRes.json?.success === true, 'Response body success is true');
    assert(Array.isArray(authListRes.json?.data) && authListRes.json.data.length >= 4, `Retrieved ${authListRes.json?.data?.length} published test papers`);

    // Verify first test paper contract
    const firstTest = authListRes.json.data[0];
    assert(firstTest.id !== undefined && firstTest.title && firstTest.examTag, 'Test paper contains id, title, and examTag');
    assert(firstTest.durationMinutes > 0 && firstTest.totalQuestions > 0 && firstTest.totalMarks > 0, 'Test paper contains valid duration, questions, and marks');

    // TEST 4: Search and Exam Filtering
    const searchRes = await probeUrl(`${BASE_URL}/api/student/tests?search=BITSAT`, {
      headers: { Cookie: studentCookie },
    });
    assert(searchRes.status === 200, 'GET /api/student/tests?search=BITSAT returns 200 OK');
    assert(searchRes.json.data.every((t) => t.title.includes('BITSAT') || t.examTag.includes('BITSAT')), 'Search results match query');

    // TEST 5: Empty Filter State
    const emptyRes = await probeUrl(`${BASE_URL}/api/student/tests?search=NonExistentQueryXYZ123`, {
      headers: { Cookie: studentCookie },
    });
    assert(emptyRes.status === 200, 'Non-matching search returns 200 OK with empty array');
    assert(emptyRes.json.count === 0 && emptyRes.json.data.length === 0, 'Empty state handled gracefully with count 0');

    // TEST 6: Invalid Test Paper ID Handling
    console.log('\n--- 6. Testing Test Paper Detail & Boundary Conditions ---');
    const invalidIdRes = await probeUrl(`${BASE_URL}/api/student/tests/invalid-id`, {
      headers: { Cookie: studentCookie },
    });
    assert(invalidIdRes.status === 400, 'Invalid alphanumeric ID returns 400 Bad Request', `Got ${invalidIdRes.status}`);

    const negativeIdRes = await probeUrl(`${BASE_URL}/api/student/tests/-5`, {
      headers: { Cookie: studentCookie },
    });
    assert(negativeIdRes.status === 400, 'Negative ID returns 400 Bad Request', `Got ${negativeIdRes.status}`);

    // TEST 7: Non-Existent Test Paper ID
    const notFoundRes = await probeUrl(`${BASE_URL}/api/student/tests/999999`, {
      headers: { Cookie: studentCookie },
    });
    assert(notFoundRes.status === 404, 'Non-existent ID returns 404 Not Found', `Got ${notFoundRes.status}`);
    assert(notFoundRes.json.success === false, 'Error response body indicates failure');

    // TEST 8: Valid Test Paper Detail Retrieval
    const validDetailRes = await probeUrl(`${BASE_URL}/api/student/tests/1`, {
      headers: { Cookie: studentCookie },
    });
    assert(validDetailRes.status === 200, 'Valid GET /api/student/tests/1 returns 200 OK');
    assert(validDetailRes.json.data?.id === 1, 'Retrieved exact test paper ID 1');
    assert(validDetailRes.json.data?.title === 'BITSAT 2026 Full Syllabus CBT Mock 01', 'Test paper title matches stored record');

    // TEST 9: Answer Key & Security Leakage Prevention
    console.log('\n--- 7. Verifying Answer Key & Sensitive Data Protection ---');
    const payloadStr = JSON.stringify(validDetailRes.json);
    assert(!payloadStr.includes('correctOption'), 'Response strictly excludes correctOption');
    assert(!payloadStr.includes('answerKey'), 'Response strictly excludes answerKey');
    assert(!payloadStr.includes('createdBy'), 'Internal audit fields (createdBy) excluded from student response');

    // TEST 10: SSR Page Probing
    console.log('\n--- 8. Testing Student Web Pages Loading ---');
    const testsHubPage = await probeUrl(`${BASE_URL}/student/tests`);
    assert(testsHubPage.status === 200, 'GET /student/tests loads successfully (HTTP 200)');

    const testDetailPage = await probeUrl(`${BASE_URL}/student/tests/1`);
    assert(testDetailPage.status === 200, 'GET /student/tests/1 loads successfully (HTTP 200)');

    const testNotFoundPage = await probeUrl(`${BASE_URL}/student/tests/99999`);
    assert(testNotFoundPage.status === 200, 'GET /student/tests/99999 renders graceful not-found state without crashing');
  } finally {
    if (spawnedServer && serverProcess) {
      console.log('\nStopping spawned test server...');
      serverProcess.kill('SIGTERM');
      await wait(1000);
    }
  }

  console.log('\n================================================================');
  console.log(`FEATURE 2.1 SUITE RESULT: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runStudentTestSeriesTests().catch((err) => {
  console.error('[TEST EXCEPTION]', err);
  process.exit(1);
});
