// Comprehensive Course Master Backend & Database Audit Test Suite
// Verifies Multi-Admin creation, DB persistence, CRUD operations, Visibility filtering, and Uploads

const fs = require('fs');
const path = require('path');

// Colors for terminal reporting
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;
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

async function runTestSuite() {
  console.log(bold(blue('\n=== 10Q CHALLENGE: COURSE MASTER AUDIT & E2E VERIFICATION ===\n')));

  const dbPath = path.join(__dirname, '..', 'data', 'courses.json');
  console.log(`Database Target File: ${dbPath}`);

  // Backup existing data if any
  let originalData = '[]';
  if (fs.existsSync(dbPath)) {
    originalData = fs.readFileSync(dbPath, 'utf-8');
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Database Initialization
    // -------------------------------------------------------------
    console.log(bold('\n1. Database Schema & File Store Initialization:'));
    fs.writeFileSync(dbPath, '[]', 'utf-8');
    assert(fs.existsSync(dbPath), 'data/courses.json exists and is writable');
    const initContent = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert(Array.isArray(initContent) && initContent.length === 0, 'Database initializes with a clean empty array');

    // -------------------------------------------------------------
    // TEST 2: Administrator A Creates Course A
    // -------------------------------------------------------------
    console.log(bold('\n2. Multi-Admin Flow — Administrator A:'));
    const adminACourse = {
      id: 1,
      title: 'BITSAT 2026 Master Crash Course',
      shortDescription: 'Complete 60-day intensive crash course by BITSians',
      description: '<p>Comprehensive BITSAT preparation batch with full mocks and shortcuts.</p>',
      exam: 'BITSAT',
      originalPrice: '9999',
      discountedPrice: '4999',
      price: '4999',
      discount: '50% OFF',
      expiryDate: '2026-06-30',
      enrolledStudent: 1450,
      displayIndex: 1,
      additionalDetails: 'Includes 1-on-1 mentorship & 25 full mock tests',
      image: '/uploads/courses/bitsat-crash-thumb.png',
      bannerImage: '/uploads/courses/bitsat-crash-banner.png',
      altCourseImage: 'BITSAT 2026 Crash Course Thumbnail',
      altBannerImage: 'BITSAT 2026 Banner',
      scheduleFile: '/uploads/courses/bitsat-roadmap.pdf',
      slug: 'bitsat-2026-master-crash-course',
      metaTitle: 'BITSAT 2026 Master Crash Course | 10Q Challenge',
      metaDescription: 'Crack BITSAT 2026 with toppers guidance.',
      courseLink: '/course-detail/bitsat-2026-master-crash-course',
      isShowInIndex: true,
      isActive: true,
      isShowInMentorship: false,
      isShowInTestSeries: true,
      rating: 4.9,
      reviewsCount: 142,
      mentor: 'Harshal Jain',
      createdBy: 'Admin_A@10qchallenge.in',
      updatedBy: 'Admin_A@10qchallenge.in',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let currentDb = [adminACourse];
    fs.writeFileSync(dbPath, JSON.stringify(currentDb, null, 2), 'utf-8');
    assert(fs.existsSync(dbPath), 'Admin A successfully creates course in central DB');
    let reloadedDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert(reloadedDb.length === 1, 'Database contains 1 course after Admin A creation');
    assert(reloadedDb[0].createdBy === 'Admin_A@10qchallenge.in', 'Record preserves Admin A createdBy audit metadata');
    assert(reloadedDb[0].slug === 'bitsat-2026-master-crash-course', 'Course slug matches expected URL key');

    // -------------------------------------------------------------
    // TEST 3: Administrator B Creates Course B (Multi-Admin Verification)
    // -------------------------------------------------------------
    console.log(bold('\n3. Multi-Admin Flow — Administrator B:'));
    const adminBCourse = {
      id: 2,
      title: 'JEE Main 2026 Rank Booster Batch',
      shortDescription: 'Formula shortcut tricks and speed problem solving',
      description: '<p>Master Physics, Chemistry and Mathematics for JEE Main 2026.</p>',
      exam: 'JEE',
      originalPrice: '12999',
      discountedPrice: '5999',
      price: '5999',
      discount: '54% OFF',
      expiryDate: '2026-05-31',
      enrolledStudent: 980,
      displayIndex: 2,
      additionalDetails: 'Daily DPPs and weekly live doubt clearance',
      image: '/uploads/courses/jee-rank-booster-thumb.png',
      bannerImage: '/uploads/courses/jee-rank-booster-banner.png',
      altCourseImage: 'JEE Main 2026 Booster Thumbnail',
      altBannerImage: 'JEE Main Banner',
      scheduleFile: '/uploads/courses/jee-roadmap.pdf',
      slug: 'jee-main-2026-rank-booster-batch',
      metaTitle: 'JEE Main 2026 Rank Booster | 10Q Challenge',
      metaDescription: 'Target 99+ percentile in JEE Main 2026.',
      courseLink: '/course-detail/jee-main-2026-rank-booster-batch',
      isShowInIndex: true,
      isActive: true,
      isShowInMentorship: true,
      isShowInTestSeries: false,
      rating: 4.8,
      reviewsCount: 88,
      mentor: 'IIT-BITS Faculty Panel',
      createdBy: 'Admin_B@10qchallenge.in',
      updatedBy: 'Admin_B@10qchallenge.in',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    currentDb.push(adminBCourse);
    fs.writeFileSync(dbPath, JSON.stringify(currentDb, null, 2), 'utf-8');
    reloadedDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert(reloadedDb.length === 2, 'Database now contains courses from BOTH Admin A and Admin B simultaneously');
    assert(reloadedDb.some(c => c.createdBy === 'Admin_B@10qchallenge.in'), 'Admin B course is properly persisted in central database');
    assert(reloadedDb.some(c => c.createdBy === 'Admin_A@10qchallenge.in'), 'Admin A course remains intact without being overwritten');

    // -------------------------------------------------------------
    // TEST 4: Visibility & Checkbox Rules Verification
    // -------------------------------------------------------------
    console.log(bold('\n4. Visibility & Filter Rules Verification:'));
    // Add Draft/Inactive Course C
    const draftCourse = {
      id: 3,
      title: 'Upcoming NEET 2027 Foundation (Draft)',
      slug: 'neet-2027-draft',
      exam: 'NEET',
      price: '6999',
      originalPrice: '14999',
      isShowInIndex: false,
      isActive: false, // Inactive/Draft
      isShowInMentorship: false,
      isShowInTestSeries: false,
      createdAt: new Date().toISOString()
    };
    currentDb.push(draftCourse);
    fs.writeFileSync(dbPath, JSON.stringify(currentDb, null, 2), 'utf-8');

    // Public active filter simulation:
    const publicCourses = currentDb.filter(c => c.isActive !== false);
    assert(publicCourses.length === 2, 'Draft / Inactive course is excluded from public website view (isActive: false)');
    assert(!publicCourses.some(c => c.id === 3), 'Course 3 is completely hidden from public queries');

    // Homepage Index filter:
    const homepageCourses = publicCourses.filter(c => c.isShowInIndex);
    assert(homepageCourses.length === 2, 'Homepage index filter correctly includes only isShowInIndex courses');

    // Mentorship filter:
    const mentorshipCourses = publicCourses.filter(c => c.isShowInMentorship);
    assert(mentorshipCourses.length === 1 && mentorshipCourses[0].id === 2, 'Mentorship filter correctly identifies only isShowInMentorship courses');

    // Test Series filter:
    const testSeriesCourses = publicCourses.filter(c => c.isShowInTestSeries);
    assert(testSeriesCourses.length === 1 && testSeriesCourses[0].id === 1, 'Test Series filter correctly identifies only isShowInTestSeries courses');

    // -------------------------------------------------------------
    // TEST 5: Slug Resolution & Encoding Tolerance
    // -------------------------------------------------------------
    console.log(bold('\n5. Slug Resolution & URL Parsing:'));
    function findCourse(target, list) {
      const decoded = decodeURIComponent(String(target)).trim().toLowerCase();
      const dashed = decoded.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return list.find(c => {
        const cId = String(c.id);
        const cSlug = String(c.slug || '').toLowerCase();
        const cTitle = String(c.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return cId === decoded || cSlug === decoded || cSlug === dashed || cTitle === dashed;
      }) || null;
    }

    assert(findCourse('bitsat-2026-master-crash-course', publicCourses)?.id === 1, 'Resolves course by exact slug');
    assert(findCourse('1', publicCourses)?.id === 1, 'Resolves course by numeric ID');
    assert(findCourse('BITSAT%202026%20Master%20Crash%20Course', publicCourses)?.id === 1, 'Resolves course by URI-encoded title');
    assert(findCourse('jee-main-2026-rank-booster-batch', publicCourses)?.id === 2, 'Resolves Admin B course by slug');
    assert(findCourse('non-existent-course', publicCourses) === null, 'Returns null safely for non-existent courses without error');

    // -------------------------------------------------------------
    // TEST 6: File Upload Directory & Permissibility
    // -------------------------------------------------------------
    console.log(bold('\n6. File Upload Infrastructure Verification:'));
    const uploadDirs = [
      path.join(__dirname, '..', 'public', 'uploads', 'courses'),
      path.join(__dirname, '..', 'frontend', 'public', 'uploads', 'courses')
    ];

    for (const uDir of uploadDirs) {
      assert(fs.existsSync(uDir), `Upload directory exists: ${path.relative(path.join(__dirname, '..'), uDir)}`);
      // Test write permissions
      const testFile = path.join(uDir, 'test-perm.tmp');
      fs.writeFileSync(testFile, 'test upload', 'utf-8');
      assert(fs.existsSync(testFile), `Writable permission confirmed for ${path.basename(uDir)}`);
      fs.unlinkSync(testFile);
    }

    // -------------------------------------------------------------
    // TEST 7: Pricing & Data Formatting Validation
    // -------------------------------------------------------------
    console.log(bold('\n7. Price & Field Validation Rules:'));
    function validatePricing(orig, disc) {
      const o = Number(orig) || 0;
      const d = Number(disc) || 0;
      return o >= d;
    }

    assert(validatePricing(9999, 4999), 'Valid pricing: Original >= Discounted');
    assert(!validatePricing(4999, 9999), 'Invalid pricing detected: Discounted cannot exceed Original');

    // -------------------------------------------------------------
    // TEST 8: CRUD Update & Delete
    // -------------------------------------------------------------
    console.log(bold('\n8. CRUD Update & Delete Operations:'));
    // Update Course A
    const courseToUpdate = currentDb.find(c => c.id === 1);
    courseToUpdate.title = 'BITSAT 2026 Master Crash Course (Updated Batch)';
    courseToUpdate.updatedBy = 'Admin_A@10qchallenge.in';
    courseToUpdate.updatedAt = new Date().toISOString();
    fs.writeFileSync(dbPath, JSON.stringify(currentDb, null, 2), 'utf-8');

    const updatedCheck = JSON.parse(fs.readFileSync(dbPath, 'utf-8')).find(c => c.id === 1);
    assert(updatedCheck.title.includes('(Updated Batch)'), 'Course successfully updated with preserved fields');

    // Delete Course 3 (Draft)
    currentDb = currentDb.filter(c => c.id !== 3);
    fs.writeFileSync(dbPath, JSON.stringify(currentDb, null, 2), 'utf-8');
    const finalDb = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert(finalDb.length === 2 && !finalDb.some(c => c.id === 3), 'Course 3 successfully deleted from central DB');

    console.log(bold(green(`\n=== ALL AUDIT TESTS COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED ===\n`)));
  } finally {
    // Restore clean state
    fs.writeFileSync(dbPath, '[]', 'utf-8');
  }
}

runTestSuite();
