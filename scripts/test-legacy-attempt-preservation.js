/**
 * 10Q CHALLENGE LMS — STAGE 3.2.1 VERIFICATION SUITE
 * Legacy Student Attempt Preservation Audit
 *
 * Rigorously verifies Scenarios A-E using isolated temporary fixtures.
 * Strictly guarantees that all 12 baseline attempts in data/test-attempts.json
 * are protected from modification, deletion, or corruption.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = 3010;
const BASE_URL = `http://localhost:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function httpProbe(urlStr, options = {}) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const reqOpts = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      };

      const req = http.request(reqOpts, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            json,
          });
        });
      });

      req.on('error', (err) => {
        resolve({ status: 0, error: err.message, body: '', json: null });
      });

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    } catch (e) {
      resolve({ status: 0, error: e.message, body: '', json: null });
    }
  });
}

function extractCookie(probeRes, cookieName) {
  const raw = probeRes.headers['set-cookie'] || [];
  const cookies = Array.isArray(raw) ? raw : [raw];
  for (const c of cookies) {
    const match = c.match(new RegExp(`${cookieName}=([^;]+)`));
    if (match) return `${cookieName}=${match[1]}`;
  }
  return '';
}

function extractCsrf(probeRes) {
  const raw = probeRes.headers['set-cookie'] || [];
  const cookies = Array.isArray(raw) ? raw : [raw];
  for (const c of cookies) {
    const match = c.match(/10q_csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

async function runLegacyPreservationTests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — STAGE 3.2.1 VERIFICATION SUITE');
  console.log('Legacy Student Attempt Preservation Audit (Scenarios A - E)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  const attemptsPath = path.resolve(__dirname, '..', 'data', 'test-attempts.json');
  const attemptsPathMirror = path.resolve(__dirname, '..', 'frontend', 'data', 'test-attempts.json');
  const seriesPath = path.resolve(__dirname, '..', 'data', 'test-series.json');
  const seriesPathMirror = path.resolve(__dirname, '..', 'frontend', 'data', 'test-series.json');

  // Baseline Verification
  console.log('--- 1. Baseline Integrity Pre-Audit ---');
  const initialHash = computeFileHash(attemptsPath);
  const initialAttempts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
  assert(initialAttempts.length === 12, `Baseline contains exactly 12 student attempts (found: ${initialAttempts.length})`);
  assert(initialAttempts.every((a) => Number(a.paperId) === 1), 'All 12 baseline attempts reference Paper #1');

  const completedBaseline = initialAttempts.find((a) => a.id === 'att_test_concurrent_1795026581477');
  assert(completedBaseline && completedBaseline.status === 'COMPLETED', 'Completed baseline attempt #11 exists with status COMPLETED');
  assert(completedBaseline.result && completedBaseline.result.finalScore === 6, 'Completed baseline attempt #11 score is exactly 6/15');

  const inProgressBaseline = initialAttempts.filter((a) => a.status === 'IN_PROGRESS');
  assert(inProgressBaseline.length === 11, `Exactly 11 baseline attempts have status IN_PROGRESS (found: ${inProgressBaseline.length})`);

  // Launch isolated production server on PORT 3010
  console.log(`\nStarting isolated test server on port ${PORT}...`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'development' },
    stdio: 'ignore',
  });

  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await wait(400);
    const probe = await httpProbe(`${BASE_URL}/api/admin/overview`);
    if (probe.status === 401 || probe.status === 200 || probe.status === 403) {
      serverReady = true;
      break;
    }
  }

  if (!serverReady) {
    console.error('Failed to spawn server on port ' + PORT);
    serverProcess.kill();
    process.exit(1);
  }

  console.log('Server online. Initiating Scenario Tests...\n');

  // Tracking temporary records for guaranteed cleanup
  const temporaryTestPaperIds = [];
  const temporaryAttemptIds = [];

  try {
    // Authenticate Admin and Student
    const adminLogin = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.admin@10qchallenge.in', password: 'AdminPass2026!' }),
    });
    const adminCookie = extractCookie(adminLogin, '10q_auth_token');
    const adminCsrf = extractCsrf(adminLogin);

    const studentLogin = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    const studentCookie = extractCookie(studentLogin, '10q_auth_token');
    const studentCsrf = extractCsrf(studentLogin);

    const studentBLogin = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.isolation.test@example.com', password: 'StudentPass2026!' }),
    });
    const studentBCookie = extractCookie(studentBLogin, '10q_auth_token');
    const studentBCsrf = extractCsrf(studentBLogin);

    assert(Boolean(adminCookie && adminCsrf), 'Admin authenticated successfully');
    assert(Boolean(studentCookie && studentCsrf), 'Student A authenticated successfully');
    assert(Boolean(studentBCookie && studentBCsrf), 'Student B authenticated successfully');

    // =========================================================================
    // SCENARIO A: Legacy-style attempt without questionSnapshots preserves
    // its original paper configuration across paper version updates.
    // =========================================================================
    console.log('\n--- Scenario A: Legacy Attempt Question Resolution After Version Upgrade ---');
    // 1. Create temporary Paper A with questions [1, 2, 3] at Version 1
    const createPaperARes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Temporary Test Paper A (Scenario A)',
        examTag: 'BITSAT',
        durationMinutes: 180,
        status: 'Published',
        questionIds: [1, 2, 3],
        markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      }),
    });
    assert(createPaperARes.status === 201, 'Created temporary Paper A at version 1 (201 Created)');
    const paperA = createPaperARes.json?.data;
    const paperAId = paperA.id;
    temporaryTestPaperIds.push(paperAId);
    assert(paperA.version === 1, 'Paper A initializes at version 1');

    // 2. Insert isolated legacy-style in-progress attempt directly into store (NO questionSnapshots, NO paperVersion)
    const legacyAttAId = `att_legacy_test_A_${Date.now()}`;
    temporaryAttemptIds.push(legacyAttAId);
    const legacyAttemptA = {
      id: legacyAttAId,
      studentId: 8,
      studentName: 'Test Student',
      studentEmail: 'test.student@10qchallenge.in',
      paperId: paperAId,
      paperTitle: paperA.title,
      examTag: paperA.examTag,
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 3,
      totalMarks: 9,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      responses: {},
      visitedQuestionIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Explicitly omit paperVersion and questionSnapshots to replicate legacy schema!
    };

    // Safely append to disk store
    const curAttsA = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    curAttsA.push(legacyAttemptA);
    fs.writeFileSync(attemptsPath, JSON.stringify(curAttsA, null, 2), 'utf-8');
    if (fs.existsSync(attemptsPathMirror)) {
      fs.writeFileSync(attemptsPathMirror, JSON.stringify(curAttsA, null, 2), 'utf-8');
    }

    // 3. Update Paper A to Version 2 with completely different questions: [4, 5]
    const updatePaperARes = await httpProbe(`${BASE_URL}/api/admin/test-series/${paperAId}`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionIds: [4, 5],
      }),
    });
    assert(updatePaperARes.status === 200, 'Updated Paper A to Version 2 with questions [4, 5]');
    const updatedPaperA = updatePaperARes.json?.data;
    assert(updatedPaperA.version === 2, 'Paper A version incremented to 2');
    assert(updatedPaperA.versions.length === 1 && updatedPaperA.versions[0].version === 1, 'Previous version 1 archived');
    assert(JSON.stringify(updatedPaperA.versions[0].questionIds) === JSON.stringify([1, 2, 3]), 'Archived version 1 preserves questionIds [1, 2, 3]');

    // 4. Student queries questions for legacy attempt A
    const fetchQuesARes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttAId}/questions`, {
      headers: { Cookie: studentCookie },
    });
    assert(fetchQuesARes.status === 200, 'Legacy attempt queries CBT questions -> 200 OK');
    const deliveredQuesA = fetchQuesARes.json?.questions || [];
    const deliveredQuesIdsA = deliveredQuesA.map((q) => q.id);
    assert(
      JSON.stringify(deliveredQuesIdsA) === JSON.stringify([1, 2, 3]),
      `CRITICAL: Legacy attempt authoritatively resolves original questions [1, 2, 3] (delivered: ${JSON.stringify(deliveredQuesIdsA)})`
    );
    assert(!deliveredQuesIdsA.includes(4) && !deliveredQuesIdsA.includes(5), 'New version questions [4, 5] strictly excluded from legacy attempt');
    assert(fetchQuesARes.json?.paperVersion === 1, 'Delivery payload identifies paperVersion as 1');

    // =========================================================================
    // SCENARIO B: Legacy-style completed attempt with known score preserves
    // scorecard and evaluation outcomes when Question Master changes.
    // =========================================================================
    console.log('\n--- Scenario B: Completed Legacy Scorecard Preservation Under Master Edits ---');
    // 1. Create temporary Paper B
    const createPaperBRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Temporary Test Paper B (Scenario B)',
        examTag: 'BITSAT',
        durationMinutes: 180,
        status: 'Published',
        questionIds: [1, 2],
        markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      }),
    });
    const paperBId = createPaperBRes.json?.data?.id;
    temporaryTestPaperIds.push(paperBId);

    // 2. Insert isolated legacy-style COMPLETED attempt with known score: 6/6
    const legacyAttBId = `att_legacy_test_B_${Date.now()}`;
    temporaryAttemptIds.push(legacyAttBId);
    const legacyAttemptB = {
      id: legacyAttBId,
      studentId: 8,
      studentName: 'Test Student',
      studentEmail: 'test.student@10qchallenge.in',
      paperId: paperBId,
      paperTitle: 'Temporary Test Paper B (Scenario B)',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 2,
      totalMarks: 6,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: '2026-11-18T10:00:00.000Z',
      submittedAt: '2026-11-18T11:00:00.000Z',
      expiresAt: '2026-11-18T13:00:00.000Z',
      status: 'COMPLETED',
      responses: {
        '1': { questionId: 1, questionType: 'objective', selectedOption: 'B', version: 1 },
        '2': { questionId: 2, questionType: 'objective', selectedOption: 'C', version: 1 },
      },
      visitedQuestionIds: [1, 2],
      result: {
        attemptId: legacyAttBId,
        studentId: 8,
        paperId: paperBId,
        paperTitle: 'Temporary Test Paper B (Scenario B)',
        examTag: 'BITSAT',
        submittedAt: '2026-11-18T11:00:00.000Z',
        submissionReason: 'MANUAL',
        evaluationStatus: 'COMPLETED',
        totalQuestions: 2,
        attemptedQuestions: 2,
        correctQuestions: 2,
        incorrectQuestions: 0,
        unattemptedQuestions: 0,
        positiveMarks: 6,
        negativeMarks: 0,
        finalScore: 6,
        maximumMarks: 6,
        accuracy: 100,
        evaluatedAt: '2026-11-18T11:00:00.000Z',
        evaluatorVersion: '1.0.0',
        questionDetails: [
          {
            questionId: 1,
            questionType: 'objective',
            studentResponse: { selectedOption: 'B', numericalValue: null, isMarkedForReview: false },
            evaluationStatus: 'CORRECT',
            marksAwarded: 3,
          },
          {
            questionId: 2,
            questionType: 'objective',
            studentResponse: { selectedOption: 'C', numericalValue: null, isMarkedForReview: false },
            evaluationStatus: 'CORRECT',
            marksAwarded: 3,
          },
        ],
      },
      createdAt: '2026-11-18T10:00:00.000Z',
      updatedAt: '2026-11-18T11:00:00.000Z',
      // No questionSnapshots or paperVersion
    };

    const curAttsB = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    curAttsB.push(legacyAttemptB);
    fs.writeFileSync(attemptsPath, JSON.stringify(curAttsB, null, 2), 'utf-8');
    if (fs.existsSync(attemptsPathMirror)) {
      fs.writeFileSync(attemptsPathMirror, JSON.stringify(curAttsB, null, 2), 'utf-8');
    }

    // Also update Paper B to Version 2 with different questions [3, 4]
    await httpProbe(`${BASE_URL}/api/admin/test-series/${paperBId}`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds: [3, 4] }),
    });

    // 3. Admin alters Question 1 in Question Master: changes correctOption from 'B' to 'A'
    const editQ1Res = await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'A', // Changed from canonical B
        questionContent: 'MUTATED TEXT TO TEST SCORECARD RESILIENCE',
      }),
    });
    assert(editQ1Res.status === 200, 'Altered Question #1 in Question Master (correctOption B -> A)');

    // 4. Student queries scorecard for legacy completed attempt B
    const fetchScorecardBRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttBId}/result`, {
      headers: { Cookie: studentCookie },
    });
    assert(fetchScorecardBRes.status === 200, 'Legacy completed scorecard retrieved -> 200 OK');
    const scorecardB = fetchScorecardBRes.json?.data;
    assert(scorecardB.finalScore === 6, `CRITICAL: Legacy final score strictly preserved at 6 (found: ${scorecardB.finalScore})`);
    assert(scorecardB.correctQuestions === 2, 'Legacy correct question count strictly preserved at 2');
    assert(scorecardB.questionsReview && scorecardB.questionsReview.length === 2, 'Scorecard displays exactly the 2 questions from original attempt');

    const q1Review = scorecardB.questionsReview.find((q) => q.questionId === 1);
    assert(q1Review !== undefined, 'Question #1 present in scorecard review');
    assert(q1Review.evaluationStatus === 'CORRECT', 'Question #1 remains marked as CORRECT (+3 marks)');
    assert(q1Review.marksAwarded === 3, 'Question #1 marksAwarded strictly preserved at 3');

    // 5. Restore Question 1 in Question Master immediately
    await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'B',
        questionContent: 'A particle moves along a straight line such that its displacement x at time t is given by x = 3t² - 12t + 9. At what time is the velocity of the particle zero?',
      }),
    });

    // =========================================================================
    // SCENARIO C: In-progress legacy attempt can continue saving answers
    // and its original question set remains unchanged when paper version updates.
    // =========================================================================
    console.log('\n--- Scenario C: In-Progress Legacy Answer Saving & Submission After Version Update ---');
    // 1. Create temporary Paper C with questions [1, 2, 3]
    const createPaperCRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Temporary Test Paper C (Scenario C)',
        examTag: 'BITSAT',
        durationMinutes: 180,
        status: 'Published',
        questionIds: [1, 2, 3],
        markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      }),
    });
    const paperCId = createPaperCRes.json?.data?.id;
    temporaryTestPaperIds.push(paperCId);

    // 2. Insert isolated legacy-style in-progress attempt C
    const legacyAttCId = `att_legacy_test_C_${Date.now()}`;
    temporaryAttemptIds.push(legacyAttCId);
    const legacyAttemptC = {
      id: legacyAttCId,
      studentId: 8,
      studentName: 'Test Student',
      studentEmail: 'test.student@10qchallenge.in',
      paperId: paperCId,
      paperTitle: 'Temporary Test Paper C (Scenario C)',
      examTag: 'BITSAT',
      targetYear: 2026,
      durationMinutes: 180,
      totalQuestions: 3,
      totalMarks: 9,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      responses: {},
      visitedQuestionIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Legacy: No snapshots, no paperVersion
    };

    const curAttsC = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    curAttsC.push(legacyAttemptC);
    fs.writeFileSync(attemptsPath, JSON.stringify(curAttsC, null, 2), 'utf-8');
    if (fs.existsSync(attemptsPathMirror)) {
      fs.writeFileSync(attemptsPathMirror, JSON.stringify(curAttsC, null, 2), 'utf-8');
    }

    // 3. Admin updates Paper C to Version 2: questions [4, 5] (Question 1 removed from latest version)
    await httpProbe(`${BASE_URL}/api/admin/test-series/${paperCId}`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds: [4, 5] }),
    });

    // 4. Student actively saves answer for Question #1 (Option 'B') on legacy attempt C
    const saveAnsCRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttCId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 1,
        questionType: 'objective',
        selectedOption: 'B',
      }),
    });
    assert(saveAnsCRes.status === 200, 'CRITICAL: Student successfully saves answer for Question #1 on legacy attempt (HTTP 200)');
    assert(saveAnsCRes.json?.response?.selectedOption === 'B', 'Saved response records Option B');

    // 5. Submit legacy attempt C
    const submitCRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttCId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(submitCRes.status === 200, 'Legacy attempt submitted -> 200 OK');
    const resultC = submitCRes.json?.result;
    assert(resultC.totalQuestions === 3, `Evaluation evaluated against original 3 questions (found: ${resultC.totalQuestions})`);
    assert(resultC.correctQuestions === 1, 'Question #1 evaluated as CORRECT (+3 marks)');
    assert(resultC.finalScore === 3, 'Final score accurately calculated as 3');

    // =========================================================================
    // SCENARIO D: New attempts use latest published version and immutable snapshots.
    // =========================================================================
    console.log('\n--- Scenario D: New Attempts Use Latest Published Version & Frozen Snapshots ---');
    // Start fresh attempt on Paper C (currently at Version 2, questions [4, 5])
    const newAttStartRes = await httpProbe(`${BASE_URL}/api/student/tests/${paperCId}/start`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf },
    });
    assert(newAttStartRes.status === 200 || newAttStartRes.status === 201, 'Started new attempt on Paper C -> HTTP 200/201');
    const newAttId = newAttStartRes.json?.attemptId;
    temporaryAttemptIds.push(newAttId);

    // Read stored new attempt record from disk
    const curAttsD = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    const freshRecord = curAttsD.find((a) => a.id === newAttId);
    assert(freshRecord.paperVersion === 2, 'New attempt explicitly records paperVersion: 2');
    assert(Boolean(freshRecord.questionSnapshots), 'New attempt creates immutable questionSnapshots');
    const snapshotKeys = Object.keys(freshRecord.questionSnapshots);
    assert(
      snapshotKeys.length === 2 && snapshotKeys.includes('4') && snapshotKeys.includes('5'),
      `Snapshots contain exactly the 2 questions from Version 2 ([4, 5], found: ${JSON.stringify(snapshotKeys)})`
    );

    // =========================================================================
    // SCENARIO E: Legacy and new attempts cannot be confused when versions differ.
    // =========================================================================
    console.log('\n--- Scenario E: Strict Segregation Between Legacy (v1) & Modern (v2) Attempts ---');
    // Start modern attempt on Paper A (which was updated to Version 2 with questions [4, 5]) for Student B
    const newAttAStartRes = await httpProbe(`${BASE_URL}/api/student/tests/${paperAId}/start`, {
      method: 'POST',
      headers: { Cookie: studentBCookie, 'x-csrf-token': studentBCsrf },
    });
    assert(newAttAStartRes.status === 200 || newAttAStartRes.status === 201, 'Started modern attempt on Paper A (Version 2) for Student B');
    const newAttAId = newAttAStartRes.json?.attemptId;
    temporaryAttemptIds.push(newAttAId);

    // Fetch questions for in-progress legacy attempt A on Paper A (Version 1, Student A)
    const qLegacyRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttAId}/questions`, {
      headers: { Cookie: studentCookie },
    });
    const legacyQues = qLegacyRes.json?.questions?.map((q) => q.id) || [];

    // Fetch questions for modern attempt on Paper A (Version 2, Student B)
    const qNewRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${newAttAId}/questions`, {
      headers: { Cookie: studentBCookie },
    });
    const newQues = qNewRes.json?.questions?.map((q) => q.id) || [];

    assert(
      JSON.stringify(legacyQues) === JSON.stringify([1, 2, 3]),
      `Legacy attempt on Paper A delivers Version 1 questions [1, 2, 3] (delivered: ${JSON.stringify(legacyQues)})`
    );
    assert(
      JSON.stringify(newQues) === JSON.stringify([4, 5]),
      `Modern attempt on Paper A delivers Version 2 questions [4, 5] (delivered: ${JSON.stringify(newQues)})`
    );
    assert(
      !legacyQues.some((id) => newQues.includes(id)),
      'CRITICAL: Zero question collision or confusion between Version 1 and Version 2 attempts on same test paper'
    );

    // =========================================================================
    // CLEANUP OF TEMPORARY FIXTURES & FINAL BASELINE VERIFICATION
    // =========================================================================
    console.log('\n--- 2. Cleanup of Temporary Test Fixtures ---');
    // 1. Remove temporary attempts from disk
    const allAtts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    const cleanedAtts = allAtts.filter((a) => !temporaryAttemptIds.includes(a.id));
    fs.writeFileSync(attemptsPath, JSON.stringify(cleanedAtts, null, 2), 'utf-8');
    if (fs.existsSync(attemptsPathMirror)) {
      fs.writeFileSync(attemptsPathMirror, JSON.stringify(cleanedAtts, null, 2), 'utf-8');
    }
    console.log(`  ✓ Removed ${temporaryAttemptIds.length} temporary test attempts.`);

    // 2. Remove temporary test papers via Admin API
    for (const tid of temporaryTestPaperIds) {
      const delRes = await httpProbe(`${BASE_URL}/api/admin/test-series/${tid}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf },
      });
      assert(delRes.status === 200, `Deleted temporary test paper #${tid}`);
    }

    // 3. Final baseline check
    console.log('\n--- 3. Post-Audit Baseline Verification of 12 Original Attempts ---');
    const finalHash = computeFileHash(attemptsPath);
    const finalAttempts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    assert(finalAttempts.length === 12, `Exactly 12 baseline attempts preserved on disk (count: ${finalAttempts.length})`);
    assert(finalAttempts.every((a) => Number(a.paperId) === 1), 'All 12 baseline attempts continue to reference Paper #1');

    const finalCompleted = finalAttempts.find((a) => a.id === 'att_test_concurrent_1795026581477');
    assert(finalCompleted && finalCompleted.status === 'COMPLETED', 'Baseline completed attempt #11 intact with COMPLETED status');
    assert(finalCompleted.result && finalCompleted.result.finalScore === 6, 'Baseline completed attempt #11 score strictly preserved as 6/15');

    const finalInProgress = finalAttempts.filter((a) => a.status === 'IN_PROGRESS');
    assert(finalInProgress.length === 11, `Exactly 11 baseline attempts remain in IN_PROGRESS status (found: ${finalInProgress.length})`);

    const finalHashMatch = initialHash === finalHash;
    assert(finalHashMatch, `SHA256 hash matches pre-audit baseline exactly (${finalHash})`);

  } catch (err) {
    console.error('Fatal error in legacy preservation suite:', err);
    failed++;
  } finally {
    console.log('\n--- Test Cleanup & Server Teardown ---');
    serverProcess.kill('SIGTERM');
    await wait(800);

    console.log('================================================================');
    console.log(`STAGE 3.2.1 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}

runLegacyPreservationTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
