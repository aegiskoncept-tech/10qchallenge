// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 3.4 AUTOMATED TEST SUITE: STAGE 1
// PostgreSQL 16 Learning Progress Schema, Constraints, Unique Indexes,
// Event Ledger Idempotency, Multi-Tenant Isolation, Academic Hierarchy
// Validation, Zero-Topic Chapter Safety, and Persistence Verification
// ==============================================================================

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

async function runFeature34Tests() {
  console.log('================================================================');
  console.log('10Q CHALLENGE LMS — FEATURE 3.4 STAGE 1 VERIFICATION SUITE');
  console.log('PostgreSQL 16 Learning Progress Foundation & Academic Validation');
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

  // --- PART 1: STORAGE & DIRECTORY PRE-CHECK ---
  console.log('--- 1. Storage & Directory Integrity Pre-Check ---');
  const pgDir = path.join(process.cwd(), 'database', 'pg_commerce_dev');
  assert(fs.existsSync(pgDir), 'database/pg_commerce_dev exists');

  const migrationFile = path.join(process.cwd(), 'migrations', 'learning', '01_init_learning_schema.sql');
  assert(fs.existsSync(migrationFile), '01_init_learning_schema.sql migration file exists');

  const authDbPath = path.join(process.cwd(), 'database', '10q_auth_dev.db');
  assert(fs.existsSync(authDbPath), 'database/10q_auth_dev.db exists');

  const authDb = new DatabaseSync(authDbPath);
  const studentARow = authDb.prepare('SELECT id, email FROM users WHERE email = ?').get('test.student@10qchallenge.in');
  const studentBRow = authDb.prepare('SELECT id, email FROM users WHERE email = ?').get('student.isolation.test@example.com');
  const studentAId = studentARow ? Number(studentARow.id) : 8;
  const studentBId = studentBRow ? Number(studentBRow.id) : 35;
  authDb.close();

  assert(Boolean(studentAId), `Student A resolved with ID ${studentAId}`);
  assert(Boolean(studentBId), `Student B resolved with ID ${studentBId}`);
  assert(studentAId !== studentBId, 'Student A and Student B IDs are distinct');

  // Load modules
  const { getCommerceDb, closeCommerceDb } = require('../frontend/lib/learning/dist/commerce/db.js');
  const { AcademicHierarchyValidator } = require('../frontend/lib/learning/dist/learning/validation.js');
  const { LearningProgressService } = require('../frontend/lib/learning/dist/learning/progress-service.js');

  // --- PART 2: POSTGRESQL 16 LEARNING SCHEMA & TABLE STRUCTURE ---
  console.log('\n--- 2. PostgreSQL 16 Learning Schema & Table Structure ---');
  let db = await getCommerceDb();

  const tablesRes = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'learning'
    ORDER BY table_name;
  `);

  const tableNames = tablesRes.rows.map((r) => r.table_name);
  const expectedTables = [
    'student_course_activity',
    'student_content_progress',
    'student_learning_events',
    'student_topic_progress',
  ];

  for (const expected of expectedTables) {
    assert(tableNames.includes(expected), `Table learning.${expected} exists in PostgreSQL`);
  }

  // Verify Columns in student_topic_progress
  const topicColsRes = await db.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'learning' AND table_name = 'student_topic_progress';
  `);
  const topicCols = topicColsRes.rows.map((r) => r.column_name);
  assert(topicCols.includes('user_id'), 'student_topic_progress has user_id');
  assert(topicCols.includes('course_id'), 'student_topic_progress has course_id');
  assert(topicCols.includes('subject_id'), 'student_topic_progress has subject_id');
  assert(topicCols.includes('chapter_id'), 'student_topic_progress has chapter_id');
  assert(topicCols.includes('topic_id'), 'student_topic_progress has topic_id');
  assert(topicCols.includes('status'), 'student_topic_progress has status');
  assert(topicCols.includes('started_at'), 'student_topic_progress has started_at');
  assert(topicCols.includes('completed_at'), 'student_topic_progress has completed_at');
  assert(topicCols.includes('last_activity_at'), 'student_topic_progress has last_activity_at');

  // Verify Columns in student_content_progress
  const contentColsRes = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'learning' AND table_name = 'student_content_progress';
  `);
  const contentCols = contentColsRes.rows.map((r) => r.column_name);
  assert(contentCols.includes('content_type'), 'student_content_progress has content_type');
  assert(contentCols.includes('content_identifier'), 'student_content_progress has content_identifier');
  assert(contentCols.includes('status'), 'student_content_progress has status');

  // Verify Columns in student_learning_events
  const eventColsRes = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'learning' AND table_name = 'student_learning_events';
  `);
  const eventCols = eventColsRes.rows.map((r) => r.column_name);
  assert(eventCols.includes('event_type'), 'student_learning_events has event_type');
  assert(eventCols.includes('event_at'), 'student_learning_events has event_at');
  assert(eventCols.includes('idempotency_key'), 'student_learning_events has idempotency_key');
  assert(eventCols.includes('metadata'), 'student_learning_events has metadata');

  // Verify Columns in student_course_activity
  const actColsRes = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'learning' AND table_name = 'student_course_activity';
  `);
  const actCols = actColsRes.rows.map((r) => r.column_name);
  assert(actCols.includes('last_accessed_subject_id'), 'student_course_activity has last_accessed_subject_id');
  assert(actCols.includes('last_accessed_chapter_id'), 'student_course_activity has last_accessed_chapter_id');
  assert(actCols.includes('last_accessed_topic_id'), 'student_course_activity has last_accessed_topic_id');
  assert(actCols.includes('last_activity_at'), 'student_course_activity has last_activity_at');

  // Verify Indexes
  const idxRes = await db.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'learning';
  `);
  const indexNames = idxRes.rows.map((r) => r.indexname);
  assert(indexNames.includes('idx_topic_progress_user_course'), 'idx_topic_progress_user_course exists');
  assert(indexNames.includes('idx_topic_progress_user_chapter'), 'idx_topic_progress_user_chapter exists');
  assert(indexNames.includes('idx_topic_progress_last_activity'), 'idx_topic_progress_last_activity exists');
  assert(indexNames.includes('idx_content_progress_user_course'), 'idx_content_progress_user_course exists');
  assert(indexNames.includes('idx_content_progress_last_activity'), 'idx_content_progress_last_activity exists');
  assert(indexNames.includes('idx_learning_events_user_course_time'), 'idx_learning_events_user_course_time exists');
  assert(indexNames.includes('idx_learning_events_user_topic'), 'idx_learning_events_user_topic exists');
  assert(indexNames.includes('student_learning_events_idempotency_key_key'), 'student_learning_events_idempotency_key_key exists');

  // Clean initial test state
  await db.query('DELETE FROM learning.student_learning_events WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_topic_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_content_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await db.query('DELETE FROM learning.student_course_activity WHERE user_id IN ($1, $2);', [studentAId, studentBId]);

  // --- PART 3: UNIQUE STUDENT-TOPIC CONSTRAINT ---
  console.log('\n--- 3. Unique Student-Topic Constraint Verification ---');
  await db.query(`
    INSERT INTO learning.student_topic_progress (
      user_id, course_id, subject_id, chapter_id, topic_id, status
    ) VALUES ($1, 1, 1, 1, 1, 'IN_PROGRESS');
  `, [studentAId]);

  let duplicateTopicErrorCaught = false;
  try {
    await db.query(`
      INSERT INTO learning.student_topic_progress (
        user_id, course_id, subject_id, chapter_id, topic_id, status
      ) VALUES ($1, 1, 1, 1, 1, 'COMPLETED');
    `, [studentAId]);
  } catch (err) {
    duplicateTopicErrorCaught = true;
    assert(err.message.includes('unique') || err.message.includes('duplicate') || err.message.includes('uq_student_topic_unique'),
      'Direct duplicate insert correctly rejected by unique constraint uq_student_topic_unique',
      err.message
    );
  }
  assert(duplicateTopicErrorCaught, 'Duplicate topic insert threw unique constraint error');

  // Verify clean upsert via ON CONFLICT (user_id, topic_id)
  await db.query(`
    INSERT INTO learning.student_topic_progress (
      user_id, course_id, subject_id, chapter_id, topic_id, status, completed_at
    ) VALUES ($1, 1, 1, 1, 1, 'COMPLETED', NOW())
    ON CONFLICT (user_id, topic_id) DO UPDATE SET
      status = EXCLUDED.status,
      completed_at = EXCLUDED.completed_at,
      updated_at = NOW();
  `, [studentAId]);

  const topicCountRes = await db.query(
    'SELECT COUNT(*)::int AS cnt, status FROM learning.student_topic_progress WHERE user_id = $1 AND topic_id = 1 GROUP BY status;',
    [studentAId]
  );
  assert(topicCountRes.rows.length === 1 && topicCountRes.rows[0].cnt === 1, 'Upsert preserved single row for student and topic');
  assert(topicCountRes.rows[0].status === 'COMPLETED', 'Upsert successfully updated status to COMPLETED');

  // --- PART 4: UNIQUE STUDENT-CONTENT CONSTRAINT ---
  console.log('\n--- 4. Unique Student-Content Constraint Verification ---');
  await db.query(`
    INSERT INTO learning.student_content_progress (
      user_id, course_id, content_type, content_identifier, status
    ) VALUES ($1, 1, 'VIDEO', '824804225', 'IN_PROGRESS');
  `, [studentAId]);

  let duplicateContentErrorCaught = false;
  try {
    await db.query(`
      INSERT INTO learning.student_content_progress (
        user_id, course_id, content_type, content_identifier, status
      ) VALUES ($1, 1, 'VIDEO', '824804225', 'COMPLETED');
    `, [studentAId]);
  } catch (err) {
    duplicateContentErrorCaught = true;
    assert(err.message.includes('unique') || err.message.includes('duplicate') || err.message.includes('uq_student_content_unique'),
      'Direct duplicate insert correctly rejected by unique constraint uq_student_content_unique',
      err.message
    );
  }
  assert(duplicateContentErrorCaught, 'Duplicate content insert threw unique constraint error');

  // Verify upsert for content
  await db.query(`
    INSERT INTO learning.student_content_progress (
      user_id, course_id, content_type, content_identifier, status, completed_at
    ) VALUES ($1, 1, 'VIDEO', '824804225', 'COMPLETED', NOW())
    ON CONFLICT (user_id, content_type, content_identifier) DO UPDATE SET
      status = EXCLUDED.status,
      completed_at = EXCLUDED.completed_at;
  `, [studentAId]);

  const contentCountRes = await db.query(
    "SELECT COUNT(*)::int AS cnt, status FROM learning.student_content_progress WHERE user_id = $1 AND content_type = 'VIDEO' AND content_identifier = '824804225' GROUP BY status;",
    [studentAId]
  );
  assert(contentCountRes.rows.length === 1 && contentCountRes.rows[0].cnt === 1, 'Upsert preserved single row for student and content');
  assert(contentCountRes.rows[0].status === 'COMPLETED', 'Upsert successfully updated content status to COMPLETED');

  // --- PART 5: CHECK CONSTRAINT STATUS VALIDATION ---
  console.log('\n--- 5. CHECK Constraint Status Validation ---');
  // Invalid topic status
  let invalidTopicStatusCaught = false;
  try {
    await db.query(`
      INSERT INTO learning.student_topic_progress (
        user_id, course_id, subject_id, chapter_id, topic_id, status
      ) VALUES ($1, 1, 1, 1, 2, 'DRAFT');
    `, [studentAId]);
  } catch (err) {
    invalidTopicStatusCaught = true;
    assert(err.message.includes('chk_student_topic_status') || err.message.includes('check constraint'),
      'Invalid status "DRAFT" rejected by chk_student_topic_status',
      err.message
    );
  }
  assert(invalidTopicStatusCaught, 'Database rejected invalid topic status');

  // Invalid content status
  let invalidContentStatusCaught = false;
  try {
    await db.query(`
      INSERT INTO learning.student_content_progress (
        user_id, course_id, content_type, content_identifier, status
      ) VALUES ($1, 1, 'VIDEO', '824804225_2', 'PENDING');
    `, [studentAId]);
  } catch (err) {
    invalidContentStatusCaught = true;
    assert(err.message.includes('chk_student_content_status') || err.message.includes('check constraint'),
      'Invalid content status "PENDING" rejected by chk_student_content_status',
      err.message
    );
  }
  assert(invalidContentStatusCaught, 'Database rejected invalid content status');

  // Invalid content type
  let invalidContentTypeCaught = false;
  try {
    await db.query(`
      INSERT INTO learning.student_content_progress (
        user_id, course_id, content_type, content_identifier, status
      ) VALUES ($1, 1, 'AUDIO', 'audio_123', 'COMPLETED');
    `, [studentAId]);
  } catch (err) {
    invalidContentTypeCaught = true;
    assert(err.message.includes('chk_student_content_type') || err.message.includes('check constraint'),
      'Invalid content type "AUDIO" rejected by chk_student_content_type',
      err.message
    );
  }
  assert(invalidContentTypeCaught, 'Database rejected invalid content type');

  // Invalid event type
  let invalidEventTypeCaught = false;
  try {
    await db.query(`
      INSERT INTO learning.student_learning_events (
        user_id, course_id, event_type
      ) VALUES ($1, 1, 'INVALID_EVENT');
    `, [studentAId]);
  } catch (err) {
    invalidEventTypeCaught = true;
    assert(err.message.includes('chk_learning_event_type') || err.message.includes('check constraint'),
      'Invalid event type "INVALID_EVENT" rejected by chk_learning_event_type',
      err.message
    );
  }
  assert(invalidEventTypeCaught, 'Database rejected invalid event type');

  // --- PART 6: EVENT HISTORY PERSISTENCE (APPEND-ONLY LEDGER) ---
  console.log('\n--- 6. Append-Only Learning Event Ledger Verification ---');
  const validEventTypes = [
    'TOPIC_STARTED',
    'TOPIC_COMPLETED',
    'VIDEO_STARTED',
    'VIDEO_COMPLETED',
    'DOCUMENT_OPENED',
    'DOCUMENT_COMPLETED',
  ];

  for (const evt of validEventTypes) {
    const res = await db.query(`
      INSERT INTO learning.student_learning_events (
        user_id, course_id, event_type, metadata
      ) VALUES ($1, 1, $2, $3) RETURNING id;
    `, [studentAId, evt, JSON.stringify({ verified: true, type: evt })]);
    assert(Boolean(res.rows[0]?.id), `Persisted valid event type ${evt}`);
  }

  const eventsCountRes = await db.query(
    'SELECT COUNT(*)::int AS cnt FROM learning.student_learning_events WHERE user_id = $1;',
    [studentAId]
  );
  assert(eventsCountRes.rows[0].cnt === 6, 'All 6 distinct event types persisted append-only in ledger');

  // --- PART 7: DUPLICATE EVENT IDEMPOTENCY ---
  console.log('\n--- 7. Duplicate Event Idempotency Verification ---');
  const testIdempotencyKey = 'idem_evt_test_uuid_10q_001';

  // First insert with idempotency key
  const firstIdemRes = await db.query(`
    INSERT INTO learning.student_learning_events (
      user_id, course_id, event_type, idempotency_key
    ) VALUES ($1, 1, 'TOPIC_STARTED', $2)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id;
  `, [studentAId, testIdempotencyKey]);
  assert(firstIdemRes.rowCount === 1, 'Initial event with idempotency key inserted successfully');

  // Duplicate insert with exact same idempotency key
  const secondIdemRes = await db.query(`
    INSERT INTO learning.student_learning_events (
      user_id, course_id, event_type, idempotency_key
    ) VALUES ($1, 1, 'TOPIC_STARTED', $2)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id;
  `, [studentAId, testIdempotencyKey]);
  assert(secondIdemRes.rowCount === 0, 'Duplicate event with same idempotency key cleanly ignored (rowCount = 0)');

  // Verify only 1 row exists with this key
  const idemCheck = await db.query(
    'SELECT COUNT(*)::int AS cnt FROM learning.student_learning_events WHERE idempotency_key = $1;',
    [testIdempotencyKey]
  );
  assert(idemCheck.rows[0].cnt === 1, 'Exactly 1 event row exists for the idempotency key');

  // --- PART 8: STUDENT ISOLATION ---
  console.log('\n--- 8. Multi-Tenant Student Isolation Verification ---');
  // Student A has progress on topic 1
  const studentAProgress = await db.query(
    'SELECT * FROM learning.student_topic_progress WHERE user_id = $1;',
    [studentAId]
  );
  assert(studentAProgress.rows.length > 0, `Student A (ID ${studentAId}) has recorded progress`);

  // Student B must have ZERO progress
  const studentBProgress = await db.query(
    'SELECT * FROM learning.student_topic_progress WHERE user_id = $1;',
    [studentBId]
  );
  assert(studentBProgress.rows.length === 0, `Student B (ID ${studentBId}) has 0 progress records (clean isolation)`);

  const studentBEvents = await db.query(
    'SELECT * FROM learning.student_learning_events WHERE user_id = $1;',
    [studentBId]
  );
  assert(studentBEvents.rows.length === 0, `Student B has 0 learning events in ledger`);

  // --- PART 9: ACADEMIC HIERARCHY VALIDATION LAYER ---
  console.log('\n--- 9. Academic Hierarchy Validation Layer ---');
  // Course 1 topics check
  const course1Topics = AcademicHierarchyValidator.getEligibleTopicsForCourse(1);
  assert(course1Topics.length === 8, `Course 1 has 8 eligible topics (found ${course1Topics.length})`);

  // Valid topic in course 1
  const validHierarchy = AcademicHierarchyValidator.validateTopicHierarchy(1, 1);
  assert(validHierarchy.courseId === 1 && validHierarchy.topicId === 1, 'Topic 1 validates successfully for Course 1');
  assert(validHierarchy.subjectId === 1 && validHierarchy.chapterId === 1, 'Topic 1 hierarchy correctly linked to Subject 1, Chapter 1');

  // Topic 9 belongs to Course 2; submitting for Course 1 must fail
  let crossCourseSpoofCaught = false;
  try {
    AcademicHierarchyValidator.validateTopicHierarchy(1, 9);
  } catch (err) {
    crossCourseSpoofCaught = true;
    assert(err.message.includes('Hierarchy mismatch') && err.message.includes('Course #2'),
      'Cross-course topic spoofing rejected with clear mismatch message',
      err.message
    );
  }
  assert(crossCourseSpoofCaught, 'Cross-course topic submission threw validation error');

  // Topic 1 belongs to Course 1; submitting for Course 2 must fail
  let crossCourseSpoof2Caught = false;
  try {
    AcademicHierarchyValidator.validateTopicHierarchy(2, 1);
  } catch (err) {
    crossCourseSpoof2Caught = true;
    assert(err.message.includes('Hierarchy mismatch') && err.message.includes('Course #1'),
      'Cross-course topic submission (Topic 1 under Course 2) rejected',
      err.message
    );
  }
  assert(crossCourseSpoof2Caught, 'Topic 1 under Course 2 threw validation error');

  // Non-existent topic
  let nonExistentTopicCaught = false;
  try {
    AcademicHierarchyValidator.validateTopicHierarchy(1, 99999);
  } catch (err) {
    nonExistentTopicCaught = true;
    assert(err.message.includes('does not exist'), 'Non-existent topic ID rejected', err.message);
  }
  assert(nonExistentTopicCaught, 'Non-existent topic threw validation error');

  // Video validation
  const validVideo = AcademicHierarchyValidator.validateContentIdentifier('VIDEO', '824804225');
  assert(validVideo === true, 'Authoritative video ID "824804225" validated successfully');

  let invalidVideoCaught = false;
  try {
    AcademicHierarchyValidator.validateContentIdentifier('VIDEO', 'non_existent_video_xyz_999');
  } catch (err) {
    invalidVideoCaught = true;
    assert(err.message.includes('does not exist in Video Master'), 'Invalid video identifier rejected', err.message);
  }
  assert(invalidVideoCaught, 'Invalid video identifier threw validation error');

  // Document validation
  const validDoc = AcademicHierarchyValidator.validateContentIdentifier('PDF', '1');
  assert(validDoc === true, 'Authoritative document ID "1" validated successfully');

  let invalidDocCaught = false;
  try {
    AcademicHierarchyValidator.validateContentIdentifier('PDF', 'invalid_doc_path_xyz');
  } catch (err) {
    invalidDocCaught = true;
    assert(err.message.includes('does not exist in Document Master'), 'Invalid document identifier rejected', err.message);
  }
  assert(invalidDocCaught, 'Invalid document identifier threw validation error');

  // --- PART 10: ZERO-TOPIC CHAPTER SAFETY & SAFE PROGRESS AGGREGATION ---
  console.log('\n--- 10. Zero-Topic Chapter Safety & Safe Progress Aggregation ---');

  // Clear student progress for clean aggregation verification
  await db.query('DELETE FROM learning.student_topic_progress WHERE user_id = $1;', [studentAId]);
  await db.query('DELETE FROM learning.student_course_activity WHERE user_id = $1;', [studentAId]);

  // Query baseline summary with 0 topics completed
  const baselineSummary = await LearningProgressService.getStudentCourseProgressSummary(studentAId, 1);
  assert(baselineSummary.courseId === 1, 'Summary has correct courseId 1');
  assert(baselineSummary.totalTopics === 8, `Summary reports 8 total topics for Course 1`);
  assert(baselineSummary.completedTopics === 0, 'Baseline completedTopics is 0');
  assert(baselineSummary.courseCompletionPercentage === 0.0, 'Baseline course completion is exactly 0.0%');
  assert(baselineSummary.completedChapters === 0, 'Baseline completedChapters is 0');
  assert(baselineSummary.completedSubjects === 0, 'Baseline completedSubjects is 0');

  // Inspect Chapter 3 (Physical Chemistry - zero topics in canonical data)
  const chemSubject = baselineSummary.subjects.find((s) => s.subjectName.toLowerCase().includes('chemistry'));
  assert(Boolean(chemSubject), 'Chemistry subject found in summary');
  const ch3 = chemSubject?.chapters.find((ch) => ch.chapterId === 3);
  assert(Boolean(ch3), 'Chapter 3 (Physical Chemistry) found in subject chapters');
  assert(ch3?.totalTopics === 0, 'Chapter 3 has exactly 0 total topics');
  assert(ch3?.completedTopics === 0, 'Chapter 3 has 0 completed topics');
  assert(ch3?.completionPercentage === 0.0, 'Chapter 3 completion percentage is 0.0% (not NaN or null)');
  assert(ch3?.isCompleted === false, 'Zero-topic Chapter 3 is strictly NOT completed (never auto-completed)');

  // Now record completion of Topic 1 (out of 8 in Course 1)
  const recordResult = await LearningProgressService.recordTopicProgress({
    userId: studentAId,
    courseId: 1,
    topicId: 1,
    status: 'COMPLETED',
    idempotencyKey: 'test_record_topic_1',
    skipEnrollmentCheck: true,
  });
  assert(recordResult.success === true, 'Topic 1 recorded as COMPLETED via LearningProgressService');
  assert(recordResult.record.status === 'COMPLETED', 'Service returned completed status');

  // Check activity snapshot updated
  const actSnapshot = await LearningProgressService.getStudentCourseActivity(studentAId, 1);
  assert(Boolean(actSnapshot), 'Course activity snapshot created');
  assert(actSnapshot?.lastAccessedTopicId === 1, 'Snapshot points to last accessed Topic 1');

  // Re-query progress summary: 1 of 8 topics completed = 12.5%
  const updatedSummary = await LearningProgressService.getStudentCourseProgressSummary(studentAId, 1);
  assert(updatedSummary.completedTopics === 1, 'Updated summary shows completedTopics = 1');
  assert(updatedSummary.courseCompletionPercentage === 12.5, `Course completion is exactly 12.5% (got ${updatedSummary.courseCompletionPercentage}%)`);
  assert(!Number.isNaN(updatedSummary.courseCompletionPercentage), 'Course completion is a valid number (not NaN)');

  // Record completion of Topic 2: 2 of 8 topics completed = 25.0%
  await LearningProgressService.recordTopicProgress({
    userId: studentAId,
    courseId: 1,
    topicId: 2,
    status: 'COMPLETED',
    skipEnrollmentCheck: true,
  });
  const summary2 = await LearningProgressService.getStudentCourseProgressSummary(studentAId, 1);
  assert(summary2.completedTopics === 2, 'Updated summary shows completedTopics = 2');
  assert(summary2.courseCompletionPercentage === 25.0, `Course completion is exactly 25.0% (got ${summary2.courseCompletionPercentage}%)`);

  // Verify Student B still has 0%
  const studentBSummary = await LearningProgressService.getStudentCourseProgressSummary(studentBId, 1);
  assert(studentBSummary.completedTopics === 0, 'Student B summary shows 0 completed topics');
  assert(studentBSummary.courseCompletionPercentage === 0.0, 'Student B course completion is strictly 0.0%');

  // --- PART 11: RECONNECTION & PERSISTENCE ACROSS DB LIFECYCLE ---
  console.log('\n--- 11. Reconnection & Persistence Across DB Lifecycle ---');
  // Close database instance via connection layer to flush to disk
  await closeCommerceDb();
  console.log('  ✓ Closed and flushed database instance');

  // Re-open fresh instance
  const reopenedDb = await getCommerceDb();
  console.log('  ✓ Re-opened fresh database instance');

  const recheckProgress = await reopenedDb.query(
    'SELECT COUNT(*)::int AS cnt FROM learning.student_topic_progress WHERE user_id = $1;',
    [studentAId]
  );
  assert(recheckProgress.rows[0].cnt === 2, `Data survived restart: 2 topic progress records found for Student A`);

  const recheckEvents = await reopenedDb.query(
    'SELECT COUNT(*)::int AS cnt FROM learning.student_learning_events WHERE user_id = $1;',
    [studentAId]
  );
  assert(recheckEvents.rows[0].cnt > 0, `Data survived restart: ${recheckEvents.rows[0].cnt} learning events found`);

  // --- PART 12: CLEAN TEST FIXTURE CLEANUP ---
  console.log('\n--- 12. Clean Test Fixture Cleanup ---');
  await reopenedDb.query('DELETE FROM learning.student_learning_events WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await reopenedDb.query('DELETE FROM learning.student_topic_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await reopenedDb.query('DELETE FROM learning.student_content_progress WHERE user_id IN ($1, $2);', [studentAId, studentBId]);
  await reopenedDb.query('DELETE FROM learning.student_course_activity WHERE user_id IN ($1, $2);', [studentAId, studentBId]);

  const verifyClean = await reopenedDb.query(
    'SELECT COUNT(*)::int AS cnt FROM learning.student_topic_progress WHERE user_id IN ($1, $2);',
    [studentAId, studentBId]
  );
  assert(verifyClean.rows[0].cnt === 0, 'Cleaned up all test records from learning tables');

  await closeCommerceDb();

  console.log('\n================================================================');
  console.log(`FEATURE 3.4 STAGE 1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFeature34Tests().catch((err) => {
  console.error('Fatal error during Feature 3.4 test execution:', err);
  process.exit(1);
});
