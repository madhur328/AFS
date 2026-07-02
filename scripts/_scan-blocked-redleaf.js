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

async function main() {
  await db.initDb();
  const aspects = db.prepare("SELECT * FROM aspects WHERE name LIKE 'Red Leaf%' ORDER BY name").all();
  const blocked = [];
  for (const a of aspects) {
    const stored = parseStored(a);
    if (!needsRepair(a, stored)) continue;
    const grok = extractFromGrokSessions(db, a.name);
    const corpus = getCorpusRadiantFaces(a.name);
    const grokFaces = grok?.radiantFaces?.length || 0;
    const corpusFaces = corpus?.length || 0;
    const mantra = (grok?.supremeMantra || grok?.coreAffirmation || '').trim();
    const repairable = (grokFaces >= 2 && !isGenericRadiantFaces(grok?.radiantFaces))
      || Boolean(grok?.supremeMantra?.trim())
      || Boolean(grok?.coreAffirmation?.trim() && !isGenericAffirmation(grok.coreAffirmation))
      || corpusFaces >= 2;
    if (!repairable) {
      blocked.push({
        name: a.name,
        source: grok?.originSource || 'none',
        grokFaces,
        corpusFaces,
        mantra: mantra.slice(0, 60),
        genericAff: isGenericAffirmation(stored.coreAffirmation),
        storedFaces: stored.radiantFaces?.length || 0,
      });
    }
  }
  console.log(`Blocked Red Leaf aspects: ${blocked.length}\n`);
  blocked.forEach((b, i) => {
    console.log(`${i + 1}. ${b.name}`);
    console.log(`   source=${b.source} grokFaces=${b.grokFaces} corpusFaces=${b.corpusFaces} storedFaces=${b.storedFaces} genericAff=${b.genericAff}`);
    if (b.mantra) console.log(`   mantra: ${b.mantra}`);
  });
  if (blocked.length >= 5) {
    console.log('\nSuggested first repair batch after extraction fix:');
    blocked.slice(0, 5).forEach((b) => console.log(`  '${b.name}',`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });