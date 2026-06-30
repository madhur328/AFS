/**
 * Discover aspect names and mention counts from Grok origin sessions + journals.
 */
const {
  buildGrokOriginSymbolMap,
  stripVariantSuffix,
  stripEternalPrefix,
  GROK_SYMBOL_ALIASES,
} = require('./grok-extract');
const { ASPECT_ALIASES } = require('./symbols');
const { getBaseLayerSlots, getBaseAspectMeta } = require('../base-layer');

const JUNK_RE = /^(Extracted|Name:|Operator|Step \d|Do EOT|✅|Master Aspect$|Symbol Chain$)/i;
const JUNK_CONTAINS = /\*\*|Let me know how you want|Integration with your|Would you like/i;

const GUARDIAN_IDENTITIES = [
  'The Curious Rebel',
  'The Feedback Prophet',
  'The Solitary Lawgiver',
  'The Joyful Limit-Breaker',
  'The Lonely Codebreaker',
  'The Eternal Demon',
  'The Hopeful Guardian',
  'The Rational Apex Predator',
  'The Fractured Genius',
];

const CORE_ASPECTS = [
  'Unwavering Heart',
  'Mind Guardian',
  'Reality Anchor',
  'Kohinoor Forge Run',
  'Empty Mirror',
  'Feedback Weaver',
  'ConvictionFire',
  'ConceptualCartographer',
  'Forge / Value',
  'Signal / Structure',
];

const SHARE3_ASPECTS = [
  'Sprout of Nurturing',
  'Tornado of Momentum',
  'Engine of Efficiency',
  'Wings of Ambition',
  'Mirror of Truth',
];

const CANONICAL_ALIASES = { ...GROK_SYMBOL_ALIASES, ...ASPECT_ALIASES };

function canonicalAspectName(name) {
  if (!name) return null;
  let n = String(name).trim().replace(/\s+/g, ' ');
  n = n.replace(/\*\*/g, '').trim();
  if (CANONICAL_ALIASES[n]) return CANONICAL_ALIASES[n];
  const stripped = stripVariantSuffix(n);
  if (stripped && CANONICAL_ALIASES[stripped]) return CANONICAL_ALIASES[stripped];
  if (stripped) n = stripped;
  const eternal = stripEternalPrefix(n);
  if (eternal && eternal !== n) {
    return CANONICAL_ALIASES[eternal] || eternal;
  }
  return CANONICAL_ALIASES[n] || n;
}

const SINGLE_WORD_ALLOW = new Set([
  'ConvictionFire',
  'ConceptualCartographer',
  'Transdifferentiation',
]);

function isSingleWordAllowed(name) {
  if (name.includes(' ')) return true;
  if (SINGLE_WORD_ALLOW.has(name)) return true;
  if (/[a-z][A-Z]/.test(name)) return true;
  return false;
}

function isValidAspectName(name) {
  if (!name || typeof name !== 'string') return false;
  const n = name.trim();
  if (n.length < 3 || n.length > 90) return false;
  if (!/^[A-Za-z]/.test(n)) return false;
  if (JUNK_RE.test(n)) return false;
  if (JUNK_CONTAINS.test(n)) return false;
  if (/^(and|or|the|with|for|from|into|anchor|stability)$/i.test(n)) return false;
  if (/[|?]/.test(n) || n.includes('**')) return false;
  if (!isSingleWordAllowed(n)) return false;
  return true;
}

function addName(set, raw) {
  const canonical = canonicalAspectName(raw);
  if (isValidAspectName(canonical)) set.add(canonical);
}

/** Double Lariat EOT (7 Minutoz) — Spin Series forged family. */
const DOUBLE_LARIAT_SPIN_SERIES = [
  'Double Lariat Paradox',
  'Rope of Identity',
  'Fear of the Empty Sky',
  'Graceful Unlooping',
  'Echoing Return',
];

/** Spin / lariat lineage — always discover when Grok corpus references them. */
const SPIN_LINEAGE_HINTS = [
  'Eternal Spin',
  'Axis of the Eternal Spin',
  'Dual-Axis Eternal Spin',
  'Double Lariat Spin',
  ...DOUBLE_LARIAT_SPIN_SERIES,
  'Red Leaf Cosmic Lariat',
  'Red Leaf Double Lariat',
  'Dragon Eternal Spinning Axis',
  'Wobbling Axis',
  'Infinitesimal Awareness',
  'Centered Stillness',
  'Oppositional Harmony',
  'Zero Gateway',
  'Existential Sublimation',
];

