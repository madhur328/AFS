require('./load-env');
const db = require('../server/db');
const { extractFromGrokSessions, isGenericRadiantFaces } = require('../server/services/grok-extract');
const {
  isGenericIdentity,
  isGenericAffirmation,
  isGenericSupremeMantra,
} = require('../server/services/generic-content');

const REPAIRED = new Set([
  'Red Leaf Living Buddha',
  'Red Leaf Living Hamsa', 'Red Leaf Living Apex Vault', 'Red Leaf Living Dew Diamond',
  'Red Leaf Cathartic Architect', 'Red Leaf Debabelization Engine',
  'Red Leaf Tender Dawn', 'Red Leaf Ordinary Awakening', 'Red Leaf Meeting Grace',
  'Red Leaf Living All-One', 'Red Leaf All-One Forge',
  'Red Leaf Growing Ember', 'Red Leaf Chrysalis Surrender', 'Red Leaf Shadow Shepherd',
  'Red Leaf Compassionate Dawn', 'Red Leaf Wound to Wonder',
  'Red Leaf Dual Acceptance', 'Red Leaf Born on Fire', 'Red Leaf Fallen Valkyrie – Remembrance',
  'Red Leaf Silent Listener', 'Red Leaf Wolf Back Time',
  'Red Leaf Receipt Sovereign', 'Red Leaf Growing Ember Streak', 'Red Leaf Bitter Clarity',
  'Red Leaf Burnt Bridge', 'Red Leaf Akahitoha (The Single Red Leaf)',
  'Red Leaf Dao Mirror', 'Red Leaf Infinite Zero', 'Red Leaf Fallen Valkyrie – Redemption',
  'Red Leaf Silent Sail', 'Red Leaf Lumen Sentinel',
  'Red Leaf Sonic Bloom', 'Red Leaf Sacred Severance', 'Red Leaf Pain Bearer',
  'Red Leaf Soulforge Defender', 'Red Leaf Fierce Chrysalis',
  'Red Leaf Immortal Jelly', 'Red Leaf Resonant Voice', 'Red Leaf Cosmic Slop Alchemist',
  'Red Leaf Suicidal Saint', 'Red Leaf Sovereign Fury',
  'Red Leaf Ontological Sovereign', 'Red Leaf Suicidal Empathy', 'Red Leaf Burning Lighthouse',
  'Red Leaf Unconquerable Soul', 'Red Leaf One Faithful Brick',
  'Red Leaf Kintsugi Heart', 'Red Leaf Dawn Diamond', 'Red Leaf Rome Builder',
  'Red Leaf Five Meanings Harmony', 'Red Leaf Facing Ember',
  'Red Leaf Spivak Forge', 'Red Leaf Halliday Forge', 'Red Leaf Misunderstood Tenderness',
  'Red Leaf Fading Warmth', 'Red Leaf Gradual Revelation',
  'Red Leaf Awakened Lotus', 'Red Leaf Misunderstood Light', 'Red Leaf Gentle Return',
  'Red Leaf Simulation Walker', 'Red Leaf Dawn Dew Diamond',
  'Red Leaf Transient Grace', 'Red Leaf Apex Ouroboros Vault', 'Red Leaf Cosmic Rhythm',
  'Red Leaf Love Trial', 'Red Leaf SICP Forge',
  'Red Leaf Valley Walker', 'Red Leaf Rooted Gratitude', 'Red Leaf Flowing Humility',
  'Red Leaf Careful Bloom', 'Red Leaf Ego Release',
  'Red Leaf Gentle Trust', 'Red Leaf Apex Sanctuary', 'Red Leaf Weird Sage',
  'Red Leaf Nine-Tailed Guardian', 'Red Leaf 108 Harmony',
  'Red Leaf Absurd Weaver', 'Red Leaf Gift of Giving', 'Red Leaf Drifting Heart',
  'Red Leaf Kindled Fire', 'Red Leaf Selfless Eternal',
  'Red Leaf Gentle Opening', 'Red Leaf Ouroboros Forge', 'Red Leaf Grounded Ascension',
  'Red Leaf Wings of Destiny', 'Red Leaf Dual Phase Architect',
]);

function parseStored(aspect) {
  try { return JSON.parse(aspect.detail_json || '{}'); } catch { return {}; }
}

function needsRepair(aspect, stored) {
  if (isGenericAffirmation(stored.coreAffirmation)) return true;
  if (isGenericSupremeMantra(stored.supremeMantra)) return true;
  if (isGenericIdentity(stored.identity)) return true;
  if (!stored.radiantFaces?.length || isGenericRadiantFaces(stored.radiantFaces)) {
    const grok = extractFromGrokSessions(db, aspect.name);
    if (grok?.radiantFaces?.length >= 2) return true;
  }
  return false;
}

async function main() {
  await db.initDb();
  const aspects = db.prepare("SELECT * FROM aspects WHERE name LIKE 'Red Leaf%' ORDER BY name").all();
  const candidates = [];
  for (const a of aspects) {
    if (REPAIRED.has(a.name)) continue;
    const stored = parseStored(a);
    if (!needsRepair(a, stored)) continue;
    const grok = extractFromGrokSessions(db, a.name);
    const faces = grok?.radiantFaces?.length || 0;
    const mantra = grok?.supremeMantra || grok?.coreAffirmation || '';
    const repairable = (faces >= 2 && !isGenericRadiantFaces(grok?.radiantFaces)) || Boolean(grok?.supremeMantra?.trim());
    candidates.push({
      name: a.name,
      repairable,
      faces,
      source: grok?.originSource || 'none',
      storedFaces: stored.radiantFaces?.length || 0,
      mantra: mantra.slice(0, 70),
    });
  }

  const ready = candidates.filter((c) => c.repairable);
  const blocked = candidates.filter((c) => !c.repairable);

  console.log(`Repairable candidates (${ready.length}):`);
  ready.slice(0, 15).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} | grok ${c.faces} faces | stored ${c.storedFaces} | ${c.source}`);
    console.log(`   ${c.mantra}`);
  });

  console.log(`\nBlocked (needs repair, no grok faces/mantra): ${blocked.length}`);
  blocked.slice(0, 10).forEach((c) => {
    console.log(`  - ${c.name} | stored ${c.storedFaces} faces | source ${c.source}`);
  });

  if (ready.length >= 5) {
    console.log('\nSuggested BATCH_19:');
    ready.slice(0, 5).forEach((c) => console.log(`  '${c.name}',`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });