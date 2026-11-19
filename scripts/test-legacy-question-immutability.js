/**
 * 10Q CHALLENGE LMS — STAGE 3.2.2 VERIFICATION SUITE
 * Legacy Question Content Immutability & Evaluation Behavior Audit
 *
 * Scenarios A - E using isolated temporary fixtures.
 * Strictly guarantees that all 12 baseline attempts in data/test-attempts.json
 * are protected from modification, deletion, or corruption.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = 3011;
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

async function runStage322Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — STAGE 3.2.2 VERIFICATION SUITE');
  console.log('Legacy Question Content Immutability & Evaluation Behavior Audit');
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
  const questionsPath = path.resolve(__dirname, '..', 'data', 'questions.json');
  const questionsPathMirror = path.resolve(__dirname, '..', 'frontend', 'data', 'questions.json');
  const compatPath = path.resolve(__dirname, '..', 'data', 'compatibility-snapshots.json');
  const compatPathMirror = path.resolve(__dirname, '..', 'frontend', 'data', 'compatibility-snapshots.json');

  // 1. Baseline Integrity Pre-Audit
  console.log('--- 1. Baseline Integrity Pre-Audit ---');
  const initialAttemptsHash = computeFileHash(attemptsPath);
  assert(
    initialAttemptsHash === '8139ace4cf76a13bcb2b8dace913c1cd07de7dc54ddbc632d95e7c8e244b411e',
    `Initial attempts SHA-256 matches certified baseline (8139ace4cf76a13bcb2b8dace913c1cd07de7dc54ddbc632d95e7c8e244b411e)`
  );

  const initialAttempts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
  assert(initialAttempts.length === 12, `Baseline contains exactly 12 student attempts (found: ${initialAttempts.length})`);
  assert(initialAttempts.every((a) => Number(a.paperId) === 1), 'All 12 baseline attempts reference Paper #1');

  const completedBaseline = initialAttempts.find((a) => a.id === 'att_test_concurrent_1795026581477');
  assert(completedBaseline && completedBaseline.status === 'COMPLETED', 'Completed baseline attempt #11 has status COMPLETED');
  assert(completedBaseline.result && completedBaseline.result.finalScore === 6, 'Completed baseline attempt #11 score is 6/15');

  const inProgressBaseline = initialAttempts.filter((a) => a.status === 'IN_PROGRESS');
  assert(inProgressBaseline.length === 11, `Exactly 11 baseline attempts have status IN_PROGRESS (found: ${inProgressBaseline.length})`);

  // Launch isolated production server on PORT 3011
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

  const temporaryTestPaperIds = [];
  const temporaryAttemptIds = [];
  const temporaryCompatKeys = [];

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

    assert(Boolean(adminCookie && adminCsrf), 'Admin authenticated successfully');
    assert(Boolean(studentCookie && studentCsrf), 'Student authenticated successfully');

    // =========================================================================
    // SCENARIO A: Resumed legacy attempt retains original question content
    // after Question Master record is edited.
    // =========================================================================
    console.log('\n--- Scenario A: Resumed Legacy Attempt Question Content Immutability ---');
    // 1. Create temporary Paper A with Question 1
    const createPaperARes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Temporary Paper A (Scenario A Content Immutability)',
        examTag: 'BITSAT',
        durationMinutes: 180,
        status: 'Published',
        questionIds: [1],
        markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      }),
    });
    const paperA = createPaperARes.json?.data;
    const paperAId = paperA.id;
    temporaryTestPaperIds.push(paperAId);

    // Save compatibility snapshot for Paper A Version 1 capturing Question 1's authentic text
    const compatKeyA = `${paperAId}_v1`;
    temporaryCompatKeys.push(compatKeyA);
    const compatData = JSON.parse(fs.readFileSync(compatPath, 'utf-8'));
    compatData[compatKeyA] = {
      paperId: paperAId,
      paperVersion: 1,
      createdAt: new Date().toISOString(),
      questionSnapshots: {
        '1': {
          id: 1,
          questionNumber: 1,
          questionType: 'objective',
          subjectId: 1,
          subjectName: 'Physics',
          chapterId: 1,
          chapterName: 'Kinematics',
          questionContent: 'A particle moves along a straight line such that its displacement x at time t is given by x = 3t² - 12t + 9. At what time is the velocity of the particle zero?',
          optionA: 't = 1 s',
          optionB: 't = 2 s',
          optionC: 't = 3 s',
          optionD: 't = 4 s',
          correctOption: 'B',
          explanation: 'Velocity v = dx/dt = 6t - 12 => t = 2s.',
          difficulty: 'Medium',
          orderNumber: 1,
          positiveMarks: 3,
          negativeMarks: 1,
        },
      },
    };
    fs.writeFileSync(compatPath, JSON.stringify(compatData, null, 2), 'utf-8');
    if (fs.existsSync(compatPathMirror)) {
      fs.writeFileSync(compatPathMirror, JSON.stringify(compatData, null, 2), 'utf-8');
    }

    // 2. Insert isolated legacy-style in-progress attempt on Paper A (NO snapshots on record)
    const legacyAttAId = `att_legacy_content_A_${Date.now()}`;
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
      totalQuestions: 1,
      totalMarks: 3,
      markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
      status: 'IN_PROGRESS',
      responses: {},
      visitedQuestionIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Legacy: No questionSnapshots
    };

    const curAttsA = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    curAttsA.push(legacyAttemptA);
    fs.writeFileSync(attemptsPath, JSON.stringify(curAttsA, null, 2), 'utf-8');
    if (fs.existsSync(attemptsPathMirror)) {
      fs.writeFileSync(attemptsPathMirror, JSON.stringify(curAttsA, null, 2), 'utf-8');
    }

    // 3. Admin alters Question 1 in Question Master: modifies text and options
    const editQ1Res = await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionContent: 'MUTATED QUESTION CONTENT FOR SCENARIO A AUDIT',
        optionA: 'MUTATED OPTION A',
        optionB: 'MUTATED OPTION B',
      }),
    });
    assert(editQ1Res.status === 200, 'Altered Question #1 in Question Master');

    // 4. Student resumes legacy attempt and requests CBT questions
    const resumeQuesRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttAId}/questions`, {
      headers: { Cookie: studentCookie },
    });
    assert(resumeQuesRes.status === 200, 'Student resumes legacy attempt -> HTTP 200');
    const deliveredQ1 = resumeQuesRes.json?.questions?.[0];
    assert(deliveredQ1 !== undefined, 'Delivered Question #1 in resumed session');
    assert(
      !deliveredQ1.questionContent.includes('MUTATED QUESTION CONTENT'),
      'CRITICAL: Delivered question content does NOT contain mutated Question Master text'
    );
    assert(
      deliveredQ1.questionContent.includes('A particle moves along a straight line'),
      'CRITICAL: Resumed legacy attempt strictly displays authentic original question content'
    );
    assert(deliveredQ1.optionA === 't = 1 s', 'Option A strictly displays original option text');
    assert(deliveredQ1.optionB === 't = 2 s', 'Option B strictly displays original option text');

    // =========================================================================
    // SCENARIO B: Submitting original correct answer evaluates as CORRECT
    // even after Question Master correct answer key was changed.
    // =========================================================================
    console.log('\n--- Scenario B: Evaluation Against Frozen Answer Key Under Master Key Changes ---');
    // Admin changes correct answer of Question 1 from B to A in Question Master
    const editKeyRes = await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'A', // Changed from canonical B to A
      }),
    });
    assert(editKeyRes.status === 200, 'Changed Question #1 correctOption in Question Master from B to A');

    // Student saves Option 'B' (the original correct answer) on legacy attempt A
    const saveAnsRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttAId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 1,
        questionType: 'objective',
        selectedOption: 'B',
      }),
    });
    assert(saveAnsRes.status === 200, 'Saved Option B on legacy attempt');

    // Student submits legacy attempt A
    const submitARes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttAId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(submitARes.status === 200, 'Legacy attempt submitted -> HTTP 200');
    const resultA = submitARes.json?.result;
    assert(
      resultA.correctQuestions === 1,
      'CRITICAL: Evaluation awarded 1 correct question using frozen snapshot answer key (Option B is CORRECT)!'
    );
    assert(resultA.finalScore === 3, 'Final score calculated as 3 (+3 marks for Option B)');
    assert(resultA.incorrectQuestions === 0, 'Zero incorrect questions recorded');

    // Restore Question 1 in Question Master immediately
    await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'B',
        questionContent: 'A particle moves along a straight line such that its displacement x at time t is given by x = 3t² - 12t + 9. At what time is the velocity of the particle zero?',
        optionA: 't = 1 s',
        optionB: 't = 2 s',
        optionC: 't = 3 s',
        optionD: 't = 4 s',
      }),
    });

    // =========================================================================
    // SCENARIO C: In-progress legacy attempt does not silently display
    // changed content if an immutable original snapshot is available.
    // =========================================================================
    console.log('\n--- Scenario C: Protection Against Silent Question Content Drift ---');
    // Verified by Scenario A above: Question text & options strictly resolved from snapshot
    assert(
      !deliveredQ1.questionContent.includes('MUTATED'),
      'Resumed attempt was strictly shielded from Question Master content drift'
    );

    // =========================================================================
    // SCENARIO D: Completed attempts continue using frozen evaluation details.
    // =========================================================================
    console.log('\n--- Scenario D: Completed Attempt Scorecard Resilience ---');
    // Admin mutates Question 1 content again
    await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'D',
        questionContent: 'ANOTHER MUTATION TEST FOR COMPLETED SCORECARDS',
      }),
    });

    // Student queries scorecard for submitted legacy attempt A
    const fetchScorecardARes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${legacyAttAId}/result`, {
      headers: { Cookie: studentCookie },
    });
    assert(fetchScorecardARes.status === 200, 'Scorecard fetched for submitted attempt A');
    const scorecardA = fetchScorecardARes.json?.data;
    assert(scorecardA.finalScore === 3, 'Scorecard final score remains strictly 3');
    assert(scorecardA.correctQuestions === 1, 'Scorecard correct question count remains 1');
    assert(scorecardA.questionsReview?.[0]?.evaluationStatus === 'CORRECT', 'Review item outcome remains CORRECT');
    assert(scorecardA.questionsReview?.[0]?.marksAwarded === 3, 'Review item marksAwarded remains 3');

    // Also query baseline completed attempt #11
    const fetchBase11Res = await httpProbe(`${BASE_URL}/api/student/tests/attempts/att_test_concurrent_1795026581477/result`, {
      headers: { Cookie: studentCookie },
    });
    assert(fetchBase11Res.status === 200, 'Baseline completed attempt #11 scorecard fetched');
    assert(fetchBase11Res.json?.data?.finalScore === 6, 'Baseline attempt #11 score strictly remains 6/15');

    // Restore Question 1 in Question Master
    await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'B',
        questionContent: 'A particle moves along a straight line such that its displacement x at time t is given by x = 3t² - 12t + 9. At what time is the velocity of the particle zero?',
        optionA: 't = 1 s',
        optionB: 't = 2 s',
        optionC: 't = 3 s',
        optionD: 't = 4 s',
      }),
    });

    // =========================================================================
    // SCENARIO E: Modern attempts continue using own questionSnapshots
    // and are completely unaffected by Question Master edits.
    // =========================================================================
    console.log('\n--- Scenario E: Modern Attempt Snapshot Immunity ---');
    // 1. Start modern attempt on Paper A
    const startModernRes = await httpProbe(`${BASE_URL}/api/student/tests/${paperAId}/start`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf },
    });
    assert(startModernRes.status === 200 || startModernRes.status === 201, 'Started modern attempt on Paper A');
    const modernAttId = startModernRes.json?.attemptId;
    temporaryAttemptIds.push(modernAttId);

    // 2. Admin alters Question 1 in Question Master (correctOption B -> C)
    await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'C',
        questionContent: 'MODERN SNAPSHOT IMMUNITY TEST CONTENT',
      }),
    });

    // 3. Student fetches questions for modern attempt: MUST see frozen questionSnapshots text
    const modernQuesRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${modernAttId}/questions`, {
      headers: { Cookie: studentCookie },
    });
    assert(modernQuesRes.status === 200, 'Modern attempt questions fetched');
    const modQ1 = modernQuesRes.json?.questions?.[0];
    assert(
      !modQ1.questionContent.includes('MODERN SNAPSHOT IMMUNITY TEST CONTENT'),
      'CRITICAL: Modern attempt questions are 100% frozen from snapshot (no master content leakage)'
    );

    // 4. Student saves Option B (correct in snapshot, but changed in Master to C)
    await httpProbe(`${BASE_URL}/api/student/tests/attempts/${modernAttId}/answers`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: 1, questionType: 'objective', selectedOption: 'B' }),
    });

    // 5. Submit modern attempt
    const submitModRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${modernAttId}/submit`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(submitModRes.status === 200, 'Modern attempt submitted');
    assert(submitModRes.json?.result?.correctQuestions === 1, 'Modern evaluation awarded Option B as CORRECT via snapshot');
    assert(submitModRes.json?.result?.finalScore === 3, 'Modern final score is 3');

    // Restore Question 1 in Question Master
    await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'B',
        questionContent: 'A particle moves along a straight line such that its displacement x at time t is given by x = 3t² - 12t + 9. At what time is the velocity of the particle zero?',
        optionA: 't = 1 s',
        optionB: 't = 2 s',
        optionC: 't = 3 s',
        optionD: 't = 4 s',
      }),
    });

    // =========================================================================
    // CLEANUP OF TEMPORARY FIXTURES & FINAL BASELINE VERIFICATION
    // =========================================================================
    console.log('\n--- 2. Cleanup of Temporary Test Fixtures ---');
    // Clean temporary attempts
    const allAtts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    const cleanedAtts = allAtts.filter((a) => !temporaryAttemptIds.includes(a.id));
    fs.writeFileSync(attemptsPath, JSON.stringify(cleanedAtts, null, 2), 'utf-8');
    if (fs.existsSync(attemptsPathMirror)) {
      fs.writeFileSync(attemptsPathMirror, JSON.stringify(cleanedAtts, null, 2), 'utf-8');
    }
    console.log(`  ✓ Removed ${temporaryAttemptIds.length} temporary test attempts.`);

    // Clean temporary test papers
    for (const tid of temporaryTestPaperIds) {
      const delRes = await httpProbe(`${BASE_URL}/api/admin/test-series/${tid}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf },
      });
      assert(delRes.status === 200, `Deleted temporary test paper #${tid}`);
    }

    // Clean temporary compatibility snapshot keys
    const finalCompat = JSON.parse(fs.readFileSync(compatPath, 'utf-8'));
    temporaryCompatKeys.forEach((k) => delete finalCompat[k]);
    fs.writeFileSync(compatPath, JSON.stringify(finalCompat, null, 2), 'utf-8');
    if (fs.existsSync(compatPathMirror)) {
      fs.writeFileSync(compatPathMirror, JSON.stringify(finalCompat, null, 2), 'utf-8');
    }

    // 3. Post-Audit Baseline Verification
    console.log('\n--- 3. Post-Audit Baseline Verification of 12 Original Attempts ---');
    const finalAttemptsHash = computeFileHash(attemptsPath);
    const finalAttempts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    assert(finalAttempts.length === 12, `Exactly 12 baseline attempts preserved on disk (count: ${finalAttempts.length})`);
    assert(finalAttempts.every((a) => Number(a.paperId) === 1), 'All 12 baseline attempts continue to reference Paper #1');

    const finalCompleted = finalAttempts.find((a) => a.id === 'att_test_concurrent_1795026581477');
    assert(finalCompleted && finalCompleted.status === 'COMPLETED', 'Baseline completed attempt #11 intact with COMPLETED status');
    assert(finalCompleted.result && finalCompleted.result.finalScore === 6, 'Baseline completed attempt #11 score strictly preserved as 6/15');

    const finalInProgress = finalAttempts.filter((a) => a.status === 'IN_PROGRESS');
    assert(finalInProgress.length === 11, `Exactly 11 baseline attempts remain in IN_PROGRESS status (found: ${finalInProgress.length})`);

    assert(
      finalAttemptsHash === '8139ace4cf76a13bcb2b8dace913c1cd07de7dc54ddbc632d95e7c8e244b411e',
      `SHA256 matches certified baseline exactly: 8139ace4cf76a13bcb2b8dace913c1cd07de7dc54ddbc632d95e7c8e244b411e`
    );

  } catch (err) {
    console.error('Fatal error in Stage 3.2.2 verification suite:', err);
    failed++;
  } finally {
    console.log('\n--- Test Cleanup & Server Teardown ---');
    serverProcess.kill('SIGTERM');
    await wait(800);

    console.log('================================================================');
    console.log(`STAGE 3.2.2 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}

runStage322Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
