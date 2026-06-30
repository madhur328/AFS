import twemoji from 'twemoji';
import fallbackConfig from '../../../data/emoji-fallbacks.json';
import { splitGraphemes } from './symbols';

/** jdecked/twemoji 16 — assets omit standalone fe0f in filenames */
export const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/';

const REPLACEMENT_ENTRIES = Object.entries(fallbackConfig.replacements || {}).sort(
  (a, b) => b[0].length - a[0].length
);

const GENDER_ZWJ_RE = /(\p{Extended_Pictographic}\uFE0F?)\u200D[\u2640\u2642]\uFE0F?/gu;

export function applyEmojiFallbacks(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [from, to] of REPLACEMENT_ENTRIES) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out.replace(GENDER_ZWJ_RE, '$1');
}

/** Twemoji 16 CDN misses these ZWJ sequences — map to renderable graphemes */
export function normalizeEmojiGrapheme(grapheme: string): string {
  let g = grapheme.replace(/\uFE0E/g, '\uFE0F').replace(/\uFFFD/g, '');
  for (const [from, to] of REPLACEMENT_ENTRIES) {
    if (g === from) return to;
  }
  const m = g.match(/^(\p{Extended_Pictographic}\uFE0F?)\u200D[\u2640\u2642]\uFE0F?$/u);
  if (m) return m[1];
  return g;
}

/** Expand ZWJ / compound graphemes into Twemoji-renderable units (e.g. ❤️‍🩹 → ❤️ + 🩹). */
export function expandRenderableGraphemes(grapheme: string): string[] {
  const normalized = applyEmojiFallbacks(normalizeEmojiGrapheme(grapheme));
  const parts = splitGraphemes(normalized);
  return parts.length ? parts : normalized ? [normalized] : [];
}

/** Twemoji 14 convert keeps fe0f; jdecked CDN serves files without it (404 otherwise). */
export function emojiCodePointForUrl(grapheme: string): string {
  const single = expandRenderableGraphemes(grapheme)[0] || grapheme;
  const raw = twemoji.convert.toCodePoint(single);
  const stripped = raw.split('-').filter((part) => part !== 'fe0f').join('-');
  return stripped || raw;
}

export function twemojiAssetUrl(grapheme: string, format: 'svg' | 'png' = 'png'): string {
  const codepoint = emojiCodePointForUrl(grapheme);
  return format === 'png'
    ? `${TWEMOJI_BASE}72x72/${codepoint}.png`
    : `${TWEMOJI_BASE}svg/${codepoint}.svg`;
}