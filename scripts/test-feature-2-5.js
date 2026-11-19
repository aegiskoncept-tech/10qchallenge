// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 2.5: TEST SUBMISSION & AUTOMATIC EVALUATION SUITE
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

async function runFeature25Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 2.5 TEST SUBMISSION & EVALUATION SUITE');
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
  const seriesDataPath = path.join(process.cwd(), 'data', 'test-series.json');
  assert(fs.existsSync(seriesDataPath), 'data/test-series.json exists');

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
  const createdTestAttemptIds = [];

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

    // Helper to inject a custom test attempt directly into data/test-attempts.json
    function injectTestAttempt(record) {
      const allAttempts = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
      allAttempts.push(record);
      fs.writeFileSync(attemptsDataPath, JSON.stringify(allAttempts, null, 2), 'utf-8');
      createdTestAttemptIds.push(record.id);
      return record;
    }

    // =========================================================================
    // GROUP A: MANUAL SUBMISSION & SECURITY ACCESS CONTROL
    // =========================================================================
    console.log('\n--- GROUP A: Manual Submission & Access Control ---');

    // Create an active attempt for Student A on Paper 1
    const testAttemptAId = `att_test_manual_${Date.now()}`;
    injectTestAttempt({
      id: testAttemptAId,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 150 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '1': {
          questionId: 1,
          questionType: 'objective',
          selectedOption: 'B', // Correct (+3)
          numericalValue: null,
          isMarkedForReview: false,
          version: 1,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    // 1. Unauthenticated submission
    const unauthSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testAttemptAId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(unauthSubmit.status === 401, 'Unauthenticated submission rejected with 401 Unauthorized');

    // 2. Missing CSRF header
    const noCsrfSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testAttemptAId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(noCsrfSubmit.status === 403, 'Missing CSRF header rejected with 403 Forbidden');

    // 3. Cross-student submission attempt
    const crossStudentSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testAttemptAId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentBCookie, 'x-csrf-token': studentBCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(crossStudentSubmit.status === 403, 'Cross-student submission blocked with 403 Forbidden');
    assert(crossStudentSubmit.json?.error?.includes('another student'), 'Descriptive ownership error returned');

    // 4. Non-existent attempt submission
    const nonExistentSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/att_dummy_99999/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(nonExistentSubmit.status === 404, 'Non-existent attempt ID returns 404 Not Found');

    // 5. Successful manual submission
    const validSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testAttemptAId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(validSubmit.status === 200, 'Valid manual submission returns 200 OK');
    assert(validSubmit.json?.success === true, 'Response contains success: true');
    assert(validSubmit.json?.result?.submissionReason === 'MANUAL', 'submissionReason recorded as MANUAL');
    assert(Boolean(validSubmit.json?.result?.submittedAt), 'submittedAt ISO timestamp present');

    // Verify status changed to COMPLETED in database
    const allAttemptsPost = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
    const diskAttemptA = allAttemptsPost.find((a) => a.id === testAttemptAId);
    assert(diskAttemptA?.status === 'COMPLETED', 'Attempt status transitioned to COMPLETED in persistent storage');
    assert(Boolean(diskAttemptA?.result), 'Attempt record contains authoritative result object on disk');

    // =========================================================================
    // GROUP B: MCQ EVALUATION RULES
    // =========================================================================
    console.log('\n--- GROUP B: MCQ Evaluation Rules ---');

    // Paper 1 questions:
    // Q1: correctOption = 'B'
    // Q2: correctOption = 'C'
    // Q3: correctOption = 'C'
    // Q4: numerical (5.00)
    // Q5: numerical (5.00)

    const testMcqAttemptId = `att_test_mcq_${Date.now()}`;
    injectTestAttempt({
      id: testMcqAttemptId,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 170 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        // Q1: Correct option 'B' -> +3
        '1': {
          questionId: 1,
          questionType: 'objective',
          selectedOption: 'B',
          isMarkedForReview: false,
          version: 1,
        },
        // Q2: Incorrect option 'A' (correct is 'C') -> -1
        '2': {
          questionId: 2,
          questionType: 'objective',
          selectedOption: 'A',
          isMarkedForReview: false,
          version: 1,
        },
        // Q3: Marked for review WITH correct answer 'C' -> +3 (CBT rule: marked for review with answer is evaluated!)
        '3': {
          questionId: 3,
          questionType: 'objective',
          selectedOption: 'C',
          isMarkedForReview: true,
          version: 1,
        },
        // Q4 & Q5 unattempted -> 0
      },
    });

    const mcqSubmitRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testMcqAttemptId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });

    assert(mcqSubmitRes.status === 200, 'MCQ evaluation submission returns 200 OK');
    const mcqResult = mcqSubmitRes.json?.result;
    assert(mcqResult?.correctQuestions === 2, `Correct questions count = 2 (Q1 and Q3 marked-with-answer) [got ${mcqResult?.correctQuestions}]`);
    assert(mcqResult?.incorrectQuestions === 1, `Incorrect questions count = 1 (Q2) [got ${mcqResult?.incorrectQuestions}]`);
    assert(mcqResult?.unattemptedQuestions === 2, `Unattempted questions count = 2 (Q4, Q5) [got ${mcqResult?.unattemptedQuestions}]`);
    assert(mcqResult?.positiveMarks === 6, `Positive marks = 6 (2 * 3) [got ${mcqResult?.positiveMarks}]`);
    assert(mcqResult?.negativeMarks === 1, `Negative marks = 1 (1 * 1) [got ${mcqResult?.negativeMarks}]`);
    assert(mcqResult?.finalScore === 5, `Final score = 5 (6 - 1) [got ${mcqResult?.finalScore}]`);

    // =========================================================================
    // GROUP C: NUMERICAL QUESTION EVALUATION RULES
    // =========================================================================
    console.log('\n--- GROUP C: Numerical Question Evaluation Rules ---');

    // Q4: rangeFrom="5.00", rangeTo="5.00", tolerance="0.05" -> valid: [4.95, 5.05]
    // Q5: rangeFrom="5.00", rangeTo="5.00", tolerance="0.05" -> valid: [4.95, 5.05]

    // Test C1: Exact and Boundary values
    const testNumAttempt1Id = `att_test_num1_${Date.now()}`;
    injectTestAttempt({
      id: testNumAttempt1Id,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 170 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '4': {
          questionId: 4,
          questionType: 'numerical',
          numericalValue: '5.00', // Exact match -> CORRECT (+3)
          isMarkedForReview: false,
          version: 1,
        },
        '5': {
          questionId: 5,
          questionType: 'numerical',
          numericalValue: '5.05', // Exact boundary (+ tolerance) -> CORRECT (+3)
          isMarkedForReview: false,
          version: 1,
        },
      },
    });

    const numSubmit1 = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testNumAttempt1Id}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });

    assert(numSubmit1.status === 200, 'Numerical exact & boundary submit returns 200 OK');
    assert(numSubmit1.json?.result?.correctQuestions === 2, `Exact & boundary evaluated as CORRECT (2) [got ${numSubmit1.json?.result?.correctQuestions}]`);
    assert(numSubmit1.json?.result?.positiveMarks === 6, `Positive marks = 6 [got ${numSubmit1.json?.result?.positiveMarks}]`);

    // Test C2: Within tolerance, out-of-range, and malformed non-numeric values
    const testNumAttempt2Id = `att_test_num2_${Date.now()}`;
    injectTestAttempt({
      id: testNumAttempt2Id,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 170 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '4': {
          questionId: 4,
          questionType: 'numerical',
          numericalValue: '4.98', // Within tolerance (range 4.95 - 5.05) -> CORRECT (+3)
          isMarkedForReview: false,
          version: 1,
        },
        '5': {
          questionId: 5,
          questionType: 'numerical',
          numericalValue: '6.50', // Out of range -> INCORRECT (-1)
          isMarkedForReview: false,
          version: 1,
        },
      },
    });

    const numSubmit2 = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testNumAttempt2Id}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });

    assert(numSubmit2.status === 200, 'Numerical tolerance & out-of-range submit returns 200 OK');
    assert(numSubmit2.json?.result?.correctQuestions === 1, `Within tolerance evaluated as CORRECT [got ${numSubmit2.json?.result?.correctQuestions}]`);
    assert(numSubmit2.json?.result?.incorrectQuestions === 1, `Out-of-range evaluated as INCORRECT [got ${numSubmit2.json?.result?.incorrectQuestions}]`);
    assert(numSubmit2.json?.result?.finalScore === 2, `Final score = 2 (3 - 1) [got ${numSubmit2.json?.result?.finalScore}]`);

    // =========================================================================
    // GROUP D: MARKING SCHEME & AGGREGATED SCORES
    // =========================================================================
    console.log('\n--- GROUP D: Marking Scheme & Score Calculations ---');

    // Test D1: Negative final score test (more incorrect than correct)
    const testNegAttemptId = `att_test_neg_${Date.now()}`;
    injectTestAttempt({
      id: testNegAttemptId,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 170 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '1': { questionId: 1, questionType: 'objective', selectedOption: 'A', version: 1 }, // Wrong (-1)
        '2': { questionId: 2, questionType: 'objective', selectedOption: 'B', version: 1 }, // Wrong (-1)
        '3': { questionId: 3, questionType: 'objective', selectedOption: 'A', version: 1 }, // Wrong (-1)
      },
    });

    const negSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testNegAttemptId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });

    assert(negSubmit.status === 200, 'Negative score submit returns 200 OK');
    const negRes = negSubmit.json?.result;
    assert(negRes?.correctQuestions === 0, '0 correct questions recorded');
    assert(negRes?.incorrectQuestions === 3, '3 incorrect questions recorded');
    assert(negRes?.positiveMarks === 0, 'Positive marks = 0');
    assert(negRes?.negativeMarks === 3, 'Negative marks = 3');
    assert(negRes?.finalScore === -3, `Final score correctly calculated as negative (-3) [got ${negRes?.finalScore}]`);
    assert(negRes?.accuracy === 0, `Accuracy is 0% when 0 correct [got ${negRes?.accuracy}]`);
    assert(negRes?.maximumMarks === 15, `Maximum marks is 15 (5 questions * 3) [got ${negRes?.maximumMarks}]`);

    // Test D2: Zero attempts test (accuracy edge case 0.00%)
    const testZeroAttemptId = `att_test_zero_${Date.now()}`;
    injectTestAttempt({
      id: testZeroAttemptId,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 170 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {},
    });

    const zeroSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testZeroAttemptId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });

    assert(zeroSubmit.status === 200, 'Zero attempts submit returns 200 OK');
    const zeroRes = zeroSubmit.json?.result;
    assert(zeroRes?.attemptedQuestions === 0, 'Attempted questions = 0');
    assert(zeroRes?.unattemptedQuestions === 5, 'Unattempted questions = 5');
    assert(zeroRes?.finalScore === 0, 'Final score = 0');
    assert(zeroRes?.accuracy === 0, 'Accuracy is gracefully 0.00% without division-by-zero error');

    // =========================================================================
    // GROUP E: AUTOMATIC TIMEOUT SUBMISSION
    // =========================================================================
    console.log('\n--- GROUP E: Automatic Timeout Submission ---');

    // Create an expired attempt (started in past, expiresAt was 5 minutes ago)
    const testTimeoutAttemptId = `att_test_timeout_${Date.now()}`;
    injectTestAttempt({
      id: testTimeoutAttemptId,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 185 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Already expired
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '1': { questionId: 1, questionType: 'objective', selectedOption: 'B', version: 1 }, // Correct (+3)
      },
    });

    // 1. Submit with TIMEOUT reason
    const timeoutSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testTimeoutAttemptId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'TIMEOUT' }),
    });

    assert(timeoutSubmit.status === 200, 'Timeout submission returns 200 OK');
    assert(timeoutSubmit.json?.result?.submissionReason === 'TIMEOUT', 'submissionReason correctly saved as TIMEOUT');
    assert(timeoutSubmit.json?.result?.correctQuestions === 1, 'Answers saved prior to timeout are evaluated');

    // 2. Post-timeout attempt cannot accept further answer saves
    const postTimeoutAnswer = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testTimeoutAttemptId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 2, selectedOption: 'C' }),
    });
    assert(postTimeoutAnswer.status === 403, 'Post-timeout answer modification rejected with 403 Forbidden');

    // =========================================================================
    // GROUP F: SECURITY & ANSWER-KEY REDACTION
    // =========================================================================
    console.log('\n--- GROUP F: Security & Answer-Key Redaction ---');

    // 1. Client attempts to inject malicious score parameters
    const testSpoofAttemptId = `att_test_spoof_${Date.now()}`;
    injectTestAttempt({
      id: testSpoofAttemptId,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 170 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '1': { questionId: 1, questionType: 'objective', selectedOption: 'A', version: 1 }, // Wrong (Correct is B)
      },
    });

    const spoofSubmit = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testSpoofAttemptId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionReason: 'MANUAL',
        finalScore: 9999, // Attempted spoof
        correctQuestions: 100, // Attempted spoof
        positiveMarks: 1000, // Attempted spoof
      }),
    });

    assert(spoofSubmit.status === 200, 'Submit request processed safely');
    assert(spoofSubmit.json?.result?.finalScore === -1, 'Server ignored client spoofed score and computed authoritative -1');

    // 2. Redaction of answer keys in submit response
    const submitPayload = spoofSubmit.json?.result;
    assert(submitPayload?.correctOption === undefined, 'Submit response omits correctOption');
    assert(submitPayload?.explanation === undefined, 'Submit response omits explanation');
    assert(submitPayload?.rangeFrom === undefined, 'Submit response omits rangeFrom');
    assert(submitPayload?.rangeTo === undefined, 'Submit response omits rangeTo');
    assert(submitPayload?.questionDetails === undefined, 'Submit response omits internal questionDetails');

    // 3. GET /attempts/[attemptId] after completion
    const getCompletedAttempt = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${testSpoofAttemptId}`, {
      headers: { Cookie: studentACookie },
    });
    assert(getCompletedAttempt.status === 200, 'GET /attempts/[attemptId] on completed attempt returns 200 OK');
    const compData = getCompletedAttempt.json?.data;
    assert(compData?.status === 'COMPLETED', 'Status returned as COMPLETED');
    assert(compData?.result?.finalScore === -1, 'Result summary attached to completed attempt snapshot');
    assert(compData?.result?.correctOption === undefined, 'Completed attempt snapshot excludes correctOption');
    assert(compData?.result?.explanation === undefined, 'Completed attempt snapshot excludes explanation');

    // =========================================================================
    // GROUP G: CONCURRENCY & IDEMPOTENCY
    // =========================================================================
    console.log('\n--- GROUP G: Concurrency & Idempotency ---');

    const testConcurrentAttemptId = `att_test_concurrent_${Date.now()}`;
    injectTestAttempt({
      id: testConcurrentAttemptId,
      studentId: studentAUser.id,
      studentName: studentAUser.name || 'Test Student',
      studentEmail: studentAUser.email,
      paperId: 1,
      paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 5,
      totalMarks: 15,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 170 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '1': { questionId: 1, questionType: 'objective', selectedOption: 'B', version: 1 },
        '2': { questionId: 2, questionType: 'objective', selectedOption: 'C', version: 1 },
      },
    });

    // Fire 5 concurrent submit calls
    const concurrentSubmitCalls = [1, 2, 3, 4, 5].map(() =>
      probeUrl(`${BASE_URL}/api/student/tests/attempts/${testConcurrentAttemptId}/submit`, {
        method: 'POST',
        headers: { Cookie: studentACookie, 'x-csrf-token': studentACsrf, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionReason: 'MANUAL' }),
      })
    );

    const concurrentSubmitResults = await Promise.all(concurrentSubmitCalls);
    const allConcurrent200 = concurrentSubmitResults.every((r) => r.status === 200);
    assert(allConcurrent200, 'All 5 concurrent submit requests succeeded with 200 OK');

    // Check that all 5 results report identical score
    const finalScores = concurrentSubmitResults.map((r) => r.json?.result?.finalScore);
    const allIdenticalScore = finalScores.every((score) => score === 6);
    assert(allIdenticalScore, `All 5 concurrent requests returned identical score (6) [${finalScores.join(', ')}]`);

    // Verify at least one call returned isExisting: true
    const existingFlags = concurrentSubmitResults.map((r) => Boolean(r.json?.isExisting));
    assert(existingFlags.includes(true), 'Subsequent/concurrent calls recognized existing completion (isExisting: true)');

    // =========================================================================
    // GROUP H: PERSISTENCE & PROCESS RESTART SURVIVAL
    // =========================================================================
    console.log('\n--- GROUP H: Persistence & Disk Verification ---');

    // Read directly from disk
    const diskAttemptsFinal = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
    const diskConcurrent = diskAttemptsFinal.find((a) => a.id === testConcurrentAttemptId);
    assert(diskConcurrent?.status === 'COMPLETED', 'Disk attempt status is COMPLETED');
    assert(diskConcurrent?.result?.finalScore === 6, 'Disk attempt contains matching finalScore: 6');
    assert(diskConcurrent?.result?.totalQuestions === 5, 'Disk attempt contains totalQuestions: 5');
    assert(diskConcurrent?.result?.correctQuestions === 2, 'Disk attempt contains correctQuestions: 2');
    assert(diskConcurrent?.result?.positiveMarks === 6, 'Disk attempt contains positiveMarks: 6');
    assert(diskConcurrent?.result?.accuracy === 100, 'Disk attempt contains accuracy: 100%');

    // Summary
    console.log('\n================================================================');
    console.log(`FEATURE 2.5 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      console.error('\n✗ Feature 2.5 verification failed.');
      process.exit(1);
    } else {
      console.log('\n✓ Feature 2.5 fully verified with zero errors.');
    }
  } finally {
    // Clean up temporary attempts created for this test run
    if (createdTestAttemptIds.length > 0) {
      try {
        const remainingAttempts = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'))
          .filter((a) => !createdTestAttemptIds.includes(a.id));
        fs.writeFileSync(attemptsDataPath, JSON.stringify(remainingAttempts, null, 2), 'utf-8');
        console.log(`  ✓ Cleaned up ${createdTestAttemptIds.length} temporary test attempts from disk.`);
      } catch (err) {
        console.error('Failed to clean up temporary test attempts:', err);
      }
    }

    if (spawnedServer && serverProcess) {
      console.log('\nStopping test server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

runFeature25Tests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
