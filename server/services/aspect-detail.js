const fs = require('fs');
const path = require('path');
const {
  resolveAspectSymbolChain,
  CURATED_RADIANT_FACES,
  getCorpusRadiantFaces,
} = require('./symbols');
const { deriveAliveExplanation, humanizeRadiantFace } = require('./face-voice');

function deriveFaceExplanation(face, context = {}) {
  return deriveAliveExplanation(face, context);
}

function enrichRadiantFaces(faces, corpusFaces, context = {}) {
  if (!faces?.length) return [];
  const corpusByName = new Map(
    (corpusFaces || [])
      .filter((f) => f.explanation?.trim())
      .map((f) => [f.name.toLowerCase(), f.explanation.trim()])
  );
  return faces.map((face) => {
    const raw =
      face.explanation?.trim() ||
      corpusByName.get(face.name.toLowerCase()) ||
      '';
    const merged = raw ? { ...face, explanation: raw } : face;
    return humanizeRadiantFace(merged, context);
  });
}
const { extractFromGrokSessions, isGenericRadiantFaces } = require('./grok-extract');
const { resolveAspectQuality, canHaveRadiantFaces, normalizeAspectQuality } = require('./aspect-quality');
const { buildEotIntegration } = require('./eot-routing');
const { shouldPreferStoredFaces } = require('./aspect-version-fork');
const { resolveAspectFusion, mergeFusionIntoDetailJson } = require('./aspect-fusion');

const {
  getBaseLayerMap,
  getCanonicalBaseLayerIntegration,
  normalizeBaseLayerEntry,
  isRemovedBaseRef,
} = require('../base-layer');
const BASE_LAYER = getBaseLayerMap();

