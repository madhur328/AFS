require('./load-env');

/**
 * Apply base-layer alchemy synthesis to blocked aspects.
 * Usage:
 *   node scripts/synthesize-from-base.js              # all entries in map
 *   node scripts/synthesize-from-base.js --batch=1    # first 5
 *   node scripts/synthesize-from-base.js "Aspect A"   # explicit names
 */
const fs = require('fs');
const db = require('../server/db');
const { dataPath } = require('../server/paths');
const { rebuildSearchIndexFromStored } = require('../server/seed');
const { buildDetailJson } = require('../server/services/aspect-detail');
const { humanizeRadiantFaces } = require('../server/services/face-voice');
const { normalizeAspectQuality, resolveAspectQuality } = require('../server/services/aspect-quality');
const { invalidateAspectFaceCache } = require('../server/services/aspect-face-cache');
const { isGenericAffirmation } = require('../server/services/generic-content');

function loadMap() {
  const p = dataPath('base-synthesis-map.json');
  if (!fs.existsSync(p)) throw new Error('Missing base-synthesis-map.json — run: node scripts/build-base-synthesis-map.js');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function upsertFusion(entry) {
  const existing = db.prepare('SELECT id FROM alchemy_fusions WHERE output_aspect = ?').get(entry.name);
  const payload = {
    name: `${entry.name} Base Synthesis`,
    inputs: [...entry.baseInputs, ...entry.strengthens.filter((s) => s !== entry.name)],
    operator: entry.operator,
    notes: entry.synthesisNote,
  };
  if (existing) {
    db.prepare(`
      UPDATE alchemy_fusions SET name = ?, inputs_json = ?, operator = ?, notes = ?
      WHERE output_aspect = ?
    `).run(payload.name, JSON.stringify(payload.inputs), payload.operator, payload.notes, entry.name);
  } else {
    db.prepare(`
      INSERT INTO alchemy_fusions (name, inputs_json, output_aspect, operator, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(payload.name, JSON.stringify(payload.inputs), entry.name, payload.operator, payload.notes);
  }
}

function synthesizeAspect(entry) {
  const aspect = db.prepare('SELECT * FROM aspects WHERE name = ?').get(entry.name);
  if (!aspect) {
    console.log(`  missing: ${entry.name}`);
    return false;
  }

  const stored = aspect.detail_json ? JSON.parse(aspect.detail_json) : {};
  if (stored.coreAffirmation && !isGenericAffirmation(stored.coreAffirmation) && stored.radiantFaces?.length >= 4) {
    console.log(`  skip (already sealed): ${entry.name}`);
    return false;
  }

  const faces = humanizeRadiantFaces(entry.radiantFaces || [], {
    aspectName: entry.name,
    category: aspect.category || 'red-leaf',
  });

  const integration = {
    ...(stored.integration || {}),
    strengthens: entry.strengthens,
    saveCodex: 'Save8',
    entryTool: 'EOT',
    routedTool: entry.operator,
    operator: entry.operator,
    originSource: entry.originSource,
    baseSynthesis: {
      cluster: entry.cluster,
      baseSymbols: entry.baseSymbols,
      synthesisNote: entry.synthesisNote,
    },
    fusionSeal: Boolean(entry.supremeMantra),
  };

  const quality = normalizeAspectQuality(
    resolveAspectQuality(aspect, { radiantFaces: faces, integration })
  );

  const detailJson = buildDetailJson({
    identity: entry.identity,
    coreAffirmation: entry.coreAffirmation,
    supremeMantra: entry.supremeMantra || entry.coreAffirmation,
    aspectFusion: entry.supremeMantra
      ? {
          name: entry.name,
          identity: entry.identity,
          affirmation: entry.supremeMantra,
          symbolChain: entry.symbolChain,
          originSource: entry.originSource,
          radiantFaces: faces,
        }
      : undefined,
    radiantFaces: faces,
    integration,
  });

  db.prepare(`
    UPDATE aspects SET symbol_chain = ?, mantra = ?, comprehension = ?, detail_json = ?
    WHERE id = ?
  `).run(
    entry.symbolChain,
    entry.coreAffirmation.split('\n')[0].trim(),
    entry.identity,
    detailJson,
    aspect.id,
  );

  upsertFusion(entry);
  console.log(`  synthesized: ${entry.name} | ${entry.operator} | ${faces.length} faces | cluster ${entry.cluster}`);
  return true;
}

async function main() {
  await db.initDb();
  const map = loadMap();
  const batchFlag = process.argv.find((a) => a.startsWith('--batch='));
  const batchNum = batchFlag ? Number(batchFlag.split('=')[1]) : null;
  const userNames = process.argv.slice(2).filter((a) => !a.startsWith('--batch='));

  let entries = map.aspects;
  if (userNames.length) {
    entries = entries.filter((e) => userNames.includes(e.name));
  } else if (batchNum) {
    const size = 5;
    entries = entries.slice((batchNum - 1) * size, batchNum * size);
  }

  console.log(`Base synthesis (${entries.length} aspects)`);
  let n = 0;
  for (const entry of entries) {
    if (synthesizeAspect(entry)) n += 1;
  }

  invalidateAspectFaceCache();
  rebuildSearchIndexFromStored();
  console.log(`\nDone. ${n} aspect(s) synthesized from Base Layer alchemy.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});