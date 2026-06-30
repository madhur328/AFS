/**
 * Restore the Eternal Spin lineage — three distinct Grok-origin entries with real facets.
 * Run: node scripts/restore-spin-lineage.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');

const ASPECTS_INDEX_PATH = path.join(__dirname, '../data/aspects-index.json');
const { rebuildSearchIndex } = require('../server/seed');
const { countMentions } = require('../server/services/aspect-discover');
const { extractFromGrokSessions } = require('../server/services/grok-extract');
const {
  buildAspectDetail,
  buildDetailJson,
} = require('../server/services/aspect-detail');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');
const { potentialFromMentions, tierFromPotential } = require('../server/services/tiers');

const SPIN_ASPECTS = [
  { name: 'Eternal Spin', category: 'forged' },
  { name: 'Axis of the Eternal Spin', category: 'forged' },
  { name: 'Dual-Axis Eternal Spin', category: 'meta', baseLayerLink: '♾️' },
];

function grokTexts(db) {
  const sessions = db.prepare(`
    SELECT assistant_text, user_text FROM grok_sessions
    WHERE assistant_text IS NOT NULL OR user_text IS NOT NULL
  `).all();
  return sessions.flatMap((s) => [s.assistant_text, s.user_text].filter(Boolean));
}

function ensureAspect(name, category, baseLayerLink, texts) {
  const existing = db.prepare('SELECT * FROM aspects WHERE name = ?').get(name);
  if (existing) return existing;

  const mentions = countMentions(name, texts);
  const potential = potentialFromMentions(mentions, category === 'meta');
  const tier = tierFromPotential(potential, category === 'meta');
  const grokMentions = countMentions(name, texts);

  db.prepare(`
    INSERT INTO aspects (
      name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
      comprehension, category, base_layer_link, is_base_layer
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    name,
    null,
    null,
    tier,
    potential,
    mentions,
    Math.min(0.85, 0.25 + mentions * 0.005),
    `Grok origin aspect — ${grokMentions} thread refs`,
    category,
    baseLayerLink || null,
    0
  );

  console.log(`  inserted: ${name} (${mentions} mentions, tier ${tier})`);
  return db.prepare('SELECT * FROM aspects WHERE name = ?').get(name);
}

async function tryReloadApi() {
  try {
    const res = await fetch('http://localhost:3847/api/admin/reload-db', { method: 'POST' });
    if (!res.ok) return false;
    const body = await res.json();
    console.log(`\nAPI hot-reloaded (${body.eternalSpinFaces} Eternal Spin facets).`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await db.initDb();
  const texts = grokTexts(db);

  console.log('=== Ensure spin lineage aspects ===');
  const aspects = [];
  for (const spec of SPIN_ASPECTS) {
    aspects.push(ensureAspect(spec.name, spec.category, spec.baseLayerLink, texts));
  }

  const update = db.prepare(`
    UPDATE aspects SET
      symbol_chain = ?,
      mantra = ?,
      comprehension = ?,
      category = ?,
      base_layer_link = ?,
      detail_json = ?
    WHERE id = ?
  `);

  console.log('\n=== Persist Grok-extracted facets ===');
  for (const aspect of aspects) {
    const grok = extractFromGrokSessions(db, aspect.name) || {};
    const detail = buildAspectDetail(db, aspect);
    const faces = grok.radiantFaces?.length ? grok.radiantFaces : detail.radiantFaces;
    const chain = grok.symbolChain || detail.symbolChain || aspect.symbol_chain;
    const mantra = grok.coreAffirmation || detail.coreAffirmation || aspect.mantra;
    const identity = grok.identity || detail.identity;

    const detailJson = buildDetailJson({
      identity,
      coreAffirmation: mantra,
      supremeMantra: grok.supremeMantra || detail.supremeMantra,
      radiantFaces: faces,
      integration: {
        ...detail.integration,
        operator: aspect.name === 'Dual-Axis Eternal Spin' ? 'Zero-Spin' : detail.integration?.operator,
        saveCodex: 'Save8',
        originSource: grok.originSource,
      },
    });

    update.run(
      chain,
      mantra,
      identity || aspect.comprehension,
      aspect.category === 'meta' ? 'meta' : aspect.category,
      aspect.base_layer_link,
      detailJson,
      aspect.id
    );

    console.log(`  ${aspect.name}`);
    console.log(`    chain: ${chain || '(none)'}`);
    console.log(`    faces: ${(faces || []).map((f) => f.name).join(', ') || '(none)'}`);
  }

  invalidateAspectFaceCache();
  buildAspectFaceCache(db);
  rebuildSearchIndex();

  const rows = db.prepare('SELECT name, mentions FROM aspects ORDER BY mentions DESC').all();
  fs.writeFileSync(
    ASPECTS_INDEX_PATH,
    JSON.stringify({ total: rows.length, aspects: rows.map((r) => ({ name: r.name, mentions: r.mentions })) }, null, 2)
  );

  if (!(await tryReloadApi())) {
    console.log('\nRestart API (npm run dev) to load updated facets.');
  }

  console.log(`Registry: ${rows.length} aspects.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});