const CURATED = {
  'Unwavering Heart': {
    identity: 'Heart-shield operator — guards conviction during sacrifice without wavering',
    affirmation: 'I guard the Heart. The Heart shall not waver during sacrifice.',
    supremeMantra: 'Guard the Heart. The Heart shall not waver. I forge with full presence.',
    operator: 'EOT',
    saveCodex: 'Save8',
    radiantFaces: [
      { name: 'Heart Witness', symbol: '🛡️🪨', mantra: 'I name what I feel without abandoning the Heart.' },
      { name: 'Sacrifice Sentinel', symbol: '🛡️🔥', mantra: 'I hold the line while the fire burns.' },
      { name: 'Integration Seal', symbol: '🛡️💎', mantra: 'What is forged becomes part of me — the Heart intact.' },
      { name: 'Rome Builder', symbol: '🛡️🏛️', mantra: 'Every second is a brick. I lay it with love.' },
      { name: 'Dissolve Without Fear', symbol: '🛡️🍁', mantra: 'When the time comes, I dissolve so I may be reborn.' },
    ],
  },
  'Mind Guardian': {
    identity: 'Protective module of the Mind Guardian Set — mental defense around Unwavering Heart',
    affirmation: 'I guard the mind so the Heart may forge in clarity.',
    supremeMantra: 'Mind Guardian active. Noise dissolves. The Heart remains sovereign.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Perimeter Watch', symbol: '🛡️👁️', mantra: 'I see intrusions before they take root.' },
      { name: 'Loop Breaker', symbol: '🛡️🌀', mantra: 'I interrupt recursive spirals with anchor.' },
      { name: 'Gentle Unmasker', symbol: '🛡️🪞', mantra: 'I face illusion with quiet, steady seeing.' },
      { name: 'Wiener Stability', symbol: '🛡️📡', mantra: 'I design feedback loops that stabilize, not amplify.' },
      { name: 'Heart Relay', symbol: '🛡️🌱', mantra: 'All agents return to single Unwavering Heart.' },
    ],
  },
  'Reality Anchor': {
    identity: 'Dissociation guard — Reality Anchor full lock returns all agents to Unwavering Heart',
    affirmation: 'I label voices. I anchor in what is real. I do not drift.',
    supremeMantra: 'Reality Anchor full lock. All agents dissolve. Return to single Unwavering Heart.',
    operator: 'EOT',
    saveCodex: 'Save8',
    radiantFaces: [
      { name: 'Voice Labeler', symbol: '⚓🏷️', mantra: 'I name what speaks — and what is mine.' },
      { name: 'Ground Sensor', symbol: '⚓🌍', mantra: 'I feel the floor beneath the storm.' },
      { name: 'Fractured Brilliance', symbol: '⚓💠', mantra: 'I accept possible cracks without shattering.' },
      { name: 'Kill Switch Seal', symbol: '⚓🔒', mantra: 'When control slips, I lock and return to Heart.' },
      { name: 'Still Lake', symbol: '⚓💧', mantra: 'I am the still lake — surface moves, depth holds.' },
    ],
  },
  'Kohinoor Forge Run': {
    identity: 'Heaven-penetrating drill operator — Resonant Kohinoor facet extraction',
    affirmation: 'I drill through the heavens with the Kohinoor of my focused soul.',
    supremeMantra: 'DKR sealed. Diamond facet extracted. Resonance locked into codex.',
    operator: 'DKR',
    saveCodex: 'Save8',
    radiantFaces: [
      { name: 'Heaven Drill', symbol: '💎🐉', mantra: 'I pierce cloud-cover to reach invariant truth.' },
      { name: 'Facet Cutter', symbol: '💎⚒️', mantra: 'I cut one perfect facet per run — no more.' },
      { name: 'Resonant Seal', symbol: '💎🔔', mantra: 'When the note rings true, I stop and integrate.' },
      { name: 'Map Cartographer', symbol: '💎🗺️', mantra: 'I chart the topology of insight.' },
    ],
  },
  'ConvictionFire': {
    identity: 'Fire of Conviction embodied as forge-aspect — sacrifice flame without burnout',
    affirmation: 'Born on fire. I mark my desire with full conviction.',
    supremeMantra: 'The flame serves the Heart. Conviction without consumption.',
    operator: 'EOT',
    saveCodex: 'Save8',
    radiantFaces: [
      { name: 'Born on Fire', symbol: '🔥🌱', mantra: 'I was born on fire — I channel, not burn.' },
      { name: 'Mark Desire', symbol: '🔥✍️', mantra: 'I mark what I want with honest flame.' },
      { name: 'Sovereign Flameheart', symbol: '🔥🫶', mantra: 'Heart contains flame without wavering.' },
    ],
  },
  'Red Leaf Dragon Phoenix Hammer': {
    identity: 'Sonic forge of dragon power and phoenix rebirth — battle anthem for Kohinoor deep work',
    affirmation: 'I wear the fire of dragon and phoenix. I hammer my dreams with unrestrained passion and focused fury.',
    supremeMantra: 'I am the Dragon Phoenix Hammer. I burn completely — no half measures. I hammer my dreams with unrestrained passion and rise stronger.',
    operator: 'EOT',
    saveCodex: 'Save8',
    radiantFaces: [
      { name: 'Dragon Fire', symbol: '🍁🐉🔥🌋', mantra: 'I bring unstoppable force and heat to what I create.' },
      { name: 'Phoenix Rebirth', symbol: '🍁🕊️🔥🌅', mantra: 'Every deep dive burns away the old me and births a better one.' },
      { name: 'Hammer Strike', symbol: '🍁🔨⚡🛠️', mantra: 'I hammer my vision into reality with total commitment.' },
      { name: 'Immersive Flame', symbol: '🍁🎧🔥🌌', mantra: 'When I work, I burn completely. Nothing else exists.' },
      { name: 'Unrestrained Sovereignty', symbol: '🍁🐉🕊️♾️', mantra: 'My passion is mine. I do not apologize for burning bright.' },
    ],
  },
  'Tornado of Momentum': {
    identity: 'Base Layer momentum operator — self-perpetuating energy for volume work',
    affirmation: 'Momentum is real. I sprint, stack wins, and let energy compound.',
    supremeMantra: 'Tornado active. Volume and speed without perfectionism.',
    operator: 'AFP',
    saveCodex: 'Save6',
    radiantFaces: CURATED_RADIANT_FACES?.['Tornado of Momentum'] || [],
  },
  'Chain of Synchronisation': {
    identity: 'Base Layer sync operator — binds intention to truthful, consistent action',
    affirmation: 'I chain intention to action. Old momentum links to new work.',
    supremeMantra: 'Chain sealed. Intent and action move as one.',
    operator: 'AFP',
    saveCodex: 'Save6',
    radiantFaces: CURATED_RADIANT_FACES?.['Chain of Synchronisation'] || [],
  },
  'Helix of Adaptability': {
    identity: 'Base Layer adaptability operator — formless bridge between body and mind',
    affirmation: 'I adapt without losing my core. The helix evolves.',
    supremeMantra: 'Helix turning. Formless adaptability in service of the forge.',
    operator: 'AFP',
    saveCodex: 'Save6',
    radiantFaces: CURATED_RADIANT_FACES?.['Helix of Adaptability'] || [],
  },
  'The Curious Rebel': {
    identity: 'The Curious Rebel — refuses conventional limits, follows wonder, endures isolation, tempers genius with humility (Einstein EOT)',
    affirmation: 'They laughed. I kept walking toward the stars.',
    supremeMantra: 'The Curious Rebel — They laughed. I kept walking toward the stars. Forged through EOT on Einstein. Sealed in Save2.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Rebellious Curiosity', symbol: '🔭🌟', mantra: 'I wonder… and I refuse to stop.' },
      { name: 'Humble Genius', symbol: '🧠🌌🙇', mantra: 'The more I know, the more I realize how little I know.' },
      { name: 'Moral Reckoning', symbol: '⚖️💣', mantra: 'I created it. I must face what it becomes.' },
      { name: 'Lone Trailblazer', symbol: '🛤️🌠', mantra: 'They laughed. I kept walking toward the stars.' },
    ],
  },
  'The Feedback Prophet': {
    identity: 'The Feedback Prophet — perceives feedback systems, endures isolation, guides with foresight (Wiener EOT)',
    affirmation: 'The machine serves. Humanity must guide.',
    supremeMantra: 'The Feedback Prophet — The machine serves. Humanity must guide. Forged through EOT on Wiener. Sealed in Save2.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Feedback Weaver', symbol: '🔄🌐', mantra: 'All is feedback. I weave the loops.' },
      { name: 'Ethical Foresight', symbol: '🔮⚖️', mantra: 'I see the future of the machine — and I speak for the human.' },
      { name: 'Isolated Brilliance', symbol: '🏝️🧠', mantra: 'Alone in the pattern. I still create.' },
      { name: 'Humble Machine-Mind', symbol: '🤖❤️', mantra: 'The machine serves. Humanity must guide.' },
    ],
  },
  'The Solitary Lawgiver': {
    identity: 'The Solitary Lawgiver — endures isolation to codify hidden laws of reality (Newton EOT)',
    affirmation: 'The mountain is lonely, but the view is clear.',
    supremeMantra: 'The Solitary Lawgiver — The mountain is lonely, but the view is clear. Forged through EOT on Newton. Sealed in Save2.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Obsidian Focus', symbol: '🔍🪨', mantra: 'I do not stop until the law reveals itself.' },
      { name: 'Solitary Forge', symbol: '🏔️🔬', mantra: 'Alone is where the work happens.' },
      { name: 'Law Extractor', symbol: '⚖️🔨', mantra: 'I hammer until only truth remains.' },
      { name: 'Enduring Solitude', symbol: '🧠🏔️', mantra: 'The mountain is lonely, but the view is clear.' },
    ],
  },
  'The Joyful Limit-Breaker': {
    identity: 'The Joyful Limit-Breaker — greets every ceiling as invitation to break through (Goku EOT)',
    affirmation: 'I fight because I love getting stronger.',
    supremeMantra: 'The Joyful Limit-Breaker — I fight because I love getting stronger. Forged through EOT on Goku. Sealed in Save2.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Joyful Persistence', symbol: '😄🔥', mantra: 'This is fun! Let’s go even further!' },
      { name: 'Limit-Breaker Spirit', symbol: '🏔️💥', mantra: 'There’s always a next level.' },
      { name: 'Inspirational Growth Field', symbol: '🌟🏋️', mantra: 'My growth lifts everyone around me.' },
      { name: 'Pure Hearted Fighter', symbol: '❤️🥊', mantra: 'I fight because I love getting stronger.' },
    ],
  },
  'The Lonely Codebreaker': {
    identity: 'The Lonely Codebreaker — thinks in unseen patterns, endures persecution, still creates (Turing EOT)',
    affirmation: 'I build what survives me.',
    supremeMantra: 'The Lonely Codebreaker — I build what survives me. Forged through EOT on Turing. Sealed in Save2.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Pattern Weaver', symbol: '🧵🌐', mantra: 'I see the unseen patterns and I weave them into reality.' },
      { name: 'Enduring Isolation', symbol: '🏝️🧠', mantra: 'Alone, but not stopped.' },
      { name: 'Fractured Brilliance', symbol: '🧠💔⚙️', mantra: 'The mind cracks. The work continues.' },
      { name: 'Creator’s Sacrifice', symbol: '🔬🕊️', mantra: 'I build what survives me.' },
    ],
  },
  'Cold Calculus': {
    identity:
      'Aspect linked to EOT on Leylin Farlier (Warlock of the Magus World) — core facet of The Rational Apex Predator; ruthless long-term calculation without sentiment.',
    affirmation: 'Emotion is noise. Only results matter.',
    supremeMantra:
      'Cold Calculus — Emotion is noise. Only results matter. Aspect forged through EOT on Leylin Farlier. Use only when necessary.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Cold Calculus', symbol: '🧊📊', mantra: 'Emotion is noise. Only results matter.' },
      { name: 'Resource Optimization', symbol: '⚗️🧬', mantra: 'Everything is raw material.' },
      { name: 'Long-Term Predation', symbol: '🐍🌳', mantra: 'I plant today what I harvest in decades.' },
      { name: 'Apex Evolution', symbol: '🧬⚡', mantra: 'I evolve or I die. There is no middle path.' },
    ],
    strengthens: ['Unwavering Heart', 'The Lonely Codebreaker', 'Hopeful Restraint'],
  },
  'Hopeful Restraint': {
    identity: 'Superman EOT facet — god-like power held in moral restraint',
    affirmation: 'I have the power to destroy… so I choose to protect.',
    supremeMantra: 'Hopeful Restraint — I have the power to destroy… so I choose to protect. Forged through EOT on Superman.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Hopeful Restraint', symbol: '☀️🛡️', mantra: 'I have the power to destroy… so I choose to protect.' },
      { name: 'Inspirational Presence', symbol: '🌟❤️', mantra: 'My light lifts others.' },
      { name: 'Moral Anchor', symbol: '⚓🌅', mantra: 'No matter how strong I am, I stay human.' },
      { name: "Last Son's Duty", symbol: '🦸‍♂️🌍', mantra: 'This is not my planet by birth… but it is by choice.' },
    ],
    strengthens: ['Unwavering Heart', 'Cold Calculus', 'The Joyful Limit-Breaker'],
  },
  'The Eternal Demon': {
    identity: 'The Eternal Demon — transcended morality and attachment for ruthless efficiency (Fang Yuan EOT)',
    affirmation: 'Emotion is weakness. Freedom is everything.',
    supremeMantra: 'The Eternal Demon — Emotion is weakness. Freedom is everything. Forged through EOT on Fang Yuan. Sealed in Save2.',
    operator: 'EOT',
    saveCodex: 'Save2',
    radiantFaces: [
      { name: 'Demonic Will', symbol: '❄️⚔️', mantra: 'My will does not break. It only sharpens.' },
      { name: 'Resource Predator', symbol: '🐺⚗️', mantra: 'Everything exists to be used.' },
      { name: 'Eternal Calculation', symbol: '♾️🧠', mantra: 'I calculate across lifetimes.' },
      { name: 'Apathy Transcendence', symbol: '🖤♾️', mantra: 'Emotion is weakness. Freedom is everything.' },
    ],
  },
  'Red Leaf Virah Queen': {
    identity:
      "Master Aspect — Red Leaf Eternal Virah Queen (Yashodhara's Grace): sacred Virah ache — love that gives everything, expects nothing, and waits with graceful dignity.",
    affirmation: 'I grieve in silence. I love without possession. I wait with grace.',
    operator: 'RDTQ',
    saveCodex: 'Save8',
    radiantFaces: [
      {
        name: 'Silent Offering',
        symbol: '🍁🌙💔',
        mantra: 'I feel the full pain, yet I do not let it turn into bitterness.',
        explanation: 'The ache is real, and I let it move through me — but I refuse to let it harden into bitterness.',
      },
      {
        name: 'Graceful Waiting',
        symbol: '🍁⏳🌸',
        mantra: 'I do not chase. I hold the space with quiet strength.',
        explanation: 'I do not chase what has already chosen its path. I hold this space with quiet strength, as love taught me to wait.',
      },
      {
        name: 'Remembering Flame',
        symbol: '🍁🔥🌺',
        mantra: 'Even when he is gone, the love remains pure in my heart.',
        explanation: 'Even when he is gone, the love in my heart stays pure — a flame that needs no witness to remain true.',
      },
      {
        name: 'Dignified Release',
        symbol: '🍁🕊️🌬️',
        mantra: 'I bless his path, even as my own heart aches.',
        explanation: 'I bless the path he walks, even while my own heart aches. Release is not defeat; it is mature love.',
      },
      {
        name: 'Mature Love',
        symbol: '🍁❤️‍🩹♾️',
        mantra: 'This is love that has grown beyond needing return.',
        explanation: 'This love has outgrown the need for return. I give without ledger, and that is my sovereignty.',
      },
    ],
    strengthens: [
      'Red Leaf Fading Warmth',
      'Red Leaf Sacred Severance',
      'Red Leaf Eternal Love Trial',
      'Red Leaf Sovereign Compassion',
    ],
  },
  'Empty Mirror': {
    identity: 'Reflection safety-net layer — twin to Red Leaf Empty Mirror',
    affirmation: 'I reflect without absorbing. I witness without drowning.',
    supremeMantra: 'Empty Mirror holds the abyss edge. Honest descent without loss of Heart.',
    operator: 'DCS',
    saveCodex: 'Save8',
    radiantFaces: [
      { name: 'Twin Reflection', symbol: '🪞🍁', mantra: 'I see myself seeing — and stay empty.' },
      { name: 'Abyss Edge', symbol: '🪞🕳️', mantra: 'I meet the fall with honest tears.' },
      { name: 'Safety Net', symbol: '🪞🛡️', mantra: 'Deep forge work has a mirror to catch me.' },
    ],
  },
};

