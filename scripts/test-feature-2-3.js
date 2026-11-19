// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 2.3: INTERACTIVE CBT QUESTION INTERFACE & NAVIGATION
// Comprehensive Automated Test Suite
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

async function runFeature23Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 2.3 CBT QUESTION INTERFACE & NAV SUITE');
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

  // --- PART 1: PRE-CHECK STORAGE ---
  console.log('--- 1. Storage & Canonical Data Integrity ---');
  const attemptsDataPath = path.join(process.cwd(), 'data', 'test-attempts.json');
  assert(fs.existsSync(attemptsDataPath), 'data/test-attempts.json exists');
  const questionsDataPath = path.join(process.cwd(), 'data', 'questions.json');
  assert(fs.existsSync(questionsDataPath), 'data/questions.json exists');

  // --- PART 2: SERVER LIFECYCLE ---
  console.log('\n--- 2. Spawning / Connecting to Local Server (Port 3000) ---');
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
    // --- PART 3: AUTHENTICATE STUDENTS ---
    console.log('\n--- 3. Authenticating Student A & Student B ---');
    const studentALogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    assert(studentALogin.status === 200, 'Student A login succeeded');
    const studentACookie = getCookieHeader(studentALogin);
    const studentACsrf = getCsrfToken(studentACookie);
    const studentAUser = studentALogin.json?.user;

    const studentBLogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.isolation.test@example.com', password: 'StudentPass2026!' }),
    });
    assert(studentBLogin.status === 200, 'Student B login succeeded');
    const studentBCookie = getCookieHeader(studentBLogin);
    const studentBUser = studentBLogin.json?.user;
    assert(studentAUser.id !== studentBUser.id, 'Student A and Student B have distinct IDs');

    // --- PART 4: INITIALIZE ACTIVE ATTEMPT FOR STUDENT A ---
    console.log('\n--- 4. Active Attempt Setup ---');
    const startRes = await probeUrl(`${BASE_URL}/api/student/tests/1/start`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
    });
    assert([200, 201].includes(startRes.status), 'Attempt initialized or retrieved active attempt');
    const attemptId = startRes.json?.attemptId;
    assert(Boolean(attemptId), `Active Attempt ID: ${attemptId}`);

    // --- PART 5: UNAUTHENTICATED & CROSS-STUDENT ACCESS TO QUESTIONS ---
    console.log('\n--- 5. Question Retrieval Security & Access Control ---');
    const unauthQRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/questions`);
    assert(unauthQRes.status === 401, 'Unauthenticated GET questions returns 401 Unauthorized', `Got ${unauthQRes.status}`);

    const crossStudentQRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/questions`, {
      headers: { Cookie: studentBCookie },
    });
    assert(crossStudentQRes.status === 403, 'Cross-student access returns 403 Forbidden', `Got ${crossStudentQRes.status}`);
    assert(crossStudentQRes.json?.error?.includes('belongs to another student'), 'Descriptive ownership error returned');

    const nonExistentQRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/att_dummy_999999/questions`, {
      headers: { Cookie: studentACookie },
    });
    assert(nonExistentQRes.status === 404, 'Non-existent attempt ID returns 404 Not Found', `Got ${nonExistentQRes.status}`);

    // --- PART 6: AUTHORIZED QUESTION RETRIEVAL & PAYLOAD AUDIT ---
    console.log('\n--- 6. Authorized Question Retrieval (Student A) ---');
    const authQRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/questions`, {
      headers: { Cookie: studentACookie },
    });
    assert(authQRes.status === 200, 'Authorized GET questions returns 200 OK');
    assert(authQRes.json?.success === true, 'Response body has success: true');
    assert(authQRes.json?.attemptId === attemptId, 'Payload attemptId matches requested attempt');

    const loadedQuestions = authQRes.json?.questions;
    assert(Array.isArray(loadedQuestions) && loadedQuestions.length >= 5, `Retrieved ${loadedQuestions?.length} assigned questions`);
    assert(Array.isArray(authQRes.json?.subjects) && authQRes.json?.subjects.length >= 2, 'Subject breakdown returned for CBT section navigation');

    // --- PART 7: STRICT ANSWER-KEY & SOLUTION LEAKAGE PREVENTION ---
    console.log('\n--- 7. Security Verification: Zero Answer-Key / Solution Leakage ---');
    let leakedKeysCount = 0;
    let leakedSolutionsCount = 0;
    let leakedRangesCount = 0;

    loadedQuestions.forEach((q, idx) => {
      if (q.correctOption !== undefined) leakedKeysCount++;
      if (q.explanation !== undefined) leakedSolutionsCount++;
      if (q.rangeFrom !== undefined || q.rangeTo !== undefined || q.tolerance !== undefined) leakedRangesCount++;
    });

    assert(leakedKeysCount === 0, 'correctOption strictly excluded from all question objects');
    assert(leakedSolutionsCount === 0, 'explanation / solution strictly excluded from all question objects');
    assert(leakedRangesCount === 0, 'rangeFrom / rangeTo / tolerance strictly excluded from all numerical questions');

    // --- PART 8: MULTIPLE QUESTION TYPES & DATA SHAPES ---
    console.log('\n--- 8. Question Types Audit (Objective MCQ & Numerical NVT) ---');
    const objectiveQuestions = loadedQuestions.filter((q) => q.questionType === 'objective');
    const numericalQuestions = loadedQuestions.filter((q) => q.questionType === 'numerical');

    assert(objectiveQuestions.length >= 3, `Found ${objectiveQuestions.length} Objective (MCQ) questions`);
    assert(numericalQuestions.length >= 2, `Found ${numericalQuestions.length} Numerical (NVT) questions`);

    const sampleObjective = objectiveQuestions[0];
    assert(
      Boolean(sampleObjective.optionA && sampleObjective.optionB && sampleObjective.optionC && sampleObjective.optionD),
      'Objective question contains all 4 options (A, B, C, D)'
    );

    const sampleNumerical = numericalQuestions[0];
    assert(
      sampleNumerical.optionA === undefined && sampleNumerical.optionB === undefined,
      'Numerical question correctly omits options'
    );

    // --- PART 9: QUESTION ORDER & INDEXING ---
    console.log('\n--- 9. Question Order & 1-Based Numbering ---');
    let orderPreserved = true;
    loadedQuestions.forEach((q, idx) => {
      if (q.questionNumber !== idx + 1) orderPreserved = false;
    });
    assert(orderPreserved, 'Questions are indexed sequentially (1, 2, 3, 4, 5...)');

    // --- PART 10: AUTHORITATIVE EXPIRY & EXPIRED ATTEMPT HANDLING ---
    console.log('\n--- 10. Authoritative Expiry Enforcement ---');
    const expiresAt = authQRes.json?.expiresAt;
    assert(Boolean(expiresAt), `Authoritative expiresAt timestamp present: ${expiresAt}`);

    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    assert(remainingMs > 0, `Active attempt has positive remaining time (${Math.round(remainingMs / 1000)}s)`);

    // Create a temporary expired attempt record to test expired attempt guard
    const diskAttempts = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
    const expiredAttemptId = `att_expired_${Date.now()}`;
    const expiredRecord = {
      ...diskAttempts[0],
      id: expiredAttemptId,
      studentId: studentAUser.id,
      startedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), // Expired 1 hour ago
      status: 'IN_PROGRESS',
    };
    diskAttempts.push(expiredRecord);
    fs.writeFileSync(attemptsDataPath, JSON.stringify(diskAttempts, null, 2), 'utf-8');

    const expiredQRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${expiredAttemptId}/questions`, {
      headers: { Cookie: studentACookie },
    });
    assert(expiredQRes.status === 403, 'Expired attempt rejected with 403 Forbidden', `Got ${expiredQRes.status}`);
    assert(expiredQRes.json?.error?.includes('expired'), 'Descriptive expired error returned');

    // Clean up temporary expired record
    const cleaned = diskAttempts.filter((a) => a.id !== expiredAttemptId);
    fs.writeFileSync(attemptsDataPath, JSON.stringify(cleaned, null, 2), 'utf-8');

    // --- PART 11: ACTIVE CBT SESSION HTML PAGE PROBE ---
    console.log('\n--- 11. CBT Web Interface Probing ---');
    const sessionHtmlRes = await probeUrl(`${BASE_URL}/student/tests/session/${attemptId}`, {
      headers: { Cookie: studentACookie },
    });
    assert(sessionHtmlRes.status === 200, 'GET /student/tests/session/[attemptId] serves 200 OK');
    assert(sessionHtmlRes.contentType.includes('text/html'), 'Session route serves HTML');

    // Summary
    console.log('\n================================================================');
    console.log(`FEATURE 2.3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      console.error('\n✗ Feature 2.3 verification failed.');
      process.exit(1);
    } else {
      console.log('\n✓ Feature 2.3 fully verified with zero errors.');
    }
  } finally {
    if (spawnedServer && serverProcess) {
      console.log('\nStopping test server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

runFeature23Tests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
