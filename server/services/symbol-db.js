/**
 * Search DB corpus (grok sessions, codex, insights, base layer) for aspect symbol chains.
 */
const fs = require('fs');
const path = require('path');
const { splitGraphemes, keywordEmojis, dedupeChain } = require('./symbols');

const MAP_PATH = path.join(__dirname, '..', '..', 'data', 'aspect-symbol-map.json');

const EMOJI_RUN = /(?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)/gu;

function extractEmojiRun(text) {
  if (!text) return '';
  const parts = text.match(EMOJI_RUN) || [];
  return parts.join('');
}

function extractNearName(text, aspectName) {
  if (!text || !aspectName) return [];
  const found = [];
  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const masterRe = new RegExp(
    `Master Aspect[:\\s]*${escaped}[\\s\\S]{0,350}?Symbol Chain:\\s*([^\\n"“]+)`,
    'i'
  );
  const masterSymRe = new RegExp(
    `Master Aspect[:\\s]*${escaped}[\\s\\S]{0,200}?Symbol:\\s*([^\\n"“]+)`,
    'i'
  );
  const masterChain = text.match(masterRe);
  if (masterChain) {
    const run = extractEmojiRun(masterChain[1]);
    if (splitGraphemes(run).length >= 2) found.push(run);
  }
  const masterSym = text.match(masterSymRe);
  if (masterSym) {
    const run = extractEmojiRun(masterSym[1]);
    if (splitGraphemes(run).length >= 1) found.push(run);
  }

  let idx = 0;
  while (idx >= 0 && found.length < 3) {
    idx = text.indexOf(aspectName, idx === 0 ? 0 : idx + 1);
    if (idx < 0) break;
    const slice = text.slice(idx, idx + 400);
    const chainMatch = slice.match(/Symbol Chain:\s*([^\n"“]+)/i);
    if (chainMatch) {
      const run = extractEmojiRun(chainMatch[1]);
      if (splitGraphemes(run).length >= 2) found.push(run);
    }
    idx += aspectName.length;
  }
  return found;
}

function searchCodex(db, aspectName) {
  const stripped = aspectName.replace(/^Red Leaf\s+/i, '').replace(/^Forged:\s*/i, '');
  const words = stripped.split(/[\s–-]+/).filter((w) => w.length > 3);
  for (const word of words) {
    const row = db.prepare(`
      SELECT symbol, title FROM codex_entries
      WHERE title LIKE ? OR key LIKE ? OR content LIKE ?
      ORDER BY sort_order LIMIT 1
    `).get(`%${word}%`, `%${word.toLowerCase()}%`, `%${word}%`);
    if (row?.symbol) {
      const sym = extractEmojiRun(row.symbol) || row.symbol;
      if (aspectName.startsWith('Red Leaf')) return dedupeChain(['🍁', sym]).join('');
      return sym;
    }
  }
  return null;
}

function searchInsights(db, aspectName) {
  const rows = db.prepare(`
    SELECT body FROM insights
    WHERE body LIKE ? OR aspect_links_json LIKE ?
    LIMIT 5
  `).all(`%${aspectName}%`, `%${aspectName}%`);
  for (const row of rows) {
    const chains = extractNearName(row.body, aspectName);
    if (chains.length) return chains[0];
  }
  return null;
}

function searchGrok(db, aspectName) {
  let rows = [];
  try {
    rows = db.prepare(`
      SELECT assistant_text, user_text FROM grok_sessions
      WHERE assistant_text LIKE ? OR user_text LIKE ? OR title LIKE ?
      ORDER BY session_index DESC LIMIT 12
    `).all(`%${aspectName}%`, `%${aspectName}%`, `%${aspectName}%`);
  } catch {
    return null;
  }
  for (const row of rows) {
    for (const text of [row.assistant_text, row.user_text]) {
      const chains = extractNearName(text, aspectName);
      if (chains.length) return chains[0];
    }
  }
  return null;
}

function resolveFromDb(db, aspect) {
  const name = aspect.name?.trim();
  if (!name) return null;

  const fromGrok = searchGrok(db, name);
  if (fromGrok) return fromGrok;

  const fromInsight = searchInsights(db, name);
  if (fromInsight) return fromInsight;

  const fromCodex = searchCodex(db, name);
  if (fromCodex) return fromCodex;

  if (aspect.base_layer_link) {
    const link = extractEmojiRun(aspect.base_layer_link) || aspect.base_layer_link;
    const kw = keywordEmojis(name, 3);
    return dedupeChain([link, ...kw]).join('');
  }

  return null;
}

function buildDbSymbolMap(db) {
  const aspects = db.prepare('SELECT name, category, tier, base_layer_link FROM aspects').all();
  const map = {};
  for (const aspect of aspects) {
    const chain = resolveFromDb(db, aspect);
    if (chain && splitGraphemes(chain).length >= 1) {
      map[aspect.name] = chain;
    }
  }
  return map;
}

function saveSymbolMap(map) {
  fs.writeFileSync(MAP_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), map }, null, 2));
}

function loadSymbolMap() {
  if (!fs.existsSync(MAP_PATH)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
    return data.map || {};
  } catch {
    return {};
  }
}

module.exports = {
  buildDbSymbolMap,
  saveSymbolMap,
  loadSymbolMap,
  resolveFromDb,
  extractNearName,
  MAP_PATH,
};