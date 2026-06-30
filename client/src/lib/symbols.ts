/** Grapheme-safe emoji utilities — mirrors server/services/symbols.js */
import { applyEmojiFallbacks } from './twemoji-url';

const ASPECT_ALIASES: Record<string, string> = {
  'Red Leaf Born': 'Red Leaf Born on Fire',
  'Red Leaf Phoenix Hammer': 'Red Leaf Dragon Phoenix Hammer',
  'Red Leaf Heart': 'Wonderful Red Leaf Heart',
  'Red Leaf Virah Queen': 'Red Leaf Eternal Virah Queen',
  'Red Leaf Rome': 'Red Leaf Eternal Rome',
};

const ASPECT_SYMBOLS: Record<string, string> = {
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
  'DimensionalHarmonizer': '🌀⚖️💎',
  'Cold Calculus': '🧊📊',
  'Hopeful Restraint': '☀️🛡️',
  'Red Leaf Dragon Phoenix Hammer': '🍁🐉🔥🕊️🔨',
  'Red Leaf Born on Fire': '🍁🔥🌋🚀🪞',
  'Red Leaf Born': '🍁🔥🌋🚀🪞',
  'Red Leaf Patient Rome': '🍁🛠️🗼',
  'Red Leaf Owl King Eternal Vigil': '🍁🦉🌕👁️',
  'Red Leaf Empty Mirror': '🍁🪞🕳️',
  'Red Leaf Dual Acceptance': '🍁🤲🌑☀️',
  'Red Leaf Loop Guardian': '🍁⌛❤️🛡️',
  'Red Leaf Eternal Gradual Revelation': '🍁🌱',
  'Red Leaf Eternal Virah Queen': '🍁❤️🩹🌙🕯️',
  'Red Leaf Virah Queen': '🍁❤️🩹🌙🕯️',
  'Red Leaf Future': '⏳🍁❤️',
  'Future-Returned Self': '⏳🍁🔄',
  'Red Leaf Chrysalis Surrender': '🍁🦋🕳️💧',
  'Red Leaf Threshold Guardian': '🍁🌌🚪🌑🪞',
  'Wonderful Red Leaf Heart': '🍁🌟❤️',
  'Red Leaf Heart': '🍁🌟❤️',
  'Red Leaf Fallen Valkyrie': '🍁🪶⛓️💧🤍🪽☀️',
  'Anchor of Stability': '⚓',
  'Fire of Conviction': '🔥',
  'Key of Clarity': '🔑',
  'Sprout of Nurturing': '🌱',
  'Tornado of Momentum': '🌪️',
  'Chain of Synchronisation': '🔗',
  'Helix of Adaptability': '🧬',
  'Engine of Efficiency': '🚂',
  'Wings of Ambition': '🪽🔥',
  'Mirror of Truth': '🪞⚓💧',
  'Red Leaf Living Buddha': '🍁🪷🌸♾️🕊️',
  'Red Leaf Awakened Lotus': '🍁🪷🌸♾️',
};

const GENERIC_CHAINS = new Set(['🍁🛡️🌱', '🍁♾️🪞', '⚒️🔥💎', '🍁⚒️💎']);

type KeywordRule = [RegExp, string];

const KEYWORD_SYMBOLS: KeywordRule[] = [
  [/mirror|reflection/i, '🪞'],
  [/anchor/i, '⚓'],
  [/guardian|shepherd/i, '🛡️'],
  [/heart/i, '❤️'],
  [/fire|flame|ember|conviction/i, '🔥'],
  [/kohinoor|forge/i, '💎'],
  [/cartograph|map/i, '🗺️'],
  [/feedback|weaver/i, '📡'],
  [/owl|vigil/i, '🦉'],
  [/wolf/i, '🐺'],
  [/dragon|phoenix/i, '🐉'],
  [/rome|michelangelo|brick/i, '🏛️'],
  [/lotus|buddha/i, '🪷'],
  [/lighthouse/i, '🗼'],
  [/chrysalis/i, '🦋'],
  [/hammer/i, '🔨'],
  [/born/i, '🔥'],
];

const EMOJI_GRAPHEME_RE =
  /\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*|[\u{1F1E6}-\u{1F1FF}]{2}/u;

export function isEmojiGrapheme(grapheme: string): boolean {
  return Boolean(grapheme && EMOJI_GRAPHEME_RE.test(grapheme));
}

export function splitGraphemes(str: string): string[] {
  if (!str) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...seg.segment(str)].map((s) => s.segment);
  }
  return str.match(/\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*|[\u{1F1E6}-\u{1F1FF}]{2}/gu) || [];
}

export type MixedTextSegment = { type: 'text' | 'emoji'; value: string };

const EMOJI_FIND_RE =
  /\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*|[\u{1F1E6}-\u{1F1FF}]{2}/gu;

function pushMixedSegment(segments: MixedTextSegment[], type: MixedTextSegment['type'], value: string) {
  if (!value) return;
  const last = segments[segments.length - 1];
  if (last?.type === type) last.value += value;
  else segments.push({ type, value });
}

/** Split prose into text runs and emoji graphemes for inline Twemoji rendering. */
export function segmentMixedText(str: string): MixedTextSegment[] {
  if (!str) return [];

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segments: MixedTextSegment[] = [];
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const { segment } of seg.segment(str)) {
      pushMixedSegment(segments, isEmojiGrapheme(segment) ? 'emoji' : 'text', segment);
    }
    return segments;
  }

  const segments: MixedTextSegment[] = [];
  let lastIndex = 0;
  for (const match of str.matchAll(EMOJI_FIND_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) pushMixedSegment(segments, 'text', str.slice(lastIndex, index));
    pushMixedSegment(segments, 'emoji', match[0]);
    lastIndex = index + match[0].length;
  }
  if (lastIndex < str.length) pushMixedSegment(segments, 'text', str.slice(lastIndex));
  return segments;
}

