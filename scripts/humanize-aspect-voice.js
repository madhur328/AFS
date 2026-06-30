/**
 * Apply alive first-person voice to all radiant faces in corpus + persisted aspect detail_json.
 * Run: node scripts/humanize-aspect-voice.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { buildDetailJson } = require('../server/services/aspect-detail');
const { humanizeRadiantFaces } = require('../server/services/face-voice');
const { rebuildSearchIndex } = require('../server/seed');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');

const CORPUS_PATH = path.join(__dirname, '..', 'data', 'aspect-corpus-symbols.json');

function parseDetail(aspect) {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

function countMechanistic(faces) {
  return (faces || []).filter((f) => /^This facet/i.test(f.explanation || '')).length;
}

async function humanizeCorpus() {
  if (!fs.existsSync(CORPUS_PATH)) return { fixed: 0, before: 0, after: 0 };
  const data = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8'));
  let before = 0;
  let after = 0;
  for (const [aspectName, aspectFaces] of Object.entries(data.radiantFaces || {})) {
    const category = aspectName.startsWith('Red Leaf') ? 'red-leaf' : 'forged';
    before += countMechanistic(aspectFaces);
    data.radiantFaces[aspectName] = humanizeRadiantFaces(aspectFaces, { aspectName, category });
    after += countMechanistic(data.radiantFaces[aspectName]);
  }
  data.voiceMethodology = 'first-person I — no mechanistic This facet; red-leaf leaf→I conversion';
  data.generatedAt = new Date().toISOString();
  fs.writeFileSync(CORPUS_PATH, JSON.stringify(data, null, 2));
  return { fixed: before - after, before, after };
}

async function humanizeDatabase() {
  const aspects = db.prepare('SELECT id, name, category, detail_json FROM aspects').all();
  const update = db.prepare('UPDATE aspects SET detail_json = ? WHERE id = ?');
  let updated = 0;
  let mechanisticBefore = 0;
  let mechanisticAfter = 0;

  for (const aspect of aspects) {
    const detail = parseDetail(aspect);
    if (!detail.radiantFaces?.length) continue;
    mechanisticBefore += countMechanistic(detail.radiantFaces);
    const nextFaces = humanizeRadiantFaces(detail.radiantFaces, {
      aspectName: aspect.name,
      category: aspect.category,
    });
    mechanisticAfter += countMechanistic(nextFaces);
    const changed = JSON.stringify(nextFaces) !== JSON.stringify(detail.radiantFaces);
    if (!changed) continue;
    detail.radiantFaces = nextFaces;
    update.run(buildDetailJson(detail), aspect.id);
    updated += 1;
  }

  return { updated, mechanisticBefore, mechanisticAfter };
}

async function main() {
  await db.initDb();

  console.log('=== Humanize corpus radiant faces ===');
  const corpus = await humanizeCorpus();
  console.log(`  corpus: fixed ${corpus.fixed} mechanistic lines (${corpus.before} → ${corpus.after} remaining)`);

  console.log('\n=== Humanize persisted aspect detail_json ===');
  const dbResult = await humanizeDatabase();
  console.log(`  aspects updated: ${dbResult.updated}`);
  console.log(`  mechanistic: ${dbResult.mechanisticBefore} → ${dbResult.mechanisticAfter}`);

  invalidateAspectFaceCache();
  buildAspectFaceCache(db);
  rebuildSearchIndex();
  console.log('\nDone. Restart API or POST /api/admin/reload-db to serve fresh voice.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});