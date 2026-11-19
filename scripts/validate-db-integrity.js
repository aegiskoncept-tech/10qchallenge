const fs = require('fs');
const path = require('path');

function validateIntegrity() {
  console.log('=== DATA INTEGRITY & MIGRATION VALIDATION AUDIT ===\n');

  const exams = JSON.parse(fs.readFileSync('data/exams.json', 'utf8'));
  const subjects = JSON.parse(fs.readFileSync('data/subjects.json', 'utf8'));
  const courses = JSON.parse(fs.readFileSync('data/courses.json', 'utf8'));
  const chapters = JSON.parse(fs.readFileSync('data/chapters.json', 'utf8'));
  const topics = JSON.parse(fs.readFileSync('data/topics.json', 'utf8'));
  const questions = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));

  const seedSql = fs.readFileSync('database/10QChallenge_PostgreSql_DataSeed.sql', 'utf8');

  let pass = true;
  let checks = 0;

  function assert(cond, msg) {
    checks++;
    if (cond) {
      console.log(`[PASS] ${msg}`);
    } else {
      pass = false;
      console.error(`[FAIL] ${msg}`);
    }
  }

  // 1. Check all Exam IDs in SQL seed
  exams.forEach(e => {
    assert(seedSql.includes(`VALUES (${e.id},`), `Exam ID ${e.id} (${e.examName}) present in migration`);
  });

  // 2. Check all Subject IDs in SQL seed
  subjects.forEach(s => {
    assert(seedSql.includes(`VALUES (${s.id},`), `Subject ID ${s.id} (${s.subjectName}) present in migration`);
  });

  // 3. Check all Course IDs and essential fields in SQL seed
  courses.forEach(c => {
    assert(seedSql.includes(`VALUES (${c.id},`), `Course ID ${c.id} (${c.title.substring(0, 20)}...) present in migration`);
    assert(seedSql.includes(`'${c.slug}'`), `Course ID ${c.id} slug '${c.slug}' preserved in migration`);
    assert(seedSql.includes(c.altCourseImage.replace(/'/g, "''")), `Course ID ${c.id} altCourseImage preserved`);
    assert(seedSql.includes(c.altBannerImage.replace(/'/g, "''")), `Course ID ${c.id} altBannerImage preserved`);
    assert(seedSql.includes(c.scheduleFile), `Course ID ${c.id} scheduleFile '${c.scheduleFile}' preserved`);
    assert(seedSql.includes(c.expiryDate), `Course ID ${c.id} expiryDate '${c.expiryDate}' preserved`);
    assert(seedSql.includes(`'${c.discount}'`), `Course ID ${c.id} discount '${c.discount}' preserved`);
    assert(seedSql.includes(c.metaTitle.replace(/'/g, "''")), `Course ID ${c.id} metaTitle preserved`);
    assert(seedSql.includes(c.metaDescription.replace(/'/g, "''")), `Course ID ${c.id} metaDescription preserved`);
  });

  // 4. Check all Chapter IDs in SQL seed
  chapters.forEach(ch => {
    assert(seedSql.includes(`VALUES (${ch.id}, ${ch.courseId}, ${ch.subjectId}`), `Chapter ID ${ch.id} (Course: ${ch.courseId}, Subject: ${ch.subjectId}) present in migration`);
  });

  // 5. Check all Topic IDs in SQL seed
  topics.forEach(t => {
    assert(seedSql.includes(`VALUES (${t.id}, ${t.chapterId}, ${t.courseId}, ${t.subjectId}`), `Topic ID ${t.id} (Chapter: ${t.chapterId}) present in migration`);
  });

  // 6. Check all Question IDs in SQL seed
  questions.forEach(q => {
    assert(seedSql.includes(`VALUES (${q.id}, ${q.subjectId}, ${q.chapterId}`), `Question ID ${q.id} (Subject: ${q.subjectId}, Chapter: ${q.chapterId}) present in migration`);
  });

  // 7. Check KaTeX LaTeX formula retention
  questions.forEach(q => {
    if (q.questionContent.includes('\\')) {
      assert(seedSql.includes(q.questionContent.replace(/'/g, "''")), `Question ID ${q.id} mathematical formula preserved without corruption`);
    }
  });

  console.log(`\nINTEGRITY AUDIT COMPLETE: ${checks} checks evaluated. Result: ${pass ? '100% VERIFIED' : 'FAILED'}`);
}

validateIntegrity();
