require('./load-env');
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { getDataDir } = require('../server/paths');

async function countDb(label, dbFile) {
  if (!fs.existsSync(dbFile)) {
    console.log(`${label}: missing (${dbFile})`);
    return null;
  }
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const fileDb = new SQL.Database(fs.readFileSync(dbFile));
  const stmt = fileDb.prepare('SELECT COUNT(*) as c FROM discord_messages');
  stmt.step();
  const c = stmt.getAsObject().c;
  stmt.free();
  console.log(`${label}: ${c} journal rows — ${dbFile}`);
  return c;
}

(async () => {
  await db.initDb();
  const rows = db.prepare(`
    SELECT id, posted_at, substr(content, 1, 60) as preview
    FROM discord_messages ORDER BY posted_at DESC LIMIT 8
  `).all();
  const snowflakes = db.prepare(`SELECT COUNT(*) c FROM discord_messages WHERE id GLOB '[0-9]*'`).get().c;
  const bundled = db.prepare(`SELECT COUNT(*) c FROM discord_messages WHERE id LIKE 'journal-%'`).get().c;
  const local = db.prepare(`SELECT COUNT(*) c FROM discord_messages WHERE id LIKE 'local-%'`).get().c;

  console.log('Active getDataDir():', getDataDir());
  console.log('In-process count:', db.prepare('SELECT COUNT(*) c FROM discord_messages').get().c);
  console.log(`  Discord snowflakes: ${snowflakes}, journal-* bundles: ${bundled}, local-*: ${local}`);
  console.log('Latest entries:');
  for (const r of rows) console.log(`  ${r.id} @ ${r.posted_at} — ${r.preview}`);

  await countDb('On-disk primary', path.join(getDataDir(), 'afs.db'));
  await countDb('videos mirror', path.join(__dirname, '..', 'videos', 'afs', 'data', 'afs.db'));
})();