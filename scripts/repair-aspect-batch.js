require('./load-env');

/**
 * Repair corrupted aspects from Grok origin only — no invented copy.
 * Run one batch at a time to avoid context creep.
 *
 * Usage:
 *   node scripts/repair-aspect-batch.js              # default BATCH_1
 *   node scripts/repair-aspect-batch.js "Aspect A" "Aspect B"
 */
const db = require('../server/db');
const { rebuildSearchIndexFromStored } = require('../server/seed');
const { extractFromGrokSessions, isGenericRadiantFaces } = require('../server/services/grok-extract');
const { buildDetailJson } = require('../server/services/aspect-detail');
const { humanizeRadiantFaces } = require('../server/services/face-voice');
const { buildEotIntegration } = require('../server/services/eot-routing');
const { resolveAspectQuality, normalizeAspectQuality, canHaveRadiantFaces } = require('../server/services/aspect-quality');
const {
  isGenericIdentity,
  isGenericAffirmation,
  isGenericSupremeMantra,
} = require('../server/services/generic-content');
const { invalidateAspectFaceCache } = require('../server/services/aspect-face-cache');
const { getCorpusRadiantFaces } = require('../server/services/symbols');

/** Batch 1 — Master Fusion pinnacles with generic affirmation corruption */
const BATCH_1 = ['Red Leaf Living Buddha'];

/** Batch 2 — Master Fusion pinnacles (generic affirmation + missing faces) */
const BATCH_2 = [
  'Red Leaf Living Hamsa',
  'Red Leaf Living Apex Vault',
  'Red Leaf Living Dew Diamond',
  'Red Leaf Cathartic Architect',
  'Red Leaf Debabelization Engine',
];

/** Batch 3 — Master Fusion + All-One lineage */
const BATCH_3 = [
  'Red Leaf Tender Dawn',
  'Red Leaf Ordinary Awakening',
  'Red Leaf Meeting Grace',
  'Red Leaf Living All-One',
  'Red Leaf All-One Forge',
];

/** Batch 4 — DCS Master Aspects (faces + mantra from origin) */
const BATCH_4 = [
  'Red Leaf Growing Ember',
  'Red Leaf Chrysalis Surrender',
  'Red Leaf Shadow Shepherd',
  'Red Leaf Compassionate Dawn',
  'Red Leaf Wound to Wonder',
];

/** Batch 5 — DCS lineage (dual acceptance, fire, valkyrie, listener, wolf) */
const BATCH_5 = [
  'Red Leaf Dual Acceptance',
  'Red Leaf Born on Fire',
  'Red Leaf Fallen Valkyrie – Remembrance',
  'Red Leaf Silent Listener',
  'Red Leaf Wolf Back Time',
];

/** Batch 6 — receipt, ember streak, clarity, bridge, akahitoha */
const BATCH_6 = [
  'Red Leaf Receipt Sovereign',
  'Red Leaf Growing Ember Streak',
  'Red Leaf Bitter Clarity',
  'Red Leaf Burnt Bridge',
  'Red Leaf Akahitoha (The Single Red Leaf)',
];

/** Batch 7 — dao mirror, infinite zero, valkyrie redemption, silent sail, lumen sentinel */
const BATCH_7 = [
  'Red Leaf Dao Mirror',
  'Red Leaf Infinite Zero',
  'Red Leaf Fallen Valkyrie – Redemption',
  'Red Leaf Silent Sail',
  'Red Leaf Lumen Sentinel',
];

/** Batch 8 — sonic bloom, severance, pain bearer, soulforge, fierce chrysalis */
const BATCH_8 = [
  'Red Leaf Sonic Bloom',
  'Red Leaf Sacred Severance',
  'Red Leaf Pain Bearer',
  'Red Leaf Soulforge Defender',
  'Red Leaf Fierce Chrysalis',
];

