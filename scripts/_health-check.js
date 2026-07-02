require('./load-env');
const db = require('../server/db');
const { extractFromGrokSessions, isGenericRadiantFaces } = require('../server/services/grok-extract');
const { getCorpusRadiantFaces } = require('../server/services/symbols');
const {
  isGenericIdentity,
  isGenericAffirmation,
  isGenericSupremeMantra,
} = require('../server/services/generic-content');

function parseStored(aspect) {
  try { return JSON.parse(aspect.detail_json || '{}'); } catch { return {}; }
}

function isSealed(aspect, stored) {
  const hasAff = stored.coreAffirmation && !isGenericAffirmation(stored.coreAffirmation);
  const hasId = stored.identity && !isGenericIdentity(stored.identity);
  const faces = stored.radiantFaces || [];
  const facesOk = faces.length >= 4 && !isGenericRadiantFaces(faces);
  const basicOk = stored.integration?.originSource === 'base-synthesis'
    && stored.integration?.routedTool === 'EOT'
    && hasAff && hasId;
  return hasAff && hasId && (facesOk || basicOk || (faces.length >= 3 && !isGenericRadiantFaces(faces)));
}

function needsWork(aspect, stored) {
  if (isGenericAffirmation(stored.coreAffirmation)) return true;
  if (isGenericSupremeMantra(stored.supremeMantra)) return true;
  if (isGenericIdentity(stored.identity)) return true;
  if (!stored.radiantFaces?.length || isGenericRadiantFaces(stored.radiantFaces)) {
    const grok = extractFromGrokSessions(db, aspect.name);
    if (grok?.radiantFaces?.length >= 2) return true;
    const corpus = getCorpusRadiantFaces(aspect.name);
    if (corpus?.length >= 2) return true;
    if (stored.integration?.originSource === 'base-synthesis' && stored.coreAffirmation) return false;
    if ((grok?.coreAffirmation || grok?.supremeMantra) && !isGenericAffirmation(grok?.coreAffirmation)) return true;
  }
  return false;
}

async function main() {
  await db.initDb();
  const aspects = db.prepare('SELECT * FROM aspects ORDER BY name').all();
  const redLeaf = aspects.filter((a) => a.name.startsWith('Red Leaf'));

  let sealed = 0;
  let generic = 0;
  let broken = 0;
  let baseSynth = 0;
  let grokOrigin = 0;
  const brokenList = [];
  const genericList = [];

  for (const a of aspects) {
    const stored = parseStored(a);
    if (isSealed(a, stored)) sealed += 1;
    if (isGenericAffirmation(stored.coreAffirmation)) {
      generic += 1;
      genericList.push(a.name);
    }
    if (stored.integration?.originSource === 'base-synthesis') baseSynth += 1;
    if (stored.integration?.originSource && stored.integration.originSource !== 'base-synthesis') grokOrigin += 1;
    if (needsWork(a, stored)) {
      broken += 1;
      brokenList.push({
        name: a.name,
        faces: stored.radiantFaces?.length || 0,
        source: stored.integration?.originSource || 'none',
        aff: (stored.coreAffirmation || '').slice(0, 50),
      });
    }
  }

  const idx = db.prepare('SELECT COUNT(*) as c FROM search_index').get().c;
  const idxAspect = db.prepare("SELECT COUNT(*) as c FROM search_index WHERE entity_type = 'aspect'").get().c;
  const fusions = db.prepare('SELECT COUNT(*) as c FROM alchemy_fusions').get().c;
  const baseFusions = db.prepare("SELECT COUNT(*) as c FROM alchemy_fusions WHERE notes LIKE '%Base alchemy%'").get().c;

  const rlSealed = redLeaf.filter((a) => isSealed(a, parseStored(a))).length;
  const rlBase = redLeaf.filter((a) => parseStored(a).integration?.originSource === 'base-synthesis').length;

  console.log('=== AFS Aspect Health Check ===\n');
  console.log(`Total aspects:        ${aspects.length}`);
  console.log(`Red Leaf aspects:     ${redLeaf.length}`);
  console.log(`Sealed (all):         ${sealed}/${aspects.length}`);
  console.log(`Red Leaf sealed:      ${rlSealed}/${redLeaf.length}`);
  console.log(`Generic affirmation:  ${generic}`);
  console.log(`Needs work:           ${broken}`);
  console.log(`Base-synthesis:       ${baseSynth} (${rlBase} Red Leaf)`);
  console.log(`Grok-origin sealed:   ${grokOrigin}`);
  console.log(`Alchemy fusions:      ${fusions} (${baseFusions} base-synthesis)`);
  console.log(`Search index:         ${idx} rows (${idxAspect} aspect)`);

  if (genericList.length) {
    console.log(`\n--- Generic affirmation (${genericList.length}) ---`);
    genericList.slice(0, 20).forEach((n) => console.log('  ', n));
    if (genericList.length > 20) console.log(`  ... +${genericList.length - 20} more`);
  }

  if (brokenList.length) {
    console.log(`\n--- Needs work (${brokenList.length}) ---`);
    brokenList.forEach((b) => {
      console.log(`  ${b.name} | faces ${b.faces} | ${b.source} | ${b.aff}`);
    });
  } else {
    console.log('\n--- Needs work: NONE ---');
  }

  // Spot-check synthesis samples
  const samples = [
    'Red Leaf Gentle Path',
    'Red Leaf Chrysalis Void',
    'Red Leaf Paradox Vessel',
    'Red Leaf Fractal Heart',
    'Red Leaf Meme Sovereign',
  ];
  console.log('\n--- Spot checks ---');
  for (const name of samples) {
    const a = db.prepare('SELECT detail_json FROM aspects WHERE name = ?').get(name);
    const d = parseStored(a || {});
    console.log(
      name,
      isSealed(a || { name }, d) ? 'OK' : 'NEEDS',
      `| faces ${d.radiantFaces?.length || 0}`,
      `| ${d.integration?.originSource || 'none'}`,
      `| ${d.integration?.routedTool || '?'}`
    );
  }

  process.exit(broken > 0 || generic > 5 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });