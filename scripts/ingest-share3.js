/**
 * Ingest Grok share-3 (Symbols & Daily Tasks) into AFS platform DB.
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { rebuildSearchIndex } = require('../server/seed');

const DATA = path.join(__dirname, '..', 'data', 'grok-share-3');
const SESSIONS_FULL = path.join(DATA, 'sessions-full.json');
const SESSIONS_INDEX = path.join(DATA, 'sessions-index.json');
const FIVE_SYMBOLS = path.join(__dirname, '..', 'data', 'afp-five-symbols.json');

const AFP_PIPELINE_ASPECTS = [
  { name: 'Sprout of Nurturing', chain: '🌱🫶🍁', mantra: 'I nurture purity as fuel for faith', category: 'meta', tier: 'A' },
  { name: 'Tornado of Momentum', chain: '🌪️', mantra: 'Momentum is real', category: 'meta', tier: 'A' },
  { name: 'Engine of Efficiency', chain: '🚂', mantra: 'Every breakthrough upgrades the engine', category: 'meta', tier: 'A' },
  { name: 'Wings of Ambition', chain: '🪽🔥', mantra: 'Ambition gives the vector', category: 'forged', tier: 'B' },
  { name: 'Mirror of Truth', chain: '🪞⚓💧', mantra: 'I see myself seeing', category: 'forged', tier: 'B' },
];

function ensureGrokSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS grok_conversations (
      id TEXT PRIMARY KEY,
      title TEXT, url TEXT,
      turn_count INTEGER, char_count INTEGER,
      session_count INTEGER, source TEXT,
      imported_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS grok_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      session_index INTEGER,
      session_type TEXT NOT NULL,
      title TEXT NOT NULL,
      user_text TEXT, assistant_text TEXT,
      user_chars INTEGER, assistant_chars INTEGER
    );
  `);
}

function ingestShare3() {
  if (!fs.existsSync(SESSIONS_FULL) || !fs.existsSync(SESSIONS_INDEX)) {
    throw new Error(`Missing share-3 files. Run: node scripts/extract-share3.js`);
  }

  ensureGrokSchema();

  const index = JSON.parse(fs.readFileSync(SESSIONS_INDEX, 'utf-8'));
  const sessions = JSON.parse(fs.readFileSync(SESSIONS_FULL, 'utf-8'));
  const fiveData = JSON.parse(fs.readFileSync(FIVE_SYMBOLS, 'utf-8'));
  const convId = index.conversation_id;

  db.prepare('DELETE FROM grok_sessions WHERE conversation_id = ?').run(convId);
  db.prepare('DELETE FROM grok_conversations WHERE id = ?').run(convId);

  db.prepare(`
    INSERT INTO grok_conversations (id, title, url, turn_count, char_count, session_count, source)
    VALUES (?,?,?,?,?,?,?)
  `).run(
    convId,
    index.title,
    index.url,
    index.turn_count,
    index.char_count,
    sessions.length,
    'renderchat_share3'
  );

  const insertSession = db.prepare(`
    INSERT INTO grok_sessions (
      conversation_id, session_index, session_type, title,
      user_text, assistant_text, user_chars, assistant_chars
    ) VALUES (?,?,?,?,?,?,?,?)
  `);

  sessions.forEach((s) => {
    insertSession.run(
      convId,
      s.index,
      s.type,
      s.title,
      s.user_text || '',
      s.assistant_text || '',
      s.user_chars || 0,
      s.assistant_chars || 0
    );
  });

  // Codex: five symbols daily protocol
  const dailyContent = fiveData.symbols.map((s) =>
    `${s.symbol} ${s.name}\nRitual: ${s.ritual}\n${s.task}`
  ).join('\n\n---\n\n');

  db.prepare(`
    INSERT OR REPLACE INTO codex_entries (category, key, title, content, symbol, sort_order)
    VALUES (?,?,?,?,?,?)
  `).run(
    'origin',
    'share3-five-symbols',
    'Five AFP Symbols — Daily Protocol (Share-3)',
    `${fiveData.cycle}\n\n${dailyContent}\n\nSource: ${fiveData.source}`,
    '⚓🔥🌱🌪️🚂',
    95
  );

  db.prepare(`
    INSERT OR REPLACE INTO codex_entries (category, key, title, content, symbol, sort_order)
    VALUES (?,?,?,?,?,?)
  `).run(
    'origin',
    'share3-thread',
    'Grok Share-3 — Symbols & Daily Tasks',
    `${index.url} — ${index.turn_count} messages, ${sessions.length} extracted sessions. `
    + `Relates to genesis thread ${index.related_conversation}. `
    + `Counts: ${JSON.stringify(index.counts)}.`,
    '🌪️',
    96
  );

  const formulaContent = fiveData.formulas.map((f) => `${f.formula} — ${f.name}`).join('\n');
  db.prepare(`
    INSERT OR REPLACE INTO codex_entries (category, key, title, content, symbol, sort_order)
    VALUES (?,?,?,?,?,?)
  `).run(
    'origin',
    'share3-formulas',
    'Alchemical Formulas (Share-3 Session)',
    formulaContent + '\n\nDiscovered in live study session: conviction + ambition + anchor transmutes to tornado; inner anchor yields mirror; slowed tornado becomes whirlpool.',
    '🔥🪽⚓',
    97
  );

  // Update five-symbols codex from genesis with cross-link
  db.prepare(`
    UPDATE codex_entries SET content = content || ?
    WHERE key = 'five-symbols'
  `).run(
    `\n\n[Share-3 integration] Full daily rituals: see share3-five-symbols. ${index.url}`
  );

  // AFP pipeline aspects
  const insertAspect = db.prepare(`
    INSERT OR IGNORE INTO aspects (
      name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
      comprehension, category, base_layer_link, is_base_layer
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);
  AFP_PIPELINE_ASPECTS.forEach((a) => {
    insertAspect.run(
      a.name, a.chain, a.mantra, a.tier, 0.85, 12, 0.55,
      `AFP pipeline aspect — forged in share-3 symbols thread`,
      a.category, a.chain.slice(0, 2), 0
    );
  });

  // Insights from key sessions
  db.prepare('DELETE FROM insights WHERE source = ?').run('grok-share3');
  const insertInsight = db.prepare(
    'INSERT INTO insights (title, body, source, tags_json, aspect_links_json) VALUES (?,?,?,?,?)'
  );
  const keySessions = sessions.filter((s) =>
    ['daily', 'codex', 'origin'].includes(s.type)
  ).slice(0, 12);

  keySessions.forEach((s) => {
    const body = [s.user_text, s.assistant_text].filter(Boolean).join('\n\n---\n\n').slice(0, 12000);
    insertInsight.run(
      `[Share-3] ${s.title}`.slice(0, 200),
      body,
      'grok-share3',
      JSON.stringify([s.type, 'share-3', 'AFP-symbols']),
      JSON.stringify(['Sprout of Nurturing', 'Tornado of Momentum', 'Engine of Efficiency'])
    );
  });

  db.prepare(`
    UPDATE identity SET working_on_json = ?
    WHERE id = 1
  `).run(JSON.stringify([
    'Share-3 symbols thread integrated into Grok Origin',
    'Five AFP daily rituals active in codex',
    'AFS Platform masterpiece pass',
    'ENTHEA ↔ AFS visual bridge',
  ]));

  rebuildSearchIndex();
  console.log(`Share-3 ingest: ${sessions.length} sessions → ${convId}`);
  return { conversationId: convId, sessionCount: sessions.length, counts: index.counts };
}

if (require.main === module) {
  db.initDb().then(() => ingestShare3());
}

module.exports = { ingestShare3 };