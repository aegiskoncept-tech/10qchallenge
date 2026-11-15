const fs = require('fs');
const path = require('path');

const cyan = (s) => '\x1b[36m' + s + '\x1b[0m';
const green = (s) => '\x1b[32m' + s + '\x1b[0m';
const red = (s) => '\x1b[31m' + s + '\x1b[0m';
const bold = (s) => '\x1b[1m' + s + '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(cond, name, details = '') {
  if (cond) {
    console.log('  ' + green('✓ PASS') + ': ' + name);
    passed++;
  } else {
    console.error('  ' + red('✗ FAIL') + ': ' + name + (details ? ' (' + details + ')' : ''));
    failed++;
  }
}

console.log(bold(cyan('\n========================================================================')));
console.log(bold(cyan('  10Q CHALLENGE — CONCURRENCY & SLUG HISTORY ISOLATED TEST HARNESS     ')));
console.log(bold(cyan('========================================================================\n')));

const testDir = path.join(process.cwd(), 'tmp', 'isolated-harness-' + Date.now());
fs.mkdirSync(testDir, { recursive: true });

const testExamsFile = path.join(testDir, 'exams.json');
const testCoursesFile = path.join(testDir, 'courses.json');

// Initial seed
const INITIAL_EXAMS = [
  { id: 1, examName: 'BITSAT', slug: 'bitsat', previousSlugs: [], isActive: true, displayIndex: 1 },
  { id: 2, examName: 'Comedk', slug: 'comedk', previousSlugs: [], isActive: true, displayIndex: 2 },
  { id: 3, examName: 'JEE', slug: 'jee', previousSlugs: [], isActive: true, displayIndex: 3 },
  { id: 4, examName: 'Manipal (MET)', slug: 'manipal-met', previousSlugs: [], isActive: true, displayIndex: 4 },
  { id: 5, examName: 'VITEEE', slug: 'viteee', previousSlugs: [], isActive: true, displayIndex: 5 },
];

const INITIAL_COURSES = [
  { id: 1, title: 'BITSAT Crash Course', exam: 'BITSAT', examId: 1, slug: 'bitsat-crash', isActive: true, displayIndex: 1 },
  { id: 2, title: 'JEE Booster Batch', exam: 'JEE', examId: 3, slug: 'jee-booster', isActive: true, displayIndex: 2 },
];

fs.writeFileSync(testExamsFile, JSON.stringify(INITIAL_EXAMS, null, 2), 'utf8');
fs.writeFileSync(testCoursesFile, JSON.stringify(INITIAL_COURSES, null, 2), 'utf8');

// Mutex implementation identical to production lib/db/exams.ts & courses.ts
class AsyncMutex {
  constructor() {
    this.queue = Promise.resolve();
  }
  run(task) {
    const res = this.queue.then(async () => await task());
    this.queue = res.catch(() => {});
    return res;
  }
}

const examMutex = new AsyncMutex();
const courseMutex = new AsyncMutex();

async function acquireLock(lockFile, timeoutMs = 8000) {
  const start = Date.now();
  let fd = null;
  while (Date.now() - start < timeoutMs) {
    try {
      fd = fs.openSync(lockFile, 'wx');
      fs.writeFileSync(fd, process.pid + '\n' + Date.now(), 'utf8');
      break;
    } catch (err) {
      if (err.code === 'EEXIST') {
        try {
          const stats = fs.statSync(lockFile);
          if (Date.now() - stats.mtimeMs > 8000) {
            try { fs.unlinkSync(lockFile); } catch {}
            continue;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 15));
      } else {
        return async () => {};
      }
    }
  }
  return async () => {
    try {
      if (fd !== null) fs.closeSync(fd);
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    } catch {}
  };
}

function toSlug(str) {
  return String(str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function readExams() {
  return JSON.parse(fs.readFileSync(testExamsFile, 'utf8'));
}

function writeExams(data) {
  const tmp = testExamsFile + '.tmp.' + Date.now() + '.' + Math.random().toString(36).slice(2, 6);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, testExamsFile);
}

function readCourses() {
  return JSON.parse(fs.readFileSync(testCoursesFile, 'utf8'));
}

function writeCourses(data) {
  const tmp = testCoursesFile + '.tmp.' + Date.now() + '.' + Math.random().toString(36).slice(2, 6);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, testCoursesFile);
}

