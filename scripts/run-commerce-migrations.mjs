// ==============================================================================
// 10Q CHALLENGE LMS — COMMERCE MIGRATION RUNNER (POSTGRESQL 16)
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function runMigrations() {
  console.log('=== RUNNING COMMERCE MIGRATIONS ON ISOLATED POSTGRESQL 16 ===\n');

  // Dynamically import PGlite or pg based on env
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = path.join(projectRoot, 'database', 'pg_commerce_dev');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new PGlite(dataDir);

  const migrationDir = path.join(projectRoot, 'migrations', 'commerce');
  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const fullPath = path.join(migrationDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`Executing migration: ${file}...`);
    try {
      await db.exec(sql);
      console.log(`[PASS] ${file} applied successfully.\n`);
    } catch (err) {
      console.error(`[FAIL] Migration ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  // Verify created tables
  const tablesRes = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'commerce' 
    ORDER BY table_name;
  `);

  console.log('Commerce Schema Tables verified in PostgreSQL 16:');
  tablesRes.rows.forEach(r => console.log(`  - commerce.${r.table_name}`));

  console.log('\n=== COMMERCE MIGRATIONS COMPLETE: ALL TABLES & PROCEDURES READY ===');
}

runMigrations().catch(e => {
  console.error('Fatal migration error:', e);
  process.exit(1);
});