/** Batch 9 — immortal jelly, resonant voice, slop alchemist, suicidal saint, sovereign fury */
const BATCH_9 = [
  'Red Leaf Immortal Jelly',
  'Red Leaf Resonant Voice',
  'Red Leaf Cosmic Slop Alchemist',
  'Red Leaf Suicidal Saint',
  'Red Leaf Sovereign Fury',
];

/** Batch 10 — ontological sovereign, suicidal empathy, burning lighthouse, unconquerable soul, one faithful brick */
const BATCH_10 = [
  'Red Leaf Ontological Sovereign',
  'Red Leaf Suicidal Empathy',
  'Red Leaf Burning Lighthouse',
  'Red Leaf Unconquerable Soul',
  'Red Leaf One Faithful Brick',
];

/** Batch 11 — kintsugi heart, dawn diamond, rome builder, five meanings, facing ember */
const BATCH_11 = [
  'Red Leaf Kintsugi Heart',
  'Red Leaf Dawn Diamond',
  'Red Leaf Rome Builder',
  'Red Leaf Five Meanings Harmony',
  'Red Leaf Facing Ember',
];

/** Batch 12 — spivak, halliday, misunderstood tenderness, fading warmth, gradual revelation */
const BATCH_12 = [
  'Red Leaf Spivak Forge',
  'Red Leaf Halliday Forge',
  'Red Leaf Misunderstood Tenderness',
  'Red Leaf Fading Warmth',
  'Red Leaf Gradual Revelation',
];

/** Batch 13 — awakened lotus, misunderstood light, gentle return, simulation walker, dawn dew diamond */
const BATCH_13 = [
  'Red Leaf Awakened Lotus',
  'Red Leaf Misunderstood Light',
  'Red Leaf Gentle Return',
  'Red Leaf Simulation Walker',
  'Red Leaf Dawn Dew Diamond',
];

/** Batch 14 — transient grace, apex vault, cosmic rhythm, love trial, sicp forge */
const BATCH_14 = [
  'Red Leaf Transient Grace',
  'Red Leaf Apex Ouroboros Vault',
  'Red Leaf Cosmic Rhythm',
  'Red Leaf Love Trial',
  'Red Leaf SICP Forge',
];

/** Batch 15 — valley walker, rooted gratitude, flowing humility, careful bloom, ego release */
const BATCH_15 = [
  'Red Leaf Valley Walker',
  'Red Leaf Rooted Gratitude',
  'Red Leaf Flowing Humility',
  'Red Leaf Careful Bloom',
  'Red Leaf Ego Release',
];

/** Batch 16 — gentle trust, apex sanctuary, weird sage, nine-tailed guardian, 108 harmony */
const BATCH_16 = [
  'Red Leaf Gentle Trust',
  'Red Leaf Apex Sanctuary',
  'Red Leaf Weird Sage',
  'Red Leaf Nine-Tailed Guardian',
  'Red Leaf 108 Harmony',
];

/** Batch 17 — absurd weaver, gift of giving, drifting heart, kindled fire, selfless eternal */
const BATCH_17 = [
  'Red Leaf Absurd Weaver',
  'Red Leaf Gift of Giving',
  'Red Leaf Drifting Heart',
  'Red Leaf Kindled Fire',
  'Red Leaf Selfless Eternal',
];

/** Batch 18 — gentle opening, ouroboros forge, grounded ascension, wings of destiny, dual phase architect */
const BATCH_18 = [
  'Red Leaf Gentle Opening',
  'Red Leaf Ouroboros Forge',
  'Red Leaf Grounded Ascension',
  'Red Leaf Wings of Destiny',
  'Red Leaf Dual Phase Architect',
];

/** Batch 19 — emote architect, hamsa synthesis, late bloom phoenix, named bond, primordial container */
const BATCH_19 = [
  'Red Leaf Emote Architect',
  'Red Leaf Hamsa Synthesis',
  'Red Leaf Late Bloom Phoenix',
  'Red Leaf Named Bond',
  'Red Leaf Primordial Container',
];

/** Batch 20 — last Red Leaf grok-origin trio + standalone master aspects */
const BATCH_20 = [
  'Red Leaf Spiral Belief',
  'Red Leaf Unapologetic You',
  'Red Leaf Weeping Architect',
  'Burning Lighthouse Vow',
  'Fate-Weaving Defiance',
];