// Exam mutation functions matching lib/db/exams.ts
async function createExam(data, user = 'Admin') {
  return examMutex.run(async () => {
    const lockFile = path.join(testDir, '.exams.lock');
    const release = await acquireLock(lockFile);
    try {
      if (!data.examName || !data.examName.trim()) {
        return { success: false, error: 'Exam Name is required.' };
      }
      const slug = toSlug(data.slug || data.examName);
      if (!slug) {
        return { success: false, error: 'Valid slug required.' };
      }
      const all = readExams();
      if (all.some(e => toSlug(e.slug) === slug || (Array.isArray(e.previousSlugs) && e.previousSlugs.includes(slug)))) {
        return { success: false, error: 'Slug taken' };
      }
      const newId = all.length > 0 ? Math.max(...all.map(e => Number(e.id) || 0)) + 1 : 1;
      const newExam = {
        id: newId,
        examName: data.examName.trim(),
        slug: slug,
        previousSlugs: [],
        isActive: true,
        displayIndex: newId,
        createdAt: new Date().toISOString()
      };
      all.push(newExam);
      writeExams(all);
      return { success: true, exam: newExam };
    } finally {
      await release();
    }
  });
}

async function updateExam(id, data, user = 'Admin') {
  return examMutex.run(async () => {
    const lockFile = path.join(testDir, '.exams.lock');
    const release = await acquireLock(lockFile);
    try {
      const all = readExams();
      const idx = all.findIndex(e => Number(e.id) === Number(id));
      if (idx === -1) return { success: false, error: 'Not found' };
      const existing = all[idx];
      const newSlug = data.slug ? toSlug(data.slug) : existing.slug;
      if (newSlug !== existing.slug && all.some(e => e.id !== Number(id) && (toSlug(e.slug) === newSlug || (Array.isArray(e.previousSlugs) && e.previousSlugs.includes(newSlug))))) {
        return { success: false, error: 'Slug in use' };
      }
      let previousSlugs = Array.isArray(existing.previousSlugs) ? [...existing.previousSlugs] : [];
      if (newSlug !== existing.slug) {
        previousSlugs = Array.from(new Set([...previousSlugs, existing.slug])).filter(s => s && s !== newSlug);
      }
      const updated = {
        ...existing,
        ...data,
        slug: newSlug,
        previousSlugs
      };
      all[idx] = updated;
      writeExams(all);
      return { success: true, exam: updated };
    } finally {
      await release();
    }
  });
}

function resolveExam(slugOrId) {
  const raw = String(slugOrId).trim().toLowerCase();
  const dashed = toSlug(raw);
  const all = readExams();
  for (const e of all) {
    if (String(e.id) === raw || toSlug(e.slug) === dashed) {
      return { exam: e, isCanonicalSlug: true };
    }
    if (Array.isArray(e.previousSlugs) && e.previousSlugs.some(ps => toSlug(ps) === dashed)) {
      return { exam: e, isCanonicalSlug: false };
    }
  }
  return null;
}

