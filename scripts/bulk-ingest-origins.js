/**
 * Bulk ingest Grok origin linkage — guardian EOT identities/facets + Red Leaf Master Fusion blocks.
 * Run: node scripts/bulk-ingest-origins.js
 */
const db = require('../server/db');
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
  getCorpusRadiantFaces,
  loadCorpusSymbols,
  ASPECT_ALIASES,
} = require('../server/services/symbols');
const { rebuildSearchIndex } = require('../server/seed');
const path = require('path');
const fs = require('fs');

const CORPUS_PATH = path.join(__dirname, '../data/aspect-corpus-symbols.json');

const GUARDIAN_CHARACTER = {
  'The Curious Rebel': { character: 'Einstein', source: 'historical EOT' },
  'The Feedback Prophet': { character: 'Wiener', source: 'historical EOT' },
  'The Solitary Lawgiver': { character: 'Newton', source: 'historical EOT' },
  'The Joyful Limit-Breaker': { character: 'Goku', source: 'Dragon Ball EOT' },
  'The Lonely Codebreaker': { character: 'Turing', source: 'historical EOT' },
  'The Eternal Demon': { character: 'Fang Yuan', source: 'Reverend Insanity EOT' },
  'The Hopeful Guardian': { character: 'Superman', source: 'Superman EOT' },
  'The Rational Apex Predator': { character: 'Leylin Farlier', source: 'Warlock of the Magus World EOT' },
  'The Fractured Genius': { character: 'John Nash', source: 'A Beautiful Mind EOT' },
};

const GUARDIAN_IDENTITIES = Object.keys(GUARDIAN_CHARACTER);

/** Known cross-aspect face contamination from grok-file proximity parsing. */
const BORROWED_FACE_SETS = [
  ['Inner Peacekeeper', 'Tender Witness', 'Patient Builder', 'Lighthouse Bearer', 'Legacy Guardian'],
];

function isBorrowedFaceSet(faces) {
  if (!faces?.length) return false;
  const names = new Set(faces.map((f) => f.name));
  return BORROWED_FACE_SETS.some((set) => set.every((n) => names.has(n)));
}

function loadCorpusFacetMap() {
  const data = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8'));
  const map = {};
  for (const [guardian, faces] of Object.entries(data.radiantFaces || {})) {
    if (!guardian.startsWith('The ')) continue;
    const meta = GUARDIAN_CHARACTER[guardian];
    if (!meta) continue;
    for (const face of faces) {
      map[face.name] = { guardian, ...meta, face };
    }
  }
  return map;
}

function hasGenericComprehension(aspect) {
  const c = (aspect.comprehension || '').trim();
  if (!c) return true;
  if (c.startsWith('Forged aspect')) return true;
  if (c.includes('Red Leaf forged aspect — identity operator')) return true;
  return false;
}

