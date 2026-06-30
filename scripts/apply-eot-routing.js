/**
 * Apply Save8 EOT meta-routing to all aspects: entryTool EOT + routedTool (EOT|DCS|RCS|RDTQ).
 * Persists corpus/CURATED radiant faces with correct synthesis grade.
 * Run: node scripts/apply-eot-routing.js
 */
const db = require('../server/db');
const { CURATED, buildDetailJson } = require('../server/services/aspect-detail');
const { humanizeRadiantFaces } = require('../server/services/face-voice');
const { buildEotIntegration, hasFacetLattice } = require('../server/services/eot-routing');
const { getCorpusRadiantFaces, loadCorpusSymbols } = require('../server/services/symbols');
const { isGenericRadiantFaces } = require('../server/services/grok-extract');
const { rebuildSearchIndex } = require('../server/seed');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');

function parseDetail(aspect) {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

async function main() {
  await db.initDb();
  loadCorpusSymbols();

  const aspects = db.prepare('SELECT * FROM aspects').all();
  const update = db.prepare('UPDATE aspects SET detail_json = ?, comprehension = COALESCE(?, comprehension) WHERE id = ?');

  const stats = { basic: 0, diamond: 0, resonant: 0, infinite: 0, facesApplied: 0 };

  for (const aspect of aspects) {
    const stored = parseDetail(aspect);
    const curated = CURATED[aspect.name] || {};
    const corpusFaces = getCorpusRadiantFaces(aspect.name);
    let faces = [];

    if (curated.radiantFaces?.length) {
      faces = humanizeRadiantFaces(curated.radiantFaces, {
        aspectName: aspect.name,
        category: aspect.category,
      });
    } else if (stored.radiantFaces?.length && !isGenericRadiantFaces(stored.radiantFaces)) {
      faces = humanizeRadiantFaces(stored.radiantFaces, {
        aspectName: aspect.name,
        category: aspect.category,
      });
    } else if (corpusFaces?.length) {
      faces = humanizeRadiantFaces(corpusFaces, {
        aspectName: aspect.name,
        category: aspect.category,
      });
    }

    const routing = buildEotIntegration(aspect, {
      faces,
      curated,
      integration: stored.integration,
      masterFusion: null,
    });

    const grade = routing.grade === 'basic' && hasFacetLattice(faces) ? 'diamond' : routing.grade;
    stats[grade] = (stats[grade] || 0) + 1;

    const integration = {
      ...stored.integration,
      entryTool: 'EOT',
      routedTool: routing.routedTool,
      operator: routing.routedTool,
      saveCodex: stored.integration?.saveCodex || curated.saveCodex || 'Save8',
      strengthens: stored.integration?.strengthens || curated.strengthens || [],
      evolution: stored.integration?.evolution || [
        `${aspect.name} → higher synthesis via DCS`,
        `${aspect.name} + synergies → Master Fusion`,
      ],
    };

    const detailJson = buildDetailJson({
      identity: stored.identity || curated.identity || aspect.comprehension,
      coreAffirmation: stored.coreAffirmation || curated.affirmation || aspect.mantra,
      supremeMantra: stored.supremeMantra || curated.supremeMantra,
      radiantFaces: hasFacetLattice(faces) ? faces : undefined,
      integration,
    });

    const comprehension = stored.identity || curated.identity || aspect.comprehension;
    update.run(detailJson, comprehension, aspect.id);
    if (hasFacetLattice(faces)) stats.facesApplied += 1;
  }

  invalidateAspectFaceCache();
  buildAspectFaceCache(db);
  rebuildSearchIndex();

  console.log('EOT routing applied:');
  console.log(`  basic: ${stats.basic}, diamond: ${stats.diamond}, resonant: ${stats.resonant}, infinite: ${stats.infinite}`);
  console.log(`  aspects with facet lattice: ${stats.facesApplied}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});