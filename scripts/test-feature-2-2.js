// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 2.2: TEST INSTRUCTIONS & SECURE ATTEMPT INITIALIZATION
// Verification & Regression Suite
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

function getCsrfToken(cookieHeader) {
  const match = cookieHeader.match(/10q_csrf_token=([^;]+)/);
  return match ? match[1] : '';
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

async function runFeature22Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 2.2 SECURE ATTEMPT INITIALIZATION SUITE');
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

  // --- PART 1: STORAGE & INTEGRITY AUDIT ---
  console.log('--- 1. Storage & Persistence File Audit ---');
  const attemptsDataPath = path.join(process.cwd(), 'data', 'test-attempts.json');
  if (!fs.existsSync(attemptsDataPath)) {
    fs.writeFileSync(attemptsDataPath, '[]', 'utf-8');
  }
  assert(fs.existsSync(attemptsDataPath), 'data/test-attempts.json storage initialized and accessible');

  const papersDataPath = path.join(process.cwd(), 'data', 'test-series.json');
  assert(fs.existsSync(papersDataPath), 'data/test-series.json canonical paper store exists');
  const originalPapersRaw = fs.readFileSync(papersDataPath, 'utf-8');

  // --- PART 2: SERVER LIFECYCLE ---
  console.log('\n--- 2. Spawning / Verifying Local Server (Port 3000) ---');
  let serverProcess = null;
  let spawnedServer = false;

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

  const BASE_URL = 'http://localhost:3000';

  try {
    // --- PART 3: UNAUTHENTICATED GUARDS ---
    console.log('\n--- 3. Testing Unauthenticated Request Rejection ---');
    const unauthStart = await probeUrl(`${BASE_URL}/api/student/tests/1/start`, { method: 'POST' });
    assert(unauthStart.status === 401, 'Unauthenticated POST /api/student/tests/1/start returns 401 Unauthorized', `Got ${unauthStart.status}`);

    const unauthGetAttempt = await probeUrl(`${BASE_URL}/api/student/tests/attempts/att_dummy_12345`);
    assert(unauthGetAttempt.status === 401, 'Unauthenticated GET /api/student/tests/attempts/[attemptId] returns 401 Unauthorized', `Got ${unauthGetAttempt.status}`);

    // --- PART 4: STUDENT AUTHENTICATION ---
    console.log('\n--- 4. Authenticating Student Sessions (Student A & Student B) ---');
    const studentALogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    assert(studentALogin.status === 200, 'Student A authenticated successfully (HTTP 200)');
    const studentACookie = getCookieHeader(studentALogin);
    const studentACsrf = getCsrfToken(studentACookie);
    const studentAUser = studentALogin.json?.user;
    assert(studentACookie.includes('10q_auth_token='), 'Student A session cookie issued');
    assert(Boolean(studentACsrf), 'Student A CSRF token acquired');

    // Authenticate or register Student B for identity isolation tests
    const studentBEmail = 'student.isolation.test@example.com';
    let studentBLogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentBEmail, password: 'StudentPass2026!' }),
    });

    if (studentBLogin.status !== 200) {
      // Register Student B
      const regRes = await probeUrl(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Student Isolation Test',
          email: studentBEmail,
          password: 'StudentPass2026!',
        }),
      });
      studentBLogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentBEmail, password: 'StudentPass2026!' }),
      });
    }
    assert(studentBLogin.status === 200, 'Student B authenticated successfully (HTTP 200)');
    const studentBCookie = getCookieHeader(studentBLogin);
    const studentBCsrf = getCsrfToken(studentBCookie);
    const studentBUser = studentBLogin.json?.user;
    assert(studentAUser.id !== studentBUser.id, `Student A (ID ${studentAUser.id}) and Student B (ID ${studentBUser.id}) are distinct identities`);

    // Verify CSRF Protection for state mutations
    console.log('\n--- 4b. Testing CSRF Protection for Mutations ---');
    const noCsrfRes = await probeUrl(`${BASE_URL}/api/student/tests/1/start`, {
      method: 'POST',
      headers: { Cookie: studentACookie },
    });
    assert(noCsrfRes.status === 403, 'POST /api/student/tests/1/start without x-csrf-token rejected with 403 Forbidden', `Got ${noCsrfRes.status}`);

    // --- PART 5: INPUT VALIDATION & BOUNDARY GUARDS ---
    console.log('\n--- 5. Input Validation & Edge Case Handling ---');
    const invalidIdRes = await probeUrl(`${BASE_URL}/api/student/tests/abc/start`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
    });
    assert(invalidIdRes.status === 400, 'Non-numeric paper ID returns 400 Bad Request', `Got ${invalidIdRes.status}`);

    const negativeIdRes = await probeUrl(`${BASE_URL}/api/student/tests/-99/start`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
    });
    assert(negativeIdRes.status === 400, 'Negative paper ID returns 400 Bad Request', `Got ${negativeIdRes.status}`);

    const notFoundPaperRes = await probeUrl(`${BASE_URL}/api/student/tests/888888/start`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
    });
    assert(notFoundPaperRes.status === 404, 'Non-existent paper ID returns 404 Not Found', `Got ${notFoundPaperRes.status}`);

    // --- PART 6: UNPUBLISHED PAPER GUARD ---
    console.log('\n--- 6. Unpublished Test Paper Guard ---');
    // Temporarily set paper 4 to Draft
    const papersObj = JSON.parse(originalPapersRaw);
    const targetPaper = papersObj.find((p) => p.id === 4);
    if (targetPaper) {
      targetPaper.status = 'Draft';
      fs.writeFileSync(papersDataPath, JSON.stringify(papersObj, null, 2), 'utf-8');

      const unpublishedRes = await probeUrl(`${BASE_URL}/api/student/tests/4/start`, {
        method: 'POST',
        headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
      });
      assert(unpublishedRes.status === 403, 'Unpublished (Draft) test paper returns 403 Forbidden', `Got ${unpublishedRes.status}`);
      assert(unpublishedRes.json?.error?.includes('not currently published'), 'Returns descriptive error message for unpublished test');

      // Restore canonical status immediately
      fs.writeFileSync(papersDataPath, originalPapersRaw, 'utf-8');
    }

    // --- PART 7: AUTHORITATIVE ATTEMPT CREATION ---
    console.log('\n--- 7. Authoritative Test Attempt Initialization (Paper #1 - BITSAT) ---');
    // Read count before
    const initialAttempts = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
    const countBefore = initialAttempts.length;

    const startRes = await probeUrl(`${BASE_URL}/api/student/tests/1/start`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
    });
    assert([200, 201].includes(startRes.status), `Attempt initialization returned ${startRes.status} (201 Created or 200 Idempotent Reused)`);
    assert(startRes.json?.success === true, 'Response payload contains success: true');

    const attempt = startRes.json?.attempt;
    const attemptId = startRes.json?.attemptId;
    assert(typeof attemptId === 'string' && attemptId.startsWith('att_'), `Generated attempt ID matches format att_*: ${attemptId}`);
    assert(startRes.json?.destination === `/student/tests/session/${attemptId}`, `Destination URL is /student/tests/session/${attemptId}`);

    // Verify metadata calculation
    assert(attempt.durationMinutes === 180, 'Server duration matches canonical paper duration (180 mins)');
    assert(attempt.totalQuestions === 130, 'Server total questions matches canonical paper (130)');
    assert(attempt.totalMarks === 390, 'Server total marks matches canonical paper (390)');
    assert(attempt.markingScheme.positiveMarks === 3 && attempt.markingScheme.negativeMarks === 1, 'BITSAT marking scheme applied (+3 / -1)');
    assert(attempt.status === 'IN_PROGRESS', 'Attempt status initialized to IN_PROGRESS');

    // Server-computed timestamps
    const startedMs = new Date(attempt.startedAt).getTime();
    const expiresMs = new Date(attempt.expiresAt).getTime();
    const expectedDurationMs = 180 * 60 * 1000;
    assert(!isNaN(startedMs) && !isNaN(expiresMs), 'Timestamps startedAt and expiresAt are valid ISO strings');
    assert(Math.abs((expiresMs - startedMs) - expectedDurationMs) < 1000, 'expiresAt accurately computed as startedAt + durationMinutes (180 mins)');

    // --- PART 8: PERSISTENCE AUDIT ---
    console.log('\n--- 8. Verifying Authoritative Disk Persistence ---');
    const diskAttempts = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
    const persistedRecord = diskAttempts.find((a) => a.id === attemptId);
    assert(persistedRecord !== undefined, `Attempt ${attemptId} successfully written and found in data/test-attempts.json`);
    assert(persistedRecord.studentId === studentAUser.id, `Persisted record studentId (${persistedRecord.studentId}) matches Student A`);
    assert(persistedRecord.paperId === 1, 'Persisted record paperId is 1');
    assert(persistedRecord.status === 'IN_PROGRESS', 'Persisted record status is IN_PROGRESS');

    // --- PART 9: IDEMPOTENCY & DUPLICATE PROTECTION ---
    console.log('\n--- 9. Idempotency & Duplicate Submission Protection ---');
    const countAfterFirst = diskAttempts.length;
    const retryStartRes = await probeUrl(`${BASE_URL}/api/student/tests/1/start`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
    });
    assert(retryStartRes.status === 200, 'Duplicate start request returns HTTP 200 OK (idempotent)', `Got ${retryStartRes.status}`);
    assert(retryStartRes.json?.isExisting === true, 'Response flag isExisting is true');
    assert(retryStartRes.json?.attemptId === attemptId, 'Reused exact existing attempt ID without duplicate allocation');

    const diskAttemptsAfterRetry = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
    assert(diskAttemptsAfterRetry.length === countAfterFirst, `Disk attempt count unchanged (${diskAttemptsAfterRetry.length}) — zero duplicates written`);

    // --- PART 10: ATTEMPT RETRIEVAL & SENSITIVE DATA CHECK ---
    console.log('\n--- 10. Attempt Retrieval API & Sensitive Field Filtering ---');
    const getAttemptRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}`, {
      headers: { Cookie: studentACookie },
    });
    assert(getAttemptRes.status === 200, 'GET /api/student/tests/attempts/[attemptId] returns 200 OK');
    assert(getAttemptRes.json?.data?.id === attemptId, 'Retrieved attempt ID matches requested attempt');
    assert(getAttemptRes.json?.data?.paperTitle === 'BITSAT 2026 Full Syllabus CBT Mock 01', 'Retrieved paper title matches canonical test');
    assert(getAttemptRes.json?.data?.answerKey === undefined, 'Sensitive answerKey is NOT present in response');
    assert(getAttemptRes.json?.data?.solutions === undefined, 'Sensitive solutions are NOT present in response');

    // --- PART 11: STUDENT IDENTITY ISOLATION (CROSS-STUDENT ACCESS BLOCK) ---
    console.log('\n--- 11. Student Identity Isolation & Access Control ---');
    const crossStudentRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}`, {
      headers: { Cookie: studentBCookie },
    });
    assert(crossStudentRes.status === 403, 'Student B blocked with 403 Forbidden when accessing Student A attempt', `Got ${crossStudentRes.status}`);
    assert(crossStudentRes.json?.error?.includes('belongs to another student'), 'Descriptive forbidden message returned on cross-student access');

    // Non-existent attempt query
    const notFoundAttemptRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/att_non_existent_999999`, {
      headers: { Cookie: studentACookie },
    });
    assert(notFoundAttemptRes.status === 404, 'Non-existent attempt ID returns 404 Not Found', `Got ${notFoundAttemptRes.status}`);

    // --- PART 12: ACTIVE ATTEMPT SESSION PAGE HTTP PROBE ---
    console.log('\n--- 12. Active Session Container UI Probing ---');
    const sessionPageRes = await probeUrl(`${BASE_URL}/student/tests/session/${attemptId}`, {
      headers: { Cookie: studentACookie },
    });
    assert(sessionPageRes.status === 200, `GET /student/tests/session/${attemptId} returns 200 OK`);
    assert(sessionPageRes.contentType.includes('text/html'), 'Session route serves HTML content');

    // Summary
    console.log('\n================================================================');
    console.log(`FEATURE 2.2 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      console.error('\n✗ Feature 2.2 verification failed.');
      process.exit(1);
    } else {
      console.log('\n✓ Feature 2.2 fully verified with zero errors.');
    }
  } finally {
    // Restore canonical paper store in case of error
    fs.writeFileSync(papersDataPath, originalPapersRaw, 'utf-8');

    if (spawnedServer && serverProcess) {
      console.log('\nStopping test server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

runFeature22Tests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