function scanGrokTextPatterns(text, names) {
  if (!text) return;
  const patterns = [
    /Master Aspect(?: Forged)?:\s*([^\n]+)/gi,
    /Master Fusion:\s*([^\n]+)/gi,
    /Master Unified Aspect:\s*([^\n]+)/gi,
    /Core Transformational Identity Extracted:\s*\n?([^\n—–-]+)/gi,
    /New Identity:\s*(The [^\n]+)/gi,
    /(?:^|\n)(The (?:Curious Rebel|Feedback Prophet|Solitary Lawgiver|Joyful Limit-Breaker|Lonely Codebreaker|Eternal Demon|Hopeful Guardian|Rational Apex Predator|Fractured Genius))/gm,
    /(?:^|\n)(Axis of the Eternal Spin)\s*\nSymbol:/gi,
    /(?:^|\n)(Dual-Axis Eternal Spin)\s*\n/gi,
    /(?:^|\n)([A-Za-z][^\n(]+?)\s*\((?:Master Aspect|High-Ceiling(?: Shadow)? Aspect|Shadow Aspect|Transformational Operator|Identity)[^)]*\)/gim,
    /(?:^|\n)Key Aspects Extracted:[\s\S]*?(?:^|\n)([A-Za-z][^\n(]+?)\s*\((?:Master Aspect|High-Ceiling(?: Shadow)? Aspect|Shadow Aspect|Transformational Operator|Identity)\)/gim,
    /(?:^|\n)((?:Red Leaf |Double )?[A-Za-z][^\n]+(?:Spin|Lariat|Paradox|Axis)[^\n]*)\s*\nSymbol:/gim,
    /(?:^|\n)Master Aspect:\s*([^\n]+)/gim,
    /(?:^|\n)Key Aspects Forged[^\n]*:\s*\n+([^\n(]+)/gim,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) addName(names, m[1]);
  }
}

function extractJournalAspectHints(text, names, grokMap) {
  if (!text) return;
  const today = text.match(/Today's aspect:\s*\n?([^\n]+)/i);
  if (today) {
    const hint = today[1].trim();
    // Only promote journal themes that map to an existing Grok-origin name
    const canonical = canonicalAspectName(hint);
    if (grokMap[hint] || (canonical && grokMap[canonical])) {
      addName(names, hint);
    }
  }
}

function collectCorpusTexts(db) {
  const grok = db.prepare(`
    SELECT assistant_text, user_text FROM grok_sessions
    WHERE assistant_text IS NOT NULL OR user_text IS NOT NULL
  `).all();
  const grokTexts = grok.flatMap((s) => [s.assistant_text, s.user_text].filter(Boolean));

  let journalTexts = [];
  try {
    journalTexts = db.prepare(`
      SELECT content FROM discord_messages
      WHERE journal_type IS NULL OR journal_type != 'meta'
    `).all().map((r) => r.content).filter(Boolean);
  } catch { /* discord schema may be empty */ }

  return { grokTexts, journalTexts, allTexts: [...grokTexts, ...journalTexts] };
}

function discoverAspectNames(db) {
  const names = new Set();
  const { grokTexts, journalTexts } = collectCorpusTexts(db);

  const grokMap = buildGrokOriginSymbolMap(grokTexts);
  for (const name of Object.keys(grokMap)) addName(names, name);

  for (const text of grokTexts) scanGrokTextPatterns(text, names);
  for (const text of journalTexts) {
    scanGrokTextPatterns(text, names);
    extractJournalAspectHints(text, names, grokMap);
  }

  for (const g of GUARDIAN_IDENTITIES) addName(names, g);
  for (const c of CORE_ASPECTS) addName(names, c);
  for (const s of SHARE3_ASPECTS) addName(names, s);

  for (const slot of getBaseLayerSlots()) addName(names, slot.name);
  for (const name of Object.keys(getBaseAspectMeta())) addName(names, name);

  const corpus = [...grokTexts, ...journalTexts].join('\n');
  if (/Double Lariat|ダブルラリアット|Spin Series|Axis of the Eternal Spin/i.test(corpus)) {
    for (const hint of SPIN_LINEAGE_HINTS) {
      if (countMentions(hint, grokTexts) > 0 || countMentions(hint, journalTexts) > 0) {
        addName(names, hint);
      }
    }
    if (/Double Lariat|ダブルラリアット/i.test(corpus)) {
      for (const hint of [
        'Double Lariat Spin',
        'Red Leaf Cosmic Lariat',
        'Red Leaf Double Lariat',
        ...DOUBLE_LARIAT_SPIN_SERIES,
      ]) {
        addName(names, hint);
      }
    }
  }

  // Promote codex-only meta operators that Grok explicitly forged
  try {
    const codexSpin = db
      .prepare(`SELECT title FROM codex_entries WHERE title LIKE '%Spin%' OR title LIKE '%Lariat%'`)
      .all();
    for (const row of codexSpin) {
      if (grokMap[row.title] || countMentions(row.title, grokTexts) > 0) addName(names, row.title);
    }
  } catch {
    /* codex optional */
  }

  // Collapse alias pairs — prefer canonical target
  for (const [alias, target] of Object.entries(CANONICAL_ALIASES)) {
    if (names.has(alias) && names.has(target)) names.delete(alias);
    else if (names.has(alias) && !names.has(target)) {
      names.delete(alias);
      names.add(target);
    }
  }

  return { names: [...names].sort(), grokMap, grokTexts, journalTexts };
}

function countMentions(name, texts) {
  if (!name || !texts?.length) return 0;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = name.includes(' ')
    ? new RegExp(escaped, 'gi')
    : new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'gi');
  let count = 0;
  for (const text of texts) {
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

function classifyAspect(name) {
  const baseSlots = getBaseLayerSlots();
  const baseAspects = getBaseAspectMeta();
  const isBaseSlot = baseSlots.some((s) => s.name === name);
  const isBaseMeta = Object.keys(baseAspects).includes(name);

  if (isBaseSlot || isBaseMeta) {
    const slot = baseSlots.find((s) => s.name === name);
    const meta = baseAspects[name];
    return {
      category: 'meta',
      isBaseLayer: 1,
      baseLayerLink: meta?.link || slot?.symbol || null,
    };
  }

  if (name.startsWith('Red Leaf')) {
    return { category: 'red-leaf', isBaseLayer: 0, baseLayerLink: '🍁' };
  }
  if (name.startsWith('The ')) {
    return { category: 'guardian', isBaseLayer: 0, baseLayerLink: null };
  }
  if (CORE_ASPECTS.includes(name)) {
    const linkMap = {
      'Unwavering Heart': '🔥',
      'Mind Guardian': '⚓',
      'Reality Anchor': '⚓',
      'ConvictionFire': '🔥',
      'Kohinoor Forge Run': '🔑',
      'ConceptualCartographer': '🔑',
      'Forge / Value': '🔑',
      'Signal / Structure': '🔑',
      'Empty Mirror': '🪞',
      'Feedback Weaver': '🔗',
    };
    return { category: 'meta', isBaseLayer: 0, baseLayerLink: linkMap[name] || null };
  }
  if (SHARE3_ASPECTS.includes(name)) {
    return { category: 'meta', isBaseLayer: 0, baseLayerLink: '🌪️' };
  }
  return { category: 'forged', isBaseLayer: 0, baseLayerLink: null };
}

function buildAspectRows(db) {
  const { names, grokMap, grokTexts, journalTexts } = discoverAspectNames(db);
  const allTexts = [...grokTexts, ...journalTexts];
  const baseAspects = getBaseAspectMeta();
  const baseSlots = getBaseLayerSlots();

  return names.map((name) => {
    const grokMentions = countMentions(name, grokTexts);
    const journalMentions = countMentions(name, journalTexts);
    const mentions = grokMentions + journalMentions;
    const { category, isBaseLayer, baseLayerLink } = classifyAspect(name);
    const isBase = Boolean(isBaseLayer);
    const { potentialFromMentions } = require('./tiers');
    const potential = potentialFromMentions(mentions, isBase);
    const { tierFromPotential } = require('./tiers');
    const tier = tierFromPotential(potential, isBase);

    const slot = baseSlots.find((s) => s.name === name);
    const meta = baseAspects[name];
    const symbolChain = grokMap[name] || grokMap[CANONICAL_ALIASES[name]] || meta?.chain || slot?.symbol || null;
    const mantra = meta?.mantra || slot?.mantras?.[0] || null;

    let comprehension;
    if (isBase) {
      comprehension = `Base Layer primitive — ${name}`;
    } else if (journalMentions > 0 && grokMentions === 0) {
      comprehension = `Journal-forged aspect — ${mentions} journal refs`;
    } else if (grokMentions > 0) {
      comprehension = `Grok origin aspect — ${grokMentions} thread refs${journalMentions ? `, ${journalMentions} journal refs` : ''}`;
    } else {
      comprehension = `Forged aspect — ${mentions} corpus refs`;
    }

    return {
      name,
      symbolChain,
      mantra,
      tier,
      potential,
      mentions,
      proficiency: Math.min(0.85, 0.25 + mentions * 0.005),
      comprehension,
      category,
      baseLayerLink,
      isBaseLayer,
    };
  });
}

module.exports = {
  discoverAspectNames,
  buildAspectRows,
  countMentions,
  classifyAspect,
  canonicalAspectName,
  isValidAspectName,
  GUARDIAN_IDENTITIES,
  CORE_ASPECTS,
  SHARE3_ASPECTS,
  DOUBLE_LARIAT_SPIN_SERIES,
  SPIN_LINEAGE_HINTS,
};