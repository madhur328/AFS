/**
 * Full aspect directory rebuild — Grok-origin only, Save8 synthesis grades, alive first-person voice.
 *
 * Methodology:
 * - Discover aspects only from Grok origin sessions + canonical journals
 * - EOT / DCS / RCS / RDTQ enrichment via bulk-ingest (diamond+ facets only)
 * - Voice-first: radiant-face explanations speak as "I" — never mechanistic "This facet"
 * - EOT meta-routing: entryTool EOT + routedTool (EOT|DCS|RCS|RDTQ) sets synthesis grade
 * - Canonical alias merge (e.g. Michelangelo variants → Red Leaf Digital Michelangelo)
 * - Purge non-origin rows + strip template facets; rebuild synergies + face index
 *
 * Run: node scripts/rebuild-aspects-from-origin.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const db = require('../server/db');
const { ingestGrok } = require('../server/ingest-grok');
const { ingestShare3 } = require('./ingest-share3');
const { buildAspectRows } = require('../server/services/aspect-discover');
const { rebuildSearchIndex } = require('../server/seed');
const { ensureApril1JournalEntries, APRIL1_ENTRIES } = require('../server/journal-april1-entries');
const { insertLocalJournalEntry, ensureDiscordSchema } = require('../server/discord');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');

const ROOT = path.join(__dirname, '..');
const ASPECTS_INDEX_PATH = path.join(ROOT, 'data', 'aspects-index.json');

function ensureJournals() {
  ensureApril1JournalEntries(db, { insertLocalJournalEntry, ensureDiscordSchema });
  console.log(`Journal entries: ${APRIL1_ENTRIES.length} canonical April 1 entries ensured`);
}

function clearAspects() {
  db.prepare('DELETE FROM synergies').run();
  db.prepare('DELETE FROM search_index WHERE entity_type = ?').run('aspect');
  invalidateAspectFaceCache();
  const before = db.prepare('SELECT COUNT(*) as c FROM aspects').get().c;
  db.prepare('DELETE FROM aspects').run();
  console.log(`Deleted ${before} aspects (synergies + aspect search index cleared)`);
}

function insertAspectRows(rows) {
  const insert = db.prepare(`
    INSERT INTO aspects (
      name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
      comprehension, category, base_layer_link, is_base_layer
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);

  let inserted = 0;
  for (const row of rows) {
    try {
      insert.run(
        row.name,
        row.symbolChain,
        row.mantra,
        row.tier,
        row.potential,
        row.mentions,
        row.proficiency,
        row.comprehension,
        row.category,
        row.baseLayerLink,
        row.isBaseLayer
      );
      inserted += 1;
    } catch (err) {
      if (!/UNIQUE/.test(String(err))) throw err;
    }
  }
  return inserted;
}

function writeAspectsIndex(rows) {
  const aspects = rows
    .map((r) => ({ name: r.name, mentions: r.mentions }))
    .sort((a, b) => b.mentions - a.mentions);
  fs.writeFileSync(ASPECTS_INDEX_PATH, JSON.stringify({ total: aspects.length, aspects }, null, 2));
  console.log(`Wrote ${ASPECTS_INDEX_PATH} (${aspects.length} aspects)`);
}

function runScript(rel) {
  execSync(`node ${rel}`, { cwd: ROOT, stdio: 'inherit' });
}

function printSummary(rows) {
  const byCat = {};
  for (const r of rows) byCat[r.category] = (byCat[r.category] || 0) + 1;
  console.log('\nRebuild summary:');
  console.log(`  total discovered: ${rows.length}`);
  console.log(`  categories: ${JSON.stringify(byCat)}`);
  console.log(
    `  top mentions: ${rows
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 8)
      .map((r) => `${r.name}(${r.mentions})`)
      .join(', ')}`
  );
}

async function main() {
  await db.initDb();

  console.log('=== Step 0: Ensure Grok origin data on disk ===');
  require('./ensure-grok-data').main();

  console.log('=== Step 1: Ingest Grok origin conversations ===');
  const grok = ingestGrok();
  if (!grok.sessionCount) {
    throw new Error('Grok ingest failed — 0 sessions. Run node scripts/ensure-grok-data.js');
  }
  console.log(`  genesis: ${grok.sessionCount} sessions`);
  const share3 = ingestShare3();
  console.log(`  share-3: ${share3.sessionCount} sessions`);

  console.log('\n=== Step 2: Ensure journal corpus ===');
  ensureJournals();

  console.log('\n=== Step 3: Clear aspect directory ===');
  clearAspects();

  console.log('\n=== Step 4: Discover + insert from Grok + journals ===');
  const rows = buildAspectRows(db);
  const inserted = insertAspectRows(rows);
  console.log(`Inserted ${inserted} aspects`);

  console.log('\n=== Step 4b: Merge canonical alias duplicates ===');
  runScript('scripts/merge-canonical-aspects.js');

  console.log('\n=== Step 5: Build voice-first corpus symbols ===');
  runScript('scripts/build-corpus-symbols.js');

  console.log('\n=== Step 6: Bulk origin enrichment (EOT / Red Leaf / guardians) ===');
  runScript('scripts/bulk-ingest-origins.js');

  console.log('\n=== Step 7: Fix symbols + detail_json from corpus ===');
  runScript('scripts/fix-symbols.js');

  console.log('\n=== Step 7b: Seal canonical pinnacle aspects (RDTQ / DCS / RCS) ===');
  runScript('scripts/apply-canonical-pinnacles.js');

  console.log('\n=== Step 7c: Apply EOT meta-routing (entry → routed tool) ===');
  runScript('scripts/apply-eot-routing.js');

  console.log('\n=== Step 8: Sync tiers ===');
  runScript('scripts/sync-aspect-tiers.js');

  console.log('\n=== Step 9: Enrich remaining generic + purge junk dupes ===');
  runScript('scripts/enrich-generic-aspects.js');

  console.log('\n=== Step 10: Rebuild synergies from Grok + codex ===');
  runScript('scripts/rebuild-synergies.js');

  console.log('\n=== Step 11: Purge non-origin + strip template facets ===');
  runScript('scripts/purge-non-origin-aspects.js');

  console.log('\n=== Step 12: Repair zero-facet diamond+ aspects ===');
  runScript('scripts/fix-zero-facets.js');

  console.log('\n=== Step 13: Humanize all radiant-face voice (I, not This facet) ===');
  runScript('scripts/humanize-aspect-voice.js');

  await db.reloadFromDisk();
  console.log('\n=== Reloaded database from disk after child scripts ===');

  const finalRows = db.prepare('SELECT name, mentions FROM aspects ORDER BY mentions DESC').all();
  writeAspectsIndex(finalRows.map((r) => ({ name: r.name, mentions: r.mentions })));
  rebuildSearchIndex();

  const faceCache = buildAspectFaceCache(db);
  const final = db.prepare('SELECT COUNT(*) as c FROM aspects').get().c;
  const mechanistic = db
    .prepare('SELECT detail_json FROM aspects WHERE detail_json LIKE ?')
    .all('%This facet%')
    .length;

  printSummary(rows);
  console.log(`\nFace index: ${faceCache.faceCount} facets across ${faceCache.aspectCount} aspects (diamond+ only).`);
  console.log(`Mechanistic "This facet" lines in DB: ${mechanistic}`);
  console.log(`Done. ${final} aspects in database. Restart API to serve fresh data.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});