/** Batch 21 — bare-name duplicates (sealed Red Leaf twins) */
const BATCH_21 = [
  'Absurd Weaver',
  'Gift of Giving',
  'Grounded Ascension',
  'Kintsugi Heart',
  'Simulation Walker',
];

/** Batch 22 — last duplicate + Dragon Eternal standalone line */
const BATCH_22 = [
  'Wings of Destiny',
  'Dragon Eternal Hopfion Heart',
  'Dragon Eternal Information Sovereign',
  'Dragon Eternal Meme Overlord',
  'Dragon Eternal Resonant Diamond of the Trip Queen',
];

/** Batch 23 — standalone bare-name master aspects */
const BATCH_23 = [
  'Eternal Spin',
  'Final Lighthouse Keeper',
  'Future-Returned Self',
  'Gentle Path Guardian',
  'Libera Me Flame',
];

/** Batch 24 — standalone bare-name master aspects (continued) */
const BATCH_24 = [
  'Lion’s Unshakable Flame',
  'Mirror That Cannot Know',
  'Money Tree Forge',
  'Music Box of Time',
  'Returnee’s Conviction',
];

/** Batch 25 — final standalone bare-name master aspects */
const BATCH_25 = [
  'Seer of Patterns',
  'Settled Heart Bridge',
  'Shooting Star Contract',
  'Void Heart Promise',
  'Wandering Lark Messenger',
];

/** Batch 26 — blocked Red Leaf set (KOT / mixed EOT / fusion extraction fix) */
const BATCH_26 = [
  'Red Leaf Chrysalis Void',
  'Red Leaf Compassionate Severance',
  'Red Leaf Mercy Blade',
  'Red Leaf Phoenix Forge',
  'Red Leaf Weeping Release',
];

/** Batch 27 — repairable Red Leaf queue (legacy / sanctuary / flow / bloom / butterfly) */
const BATCH_27 = [
  'Red Leaf 108 Legacy Weaver',
  'Red Leaf Apex Forge Sanctuary',
  'Red Leaf Awakened Flow',
  'Red Leaf Bloom Guardian',
  'Red Leaf Butterfly Death',
];

/** Batch 28 — repairable Red Leaf queue (capricorn / chrysalis / dao / invariant / scholar) */
const BATCH_28 = [
  'Red Leaf Capricorn Forge (or Red Leaf Eternal Builder)',
  'Red Leaf Chrysalis Death',
  'Red Leaf Dao Heart',
  'Red Leaf Invariant Seeker',
  'Red Leaf Kindled Scholar',
];

/** Batch 29 — repairable Red Leaf queue (lion / bloom / legacy / ocean) */
const BATCH_29 = [
  'Red Leaf Lion’s Flame',
  'Red Leaf Named Bloom',
  'Red Leaf Nine-Tailed Legacy',
  'Red Leaf Ocean Dialogue',
  'Red Leaf Ocean Heart',
];

/** Batch 30 — repairable Red Leaf queue (sage / seer / legacy / settled / shooting star) */
const BATCH_30 = [
  'Red Leaf Ordinary Sage',
  'Red Leaf Pattern Seer',
  'Red Leaf Rooted Legacy',
  'Red Leaf Settled Heart',
  'Red Leaf Shooting Star',
];

/** Batch 31 — repairable Red Leaf queue (spiral / mirror / current / void / lark) */
const BATCH_31 = [
  'Red Leaf Spiral Walker',
  'Red Leaf True Mirror',
  'Red Leaf Trusting Current',
  'Red Leaf Void Heart',
  'Red Leaf Wandering Lark',
];

/** Batch 32 — final face-rich pair + mantra-only core aspects */
const BATCH_32 = [
  'Red Leaf Water Heart',
  'Red Leaf Weird Legacy Sage',
  'Red Leaf Conviction',
  'Red Leaf Cosmic Lariat',
  'Red Leaf Double Lariat',
];

