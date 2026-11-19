const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('database/10q_auth_dev.db', { readOnly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log('Tables in 10q_auth_dev.db:');
for (const t of tables) {
  const row = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get();
  console.log(`  - ${t.name}: ${row.c} rows`);
}
