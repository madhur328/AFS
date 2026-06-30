/**
 * Repair aspects with zero diamond/radiant faces when Grok or corpus has the data.
 * Persists ONLY real radiant faces — never writes generic identity/mantra text.
 * Run: node scripts/fix-zero-facets.js
 */
const db = require('../server/db');
const { rebuildSearchIndex } = require('../server/seed');
const { isGenericRadiantFaces } = require('../server/services/grok-extract');
const { buildAspectDetail, buildDetailJson } = require('../server/services/aspect-detail');
const { loadCorpusSymbols } = require('../server/services/symbols');
const { stripGenericDetailFields } = require('../server/services/generic-content');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');

function parseStoredDetail(aspect) {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

function needsFacetRepair(aspect, detail) {
  const stored = parseStoredDetail(aspect);
  const storedEmpty =
    !stored.radiantFaces?.length || isGenericRadiantFaces(stored.radiantFaces);
  const resolvedEmpty =
    !detail.radiantFaces?.length || isGenericRadiantFaces(detail.radiantFaces);
  return storedEmpty && !resolvedEmpty;
}

async function main() {
  await db.initDb();
  loadCorpusSymbols();

  const aspects = db.prepare('SELECT * FROM aspects').all();
  const update = db.prepare('UPDATE aspects SET detail_json = ? WHERE id = ?');

  let fixed = 0;
  let alreadyOk = 0;
  let stillZero = 0;

  for (const aspect of aspects) {
    const detail = buildAspectDetail(db, aspect);
    if (detail.radiantFaces?.length && !isGenericRadiantFaces(detail.radiantFaces)) {
      if (!needsFacetRepair(aspect, detail)) {
        alreadyOk += 1;
        continue;
      }

      const stored = stripGenericDetailFields(parseStoredDetail(aspect));
      const detailJson = buildDetailJson({
        ...stored,
        radiantFaces: detail.radiantFaces,
      });

      update.run(detailJson, aspect.id);
      fixed += 1;
      console.log(
        `facets only: ${aspect.name} (${detail.radiantFaces.length}: ${detail.radiantFaces.map((f) => f.name).join(', ')})`
      );
      continue;
    }

    stillZero += 1;
  }

  invalidateAspectFaceCache();
  buildAspectFaceCache(db);
  rebuildSearchIndex();

  console.log(`\nZero-facet repair: fixed ${fixed}, already ok ${alreadyOk}, still zero ${stillZero}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});