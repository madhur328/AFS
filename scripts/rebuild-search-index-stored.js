require('./load-env');
const db = require('../server/db');
const { rebuildSearchIndexFromStored } = require('../server/seed');

async function main() {
  await db.initDb();
  console.log('Rebuilding search index from stored detail_json (lightweight)...');
  rebuildSearchIndexFromStored();
  const si = db.prepare('SELECT COUNT(*) as c FROM search_index').get().c;
  const siAspect = db.prepare("SELECT COUNT(*) as c FROM search_index WHERE entity_type = 'aspect'").get().c;
  console.log(`Done. search_index: ${si} rows (${siAspect} aspect rows)`);
}

main().catch((e) => { console.error(e); process.exit(1); });