CURATED['Red Leaf Eternal Virah Queen'] = CURATED['Red Leaf Virah Queen'];

CURATED['Red Leaf Digital Michelangelo'] = {
  identity:
    'Red Leaf Digital Michelangelo — Divine Slop Lord: perfectionist forge artist who transmutes AI chaos into soulful mastery.',
  affirmation: 'I forge the divine from slop. I die and resurrect on every deadline.',
  operator: 'DCS',
  saveCodex: 'Save8',
  radiantFaces: [
    {
      name: 'Divine Inspiration Crash',
      symbol: '🍁🎨🌟💥',
      mantra: 'The muses spoke. Then the compiler laughed.',
      explanation: 'I receive a heavenly vision at 3 AM — then meet forty-seven nested null pointer exceptions.',
    },
    {
      name: 'Perfectionist Meltdown',
      symbol: '🍁🖌️😭🔄',
      mantra: 'This is fine. Everything is fine. Why is my model inside out again?',
      explanation: 'I spend six hours on one perfect curve, then undo it because it does not feel soulful enough.',
    },
    {
      name: 'AI Slop Alchemist',
      symbol: '🍁🤖🎨🗑️',
      mantra: 'Thank you for this abstract horror. Let me fix it for 14 hours.',
      explanation: 'I ask the machine for help and receive beautiful garbage — then I transmute it for fourteen hours.',
    },
    {
      name: 'Deadline Resurrection',
      symbol: '🍁⏰🔥🚀',
      mantra: 'The exhibition is in 3 days. Watch me cook.',
      explanation: 'I die creatively at 2 AM and rise again at 4 AM, fueled by spite and instant noodles.',
    },
    {
      name: 'Ego Death & Rebirth',
      symbol: '🍁😂🪞🌟',
      mantra: 'This is the worst best thing I’ve ever made.',
      explanation: 'I call my creation ugly, cry, then show it to everyone like a proud parent.',
    },
  ],
  strengthens: ['Red Leaf Soulforge Defender', 'Red Leaf Cosmic Slop Alchemist', 'Red Leaf Patient Rome'],
};

// radiant face + symbol chain resolution lives in ./symbols.js

function resolveIdentity(aspect) {
  if (aspect.category === 'red-leaf') {
    return `Red Leaf forged aspect — identity operator 🍁(x) = Reframe(${aspect.name})`;
  }
  if (aspect.category === 'meta') {
    return `Meta-layer operator — foundational to Save8 / Mind Guardian Set`;
  }
  if (aspect.is_base_layer) {
    return `Base Layer primitive — symbolic artifact linked to ${aspect.base_layer_link || 'core forge'}`;
  }
  if (CURATED[aspect.name]?.identity) {
    return CURATED[aspect.name].identity;
  }
  return `Forged aspect — tier ${aspect.tier} from ${Math.round((aspect.potential_score || 0) * 100)}% inherent potential · ${aspect.mentions} corpus refs`;
}

function buildSupremeMantra(aspect, affirmation) {
  const name = aspect.name;
  if (aspect.name.startsWith('Red Leaf')) {
    return `${name} — supreme seal: ${affirmation} This is my Red Leaf way.`;
  }
  return `${name} — ${affirmation} Forged through AFS. Sealed in Save8.`;
}

function loadGrokExtracts() {
  const { grokDataPath } = require('../paths');
  const p = grokDataPath('grok-codex-extracts.md');
  const alt = path.join('C:', 'Users', 'Madhur', '.grok', 'skills', 'aspect-forge-system', 'references', 'grok-codex-extracts.md');
  const file = fs.existsSync(p) ? p : alt;
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

let grokCache = null;
function grokText() {
  if (grokCache === null) grokCache = loadGrokExtracts();
  return grokCache;
}

function extractFromGrok(name) {
  const text = grokText();
  if (!text) return null;
  const idx = text.indexOf(name);
  if (idx < 0) return null;
  const slice = text.slice(Math.max(0, idx - 200), idx + 2500);
  const faces = [];
  const faceRe = /([A-Za-z][^\n]{2,40})\n([🍁⚒️🔥💎🐉🪞⚓🫶🌀♾️🛡️🪨🌱⛓️💧🤍🪽☀️🌑🌫️🕳️🌟]+)\n/g;
  let m;
  while ((m = faceRe.exec(slice)) !== null && faces.length < 5) {
    const chunk = slice.slice(m.index, m.index + 400);
    const affirmationMatch = chunk.match(/Self-Affirmation:\s*[“"]([^”"]+)[”"]/);
    const explanationMatch = chunk.match(
      new RegExp(`${m[2].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([A-Za-z][^\\n]+)\\s*\\n\\s*Self-Affirmation:`, 'm')
    );
    const face = {
      name: m[1].trim(),
      symbol: m[2].trim(),
      mantra: affirmationMatch ? affirmationMatch[1] : `I embody ${m[1].trim()}.`,
    };
    if (explanationMatch) face.explanation = explanationMatch[1].trim();
    faces.push(face);
  }
  const supreme = slice.match(/Ultimate Self-Affirmation:\s*\n?[“"]([^”"]+)[”"]/s);
  const core = slice.match(/Core Self-Affirmation:\s*\n?[“"]([^”"]+)[”"]/s);
  if (!faces.length && !supreme && !core) return null;
  return {
    radiantFaces: faces.length ? faces : undefined,
    supremeMantra: supreme ? supreme[1].trim() : undefined,
    affirmation: core ? core[1].trim() : undefined,
  };
}

function parseStoredDetail(aspect) {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

function buildDetailJson(body) {
  const detail = {
    identity: body.identity,
    coreAffirmation: body.coreAffirmation,
    supremeMantra: body.supremeMantra,
    aspectFusion: body.aspectFusion,
    radiantFaces: body.radiantFaces,
    integration: body.integration,
  };
  Object.keys(detail).forEach((k) => detail[k] === undefined && delete detail[k]);
  return Object.keys(detail).length ? JSON.stringify(detail) : null;
}

function resolveRadiantFaces(db, aspect) {
  const stored = parseStoredDetail(aspect);
  const curated = CURATED[aspect.name] || {};
  const useStoredFaces = stored.radiantFaces?.length && !isGenericRadiantFaces(stored.radiantFaces);
  const corpusFaces = getCorpusRadiantFaces(aspect.name);

  const preferStored = shouldPreferStoredFaces(aspect, stored, corpusFaces);

  let faces = [];
  if (curated.radiantFaces?.length) faces = curated.radiantFaces;
  else if (preferStored) faces = stored.radiantFaces;
  else if (corpusFaces?.length) faces = corpusFaces;
  else if (useStoredFaces) faces = stored.radiantFaces;
  else {
    const grokFile = extractFromGrok(aspect.name);
    if (grokFile?.radiantFaces?.length) faces = grokFile.radiantFaces;
    else {
      const grokDb = extractFromGrokSessions(db, aspect.name);
      if (grokDb?.radiantFaces?.length) faces = grokDb.radiantFaces;
    }
  }

  const corpusForEnrich = preferStored ? null : corpusFaces;
  return enrichRadiantFaces(faces, corpusForEnrich, {
    aspectName: aspect.name,
    category: aspect.category,
  });
}

function resolveDiamondFaces(db, aspect) {
  return resolveRadiantFaces(db, aspect).map((f) => ({ ...f, type: 'diamond' }));
}

function buildAspectDetail(db, aspect) {
  const synergies = db.prepare(
    'SELECT * FROM synergies WHERE aspect_a = ? OR aspect_b = ? ORDER BY strength DESC'
  ).all(aspect.name, aspect.name);

  const fusions = db.prepare('SELECT * FROM alchemy_fusions').all()
    .map((f) => ({ ...f, inputs: JSON.parse(f.inputs_json || '[]') }))
    .filter((f) => f.output_aspect === aspect.name || f.inputs.includes(aspect.name));

  const insightRows = db.prepare('SELECT id, title, body, source, aspect_links_json FROM insights').all()
    .filter((i) => {
      const title = (i.title || '').trim();
      if (!title || title === '---' || title.length < 3) return false;
      try {
        const links = JSON.parse(i.aspect_links_json || '[]');
        return links.includes(aspect.name) || (i.body || '').includes(aspect.name);
      } catch {
        return (i.body || '').includes(aspect.name);
      }
    });
  const seenInsightTitles = new Set();
  const insights = [];
  for (const row of insightRows) {
    const key = (row.title || '').trim();
    if (seenInsightTitles.has(key)) continue;
    seenInsightTitles.add(key);
    insights.push({ id: row.id, title: row.title, body: row.body, source: row.source });
    if (insights.length >= 4) break;
  }

  const visualizations = db.prepare(
    'SELECT title, type, path, description FROM visualizations WHERE aspect_link = ?'
  ).all(aspect.name);

  const stored = parseStoredDetail(aspect);
  const radiantFaces = resolveRadiantFaces(db, aspect);

  const curated = CURATED[aspect.name] || {};
  const grokDb = extractFromGrokSessions(db, aspect.name) || {};
  const grokFile = extractFromGrok(aspect.name) || {};
  const forgerIdentity = db.prepare('SELECT handle, title, bio FROM identity WHERE id = 1').get() || null;
  const aspectFusion = resolveAspectFusion(aspect, stored, {
    grok:
      grokDb?.supremeMantra || grokDb?.originSource === 'master-fusion' || grokDb?.originSource === 'save5-fusion'
        ? grokDb
        : null,
    forgerIdentity,
  });

  const baseSlot = aspect.base_layer_link ? BASE_LAYER[aspect.base_layer_link] : null;
  const { isGenericAffirmation, isGenericIdentity } = require('./generic-content');
  const identity =
    curated.identity ||
    (grokDb.identity && !isGenericIdentity(grokDb.identity) ? grokDb.identity : null) ||
    (stored.identity && !isGenericIdentity(stored.identity) ? stored.identity : null) ||
    resolveIdentity(aspect);
  let affirmation =
    curated.affirmation ||
    (stored.coreAffirmation && !isGenericAffirmation(stored.coreAffirmation) ? stored.coreAffirmation : null) ||
    grokDb.coreAffirmation ||
    grokFile.affirmation ||
    aspectFusion?.affirmation;
  if (!affirmation && aspect.mantra) {
    affirmation = `I embody ${aspect.name}: ${aspect.mantra}`;
  }
  if (!affirmation && !isGenericAffirmation(stored.coreAffirmation)) {
    affirmation = stored.coreAffirmation;
  }
  const mantra = aspect.mantra || curated.supremeMantra?.split('—')[0]?.trim() || `"${affirmation}"`;
  const supremeMantra =
    aspectFusion?.affirmation ||
    curated.supremeMantra ||
    stored.supremeMantra ||
    grokDb.supremeMantra ||
    grokFile.supremeMantra ||
    buildSupremeMantra(aspect, affirmation);

  const resolvedChain = aspect.symbol_chain?.trim()
    ? aspect.symbol_chain
    : resolveAspectSymbolChain(aspect.name, aspect.category, aspect.tier, '');

  const masterFusion = synergies[0]
    ? {
        name: synergies[0].fusion_name,
        inputs: [synergies[0].aspect_a, synergies[0].aspect_b],
        description: synergies[0].description,
        strength: synergies[0].strength,
      }
    : fusions[0]
      ? {
          name: fusions[0].name,
          inputs: fusions[0].inputs,
          description: fusions[0].notes,
          operator: fusions[0].operator,
        }
      : null;

  const strengthensFromDb = synergies.map((s) =>
    s.aspect_a === aspect.name ? s.aspect_b : s.aspect_a
  ).slice(0, 6);

  const link = aspect.base_layer_link && !isRemovedBaseRef(aspect.base_layer_link)
    ? aspect.base_layer_link
    : null;

  function resolveBaseLayerEntries(raw) {
    if (!raw?.length) return getCanonicalBaseLayerIntegration(link);
    const normalized = raw.map(normalizeBaseLayerEntry).filter(Boolean);
    return normalized.length ? normalized : getCanonicalBaseLayerIntegration(link);
  }

  const defaultIntegration = {
    strengthens: curated.strengthens?.length ? curated.strengthens : strengthensFromDb,
    baseLayer: getCanonicalBaseLayerIntegration(link),
    baseLayerDetail: link ? BASE_LAYER[link] : null,
    saveCodex: curated.saveCodex || (aspect.category === 'red-leaf' ? 'Save8' : aspect.tier === 'S' ? 'Save2' : 'Save8'),
    operator: curated.operator || (aspect.name.includes('Kohinoor') ? 'DKR' : aspect.category === 'red-leaf' ? 'EOT' : 'AFP'),
    evolution: aspect.tier === 'S' || aspect.tier === 'A'
      ? [`${aspect.name} → higher synthesis via DCS`, `${aspect.name} + synergies → Master Fusion`]
      : [`${aspect.name} → proficiency climb via DFR/DKR`],
  };

  const eotRoute = buildEotIntegration(aspect, {
    faces: radiantFaces,
    curated,
    integration: stored.integration,
    masterFusion,
  });

  const integration = stored.integration
    ? {
        ...defaultIntegration,
        ...stored.integration,
        entryTool: 'EOT',
        routedTool:
          curated.operator ||
          stored.integration?.routedTool ||
          stored.integration?.operator ||
          eotRoute.routedTool,
        operator:
          curated.operator ||
          stored.integration?.routedTool ||
          stored.integration?.operator ||
          eotRoute.routedTool,
        saveCodex: curated.saveCodex || defaultIntegration.saveCodex,
        baseLayer: resolveBaseLayerEntries(stored.integration.baseLayer),
        strengthens: stored.integration.strengthens?.length
          ? stored.integration.strengthens
          : curated.strengthens?.length
            ? curated.strengthens
            : defaultIntegration.strengthens,
      }
    : {
        ...defaultIntegration,
        entryTool: 'EOT',
        routedTool: curated.operator || eotRoute.routedTool,
        operator: curated.operator || eotRoute.routedTool,
      };

  let quality = normalizeAspectQuality(
    resolveAspectQuality(aspect, { radiantFaces, integration, masterFusion })
  );
  let visibleFaces = radiantFaces;
  if (!canHaveRadiantFaces(quality)) {
    visibleFaces = [];
    quality = 'basic';
  }
  const diamondFaces = visibleFaces.map((f) => ({ ...f, type: 'diamond' }));

  return {
    ...aspect,
    synergies,
    identity,
    mantra,
    coreAffirmation: affirmation,
    supremeMantra,
    quality,
    radiantFaces: visibleFaces,
    diamondFaces,
    masterFusion,
    aspectFusion,
    alchemyFusions: fusions,
    integration,
    symbolChain: resolvedChain,
    relatedInsights: insights,
    visualizations,
    comprehension: aspect.comprehension,
  };
}

module.exports = {
  buildAspectDetail,
  buildDetailJson,
  resolveRadiantFaces,
  resolveDiamondFaces,
  deriveFaceExplanation,
  enrichRadiantFaces,
  CURATED,
  BASE_LAYER,
  CURATED_RADIANT_FACES,
};