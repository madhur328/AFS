/**
 * Ingest Aspect Fusion seals from Grok origin into detail_json.aspectFusion.
 * Fusion = identity embodied into aspect; supreme mantra = fusion affirmation.
 * Run: node scripts/ingest-aspect-fusions.js
 */
const db = require('../server/db');
const { extractFromGrokSessions } = require('../server/services/grok-extract');
const {
  resolveAspectFusion,
  mergeFusionIntoDetailJson,
  extractDebabelizedEssence,
} = require('../server/services/aspect-fusion');
const { buildDetailJson } = require('../server/services/aspect-detail');
const { loadCorpusSymbols } = require('../server/services/symbols');
const { rebuildSearchIndex } = require('../server/seed');
const { invalidateAspectFaceCache } = require('../server/services/aspect-face-cache');

function parseStored(aspect) {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

function grokSessionTexts(db, aspectName) {
  const rows = db.prepare(`
    SELECT assistant_text, user_text FROM grok_sessions
    WHERE assistant_text LIKE ? OR user_text LIKE ?
    ORDER BY session_index DESC
    LIMIT 12
  `).all(`%${aspectName}%`, `%${aspectName}%`);
  return rows.flatMap((r) => [r.assistant_text, r.user_text].filter(Boolean));
}

function bestSessionText(texts, aspectName) {
  for (const text of texts) {
    if (/Master Fusion:/i.test(text) && text.includes(aspectName)) return text;
  }
  return texts[0] || '';
}

async function main() {
  await db.initDb();
  loadCorpusSymbols();

  const forgerIdentity = db.prepare('SELECT handle, title, bio FROM identity WHERE id = 1').get() || null;
  const aspects = db.prepare('SELECT * FROM aspects ORDER BY name').all();
  const update = db.prepare('UPDATE aspects SET detail_json = ?, mantra = ? WHERE id = ?');

  let sealed = 0;
  let skipped = 0;

  for (const aspect of aspects) {
    const stored = parseStored(aspect);
    const grok = extractFromGrokSessions(db, aspect.name);
    const sessionText = bestSessionText(grokSessionTexts(db, aspect.name), aspect.name);
    const essence = extractDebabelizedEssence(sessionText, aspect.name);

    const fusion = resolveAspectFusion(aspect, { ...stored, essence }, {
      grok: grok?.supremeMantra || grok?.originSource === 'master-fusion' || grok?.originSource === 'save5-fusion'
        ? { ...grok, identity: grok.identity }
        : null,
      forgerIdentity,
      sessionText,
    });

    if (!fusion?.affirmation?.trim()) {
      skipped += 1;
      continue;
    }

    const hasFacets = (stored.radiantFaces?.length || grok?.radiantFaces?.length || 0) >= 2;
    const isFusionOrigin =
      fusion.originSource === 'master-fusion' ||
      fusion.originSource === 'save5-fusion' ||
      fusion.originSource === 'journal-fusion' ||
      stored.integration?.fusionSeal;

    if (!isFusionOrigin && fusion.affirmation.length < 80 && !hasFacets) {
      skipped += 1;
      continue;
    }

    const detailBody = mergeFusionIntoDetailJson(
      {
        identity: stored.identity,
        coreAffirmation: stored.coreAffirmation || aspect.mantra,
        supremeMantra: fusion.affirmation,
        radiantFaces: stored.radiantFaces,
        integration: stored.integration,
        aspectFusion: fusion,
      },
      fusion
    );

    const detailJson = buildDetailJson(detailBody);
    const mantra = fusion.affirmation.length > (aspect.mantra || '').length
      ? fusion.affirmation
      : aspect.mantra || fusion.affirmation;

    update.run(detailJson, mantra, aspect.id);
    sealed += 1;
    console.log(`  sealed: ${aspect.name} (${fusion.originSource})`);
  }

  rebuildSearchIndex();
  invalidateAspectFaceCache();
  db.saveDb();
  console.log(`\nDone. ${sealed} aspect fusion(s) sealed, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});