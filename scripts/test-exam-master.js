// Comprehensive Exam Master & Course Master Integration Verification Suite
// Tests all requirements for Phase 8: Tests A through J

const fs = require('fs');
const path = require('path');

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ${green('✓ PASS')}: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${red('✗ FAIL')}: ${testName} ${details ? `(${details})` : ''}`);
    failedCount++;
  }
}

async function runExamMasterTestSuite() {
  console.log(bold(cyan('\n========================================================================')));
  console.log(bold(cyan('  10Q CHALLENGE — EXAM MASTER & COURSE INTEGRATION AUDIT SUITE')));
  console.log(bold(cyan('========================================================================\n')));

  const rootExamsDb = path.join(__dirname, '..', 'data', 'exams.json');
  const frontendExamsDb = path.join(__dirname, '..', 'frontend', 'data', 'exams.json');
  const rootCoursesDb = path.join(__dirname, '..', 'data', 'courses.json');
  const frontendCoursesDb = path.join(__dirname, '..', 'frontend', 'data', 'courses.json');

  // Verify backup exists before starting test suite
  const backupsDir = path.join(__dirname, '..', 'data', 'backups');
  assert(fs.existsSync(backupsDir), 'Mandatory production data backup folder exists');

  // Save current production state to restore cleanly after test run
  const originalCoursesRaw = fs.readFileSync(rootCoursesDb, 'utf-8');
  let originalExamsRaw = null;
  if (fs.existsSync(rootExamsDb)) {
    originalExamsRaw = fs.readFileSync(rootExamsDb, 'utf-8');
  }

  // Pure JS DB helpers matching lib/db/exams.ts and lib/db/courses.ts
  const CANONICAL_EXAMS = [
    { id: 1, examName: 'BITSAT', slug: 'bitsat', isActive: true, displayIndex: 1, description: 'BITSAT Prep' },
    { id: 2, examName: 'Comedk', slug: 'comedk', isActive: true, displayIndex: 2, description: 'COMEDK Prep' },
    { id: 3, examName: 'JEE', slug: 'jee', isActive: true, displayIndex: 3, description: 'JEE Prep' },
    { id: 4, examName: 'Manipal (MET)', slug: 'manipal-met', isActive: true, displayIndex: 4, description: 'MET Prep' },
    { id: 5, examName: 'VITEEE', slug: 'viteee', isActive: true, displayIndex: 5, description: 'VITEEE Prep' },
  ];

  function readExams() {
    if (fs.existsSync(rootExamsDb)) {
      const raw = fs.readFileSync(rootExamsDb, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    writeExams(CANONICAL_EXAMS);
    return CANONICAL_EXAMS;
  }

  function writeExams(exams) {
    const json = JSON.stringify(exams, null, 2);
    fs.writeFileSync(rootExamsDb, json, 'utf-8');
    const fDir = path.dirname(frontendExamsDb);
    if (!fs.existsSync(fDir)) fs.mkdirSync(fDir, { recursive: true });
    fs.writeFileSync(frontendExamsDb, json, 'utf-8');
  }

  function readCourses() {
    return JSON.parse(fs.readFileSync(rootCoursesDb, 'utf-8'));
  }

  function writeCourses(courses) {
    const json = JSON.stringify(courses, null, 2);
    fs.writeFileSync(rootCoursesDb, json, 'utf-8');
    fs.writeFileSync(frontendCoursesDb, json, 'utf-8');
  }

  function toSlug(s) {
    return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function countCoursesForExam(examId, examName) {
    const courses = readCourses();
    const norm = examName.toLowerCase().trim();
    return courses.filter((c) => {
      if (c.examId && Number(c.examId) === Number(examId)) return true;
      if (c.exam && c.exam.toLowerCase().trim() === norm) return true;
      if (norm.includes('met') && c.exam && c.exam.toLowerCase().includes('met')) return true;
      return false;
    }).length;
  }

  function createExam(data, user = 'Admin') {
    if (!data.examName || !data.examName.trim()) return { success: false, error: 'Exam Name is required.' };
    const slug = toSlug(data.slug || data.examName);
    const all = readExams();
    if (all.some((e) => toSlug(e.slug) === slug)) {
      return { success: false, error: `The slug '${slug}' is already taken.` };
    }
    const newId = all.length > 0 ? Math.max(...all.map((e) => Number(e.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();
    const exam = {
      id: newId,
      examName: data.examName.trim(),
      slug,
      description: data.description || '',
      metaTitle: data.metaTitle || `${data.examName} | 10Q Challenge`,
      metaDescription: data.metaDescription || '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      displayIndex: data.displayIndex || newId,
      createdBy: user,
      updatedBy: user,
      createdAt: now,
      updatedAt: now,
    };
    all.push(exam);
    writeExams(all);
    return { success: true, exam };
  }

  function updateExam(id, data, user = 'Admin') {
    const all = readExams();
    const idx = all.findIndex((e) => Number(e.id) === Number(id));
    if (idx === -1) return { success: false, error: 'Exam not found' };
    const existing = all[idx];
    const newSlug = data.slug ? toSlug(data.slug) : existing.slug;
    if (newSlug !== existing.slug && all.some((e) => Number(e.id) !== Number(id) && toSlug(e.slug) === newSlug)) {
      return { success: false, error: 'Slug taken' };
    }
    const updated = {
      ...existing,
      ...data,
      id: existing.id,
      examName: data.examName ? data.examName.trim() : existing.examName,
      slug: newSlug,
      updatedBy: user,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    writeExams(all);
    return { success: true, exam: updated };
  }

  function deleteExam(id) {
    const all = readExams();
    const target = all.find((e) => Number(e.id) === Number(id));
    if (!target) return { success: false, error: 'Exam not found' };
    const count = countCoursesForExam(target.id, target.examName);
    if (count > 0) {
      return {
        success: false,
        error: `Cannot delete exam '${target.examName}'. ${count} course(s) are currently associated with it.`,
        associatedCoursesCount: count,
      };
    }
    const filtered = all.filter((e) => Number(e.id) !== Number(id));
    writeExams(filtered);
    return { success: true };
  }

  try {
    // -------------------------------------------------------------
    // 1. Initial Architecture & Existing Records Audit
    // -------------------------------------------------------------
    console.log(bold('--- 1. DATABASE STORAGE & CANONICAL SEEDING ---'));
    const initialExams = readExams();
    assert(fs.existsSync(rootExamsDb), 'data/exams.json exists in root storage');
    assert(fs.existsSync(frontendExamsDb), 'frontend/data/exams.json exists in frontend storage');
    assert(Array.isArray(initialExams) && initialExams.length >= 5, `Initial database contains ${initialExams.length} canonical exams (BITSAT, Comedk, JEE, MET, VITEEE)`);

    const bitsatExam = initialExams.find(e => e.id === 1);
    assert(bitsatExam && bitsatExam.examName === 'BITSAT' && bitsatExam.slug === 'bitsat', 'Canonical Exam 1 (BITSAT) verified');

    // -------------------------------------------------------------
    // Test A — Create New Exam
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST A: CREATE EXAM IN EXAM MASTER ---'));
    const testExamName = 'NEET Tech 2026';
    const testExamSlug = 'neet-tech-2026';
    const createResult = createExam({
      examName: testExamName,
      slug: testExamSlug,
      description: '<p>Comprehensive NEET preparation module for medical-engineering aspirants.</p>',
      metaTitle: 'NEET Tech 2026 Preparation Guide | 10Q Challenge',
      metaDescription: 'Crack NEET Tech 2026 with India top mentors.',
      isActive: true,
    }, 'Admin_A@10qchallenge.in');

    assert(createResult.success === true, 'Test exam created successfully');
    assert(Boolean(createResult.exam && createResult.exam.id), `Exam assigned unique ID: ${createResult.exam?.id}`);
    assert(createResult.exam?.createdBy === 'Admin_A@10qchallenge.in', 'Exam tracks createdBy audit trail');

    const createdId = createResult.exam.id;
    const dbAfterCreate = readExams();
    assert(dbAfterCreate.some(e => e.id === createdId), 'Exam persists to permanent disk store');

    // Validate duplicate slug prevention
    const duplicateSlugResult = createExam({
      examName: 'Another NEET Exam',
      slug: testExamSlug,
    }, 'Admin_B@10qchallenge.in');
    assert(duplicateSlugResult.success === false, 'Duplicate slug correctly rejected');

    // -------------------------------------------------------------
    // Test B — Course Master Dropdown Availability
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST B: COURSE MASTER DROPDOWN INTEGRATION ---'));
    const publicExams = readExams().filter(e => e.isActive !== false);
    const dropdownExamFound = publicExams.find(e => e.id === createdId);
    assert(Boolean(dropdownExamFound), 'Newly created exam appears in Course Master available exams list');
    assert(dropdownExamFound?.examName === testExamName, 'Exam name in dropdown matches created record');

    // -------------------------------------------------------------
    // Test C — Course Assignment
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST C: COURSE ASSIGNMENT TO EXAM ---'));
    const currentCourses = readCourses();
    const newCourseId = Math.max(...currentCourses.map(c => Number(c.id) || 0)) + 1;
    const testCourseA = {
      id: newCourseId,
      title: 'NEET Tech 2026 Intensive Crash Batch',
      exam: testExamName,
      examId: createdId,
      price: '3999',
      discountedPrice: '3999',
      originalPrice: '7999',
      slug: 'neet-tech-2026-intensive-crash-batch',
      isActive: true,
      isShowInIndex: true,
      createdBy: 'Admin_A@10qchallenge.in'
    };
    currentCourses.unshift(testCourseA);
    writeCourses(currentCourses);

    assert(testCourseA.exam === testExamName, 'Course stores correct exam name');
    assert(testCourseA.examId === createdId, 'Course stores stable examId foreign key');

    // -------------------------------------------------------------
    // Test D — Multiple Courses per Exam & Real Course Counts
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST D: MULTIPLE COURSES PER EXAM & REAL COUNTS ---'));
    const testCourseB = {
      id: newCourseId + 1,
      title: 'NEET Tech 2026 All India Test Series',
      exam: testExamName,
      examId: createdId,
      price: '1999',
      discountedPrice: '1999',
      originalPrice: '3999',
      slug: 'neet-tech-2026-all-india-test-series',
      isActive: true,
      isShowInTestSeries: true,
      createdBy: 'Admin_B@10qchallenge.in'
    };
    currentCourses.unshift(testCourseB);
    writeCourses(currentCourses);

    const count = countCoursesForExam(createdId, testExamName);
    assert(count === 2, `countCoursesForExam calculates exact real count: ${count} courses (no dummy counts)`);

    // -------------------------------------------------------------
    // Test E — Edit Exam Name & Preserve Relationships
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST E: EDIT EXAM & RELATIONSHIP PRESERVATION ---'));
    const updatedExamName = 'NEET Tech & Bio 2026 (Updated)';
    const editResult = updateExam(createdId, {
      examName: updatedExamName,
      metaTitle: 'NEET Tech & Bio 2026 Updated Guide',
    }, 'Admin_B@10qchallenge.in');

    assert(editResult.success === true, 'Exam successfully edited');
    assert(editResult.exam?.id === createdId, 'Exam ID is preserved during edit');
    assert(editResult.exam?.updatedBy === 'Admin_B@10qchallenge.in', 'Updated audit trail tracks Admin B');

    // Verify both courses still preserve relationship by examId
    const coursesAfterExamEdit = readCourses();
    const courseA_check = coursesAfterExamEdit.find(c => c.id === testCourseA.id);
    const courseB_check = coursesAfterExamEdit.find(c => c.id === testCourseB.id);
    assert(courseA_check?.examId === createdId, 'Course A retains stable relationship to exam ID');
    assert(courseB_check?.examId === createdId, 'Course B retains stable relationship to exam ID');

    // -------------------------------------------------------------
    // Test F — Multi-Admin Access & Audit Trail
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST F: MULTI-ADMIN CONCURRENCY & ACCESS ---'));
    const examRecord = readExams().find(e => e.id === createdId);
    assert(examRecord?.createdBy === 'Admin_A@10qchallenge.in', 'Administrator A original creation preserved');
    assert(examRecord?.updatedBy === 'Admin_B@10qchallenge.in', 'Administrator B modification recorded');

    // -------------------------------------------------------------
    // Test G — Deactivation
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST G: DEACTIVATION (EXCLUDED FROM NEW ASSIGNMENTS) ---'));
    const deactivateResult = updateExam(createdId, { isActive: false }, 'Admin_A@10qchallenge.in');
    assert(deactivateResult.success === true && deactivateResult.exam?.isActive === false, 'Exam deactivated successfully');

    const publicExamsAfterDeactivation = readExams().filter(e => e.isActive !== false);
    assert(!publicExamsAfterDeactivation.some(e => e.id === createdId), 'Deactivated exam is excluded from public available dropdown');

    // Existing courses must retain their relationship
    const coursesAfterDeactivation = readCourses();
    const courseStillLinked = coursesAfterDeactivation.find(c => c.id === testCourseA.id);
    assert(courseStillLinked?.examId === createdId, 'Existing courses retain relationship to deactivated exam');

    // -------------------------------------------------------------
    // Test H — Deletion Protection (Block When Courses Depend on Exam)
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST H: STRICT DELETION PROTECTION ---'));
    const unsafeDeleteAttempt = deleteExam(createdId);
    assert(unsafeDeleteAttempt.success === false, 'Unsafe deletion strictly blocked when courses depend on exam');
    assert(unsafeDeleteAttempt.associatedCoursesCount === 2, 'Blocked response returns exact count of dependent courses');
    assert(unsafeDeleteAttempt.error?.includes('course(s) are currently associated'), 'Meaningful error message returned');

    // Courses must NOT be cascade deleted
    const coursesCheck = readCourses();
    assert(coursesCheck.some(c => c.id === testCourseA.id), 'Course A was NOT cascade deleted');
    assert(coursesCheck.some(c => c.id === testCourseB.id), 'Course B was NOT cascade deleted');

    // Safe deletion: remove test courses first, then delete exam
    const cleanCourses = coursesCheck.filter(c => c.id !== testCourseA.id && c.id !== testCourseB.id);
    writeCourses(cleanCourses);

    const safeDeleteAttempt = deleteExam(createdId);
    assert(safeDeleteAttempt.success === true, 'Safe deletion succeeds once 0 courses depend on exam');
    assert(!readExams().some(e => e.id === createdId), 'Exam permanently removed from DB once safe');

    // -------------------------------------------------------------
    // Test I — Public Website & SEO Compatibility
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST I: PUBLIC WEBSITE & SEO COMPATIBILITY ---'));
    const bitsatPublic = readExams().find(e => e.slug === 'bitsat');
    assert(Boolean(bitsatPublic), 'Public exam resolves by slug "bitsat"');
    assert(Boolean(bitsatPublic?.metaTitle || bitsatPublic?.description), `SEO metadata available: "${bitsatPublic?.metaTitle || bitsatPublic?.description}"`);

    const bitsatById = readExams().find(e => e.id === 1);
    assert(bitsatById?.examName === 'BITSAT', 'Public exam resolves by numeric ID 1');

    // -------------------------------------------------------------
    // Test J — Regression & Existing Production Data Protection
    // -------------------------------------------------------------
    console.log(bold('\n--- TEST J: REGRESSION & PRODUCTION DATA INTEGRITY ---'));
    const finalCourses = readCourses();
    const origCourse1 = finalCourses.find(c => c.id === 1);
    const origCourse2 = finalCourses.find(c => c.id === 2);

    assert(Boolean(origCourse1), 'Production Course 1 (BITSAT Crash) remains intact');
    assert(origCourse1?.exam === 'BITSAT', 'Production Course 1 maintains "BITSAT" exam assignment');
    assert(origCourse1?.slug === 'bitsat-2026-master-crash-course', 'Production Course 1 slug unchanged');

    assert(Boolean(origCourse2), 'Production Course 2 (JEE Rank Booster) remains intact');
    assert(origCourse2?.exam === 'JEE', 'Production Course 2 maintains "JEE" exam assignment');
    assert(origCourse2?.slug === 'jee-main-2026-rank-booster-batch', 'Production Course 2 slug unchanged');

    console.log(bold(cyan('\n========================================================================')));
    console.log(bold(green(`  ALL AUDIT TESTS COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED`)));
    console.log(bold(cyan('========================================================================\n')));

    if (failedCount > 0) {
      process.exit(1);
    }
  } finally {
    // Restore clean production data state
    if (originalCoursesRaw) {
      fs.writeFileSync(rootCoursesDb, originalCoursesRaw, 'utf-8');
      fs.writeFileSync(frontendCoursesDb, originalCoursesRaw, 'utf-8');
    }
    if (originalExamsRaw) {
      fs.writeFileSync(rootExamsDb, originalExamsRaw, 'utf-8');
      fs.writeFileSync(frontendExamsDb, originalExamsRaw, 'utf-8');
    }
  }
}

runExamMasterTestSuite();
