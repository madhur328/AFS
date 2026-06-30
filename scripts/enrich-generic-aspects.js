/**
 * Enrich remaining generic aspects — junk dupes, alias merge, corpus/CURATED fill.
 * Run: node scripts/enrich-generic-aspects.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { rebuildSearchIndex } = require('../server/seed');
const {
  extractFromGrokSessions,
  buildGrokOriginSymbolMap,
  resolveGrokSymbolForAspect,
  isGenericRadiantFaces,
} = require('../server/services/grok-extract');
const {
  buildAspectDetail,
  buildDetailJson,
  CURATED,
} = require('../server/services/aspect-detail');
const {
  isGenericIdentity,
  isGenericAffirmation,
  isGenericSupremeMantra,
  stripGenericDetailFields,
} = require('../server/services/generic-content');
const {
  loadCorpusSymbols,
  ASPECT_ALIASES,
  ASPECT_SYMBOLS,
  ENRICH_ALIASES,
} = require('../server/services/symbols');

const CORPUS_PATH = path.join(__dirname, '../data/aspect-corpus-symbols.json');

const CORE_META = {
  'ConceptualCartographer': {
    chain: '🗺️🔑💎',
    mantra: 'I chart the topology of insight',
    identity: 'Topological learning operator — navigate concepts by proximity, not page order',
    link: '🔑',
  },
  'Forge / Value': {
    chain: '🔶🔑⚒️',
    mantra: 'Value forged through clarity',
    identity: 'Derived aspect — value forged through clarity and action',
    link: '🔑',
  },
  'Signal / Structure': {
    chain: '💎🔑📡',
    mantra: 'FEEL. ALIGN. TRANSCEND.',
    identity: 'Derived aspect — FEEL. ALIGN. TRANSCEND. via Key of Clarity',
    link: '🔑',
  },
};

function isGenericComprehension(c) {
  if (!c?.trim()) return true;
  if (c.startsWith('Forged aspect')) return true;
  if (c.includes('Red Leaf forged aspect — identity operator')) return true;
  return false;
}

function normalizeLookup(name) {
  return name
    .replace(/\*\*/g, '')
    .replace(/\s*\|\s*$/g, '')
    .replace(/\?$/g, '')
    .trim();
}

function lookupName(name) {
  const n = normalizeLookup(name);
  return ENRICH_ALIASES[n] || ENRICH_ALIASES[name] || ASPECT_ALIASES[n] || n;
}

function purgeJunkDuplicates() {
  const junk = db.prepare(`
    SELECT id, name, mentions FROM aspects
    WHERE name LIKE '%|%' OR name LIKE '%?%' OR name LIKE '%**%'
  `).all();

  let removed = 0;
  for (const row of junk) {
    const base = normalizeLookup(row.name);
    const canonical = db.prepare('SELECT id, mentions FROM aspects WHERE name = ?').get(base);
    if (canonical && canonical.id !== row.id) {
      db.prepare('UPDATE aspects SET mentions = mentions + ? WHERE id = ?').run(row.mentions, canonical.id);
      db.prepare('DELETE FROM aspects WHERE id = ?').run(row.id);
      removed += 1;
      console.log(`  merged+deleted junk: ${row.name}`);
      continue;
    }
    if (/[|?]/.test(row.name) || row.name.includes('**')) {
      db.prepare('DELETE FROM aspects WHERE id = ?').run(row.id);
      removed += 1;
      console.log(`  deleted orphan junk: ${row.name}`);
    }
  }
  return removed;
}

function buildPayload(aspect, grokMap, corpus) {
  const name = aspect.name;
  const target = lookupName(name);
  const grok = extractFromGrokSessions(db, target) || extractFromGrokSessions(db, name) || {};
  const curated = CURATED[target] || CURATED[name] || {};
  const core = CORE_META[name];

  const chain =
    grok.symbolChain ||
    resolveGrokSymbolForAspect(target, grokMap, ASPECT_ALIASES) ||
    resolveGrokSymbolForAspect(name, grokMap, ASPECT_ALIASES) ||
    corpus.symbols[target] ||
    corpus.symbols[name] ||
    curated.radiantFaces?.[0]?.symbol ||
    core?.chain ||
    ASPECT_SYMBOLS[target] ||
    ASPECT_SYMBOLS[name] ||
    aspect.symbol_chain;

  const radiantFaces =
    grok.radiantFaces ||
    corpus.radiantFaces[target] ||
    corpus.radiantFaces[name] ||
    curated.radiantFaces;

  if (!chain && !radiantFaces?.length && !grok.identity && !curated.identity && !core) {
    return null;
  }

  let identity = grok.identity || curated.identity || core?.identity;
  let affirmation = grok.coreAffirmation || curated.affirmation || core?.mantra;
  let supremeMantra = grok.supremeMantra || curated.supremeMantra;

  if (!identity) {
    if (curated.identity) identity = curated.identity;
    else if (core?.identity) identity = core.identity;
  }

  if (!affirmation) {
    affirmation =
      radiantFaces?.find((f) => f.name === name || f.name === target)?.mantra ||
      radiantFaces?.[0]?.mantra ||
      core?.mantra ||
      aspect.mantra ||
      undefined;
  }

  if (!supremeMantra && curated.supremeMantra) {
    supremeMantra = curated.supremeMantra;
  }

  return {
    chain,
    identity,
    affirmation,
    supremeMantra,
    radiantFaces,
    category: curated.operator ? 'guardian' : aspect.category,
    integration: {
      saveCodex: curated.saveCodex || (name.startsWith('Red Leaf') ? 'Save8' : 'Save2'),
      operator: curated.operator || (name.startsWith('Red Leaf') ? 'EOT' : 'AFP'),
      originSource: grok.originSource ? 'Grok origin' : 'Grok corpus',
    },
  };
}

