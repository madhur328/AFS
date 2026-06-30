/**
 * Shared emoji validation for tests and audit scripts.
 */
const fs = require('fs');
const path = require('path');
const { applyEmojiFallbacks, splitGraphemes, normalizeEmojiGrapheme } = require('../../scripts/emoji-fallbacks');

const ROOT = path.join(__dirname, '../..');
const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/72x72/';

const CORRUPTION_RE = /\uFFFD|\u25A1/;
const PLAIN_ASCII_DIGIT_ONLY = /^[0-9]+$/;

function stripFe0f(codepoint) {
  return codepoint.split('-').filter((p) => p !== 'fe0f').join('-');
}

function toCodePoint(grapheme) {
  const parts = [];
  for (const ch of [...grapheme]) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfe0f) parts.push('fe0f');
    else parts.push(cp.toString(16));
  }
  return stripFe0f(parts.join('-'));
}

function twemojiAssetUrl(grapheme) {
  const cp = toCodePoint(normalizeEmojiGrapheme(grapheme));
  return `${TWEMOJI_BASE}${cp}.png`;
}

function collectStringsFromJson(obj, out) {
  if (typeof obj === 'string') {
    if (/\p{Extended_Pictographic}/u.test(obj) || CORRUPTION_RE.test(obj)) out.push(obj);
    return;
  }
  if (Array.isArray(obj)) obj.forEach((v) => collectStringsFromJson(v, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => collectStringsFromJson(v, out));
}

function loadJsonEmojiStrings(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return [];
  const strings = [];
  collectStringsFromJson(JSON.parse(fs.readFileSync(full, 'utf8')), strings);
  return strings;
}

function uniqueGraphemes(strings) {
  const set = new Map();
  for (const s of strings) {
    if (!s) continue;
    const normalized = applyEmojiFallbacks(String(s));
    for (const g of splitGraphemes(normalized)) {
      if (!set.has(g)) set.set(g, []);
      if (set.get(g).length < 2) set.set(g, [...set.get(g), String(s).slice(0, 48)]);
    }
  }
  return set;
}

function findCorruption(strings) {
  const hits = [];
  for (const s of strings) {
    if (!s || !CORRUPTION_RE.test(s)) continue;
    hits.push({
      value: s.slice(0, 80),
      chars: [...s].filter((c) => CORRUPTION_RE.test(c)).map((c) => `U+${c.codePointAt(0).toString(16)}`),
    });
  }
  return hits;
}

function findPlainDigitSymbols(entries) {
  const hits = [];
  for (const { symbol, label } of entries) {
    if (symbol && PLAIN_ASCII_DIGIT_ONLY.test(symbol.trim())) {
      hits.push({ symbol, label });
    }
  }
  return hits;
}

function validateGraphemeUrl(grapheme) {
  const url = twemojiAssetUrl(grapheme);
  const cp = toCodePoint(normalizeEmojiGrapheme(grapheme));
  const issues = [];
  if (!cp || cp === 'undefined') issues.push('empty codepoint');
  if (url.includes('undefined')) issues.push('url contains undefined');
  if (CORRUPTION_RE.test(grapheme)) issues.push('corruption char in grapheme');
  return { grapheme, url, codepoint: cp, ok: issues.length === 0, issues };
}

async function loadDbEmojiStrings() {
  const db = require('../../server/db');
  await db.initDb();
  const strings = [];
  const aspects = db.prepare('SELECT name, symbol_chain, mantra, detail_json FROM aspects').all();
  for (const a of aspects) {
    strings.push(a.symbol_chain, a.mantra, a.name);
    if (a.detail_json) {
      try {
        collectStringsFromJson(JSON.parse(a.detail_json), strings);
      } catch (_) {}
    }
  }
  for (const table of ['codex_entries', 'lore_entries']) {
    try {
      const rows = db.prepare(`SELECT symbol, content FROM ${table}`).all();
      rows.forEach((r) => {
        strings.push(r.symbol, r.content);
      });
    } catch (_) {}
  }
  return strings;
}

module.exports = {
  ROOT,
  TWEMOJI_BASE,
  CORRUPTION_RE,
  applyEmojiFallbacks,
  splitGraphemes,
  normalizeEmojiGrapheme,
  toCodePoint,
  twemojiAssetUrl,
  loadJsonEmojiStrings,
  uniqueGraphemes,
  findCorruption,
  findPlainDigitSymbols,
  validateGraphemeUrl,
  loadDbEmojiStrings,
};