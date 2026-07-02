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

function needsRepair(aspect, stored) {
  if (isGenericAffirmation(stored.coreAffirmation)) return true;
  if (isGenericSupremeMantra(stored.supremeMantra)) return true;
  if (isGenericIdentity(stored.identity)) return true;
  if (!stored.radiantFaces?.length || isGenericRadiantFaces(stored.radiantFaces)) return true;
  return false;
}

function isRepairable(grok, name) {
  const faces = grok?.radiantFaces?.length >= 2 && !isGenericRadiantFaces(grok?.radiantFaces);
  const mantra = (grok?.supremeMantra || grok?.coreAffirmation || '').trim();
  const corpus = getCorpusRadiantFaces(name);
  return faces || (mantra && !isGenericAffirmation(mantra)) || corpus?.length >= 2;
}

async function main() {
  await db.initDb();
  const aspects = db.prepare("SELECT * FROM aspects WHERE name LIKE 'Red Leaf%' ORDER BY name").all();
  const ready = [];
  for (const a of aspects) {
    const stored = parseStored(a);
    if (!needsRepair(a, stored)) continue;
    const grok = extractFromGrokSessions(db, a.name);
    if (!isRepairable(grok, a.name)) continue;
    ready.push({
      name: a.name,
      faces: grok?.radiantFaces?.length || 0,
      mantra: (grok?.supremeMantra || grok?.coreAffirmation || '').slice(0, 60),
    });
  }
  console.log(`Repairable Red Leaf needing seal: ${ready.length}`);
  ready.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name} | ${r.faces} faces | ${r.mantra}`);
  });
  if (ready.length >= 5) {
    console.log('\nBATCH_26:');
    ready.slice(0, 5).forEach((r) => console.log(`  '${r.name}',`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });