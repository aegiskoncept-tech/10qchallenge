const fs = require('fs');
const path = require('path');

function generateSqlMigration() {
  console.log('=== GENERATING POSTGRESQL MIGRATION SCRIPTS FROM JSON DATA ===');

  const exams = JSON.parse(fs.readFileSync('data/exams.json', 'utf8'));
  const subjects = JSON.parse(fs.readFileSync('data/subjects.json', 'utf8'));
  const courses = JSON.parse(fs.readFileSync('data/courses.json', 'utf8'));
  const chapters = JSON.parse(fs.readFileSync('data/chapters.json', 'utf8'));
  const topics = JSON.parse(fs.readFileSync('data/topics.json', 'utf8'));
  const questions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

  let sql = `-- ==============================================================================
-- 10Q CHALLENGE LMS — POSTGRESQL DATA SEED FROM CANONICAL JSON STORAGE
-- Generated: ${new Date().toISOString()}
-- Preserves Exact Primary Keys (IDs), Foreign Keys & Academic Relationships
-- ==============================================================================

BEGIN;

-- 1. EXAMS (${exams.length} records)
`;

  exams.forEach(e => {
    const escName = (e.examName || '').replace(/'/g, "''");
    const escSlug = (e.slug || '').replace(/'/g, "''");
    const escDesc = (e.description || '').replace(/'/g, "''");
    sql += `INSERT INTO "Exam" ("id", "examName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (${e.id}, '${escName}', '${escSlug}', '${escDesc}', ${e.displayIndex || 1}, ${e.isActive !== false}, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "examName" = EXCLUDED."examName", "slug" = EXCLUDED."slug";\n`;
  });

  sql += `\n-- 2. SUBJECTS (${subjects.length} records)\n`;
  subjects.forEach(s => {
    const escCode = (s.subjectCode || '').replace(/'/g, "''");
    const escName = (s.subjectName || '').replace(/'/g, "''");
    const escSlug = (s.slug || '').replace(/'/g, "''");
    const escDesc = (s.description || '').replace(/'/g, "''");
    sql += `INSERT INTO "Subject" ("id", "subjectCode", "subjectName", "slug", "description", "displayIndex", "isActive", "createdAt", "updatedAt")
VALUES (${s.id}, '${escCode}', '${escName}', '${escSlug}', '${escDesc}', ${s.displayIndex || 1}, ${s.isActive !== false}, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "subjectName" = EXCLUDED."subjectName", "slug" = EXCLUDED."slug";\n`;
  });

  sql += `\n-- 3. COURSES (${courses.length} records)\n`;
  courses.forEach(c => {
    // Map exam string to examId
    let examId = null;
    if (c.exam) {
      const match = exams.find(e => e.examName?.toLowerCase() === c.exam?.toLowerCase() || e.slug?.toLowerCase() === c.exam?.toLowerCase());
      if (match) examId = match.id;
    }
    const escTitle = (c.title || '').replace(/'/g, "''");
    const escSlug = (c.slug || '').replace(/'/g, "''");
    const escShort = (c.shortDescription || '').replace(/'/g, "''");
    const escDesc = (c.description || '').replace(/'/g, "''");
    const origPrice = parseFloat(c.originalPrice || 0) || 0;
    const discPrice = parseFloat(c.discountedPrice || c.price || 0) || 0;
    const enrolled = parseInt(c.enrolledStudent || 0, 10) || 0;
    const escImg = (c.image || '').replace(/'/g, "''");
    const escBanner = (c.bannerImage || '').replace(/'/g, "''");
    const escAltImg = (c.altCourseImage || '').replace(/'/g, "''");
    const escAltBanner = (c.altBannerImage || '').replace(/'/g, "''");
    const escSched = (c.scheduleFile || '').replace(/'/g, "''");
    const escMetaT = (c.metaTitle || '').replace(/'/g, "''");
    const escMetaD = (c.metaDescription || '').replace(/'/g, "''");
    const escLink = (c.courseLink || '').replace(/'/g, "''");
    const escDiscount = (c.discount || '').replace(/'/g, "''");
    const escExpiry = (c.expiryDate || '').replace(/'/g, "''");
    const dispIdx = parseInt(c.displayIndex || 1, 10) || 1;
    const escDetails = (c.additionalDetails || '').replace(/'/g, "''");
    const rating = parseFloat(c.rating || 4.9) || 4.9;
    const reviews = parseInt(c.reviewsCount || 0, 10) || 0;
    const escMentor = (c.mentor || '').replace(/'/g, "''");
    const escCreatedBy = (c.createdBy || 'Admin').replace(/'/g, "''");
    const escUpdatedBy = (c.updatedBy || 'Admin').replace(/'/g, "''");

    sql += `INSERT INTO "Course" ("id", "examId", "title", "slug", "shortDescription", "description", "originalPrice", "discountedPrice", "discountString", "expiryDate", "enrolledStudent", "displayIndex", "additionalDetails", "image", "bannerImage", "altCourseImage", "altBannerImage", "scheduleFile", "metaTitle", "metaDescription", "courseLink", "isShowInIndex", "isActive", "isShowInMentorship", "isShowInTestSeries", "rating", "reviewsCount", "mentor", "createdBy", "updatedBy", "createdAt", "updatedAt")
VALUES (${c.id}, ${examId ? examId : 'NULL'}, '${escTitle}', '${escSlug}', '${escShort}', '${escDesc}', ${origPrice}, ${discPrice}, '${escDiscount}', '${escExpiry}', ${enrolled}, ${dispIdx}, '${escDetails}', '${escImg}', '${escBanner}', '${escAltImg}', '${escAltBanner}', '${escSched}', '${escMetaT}', '${escMetaD}', '${escLink}', ${c.isShowInIndex !== false}, ${c.isActive !== false}, ${c.isShowInMentorship === true}, ${c.isShowInTestSeries === true}, ${rating}, ${reviews}, '${escMentor}', '${escCreatedBy}', '${escUpdatedBy}', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "title" = EXCLUDED."title", "slug" = EXCLUDED."slug";\n`;
  });

  sql += `\n-- 4. CHAPTERS (${chapters.length} records)\n`;
  chapters.forEach(ch => {
    const escName = (ch.chapterName || '').replace(/'/g, "''");
    const escCode = (ch.chapterCode || '').replace(/'/g, "''");
    const escSlug = (ch.slug || '').replace(/'/g, "''");
    const escDesc = (ch.description || '').replace(/'/g, "''");
    sql += `INSERT INTO "Chapter" ("id", "courseId", "subjectId", "chapterName", "chapterCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (${ch.id}, ${ch.courseId}, ${ch.subjectId}, '${escName}', '${escCode}', '${escSlug}', '${escDesc}', ${ch.displayOrder || 1}, ${ch.isActive !== false}, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "chapterName" = EXCLUDED."chapterName", "slug" = EXCLUDED."slug";\n`;
  });

  sql += `\n-- 5. TOPICS (${topics.length} records)\n`;
  topics.forEach(t => {
    const escName = (t.topicName || '').replace(/'/g, "''");
    const escCode = (t.topicCode || '').replace(/'/g, "''");
    const escSlug = (t.slug || '').replace(/'/g, "''");
    const escDesc = (t.description || '').replace(/'/g, "''");
    sql += `INSERT INTO "Topic" ("id", "chapterId", "courseId", "subjectId", "topicName", "topicCode", "slug", "description", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES (${t.id}, ${t.chapterId}, ${t.courseId}, ${t.subjectId}, '${escName}', '${escCode}', '${escSlug}', '${escDesc}', ${t.displayOrder || 1}, ${t.isActive !== false}, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "topicName" = EXCLUDED."topicName", "slug" = EXCLUDED."slug";\n`;
  });

  sql += `\n-- 6. QUESTIONS (${questions.length} records)\n`;
  questions.forEach(q => {
    const escContent = (q.questionContent || '').replace(/'/g, "''");
    const escA = (q.optionA || '').replace(/'/g, "''");
    const escB = (q.optionB || '').replace(/'/g, "''");
    const escC = (q.optionC || '').replace(/'/g, "''");
    const escD = (q.optionD || '').replace(/'/g, "''");
    const escCorrect = (q.correctOption || '').replace(/'/g, "''");
    const escExpl = (q.explanation || '').replace(/'/g, "''");
    const qType = (q.questionType || 'objective').toUpperCase() === 'NUMERICAL' ? 'NUMERICAL' : 'OBJECTIVE';
    const numAns = q.numericalAnswer ? parseFloat(q.numericalAnswer) : 'NULL';

    sql += `INSERT INTO "Question" ("id", "subjectId", "chapterId", "questionType", "questionContent", "optionA", "optionB", "optionC", "optionD", "correctOption", "numericalAnswer", "explanation", "difficulty", "orderNumber", "isActive", "createdAt", "updatedAt")
VALUES (${q.id}, ${q.subjectId}, ${q.chapterId}, '${qType}', '${escContent}', '${escA}', '${escB}', '${escC}', '${escD}', '${escCorrect}', ${numAns}, '${escExpl}', 'MEDIUM', ${q.orderNumber || 1}, ${q.isActive !== false}, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "questionContent" = EXCLUDED."questionContent";\n`;
  });

  sql += `\n-- Reset sequence counters to max IDs to allow future auto-increments
SELECT setval(pg_get_serial_sequence('"Exam"', 'id'), coalesce(max(id), 1)) FROM "Exam";
SELECT setval(pg_get_serial_sequence('"Subject"', 'id'), coalesce(max(id), 1)) FROM "Subject";
SELECT setval(pg_get_serial_sequence('"Course"', 'id'), coalesce(max(id), 1)) FROM "Course";
SELECT setval(pg_get_serial_sequence('"Chapter"', 'id'), coalesce(max(id), 1)) FROM "Chapter";
SELECT setval(pg_get_serial_sequence('"Topic"', 'id'), coalesce(max(id), 1)) FROM "Topic";
SELECT setval(pg_get_serial_sequence('"Question"', 'id'), coalesce(max(id), 1)) FROM "Question";

COMMIT;
`;

  const outPath = path.join('database', '10QChallenge_PostgreSql_DataSeed.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log('Successfully generated SQL Data Seed file at:', outPath);
  console.log('Total SQL characters written:', sql.length);
}

generateSqlMigration();
