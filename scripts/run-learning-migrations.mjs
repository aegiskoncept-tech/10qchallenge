// ==============================================================================
// 10Q CHALLENGE LMS — LEARNING PROGRESS MIGRATION RUNNER (POSTGRESQL 16)
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export async function runLearningMigrations() {
  console.log('=== RUNNING LEARNING PROGRESS MIGRATIONS ON POSTGRESQL 16 ===\n');

  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = path.join(projectRoot, 'database', 'pg_commerce_dev');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new PGlite(dataDir);

  const migrationDir = path.join(projectRoot, 'migrations', 'learning');
  if (!fs.existsSync(migrationDir)) {
    console.error(`Migration directory not found: ${migrationDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const fullPath = path.join(migrationDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`Executing migration: ${file}...`);
    try {
      await db.exec(sql);
      console.log(`[PASS] ${file} applied successfully.\n`);
    } catch (err) {
      console.error(`[FAIL] Migration ${file} failed:`, err.message);
      await db.close();
      process.exit(1);
    }
  }

  // Verify created tables in learning schema
  const tablesRes = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'learning' 
    ORDER BY table_name;
  `);

  console.log('Learning Schema Tables verified in PostgreSQL 16:');
  tablesRes.rows.forEach((r) => console.log(`  - learning.${r.table_name}`));

  await db.close();
  console.log('\n=== LEARNING MIGRATIONS COMPLETE: ALL TABLES & INDEXES READY ===');
}

// Direct execution guard
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLearningMigrations().catch((e) => {
    console.error('Fatal migration error:', e);
    process.exit(1);
  });
}
