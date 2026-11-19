/**
 * PHASE 4.1: COURSE MASTER ISOLATED AUTOMATED TEST SUITE
 * 
 * Verifies all Course Master backend operations, validation rules,
 * referential integrity safeguards, and student access rules
 * against a 100% isolated test fixture directory.
 * 
 * PRODUCTION DATA INVARIANT: data/courses.json is NEVER touched.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TEST_DIR = path.resolve(__dirname, '../.test-fixtures-course-master');

// Ensure isolated directory exists and is clean
if (fs.existsSync(TEST_DIR)) {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEST_DIR, { recursive: true });

// Record production files hash / length before tests
const prodCoursesPath = path.resolve(__dirname, '../data/courses.json');
const prodCoursesPreStats = fs.statSync(prodCoursesPath);

// Seed isolated test fixtures
const initialTestCourses = [
  {
    id: 101,
    title: 'Isolated Fixture Course (Has Dependent Chapters)',
    slug: 'isolated-fixture-course',
    exam: 'BITSAT',
    originalPrice: '9999',
    discountedPrice: '4999',
    price: '4999',
    discount: '50% OFF',
    isActive: true,
    isShowInIndex: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialTestChapters = [
  {
    id: 501,
    courseId: 101,
    chapterName: 'Mock Mechanics Chapter',
    displayOrder: 1,
    isActive: true,
  },
];

const initialTestTopics = [
  {
    id: 601,
    courseId: 101,
    chapterId: 501,
    topicName: 'Mock Vectors Topic',
    displayOrder: 1,
    isActive: true,
  },
];

fs.writeFileSync(path.join(TEST_DIR, 'courses.json'), JSON.stringify(initialTestCourses, null, 2), 'utf-8');
fs.writeFileSync(path.join(TEST_DIR, 'course-subjects.json'), JSON.stringify([], null, 2), 'utf-8');
fs.writeFileSync(path.join(TEST_DIR, 'chapters.json'), JSON.stringify(initialTestChapters, null, 2), 'utf-8');
fs.writeFileSync(path.join(TEST_DIR, 'topics.json'), JSON.stringify(initialTestTopics, null, 2), 'utf-8');

// Instruct all db modules to use the isolated test fixture directory
process.env.DATA_STORE_DIR = TEST_DIR;

// Load db modules under test
const {
  readCoursesFromDb,
  getPublicCourses,
  getAdminCourses,
  getCourseBySlugOrId,
  isSlugTaken,
  isCoursePurchasable,
  checkCourseDependencies,
  createCourse,
  updateCourse,
  deleteCourse,
} = require('../frontend/lib/db/courses.ts');

let testsPassed = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] Test ${totalTests}: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] Test ${totalTests}: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  [FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 4.1 ISOLATED COURSE MASTER TEST SUITE');
  console.log(`Using Isolated Test Directory: ${TEST_DIR}`);
  console.log('======================================================\n');

  // Test 1: Isolated Environment Verification
  runTest('Isolated Environment Active & Isolated Records Loaded', () => {
    const list = readCoursesFromDb();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, 101);
  });

  // Test 2: Validation - Missing Title Rejected
  await runAsyncTest('Create Course: Reject Missing Title', async () => {
    const res = await createCourse({ title: '   ', exam: 'BITSAT' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Course title is required.');
  });

  // Test 3: Validation - Negative Price Rejected
  await runAsyncTest('Create Course: Reject Negative Price', async () => {
    const res = await createCourse({ title: 'Negative Price Course', exam: 'BITSAT', originalPrice: -500 });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Original price cannot be negative.');
  });

  // Test 4: Validation - Discounted Price > Original Price Rejected
  await runAsyncTest('Create Course: Reject Discounted Price > Original Price', async () => {
    const res = await createCourse({
      title: 'Inverted Price Course',
      exam: 'BITSAT',
      originalPrice: 2000,
      discountedPrice: 5000,
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Discounted price cannot exceed original price.');
  });

  // Test 5: Validation - Duplicate Slug Rejected
  await runAsyncTest('Create Course: Reject Duplicate Slug', async () => {
    const res = await createCourse({
      title: 'Another Course',
      slug: 'isolated-fixture-course', // already used by 101
      exam: 'BITSAT',
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.error.includes('already in use'));
  });

  // Test 6: Successful Creation of Disposable Course with All 7 Sections
  let createdCourseId = null;
  await runAsyncTest('Create Course: Successfully Create 7-Section Course', async () => {
    const res = await createCourse({
      title: 'Disposable Test Course 102',
      shortDescription: 'Short test description',
      description: '<p>HTML Rich text syllabus content</p>',
      exam: 'BITSAT',
      originalPrice: 8999,
      discountedPrice: 3999,
      expiryDate: '2026-12-31',
      enrolledStudent: 250,
      displayIndex: 2,
      additionalDetails: 'Includes mock CBT test series',
      image: '/uploads/courses/test-thumb.png',
      altCourseImage: 'Test Course Thumbnail',
      bannerImage: '/uploads/courses/test-banner.png',
      altBannerImage: 'Test Course Banner',
      scheduleFile: '/uploads/courses/test-schedule.pdf',
      slug: 'disposable-test-course-102',
      metaTitle: 'Disposable Test Course 102 | 10Q Challenge',
      metaDescription: 'SEO test description',
      courseLink: '/course-detail/disposable-test-course-102',
      isActive: true,
      isShowInIndex: true,
      isShowInMentorship: false,
      isShowInTestSeries: true,
      mentor: 'Test Mentor Faculty',
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.course);
    assert.strictEqual(res.course.title, 'Disposable Test Course 102');
    assert.strictEqual(res.course.discount, '56% OFF');
    createdCourseId = res.course.id;
  });

  // Test 7: Verify Created Course Retrieval
  runTest('Get Created Course By Slug or ID', () => {
    const byId = getCourseBySlugOrId(createdCourseId);
    assert.ok(byId);
    assert.strictEqual(byId.id, createdCourseId);

    const bySlug = getCourseBySlugOrId('disposable-test-course-102');
    assert.ok(bySlug);
    assert.strictEqual(bySlug.id, createdCourseId);
  });

  // Test 8: Phase 4.1b Safety Lock — Permanent Deletion Blocked Across All Courses
  await runAsyncTest('Safety Lock: Permanent Deletion Blocked with DELETION_DISABLED_USE_ARCHIVE', async () => {
    // Attempt deletion on course 101
    const res1 = await deleteCourse(101);
    assert.strictEqual(res1.success, false);
    assert.strictEqual(res1.code, 'DELETION_DISABLED_USE_ARCHIVE');
    assert.ok(res1.error.includes('Permanent course deletion is disabled'));

    // Attempt deletion on course 102 (unlinked disposable course)
    const res2 = await deleteCourse(createdCourseId);
    assert.strictEqual(res2.success, false);
    assert.strictEqual(res2.code, 'DELETION_DISABLED_USE_ARCHIVE');
    assert.ok(res2.error.includes('Permanent course deletion is disabled'));

    // Verify both courses remain in the database
    assert.ok(getCourseBySlugOrId(101));
    assert.ok(getCourseBySlugOrId(createdCourseId));
  });

  // Test 9: Archive Alternative Works Smoothly
  await runAsyncTest('Archive Workflow: Deactivate Course without Deleting Data', async () => {
    const res = await updateCourse(createdCourseId, {
      isActive: false,
      isShowInIndex: false,
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.course);
    assert.strictEqual(res.course.isActive, false);
    assert.strictEqual(res.course.isShowInIndex, false);
  });

  // Test 10: Visibility vs Student Classroom Access Rules
  await runAsyncTest('Visibility Separation: Archived Course Hidden from Public, Accessible to Student', async () => {
    // Create an archived course
    const res = await createCourse({
      title: 'Archived Alumni Batch 103',
      slug: 'archived-alumni-batch-103',
      exam: 'BITSAT',
      isActive: false, // Archived / Deactivated
      isShowInIndex: false,
    });
    assert.strictEqual(res.success, true);
    const archivedCourseId = res.course.id;

    // Rule 1: Public catalogue MUST NOT return archived course
    const publicList = getPublicCourses();
    const foundInPublic = publicList.find((c) => c.id === archivedCourseId);
    assert.strictEqual(foundInPublic, undefined);

    // Rule 2: Purchase availability MUST reject new enrollments
    const purchasable = isCoursePurchasable(res.course);
    assert.strictEqual(purchasable.purchasable, false);
    assert.ok(purchasable.reason.includes('archived'));

    // Rule 3: Enrolled student classroom access MUST be permitted
    const studentAccess = getCourseBySlugOrId(archivedCourseId, { allowArchived: true });
    assert.ok(studentAccess);
    assert.strictEqual(studentAccess.id, archivedCourseId);
    assert.strictEqual(studentAccess.title, 'Archived Alumni Batch 103');

    // Clean up test course
    await deleteCourse(archivedCourseId);
  });

  // Test 11: Production Data Zero-Touch Invariant Verification
  runTest('Production Data Invariant: data/courses.json 100% Untouched', () => {
    const prodCoursesPostStats = fs.statSync(prodCoursesPath);
    assert.strictEqual(prodCoursesPostStats.size, prodCoursesPreStats.size);
    assert.strictEqual(prodCoursesPostStats.mtimeMs, prodCoursesPreStats.mtimeMs);

    const prodCourses = JSON.parse(fs.readFileSync(prodCoursesPath, 'utf-8'));
    assert.strictEqual(prodCourses.length, 2);
    assert.strictEqual(prodCourses[0].id, 1);
    assert.strictEqual(prodCourses[1].id, 2);
  });

  // Clean up isolated test fixture directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${testsPassed} / ${totalTests} PASSED (${Math.round((testsPassed / totalTests) * 100)}%)`);
  console.log('======================================================\n');

  if (testsPassed === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
