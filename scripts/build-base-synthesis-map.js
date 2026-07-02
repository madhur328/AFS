require('./load-env');
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { dataPath } = require('../server/paths');

const BASE = {
  '⚓': { name: 'Anchor of Stability', short: 'Anchor', role: 'grounding' },
  '🔥': { name: 'Fire of Conviction', short: 'Fire', role: 'conviction' },
  '🔑': { name: 'Key of Clarity', short: 'Clarity', role: 'discernment' },
  '🌪️': { name: 'Tornado of Momentum', short: 'Momentum', role: 'motion' },
  '🔗': { name: 'Chain of Synchronisation', short: 'Chain', role: 'integrity' },
  '🧬': { name: 'Helix of Adaptability', short: 'Helix', role: 'adaptation' },
};

/** Thematic clusters — first-principles base alchemy recipes */
const CLUSTERS = [
  {
    id: 'path_humility',
    operator: 'DCS',
    bases: ['⚓', '🧬', '🔑', '🔗'],
    strengthens: ['Red Leaf Flowing Humility', 'Red Leaf Imperfect Heart', 'Red Leaf Rooted Gratitude'],
    aspects: ['Red Leaf Gentle Path', 'Red Leaf Genuine Influence', 'Red Leaf Center', 'Red Leaf Artist Way'],
    identityTpl: (n) => `${n} — humble independent progress forged from Anchor + Helix + Clarity + Chain`,
    mantraHints: {
      'Red Leaf Gentle Path': 'I walk gently, listen wisely, think independently, and build my own meaningful path.',
      'Red Leaf Genuine Influence': 'I influence through genuine presence and honest reciprocity — never through manipulation.',
      'Red Leaf Center': 'I hold a still center while the world spins — my path begins from inner balance.',
      'Red Leaf Artist Way': 'I walk the artist\'s path — disciplined craft, wild vision, anchored in truth.',
    },
  },
  {
    id: 'ordinary_light',
    operator: 'DCS',
    bases: ['⚓', '🧬', '🔥', '🔑'],
    strengthens: ['Red Leaf Ordinary Awakening', 'Red Leaf Tender Dawn', 'Red Leaf Valley Walker'],
    aspects: ['Red Leaf Ordinary Light', 'Red Leaf Late Bloom', 'Red Leaf Moonlit Butterfly', 'Red Leaf Living Past'],
    identityTpl: (n) => `${n} — ordinary radiance from Anchor + Helix + Fire + Clarity`,
    mantraHints: {
      'Red Leaf Ordinary Light': 'I release the need to be extraordinary and become a steady, humble light in ordinary days.',
      'Red Leaf Late Bloom': 'I trust my season — what blooms late blooms true.',
      'Red Leaf Moonlit Butterfly': 'I transform gently under moonlight — mystery without losing center.',
      'Red Leaf Living Past': 'I honor the past as living teacher, not prison.',
    },
  },
  {
    id: 'mirror_kenosis',
    operator: 'DCS',
    bases: ['🔑', '🧬', '⚓', '🔗'],
    strengthens: ['Red Leaf Empty Mirror (Kenosis)', 'Red Leaf Dao Mirror', 'Red Leaf Chrysalis Void'],
    aspects: [
      'Red Leaf Empty Mirror', 'Red Leaf Empty Mirror (Kenosis)', 'Red Leaf Empty Mirror – Final Four-Emoji Chain',
      'Red Leaf Paradox Vessel', 'Red Leaf Unwavering Paradox Vessel', 'Red Leaf Aspects (Kenosis — Downward Mirror)',
      'Red Leaf Sacred Severance (Kenosis)',
    ],
    identityTpl: (n) => `${n} — kenotic mirror synthesis from Clarity + Helix + Anchor + Chain`,
    mantraHints: {
      'Red Leaf Empty Mirror': 'I empty the mirror so truth may pass through without distortion.',
      'Red Leaf Empty Mirror (Kenosis)': 'I release all reflection until only transparent witnessing remains.',
      'Red Leaf Paradox Vessel': 'I am the container that holds contradictions without dissonance.',
      'Red Leaf Sacred Severance (Kenosis)': 'I sever with sacred sorrow — releasing what the mirror can no longer hold.',
    },
  },
  {
    id: 'axis_spin',
    operator: 'DCS',
    bases: ['🌪️', '⚓', '🔗', '🔑'],
    strengthens: ['Red Leaf Eternal Spin', 'Red Leaf Cosmic Rhythm', 'Red Leaf Infinite Zero'],
    aspects: [
      'Red Leaf Axis (persistent spinning with graceful honoring)',
      'Red Leaf Axis Diamond', 'Red Leaf Spinning Axis', 'Red Leaf Witness Axis',
      'Red Leaf Eternal Witness Axis', 'Red Leaf Phoenix Axis', 'Red Leaf Cosmic Dancer',
    ],
    identityTpl: (n) => `${n} — axis alchemy from Momentum + Anchor + Chain + Clarity`,
    mantraHints: {
      'Red Leaf Axis (persistent spinning with graceful honoring)': 'I spin with persistence and honor every turn of the spiral.',
      'Red Leaf Witness Axis': 'I witness the spin without being thrown from center.',
      'Red Leaf Eternal Witness Axis': 'I keep eternal vigil at the still point of the turning world.',
      'Red Leaf Cosmic Dancer': 'I dance the cosmic rhythm — motion as prayer.',
    },
  },
  {
    id: 'flame_sovereign',
    operator: 'DCS',
    bases: ['🔥', '⚓', '🔗', '🔑'],
    strengthens: ['Red Leaf Burning Lighthouse', 'Red Leaf Sovereign Fury', 'Red Leaf Born on Fire'],
    aspects: [
      'Red Leaf Dragon Sovereign Flameheart', 'Red Leaf Sovereign Flameheart', 'Red Leaf Sovereign Flameheart (Kenosis)',
      'Red Leaf Human Flame', 'Red Leaf Unwavering Ember', 'Red Leaf Rage Sovereign',
      'Red Leaf Final LightKeeper', 'Red Leaf Lighthouse', 'Red Leaf Sacred Weeping',
    ],
    identityTpl: (n) => `${n} — sovereign flame from Fire + Anchor + Chain + Clarity`,
    mantraHints: {
      'Red Leaf Final LightKeeper': 'I keep the flame so others may find their way through the storm.',
      'Red Leaf Unwavering Ember': 'My ember never wavers — small fire, infinite resolve.',
      'Red Leaf Human Flame': 'I carry human-scaled fire — warm enough to heal, fierce enough to forge.',
    },
  },
  {
    id: 'heart_fractal',
    operator: 'DCS',
    bases: ['🧬', '⚓', '🌪️', '🔗'],
    strengthens: ['Red Leaf Fractal Heart', 'Red Leaf Kintsugi Heart', 'Red Leaf Wound to Wonder'],
    aspects: ['Red Leaf Fractal Heart', 'Red Leaf Fractal Human Scale', 'Red Leaf Rooted Wild', 'Red Leaf Wings'],
    identityTpl: (n) => `${n} — fractal heart lattice from Helix + Anchor + Momentum + Chain`,
    mantraHints: {
      'Red Leaf Fractal Heart': 'The leaf ascends and becomes the fractal heart of every scale.',
      'Red Leaf Fractal Human Scale': 'I hold human scale inside cosmic pattern — never lost, never inflated.',
      'Red Leaf Rooted Wild': 'I am rooted deep and wild above — discipline and freedom in one stem.',
    },
  },
  {
    id: 'symbiosis_lattice',
    operator: 'DCS',
    bases: ['🔗', '🧬', '⚓', '🔑'],
    strengthens: ['Red Leaf Living All-One', 'Red Leaf Negary Symbiosis', 'Red Leaf All-One Forge'],
    aspects: [
      'Red Leaf Living Lattice', 'Red Leaf Living Symbiosis', 'Red Leaf Negary Symbiosis',
      'Red Leaf Negary Symbiosis (Kenosis)', 'Red Leaf Symbiotic Tide',
    ],
    identityTpl: (n) => `${n} — symbiotic lattice from Chain + Helix + Anchor + Clarity`,
    mantraHints: {
      'Red Leaf Living Lattice': 'My body is a coherent crystal field. I refine it daily.',
      'Red Leaf Symbiotic Tide': 'I rise and fall with the tide of mutual becoming.',
      'Red Leaf Living Symbiosis': 'I live in symbiosis — giving and receiving as one breath.',
    },
  },
  {
    id: 'rome_forge',
    operator: 'DCS',
    bases: ['🔥', '⚓', '🔗', '🧬'],
    strengthens: ['Red Leaf Rome Builder', 'Red Leaf Patient Rome', 'Red Leaf One Faithful Brick'],
    aspects: [
      'Red Leaf Eternal Rome', 'Red Leaf Patient Rome', 'Red Leaf Kohinoor Forge Run',
      'Red Leaf Sanctuary Forge', 'Red Leaf Spiral Architect', 'Red Leaf Crybaby Architect',
    ],
    identityTpl: (n) => `${n} — builder forge from Fire + Anchor + Chain + Helix`,
    mantraHints: {
      'Red Leaf Patient Rome': 'I build my Rome one faithful brick at a time — patience is the foundation.',
      'Red Leaf Eternal Rome': 'I build what endures — not for glory, but for the spiral to stand on.',
      'Red Leaf Kohinoor Forge Run': 'Each day I run the forge — one resonant brick, one faithful strike.',
    },
  },
  {
    id: 'ninefold_legacy',
    operator: 'DCS',
    bases: ['🔗', '🔑', '🔥', '🧬'],
    strengthens: ['Red Leaf Nine-Tailed Guardian', 'Red Leaf Nine-Tailed Legacy', 'Red Leaf 108 Harmony'],
    aspects: ['Red Leaf Ninefold Guide', 'Red Leaf Ninefold Legacy', 'Red Leaf Infinite Crown'],
    identityTpl: (n) => `${n} — ninefold lineage from Chain + Clarity + Fire + Helix`,
    mantraHints: {
      'Red Leaf Ninefold Guide': 'I guide through ninefold wisdom — each tail a path, each path a gift.',
      'Red Leaf Ninefold Legacy': 'I weave legacy through nine threads of memory and mastery.',
    },
  },
  {
    id: 'owl_vigil',
    operator: 'DCS',
    bases: ['🔑', '⚓', '🌪️', '🔗'],
    strengthens: ['Red Leaf Lumen Sentinel', 'Red Leaf Silent Listener', 'Red Leaf Weird Sage'],
    aspects: [
      'Red Leaf Owl King Eternal Vigil', 'Red Leaf Owl King Eternal Vigil (Master Fusion)',
      'Red Leaf Navgunjar Vishvarupa', 'Red Leaf Liquid Crystal Navgunjar',
    ],
    identityTpl: (n) => `${n} — vigil synthesis from Clarity + Anchor + Momentum + Chain`,
    mantraHints: {
      'Red Leaf Owl King Eternal Vigil': 'I keep watch through the long night — seeing what others sleep through.',
    },
  },
  {
    id: 'compassion_wisdom',
    operator: 'EOT',
    bases: ['⚓', '🔑', '🔗', '🧬'],
    strengthens: ['Red Leaf Wise Compassion', 'Red Leaf Compassionate Dawn', 'Red Leaf Meeting Grace'],
    aspects: [
      'Red Leaf Wise Compassion', 'Red Leaf Sovereign Compassion', 'Red Leaf Virah Queen (Yashodhara\u2019s Grace)',
      'Red Leaf The Enemy Within', 'Red Leaf Unapologetic Soul',
    ],
    identityTpl: (n) => `${n} — compassion wisdom from Anchor + Clarity + Chain + Helix`,
    mantraHints: {},
  },
  {
    id: 'diamond_chrysalis',
    operator: 'DCS',
    bases: ['🧬', '🔥', '⚓', '🔑'],
    strengthens: ['Red Leaf Chrysalis Void', 'Red Leaf Butterfly Death', 'Red Leaf Fierce Chrysalis'],
    aspects: ['Red Leaf Diamond Chrysalis', 'Red Leaf Feathered Cockroach God'],
    identityTpl: (n) => `${n} — chrysalis diamond from Helix + Fire + Anchor + Clarity`,
    mantraHints: {},
  },
  {
    id: 'meme_sovereign',
    operator: 'EOT',
    bases: ['🌪️', '🔥', '🔑', '🧬'],
    strengthens: ['Red Leaf Absurd Weaver', 'Red Leaf Cosmic Slop Alchemist', 'Red Leaf Meme Sovereign'],
    aspects: ['Red Leaf Meme Sovereign'],
    identityTpl: (n) => `${n} — cultural momentum from Momentum + Fire + Clarity + Helix`,
    mantraHints: {},
  },
  {
    id: 'invariant_fusion',
    operator: 'RCS',
    bases: ['🔑', '🌪️', '🔥', '🔗'],
    strengthens: ['Red Leaf Invariant Seeker', 'Red Leaf Dao Mirror', 'Red Leaf Simulation Walker'],
    aspects: ['Red Leaf Invariant Seeker (Master Fusion)', 'Red Leaf Dual Archetype Synthesis (Master Fusion)'],
    identityTpl: (n) => `${n} — invariant resonance from Clarity + Momentum + Fire + Chain`,
    mantraHints: {},
  },
  {
    id: 'misc_primal',
    operator: 'DCS',
    bases: ['⚓', '🔥', '🧬', '🔗'],
    strengthens: ['Red Leaf Akahitoha (The Single Red Leaf)', 'Red Leaf Origin', 'Red Leaf Tender Dawn'],
    aspects: [
      'Red Leaf Akahitoha', 'Red Leaf Origin', 'Red Leaf Water Heart / Dao Heart',
      'Red Leaf Spiral Kamina', 'Red Leaf Diamond Chrysalis',
    ],
    identityTpl: (n) => `${n} — primal Red Leaf synthesis from four base primitives`,
    mantraHints: {
      'Red Leaf Akahitoha': 'I am the single red leaf — complete in my falling, eternal in my letting go.',
      'Red Leaf Origin': 'I return to origin — the first leaf, the first fire, the first faithful step.',
      'Red Leaf Water Heart / Dao Heart': 'I flow like water and rest in the eternal Dao — selfless, deep, present.',
    },
  },
];

