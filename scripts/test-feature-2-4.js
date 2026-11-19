// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 2.4: PERSISTENT ANSWER SAVING & RECOVERY SUITE
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

async function runFeature24Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 2.4 PERSISTENT ANSWER SAVING SUITE');
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

  // --- PART 1: STORAGE & INTEGRITY PRE-CHECK ---
  console.log('--- 1. Storage & Canonical Data Integrity ---');
  const attemptsDataPath = path.join(process.cwd(), 'data', 'test-attempts.json');
  assert(fs.existsSync(attemptsDataPath), 'data/test-attempts.json exists and accessible');
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
    assert(studentALogin.status === 200, 'Student A authenticated successfully');
    const studentACookie = getCookieHeader(studentALogin);
    const studentACsrf = getCsrfToken(studentACookie);
    const studentAUser = studentALogin.json?.user;

    const studentBLogin = await probeUrl(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.isolation.test@example.com', password: 'StudentPass2026!' }),
    });
    assert(studentBLogin.status === 200, 'Student B authenticated successfully');
    const studentBCookie = getCookieHeader(studentBLogin);
    const studentBCsrf = getCsrfToken(studentBCookie);
    const studentBUser = studentBLogin.json?.user;

    // --- PART 4: ACTIVE ATTEMPT SETUP ---
    console.log('\n--- 4. Active Attempt Setup ---');
    const startRes = await probeUrl(`${BASE_URL}/api/student/tests/1/start`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf },
    });
    assert([200, 201].includes(startRes.status), 'Attempt initialized or active attempt retrieved');
    const attemptId = startRes.json?.attemptId;
    assert(Boolean(attemptId), `Active Attempt ID: ${attemptId}`);

    // --- PART 5: SECURITY & ACCESS CONTROL ON ANSWER SAVE ---
    console.log('\n--- 5. Security & Access Control on POST /answers ---');
    const unauthSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 1, selectedOption: 'A' }),
    });
    assert(unauthSave.status === 401, 'Unauthenticated answer save rejected with 401 Unauthorized', `Got ${unauthSave.status}`);

    const noCsrfSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 1, selectedOption: 'A' }),
    });
    assert(noCsrfSave.status === 403, 'Missing CSRF header rejected with 403 Forbidden', `Got ${noCsrfSave.status}`);

    const crossStudentSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentBCookie, 'x-csrf-token': studentBCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 1, selectedOption: 'A' }),
    });
    assert(crossStudentSave.status === 403, 'Cross-student answer save blocked with 403 Forbidden', `Got ${crossStudentSave.status}`);
    assert(crossStudentSave.json?.error?.includes('belongs to another student'), 'Descriptive ownership error returned');

    const nonExistentAttemptSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/att_dummy_99999/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 1, selectedOption: 'A' }),
    });
    assert(nonExistentAttemptSave.status === 404, 'Non-existent attempt ID returns 404 Not Found', `Got ${nonExistentAttemptSave.status}`);

    // --- PART 6: QUESTION-TO-PAPER MEMBERSHIP & VALIDATIONS ---
    console.log('\n--- 6. Question-to-Paper Membership & Master Validation ---');
    const invalidPaperQSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 999999, selectedOption: 'A' }),
    });
    assert([400, 404].includes(invalidPaperQSave.status), 'Question not belonging to paper returns 400 or 404', `Got ${invalidPaperQSave.status}`);

    // --- PART 7: VALID MCQ ANSWER SAVING ---
    console.log('\n--- 7. MCQ Answer Saving & Option Validation ---');
    const validMcqSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 1,
        questionType: 'objective',
        selectedOption: 'B',
      }),
    });
    assert(validMcqSave.status === 200, 'Valid MCQ save returns 200 OK');
    assert(validMcqSave.json?.success === true, 'Response payload has success: true');
    assert(validMcqSave.json?.response?.selectedOption === 'B', 'Saved option recorded as "B"');
    assert(validMcqSave.json?.response?.version >= 1, `Version incremented (${validMcqSave.json?.response?.version})`);

    const invalidMcqOptionSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 1,
        questionType: 'objective',
        selectedOption: 'INVALID_OPTION_Z',
      }),
    });
    assert(invalidMcqOptionSave.status === 400, 'Invalid option letter (Z) returns 400 Bad Request', `Got ${invalidMcqOptionSave.status}`);

    // --- PART 8: VALID NUMERICAL ANSWER SAVING ---
    console.log('\n--- 8. Numerical Answer Saving & Input Validation ---');
    const validNumericalSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 4,
        questionType: 'numerical',
        numericalValue: '5.00',
      }),
    });
    assert(validNumericalSave.status === 200, 'Valid numerical response returns 200 OK');
    assert(validNumericalSave.json?.response?.numericalValue === '5.00', 'Saved numerical value recorded as "5.00"');
    assert(validNumericalSave.json?.response?.selectedOption === null, 'Numerical response has selectedOption as null');

    const invalidNumericalSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 4,
        questionType: 'numerical',
        numericalValue: 'not-a-number-xyz',
      }),
    });
    assert(invalidNumericalSave.status === 400, 'Non-numeric string returns 400 Bad Request', `Got ${invalidNumericalSave.status}`);

    // --- PART 9: REVIEW STATUS PERSISTENCE ---
    console.log('\n--- 9. Mark for Review Flag Persistence ---');
    const markReviewSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 1,
        questionType: 'objective',
        selectedOption: 'B',
        isMarkedForReview: true,
      }),
    });
    assert(markReviewSave.status === 200, 'Mark for review save returns 200 OK');
    assert(markReviewSave.json?.response?.isMarkedForReview === true, 'isMarkedForReview saved as true');
    assert(markReviewSave.json?.response?.selectedOption === 'B', 'Preserved previously selected option B');

    // --- PART 10: CLEAR RESPONSE BEHAVIOR ---
    console.log('\n--- 10. Clear Response Behavior ---');
    const clearResponseSave = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 1,
        questionType: 'objective',
        selectedOption: null,
        numericalValue: null,
      }),
    });
    assert(clearResponseSave.status === 200, 'Clear response returns 200 OK');
    assert(clearResponseSave.json?.response?.selectedOption === null, 'selectedOption successfully cleared to null');

    // --- PART 11: RECOVERY ON REFRESH & STATE RESTORATION ---
    console.log('\n--- 11. Authoritative State Restoration on Refresh ---');
    const questionsRefreshRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/questions`, {
      headers: { Cookie: studentACookie },
    });
    assert(questionsRefreshRes.status === 200, 'GET /questions after updates returns 200 OK');
    const savedResponses = questionsRefreshRes.json?.savedResponses;
    assert(Boolean(savedResponses), 'Payload contains savedResponses map');
    assert(savedResponses['4']?.numericalValue === '5.00', 'Question 4 restored with numericalValue "5.00"');
    assert(savedResponses['1']?.selectedOption === null, 'Question 1 restored with selectedOption null (cleared)');
    assert(savedResponses['1']?.isMarkedForReview === true, 'Question 1 review flag preserved');

    // --- PART 12: CONCURRENCY & SIMULTANEOUS MULTI-QUESTION WRITES ---
    console.log('\n--- 12. Concurrency Safety: Simultaneous Multi-Question Updates ---');
    const concurrentUpdates = [1, 2, 3, 4, 5].map((qId) => {
      const isNum = qId >= 4;
      return probeUrl(`${BASE_URL}/api/student/tests/attempts/${attemptId}/answers`, {
        method: 'POST',
        headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: qId,
          questionType: isNum ? 'numerical' : 'objective',
          selectedOption: isNum ? null : 'A',
          numericalValue: isNum ? '10.5' : null,
          isMarkedForReview: false,
        }),
      });
    });

    const concurrentResults = await Promise.all(concurrentUpdates);
    const allConcurrentSucceeded = concurrentResults.every((r) => r.status === 200);
    assert(allConcurrentSucceeded, 'All 5 simultaneous question updates succeeded (HTTP 200)');

    // Verify all 5 written to disk without lost updates
    const diskAttempts = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
    const diskRecord = diskAttempts.find((a) => a.id === attemptId);
    assert(Boolean(diskRecord?.responses), 'Disk record contains responses map');
    const writtenKeys = Object.keys(diskRecord.responses || {});
    assert(writtenKeys.length >= 5, `All 5 concurrent question responses persisted on disk (found ${writtenKeys.length})`);

    // --- PART 13: EXPIRED & STATUS-LOCKED ATTEMPT GUARDS ---
    console.log('\n--- 13. Expired & Status-Locked Attempt Guards ---');
    // Create temporary expired attempt
    const expiredAttemptId = `att_expired_${Date.now()}`;
    const expiredRecord = {
      ...diskRecord,
      id: expiredAttemptId,
      studentId: studentAUser.id,
      startedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
      status: 'IN_PROGRESS',
    };
    diskAttempts.push(expiredRecord);
    fs.writeFileSync(attemptsDataPath, JSON.stringify(diskAttempts, null, 2), 'utf-8');

    const expiredSaveRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${expiredAttemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 1, selectedOption: 'C' }),
    });
    assert(expiredSaveRes.status === 403, 'Save on expired attempt returns 403 Forbidden', `Got ${expiredSaveRes.status}`);
    assert(expiredSaveRes.json?.error?.includes('expired'), 'Descriptive expired error message returned');

    // Create temporary completed attempt
    const completedAttemptId = `att_completed_${Date.now()}`;
    const completedRecord = {
      ...diskRecord,
      id: completedAttemptId,
      studentId: studentAUser.id,
      status: 'COMPLETED',
    };
    diskAttempts.push(completedRecord);
    fs.writeFileSync(attemptsDataPath, JSON.stringify(diskAttempts, null, 2), 'utf-8');

    const completedSaveRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${completedAttemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 1, selectedOption: 'C' }),
    });
    assert(completedSaveRes.status === 403, 'Save on completed attempt returns 403 Forbidden', `Got ${completedSaveRes.status}`);

    // Clean up temporary attempts
    const cleaned = diskAttempts.filter((a) => a.id !== expiredAttemptId && a.id !== completedAttemptId);
    fs.writeFileSync(attemptsDataPath, JSON.stringify(cleaned, null, 2), 'utf-8');

    // --- PART 14: ANSWER-KEY & SOLUTION LEAKAGE PROTECTION ---
    console.log('\n--- 14. Answer-Key & Solution Leakage Protection ---');
    const sampleSaveResp = validMcqSave.json?.response;
    assert(sampleSaveResp?.correctOption === undefined, 'Save response excludes correctOption');
    assert(sampleSaveResp?.explanation === undefined, 'Save response excludes explanation');
    assert(sampleSaveResp?.rangeFrom === undefined, 'Save response excludes rangeFrom');
    assert(sampleSaveResp?.rangeTo === undefined, 'Save response excludes rangeTo');

    // Summary
    console.log('\n================================================================');
    console.log(`FEATURE 2.4 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      console.error('\n✗ Feature 2.4 verification failed.');
      process.exit(1);
    } else {
      console.log('\n✓ Feature 2.4 fully verified with zero errors.');
    }
  } finally {
    if (spawnedServer && serverProcess) {
      console.log('\nStopping test server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

runFeature24Tests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