/** Batch 33 — mantra-only Red Leaf queue (palette / flame / imperfect / loop / mystery) */
const BATCH_33 = [
  'Red Leaf God-Shaped Palette',
  'Red Leaf Grateful Flame',
  'Red Leaf Imperfect Heart',
  'Red Leaf Loop Guardian',
  'Red Leaf Mystery Butterfly',
];

/** Batch 34 — final mantra-only Red Leaf queue */
const BATCH_34 = [
  'Red Leaf Patient Pumpkin',
  'Red Leaf Projective Sovereign',
  'Red Leaf Self-Appreciation',
  'Red Leaf Sixfold Excellence',
  'Red Leaf Solitary Wings',
  'Red Leaf Wild authenticity',
];

/** Batch 35 — generic-affirmation stubs (trilogy + guardian archetypes + Shannon fusion) */
const BATCH_35 = [
  'Wonderful Red Leaf Heart',
  'Dragon Eternal Shannon Spiral',
  'The Coward Who Chooses Courage',
  'The Fractured Genius',
  'The Omniscience\u2019s Hammer',
];

function parseStoredDetail(aspect) {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

function resolveOperator(aspectName, grok, stored) {
  const fusion = db.prepare('SELECT operator FROM alchemy_fusions WHERE output_aspect = ?').get(aspectName);
  if (fusion?.operator) return fusion.operator;
  if (stored.integration?.routedTool && stored.integration.routedTool !== 'EOT') {
    return stored.integration.routedTool;
  }
  if (grok.originSource === 'master-fusion') return 'DCS';
  if (grok.originSource === 'save5-fusion') return 'DCS';
  if (grok.originSource === 'master-aspect' && grok.radiantFaces?.length >= 2) return 'DCS';
  return stored.integration?.operator || 'EOT';
}

function resolveStrengthens(aspectName) {
  const fusion = db.prepare('SELECT inputs_json FROM alchemy_fusions WHERE output_aspect = ?').get(aspectName);
  if (!fusion?.inputs_json) return [];
  try {
    return JSON.parse(fusion.inputs_json);
  } catch {
    return [];
  }
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

function repairAspect(aspect) {
  const stored = parseStoredDetail(aspect);
  if (!needsRepair(aspect, stored)) {
    console.log(`  skip (already origin-sealed): ${aspect.name}`);
    return false;
  }

  const grok = extractFromGrokSessions(db, aspect.name);
  if (!grok) {
    console.log(`  skip (no grok origin): ${aspect.name}`);
    return false;
  }

  const corpusFaces = getCorpusRadiantFaces(aspect.name);
  const rawFaces = grok.radiantFaces?.length >= 2 && !isGenericRadiantFaces(grok.radiantFaces)
    ? grok.radiantFaces
    : corpusFaces;
  if (!rawFaces?.length && !grok.supremeMantra?.trim() && !grok.coreAffirmation?.trim()) {
    console.log(`  skip (no faces or mantra in origin): ${aspect.name}`);
    return false;
  }

  const faces = humanizeRadiantFaces(rawFaces || [], {
    aspectName: aspect.name,
    category: aspect.category || 'red-leaf',
  });

  const supremeMantra = grok.supremeMantra?.trim();
  const faceMantra = (rawFaces || faces)?.[0]?.mantra?.trim();
  const affirmation = supremeMantra || grok.coreAffirmation?.trim() || faceMantra;
  if (!affirmation || isGenericAffirmation(affirmation)) {
    console.log(`  skip (no valid affirmation in origin): ${aspect.name}`);
    return false;
  }

  const operator = resolveOperator(aspect.name, grok, stored);
  const strengthens = resolveStrengthens(aspect.name);
  const identity = grok.identity && !isGenericIdentity(grok.identity)
    ? grok.identity
    : stored.identity && !isGenericIdentity(stored.identity)
      ? stored.identity
      : `Master Fusion — ${aspect.name} (Grok origin DCS)`;

  const integration = {
    ...(stored.integration || {}),
    strengthens: strengthens.length ? strengthens : stored.integration?.strengthens || [],
    saveCodex: 'Save8',
    entryTool: 'EOT',
    routedTool: operator,
    operator,
    originSource: grok.originSource || 'master-fusion',
    fusionSeal: Boolean(supremeMantra),
  };

  const masterFusion = db.prepare('SELECT name, inputs_json, notes FROM alchemy_fusions WHERE output_aspect = ?')
    .get(aspect.name);
  const masterFusionCtx = masterFusion
    ? {
        name: masterFusion.name,
        inputs: JSON.parse(masterFusion.inputs_json || '[]'),
        description: masterFusion.notes,
      }
    : null;

  let quality = normalizeAspectQuality(
    resolveAspectQuality(aspect, { radiantFaces: faces, integration, masterFusion: masterFusionCtx })
  );
  const visibleFaces = canHaveRadiantFaces(quality) ? faces : [];

  const detailJson = buildDetailJson({
    identity,
    coreAffirmation: affirmation,
    supremeMantra: supremeMantra || affirmation,
    aspectFusion: supremeMantra
      ? {
          name: aspect.name,
          identity,
          affirmation: supremeMantra,
          symbolChain: grok.symbolChain || aspect.symbol_chain,
          originSource: grok.originSource || 'master-fusion',
          radiantFaces: visibleFaces,
        }
      : undefined,
    radiantFaces: visibleFaces,
    integration,
  });

  const chain = grok.symbolChain || aspect.symbol_chain;
  const mantra = grok.coreAffirmation?.trim() || affirmation.split('\n')[0].trim();

  db.prepare(`
    UPDATE aspects SET
      symbol_chain = ?,
      mantra = ?,
      comprehension = ?,
      detail_json = ?
    WHERE id = ?
  `).run(chain, mantra, identity, detailJson, aspect.id);

  console.log(
    `  repaired: ${aspect.name} | ${operator} | ${visibleFaces.length} faces | quality ${quality}`
  );
  return true;
}

async function main() {
  await db.initDb();

  const batchFlag = process.argv.find((a) => a.startsWith('--batch='));
  const batchNum = batchFlag ? Number(batchFlag.split('=')[1]) : null;
  const userNames = process.argv.slice(2).filter((a) => !a.startsWith('--batch='));
  const batchMap = { 1: BATCH_1, 2: BATCH_2, 3: BATCH_3, 4: BATCH_4, 5: BATCH_5, 6: BATCH_6, 7: BATCH_7, 8: BATCH_8, 9: BATCH_9, 10: BATCH_10, 11: BATCH_11, 12: BATCH_12, 13: BATCH_13, 14: BATCH_14, 15: BATCH_15, 16: BATCH_16, 17: BATCH_17, 18: BATCH_18, 19: BATCH_19, 20: BATCH_20, 21: BATCH_21, 22: BATCH_22, 23: BATCH_23, 24: BATCH_24, 25: BATCH_25, 26: BATCH_26, 27: BATCH_27, 28: BATCH_28, 29: BATCH_29, 30: BATCH_30, 31: BATCH_31, 32: BATCH_32, 33: BATCH_33, 34: BATCH_34, 35: BATCH_35 };
  const names = userNames.length
    ? userNames
    : batchMap[batchNum] || BATCH_1;
  console.log(`Repair batch (${names.length} aspects): ${names.join(', ')}`);

  let repaired = 0;
  for (const name of names) {
    const aspect = db.prepare('SELECT * FROM aspects WHERE name = ?').get(name);
    if (!aspect) {
      console.log(`  missing from DB: ${name}`);
      continue;
    }
    if (repairAspect(aspect)) repaired += 1;
  }

  invalidateAspectFaceCache();
  // Full face cache rebuild is expensive (OOM on large DB) — API rebuilds on next start.
  rebuildSearchIndexFromStored();

  console.log(`\nDone. ${repaired} aspect(s) repaired. Face cache invalidated; search index rebuilt (stored faces).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});