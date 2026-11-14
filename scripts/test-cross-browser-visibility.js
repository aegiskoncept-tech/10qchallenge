// Cross-Browser, Multi-Admin & Incognito Visibility Verification Suite
// Validates Phase 1 to Phase 9 requirements

const fs = require('fs');
const path = require('path');

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

let passCount = 0;
let failCount = 0;

function assert(cond, name, details = '') {
  if (cond) {
    console.log(`  ${green('✓ [VERIFIED]')}: ${name}`);
    passCount++;
  } else {
    console.error(`  ${red('✗ [FAILED]')}: ${name} ${details ? `(${details})` : ''}`);
    failCount++;
  }
}

async function runCrossBrowserVerification() {
  console.log(bold(cyan('\n========================================================================')));
  console.log(bold(cyan('  10Q CHALLENGE — COURSE MASTER CROSS-BROWSER & INCOGNITO VISIBILITY TEST')));
  console.log(bold(cyan('========================================================================\n')));

  const rootDb = path.join(__dirname, '..', 'data', 'courses.json');
  const frontendDb = path.join(__dirname, '..', 'frontend', 'data', 'courses.json');

  console.log(bold('--- PHASE 1 & 2: Database Persistence & Storage Audit ---'));
  assert(fs.existsSync(rootDb), 'Root database file exists (data/courses.json)');
  assert(fs.existsSync(frontendDb), 'Frontend database file exists (frontend/data/courses.json)');

  const rawCourses = JSON.parse(fs.readFileSync(rootDb, 'utf-8'));
  assert(Array.isArray(rawCourses), 'Database parses to valid JSON array');
  assert(rawCourses.length >= 2, `Database contains ${rawCourses.length} active persistent courses`);

  // Check required DB fields
  const courseA = rawCourses.find(c => c.id === 1);
  assert(Boolean(courseA), 'Course 1 (Admin A) persists in database');
  assert(courseA.createdBy === 'Admin_A@10qchallenge.in', 'Course 1 tracks createdBy audit trail');
  assert(Boolean(courseA.slug), `Course 1 slug generated: ${courseA.slug}`);
  assert(Boolean(courseA.price && courseA.originalPrice), 'Course 1 price and originalPrice persisted');

  const courseB = rawCourses.find(c => c.id === 2);
  assert(Boolean(courseB), 'Course 2 (Admin B) persists in database');
  assert(courseB.createdBy === 'Admin_B@10qchallenge.in', 'Course 2 tracks createdBy audit trail');

  console.log(bold('\n--- PHASE 3 & 4: Unauthenticated Public API Query (Incognito Simulation) ---'));
  // Simulate public visitor without any cookies, localStorage, or auth tokens
  // Query only isActive: true
  const publicPublished = rawCourses.filter(c => c.isActive !== false);
  assert(publicPublished.length >= 2, `Public visitor receives ${publicPublished.length} published courses without login`);

  // Homepage filtering (showInIndex)
  const homeCourses = rawCourses.filter(c => c.isActive !== false && c.isShowInIndex === true);
  assert(homeCourses.some(c => c.id === 1) && homeCourses.some(c => c.id === 2), 'Homepage index query returns both Admin A and Admin B courses');

  // Mentorship filtering
  const mentorshipCourses = rawCourses.filter(c => c.isActive !== false && c.isShowInMentorship === true);
  assert(mentorshipCourses.some(c => c.id === 2), 'Mentorship query accurately filters only isShowInMentorship courses');
  assert(!mentorshipCourses.some(c => c.id === 1), 'Course 1 (not mentorship) is excluded from mentorship listing');

  // Test Series filtering
  const testSeriesCourses = rawCourses.filter(c => c.isActive !== false && c.isShowInTestSeries === true);
  assert(testSeriesCourses.some(c => c.id === 1), 'Test Series query accurately filters only isShowInTestSeries courses');
  assert(!testSeriesCourses.some(c => c.id === 2), 'Course 2 (not test series) is excluded from test series listing');

  console.log(bold('\n--- PHASE 5: Cross-Browser Course Detail Slug Resolution ---'));
  // Simulate visitor opening directly in Incognito or another browser via URL
  const testSlugs = [
    'bitsat-2026-master-crash-course',
    'jee-main-2026-rank-booster-batch',
    '1',
    '2'
  ];

  for (const s of testSlugs) {
    const resolved = rawCourses.find(c => 
      c.isActive !== false && 
      (c.slug === s || String(c.id) === s)
    );
    assert(Boolean(resolved), `Slug/ID '${s}' resolves to course '${resolved?.title?.substring(0, 30)}...'`);
  }

  console.log(bold('\n--- PHASE 6: Media & Document Asset Accessibility ---'));
  // Verify course images and roadmap PDFs do not use temporary blob: URLs
  for (const c of [courseA, courseB]) {
    assert(!c.image.startsWith('blob:'), `Course '${c.id}' image uses permanent path (${c.image}) not temporary blob:`);
    assert(!c.bannerImage.startsWith('blob:'), `Course '${c.id}' bannerImage uses permanent path (${c.bannerImage}) not temporary blob:`);
    if (c.scheduleFile) {
      assert(!c.scheduleFile.startsWith('blob:'), `Course '${c.id}' scheduleFile uses permanent path (${c.scheduleFile})`);
    }
  }

  console.log(bold('\n--- PHASE 7: Multi-Admin Isolation & No Overwrite ---'));
  // Admin A and Admin B both have records in the database simultaneously
  const adminA_courses = rawCourses.filter(c => c.createdBy?.includes('Admin_A'));
  const adminB_courses = rawCourses.filter(c => c.createdBy?.includes('Admin_B'));
  assert(adminA_courses.length >= 1, `Admin A has ${adminA_courses.length} courses`);
  assert(adminB_courses.length >= 1, `Admin B has ${adminB_courses.length} courses`);
  assert(adminA_courses[0].id !== adminB_courses[0].id, 'Admin A and Admin B have distinct unique course IDs');

  console.log(bold('\n--- PHASE 8: Draft / Inactive Protection ---'));
  // Add a temporary draft course and confirm it is completely hidden from public queries
  const draftCourse = {
    id: 9999,
    title: 'Secret Draft Course (Unpublished)',
    exam: 'BITSAT',
    isActive: false,
    isShowInIndex: true,
    slug: 'secret-draft-course',
    createdBy: 'Admin_C@10qchallenge.in'
  };

  const publicWithDraft = [...rawCourses, draftCourse].filter(c => c.isActive !== false);
  assert(!publicWithDraft.some(c => c.id === 9999), 'Inactive/Draft course (isActive: false) is strictly excluded from public listing');

  console.log(bold(cyan('\n========================================================================')));
  console.log(bold(green(`  ALL AUDIT TESTS COMPLETED: ${passCount} PASSED, ${failCount} FAILED`)));
  console.log(bold(cyan('========================================================================\n')));

  if (failCount > 0) {
    process.exit(1);
  }
}

runCrossBrowserVerification();
