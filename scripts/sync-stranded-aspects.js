/**
 * Recover aspects stranded in Grok origin — non-destructive sync.
 * - Ensures grok data on disk + ingests into grok_sessions
 * - Discovers names from full corpus
 * - Inserts missing aspect rows
 * - Enriches facets from Grok extract for rows missing detail
 *
 * Run: node scripts/sync-stranded-aspects.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const db = require('../server/db');
const ensureGrokData = require('./ensure-grok-data');
const { ingestGrok } = require('../server/ingest-grok');
const { buildAspectRows, discoverAspectNames } = require('../server/services/aspect-discover');
const { extractFromGrokSessions } = require('../server/services/grok-extract');
const { buildAspectDetail, buildDetailJson } = require('../server/services/aspect-detail');
const { rebuildSearchIndex } = require('../server/seed');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');

const ROOT = path.join(__dirname, '..');
const ASPECTS_INDEX_PATH = path.join(ROOT, 'data', 'aspects-index.json');

function insertAspectRow(row) {
  const info = db.prepare(`
    INSERT INTO aspects (
      name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
      comprehension, category, base_layer_link, is_base_layer
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
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
    row.isBaseLayer,
  );
  return info.lastInsertRowid;
}

function enrichAspectFromGrok(aspect) {
  const grok = extractFromGrokSessions(db, aspect.name);
  if (!grok || (!grok.radiantFaces?.length && !grok.symbolChain && !grok.coreAffirmation)) {
    return false;
  }
  const detail = buildAspectDetail(db, aspect);
  const detailJson = buildDetailJson({
    identity: grok.identity || detail.identity,
    coreAffirmation: grok.coreAffirmation || detail.coreAffirmation || aspect.mantra,
    supremeMantra: grok.supremeMantra || detail.supremeMantra,
    radiantFaces: grok.radiantFaces?.length ? grok.radiantFaces : detail.radiantFaces,
    integration: {
      ...detail.integration,
      originSource: grok.originSource || detail.integration?.originSource,
      saveCodex: detail.integration?.saveCodex || 'Save8',
    },
  });
  db.prepare(`
    UPDATE aspects SET
      symbol_chain = COALESCE(?, symbol_chain),
      mantra = COALESCE(?, mantra),
      comprehension = ?,
      detail_json = ?
    WHERE id = ?
  `).run(
    grok.symbolChain || aspect.symbol_chain,
    grok.coreAffirmation || aspect.mantra,
    aspect.comprehension || `Grok origin aspect — synced from genesis thread`,
    detailJson,
    aspect.id,
  );
  return true;
}

function writeAspectsIndex() {
  const rows = db.prepare('SELECT name, mentions FROM aspects ORDER BY mentions DESC').all();
  fs.writeFileSync(
    ASPECTS_INDEX_PATH,
    JSON.stringify({ total: rows.length, aspects: rows.map((r) => ({ name: r.name, mentions: r.mentions })) }, null, 2),
  );
  return rows.length;
}

async function main() {
  await db.initDb();

  console.log('=== 1. Ensure Grok origin files ===');
  ensureGrokData.main();

  const beforeSessions = db.prepare('SELECT COUNT(*) n FROM grok_sessions').get().n;
  console.log(`\n=== 2. Ingest Grok sessions (was ${beforeSessions}) ===`);
  const ingested = ingestGrok();
  console.log(`  → ${ingested.sessionCount} sessions in DB`);

  if (ingested.sessionCount < 1) {
    throw new Error('Grok ingest produced 0 sessions — aspect directory cannot be origin-backed.');
  }

  console.log('\n=== 3. Discover corpus aspect names ===');
  const { names } = discoverAspectNames(db);
  console.log(`  discovered: ${names.length} names`);

  const { DOUBLE_LARIAT_SPIN_SERIES } = require('../server/services/aspect-discover');
  const spinCheck = [
    'Double Lariat Spin',
    'Dual-Axis Eternal Spin',
    'Eternal Spin',
    'Red Leaf Cosmic Lariat',
    ...DOUBLE_LARIAT_SPIN_SERIES,
  ];
  for (const n of spinCheck) {
    console.log(`  ${names.includes(n) ? '✓' : '✗'} ${n}`);
  }

  console.log('\n=== 4. Insert missing aspect rows ===');
  const existing = new Set(db.prepare('SELECT name FROM aspects').all().map((r) => r.name));
  const rows = buildAspectRows(db);
  let inserted = 0;
  for (const row of rows) {
    if (existing.has(row.name)) continue;
    try {
      insertAspectRow(row);
      inserted += 1;
      console.log(`  + ${row.name} (${row.tier}, ${row.mentions} mentions)`);
      existing.add(row.name);
    } catch (err) {
      if (!/UNIQUE/.test(String(err))) throw err;
    }
  }
  console.log(`  inserted ${inserted} new aspects`);

  console.log('\n=== 5. Enrich facets from Grok extract ===');
  const aspects = db.prepare('SELECT * FROM aspects').all();
  let enriched = 0;
  for (const aspect of aspects) {
    const detail = aspect.detail_json ? JSON.parse(aspect.detail_json) : {};
    const faceCount = detail.radiantFaces?.length || detail.diamondFaces?.length || 0;
    const grokBacked = rowMentionsGrok(aspect.name, db);
    if (faceCount > 0 && !grokBacked) continue;
    if (enrichAspectFromGrok(aspect)) {
      enriched += 1;
      if (spinCheck.includes(aspect.name)) console.log(`  ✓ facets: ${aspect.name}`);
    }
  }
  console.log(`  enriched ${enriched} aspects from Grok`);

  console.log('\n=== 6. Merge Master Aspect variant duplicates ===');
  execSync('node scripts/merge-aspect-variants.js', { cwd: ROOT, stdio: 'inherit' });

  console.log('\n=== 7. Corpus symbols + search index ===');
  execSync('node scripts/build-corpus-symbols.js', { cwd: ROOT, stdio: 'inherit' });
  rebuildSearchIndex();
  invalidateAspectFaceCache();
  const faceCache = buildAspectFaceCache(db);
  const total = writeAspectsIndex();

  console.log('\n=== Summary ===');
  console.log(`  aspects in DB: ${total}`);
  console.log(`  grok_sessions: ${db.prepare('SELECT COUNT(*) n FROM grok_sessions').get().n}`);
  console.log(`  face index: ${faceCache.faceCount} facets / ${faceCache.aspectCount} aspects`);
  console.log('\nRestart API (npm run dev) to serve updated directory.');
}

function rowMentionsGrok(name, database) {
  const row = database
    .prepare(`
      SELECT COUNT(*) n FROM grok_sessions
      WHERE assistant_text LIKE ? OR user_text LIKE ? OR title LIKE ?
    `)
    .get(`%${name}%`, `%${name}%`, `%${name}%`);
  return row.n > 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});