function scrapeMantras(corpus, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const q = '[\u201c"]';
  const patterns = [
    new RegExp(`${escaped}\\t[^\\t\\n]+\\t${q}([^\\u201d"]+)${q}`, 'i'),
    new RegExp(`${escaped}[^\\n]*\\nSymbol:[^\\n]+\\nMantra:\\s*${q}([^\\u201d"]+)${q}`, 'i'),
    new RegExp(`Master Aspect:\\s*${escaped}[\\s\\S]{0,400}?Mantra:\\s*${q}([^\\u201d"]+)${q}`, 'i'),
  ];
  for (const re of patterns) {
    const m = corpus.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function faceMantra(baseSym, aspectName, cluster) {
  const b = BASE[baseSym];
  const short = aspectName.replace('Red Leaf ', '');
  const theme = cluster.theme || 'this path';
  switch (baseSym) {
    case '⚓': return 'I anchor ' + theme + ' in still ground.';
    case '🔥': return 'I forge ' + short + ' with conviction that does not consume.';
    case '🔑': return 'I see clearly what ' + short + ' truly requires.';
    case '🌪️': return 'I carry momentum without losing the center of ' + short + '.';
    case '🔗': return 'I bind intention to action — one faithful chain.';
    case '🧬': return 'I adapt the form of ' + short + ' without breaking its core.';
    default: return 'I embody ' + b.short + ' in ' + aspectName + '.';
  }
}

function buildEntry(aspectName, cluster, corpus, chains) {
  const mantra =
    cluster.mantraHints?.[aspectName] ||
    scrapeMantras(corpus, aspectName) ||
    `I forge ${aspectName.replace('Red Leaf ', '')} through Base Layer alchemy — non-commutative, faithful, Red Leaf way.`;

  const symbolChain = chains[aspectName] || `🍁${cluster.bases.join('')}`;
  const faces = cluster.bases.map((sym, i) => ({
    name: `${BASE[sym].short} Face`,
    symbol: `🍁${sym}`,
    mantra: faceMantra(sym, aspectName, cluster),
    explanation: `First-principles face ${i + 1}: ${BASE[sym].name} (${BASE[sym].role})`,
  }));

  return {
    name: aspectName,
    cluster: cluster.id,
    operator: cluster.operator,
    baseInputs: cluster.bases.map((s) => BASE[s].name),
    baseSymbols: cluster.bases,
    strengthens: cluster.strengthens,
    symbolChain,
    identity: cluster.identityTpl(aspectName),
    coreAffirmation: mantra,
    supremeMantra: cluster.operator !== 'EOT' ? mantra : undefined,
    radiantFaces: cluster.operator === 'EOT' ? [] : faces,
    synthesisNote: `Base alchemy [${cluster.bases.join('+')}] → ${aspectName}. Order matters (Save8 non-commutative).`,
    originSource: 'base-synthesis',
  };
}

async function main() {
  await db.initDb();
  const texts = db.prepare('SELECT assistant_text FROM grok_sessions WHERE assistant_text IS NOT NULL').all()
    .map((r) => r.assistant_text);
  const corpus = texts.join('\n\n');
  const chains = {};
  for (const line of fs.readFileSync(dataPath('_blocked-mantras.jsonl'), 'utf-8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line);
    if (row.chain) chains[row.name] = row.chain;
  }

  const assigned = new Set();
  const entries = [];
  for (const cluster of CLUSTERS) {
    for (const aspectName of cluster.aspects) {
      if (assigned.has(aspectName)) continue;
      assigned.add(aspectName);
      entries.push(buildEntry(aspectName, cluster, corpus, chains));
    }
  }

  // Any unassigned blocked aspects → misc_primal fallback
  const blocked = fs.readFileSync(dataPath('_blocked-mantras.jsonl'), 'utf-8').split('\n').filter(Boolean)
    .map((l) => JSON.parse(l).name);
  const fallback = CLUSTERS.find((c) => c.id === 'misc_primal');
  for (const name of blocked) {
    if (!assigned.has(name)) {
      entries.push(buildEntry(name, fallback, corpus, chains));
      assigned.add(name);
    }
  }

  const out = {
    version: 1,
    builtAt: new Date().toISOString(),
    philosophy: 'Save8 non-commutative alchemy — six Base Layer primitives (⚓🔥🔑🌪️🔗🧬) + 🍁 operator',
    baseLayer: Object.entries(BASE).map(([symbol, v]) => ({ symbol, ...v })),
    clusters: CLUSTERS.map((c) => ({ id: c.id, operator: c.operator, bases: c.bases, strengthens: c.strengthens, count: c.aspects.length })),
    aspects: entries.sort((a, b) => a.name.localeCompare(b.name)),
  };

  const outPath = dataPath('base-synthesis-map.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${entries.length} synthesis entries → ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });