import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';

async function checkDatabaseHealth() {
  console.log('=== READ-ONLY DATABASE HEALTH & INTEGRITY AUDIT ===\n');

  const dbDir = path.resolve('database/pg_commerce_dev');
  if (!fs.existsSync(dbDir)) {
    console.error('ERROR: database/pg_commerce_dev directory does not exist.');
    process.exit(1);
  }

  const pidFile = path.join(dbDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch (e) {}
  }

  const db = new PGlite(dbDir);

  // 1. Connection check
  const ping = await db.query('SELECT 1 as connected;');
  console.log('1. Connection Status:');
  console.log(`   - Connected: ${ping.rows[0]?.connected === 1 ? 'YES (Active)' : 'NO'}`);

  // 2. Schema check
  const schemas = await db.query(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name IN ('commerce', 'learning', 'public')
    ORDER BY schema_name;
  `);
  console.log('\n2. Schemas Present:');
  schemas.rows.forEach(s => console.log(`   - ${s.schema_name}`));

  // 3. Tables check
  const tables = await db.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('commerce', 'learning')
    ORDER BY table_schema, table_name;
  `);
  console.log('\n3. Tables Inventory:');
  for (const t of tables.rows) {
    const countRes = await db.query(`SELECT COUNT(*) as cnt FROM "${t.table_schema}"."${t.table_name}";`);
    console.log(`   - ${t.table_schema}.${t.table_name} (${countRes.rows[0].cnt} rows)`);
  }

  // 4. Stored Procedures
  const funcs = await db.query(`
    SELECT routine_schema, routine_name 
    FROM information_schema.routines 
    WHERE routine_schema IN ('commerce', 'learning')
    ORDER BY routine_name;
  `);
  console.log('\n4. Stored Procedures / Functions:');
  funcs.rows.forEach(f => console.log(`   - ${f.routine_schema}.${f.routine_name}()`));

  // 5. Constraints & Foreign Keys
  const constraints = await db.query(`
    SELECT tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema IN ('commerce', 'learning')
    ORDER BY tc.table_schema, tc.table_name, tc.constraint_name;
  `);
  console.log('\n5. Constraints & Referential Integrity:');
  constraints.rows.forEach(c => {
    console.log(`   - [${c.constraint_type}] ${c.table_schema}.${c.table_name} -> ${c.constraint_name}`);
  });

  // 6. Migrations Inventory
  console.log('\n6. Migration Files on Disk:');
  const comMigrations = fs.readdirSync(path.resolve('migrations/commerce')).sort();
  comMigrations.forEach(m => console.log(`   - commerce: ${m}`));
  const lrnMigrations = fs.readdirSync(path.resolve('migrations/learning')).sort();
  lrnMigrations.forEach(m => console.log(`   - learning: ${m}`));

  await db.close();
  console.log('\n=== AUDIT COMPLETE: PGLITE READ-ONLY CHECK SUCCESSFUL ===');
}

checkDatabaseHealth().catch(err => {
  console.error('Health audit error:', err);
  process.exit(1);
});
