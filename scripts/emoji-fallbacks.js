/**
 * Normalize emoji graphemes that Twemoji 16 CDN cannot render (ZWJ / compound sequences).
 */
const fs = require('fs');
const path = require('path');

const FALLBACK_PATH = path.join(__dirname, '..', 'data', 'emoji-fallbacks.json');
const config = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf8'));

/** Longest keys first so ❤️‍🔥 matches before partials */
const REPLACEMENT_ENTRIES = Object.entries(config.replacements || {}).sort(
  (a, b) => b[0].length - a[0].length
);

/** Strip gender/sign ZWJ suffixes: base + U+200D + U+2640/2642 */
const GENDER_ZWJ_RE = /(\p{Extended_Pictographic}\uFE0F?)\u200D[\u2640\u2642]\uFE0F?/gu;

function applyEmojiFallbacks(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  for (const [from, to] of REPLACEMENT_ENTRIES) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  out = out.replace(GENDER_ZWJ_RE, '$1');
  return out;
}

function splitGraphemes(str) {
  if (!str) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...seg.segment(str)].map((s) => s.segment);
  }
  return (
    str.match(
      /\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*|[\u{1F1E6}-\u{1F1FF}]{2}/gu
    ) || []
  );
}

/** Per-grapheme fallback for Twemoji URL resolution */
function normalizeEmojiGrapheme(grapheme) {
  if (!grapheme) return grapheme;
  let g = grapheme.replace(/\uFE0E/g, '\uFE0F').replace(/\uFFFD/g, '');
  for (const [from, to] of REPLACEMENT_ENTRIES) {
    if (g === from) return to;
  }
  const m = g.match(/^(\p{Extended_Pictographic}\uFE0F?)\u200D[\u2640\u2642]\uFE0F?$/u);
  if (m) return m[1];
  return g;
}

module.exports = {
  applyEmojiFallbacks,
  normalizeEmojiGrapheme,
  splitGraphemes,
  REPLACEMENT_ENTRIES,
};