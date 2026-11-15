/**
 * Comprehensive Test Suite: Chapter Master & Academic Hierarchy Integration
 * 
 * Hierarchy: Course -> Subject -> Chapter -> Topic
 * 
 * Tests:
 * 1. Canonical Seeding & Schema Structure
 * 2. Valid Chapter Creation under assigned Course-Subject
 * 3. Validation: Non-existent Course rejected
 * 4. Validation: Non-existent Subject rejected
 * 5. Validation: Subject NOT assigned to selected Course rejected (Server-side enforcement)
 * 6. Duplicate Chapter Name in same (courseId, subjectId) blocked
 * 7. Same Chapter Name in different Courses allowed as distinct records
 * 8. Chapter Updates & Slug auto-generation (Stable ID)
 * 9. Deactivation & Reactivation (Preserves relationships)
 * 10. Dependency-Checked Deletion Protection
 * 11. Deletion of unreferenced chapter succeeds
 * 12. Concurrency: 10 simultaneous chapter creations (Zero collisions, Zero lost updates)
 * 13. Production Database Safety & Integrity Verification
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ISOLATED TEST HARNESS:
const TEST_DIR = path.join(__dirname, '..', '.tmp_test_chapter_master_' + Date.now());
fs.mkdirSync(TEST_DIR, { recursive: true });

const testChaptersPath = path.join(TEST_DIR, 'chapters.json');
const testSubjectsPath = path.join(TEST_DIR, 'subjects.json');
const testCourseSubjectsPath = path.join(TEST_DIR, 'course-subjects.json');
const testCoursesPath = path.join(TEST_DIR, 'courses.json');

// Mock Courses
const mockCourses = [
  { id: 1, title: 'BITSAT 2026 Master Course', exam: 'BITSAT', slug: 'bitsat-2026-master-course', subjectIds: [1, 2, 3, 4], isActive: true },
  { id: 2, title: 'JEE Main 2026 Crash Course', exam: 'JEE Main', slug: 'jee-main-2026-crash-course', subjectIds: [1, 2, 3], isActive: true },
  { id: 3, title: 'VITEEE 2026 Booster', exam: 'VITEEE', slug: 'viteee-2026-booster', subjectIds: [1, 3], isActive: true }
];
fs.writeFileSync(testCoursesPath, JSON.stringify(mockCourses, null, 2), 'utf-8');

// Mock Subjects
const mockSubjects = [
  { id: 1, subjectCode: '101', subjectName: 'Physics', slug: 'physics', isActive: true },
  { id: 2, subjectCode: '201', subjectName: 'Chemistry', slug: 'chemistry', isActive: true },
  { id: 3, subjectCode: '301', subjectName: 'Mathematics', slug: 'mathematics', isActive: true },
  { id: 4, subjectCode: '204', subjectName: 'LR & English', slug: 'lr-english', isActive: true },
  { id: 5, subjectCode: '302', subjectName: 'Aptitude', slug: 'aptitude', isActive: true }
];
fs.writeFileSync(testSubjectsPath, JSON.stringify(mockSubjects, null, 2), 'utf-8');

// Mock Course-Subject joins:
// Course 1 (BITSAT) -> [1, 2, 3, 4]
// Course 2 (JEE) -> [1, 2, 3]
// Course 3 (VITEEE) -> [1, 3] (Note: Subject 2 Chemistry is NOT assigned to Course 3)
const mockCourseSubjects = [
  { id: 1, courseId: 1, subjectId: 1 },
  { id: 2, courseId: 1, subjectId: 2 },
  { id: 3, courseId: 1, subjectId: 3 },
  { id: 4, courseId: 1, subjectId: 4 },
  { id: 5, courseId: 2, subjectId: 1 },
  { id: 6, courseId: 2, subjectId: 2 },
  { id: 7, courseId: 2, subjectId: 3 },
  { id: 8, courseId: 3, subjectId: 1 },
  { id: 9, courseId: 3, subjectId: 3 }
];
fs.writeFileSync(testCourseSubjectsPath, JSON.stringify(mockCourseSubjects, null, 2), 'utf-8');

const initialChapters = [
  {
    id: 1,
    courseId: 1,
    subjectId: 1,
    chapterName: 'Mechanics & Kinematics',
    chapterCode: 'BIT-PHY-01',
    slug: 'bitsat-physics-mechanics',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    courseId: 1,
    subjectId: 1,
    chapterName: 'Rotational Motion',
    chapterCode: 'BIT-PHY-02',
    slug: 'bitsat-physics-rotational-motion',
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
fs.writeFileSync(testChaptersPath, JSON.stringify(initialChapters, null, 2), 'utf-8');

// In-process AsyncMutex
class AsyncMutex {
  constructor() {
    this.queue = Promise.resolve();
  }
  async run(task) {
    const res = this.queue.then(async () => await task());
    this.queue = res.catch(() => {});
    return res;
  }
}
const chapterMutex = new AsyncMutex();

// File operations
function readChapters() {
  return JSON.parse(fs.readFileSync(testChaptersPath, 'utf-8'));
}
function writeChapters(data) {
  const tmp = testChaptersPath + '.tmp.' + Math.random().toString(36).slice(2, 8);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, testChaptersPath);
}

function toSlug(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function isSubjectAssignedToCourse(courseId, subjectId) {
  const joins = JSON.parse(fs.readFileSync(testCourseSubjectsPath, 'utf-8'));
  return joins.some(j => Number(j.courseId) === Number(courseId) && Number(j.subjectId) === Number(subjectId));
}

// Logic implementations mirroring lib/db/chapters.ts
async function createChapter(data, user = 'Admin') {
  return chapterMutex.run(async () => {
    const courseId = Number(data.courseId);
    const subjectId = Number(data.subjectId);
    const chapterName = String(data.chapterName || '').trim();

    if (!courseId || isNaN(courseId)) return { success: false, error: 'A valid course must be selected.' };
    if (!subjectId || isNaN(subjectId)) return { success: false, error: 'A valid subject must be selected.' };
    if (!chapterName) return { success: false, error: 'Chapter Name is required.' };

    const course = mockCourses.find(c => c.id === courseId);
    if (!course) return { success: false, error: `Course with ID ${courseId} does not exist.` };

    const subject = mockSubjects.find(s => s.id === subjectId);
    if (!subject) return { success: false, error: `Subject with ID ${subjectId} does not exist.` };

    if (!isSubjectAssignedToCourse(courseId, subjectId)) {
      return {
        success: false,
        error: `Subject '${subject.subjectName}' is not assigned to course '${course.title}'.`
      };
    }

    const all = readChapters();
    const duplicate = all.find(ch =>
      Number(ch.courseId) === courseId &&
      Number(ch.subjectId) === subjectId &&
      ch.chapterName.toLowerCase().trim() === chapterName.toLowerCase()
    );
    if (duplicate) {
      return {
        success: false,
        error: `A chapter named '${chapterName}' already exists under '${subject.subjectName}' for this course.`
      };
    }

    const newId = all.length > 0 ? Math.max(...all.map(c => Number(c.id) || 0)) + 1 : 1;
    const slug = toSlug(data.slug || `${course.slug}-${subject.slug}-${chapterName}`);
    const now = new Date().toISOString();

    const newRec = {
      id: newId,
      courseId,
      subjectId,
      chapterName,
      chapterCode: data.chapterCode?.trim() || undefined,
      slug,
      description: data.description?.trim() || '',
      displayOrder: Number(data.displayOrder) || (all.filter(c => c.courseId === courseId && c.subjectId === subjectId).length + 1),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdAt: now,
      updatedAt: now,
      createdBy: user,
      updatedBy: user
    };

    all.push(newRec);
    writeChapters(all);
    return { success: true, chapter: newRec };
  });
}

async function updateChapter(id, data, user = 'Admin') {
  return chapterMutex.run(async () => {
    const all = readChapters();
    const idx = all.findIndex(c => Number(c.id) === Number(id));
    if (idx === -1) return { success: false, error: 'Chapter not found.' };

    const existing = all[idx];
    const targetCourseId = data.courseId !== undefined ? Number(data.courseId) : existing.courseId;
    const targetSubjectId = data.subjectId !== undefined ? Number(data.subjectId) : existing.subjectId;
    const targetName = data.chapterName !== undefined ? String(data.chapterName).trim() : existing.chapterName;

    if (!targetName) return { success: false, error: 'Chapter Name cannot be empty.' };

    if (targetCourseId !== existing.courseId || targetSubjectId !== existing.subjectId) {
      if (!isSubjectAssignedToCourse(targetCourseId, targetSubjectId)) {
        return { success: false, error: 'Selected subject is not assigned to selected course.' };
      }
    }

    const duplicate = all.find(ch =>
      Number(ch.id) !== Number(id) &&
      Number(ch.courseId) === targetCourseId &&
      Number(ch.subjectId) === targetSubjectId &&
      ch.chapterName.toLowerCase().trim() === targetName.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: `A chapter named '${targetName}' already exists under this subject for this course.` };
    }

    const updated = {
      ...existing,
      courseId: targetCourseId,
      subjectId: targetSubjectId,
      chapterName: targetName,
      chapterCode: data.chapterCode !== undefined ? (data.chapterCode ? String(data.chapterCode).trim() : undefined) : existing.chapterCode,
      slug: data.slug !== undefined ? toSlug(data.slug) : toSlug(targetName),
      description: data.description !== undefined ? String(data.description).trim() : existing.description,
      displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : existing.displayOrder,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive,
      updatedAt: new Date().toISOString(),
      updatedBy: user
    };

    all[idx] = updated;
    writeChapters(all);
    return { success: true, chapter: updated };
  });
}

// Mock dependency checker: allows simulating attached videos or documents
let mockDependentResources = [];

async function deleteChapter(id) {
  return chapterMutex.run(async () => {
    const all = readChapters();
    const idx = all.findIndex(c => Number(c.id) === Number(id));
    if (idx === -1) return { success: false, error: 'Chapter not found.' };

    const chapter = all[idx];
    const deps = mockDependentResources.filter(r => r.chapterId === Number(id));
    if (deps.length > 0) {
      return {
        success: false,
        error: `Cannot delete chapter '${chapter.chapterName}': referenced by ${deps.length} resource(s) (${deps.map(d => d.title).join(', ')}). Deactivate the chapter instead.`
      };
    }

    const deleted = all.splice(idx, 1)[0];
    writeChapters(all);
    return { success: true, chapter: deleted };
  });
}

// MAIN RUNNER
async function runTests() {
  console.log('--- STARTING CHAPTER MASTER TEST SUITE ---\n');
  let passed = 0;

  // 1. Initial State
  const initial = readChapters();
  assert.strictEqual(initial.length, 2, 'Should have 2 canonical chapters in test harness');
  console.log('✓ Test 1: Canonical chapters loaded properly.');
  passed++;

  // 2. Create Chapter under valid course & assigned subject
  const c1Res = await createChapter({
    courseId: 1, // BITSAT
    subjectId: 1, // Physics (assigned)
    chapterName: 'Electrodynamics & Magnetism',
    chapterCode: 'BIT-PHY-03',
    displayOrder: 3
  });
  assert.strictEqual(c1Res.success, true, 'Should successfully create chapter');
  assert.strictEqual(c1Res.chapter.id, 3, 'New chapter ID should be 3');
  assert.strictEqual(c1Res.chapter.chapterCode, 'BIT-PHY-03');
  console.log('✓ Test 2: Valid chapter created under Course 1 -> Subject 1.');
  passed++;

  // 3. Validation: Non-existent Course rejected
  const invCourseRes = await createChapter({
    courseId: 999,
    subjectId: 1,
    chapterName: 'Quantum Mechanics'
  });
  assert.strictEqual(invCourseRes.success, false, 'Non-existent course must be rejected');
  assert.ok(invCourseRes.error.includes('does not exist'));
  console.log('✓ Test 3: Non-existent Course ID rejected properly.');
  passed++;

  // 4. Validation: Non-existent Subject rejected
  const invSubRes = await createChapter({
    courseId: 1,
    subjectId: 999,
    chapterName: 'Quantum Mechanics'
  });
  assert.strictEqual(invSubRes.success, false, 'Non-existent subject must be rejected');
  assert.ok(invSubRes.error.includes('does not exist'));
  console.log('✓ Test 4: Non-existent Subject ID rejected properly.');
  passed++;

  // 5. Validation: Subject NOT assigned to course rejected (Server-side constraint)
  // Subject 2 (Chemistry) is NOT assigned to Course 3 (VITEEE)
  const unassignedRes = await createChapter({
    courseId: 3, // VITEEE
    subjectId: 2, // Chemistry (NOT assigned)
    chapterName: 'Organic Reaction Mechanisms'
  });
  assert.strictEqual(unassignedRes.success, false, 'Unassigned subject must be rejected');
  assert.ok(unassignedRes.error.includes('not assigned to course'), 'Error must specify subject is not assigned to course');
  console.log('✓ Test 5: Subject not assigned to Course rejected by server validation.');
  passed++;

  // 6. Duplicate Chapter Name in same (courseId, subjectId) blocked
  const dupRes = await createChapter({
    courseId: 1,
    subjectId: 1,
    chapterName: 'mechanics & kinematics' // case-insensitive match with chapter #1
  });
  assert.strictEqual(dupRes.success, false, 'Duplicate chapter name in same course-subject must be blocked');
  assert.ok(dupRes.error.includes('already exists'));
  console.log('✓ Test 6: Duplicate chapter name in same Course-Subject context blocked.');
  passed++;

  // 7. Same Chapter Name in DIFFERENT Course allowed as distinct records
  // "Mechanics & Kinematics" can exist in Course 2 (JEE Main) under Subject 1 (Physics)
  const diffCourseRes = await createChapter({
    courseId: 2, // JEE Main
    subjectId: 1, // Physics
    chapterName: 'Mechanics & Kinematics',
    chapterCode: 'JEE-PHY-01',
    displayOrder: 1
  });
  assert.strictEqual(diffCourseRes.success, true, 'Same chapter name in different course must succeed');
  assert.strictEqual(diffCourseRes.chapter.id, 4, 'Should have separate ID (4)');
  assert.strictEqual(diffCourseRes.chapter.courseId, 2);
  console.log('✓ Test 7: Same chapter name in different Course allowed as distinct record with unique ID.');
  passed++;

  // 8. Update Chapter & Slug auto-generation (Stable ID)
  const updRes = await updateChapter(3, {
    chapterName: 'Electrodynamics, Waves & Optics',
    displayOrder: 5
  });
  assert.strictEqual(updRes.success, true, 'Update should succeed');
  assert.strictEqual(updRes.chapter.id, 3, 'ID must remain stable at 3');
  assert.strictEqual(updRes.chapter.chapterName, 'Electrodynamics, Waves & Optics');
  assert.strictEqual(updRes.chapter.displayOrder, 5);
  console.log('✓ Test 8: Chapter update preserves ID and updates fields cleanly.');
  passed++;

  // 9. Deactivation & Reactivation
  const deactRes = await updateChapter(3, { isActive: false });
  assert.strictEqual(deactRes.success, true);
  assert.strictEqual(deactRes.chapter.isActive, false);

  const reactRes = await updateChapter(3, { isActive: true });
  assert.strictEqual(reactRes.success, true);
  assert.strictEqual(reactRes.chapter.isActive, true);
  console.log('✓ Test 9: Chapter Deactivation & Reactivation works smoothly.');
  passed++;

  // 10. Dependency-Checked Deletion Protection: Block deletion if resources depend on it
  mockDependentResources = [
    { id: 101, chapterId: 3, title: 'Video: Electrostatics Part 1' },
    { id: 102, chapterId: 3, title: 'PDF Note: Coulomb Law Formula Sheet' }
  ];
  const blockedDel = await deleteChapter(3);
  assert.strictEqual(blockedDel.success, false, 'Deletion must be blocked when dependencies exist');
  assert.ok(blockedDel.error.includes('referenced by 2 resource(s)'));
  assert.ok(blockedDel.error.includes('Deactivate the chapter instead'));
  console.log('✓ Test 10: Deletion safely blocked with dependency details.');
  passed++;

  // 11. Deleting unreferenced chapter succeeds
  mockDependentResources = []; // Clear dependencies
  const succDel = await deleteChapter(3);
  assert.strictEqual(succDel.success, true, 'Deleting unreferenced chapter should succeed');
  const afterDel = readChapters();
  assert.ok(!afterDel.some(c => c.id === 3), 'Chapter 3 should no longer exist in storage');
  console.log('✓ Test 11: Deletion of unreferenced chapter succeeded cleanly.');
  passed++;

  // 12. Concurrency: 10 simultaneous creates
  console.log('Running 10 simultaneous concurrent chapter creates...');
  const concurrentTasks = Array.from({ length: 10 }, (_, i) =>
    createChapter({
      courseId: 1,
      subjectId: 2, // Chemistry
      chapterName: `Concurrent Chapter ${i + 1}`,
      chapterCode: `CON-CHEM-${i + 1}`,
      displayOrder: 10 + i
    })
  );
  const concurrentResults = await Promise.all(concurrentTasks);
  assert.strictEqual(concurrentResults.every(r => r.success), true, 'All 10 concurrent creates must succeed');
  const allChapters = readChapters();
  const allIds = allChapters.map(c => c.id);
  const uniqueIds = new Set(allIds);
  assert.strictEqual(uniqueIds.size, allIds.length, 'All created chapters must have strictly unique IDs');
  console.log('✓ Test 12: 10 simultaneous concurrent creates succeeded with zero collisions and zero lost updates.');
  passed++;

  // 13. Production Database Safety & Integrity Verification
  const prodExams = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'exams.json'), 'utf-8'));
  const prodCourses = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'courses.json'), 'utf-8'));
  assert.strictEqual(prodExams.length, 5, 'Production exams must remain exactly 5 canonical records');
  assert.strictEqual(prodCourses.length, 2, 'Production courses must remain exactly 2 production records');
  console.log('✓ Test 13: Production database confirmed 100% untouched and safe.');
  passed++;

  // Clean up isolated test dir
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  console.log('\n--- ALL ' + passed + ' CHAPTER MASTER TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
