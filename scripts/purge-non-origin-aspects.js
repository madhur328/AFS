/**
 * Remove aspects with no Grok-origin backing and strip hallucinated template diamond facets.
 * Run: node scripts/purge-non-origin-aspects.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { rebuildSearchIndex } = require('../server/seed');
const {
  countMentions,
  discoverAspectNames,
  GUARDIAN_IDENTITIES,
  CORE_ASPECTS,
  SHARE3_ASPECTS,
} = require('../server/services/aspect-discover');
const { buildGrokOriginSymbolMap, isGenericRadiantFaces } = require('../server/services/grok-extract');
const { getBaseLayerSlots, getBaseAspectMeta } = require('../server/base-layer');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');

const ROOT = path.join(__dirname, '..');
const ASPECTS_INDEX_PATH = path.join(ROOT, 'data', 'aspects-index.json');
const DRY_RUN = process.argv.includes('--dry-run');

function parseDetail(aspect) {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

function buildCanonSet() {
  const canon = new Set([
    ...GUARDIAN_IDENTITIES,
    ...CORE_ASPECTS,
    ...SHARE3_ASPECTS,
    ...getBaseLayerSlots().map((s) => s.name),
    ...Object.keys(getBaseAspectMeta()),
  ]);
  return canon;
}

function collectGrokTexts(db) {
  const sessions = db.prepare(`
    SELECT assistant_text, user_text FROM grok_sessions
    WHERE assistant_text IS NOT NULL OR user_text IS NOT NULL
  `).all();
  return sessions.flatMap((s) => [s.assistant_text, s.user_text].filter(Boolean));
}

function findNonOriginAspects(db, grokTexts, grokMap, canon) {
  const aspects = db.prepare('SELECT id, name FROM aspects').all();
  const toDelete = [];

  for (const aspect of aspects) {
    if (canon.has(aspect.name)) continue;
    const grokMentions = countMentions(aspect.name, grokTexts);
    const inMap = Boolean(grokMap[aspect.name]);
    if (grokMentions > 0 || inMap) continue;
    toDelete.push(aspect);
  }

  return toDelete;
}

function deleteAspect(db, aspect) {
  const name = aspect.name;
  db.prepare('DELETE FROM synergies WHERE aspect_a = ? OR aspect_b = ?').run(name, name);
  db.prepare('DELETE FROM visualizations WHERE aspect_link = ?').run(name);

  const fusions = db.prepare('SELECT id, inputs_json, output_aspect FROM alchemy_fusions').all();
  for (const f of fusions) {
    const inputs = JSON.parse(f.inputs_json || '[]');
    if (f.output_aspect === name || inputs.includes(name)) {
      db.prepare('DELETE FROM alchemy_fusions WHERE id = ?').run(f.id);
    }
  }

  const insights = db.prepare('SELECT id, aspect_links_json FROM insights').all();
  for (const row of insights) {
    const links = JSON.parse(row.aspect_links_json || '[]');
    if (!links.includes(name)) continue;
    const next = links.filter((n) => n !== name);
    db.prepare('UPDATE insights SET aspect_links_json = ? WHERE id = ?').run(JSON.stringify(next), row.id);
  }

  db.prepare('DELETE FROM search_index WHERE entity_type = ? AND title = ?').run('aspect', name);
  db.prepare('DELETE FROM aspects WHERE id = ?').run(aspect.id);
}

function stripGenericFaces(db) {
  const aspects = db.prepare('SELECT id, name, detail_json FROM aspects').all();
  const update = db.prepare('UPDATE aspects SET detail_json = ? WHERE id = ?');
  let stripped = 0;

  for (const aspect of aspects) {
    const detail = parseDetail(aspect);
    if (!detail.radiantFaces?.length || !isGenericRadiantFaces(detail.radiantFaces)) continue;

    delete detail.radiantFaces;
    const nextJson = Object.keys(detail).length ? JSON.stringify(detail) : null;
    if (!DRY_RUN) update.run(nextJson, aspect.id);
    stripped += 1;
    console.log(`  stripped template faces: ${aspect.name}`);
  }

  return stripped;
}

function writeAspectsIndex(db) {
  const rows = db.prepare('SELECT name, mentions FROM aspects ORDER BY mentions DESC').all();
  const payload = {
    total: rows.length,
    aspects: rows.map((r) => ({ name: r.name, mentions: r.mentions })),
  };
  if (!DRY_RUN) {
    fs.writeFileSync(ASPECTS_INDEX_PATH, JSON.stringify(payload, null, 2));
  }
  return rows.length;
}

async function main() {
  await db.initDb();

  const grokTexts = collectGrokTexts(db);
  const grokMap = buildGrokOriginSymbolMap(grokTexts);
  const canon = buildCanonSet();
  const { names: discoverNames } = discoverAspectNames(db);
  const discoverSet = new Set(discoverNames);

  const nonOrigin = findNonOriginAspects(db, grokTexts, grokMap, canon);
  const notInDiscover = db.prepare('SELECT id, name FROM aspects').all()
    .filter((a) => !discoverSet.has(a.name));

  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== Purge non-origin aspects ===');
  console.log(`Grok sessions corpus: ${grokTexts.length} text blocks`);
  console.log(`Discover allowlist: ${discoverNames.length} names`);

  const deleteSet = new Map();
  for (const a of [...nonOrigin, ...notInDiscover]) deleteSet.set(a.id, a);

  console.log(`\nDeleting ${deleteSet.size} aspects (no Grok backing or outside discover allowlist):`);
  for (const aspect of deleteSet.values()) {
    console.log(`  delete: ${aspect.name}`);
    if (!DRY_RUN) deleteAspect(db, aspect);
  }

  console.log('\nStripping persisted template diamond facets from detail_json...');
  const stripped = stripGenericFaces(db);
  console.log(`Stripped template faces from ${stripped} aspects.`);

  if (!DRY_RUN) {
    invalidateAspectFaceCache();
    buildAspectFaceCache(db);
    rebuildSearchIndex();
    const total = writeAspectsIndex(db);
    console.log(`\nDone. ${total} aspects remain. Restart API (npm run dev) to reload sql.js.`);
  } else {
    console.log('\nDry run complete — no database changes written.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});