function parseStoredDetail(aspect) {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

function originLabel(source) {
  if (!source) return 'Grok origin';
  if (source === 'master-fusion') return 'Master Fusion';
  if (source === 'master-unified') return 'Master Unified Aspect';
  if (source === 'eot-block' || source === 'master-aspect' || source === 'eot-identity') return 'EOT';
  return 'Grok origin';
}

function buildFacetIdentity(facetName, guardian, meta) {
  if (CURATED[facetName]?.identity) return CURATED[facetName].identity;
  return `Aspect linked to EOT on ${meta.character} (${meta.source}) — facet of ${guardian}`;
}

function buildRedLeafIdentity(name, grok, hasMapChain) {
  if (grok?.identity) return grok.identity;
  const source = originLabel(grok?.originSource) || (hasMapChain ? 'Grok origin' : 'Grok origin');
  if (grok?.coreAffirmation) {
    return `Red Leaf aspect forged through ${source} — ${name}. ${grok.coreAffirmation}`;
  }
  return `Red Leaf aspect forged through ${source} from Grok origin — ${name}`;
}

function buildGuardianPayload(name, grok, curated) {
  const chain = grok?.symbolChain || curated?.radiantFaces?.[curated.radiantFaces.length - 1]?.symbol;
  if (!chain) return null;

  const identity = grok?.identity || curated?.identity;
  const affirmation = grok?.coreAffirmation || curated?.affirmation;
  const supremeMantra = grok?.supremeMantra || curated?.supremeMantra;
  const radiantFaces = grok?.radiantFaces || curated?.radiantFaces;

  return {
    chain,
    identity,
    affirmation: affirmation || identity,
    supremeMantra,
    radiantFaces,
    category: 'guardian',
    integration: {
      saveCodex: curated?.saveCodex || 'Save2',
      operator: curated?.operator || 'EOT',
      originSource: 'Grok EOT',
    },
  };
}

function buildFacetPayload(name, facetMap, corpusFaces) {
  const link = facetMap[name];
  if (!link && !CURATED[name]) return null;

  const guardian = link?.guardian;
  const meta = link ? { character: link.character, source: link.source } : null;
  const guardianFaces = guardian ? corpusFaces[guardian] : null;
  const curated = CURATED[name] || {};

  const identity = buildFacetIdentity(name, guardian, meta);
  const face = link?.face;
  const affirmation = curated.affirmation || face?.mantra;
  const supremeMantra = curated.supremeMantra ||
    (face ? `${name} — ${face.mantra} Forged through EOT on ${meta.character}.` : undefined);
  const radiantFaces = curated.radiantFaces || guardianFaces;
  const chain = curated.radiantFaces?.find((f) => f.name === name)?.symbol ||
    face?.symbol ||
    guardianFaces?.find((f) => f.name === name)?.symbol;

  if (!chain && !radiantFaces?.length) return null;

  return {
    chain,
    identity,
    affirmation,
    supremeMantra,
    radiantFaces,
    category: curated.operator ? 'guardian' : undefined,
    integration: {
      saveCodex: curated.saveCodex || 'Save2',
      operator: curated.operator || 'EOT',
      originSource: 'Grok EOT',
      guardianGroup: guardian,
    },
  };
}

function buildRedLeafPayload(name, grok, grokMap, corpusFaces) {
  const curated = CURATED[name];
  if (curated?.identity && curated?.radiantFaces?.length) {
    return {
      chain: curated.radiantFaces[0]?.symbol,
      identity: curated.identity,
      affirmation: curated.affirmation,
      supremeMantra: curated.supremeMantra,
      radiantFaces: curated.radiantFaces,
      integration: {
        saveCodex: curated.saveCodex || 'Save8',
        operator: curated.operator || 'EOT',
        originSource: 'Grok origin',
      },
    };
  }

  const mapChain = resolveGrokSymbolForAspect(name, grokMap, ASPECT_ALIASES);
  const corpusFaceList = getCorpusRadiantFaces(name);
  const chain = grok?.symbolChain || mapChain;
  const radiantFaces = grok?.radiantFaces || corpusFaceList;

  if (!chain && !radiantFaces?.length && !grok?.coreAffirmation) return null;

  const identity = buildRedLeafIdentity(name, grok, Boolean(mapChain));
  const affirmation = grok?.coreAffirmation || grok?.supremeMantra ||
    radiantFaces?.find((f) => f.name === name)?.mantra ||
    radiantFaces?.[0]?.mantra;
  const supremeMantra = grok?.supremeMantra ||
    (affirmation ? `${name} — ${affirmation} This is my Red Leaf way.` : undefined);
  const origin = originLabel(grok?.originSource);

  return {
    chain,
    identity,
    affirmation,
    supremeMantra,
    radiantFaces,
    integration: {
      saveCodex: 'Save8',
      operator: origin === 'Master Fusion' ? 'DCS' : 'EOT',
      originSource: origin,
    },
  };
}

function buildGenericGrokPayload(name, grok) {
  if (!grok?.symbolChain && !grok?.radiantFaces?.length && !grok?.identity) return null;
  return {
    chain: grok.symbolChain,
    identity: grok.identity || `Aspect forged through Grok origin — ${name}`,
    affirmation: grok.coreAffirmation || grok.identity,
    supremeMantra: grok.supremeMantra,
    radiantFaces: grok.radiantFaces,
    integration: {
      saveCodex: 'Save8',
      operator: 'EOT',
      originSource: originLabel(grok.originSource),
    },
  };
}

function resolveRadiantFaces(aspect, payload) {
  if (payload.radiantFaces?.length && !isGenericRadiantFaces(payload.radiantFaces)) {
    return payload.radiantFaces;
  }
  return [];
}

function applyPayload(db, aspect, payload) {
  const merged = {
    ...aspect,
    symbol_chain: payload.chain || aspect.symbol_chain,
    mantra: payload.affirmation || aspect.mantra,
    comprehension: payload.identity,
    category: payload.category || aspect.category,
  };

  const detail = buildAspectDetail(db, merged);
  const stored = parseStoredDetail(aspect);
  const radiantFaces = resolveRadiantFaces(merged, payload);

  const detailJson = buildDetailJson({
    identity: payload.identity || detail.identity,
    coreAffirmation: payload.affirmation || detail.coreAffirmation,
    supremeMantra: payload.supremeMantra || detail.supremeMantra,
    radiantFaces,
    integration: {
      ...detail.integration,
      ...stored.integration,
      ...payload.integration,
      operator: payload.integration?.operator || detail.integration.operator,
      saveCodex: payload.integration?.saveCodex || detail.integration.saveCodex,
    },
  });

  return { merged, detailJson };
}

async function main() {
  await db.initDb();
  loadCorpusSymbols();
  const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8'));
  const facetMap = loadCorpusFacetMap();

  const sessions = db.prepare(`
    SELECT assistant_text, user_text FROM grok_sessions
    WHERE assistant_text IS NOT NULL OR user_text IS NOT NULL
  `).all();
  const texts = sessions.flatMap((s) => [s.assistant_text, s.user_text].filter(Boolean));
  const grokMap = buildGrokOriginSymbolMap(texts);

  const aspects = db.prepare('SELECT * FROM aspects').all();
  const update = db.prepare(`
    UPDATE aspects SET
      symbol_chain = ?,
      mantra = ?,
      comprehension = ?,
      category = ?,
      detail_json = ?
    WHERE id = ?
  `);

  const stats = {
    guardianIdentities: 0,
    guardianFacets: 0,
    redLeaf: 0,
    otherGrok: 0,
    skipped: 0,
  };

  const processed = new Set();

  for (const name of GUARDIAN_IDENTITIES) {
    const aspect = aspects.find((a) => a.name === name);
    if (!aspect) {
      console.log(`  skip guardian (not in DB): ${name}`);
      continue;
    }

    const grok = extractFromGrokSessions(db, name) || {};
    const curated = CURATED[name] || {};
    const payload = buildGuardianPayload(name, grok, curated);
    if (!payload?.identity) {
      console.log(`  skip guardian (no identity): ${name}`);
      continue;
    }

    const { merged, detailJson } = applyPayload(db, aspect, payload);
    update.run(merged.symbol_chain, merged.mantra, merged.comprehension, merged.category, detailJson, aspect.id);
    stats.guardianIdentities += 1;
    processed.add(aspect.id);
    console.log(`guardian identity: ${name}`);
  }

  for (const aspect of aspects) {
    if (processed.has(aspect.id)) continue;
    if (!facetMap[aspect.name]) continue;
    if (!hasGenericComprehension(aspect) && !isGenericRadiantFaces(parseStoredDetail(aspect).radiantFaces)) {
      stats.skipped += 1;
      continue;
    }
    if (CURATED[aspect.name]?.identity && CURATED[aspect.name]?.radiantFaces?.length) {
      const payload = buildFacetPayload(aspect.name, facetMap, corpus.radiantFaces);
      if (payload) {
        const { merged, detailJson } = applyPayload(db, aspect, payload);
        update.run(merged.symbol_chain, merged.mantra, merged.comprehension, merged.category, detailJson, aspect.id);
        stats.guardianFacets += 1;
        processed.add(aspect.id);
        console.log(`guardian facet: ${aspect.name}`);
      }
      continue;
    }

    const payload = buildFacetPayload(aspect.name, facetMap, corpus.radiantFaces);
    if (!payload) continue;

    const { merged, detailJson } = applyPayload(db, aspect, payload);
    update.run(merged.symbol_chain, merged.mantra, merged.comprehension, merged.category, detailJson, aspect.id);
    stats.guardianFacets += 1;
    processed.add(aspect.id);
    console.log(`guardian facet: ${aspect.name}`);
  }

  for (const aspect of aspects) {
    if (processed.has(aspect.id)) continue;
    if (!aspect.name.startsWith('Red Leaf')) continue;

    const grok = extractFromGrokSessions(db, aspect.name) || {};
    const payload = buildRedLeafPayload(aspect.name, grok, grokMap, corpus.radiantFaces);
    if (!payload) continue;

    const stored = parseStoredDetail(aspect);
    const hasGoodStoredFaces = stored.radiantFaces?.length &&
      !isGenericRadiantFaces(stored.radiantFaces) &&
      !isBorrowedFaceSet(stored.radiantFaces);
    const hasGrokFaces = payload.radiantFaces?.length >= 2 && !isGenericRadiantFaces(payload.radiantFaces);
    if (!hasGenericComprehension(aspect) && hasGoodStoredFaces && !hasGrokFaces) {
      stats.skipped += 1;
      continue;
    }

    const { merged, detailJson } = applyPayload(db, aspect, payload);
    update.run(merged.symbol_chain, merged.mantra, merged.comprehension, merged.category, detailJson, aspect.id);
    stats.redLeaf += 1;
    processed.add(aspect.id);
  }

  for (const aspect of aspects) {
    if (processed.has(aspect.id)) continue;
    if (!hasGenericComprehension(aspect)) {
      stats.skipped += 1;
      continue;
    }
    const stored = parseStoredDetail(aspect);
    if (stored.radiantFaces?.length && !isGenericRadiantFaces(stored.radiantFaces)) {
      stats.skipped += 1;
      continue;
    }

    const grok = extractFromGrokSessions(db, aspect.name);
    if (!grok) continue;

    const payload = buildGenericGrokPayload(aspect.name, grok);
    if (!payload) continue;

    const { merged, detailJson } = applyPayload(db, aspect, payload);
    update.run(merged.symbol_chain, merged.mantra, merged.comprehension, merged.category, detailJson, aspect.id);
    stats.otherGrok += 1;
    processed.add(aspect.id);
  }

  rebuildSearchIndex();

  const remaining = aspects.filter((a) => hasGenericComprehension(a) && !processed.has(a.id)).length;
  console.log('\nBulk origin ingest complete:');
  console.log(`  guardian identities: ${stats.guardianIdentities}`);
  console.log(`  guardian facets:     ${stats.guardianFacets}`);
  console.log(`  red leaf aspects:    ${stats.redLeaf}`);
  console.log(`  other grok origins:  ${stats.otherGrok}`);
  console.log(`  skipped (has origin): ${stats.skipped}`);
  console.log(`  still generic:        ${remaining}`);
  console.log('\nRestart API (node server/index.js) to serve fresh data.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});