// Course mutation functions matching lib/db/courses.ts
async function createCourse(data, user = 'Admin') {
  return courseMutex.run(async () => {
    const lockFile = path.join(testDir, '.courses.lock');
    const release = await acquireLock(lockFile);
    try {
      if (!data.title || !data.title.trim()) {
        return { success: false, error: 'Course title required.' };
      }
      const slug = toSlug(data.slug || data.title);
      const all = readCourses();
      if (all.some(c => toSlug(c.slug) === slug)) {
        return { success: false, error: 'Slug taken' };
      }
      const newId = all.length > 0 ? Math.max(...all.map(c => Number(c.id) || 0)) + 1 : 1;
      const newCourse = {
        id: newId,
        title: data.title.trim(),
        slug: slug,
        exam: data.exam,
        examId: data.examId,
        price: data.price || '4999',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      all.push(newCourse);
      writeCourses(all);
      return { success: true, course: newCourse };
    } finally {
      await release();
    }
  });
}

async function updateCourse(id, data, user = 'Admin') {
  return courseMutex.run(async () => {
    const lockFile = path.join(testDir, '.courses.lock');
    const release = await acquireLock(lockFile);
    try {
      const all = readCourses();
      const idx = all.findIndex(c => Number(c.id) === Number(id));
      if (idx === -1) return { success: false, error: 'Not found' };
      const updated = { ...all[idx], ...data };
      all[idx] = updated;
      writeCourses(all);
      return { success: true, course: updated };
    } finally {
      await release();
    }
  });
}

async function runTests() {
  // TEST 1: 10 simultaneous exam creation requests
  console.log(bold('\n[Test 1] 10 Simultaneous Exam Creations:'));
  const examPromises = [];
  for (let i = 1; i <= 10; i++) {
    examPromises.push(createExam({ examName: 'Parallel Exam ' + i, slug: 'parallel-exam-' + i }));
  }
  const examResults = await Promise.all(examPromises);
  const allCreatedOk = examResults.every(r => r.success);
  assert(allCreatedOk, 'All 10 parallel exam creations succeeded');

  const examsAfter10 = readExams();
  assert(examsAfter10.length === 15, 'Total exams is exactly 15 (5 initial + 10 created)');

  const examIds = examsAfter10.map(e => e.id);
  const uniqueExamIds = new Set(examIds);
  assert(uniqueExamIds.size === examIds.length, 'Zero ID collisions across all 15 exams (IDs: ' + examIds.join(', ') + ')');

  // TEST 2: 10 simultaneous course creation requests
  console.log(bold('\n[Test 2] 10 Simultaneous Course Creations:'));
  const coursePromises = [];
  for (let i = 1; i <= 10; i++) {
    coursePromises.push(createCourse({ title: 'Parallel Course ' + i, slug: 'parallel-course-' + i, exam: 'BITSAT', examId: 1 }));
  }
  const courseResults = await Promise.all(coursePromises);
  const allCoursesOk = courseResults.every(r => r.success);
  assert(allCoursesOk, 'All 10 parallel course creations succeeded');

  const coursesAfter10 = readCourses();
  assert(coursesAfter10.length === 12, 'Total courses is exactly 12 (2 initial + 10 created)');

  const courseIds = coursesAfter10.map(c => c.id);
  const uniqueCourseIds = new Set(courseIds);
  assert(uniqueCourseIds.size === courseIds.length, 'Zero ID collisions across all 12 courses (IDs: ' + courseIds.join(', ') + ')');

  // TEST 3: Simultaneous updates to different exams
  console.log(bold('\n[Test 3] Simultaneous Updates to Different Exams:'));
  const updateExamPromises = [
    updateExam(1, { description: 'Updated BITSAT Description' }),
    updateExam(2, { description: 'Updated Comedk Description' }),
    updateExam(3, { description: 'Updated JEE Description' }),
  ];
  await Promise.all(updateExamPromises);
  const examsAfterUpdate = readExams();
  const e1 = examsAfterUpdate.find(e => e.id === 1);
  const e2 = examsAfterUpdate.find(e => e.id === 2);
  const e3 = examsAfterUpdate.find(e => e.id === 3);
  assert(e1.description === 'Updated BITSAT Description', 'Exam 1 update preserved');
  assert(e2.description === 'Updated Comedk Description', 'Exam 2 update preserved');
  assert(e3.description === 'Updated JEE Description', 'Exam 3 update preserved');

  // TEST 4: Simultaneous updates to different courses
  console.log(bold('\n[Test 4] Simultaneous Updates to Different Courses:'));
  const updateCoursePromises = [
    updateCourse(1, { price: '5499', title: 'BITSAT Crash Course Pro' }),
    updateCourse(2, { price: '6999', title: 'JEE Booster Batch Ultra' }),
  ];
  await Promise.all(updateCoursePromises);
  const coursesAfterUpdate = readCourses();
  const c1 = coursesAfterUpdate.find(c => c.id === 1);
  const c2 = coursesAfterUpdate.find(c => c.id === 2);
  assert(c1.price === '5499' && c1.title === 'BITSAT Crash Course Pro', 'Course 1 update preserved');
  assert(c2.price === '6999' && c2.title === 'JEE Booster Batch Ultra', 'Course 2 update preserved');

  // TEST 5: Concurrent mixed exam and course operations
  console.log(bold('\n[Test 5] Concurrent Mixed Exam and Course Operations:'));
  const mixedOps = [
    createExam({ examName: 'Mixed Exam Alpha', slug: 'mixed-exam-alpha' }),
    createCourse({ title: 'Mixed Course Beta', slug: 'mixed-course-beta', exam: 'JEE', examId: 3 }),
    updateExam(4, { description: 'Manipal MET Updated concurrently' }),
    updateCourse(1, { price: '5999' }),
  ];
  const mixedResults = await Promise.all(mixedOps);
  assert(mixedResults.every(r => r.success), 'All 4 mixed concurrent operations succeeded');

  // TEST 6: Failed write recovery
  console.log(bold('\n[Test 6] Failed Write Recovery & Data Integrity:'));
  const beforeCount = readExams().length;
  // Trigger a validation failure
  const failedResult = await createExam({ examName: '', slug: '' });
  assert(!failedResult.success, 'Invalid exam creation rejected');
  const afterCount = readExams().length;
  assert(beforeCount === afterCount, 'Storage remained uncorrupted after failed write');

  // TEST 7: SLUG HISTORY AND REDIRECT TESTS (10 Requirements)
  console.log(bold('\n[Test 7] Slug History and Permanent Redirects (10/10 Requirements):'));
  // 1. Create a test exam
  const tExamRes = await createExam({ examName: 'Karnataka CET', slug: 'kcet-2026' });
  assert(tExamRes.success, 'Requirement 1: Created test exam with slug "kcet-2026"');
  const tExamId = tExamRes.exam.id;

  // Assign a test course to it
  const tCourseRes = await createCourse({ title: 'KCET Crash Batch', slug: 'kcet-crash-batch', exam: 'Karnataka CET', examId: tExamId });
  assert(tCourseRes.success, 'Requirement 1b: Linked test course to exam ID ' + tExamId);

  // 2. Record original slug
  const origSlug = 'kcet-2026';
  let lookupOrig = resolveExam(origSlug);
  assert(lookupOrig.isCanonicalSlug === true, 'Requirement 2: Original slug resolves as canonical (200 OK)');

  // 3. Rename the exam
  const ren1 = await updateExam(tExamId, { examName: 'UGCET Karnataka', slug: 'ugcet-karnataka' });
  assert(ren1.success, 'Requirement 3: Renamed exam to "ugcet-karnataka"');

  // 4. Verify old slug stored in previousSlugs
  const examAfterRen1 = readExams().find(e => e.id === tExamId);
  assert(Array.isArray(examAfterRen1.previousSlugs) && examAfterRen1.previousSlugs.includes('kcet-2026'), 'Requirement 4: Old slug "kcet-2026" stored in previousSlugs: ' + JSON.stringify(examAfterRen1.previousSlugs));

  // 5. Verify new slug returns the correct exam
  const lookupNew1 = resolveExam('ugcet-karnataka');
  assert(lookupNew1 !== null && lookupNew1.exam.id === tExamId && lookupNew1.isCanonicalSlug === true, 'Requirement 5: New slug "ugcet-karnataka" resolves as canonical (200 OK)');

  // 6. Verify old slug redirects to the new URL
  const lookupOld1 = resolveExam('kcet-2026');
  assert(lookupOld1 !== null && lookupOld1.exam.id === tExamId && lookupOld1.isCanonicalSlug === false, 'Requirement 6: Old slug "kcet-2026" resolves with isCanonicalSlug: false (Triggers 301 Permanent Redirect to ' + lookupOld1.exam.slug + ')');

  // 7. Rename the exam again
  const ren2 = await updateExam(tExamId, { examName: 'Karnataka State CET Final', slug: 'karnataka-state-cet' });
  assert(ren2.success, 'Requirement 7: Renamed exam again to "karnataka-state-cet"');

  // 8. Verify both previous slugs redirect to the latest canonical URL
  const examAfterRen2 = readExams().find(e => e.id === tExamId);
  assert(examAfterRen2.previousSlugs.length === 2 && examAfterRen2.previousSlugs.includes('kcet-2026') && examAfterRen2.previousSlugs.includes('ugcet-karnataka'), 'Requirement 8a: previousSlugs contains both old slugs: ' + JSON.stringify(examAfterRen2.previousSlugs));

  const redirect1 = resolveExam('kcet-2026');
  const redirect2 = resolveExam('ugcet-karnataka');
  const canonicalNow = resolveExam('karnataka-state-cet');

  assert(redirect1.isCanonicalSlug === false && redirect1.exam.slug === 'karnataka-state-cet', 'Requirement 8b: "kcet-2026" redirects to latest canonical "karnataka-state-cet"');
  assert(redirect2.isCanonicalSlug === false && redirect2.exam.slug === 'karnataka-state-cet', 'Requirement 8c: "ugcet-karnataka" redirects to latest canonical "karnataka-state-cet"');
  assert(canonicalNow.isCanonicalSlug === true && canonicalNow.exam.slug === 'karnataka-state-cet', 'Requirement 8d: Latest canonical slug returns 200 OK');

  // 9. Verify no redirect loops
  assert(!examAfterRen2.previousSlugs.includes(examAfterRen2.slug), 'Requirement 9: Canonical slug is never in its own previousSlugs list (Loop impossible)');

  // 10. Verify course relationship remains intact
  const linkedCourse = readCourses().find(c => c.id === tCourseRes.course.id);
  assert(linkedCourse.examId === tExamId, 'Requirement 10: Course relationship to exam ID ' + tExamId + ' remains 100% intact');

  console.log(bold(cyan('\n========================================================================')));
  console.log(bold('  Total Tests: ' + (passed + failed) + ' | Passed: ' + green(passed) + ' | Failed: ' + (failed ? red(failed) : '0')));
  console.log(bold(cyan('========================================================================\n')));
}

runTests().finally(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});
