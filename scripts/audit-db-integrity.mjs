import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';

async function audit() {
  const dbDir = path.resolve('database/pg_commerce_dev');
  const pidFile = path.join(dbDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch (e) {}
  }
  const db = new PGlite(dbDir);

  const tables = await db.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name;
  `);

  console.log('--- Database Schemas & Tables ---');
  for (const row of tables.rows) {
    const qName = `"${row.table_schema}"."${row.table_name}"`;
    try {
      const countRes = await db.query(`SELECT COUNT(*) as count FROM ${qName};`);
      console.log(`${row.table_schema.padEnd(12)} | ${row.table_name.padEnd(35)} | ${countRes.rows[0].count} rows`);
    } catch (err) {
      console.log(`${row.table_schema.padEnd(12)} | ${row.table_name.padEnd(35)} | Error: ${err.message}`);
    }
  }

  // Let's also inspect sample rows from commerce.enrollments and learning tables
  console.log('\n--- Sample Records: commerce.enrollments ---');
  const enrollments = await db.query(`SELECT * FROM commerce.enrollments LIMIT 10;`);
  console.log(JSON.stringify(enrollments.rows, null, 2));

  console.log('\n--- Sample Records: learning.student_learning_events ---');
  const events = await db.query(`SELECT * FROM learning.student_learning_events LIMIT 10;`);
  console.log(JSON.stringify(events.rows, null, 2));

  await db.close();
}

audit().catch(console.error);
