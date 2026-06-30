/**
 * Restore Double Lariat / Spin Series aspects from Grok EOT (7 Minutoz blog).
 * Run: node scripts/restore-double-lariat-spin-series.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { rebuildSearchIndex } = require('../server/seed');
const {
  DOUBLE_LARIAT_SPIN_SERIES,
  countMentions,
  buildAspectRows,
} = require('../server/services/aspect-discover');
const { extractFromGrokSessions } = require('../server/services/grok-extract');
const { buildAspectDetail, buildDetailJson } = require('../server/services/aspect-detail');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');
const { potentialFromMentions, tierFromPotential } = require('../server/services/tiers');

const ROOT = path.join(__dirname, '..');
const ASPECTS_INDEX_PATH = path.join(ROOT, 'data', 'aspects-index.json');

const SPIN_SERIES_LABEL = 'Spin Series';
const SPIN_PARENTS = ['Double Lariat Spin', 'Dual-Axis Eternal Spin', 'Axis of the Eternal Spin'];

const SERIES_META = {
  'Double Lariat Paradox': { role: 'Master Aspect', potentialBoost: 0.14, tierFloor: 'A' },
  'Rope of Identity': { role: 'High-Ceiling Aspect', potentialBoost: 0.12, tierFloor: 'A' },
  'Fear of the Empty Sky': { role: 'Shadow Aspect', potentialBoost: 0.08, tierFloor: 'B' },
  'Graceful Unlooping': { role: 'Transformational Operator', potentialBoost: 0.1, tierFloor: 'B' },
  'Echoing Return': { role: 'Identity', potentialBoost: 0.1, tierFloor: 'B' },
};

const TIER_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1 };

function grokTexts(database) {
  return database
    .prepare(`SELECT assistant_text, user_text FROM grok_sessions WHERE assistant_text IS NOT NULL OR user_text IS NOT NULL`)
    .all()
    .flatMap((s) => [s.assistant_text, s.user_text].filter(Boolean));
}

function tierMax(a, b) {
  return (TIER_RANK[a] || 0) >= (TIER_RANK[b] || 0) ? a : b;
}

function upsertSpinAspect(name, texts) {
  const meta = SERIES_META[name] || { role: 'Spin Series', potentialBoost: 0.05, tierFloor: 'C' };
  const mentions = countMentions(name, texts);
  let potential = Math.min(0.92, potentialFromMentions(mentions) + meta.potentialBoost);
  let tier = tierMax(tierFromPotential(potential), meta.tierFloor);

  let aspect = db.prepare('SELECT * FROM aspects WHERE name = ?').get(name);
  if (!aspect) {
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
      Math.min(0.85, 0.3 + mentions * 0.005),
      `Grok origin — ${SPIN_SERIES_LABEL}`,
      'forged',
      null,
      0,
    );
    aspect = db.prepare('SELECT * FROM aspects WHERE name = ?').get(name);
    console.log(`  + inserted ${name} (${tier})`);
  }

  const grok = extractFromGrokSessions(db, name) || {};
  const detail = buildAspectDetail(db, aspect);
  const face = grok.radiantFaces?.[0];
  const mantra = grok.coreAffirmation || grok.supremeMantra || aspect.mantra;
  const chain = grok.symbolChain || aspect.symbol_chain;
  const detailJson = buildDetailJson({
    identity: grok.identity || detail.identity || `${name} — ${mantra || SPIN_SERIES_LABEL}`,
    coreAffirmation: mantra,
    supremeMantra: grok.supremeMantra || mantra,
    radiantFaces: grok.radiantFaces?.length ? grok.radiantFaces : detail.radiantFaces,
    integration: {
      ...detail.integration,
      series: SPIN_SERIES_LABEL,
      aspectRole: meta.role,
      lineage: SPIN_PARENTS,
      strengthens: [
        ...new Set([
          ...(detail.integration?.strengthens || []),
          'Double Lariat Spin',
          'Dual-Axis Eternal Spin',
          'Axis of the Eternal Spin',
        ]),
      ],
      originSource: grok.originSource || 'eot-forged',
      saveCodex: 'Save8',
      operator: name === 'Graceful Unlooping' ? 'EOT' : detail.integration?.operator || 'AFP',
    },
  });

  db.prepare(`
    UPDATE aspects SET
      symbol_chain = COALESCE(?, symbol_chain),
      mantra = COALESCE(?, mantra),
      tier = ?,
      potential_score = ?,
      mentions = ?,
      comprehension = ?,
      detail_json = ?
    WHERE id = ?
  `).run(
    chain,
    mantra,
    tier,
    potential,
    mentions,
    `Grok origin — ${SPIN_SERIES_LABEL} · ${meta.role}`,
    detailJson,
    aspect.id,
  );

  console.log(`  ✓ ${name} — ${chain || '?'} · "${(mantra || '').slice(0, 48)}…"`);
  return {
    name,
    symbol: chain,
    mantra,
    explanation: face?.explanation || grok.identity?.replace(`${name} — `, ''),
  };
}

function ensureSynergy(aspectA, aspectB, description, strength = 0.86) {
  const existing = db
    .prepare(
      `SELECT id FROM synergies WHERE
        (aspect_a = ? AND aspect_b = ?) OR (aspect_a = ? AND aspect_b = ?)`,
    )
    .get(aspectA, aspectB, aspectB, aspectA);
  if (existing) return;
  db.prepare(`
    INSERT INTO synergies (aspect_a, aspect_b, fusion_name, description, strength)
    VALUES (?,?,?,?,?)
  `).run(aspectA, aspectB, description.slice(0, 80), description, strength);
}

function linkSpinSynergies() {
  const pairs = [
    ['Red Leaf Conviction', 'Double Lariat Paradox'],
    ['Graceful Transience', 'Graceful Unlooping'],
    ['Red Leaf Loop Guardian', 'Echoing Return'],
    ['Wonderful Red Leaf Heart', 'Fear of the Empty Sky'],
    ['Axis of the Eternal Spin', 'Double Lariat Paradox'],
    ['Double Lariat Spin', 'Double Lariat Paradox'],
    ['Dual-Axis Eternal Spin', 'Double Lariat Paradox'],
    ['Double Lariat Spin', 'Rope of Identity'],
    ['Double Lariat Spin', 'Fear of the Empty Sky'],
    ['Double Lariat Spin', 'Graceful Unlooping'],
    ['Double Lariat Spin', 'Echoing Return'],
  ];
  let added = 0;
  for (const [a, b] of pairs) {
    const aRow = db.prepare('SELECT name FROM aspects WHERE name = ?').get(a);
    const bRow = db.prepare('SELECT name FROM aspects WHERE name = ?').get(b);
    if (!aRow || !bRow) continue;
    ensureSynergy(a, b, `${a} + ${b} — Spin Series synergy`);
    added += 1;
  }
  console.log(`  linked ${added} spin-series synergies`);
}

function attachDiamondFacesToParent(parentName, faces) {
  const parent = db.prepare('SELECT * FROM aspects WHERE name = ?').get(parentName);
  if (!parent) return;

  const detail = parent.detail_json ? JSON.parse(parent.detail_json) : buildAspectDetail(db, parent);
  const existing = detail.radiantFaces || [];
  const byName = new Map(existing.map((f) => [f.name, f]));
  for (const face of faces) {
    if (!face.mantra) continue;
    byName.set(face.name, {
      name: face.name,
      symbol: face.symbol || '🌀',
      mantra: face.mantra,
      explanation: face.explanation || `${SPIN_SERIES_LABEL} diamond face`,
    });
  }
  const merged = [...byName.values()];
  const detailJson = buildDetailJson({
    ...detail,
    radiantFaces: merged,
    integration: {
      ...detail.integration,
      series: SPIN_SERIES_LABEL,
      saveCodex: detail.integration?.saveCodex || 'Save8',
    },
  });
  db.prepare('UPDATE aspects SET detail_json = ? WHERE id = ?').run(detailJson, parent.id);
  console.log(`  ✓ ${parentName} — ${merged.length} diamond faces (incl. Spin Series)`);
}

async function main() {
  await db.initDb();
  const texts = grokTexts(db);

  console.log('=== Double Lariat Spin Series ===');
  const faces = [];
  for (const name of DOUBLE_LARIAT_SPIN_SERIES) {
    faces.push(upsertSpinAspect(name, texts));
  }

  console.log('\n=== Diamond faces on Double Lariat Spin ===');
  attachDiamondFacesToParent('Double Lariat Spin', faces);
  attachDiamondFacesToParent('Dual-Axis Eternal Spin', faces.filter((f) =>
    ['Double Lariat Paradox', 'Echoing Return'].includes(f.name),
  ));

  console.log('\n=== Spin Series synergies ===');
  linkSpinSynergies();

  console.log('\n=== Index + face cache ===');
  rebuildSearchIndex();
  invalidateAspectFaceCache();
  const cache = buildAspectFaceCache(db);
  const rows = db.prepare('SELECT name, mentions FROM aspects ORDER BY mentions DESC').all();
  fs.writeFileSync(
    ASPECTS_INDEX_PATH,
    JSON.stringify({ total: rows.length, aspects: rows.map((r) => ({ name: r.name, mentions: r.mentions })) }, null, 2),
  );

  console.log(`\nDone — ${rows.length} aspects, ${cache.faceCount} facets`);
  for (const name of DOUBLE_LARIAT_SPIN_SERIES) {
    const row = db.prepare('SELECT name, tier, symbol_chain FROM aspects WHERE name = ?').get(name);
    console.log(`  ${row ? '✓' : '✗'} ${name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});