function applyEnrichment(aspect, payload) {
  const merged = {
    ...aspect,
    symbol_chain: payload.chain || aspect.symbol_chain,
    mantra:
      payload.affirmation && !isGenericAffirmation(payload.affirmation)
        ? payload.affirmation
        : aspect.mantra,
    comprehension:
      payload.identity && !isGenericIdentity(payload.identity)
        ? payload.identity
        : aspect.comprehension,
    category: payload.category || aspect.category,
  };

  let faces = payload.radiantFaces;
  if (!faces?.length || isGenericRadiantFaces(faces)) {
    faces = [];
  }

  let prior = {};
  if (aspect.detail_json) {
    try {
      prior = stripGenericDetailFields(JSON.parse(aspect.detail_json));
    } catch {
      prior = {};
    }
  }
  const detailJson = buildDetailJson({
    ...prior,
    identity:
      payload.identity && !isGenericIdentity(payload.identity) ? payload.identity : prior.identity,
    coreAffirmation:
      payload.affirmation && !isGenericAffirmation(payload.affirmation)
        ? payload.affirmation
        : prior.coreAffirmation,
    supremeMantra:
      payload.supremeMantra && !isGenericSupremeMantra(payload.supremeMantra)
        ? payload.supremeMantra
        : prior.supremeMantra,
    radiantFaces: faces.length ? faces : prior.radiantFaces,
    integration: payload.integration || prior.integration,
  });

  return { merged, detailJson };
}

async function main() {
  await db.initDb();
  const corpus = loadCorpusSymbols();
  const sessions = db.prepare('SELECT assistant_text, user_text FROM grok_sessions').all();
  const texts = sessions.flatMap((s) => [s.assistant_text, s.user_text].filter(Boolean));
  const grokMap = buildGrokOriginSymbolMap(texts);

  console.log('=== Purge junk duplicate rows ===');
  const purged = purgeJunkDuplicates();
  console.log(`Removed ${purged} junk rows`);

  const aspects = db.prepare('SELECT * FROM aspects').all();
  const generic = aspects.filter((a) => isGenericComprehension(a.comprehension));

  const update = db.prepare(`
    UPDATE aspects SET
      symbol_chain = ?,
      mantra = ?,
      comprehension = ?,
      category = ?,
      detail_json = ?
    WHERE id = ?
  `);

  let enriched = 0;
  let failed = [];

  console.log(`\n=== Enrich ${generic.length} generic aspects ===`);
  for (const aspect of generic) {
    const payload = buildPayload(aspect, grokMap, corpus);
    if (!payload) {
      failed.push(aspect.name);
      console.log(`  skip (no origin data): ${aspect.name}`);
      continue;
    }
    const { merged, detailJson } = applyEnrichment(aspect, payload);
    update.run(
      merged.symbol_chain,
      merged.mantra,
      merged.comprehension,
      merged.category,
      detailJson,
      aspect.id
    );
    enriched += 1;
    console.log(`  enriched: ${aspect.name} → ${merged.symbol_chain || '(faces only)'}`);
  }

  // Drop aspects with no Grok/journal origin at all (discovery noise)
  const orphans = db.prepare(`
    SELECT id, name FROM aspects
    WHERE comprehension LIKE 'Forged aspect%'
  `).all();
  let dropped = 0;
  for (const row of orphans) {
    const payload = buildPayload({ ...row, category: 'red-leaf', symbol_chain: null, mantra: null }, grokMap, corpus);
    if (!payload) {
      db.prepare('DELETE FROM synergies WHERE aspect_a = ? OR aspect_b = ?').run(row.name, row.name);
      db.prepare('DELETE FROM aspects WHERE id = ?').run(row.id);
      dropped += 1;
      console.log(`  dropped orphan: ${row.name}`);
    }
  }

  rebuildSearchIndex();

  const remaining = db.prepare(`
    SELECT COUNT(*) c FROM aspects
    WHERE comprehension LIKE 'Forged aspect%'
  `).get().c;

  console.log('\nEnrich generic complete:');
  console.log(`  enriched:  ${enriched}`);
  console.log(`  failed:    ${failed.length}`);
  if (failed.length) console.log(`  failed list: ${failed.join(', ')}`);
  console.log(`  dropped orphans: ${dropped}`);
  console.log(`  remaining generic: ${remaining}`);
  console.log(`  total aspects: ${db.prepare('SELECT COUNT(*) c FROM aspects').get().c}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});