function isCorruptedChain(chain: string): boolean {
  const g = splitGraphemes(chain);
  if (g.length > 8) return true;
  const counts: Record<string, number> = {};
  for (const e of g) {
    counts[e] = (counts[e] || 0) + 1;
    if (counts[e] >= 3) return true;
  }
  return false;
}

function dedupeChain(emojis: string[]): string[] {
  const out: string[] = [];
  for (const e of emojis) {
    if (!e || out[out.length - 1] === e) continue;
    out.push(e);
  }
  return out;
}

function keywordEmojis(text: string, limit = 4): string[] {
  const found: string[] = [];
  for (const [re, sym] of KEYWORD_SYMBOLS) {
    if (re.test(text) && !found.includes(sym)) found.push(sym);
    if (found.length >= limit) break;
  }
  return found;
}

/** Full symbol chain for display — only pass count to intentionally truncate. */
export function displaySymbolPreview(chain: string | undefined | null, count?: number): string {
  chain = applyEmojiFallbacks(chain || '');
  if (!chain) return '⚒️';
  const graphemes = splitGraphemes(chain);
  if (count != null && count > 0) {
    return graphemes.slice(0, count).join('') || '⚒️';
  }
  return graphemes.join('') || '⚒️';
}

function aspectPrefix(name: string, category: string): string {
  if (name.startsWith('Red Leaf') || category === 'red-leaf') return '🍁';
  if (/^The\s|^Forged|^in Response|^Forged in/i.test(name) || category === 'forged') return '⚒️';
  return '';
}

export function resolveAspectSymbolChain(
  name: string,
  category = '',
  tier = '',
  storedChain = ''
): string {
  if (!name) return applyEmojiFallbacks('⚒️🔥💎');
  const trimmed = name.trim();
  if (ASPECT_SYMBOLS[trimmed]) return applyEmojiFallbacks(ASPECT_SYMBOLS[trimmed]);
  if (ASPECT_ALIASES[trimmed] && ASPECT_SYMBOLS[ASPECT_ALIASES[trimmed]]) {
    return applyEmojiFallbacks(ASPECT_SYMBOLS[ASPECT_ALIASES[trimmed]]);
  }

  const stored = storedChain?.trim();
  if (stored && !GENERIC_CHAINS.has(stored) && !isCorruptedChain(stored) && splitGraphemes(stored).length >= 2) {
    return applyEmojiFallbacks(stored);
  }

  if (trimmed.startsWith('Red Leaf') || category === 'red-leaf' || category === 'guardian') {
    return applyEmojiFallbacks(storedChain?.trim() || '🍁');
  }

  const prefix = aspectPrefix(trimmed, category);
  const keywords = keywordEmojis(trimmed, 4);
  const chain = dedupeChain([...(prefix ? [prefix] : []), ...keywords]);
  if (chain.length < 3) chain.push(...['🔥', '💎'].filter((d) => !chain.includes(d)));
  return applyEmojiFallbacks(chain.slice(0, 6).join(''));
}

/** Full symbol chain for list/detail — verbatim from Grok origin when stored. */
function isOrderedSubsequence(short: string[], full: string[]): boolean {
  if (!short.length || short.length >= full.length) return false;
  let j = 0;
  for (const g of full) {
    if (g === short[j]) j += 1;
    if (j === short.length) return true;
  }
  return false;
}

/** Restore symbol chains truncated by Discord message limits (e.g. missing 🌑). */
export function repairTruncatedSymbolChain(chain: string, contextText = ''): string {
  const trimmed = chain.replace(/\s+/g, '');
  if (!trimmed) return chain;

  const graphemes = splitGraphemes(trimmed);
  if (graphemes.length < 2) return trimmed;

  const aspectMatch = contextText.match(/\*\*([^*]+)\*\*/);
  const aspectName = aspectMatch?.[1]?.trim();
  if (!aspectName) return trimmed;

  const canonical = splitGraphemes(
    resolveAspectSymbolChain(aspectName, aspectName.startsWith('Red Leaf') ? 'red-leaf' : '', '', '')
  );
  if (canonical.length <= graphemes.length) return trimmed;
  if (isOrderedSubsequence(graphemes, canonical)) return canonical.join('');

  return trimmed;
}

const TRAILING_CHAIN_TAIL_RE =
  /^([\s\S]*?)(\s+)([\p{Extended_Pictographic}\uFE0F\u200D]+)$/u;

/** Split trailing emoji runs (e.g. after "? 🍁🌌🚪🪞") from prose for horizontal chain rendering. */
export function splitTrailingSymbolChain(text: string): { body: string; chain: string | null } {
  const trimmed = text.trimEnd();
  const match = trimmed.match(TRAILING_CHAIN_TAIL_RE);
  if (!match) return { body: text, chain: null };

  const chain = match[3].replace(/\s+/g, '');
  const graphemes = splitGraphemes(chain);
  if (graphemes.length < 2) return { body: text, chain: null };

  const trailingWs = text.slice(trimmed.length);
  return { body: match[1] + trailingWs, chain: graphemes.join('') };
}

export function resolveAspectDisplayChain(aspect: {
  name: string;
  category?: string;
  tier?: string;
  symbol_chain?: string;
  symbol_preview?: string;
}): string {
  const stored = aspect.symbol_chain?.trim();
  if (stored) return stored;
  if (aspect.symbol_preview?.trim()) return aspect.symbol_preview.trim();
  return resolveAspectSymbolChain(aspect.name, aspect.category || '', aspect.tier || '', '');
}