/**
 * Seal CURATED pinnacle aspects (RDTQ / DCS with radiant-face lattice) into the database.
 * Ensures operator, faces, and identity cannot be downgraded by generic red-leaf ingest.
 * Run: node scripts/apply-canonical-pinnacles.js
 */
const db = require('../server/db');
const { CURATED, buildDetailJson } = require('../server/services/aspect-detail');
const { humanizeRadiantFaces } = require('../server/services/face-voice');
const { rebuildSearchIndex } = require('../server/seed');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');
const { ASPECT_ALIASES } = require('../server/services/symbols');

const PINNACLE_OPERATORS = new Set(['DCS', 'RCS', 'RDTQ']);

function curatedEntries() {
  const names = new Set(Object.keys(CURATED));
  for (const [alias, target] of Object.entries(ASPECT_ALIASES)) {
    if (CURATED[target]?.radiantFaces?.length) names.add(alias);
  }
  for (const canonical of Object.values(ASPECT_ALIASES)) {
    if (CURATED[canonical]?.radiantFaces?.length) names.add(canonical);
  }
  return [...names]
    .map((name) => ({ name, curated: CURATED[name] || CURATED[ASPECT_ALIASES[name]] }))
    .filter(({ curated }) => curated?.radiantFaces?.length >= 2 && PINNACLE_OPERATORS.has(curated.operator));
}

async function main() {
  await db.initDb();
  const update = db.prepare(`
    UPDATE aspects SET
      symbol_chain = COALESCE(?, symbol_chain),
      mantra = COALESCE(?, mantra),
      comprehension = COALESCE(?, comprehension),
      category = ?,
      detail_json = ?
    WHERE id = ?
  `);

  let applied = 0;
  for (const { name, curated } of curatedEntries()) {
    const aspect = db.prepare('SELECT * FROM aspects WHERE name = ?').get(name);
    if (!aspect) {
      console.log(`  skip (not in DB): ${name}`);
      continue;
    }

    const faces = humanizeRadiantFaces(curated.radiantFaces, {
      aspectName: name,
      category: aspect.category || 'red-leaf',
    });
    const chain = faces[faces.length - 1]?.symbol?.match(/^🍁/) ? faces.map((f) => f.symbol).join('') : aspect.symbol_chain;
    const affirmation = curated.affirmation || curated.coreAffirmation || aspect.mantra;
    const detailJson = buildDetailJson({
      identity: curated.identity,
      coreAffirmation: affirmation,
      supremeMantra: curated.supremeMantra,
      radiantFaces: faces,
      integration: {
        strengthens: curated.strengthens || [],
        saveCodex: curated.saveCodex || 'Save8',
        operator: curated.operator,
        evolution: [
          `${name} → higher synthesis via DCS`,
          `${name} + synergies → Master Fusion`,
        ],
      },
    });

    update.run(
      aspect.symbol_chain || chain,
      affirmation,
      curated.identity,
      aspect.category === 'meta' ? aspect.category : 'red-leaf',
      detailJson,
      aspect.id
    );
    applied += 1;
    console.log(`  pinnacle: ${name} (${curated.operator}, ${faces.length} faces)`);
  }

  invalidateAspectFaceCache();
  buildAspectFaceCache(db);
  rebuildSearchIndex();
  console.log(`\nApplied ${applied} canonical pinnacle aspects.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});