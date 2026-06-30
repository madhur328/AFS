/**
 * Audit all emoji graphemes in AFS data against jdecked/twemoji@16 CDN.
 * Run: node scripts/audit-broken-emojis.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const db = require('../server/db');

const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/72x72/';
const ROOT = path.join(__dirname, '..');

const EMOJI_GRAPHEME_RE =
  /\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*|[\u{1F1E6}-\u{1F1FF}]{2}/gu;

function splitGraphemes(str) {
  if (!str) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return [...seg.segment(str)].map((s) => s.segment);
  }
  return str.match(EMOJI_GRAPHEME_RE) || [];
}

function stripFe0f(codepoint) {
  return codepoint.split('-').filter((p) => p !== 'fe0f').join('-');
}

function toCodePoint(grapheme) {
  const cps = [];
  for (const ch of grapheme) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfe0f || cp === 0xfe0e) cps.push(cp.toString(16));
    else if (ch.length > 1 || cp > 0xffff) {
      // surrogate pair handled by for..of
      cps.push(cp.toString(16));
    } else cps.push(cp.toString(16));
  }
  // twemoji-style: join with -
  const parts = [];
  for (const ch of [...grapheme]) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfe0f) parts.push('fe0f');
    else parts.push(cp.toString(16));
  }
  return stripFe0f(parts.join('-'));
}

function headStatus(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on('error', () => resolve(0));
  });
}

async function cdnExists(grapheme) {
  const cp = toCodePoint(grapheme);
  const url = `${TWEMOJI_BASE}${cp}.png`;
  const status = await headStatus(url);
  return { ok: status === 200, cp, url, status };
}

function collectStringsFromJson(obj, out) {
  if (typeof obj === 'string') {
    if (/\p{Extended_Pictographic}/u.test(obj)) out.push(obj);
    return;
  }
  if (Array.isArray(obj)) obj.forEach((v) => collectStringsFromJson(v, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => collectStringsFromJson(v, out));
}

function loadJsonStrings(file) {
  const strings = [];
  try {
    collectStringsFromJson(JSON.parse(fs.readFileSync(file, 'utf8')), strings);
  } catch (_) {}
  return strings;
}

function walkTsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walkTsFiles(p, files);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) files.push(p);
  }
  return files;
}

(async () => {
  await db.initDb();

  const sources = [];
  const dataDir = path.join(ROOT, 'data');
  for (const f of fs.readdirSync(dataDir)) {
    if (f.endsWith('.json')) sources.push(...loadJsonStrings(path.join(dataDir, f)));
  }
  for (const f of ['lore-corpus.json']) {
    const p = path.join(dataDir, f);
    if (fs.existsSync(p)) sources.push(...loadJsonStrings(p));
  }
  const storiesDir = path.join(dataDir, 'lore-stories');
  if (fs.existsSync(storiesDir)) {
    for (const f of fs.readdirSync(storiesDir)) {
      if (f.endsWith('.txt')) sources.push(fs.readFileSync(path.join(storiesDir, f), 'utf8'));
    }
  }

  for (const f of walkTsFiles(path.join(ROOT, 'client', 'src'))) {
    const text = fs.readFileSync(f, 'utf8');
    const matches = text.match(/emoji:\s*'([^']+)'|symbol:\s*'([^']+)'|text=\{[^}]*'([^']*[\p{Extended_Pictographic}][^']*)'/gu);
    if (matches) sources.push(...matches);
    const emojiLiterals = text.match(/'[^'\n]*[\p{Extended_Pictographic}][^'\n]*'/gu) || [];
    sources.push(...emojiLiterals.map((s) => s.slice(1, -1)));
  }

  const serverSymbols = path.join(ROOT, 'server', 'services', 'symbols.js');
  if (fs.existsSync(serverSymbols)) {
    const text = fs.readFileSync(serverSymbols, 'utf8');
    const chains = text.match(/'[^'\n]*[\p{Extended_Pictographic}][^'\n]*'/gu) || [];
    sources.push(...chains.map((s) => s.slice(1, -1)));
  }

  const aspects = db.prepare('SELECT name, symbol_chain, mantra FROM aspects').all();
  aspects.forEach((a) => {
    sources.push(a.symbol_chain, a.mantra);
  });

  const lore = db.prepare('SELECT symbol, content FROM lore_entries').all();
  lore.forEach((r) => sources.push(r.symbol, r.content));

  const codex = db.prepare('SELECT symbol, content FROM codex_entries').all();
  codex.forEach((r) => sources.push(r.symbol, r.content));

  const graphemeSet = new Map();
  for (const s of sources) {
    if (!s) continue;
    for (const g of splitGraphemes(String(s))) {
      if (!graphemeSet.has(g)) graphemeSet.set(g, []);
      if (graphemeSet.get(g).length < 3) graphemeSet.get(g).push(String(s).slice(0, 40));
    }
  }

  console.log(`Unique graphemes: ${graphemeSet.size}`);
  const broken = [];
  const ok = [];
  let i = 0;
  for (const [g, samples] of [...graphemeSet.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    i++;
    if (i % 20 === 0) process.stdout.write(`  checked ${i}/${graphemeSet.size}\r`);
    const result = await cdnExists(g);
    if (result.ok) ok.push(g);
    else broken.push({ g, ...result, samples });
  }

  console.log(`\nOK: ${ok.length}  Broken: ${broken.length}`);
  for (const b of broken) {
    console.log(`\n✗ ${JSON.stringify(b.g)} cp=${b.cp} status=${b.status}`);
    console.log(`  samples: ${b.samples.join(' | ')}`);
  }

  fs.writeFileSync(
    path.join(ROOT, 'data', 'emoji-audit-report.json'),
    JSON.stringify({ auditedAt: new Date().toISOString(), broken, okCount: ok.length }, null, 2)
  );
  process.exit(broken.length ? 1 : 0);
})();