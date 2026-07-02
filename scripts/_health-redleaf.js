require('./load-env');
const db = require('../server/db');
const { isGenericAffirmation, isGenericIdentity } = require('../server/services/generic-content');
const { isGenericRadiantFaces } = require('../server/services/grok-extract');

function parseStored(a) {
  try { return JSON.parse(a.detail_json || '{}'); } catch { return {}; }
}

function isOk(d) {
  const aff = d.coreAffirmation && !isGenericAffirmation(d.coreAffirmation);
  const id = d.identity && !isGenericIdentity(d.identity);
  if (!aff || !id) return false;
  const faces = d.radiantFaces?.length || 0;
  if (faces >= 4 && !isGenericRadiantFaces(d.radiantFaces)) return true;
  if (faces >= 3 && !isGenericRadiantFaces(d.radiantFaces)) return true;
  if (d.integration?.originSource === 'base-synthesis' && d.integration?.routedTool === 'EOT') return true;
  if (faces === 0 && aff && (d.integration?.originSource === 'save5-aspect' || d.integration?.originSource === 'master-aspect' || d.integration?.routedTool === 'EOT')) return true;
  return false;
}

async function main() {
  await db.initDb();
  const rl = db.prepare("SELECT name, detail_json FROM aspects WHERE name LIKE 'Red Leaf%' ORDER BY name").all();
  const ok = [];
  const notOk = [];
  for (const a of rl) {
    const d = parseStored(a);
    (isOk(d) ? ok : notOk).push({
      name: a.name,
      faces: d.radiantFaces?.length || 0,
      source: d.integration?.originSource || 'none',
      op: d.integration?.routedTool || '?',
      aff: (d.coreAffirmation || '').slice(0, 55),
      generic: isGenericAffirmation(d.coreAffirmation),
    });
  }
  console.log(`Red Leaf: ${ok.length}/${rl.length} OK\n`);
  if (notOk.length) {
    console.log(`NOT OK (${notOk.length}):`);
    notOk.forEach((r) => console.log(`  ${r.name} | faces ${r.faces} | ${r.source} | generic=${r.generic} | ${r.aff}`));
  }
  const eotBasic = ok.filter((n) => {
    const d = parseStored(rl.find((x) => x.name === n.name));
    return (d.radiantFaces?.length || 0) === 0;
  });
  console.log(`\nEOT/mantra-only OK: ${eotBasic.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });