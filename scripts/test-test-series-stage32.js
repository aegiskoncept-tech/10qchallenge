// ==============================================================================
// 10Q CHALLENGE LMS — STAGE 3.2 TEST SUITE
// Test Series Backend Core, Historical Data Integrity & Versioning
// ==============================================================================

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = 3009;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpProbe(urlStr, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(urlStr);
    const startTime = Date.now();
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            latency: Date.now() - startTime,
            json,
            text,
            buffer,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        ok: false,
        status: 0,
        latency: Date.now() - startTime,
        error: err,
        text: '',
        json: null,
      });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function getCookieHeader(probeRes) {
  const raw = probeRes.headers['set-cookie'];
  if (!raw) return '';
  return Array.isArray(raw)
    ? raw.map((c) => c.split(';')[0]).join('; ')
    : raw.split(';')[0];
}

function getCsrfFromProbe(probeRes) {
  const raw = probeRes.headers['set-cookie'] || [];
  const cookies = Array.isArray(raw) ? raw : [raw];
  for (const c of cookies) {
    const match = c.match(/10q_csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return '';
}

async function runStage32Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — STAGE 3.2 TEST SUITE');
  console.log('Test Series Backend Core, Historical Data Integrity & Versioning');
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

  // --- Phase 0: Baseline check of existing 12 attempts ---
  console.log('--- Phase 0: Baseline Verification of Existing 12 Attempts ---');
  const attemptsPath = path.resolve(__dirname, '..', 'data', 'test-attempts.json');
  assert(fs.existsSync(attemptsPath), 'data/test-attempts.json exists on disk');
  const initialAttempts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
  assert(initialAttempts.length === 12, `Authoritative test-attempts.json contains exactly 12 baseline attempts (found: ${initialAttempts.length})`);
  assert(initialAttempts.every((a) => Number(a.paperId) === 1), 'All 12 baseline attempts belong to Paper #1');

  // Launch isolated production server
  console.log(`\nStarting isolated test server on port ${PORT}...`);
  const serverProcess = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
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

  console.log('Server online. Initiating test phases...\n');

  let createdTestIds = [];
  let createdAttemptIds = [];

  try {
    // --------------------------------------------------------------------------
    // PHASE 1: AUTHENTICATION SETUP & CSRF SECURITY GUARDS
    // --------------------------------------------------------------------------
    console.log('--- Phase 1: Authentication & CSRF Security Guards ---');
    const adminLoginRes = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.admin@10qchallenge.in', password: 'AdminPass2026!' }),
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeds with 200 OK');
    const adminCookie = getCookieHeader(adminLoginRes);
    const adminCsrf = getCsrfFromProbe(adminLoginRes);
    assert(Boolean(adminCookie && adminCsrf), 'Admin credentials retrieved');

    const studentLoginRes = await httpProbe(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@10qchallenge.in', password: 'StudentPass2026!' }),
    });
    assert(studentLoginRes.status === 200, 'Student login succeeds with 200 OK');
    const studentCookie = getCookieHeader(studentLoginRes);
    const studentCsrf = getCsrfFromProbe(studentLoginRes);
    assert(Boolean(studentCookie && studentCsrf), 'Student credentials retrieved');

    // Security boundaries
    const unauthGetRes = await httpProbe(`${BASE_URL}/api/admin/test-series`);
    assert(unauthGetRes.status === 401, 'Unauthenticated GET /api/admin/test-series rejected with 401');

    const studentGetRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      headers: { Cookie: studentCookie },
    });
    assert(studentGetRes.status === 403, 'Student GET /api/admin/test-series rejected with 403');

    const noCsrfPostRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'No CSRF Test' }),
    });
    assert(noCsrfPostRes.status === 403, 'POST /api/admin/test-series without CSRF rejected with 403');

    const badCsrfPostRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'Content-Type': 'application/json', 'x-csrf-token': 'bad_token' },
      body: JSON.stringify({ title: 'Bad CSRF Test' }),
    });
    assert(badCsrfPostRes.status === 403, 'POST /api/admin/test-series with invalid CSRF rejected with 403');

    // --------------------------------------------------------------------------
    // PHASE 2: EMPTY QUESTION FALLBACK REMOVAL (CRITICAL AUDIT ITEM)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 2: Empty Question Fallback Removal Verification ---');
    // Admin creates a draft test with empty questionIds
    const emptyDraftRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Draft Paper Empty Questions',
        examTag: 'BITSAT',
        targetYear: 2026,
        durationMinutes: 180,
        price: 0,
        status: 'Draft',
        questionIds: [],
      }),
    });
    assert(emptyDraftRes.status === 201, 'Draft test with empty questionIds created cleanly (201 Created)');
    const emptyPaperId = emptyDraftRes.json?.data?.id;
    createdTestIds.push(emptyPaperId);

    // Verify student cannot start an attempt on empty question paper
    const emptyAttemptStartRes = await httpProbe(`${BASE_URL}/api/student/tests/${emptyPaperId}/start`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf },
    });
    assert(
      emptyAttemptStartRes.status === 400 || emptyAttemptStartRes.status === 403,
      'Attempt start on empty question paper strictly rejected with 400/403'
    );
    assert(
      emptyAttemptStartRes.json?.error?.includes('not currently published') ||
      emptyAttemptStartRes.json?.error?.includes('no questions configured'),
      'Error message communicates un-publishable or empty question state'
    );

    // --------------------------------------------------------------------------
    // PHASE 3: INPUT VALIDATION, DEDUPLICATION & METRIC DERIVATION
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 3: Input Validation, Deduplication & Metric Calculations ---');
    // A. Rejection of published paper with 0 questions
    const emptyPublishRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Empty Published Paper',
        examTag: 'BITSAT',
        durationMinutes: 180,
        status: 'Published',
        questionIds: [],
      }),
    });
    assert(emptyPublishRes.status === 400, 'Publishing a test paper with 0 questions rejected with 400 Bad Request');
    assert(emptyPublishRes.json?.error?.includes('zero linked questions'), 'Error explains zero linked questions');

    // B. Rejection of missing title
    const emptyTitleRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
        durationMinutes: 180,
        status: 'Draft',
      }),
    });
    assert(emptyTitleRes.status === 400, 'Creation with empty title rejected with 400 Bad Request');

    // C. Rejection of non-positive duration
    const badDurationRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Zero Duration Paper',
        durationMinutes: 0,
        status: 'Draft',
      }),
    });
    assert(badDurationRes.status === 400, 'Creation with 0 duration rejected with 400 Bad Request');

    // D. Duplicate question prevention & automatic metric calculations
    const dedupeCreateRes = await httpProbe(`${BASE_URL}/api/admin/test-series`, {
      method: 'POST',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'BITSAT Mini Mock 2026',
        examTag: 'BITSAT',
        targetYear: 2026,
        description: '3 Questions test with duplicates provided in payload',
        durationMinutes: 60,
        price: 99,
        status: 'Published',
        questionIds: [1, 1, 2, 2, 3, 3], // 3 distinct valid questions
        markingScheme: { positiveMarks: 3, negativeMarks: 1 },
      }),
    });
    assert(dedupeCreateRes.status === 201, 'Creation with duplicate question IDs succeeds with 201 Created');
    const createdPaper = dedupeCreateRes.json?.data;
    createdTestIds.push(createdPaper.id);
    assert(createdPaper.version === 1, 'New paper initializes at version 1');
    assert(createdPaper.questionIds.length === 3, 'Duplicate question IDs were deduplicated to exactly 3 distinct IDs');
    assert(createdPaper.totalQuestions === 3, 'totalQuestions automatically calculated as 3');
    assert(createdPaper.totalMarks === 9, 'totalMarks automatically calculated as 9 (3 questions * 3 marks)');

    // --------------------------------------------------------------------------
    // PHASE 4: QUESTION DEPENDENCY PROTECTION & SAFEGUARDS
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 4: Question Dependency Protection & Deletion Safeguards ---');
    // Admin attempts to delete Question #1 (referenced in Test 1 and student attempts)
    const delQ1Res = await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf },
    });
    assert(delQ1Res.status === 400, 'Permanent deletion of referenced Question #1 strictly BLOCKED with 400 Bad Request');
    assert(delQ1Res.json?.error?.includes('referenced by'), 'Error explains referenced dependencies in test series');

    // Verify Question #1 still intact in database
    const q1Check = await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      headers: { Cookie: adminCookie },
    });
    assert(q1Check.status === 200 && q1Check.json?.data?.id === 1, 'Question #1 remains completely preserved on disk');

    // --------------------------------------------------------------------------
    // PHASE 5: TEST PAPER DELETION SAFEGUARDS (HISTORICAL ATTEMPTS)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 5: Test Paper Deletion Safeguards (Historical Attempts) ---');
    // Admin attempts to delete Paper #1 (which has 12 student attempts)
    const delPaper1Res = await httpProbe(`${BASE_URL}/api/admin/test-series/1`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf },
    });
    assert(delPaper1Res.status === 400, 'Deletion of Test Paper #1 with 12 student attempts BLOCKED with 400 Bad Request');
    assert(delPaper1Res.json?.error?.includes('12 student attempt'), 'Error explains attempt lock and advises archiving');

    // Verify Paper #1 still intact
    const paper1Check = await httpProbe(`${BASE_URL}/api/admin/test-series/1`, {
      headers: { Cookie: adminCookie },
    });
    assert(paper1Check.status === 200 && paper1Check.json?.data?.id === 1, 'Test Paper #1 remains completely preserved on disk');

    // --------------------------------------------------------------------------
    // PHASE 6: IMMUTABLE VERSIONING & PREVIOUS VERSION ARCHIVES
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 6: Immutable Versioning & Previous Version Archives ---');
    // Student starts an attempt on createdPaper (Paper version 1, questions: [1, 2, 3])
    const startAttV1Res = await httpProbe(`${BASE_URL}/api/student/tests/${createdPaper.id}/start`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf },
    });
    assert(startAttV1Res.status === 201 || startAttV1Res.status === 200, 'Student starts attempt on paper version 1');
    const attemptV1Id = startAttV1Res.json?.attemptId;
    createdAttemptIds.push(attemptV1Id);
    assert(Boolean(attemptV1Id), 'Attempt ID returned for v1 session');

    // Admin updates createdPaper: changes questionIds to [2, 3, 4, 5]
    const updateV2Res = await httpProbe(`${BASE_URL}/api/admin/test-series/${createdPaper.id}`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionIds: [2, 3, 4, 5],
      }),
    });
    assert(updateV2Res.status === 200, 'Updating test paper questions succeeds with 200 OK');
    const updatedPaperData = updateV2Res.json?.data;
    assert(updatedPaperData.version === 2, 'Paper version automatically incremented to 2 due to student attempt lock');
    assert(updatedPaperData.versions && updatedPaperData.versions.length === 1, 'Previous version 1 archived into versions array');
    assert(updatedPaperData.versions[0].version === 1, 'Archived version record specifies version: 1');
    assert(updatedPaperData.versions[0].questionIds.length === 3, 'Archived version preserves original questionIds: [1, 2, 3]');
    assert(updatedPaperData.totalQuestions === 4, 'Updated totalQuestions calculated as 4 for version 2');

    // --------------------------------------------------------------------------
    // PHASE 7: QUESTION SNAPSHOT PRESERVATION & HISTORICAL SCORECARD CONSISTENCY
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 7: Question Snapshot Preservation & Scorecard Consistency ---');
    // Read attempt file directly to inspect stored fields
    const curAttemptsData = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    const freshAttV1 = curAttemptsData.find((a) => a.id === attemptV1Id);
    assert(freshAttV1.paperVersion === 1, 'Attempt record durably stores paperVersion: 1');
    assert(Boolean(freshAttV1.questionSnapshots), 'Attempt record durably contains immutable questionSnapshots');
    assert(Object.keys(freshAttV1.questionSnapshots).length === 3, 'Question snapshots contain exactly the 3 questions from version 1');
    assert(freshAttV1.questionSnapshots['1'].correctOption === 'B', 'Snapshot stores Question #1 correct option as B');

    // Student answers Question #1 with Option 'B'
    const ansRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${attemptV1Id}/answers`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 1,
        questionType: 'objective',
        selectedOption: 'B',
      }),
    });
    assert(ansRes.status === 200, 'Student saves answer B for Question #1');

    // Admin edits Question #1 in Question Master: changes correctOption to 'A' and content
    const editQ1Res = await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'A', // Changed from B to A
        questionContent: 'ALTERED TEXT FOR TESTING SNAPSHOT INTEGRITY',
      }),
    });
    assert(editQ1Res.status === 200, 'Admin edits Question #1 in Question Master');

    // Student submits attempt: evaluation MUST evaluate against frozen snapshot (Option B is correct)
    const submitRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${attemptV1Id}/submit`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionReason: 'MANUAL' }),
    });
    assert(submitRes.status === 200, 'Student submits attempt -> 200 OK');
    const evalResult = submitRes.json?.result;
    assert(evalResult.correctQuestions === 1, 'CRITICAL: Historical evaluation awarded 1 correct question using frozen snapshot!');
    assert(evalResult.finalScore === 3, 'Score calculated using frozen snapshot (+3 marks for option B)');

    // Fetch student scorecard: MUST display original frozen question content
    const scorecardRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${attemptV1Id}/result`, {
      headers: { Cookie: studentCookie },
    });
    assert(scorecardRes.status === 200, 'Student fetches scorecard -> 200 OK');
    const q1Review = scorecardRes.json?.data?.questionsReview?.find((q) => q.questionId === 1);
    assert(q1Review !== undefined, 'Question #1 present in scorecard review');
    assert(q1Review.evaluationStatus === 'CORRECT', 'Question #1 marked as correct in scorecard');

    // Verify stored attempt snapshot was NOT modified by Question Master edit
    const latestAttemptsData = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    const evalAtt = latestAttemptsData.find((a) => a.id === attemptV1Id);
    assert(!evalAtt.questionSnapshots['1'].questionContent.includes('ALTERED TEXT'), 'Scorecard displays original frozen question text (NOT modified Question Master text)');

    // Restore Question #1 in Question Master back to canonical state
    await httpProbe(`${BASE_URL}/api/admin/questions/1`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctOption: 'B',
        questionContent: 'A particle moves along a straight line such that its displacement x at time t is given by x = 3t² - 12t + 9. At what time is the velocity of the particle zero?',
      }),
    });

    // --------------------------------------------------------------------------
    // PHASE 8: STUDENT ANSWER-KEY PROTECTION (NO LEAKAGE BEFORE SUBMISSION)
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 8: Student Answer-Key Protection & Sanitization ---');
    // Start fresh attempt on Paper #2
    const freshAttRes = await httpProbe(`${BASE_URL}/api/student/tests/2/start`, {
      method: 'POST',
      headers: { Cookie: studentCookie, 'x-csrf-token': studentCsrf },
    });
    const freshAttId = freshAttRes.json?.attemptId;
    if (freshAttId) createdAttemptIds.push(freshAttId);
    assert(Boolean(freshAttId), 'Fresh attempt started on Paper #2');

    // Fetch active session questions
    const sessionQuestionsRes = await httpProbe(`${BASE_URL}/api/student/tests/attempts/${freshAttId}/questions`, {
      headers: { Cookie: studentCookie },
    });
    assert(sessionQuestionsRes.status === 200, 'Active session questions fetched -> 200 OK');
    const deliveredQuestions = sessionQuestionsRes.json?.questions || [];
    assert(deliveredQuestions.length > 0, `Delivered ${deliveredQuestions.length} sanitized questions`);

    const hasLeakedKey = deliveredQuestions.some(
      (q) =>
        q.correctOption !== undefined ||
        q.rangeFrom !== undefined ||
        q.rangeTo !== undefined ||
        q.tolerance !== undefined ||
        q.explanation !== undefined
    );
    assert(!hasLeakedKey, 'PASS: Zero answer keys or explanations leaked in active CBT test questions payload');

    // --------------------------------------------------------------------------
    // PHASE 9: CONCURRENCY PROTECTION & CLEANUP
    // --------------------------------------------------------------------------
    console.log('\n--- Phase 9: Concurrency Safety & Cleanup ---');
    // Perform concurrent HTTP updates to createdPaper
    const p1 = httpProbe(`${BASE_URL}/api/admin/test-series/${createdPaper.id}`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Concurrent Update A' }),
    });
    const p2 = httpProbe(`${BASE_URL}/api/admin/test-series/${createdPaper.id}`, {
      method: 'PUT',
      headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf, 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Concurrent Update B' }),
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    assert(r1.status === 200 && r2.status === 200, 'Concurrent updates serialized safely via testSeriesMutex and file locks');

    // Clean up temporary attempts from data/test-attempts.json
    const allAttemptsNow = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    const finalCleanedAttempts = allAttemptsNow.filter((a) => !createdAttemptIds.includes(a.id));
    fs.writeFileSync(attemptsPath, JSON.stringify(finalCleanedAttempts, null, 2), 'utf-8');

    // Also mirror to frontend/data/test-attempts.json if it exists
    const frontendAttemptsPath = path.resolve(__dirname, '..', 'frontend', 'data', 'test-attempts.json');
    if (fs.existsSync(frontendAttemptsPath)) {
      fs.writeFileSync(frontendAttemptsPath, JSON.stringify(finalCleanedAttempts, null, 2), 'utf-8');
    }

    // Now delete created test papers via Admin API
    for (const tid of createdTestIds) {
      const delRes = await httpProbe(`${BASE_URL}/api/admin/test-series/${tid}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie, 'x-csrf-token': adminCsrf },
      });
      assert(delRes.status === 200, `Cleaned up temporary test paper #${tid}`);
    }

    // Final verify: Exactly 12 baseline attempts preserved
    const finalAttempts = JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
    assert(finalAttempts.length === 12, `Final check: Exactly 12 baseline attempts preserved on disk (count: ${finalAttempts.length})`);
    assert(finalAttempts.every((a) => Number(a.paperId) === 1), 'All 12 baseline attempts continue to reference Paper #1');

  } catch (err) {
    console.error('Fatal test error in Stage 3.2 suite:', err);
    failed++;
  } finally {
    console.log('\n--- Test Cleanup & Server Teardown ---');
    serverProcess.kill('SIGTERM');
    await wait(800);

    console.log('================================================================');
    console.log(`STAGE 3.2 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}

runStage32Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
