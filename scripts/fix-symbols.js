/**
 * Repair symbols + faces from exported Grok corpus (not keyword templates).
 */
const db = require('../server/db');
const {
  resolveAspectSymbolChain,
  setCorpusSymbolMap,
  loadCorpusSymbols,
  CURATED_RADIANT_FACES,
  ASPECT_SYMBOLS,
  ASPECT_ALIASES,
} = require('../server/services/symbols');
const { buildAspectDetail, buildDetailJson } = require('../server/services/aspect-detail');
const { isGenericRadiantFaces } = require('../server/services/grok-extract');
const { rebuildSearchIndex } = require('../server/seed');
const { execSync } = require('child_process');
const path = require('path');

function refreshDetailJson(db, aspect, chain) {
  const detail = buildAspectDetail(db, { ...aspect, symbol_chain: chain });
  let stored = {};
  if (aspect.detail_json) {
    try { stored = JSON.parse(aspect.detail_json); } catch { stored = {}; }
  }
  const hasCuratedFaces = Boolean(CURATED_RADIANT_FACES[aspect.name]);
  const keepStoredFaces =
    stored.radiantFaces?.length &&
    !isGenericRadiantFaces(stored.radiantFaces) &&
    !hasCuratedFaces;
  return buildDetailJson({
    identity: stored.identity || detail.identity,
    coreAffirmation: stored.coreAffirmation || detail.coreAffirmation,
    supremeMantra: stored.supremeMantra || detail.supremeMantra,
    radiantFaces: keepStoredFaces ? stored.radiantFaces : detail.radiantFaces,
    integration: stored.integration || detail.integration,
  });
}

function mergeDuplicateBorn() {
  const born = db.prepare('SELECT * FROM aspects WHERE name = ?').get('Red Leaf Born');
  const bornFire = db.prepare('SELECT * FROM aspects WHERE name = ?').get('Red Leaf Born on Fire');
  if (born && bornFire && born.id !== bornFire.id) {
    db.prepare('UPDATE aspects SET mentions = mentions + ? WHERE id = ?').run(born.mentions, bornFire.id);
    db.prepare('DELETE FROM aspects WHERE id = ?').run(born.id);
    console.log('Merged duplicate "Red Leaf Born" into "Red Leaf Born on Fire"');
  } else if (born && !bornFire) {
    db.prepare('UPDATE aspects SET name = ? WHERE id = ?').run('Red Leaf Born on Fire', born.id);
    console.log('Renamed "Red Leaf Born" → "Red Leaf Born on Fire"');
  }
}

async function main() {
  execSync('node scripts/build-corpus-symbols.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  await db.initDb();
  const corpus = loadCorpusSymbols();
  setCorpusSymbolMap(corpus.symbols, corpus.radiantFaces);

  mergeDuplicateBorn();

  const aspects = db.prepare('SELECT * FROM aspects').all();
  const update = db.prepare('UPDATE aspects SET symbol_chain = ?, detail_json = ? WHERE id = ?');
  let changed = 0;

  const { buildGrokOriginSymbolMap, resolveGrokSymbolForAspect } = require('../server/services/grok-extract');
  const sessions = db.prepare('SELECT assistant_text, user_text FROM grok_sessions').all();
  const texts = sessions.flatMap((s) => [s.assistant_text, s.user_text].filter(Boolean));
  const grokMap = buildGrokOriginSymbolMap(texts);

  for (const aspect of aspects) {
    const fromGrok = resolveGrokSymbolForAspect(aspect.name, grokMap, ASPECT_ALIASES);
    const fromCorpus = corpus.symbols[aspect.name] || corpus.symbols[ASPECT_ALIASES[aspect.name]];
    const GENERIC_BAD = new Set(['🍁♾️', '🍁🛡️🌱', '🍁♾️🪞', '⚒️🔥💎']);
    const keepStored =
      aspect.symbol_chain?.trim() && !GENERIC_BAD.has(aspect.symbol_chain) ? aspect.symbol_chain : null;
    const chain =
      fromGrok ||
      fromCorpus ||
      ASPECT_SYMBOLS[aspect.name] ||
      (ASPECT_ALIASES[aspect.name] && ASPECT_SYMBOLS[ASPECT_ALIASES[aspect.name]]) ||
      keepStored;
    if (!chain) continue;
    const detailJson = refreshDetailJson(db, aspect, chain);
    if (aspect.symbol_chain !== chain || aspect.detail_json !== detailJson) {
      update.run(chain, detailJson, aspect.id);
      changed += 1;
    }
  }

  rebuildSearchIndex();
  console.log(`Fixed ${changed} / ${aspects.length} aspects from exported corpus.`);
  for (const n of ['Red Leaf Dragon Phoenix Hammer', 'Red Leaf Born on Fire', 'Red Leaf Patient Rome']) {
    const a = db.prepare('SELECT symbol_chain FROM aspects WHERE name = ?').get(n);
    console.log(n, '→', a?.symbol_chain);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });