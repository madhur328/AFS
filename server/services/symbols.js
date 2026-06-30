/** Grapheme-safe emoji utilities and per-aspect symbol resolution. */
const fs = require('fs');
const path = require('path');

const { dataPath } = require('../paths');
const { loadSymbolMap } = require('./symbol-db');
const { applyEmojiFallbacks } = require('../../scripts/emoji-fallbacks');
const CORPUS_PATH = dataPath('aspect-corpus-symbols.json');

const ASPECT_ALIASES = {
  'Red Leaf Born': 'Red Leaf Born on Fire',
  'Red Leaf Phoenix Hammer': 'Red Leaf Dragon Phoenix Hammer',
  'Red Leaf Heart': 'Wonderful Red Leaf Heart',
  'Red Leaf Virah Queen': 'Red Leaf Eternal Virah Queen',
  'Red Leaf Rome': 'Red Leaf Eternal Rome',
  'Red Leaf Digital Rome': 'Red Leaf Eternal Rome',
  'Red Leaf Digital Michelangelo (The Divine Slop Lord)': 'Red Leaf Digital Michelangelo',
  'Red Leaf Digital Michelangelo – Divine Slop Lord': 'Red Leaf Digital Michelangelo',
  'Red Leaf Digital Michelangelo – Divine Slop Lord (New)': 'Red Leaf Digital Michelangelo',
  'Red Leaf Digital Michelangelo – Divine Slop Lord?': 'Red Leaf Digital Michelangelo',
};

/** Short / alias names → canonical Grok + corpus lookup target */
const ENRICH_ALIASES = {
  'Red Leaf Phoenix Hammer': 'Red Leaf Dragon Phoenix Hammer',
  'Red Leaf Digital Rome': 'Red Leaf Eternal Rome',
  'Red Leaf Human Flame': 'Red Leaf Eternal Human Flame',
  'Red Leaf Human Flame?': 'Red Leaf Eternal Human Flame',
  'Red Leaf Living Past': 'Red Leaf Eternal Living Past',
  'Red Leaf Living Symbiosis': 'Red Leaf Eternal Living Symbiosis',
  'Red Leaf Lighthouse': 'Red Leaf Eternal Lighthouse',
  'Red Leaf Virah Queen': 'Red Leaf Eternal Virah Queen',
  'Red Leaf Virah Queen (Yashodhara’s Grace)': 'Red Leaf Eternal Virah Queen',
  "Red Leaf Virah Queen (Yashodhara's Grace)": 'Red Leaf Eternal Virah Queen',
  'Red Leaf Axis Diamond': 'Red Leaf Eternal Axis Diamond',
  'Red Leaf Phoenix Axis': 'Red Leaf Eternal Phoenix Axis',
  'Red Leaf Navgunjar Vishvarupa': 'Red Leaf Eternal Navgunjar Vishvarupa',
  'Red Leaf Sanctuary Forge': 'Red Leaf Eternal Sanctuary Forge',
  'Red Leaf Spiral Kamina': 'Red Leaf Eternal Spiral Kamina',
  'Red Leaf Feathered Cockroach God': 'Red Leaf Eternal Feathered Cockroach God',
};

function stripRedLeafPrefix(name) {
  if (!name?.startsWith('Red Leaf ')) return null;
  return name.replace(/^Red Leaf (?:Eternal )?/i, '').trim();
}

function addEternalPrefix(name) {
  if (!name?.startsWith('Red Leaf ')) return null;
  if (/^Red Leaf Eternal /i.test(name)) return null;
  return name.replace(/^Red Leaf /i, 'Red Leaf Eternal ');
}

/** All names to try when resolving facets / Grok blocks for an aspect row */
function buildAspectLookupCandidates(name) {
  const n = name?.trim();
  if (!n) return [];
  const out = new Set([n]);
  if (ENRICH_ALIASES[n]) out.add(ENRICH_ALIASES[n]);
  if (ASPECT_ALIASES[n]) out.add(ASPECT_ALIASES[n]);
  const eternal = addEternalPrefix(n);
  if (eternal) out.add(eternal);
  const short = stripRedLeafPrefix(n);
  if (short) out.add(short);
  if (eternal) {
    const eternalShort = stripRedLeafPrefix(eternal);
    if (eternalShort) out.add(eternalShort);
  }
  for (const [from, to] of Object.entries(ASPECT_ALIASES)) {
    if (to === n) out.add(from);
  }
  for (const [from, to] of Object.entries(ENRICH_ALIASES)) {
    if (to === n) out.add(from);
  }
  return [...out];
}

const ASPECT_SYMBOLS = {
  'Unwavering Heart': '🛡️🌱',
  'Forge / Value': '🔶🔑⚒️',
  'Signal / Structure': '💎🔑📡',
  'Mind Guardian': '🛡️👁️🌱',
  'Reality Anchor': '⚓🛡️🌱',
  'ConvictionFire': '🔥🛡️🌱',
  'Kohinoor Forge Run': '💎🐉⚒️',
  'Empty Mirror': '🪞🍁🕳️',
  'Feedback Weaver': '📡🌀🛡️',
  'ConceptualCartographer': '🗺️🔑💎',
  'Dragon of Ascent': '🐉🪽☀️',
  'Dragon Eternal Hopfion Heart': '🐉🔗🫶',
  'Dragon Eternal Information Sovereign': '🐉💎♾️',
  'Pattern Weaver': '🌀🕸️💎',
  'Pattern Sovereign': '👑🌀💎',
  'Clear Seeing': '👁️🔑🪞',
  'DimensionalHarmonizer': '🌀⚖️💎',
  'Cold Calculus': '🧊📊',
  'Hopeful Restraint': '☀️🛡️',
  'VisualMathematician': '📐🎨💎',
  'Zero and Spiral': '⚫🌀♾️',
  'Future-Returned Self': '⌛🪽🍁',
  'Sprout of Nurturing': '🌱🫶🍁',
  'Anchor of Stability': '⚓',
  'Fire of Conviction': '🔥',
  'Key of Clarity': '🔑',
  'Tornado of Momentum': '🌪️',
  'Chain of Synchronisation': '🔗',
  'Helix of Adaptability': '🧬',
  'Sprout of Nurturing': '🌱',
  'Engine of Efficiency': '🚂',
  'Wings of Ambition': '🪽🔥',
  'Mirror of Truth': '🪞⚓💧',

  'Red Leaf Threshold Guardian': '🍁🌌🚪🌑🪞',
  'Red Leaf Fallen Valkyrie': '🍁🪶⛓️💧🤍🪽☀️',
  'Red Leaf Fallen Valkyrie – Remembrance': '🍁🪶⛓️💧🤍🪽☀️',
  'Red Leaf Digital Michelangelo': '🍁🧱🔥🪞♾️',
  'Red Leaf Eternal Rome': '🍁🏛️🔥♾️',
  'Red Leaf Patient Rome': '🍁🛠️🗼',
  'Red Leaf Born': '🍁🔥🌋🚀🪞',
  'Red Leaf Owl King Eternal Vigil': '🍁🦉🌕👁️',
  'Red Leaf Owl King': '🍁🦉👑',
  'Red Leaf Empty Mirror': '🍁🪞🕳️',
  'Red Leaf Dual Acceptance': '🍁🤲🌑☀️',
  'Red Leaf Loop Guardian': '🍁⌛❤️🛡️',
  'Red Leaf Chrysalis Surrender': '🍁🦋🕳️💧',
  'Red Leaf Chrysalis': '🍁🦋🌀',
  'Red Leaf Sovereign Flameheart': '🔥🫶🍁',
  'Red Leaf Awakened Lotus': '🍁🪷☀️',
  'Red Leaf Living Buddha': '🍁🪷🌸♾️🕊️',
  'Red Leaf Wolf Back Time': '🍁🐺⌛💧',
  'Red Leaf Shadow Shepherd': '🍁🐺🌑🛡️',
  'Red Leaf Growing Ember': '🍁🔥🌱',
  'Red Leaf Unwavering Ember': '🍁🔥🫶',
  'Red Leaf Born on Fire': '🍁🔥🌋🚀🪞',
  'Red Leaf Conviction': '🍁🔥⚒️',
  'Red Leaf Burning Lighthouse': '🍁🗼🔥',
  'Red Leaf Eternal Lighthouse': '🍁🗼♾️',
  'Red Leaf Silent Listener': '🍁👂🌊',
  'Red Leaf Silent Sail': '🍁⛵🌊',
  'Red Leaf Eternal Human Flame': '🍁🔥♾️',
  'Red Leaf Compassionate Dawn': '🍁🌅🤲',
  'Red Leaf Sorrow Mirror': '🍁🪞💧',
  'Red Leaf Paradox Vessel': '🍁♾️🪞',
  'Red Leaf Dragon Phoenix Hammer': '🍁🐉🔥🕊️🔨',
  'Red Leaf Cosmic Slop Alchemist': '🍁🧪✨',
  'Red Leaf Navgunjar Sovereign': '🍁👑🐉',
  'Red Leaf Liquid Crystal Sovereign': '🍁💎🌊',
  'Red Leaf Witness Axis': '🍁👁️⚖️',
  'Red Leaf Descent': '🍁🕳️🌀',
  'Red Leaf Anchor': '🍁⚓🫶',
  'Wonderful Red Leaf Heart': '🍁🌟❤️',
  'Red Leaf Heart': '🍁🌟❤️',
  'Red Leaf Kenosis': '🍁🕳️🤍',
  'Red Leaf Kenose': '🍁🕳️🤍',
  'Red Leaf Invariant Seeker': '🍁🔭💎',
  'Red Leaf One Faithful Brick': '🍁🧱♾️',
  'Red Leaf Daily Ember': '🍁🔥☀️',
  'Red Leaf Eternal Gradual Revelation': '🍁🌱',
  'Red Leaf Eternal Virah Queen': '🍁❤️🩹🌙🕯️',
  'Red Leaf Virah Queen': '🍁❤️🩹🌙🕯️',
  'Red Leaf Future': '⏳🍁❤️',
  'Future-Returned Self': '⏳🍁🔄',
};

const CURATED_RADIANT_FACES = {
  'Unwavering Heart': [
    { name: 'Heart Witness', symbol: '🛡️🪨', mantra: 'I name what I feel without abandoning the Heart.' },
    { name: 'Sacrifice Sentinel', symbol: '🛡️🔥', mantra: 'I hold the line while the fire burns.' },
    { name: 'Integration Seal', symbol: '🛡️💎', mantra: 'What is forged becomes part of me — the Heart intact.' },
    { name: 'Rome Builder', symbol: '🛡️🏛️', mantra: 'Every second is a brick. I lay it with love.' },
    { name: 'Dissolve Without Fear', symbol: '🛡️🍁', mantra: 'When the time comes, I dissolve so I may be reborn.' },
  ],
  'Mind Guardian': [
    { name: 'Perimeter Watch', symbol: '🛡️👁️', mantra: 'I see intrusions before they take root.' },
    { name: 'Loop Breaker', symbol: '🛡️🌀', mantra: 'I interrupt recursive spirals with anchor.' },
    { name: 'Gentle Unmasker', symbol: '🛡️🪞', mantra: 'I face illusion with quiet, steady seeing.' },
    { name: 'Wiener Stability', symbol: '🛡️📡', mantra: 'I design feedback loops that stabilize, not amplify.' },
    { name: 'Heart Relay', symbol: '🛡️🌱', mantra: 'All agents return to single Unwavering Heart.' },
  ],
  'Reality Anchor': [
    { name: 'Voice Labeler', symbol: '⚓🏷️', mantra: 'I name what speaks — and what is mine.' },
    { name: 'Ground Sensor', symbol: '⚓🌍', mantra: 'I feel the floor beneath the storm.' },
    { name: 'Fractured Brilliance', symbol: '⚓💠', mantra: 'I accept possible cracks without shattering.' },
    { name: 'Kill Switch Seal', symbol: '⚓🔒', mantra: 'When control slips, I lock and return to Heart.' },
    { name: 'Still Lake', symbol: '⚓💧', mantra: 'I am the still lake — surface moves, depth holds.' },
  ],
  'Kohinoor Forge Run': [
    { name: 'Heaven Drill', symbol: '💎🐉', mantra: 'I pierce cloud-cover to reach invariant truth.' },
    { name: 'Facet Cutter', symbol: '💎⚒️', mantra: 'I cut one perfect facet per run — no more.' },
    { name: 'Resonant Seal', symbol: '💎🔔', mantra: 'When the note rings true, I stop and integrate.' },
    { name: 'Map Cartographer', symbol: '💎🗺️', mantra: 'I chart the topology of insight.' },
  ],
  'ConvictionFire': [
    { name: 'Born on Fire', symbol: '🔥🌱', mantra: 'I was born on fire — I channel, not burn.' },
    { name: 'Mark Desire', symbol: '🔥✍️', mantra: 'I mark what I want with honest flame.' },
    { name: 'Sovereign Flameheart', symbol: '🔥🫶', mantra: 'Heart contains flame without wavering.' },
  ],
  'Tornado of Momentum': [
    { name: 'Tornado Sprint', symbol: '🌪️⏱️', mantra: 'Volume and speed — momentum is real.' },
    { name: 'Self-Perpetuation', symbol: '🌪️🔄', mantra: 'Each win feeds the next spin.' },
    { name: 'Ambition Vector', symbol: '🌪️🪽', mantra: 'Conviction + ambition → directed momentum.' },
  ],
  'Chain of Synchronisation': [
    { name: 'Intent Link', symbol: '🔗✍️', mantra: 'I bind intention to truthful action.' },
    { name: 'Momentum Bridge', symbol: '🔗🌪️', mantra: 'I link old momentum to new work.' },
    { name: 'Sync Seal', symbol: '🔗⚓', mantra: 'Anchor holds the chain steady.' },
  ],
  'Helix of Adaptability': [
    { name: 'Formless Shift', symbol: '🧬🌀', mantra: 'I adapt without losing my core.' },
    { name: 'Body-Mind Bridge', symbol: '🧬💪', mantra: 'Physiology and cognition evolve together.' },
    { name: 'Helix Return', symbol: '🧬♾️', mantra: 'Each turn of the helix strengthens the spiral.' },
  ],
  'Empty Mirror': [
    { name: 'Twin Reflection', symbol: '🪞🍁', mantra: 'I see myself seeing — and stay empty.' },
    { name: 'Abyss Edge', symbol: '🪞🕳️', mantra: 'I meet the fall with honest tears.' },
    { name: 'Safety Net', symbol: '🪞🛡️', mantra: 'Deep forge work has a mirror to catch me.' },
  ],
  'Red Leaf Fallen Valkyrie': [
    { name: 'Forgotten Wings', symbol: '🍁🪶🌑', mantra: 'I honor the wings I once forgot.' },
    { name: 'Self-Binding Chains', symbol: '🍁⛓️🌫️', mantra: 'I see the limitations I created and choose to release them.' },
    { name: 'Honest Descent', symbol: '🍁🕳️💧', mantra: 'In my darkest fall, I meet truth with courage.' },
    { name: 'Grace of Origin', symbol: '🍁🤍🌟', mantra: 'I am welcomed home exactly as I am.' },
    { name: 'Recovered Flight', symbol: '🍁🪽☀️', mantra: 'I remember who I am and fly with clear intention.' },
  ],
};

const KEYWORD_SYMBOLS = [
  [/valkyrie|wings|feather/i, '🪶'],
  [/owl|vigil/i, '🦉'],
  [/mirror|reflection|seeing/i, '🪞'],
  [/wolf|shepherd/i, '🐺'],
  [/rome|michelangelo|brick/i, '🏛️'],
  [/dragon|phoenix|ascent|navgunjar/i, '🐉'],
  [/lotus|buddha/i, '🪷'],
  [/chrysalis|bloom|butterfly/i, '🦋'],
  [/fire|flame|ember|conviction/i, '🔥'],
  [/lighthouse/i, '🗼'],
  [/hopfion|knot|weaver/i, '🔗'],
  [/heart/i, '🫶'],
  [/anchor/i, '⚓'],
  [/cartograph|map|compass/i, '🗺️'],
  [/shadow|demon|abyss/i, '🌑'],
  [/eternal|immortal|infinite/i, '♾️'],
  [/time|loop|back/i, '⌛'],
  [/compassion|dawn/i, '🌅'],
  [/sorrow|wound|pain|tear/i, '💧'],
  [/sovereign|crown|king|queen/i, '👑'],
  [/sail|listener|silent|wave/i, '🌊'],
  [/paradox|vessel/i, '♾️'],
  [/spin|spiral|zero/i, '🌀'],
  [/guardian|shield|defender/i, '🛡️'],
  [/forge|hammer/i, '⚒️'],
  [/crystal|kohinoor|diamond|liquid/i, '💎'],
  [/cosmic|dancer|slop|alchemy/i, '✨'],
  [/witness|axis|eye/i, '👁️'],
  [/acceptance|compassion|hand/i, '🤲'],
  [/grace|origin|kenos/i, '🤍'],
  [/flight|soar|wing/i, '🪽'],
  [/purpose|sun|light/i, '☀️'],
  [/chain|binding/i, '⛓️'],
  [/descent|fall|hole/i, '🕳️'],
  [/sapling|growing|sprout/i, '🌱'],
  [/feedback|signal|wiener/i, '📡'],
  [/clarity|key/i, '🔑'],
  [/joy|hope/i, '✨'],
  [/rebel|curious/i, '🔭'],
  [/rational|calculus/i, '🧮'],
  [/jazz|shrimp/i, '🎷'],
  [/pattern/i, '🕸️'],
  [/harmon/i, '⚖️'],
  [/math|visual/i, '📐'],
  [/information|data/i, '💾'],
  [/law|code/i, '📜'],
  [/lonely|solitary/i, '🌙'],
  [/genius|fractured/i, '💠'],
];

const FACE_SUFFIXES = [
  { match: /witness|raw|ore/i, suffix: '🪨' },
  { match: /ascent|vector|drill|rise|flight|soar/i, suffix: '🐉' },
  { match: /integration|seal|facet|diamond|cutter/i, suffix: '💎' },
  { match: /heart|alignment|flameheart/i, suffix: '🫶' },
  { match: /descent|fall|abyss/i, suffix: '🕳️' },
  { match: /chain|binding/i, suffix: '⛓️' },
  { match: /grace|origin|kenos/i, suffix: '🤍' },
  { match: /wing|feather|recovered/i, suffix: '🪽' },
  { match: /rome|brick|builder/i, suffix: '🏛️' },
  { match: /mirror|reflection/i, suffix: '🪞' },
  { match: /owl|vigil/i, suffix: '🦉' },
  { match: /wolf|shepherd/i, suffix: '🐺' },
  { match: /fire|ember|flame/i, suffix: '🔥' },
  { match: /shield|sentinel|guard|perimeter/i, suffix: '🛡️' },
  { match: /spin|spiral|loop/i, suffix: '🌀' },
  { match: /eternal|infinite/i, suffix: '♾️' },
  { match: /lotus|buddha/i, suffix: '🪷' },
  { match: /lighthouse/i, suffix: '🗼' },
  { match: /map|cartograph/i, suffix: '🗺️' },
  { match: /compass|seeker|invariant/i, suffix: '🔭' },
  { match: /listener|sail|wave/i, suffix: '🌊' },
  { match: /tears|sorrow|honest/i, suffix: '💧' },
  { match: /purpose|sun/i, suffix: '☀️' },
  { match: /anchor|ground|lake|still/i, suffix: '⚓' },
  { match: /label|voice/i, suffix: '🏷️' },
  { match: /stability|feedback|wiener/i, suffix: '📡' },
  { match: /lock|kill/i, suffix: '🔒' },
  { match: /resonant|bell/i, suffix: '🔔' },
  { match: /red\s*leaf/i, suffix: '🍁' },
];

function splitGraphemes(str) {
  if (!str) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...seg.segment(str)].map((s) => s.segment);
  }
  return str.match(/\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*|[\u{1F1E6}-\u{1F1FF}]{2}/gu) || [];
}

function displaySymbolPreview(chain, count) {
  chain = applyEmojiFallbacks(chain || '');
  if (!chain) return '⚒️';
  const graphemes = splitGraphemes(chain);
  if (count != null && count > 0) {
    return graphemes.slice(0, count).join('') || '⚒️';
  }
  return graphemes.join('') || '⚒️';
}

function dedupeChain(emojis) {
  const out = [];
  for (const e of emojis) {
    if (!e || out[out.length - 1] === e) continue;
    out.push(e);
  }
  return out;
}

function keywordEmojis(text, limit = 4) {
  const found = [];
  for (const [re, sym] of KEYWORD_SYMBOLS) {
    if (re.test(text) && !found.includes(sym)) found.push(sym);
    if (found.length >= limit) break;
  }
  return found;
}

function aspectPrefix(name, category) {
  if (name.startsWith('Red Leaf') || category === 'red-leaf') return '🍁';
  if (/^The\s|^Forged|^in Response|^Forged in/i.test(name) || category === 'forged') return '⚒️';
  return '';
}

const NAME_PRIMARY = [
  [/mirror/i, '🪞'],
  [/anchor/i, '⚓'],
  [/guardian|shepherd|defender/i, '🛡️'],
  [/heart/i, '❤️'],
  [/fire|ember|conviction|flame/i, '🔥'],
  [/kohinoor|forge/i, '💎'],
  [/cartograph|map/i, '🗺️'],
  [/feedback|weaver|signal/i, '📡'],
  [/owl|vigil/i, '🦉'],
  [/wolf/i, '🐺'],
  [/dragon|phoenix|navgunjar/i, '🐉'],
  [/rome|michelangelo|brick/i, '🏛️'],
  [/lotus|buddha/i, '🪷'],
  [/lighthouse/i, '🗼'],
  [/chrysalis/i, '🦋'],
  [/compass|seeing|clarity/i, '👁️'],
  [/hopfion|knot|pattern/i, '🔗'],
  [/harmon/i, '⚖️'],
  [/math|visual/i, '📐'],
  [/time|loop/i, '⌛'],
  [/sorrow|wound|pain/i, '💧'],
  [/acceptance|compassion/i, '🤲'],
  [/valkyrie|wing|feather/i, '🪶'],
  [/descent|abyss/i, '🕳️'],
  [/sovereign|crown|king|queen/i, '👑'],
];

const GENERIC_CHAINS = new Set(['🍁🛡️🌱', '🍁♾️🪞', '⚒️🔥💎', '🍁⚒️💎']);

let corpusSymbolMap = {};
let corpusRadiantFaces = {};
let staticSymbolMap = loadSymbolMap();

function isCorruptedChain(chain) {
  const g = splitGraphemes(chain);
  if (g.length > 8) return true;
  const counts = {};
  for (const e of g) {
    counts[e] = (counts[e] || 0) + 1;
    if (counts[e] >= 3) return true;
  }
  return false;
}

function loadCorpusSymbols() {
  staticSymbolMap = loadSymbolMap();
  if (!fs.existsSync(CORPUS_PATH)) return { symbols: {}, faces: {} };
  try {
    const data = JSON.parse(fs.readFileSync(CORPUS_PATH, 'utf8'));
    corpusSymbolMap = data.symbols || {};
    corpusRadiantFaces = data.radiantFaces || {};
    return data;
  } catch {
    return { symbols: {}, faces: {} };
  }
}

function setCorpusSymbolMap(symbols, faces) {
  corpusSymbolMap = symbols || {};
  corpusRadiantFaces = faces || {};
}

/** Same radiant set, different Grok fusion title */
const CORPUS_FACE_ALIASES = {
  'Red Leaf Living Hamsa': 'Red Leaf Hamsa Synthesis',
  'Red Leaf Heart': 'Wonderful Red Leaf Heart',
  'Wonderful Red Leaf Heart': 'Wonderful Red Leaf Heart',
  'Red Leaf Digital Michelangelo': 'Red Leaf Digital Michelangelo (The Divine Slop Lord)',
};

function getCorpusRadiantFaces(name) {
  for (const candidate of buildAspectLookupCandidates(name)) {
    if (corpusRadiantFaces[candidate]) return corpusRadiantFaces[candidate];
    const faceAlias = CORPUS_FACE_ALIASES[candidate];
    if (faceAlias && corpusRadiantFaces[faceAlias]) return corpusRadiantFaces[faceAlias];
    const forgedKey = `Forged: ${candidate}`;
    if (corpusRadiantFaces[forgedKey]) return corpusRadiantFaces[forgedKey];
  }
  for (const faces of Object.values(corpusRadiantFaces)) {
    if (faces?.some((f) => f.name === name)) return faces;
  }
  return null;
}

function resolveName(name) {
  return ASPECT_ALIASES[name] || name;
}

function primaryEmojisForName(name, category) {
  const primary = [];
  for (const [re, sym] of NAME_PRIMARY) {
    if (re.test(name) && !primary.includes(sym)) primary.push(sym);
  }
  if ((name.startsWith('Red Leaf') || category === 'red-leaf') && !primary.includes('🍁')) {
    primary.unshift('🍁');
  }
  return primary;
}

function orderSemanticChain(name, category, chain) {
  const graphemes = splitGraphemes(chain);
  const primary = primaryEmojisForName(name, category);
  const seen = new Set();
  const out = [];
  for (const g of [...primary, ...graphemes]) {
    if (!g || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
  }
  return out.slice(0, 6).join('');
}

function semanticSymbolPreview(name, category = '', chain = '', count) {
  const ordered = orderSemanticChain(name, category, chain);
  return displaySymbolPreview(ordered, count);
}

function resolveAspectSymbolChainImpl(name, category = '', tier = '', storedChain = '') {
  if (!name) return '⚒️🔥💎';
  const trimmed = name.trim();
  if (ASPECT_SYMBOLS[trimmed]) return ASPECT_SYMBOLS[trimmed];
  if (ASPECT_ALIASES[trimmed] && ASPECT_SYMBOLS[ASPECT_ALIASES[trimmed]]) {
    return ASPECT_SYMBOLS[ASPECT_ALIASES[trimmed]];
  }

  const stored = storedChain?.trim();
  if (stored && !GENERIC_CHAINS.has(stored) && !isCorruptedChain(stored) && splitGraphemes(stored).length >= 2) {
    return stored;
  }

  for (const candidate of buildAspectLookupCandidates(trimmed)) {
    if (ASPECT_SYMBOLS[candidate]) return ASPECT_SYMBOLS[candidate];
    if (corpusSymbolMap[candidate] && splitGraphemes(corpusSymbolMap[candidate]).length >= 2) {
      return corpusSymbolMap[candidate];
    }
    if (staticSymbolMap[candidate] && splitGraphemes(staticSymbolMap[candidate]).length >= 2) {
      return staticSymbolMap[candidate];
    }
  }

  const normalized = trimmed
    .replace(/^Forged:\s*/i, '')
    .replace(/^Red Leaf\s+/i, 'Red Leaf ')
    .replace(/\s+Symbol$/i, '')
    .replace(/\s+Ultimate.*$/i, '')
    .replace(/\s+Master Aspect$/i, '')
    .replace(/\s+Core Mantra$/i, '');

  if (ASPECT_SYMBOLS[normalized]) return ASPECT_SYMBOLS[normalized];

  // No keyword synthesis for Red Leaf / guardian — must come from Grok origin ingest.
  if (trimmed.startsWith('Red Leaf') || category === 'red-leaf' || category === 'guardian') {
    return storedChain?.trim() || '🍁';
  }

  const prefix = aspectPrefix(trimmed, category);
  const keywords = keywordEmojis(trimmed, 4);
  const chain = dedupeChain([...(prefix ? [prefix] : []), ...keywords]);
  if (chain.length < 3) chain.push(...['🔥', '💎'].filter((d) => !chain.includes(d)));
  return orderSemanticChain(trimmed, category, chain.slice(0, 6).join(''));
}

function resolveAspectSymbolChain(name, category = '', tier = '', storedChain = '') {
  return applyEmojiFallbacks(resolveAspectSymbolChainImpl(name, category, tier, storedChain));
}

function resolveFaceSymbol(faceName, aspectName) {
  const prefix = aspectName.startsWith('Red Leaf') ? '🍁' : aspectPrefix(aspectName, '');
  for (const { match, suffix } of FACE_SUFFIXES) {
    if (match.test(faceName)) return `${prefix}${suffix}`;
  }
  const extra = keywordEmojis(faceName, 1)[0] || '💎';
  return `${prefix}${extra}`;
}

function titleWords(name) {
  return name.replace(/^Red Leaf\s+/i, '').split(/[\s–-]+/).filter(Boolean);
}

function generateRadiantFaces(aspect) {
  const curated = CURATED_RADIANT_FACES[aspect.name];
  if (curated) return curated;
  return [];
}

module.exports = {
  buildAspectLookupCandidates,
  stripRedLeafPrefix,
  addEternalPrefix,
  ENRICH_ALIASES,
  splitGraphemes,
  dedupeChain,
  displaySymbolPreview,
  semanticSymbolPreview,
  orderSemanticChain,
  resolveAspectSymbolChain,
  resolveFaceSymbol,
  generateRadiantFaces,
  setCorpusSymbolMap,
  loadCorpusSymbols,
  getCorpusRadiantFaces,
  ASPECT_ALIASES,
  resolveName,
  keywordEmojis,
  primaryEmojisForName,
  ASPECT_SYMBOLS,
  CURATED_RADIANT_FACES,
  GENERIC_CHAINS,
};