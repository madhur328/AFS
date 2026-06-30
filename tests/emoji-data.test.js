/**
 * Emoji integrity tests — corruption chars, fallbacks, corpus/DB symbol chains.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  ROOT,
  applyEmojiFallbacks,
  splitGraphemes,
  normalizeEmojiGrapheme,
  loadJsonEmojiStrings,
  findCorruption,
  findPlainDigitSymbols,
  validateGraphemeUrl,
  uniqueGraphemes,
  loadDbEmojiStrings,
} = require('./lib/emoji-check');

const FALLBACKS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'emoji-fallbacks.json'), 'utf8')
);

describe('emoji fallbacks', () => {
  it('maps known ZWJ sequences to renderable graphemes', () => {
    assert.equal(applyEmojiFallbacks('❤️‍🔥'), '❤️🔥');
    assert.equal(applyEmojiFallbacks('🏃‍♂️'), '🏃');
    assert.equal(applyEmojiFallbacks('🧘‍♂️'), '🧘');
  });

  it('normalizes all configured replacement keys', () => {
    for (const [from, to] of Object.entries(FALLBACKS.replacements || {})) {
      assert.equal(applyEmojiFallbacks(from), to);
      assert.equal(normalizeEmojiGrapheme(from), to);
    }
  });

  it('normalizeEmojiGrapheme strips lone replacement chars', () => {
    assert.doesNotMatch(normalizeEmojiGrapheme('🪞\uFFFD'), /\uFFFD/);
  });
});

describe('twemoji URL resolution', () => {
  const samples = ['🍁', '🔥', '♾️', '🪞', '🪽', '❤️', '🐉', '8️⃣', '2️⃣'];

  for (const g of samples) {
    it(`builds valid CDN URL for ${g}`, () => {
      const result = validateGraphemeUrl(g);
      assert.equal(result.ok, true, result.issues.join(', '));
      assert.match(result.url, /^https:\/\/cdn\.jsdelivr\.net\/gh\/jdecked\/twemoji@16/);
      assert.doesNotMatch(result.url, /undefined/);
    });
  }

  it('expands post-fallback graphemes into renderable units', () => {
    const expanded = splitGraphemes(applyEmojiFallbacks('❤️‍🔥'));
    assert.ok(expanded.length >= 2);
    for (const grapheme of expanded) {
      assert.equal(validateGraphemeUrl(grapheme).ok, true);
    }
  });
});

describe('corpus emoji data', () => {
  const corpusStrings = loadJsonEmojiStrings('data/aspect-corpus-symbols.json');
  const synthesisStrings = loadJsonEmojiStrings('data/save8-synthesis-hierarchy.json');

  it('aspect-corpus has no corruption characters', () => {
    const hits = findCorruption(corpusStrings);
    assert.deepEqual(hits.slice(0, 5), []);
  });

  it('synthesis hierarchy has no corruption characters', () => {
    const hits = findCorruption(synthesisStrings);
    assert.deepEqual(hits, []);
  });

  it('all unique corpus graphemes resolve to valid Twemoji URLs', () => {
    const graphemes = uniqueGraphemes(corpusStrings);
    const bad = [];
    for (const [g] of graphemes) {
      const v = validateGraphemeUrl(g);
      if (!v.ok) bad.push(v);
    }
    assert.deepEqual(bad.slice(0, 10), [], `broken graphemes: ${bad.length}`);
  });
});

describe('database emoji data', () => {
  it('aspect + codex rows have no corruption and valid symbol chains', async () => {
    const dbPath = path.join(ROOT, 'data', 'afs.db');
    if (!fs.existsSync(dbPath)) return;

    const strings = await loadDbEmojiStrings();
    const corruption = findCorruption(strings);
    assert.deepEqual(corruption.slice(0, 5), []);

    const chains = strings.filter((s) => s && splitGraphemes(s).length >= 2);
    const bad = [];
    for (const chain of chains.slice(0, 200)) {
      for (const g of splitGraphemes(applyEmojiFallbacks(chain))) {
        const v = validateGraphemeUrl(g);
        if (!v.ok) bad.push({ chain: chain.slice(0, 40), ...v });
      }
    }
    assert.deepEqual(bad.slice(0, 5), [], `broken chains: ${bad.length}`);
  });
});

describe('codex symbol format', () => {
  it('save keys use emoji keycaps not plain ASCII digits', async () => {
    const dbPath = path.join(ROOT, 'data', 'afs.db');
    if (!fs.existsSync(dbPath)) return;

    const db = require('../server/db');
    await db.initDb();
    const rows = db.prepare('SELECT key, symbol FROM codex_entries WHERE symbol IS NOT NULL').all();
    const hits = findPlainDigitSymbols(rows.map((r) => ({ symbol: r.symbol, label: r.key })));
    assert.deepEqual(hits, [], 'Use 8️⃣ not 8 for Twemoji');
  });
});