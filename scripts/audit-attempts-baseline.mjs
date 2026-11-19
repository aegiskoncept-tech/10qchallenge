import fs from 'fs';

const raw = fs.readFileSync('data/test-attempts.json', 'utf8');
const attempts = JSON.parse(raw);

console.log('=== TEST ATTEMPTS BASELINE (READ-ONLY) ===');
console.log('Total attempts:', attempts.length);

attempts.forEach((a, i) => {
  console.log(`[${i + 1}] ID: ${a.id}`);
  console.log(`    Student: ${a.studentId} (${a.studentName} <${a.studentEmail}>)`);
  console.log(`    Paper: #${a.paperId} - "${a.paperTitle}" (${a.examTag})`);
  console.log(`    Status: ${a.status} | Started: ${a.startedAt} | Expires: ${a.expiresAt}`);
  console.log(`    Responses Count: ${Object.keys(a.responses || {}).length}`);
  console.log(`    Result Evaluated: ${Boolean(a.result)} ${a.result ? `(Score: ${a.result.finalScore}/${a.result.maximumMarks}, Accuracy: ${a.result.accuracy}%)` : ''}`);
});
