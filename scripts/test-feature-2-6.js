// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 2.6: RESULTS & SCORECARD TEST SUITE
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

async function runFeature26Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 2.6 RESULTS & SCORECARD TEST SUITE');
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

    // Helper to inject a test attempt record
    function injectTestAttempt(record) {
      const allAttempts = JSON.parse(fs.readFileSync(attemptsDataPath, 'utf-8'));
      allAttempts.push(record);
      fs.writeFileSync(attemptsDataPath, JSON.stringify(allAttempts, null, 2), 'utf-8');
      createdTestAttemptIds.push(record.id);
      return record;
    }

    // =========================================================================
    // SECTION 1: AUTHORIZATION & ACCESS CONTROL
    // =========================================================================
    console.log('\n--- SECTION 1: Authorization & Access Control ---');

    // 1. Create a completed attempt for Student A
    const completedAttemptAId = `att_test_res_comp_${Date.now()}`;
    injectTestAttempt({
      id: completedAttemptAId,
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
      startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 135 * 60 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      submissionReason: 'MANUAL',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '1': { questionId: 1, questionType: 'objective', selectedOption: 'B', isMarkedForReview: false, version: 1 }, // Correct (+3)
        '2': { questionId: 2, questionType: 'objective', selectedOption: 'C', isMarkedForReview: false, version: 1 }, // Correct (+3)
        '3': { questionId: 3, questionType: 'objective', selectedOption: 'A', isMarkedForReview: true, version: 1 }, // Incorrect (-1)
        '4': { questionId: 4, questionType: 'numerical', numericalValue: '5.00', isMarkedForReview: false, version: 1 }, // Correct (+3)
        // 5 unattempted
      },
      result: {
        attemptId: completedAttemptAId,
        studentId: studentAUser.id,
        paperId: 1,
        paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
        examTag: 'BITSAT',
        submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        submissionReason: 'MANUAL',
        evaluationStatus: 'COMPLETED',
        totalQuestions: 5,
        attemptedQuestions: 4,
        correctQuestions: 3,
        incorrectQuestions: 1,
        unattemptedQuestions: 1,
        positiveMarks: 9,
        negativeMarks: 1,
        finalScore: 8,
        maximumMarks: 15,
        accuracy: 75.0,
        evaluatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        evaluatorVersion: '1.0.0',
        questionDetails: [
          { questionId: 1, questionType: 'objective', studentResponse: { selectedOption: 'B', isMarkedForReview: false }, evaluationStatus: 'CORRECT', marksAwarded: 3 },
          { questionId: 2, questionType: 'objective', studentResponse: { selectedOption: 'C', isMarkedForReview: false }, evaluationStatus: 'CORRECT', marksAwarded: 3 },
          { questionId: 3, questionType: 'objective', studentResponse: { selectedOption: 'A', isMarkedForReview: true }, evaluationStatus: 'INCORRECT', marksAwarded: -1 },
          { questionId: 4, questionType: 'numerical', studentResponse: { numericalValue: '5.00', isMarkedForReview: false }, evaluationStatus: 'CORRECT', marksAwarded: 3 },
          { questionId: 5, questionType: 'numerical', studentResponse: { isMarkedForReview: false }, evaluationStatus: 'UNATTEMPTED', marksAwarded: 0 },
        ],
      },
    });

    // 1a. Unauthenticated GET /result rejected with 401
    const unauthRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${completedAttemptAId}/result`);
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with 401 Unauthorized');

    // 1b. Cross-student access blocked with 403 Forbidden
    const crossStudentRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${completedAttemptAId}/result`, {
      headers: { Cookie: studentBCookie },
    });
    assert(crossStudentRes.status === 403, 'Cross-student result access rejected with 403 Forbidden');
    assert(crossStudentRes.json?.error?.includes('another student'), 'Descriptive ownership error returned');

    // 1c. Non-existent attempt ID returns 404 Not Found
    const nonExistentRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/att_dummy_99999/result`, {
      headers: { Cookie: studentACookie },
    });
    assert(nonExistentRes.status === 404, 'Non-existent attempt ID returns 404 Not Found');

    // 1d. Active attempt (IN_PROGRESS) does NOT expose result (returns 400)
    const activeAttemptId = `att_test_res_active_${Date.now()}`;
    injectTestAttempt({
      id: activeAttemptId,
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
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const activeRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${activeAttemptId}/result`, {
      headers: { Cookie: studentACookie },
    });
    assert(activeRes.status === 400, 'Active attempt result request rejected with 400 Bad Request');
    assert(activeRes.json?.error?.toLowerCase().includes('in progress'), 'Descriptive in-progress message returned');

    // 1e. Authorized student gets completed scorecard
    const authRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${completedAttemptAId}/result`, {
      headers: { Cookie: studentACookie },
    });
    assert(authRes.status === 200, 'Authorized student retrieves scorecard successfully (HTTP 200)');
    assert(authRes.json?.success === true, 'Response payload contains success: true');

    // =========================================================================
    // SECTION 2: DATA INTEGRITY & PERSISTED METRICS RECONCILIATION
    // =========================================================================
    console.log('\n--- SECTION 2: Data Integrity & Metrics Verification ---');

    const scorecard = authRes.json?.data;
    assert(scorecard?.attemptId === completedAttemptAId, 'Scorecard attemptId matches requested attempt');
    assert(scorecard?.finalScore === 8, `Score matches persisted result (8) [got ${scorecard?.finalScore}]`);
    assert(scorecard?.maximumMarks === 15, `Maximum marks matches authoritative total (15) [got ${scorecard?.maximumMarks}]`);
    assert(scorecard?.totalQuestions === 5, `Total questions matches paper (5) [got ${scorecard?.totalQuestions}]`);
    assert(scorecard?.attemptedQuestions === 4, `Attempted questions matches (4) [got ${scorecard?.attemptedQuestions}]`);
    assert(scorecard?.correctQuestions === 3, `Correct questions matches (3) [got ${scorecard?.correctQuestions}]`);
    assert(scorecard?.incorrectQuestions === 1, `Incorrect questions matches (1) [got ${scorecard?.incorrectQuestions}]`);
    assert(scorecard?.unattemptedQuestions === 1, `Unattempted questions matches (1) [got ${scorecard?.unattemptedQuestions}]`);
    assert(scorecard?.positiveMarks === 9, `Positive marks matches (9) [got ${scorecard?.positiveMarks}]`);
    assert(scorecard?.negativeMarks === 1, `Negative marks matches (1) [got ${scorecard?.negativeMarks}]`);
    assert(scorecard?.accuracy === 75, `Accuracy matches 75.00% [got ${scorecard?.accuracy}]`);
    assert(scorecard?.percentageScore === 53.33, `Percentage score matches (53.33%) [got ${scorecard?.percentageScore}]`);
    assert(scorecard?.markedForReviewCount === 1, `Marked for review count matches (1) [got ${scorecard?.markedForReviewCount}]`);
    assert(Boolean(scorecard?.formattedTimeTaken), `Formatted time taken present: "${scorecard?.formattedTimeTaken}"`);
    assert(scorecard?.submissionReason === 'MANUAL', 'Submission reason matches MANUAL');

    // Immutability: Repeated GET calls must return exact same score and never mutate attempt
    const authRes2 = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${completedAttemptAId}/result`, {
      headers: { Cookie: studentACookie },
    });
    assert(authRes2.json?.data?.finalScore === 8, 'Immutability verified: Repeated GET returns identical score');

    // Verify negative score handling in scorecard
    const negScoreAttemptId = `att_test_res_neg_${Date.now()}`;
    injectTestAttempt({
      id: negScoreAttemptId,
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
      submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      submissionReason: 'MANUAL',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {
        '1': { questionId: 1, questionType: 'objective', selectedOption: 'A', isMarkedForReview: false, version: 1 }, // Wrong (-1)
        '2': { questionId: 2, questionType: 'objective', selectedOption: 'A', isMarkedForReview: false, version: 1 }, // Wrong (-1)
        '3': { questionId: 3, questionType: 'objective', selectedOption: 'A', isMarkedForReview: false, version: 1 }, // Wrong (-1)
      },
      result: {
        attemptId: negScoreAttemptId,
        studentId: studentAUser.id,
        paperId: 1,
        paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
        examTag: 'BITSAT',
        submittedAt: new Date().toISOString(),
        submissionReason: 'MANUAL',
        evaluationStatus: 'COMPLETED',
        totalQuestions: 5,
        attemptedQuestions: 3,
        correctQuestions: 0,
        incorrectQuestions: 3,
        unattemptedQuestions: 2,
        positiveMarks: 0,
        negativeMarks: 3,
        finalScore: -3,
        maximumMarks: 15,
        accuracy: 0.0,
        evaluatedAt: new Date().toISOString(),
        evaluatorVersion: '1.0.0',
        questionDetails: [
          { questionId: 1, questionType: 'objective', studentResponse: { selectedOption: 'A', isMarkedForReview: false }, evaluationStatus: 'INCORRECT', marksAwarded: -1 },
          { questionId: 2, questionType: 'objective', studentResponse: { selectedOption: 'A', isMarkedForReview: false }, evaluationStatus: 'INCORRECT', marksAwarded: -1 },
          { questionId: 3, questionType: 'objective', studentResponse: { selectedOption: 'A', isMarkedForReview: false }, evaluationStatus: 'INCORRECT', marksAwarded: -1 },
          { questionId: 4, questionType: 'numerical', studentResponse: { isMarkedForReview: false }, evaluationStatus: 'UNATTEMPTED', marksAwarded: 0 },
          { questionId: 5, questionType: 'numerical', studentResponse: { isMarkedForReview: false }, evaluationStatus: 'UNATTEMPTED', marksAwarded: 0 },
        ],
      },
    });

    const negRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${negScoreAttemptId}/result`, {
      headers: { Cookie: studentACookie },
    });
    assert(negRes.status === 200, 'Negative score attempt result returns 200 OK');
    assert(negRes.json?.data?.finalScore === -3, `Negative final score (-3) preserved accurately [got ${negRes.json?.data?.finalScore}]`);
    assert(negRes.json?.data?.percentageScore === -20, `Negative percentage score (-20%) supported [got ${negRes.json?.data?.percentageScore}]`);

    // Verify zero attempts accuracy edge-case
    const zeroAttemptId = `att_test_res_zero_${Date.now()}`;
    injectTestAttempt({
      id: zeroAttemptId,
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
      submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      submissionReason: 'MANUAL',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: {},
      result: {
        attemptId: zeroAttemptId,
        studentId: studentAUser.id,
        paperId: 1,
        paperTitle: 'BITSAT 2026 Full Syllabus CBT Mock 01',
        examTag: 'BITSAT',
        submittedAt: new Date().toISOString(),
        submissionReason: 'MANUAL',
        evaluationStatus: 'COMPLETED',
        totalQuestions: 5,
        attemptedQuestions: 0,
        correctQuestions: 0,
        incorrectQuestions: 0,
        unattemptedQuestions: 5,
        positiveMarks: 0,
        negativeMarks: 0,
        finalScore: 0,
        maximumMarks: 15,
        accuracy: 0.0,
        evaluatedAt: new Date().toISOString(),
        evaluatorVersion: '1.0.0',
        questionDetails: [],
      },
    });

    const zeroRes = await probeUrl(`${BASE_URL}/api/student/tests/attempts/${zeroAttemptId}/result`, {
      headers: { Cookie: studentACookie },
    });
    assert(zeroRes.status === 200, 'Zero attempts attempt returns 200 OK');
    assert(zeroRes.json?.data?.accuracy === 0, `Zero attempts accuracy gracefully returns 0.00% without NaN [got ${zeroRes.json?.data?.accuracy}]`);

    // =========================================================================
    // SECTION 3: SECTIONAL AGGREGATION & RECONCILIATION
    // =========================================================================
    console.log('\n--- SECTION 3: Subject & Chapter Aggregation ---');

    // Test Subject-wise performance on completedAttemptAId
    const subjectBreakdown = scorecard?.subjectBreakdown || [];
    assert(Array.isArray(subjectBreakdown) && subjectBreakdown.length > 0, `Subject breakdown array returned (${subjectBreakdown.length} subjects)`);

    let sumSubQuestions = 0;
    let sumSubCorrect = 0;
    let sumSubIncorrect = 0;
    let sumSubUnattempted = 0;
    let sumSubMarks = 0;

    subjectBreakdown.forEach((sub) => {
      sumSubQuestions += sub.totalQuestions;
      sumSubCorrect += sub.correctQuestions;
      sumSubIncorrect += sub.incorrectQuestions;
      sumSubUnattempted += sub.unattemptedQuestions;
      sumSubMarks += sub.marksObtained;
    });

    assert(sumSubQuestions === scorecard.totalQuestions, `Subject questions reconcile with overall: ${sumSubQuestions} === ${scorecard.totalQuestions}`);
    assert(sumSubCorrect === scorecard.correctQuestions, `Subject correct reconcile with overall: ${sumSubCorrect} === ${scorecard.correctQuestions}`);
    assert(sumSubIncorrect === scorecard.incorrectQuestions, `Subject incorrect reconcile with overall: ${sumSubIncorrect} === ${scorecard.incorrectQuestions}`);
    assert(sumSubUnattempted === scorecard.unattemptedQuestions, `Subject unattempted reconcile with overall: ${sumSubUnattempted} === ${scorecard.unattemptedQuestions}`);
    assert(sumSubMarks === scorecard.finalScore, `Subject marks reconcile with overall finalScore: ${sumSubMarks} === ${scorecard.finalScore}`);

    // Test Chapter-wise performance
    const chapterBreakdown = scorecard?.chapterBreakdown || [];
    assert(Array.isArray(chapterBreakdown) && chapterBreakdown.length > 0, `Chapter breakdown array returned (${chapterBreakdown.length} chapters)`);

    let sumChapQuestions = 0;
    let sumChapMarks = 0;
    chapterBreakdown.forEach((ch) => {
      sumChapQuestions += ch.totalQuestions;
      sumChapMarks += ch.marksObtained;
    });
    assert(sumChapQuestions === scorecard.totalQuestions, `Chapter questions reconcile with overall: ${sumChapQuestions} === ${scorecard.totalQuestions}`);
    assert(sumChapMarks === scorecard.finalScore, `Chapter marks reconcile with overall finalScore: ${sumChapMarks} === ${scorecard.finalScore}`);

    // =========================================================================
    // SECTION 4: SECURITY & ANSWER-KEY LEAKAGE PROTECTION
    // =========================================================================
    console.log('\n--- SECTION 4: Security & Answer-Key Protection ---');

    // 1. Scorecard root payload strictly excludes sensitive fields
    assert(scorecard.correctOption === undefined, 'Root scorecard excludes correctOption');
    assert(scorecard.explanation === undefined, 'Root scorecard excludes explanation');
    assert(scorecard.rangeFrom === undefined, 'Root scorecard excludes rangeFrom');
    assert(scorecard.rangeTo === undefined, 'Root scorecard excludes rangeTo');
    assert(scorecard.tolerance === undefined, 'Root scorecard excludes tolerance');

    // 2. Questions review list excludes answer keys and explanations
    const questionsReview = scorecard?.questionsReview || [];
    assert(Array.isArray(questionsReview) && questionsReview.length === 5, 'questionsReview array contains 5 questions');

    const leakChecks = questionsReview.map((q) => {
      return (
        q.correctOption === undefined &&
        q.explanation === undefined &&
        q.rangeFrom === undefined &&
        q.rangeTo === undefined &&
        q.tolerance === undefined
      );
    });
    const allQuestionsLeakFree = leakChecks.every(Boolean);
    assert(allQuestionsLeakFree, 'Zero leakage: ALL question review objects strictly omit correctOption, explanation, rangeFrom, rangeTo, and tolerance');

    // 3. Official Answer Release Policy
    assert(scorecard.answerReleasePolicy?.isAvailable === false, 'answerReleasePolicy.isAvailable is false (protected by policy)');
    assert(
      scorecard.answerReleasePolicy?.message === 'Answer keys and detailed explanations are not currently available for this test.',
      'Neutral policy notice accurately returned: "Answer keys and detailed explanations are not currently available for this test."'
    );

    // =========================================================================
    // SECTION 5: STUDENT WEB INTERFACE PROBING
    // =========================================================================
    console.log('\n--- SECTION 5: Student Results Web Interface Probing ---');

    // 1. Probing /student/tests/results/[attemptId]
    const resultsPageRes = await probeUrl(`${BASE_URL}/student/tests/results/${completedAttemptAId}`, {
      headers: { Cookie: studentACookie },
    });
    assert(resultsPageRes.status === 200, 'GET /student/tests/results/[attemptId] loads with HTTP 200 OK');
    assert(resultsPageRes.contentType.includes('text/html'), 'Results page serves valid HTML content');

    // 2. Probing /student/tests/session/[attemptId] (completed test shows scorecard button)
    const sessionPageRes = await probeUrl(`${BASE_URL}/student/tests/session/${completedAttemptAId}`, {
      headers: { Cookie: studentACookie },
    });
    assert(sessionPageRes.status === 200, 'GET /student/tests/session/[attemptId] on completed attempt serves 200 OK');

    // Summary
    console.log('\n================================================================');
    console.log(`FEATURE 2.6 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      console.error('\n✗ Feature 2.6 verification failed.');
      process.exit(1);
    } else {
      console.log('\n✓ Feature 2.6 fully verified with zero errors.');
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

runFeature26Tests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
