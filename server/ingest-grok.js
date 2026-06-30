const fs = require('fs');
const db = require('./db');
const { rebuildSearchIndex } = require('./seed');
const { getGrokDataDir, grokDataPath } = require('./paths');

function grokPaths() {
  const dataDir = getGrokDataDir();
  return {
    dataDir,
    sessionsFull: grokDataPath('sessions-full.json'),
    sessionsIndex: grokDataPath('sessions-index.json'),
    structured: grokDataPath('conversation-structured.json'),
  };
}

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
    CREATE INDEX IF NOT EXISTS idx_grok_sessions_type ON grok_sessions(session_type);
    CREATE INDEX IF NOT EXISTS idx_grok_sessions_conv ON grok_sessions(conversation_id);
  `);
}

function ingestGrok() {
  const { dataDir, sessionsFull, sessionsIndex, structured: structuredPath } = grokPaths();
  if (!fs.existsSync(sessionsFull) || !fs.existsSync(sessionsIndex)) {
    throw new Error(
      `Missing grok session files in ${dataDir}. Run: node scripts/ensure-grok-data.js`,
    );
  }

  ensureGrokSchema();

  const index = JSON.parse(fs.readFileSync(sessionsIndex, 'utf-8'));
  const sessions = JSON.parse(fs.readFileSync(sessionsFull, 'utf-8'));
  const structured = fs.existsSync(structuredPath)
    ? JSON.parse(fs.readFileSync(structuredPath, 'utf-8'))
    : null;

  const convId = index.conversation_id;

  db.prepare('DELETE FROM grok_sessions WHERE conversation_id = ?').run(convId);
  db.prepare('DELETE FROM grok_conversations WHERE id = ?').run(convId);

  db.prepare(`
    INSERT INTO grok_conversations (id, title, url, turn_count, char_count, session_count, source)
    VALUES (?,?,?,?,?,?,?)
  `).run(
    convId,
    index.title || 'AFS Genesis Thread',
    index.url,
    index.turn_count || structured?.turn_count || 0,
    index.char_count || structured?.char_count || 0,
    sessions.length,
    'playwright_brave_profile'
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

  // Codex enrichment from origin thread
  const afpDef = sessions.find((s) => s.title?.includes('AFP named'));
  if (afpDef) {
    db.prepare(`
      INSERT OR REPLACE INTO codex_entries (category, key, title, content, symbol, sort_order)
      VALUES ('origin', 'afp-genesis', 'AFP Genesis (Grok thread)', ?, '⚒️', 100)
    `).run(
      'Aspect Forge Protocol named in grok.com thread 37560952. '
      + '8-step pipeline: goal → standards → simulated journey → aspects → mastery → metaphors → symbol.'
    );
  }

  db.prepare(`
    INSERT OR REPLACE INTO codex_entries (category, key, title, content, symbol, sort_order)
    VALUES ('origin', 'grok-thread', 'AFS Genesis Thread', ?, '🍁', 99)
  `).run(
    `${index.url} — ${index.turn_count} turns, ${sessions.length} extracted sessions. `
    + `AFP: ${index.counts?.AFP || 0}, EOT: ${index.counts?.EOT || 0}.`
  );

  const codexSeeds = [
    ['origin', 'aspect-mastery', 'Aspect Mastery', 'Private journaling system — daily aspect focus with symbols kept personal.', '📓', 101],
    ['origin', 'mind-guardian-genesis', 'Mind Guardian Genesis', 'Unified inner defense from EOT cluster: Tanjiro, Nash, Turing, Zenitsu, Omniknight.', '🛡️', 102],
    ['origin', 'base-layer-genesis', 'Base Layer Genesis', require('./base-layer').loadBaseLayerConfig().codexSummary + ' — formalized across genesis + Save5/6 threads.', '⚓', 103],
    ['origin', 'five-symbols', 'Five Core Symbols', '⚓ stability · 🔥 conviction · 🌱 purity · 🌪️ momentum · 🚂 efficiency', '🌪️', 104],
  ];
  const insertCodex = db.prepare(`
    INSERT OR REPLACE INTO codex_entries (category, key, title, content, symbol, sort_order)
    VALUES (?,?,?,?,?,?)
  `);
  codexSeeds.forEach((c) => insertCodex.run(...c));

  db.prepare('DELETE FROM insights WHERE source = ?').run('grok-origin');

  const insightSeeds = [
    sessions.find((s) => s.type === 'origin'),
    sessions.find((s) => s.title?.includes('AFP named') || s.title?.includes('Aspect Forge Protocol')),
    sessions.find((s) => s.title?.includes('Mind Guardian')),
    ...sessions.filter((s) => s.type === 'AFP').slice(0, 5),
    ...sessions.filter((s) => s.type === 'EOT').slice(0, 8),
    ...sessions.filter((s) => s.type === 'codex').slice(0, 4),
  ].filter(Boolean);

  const seenTitles = new Set();
  const insertInsight = db.prepare(
    'INSERT INTO insights (title, body, source, tags_json, aspect_links_json) VALUES (?,?,?,?,?)'
  );

  insightSeeds.forEach((s) => {
    const title = `[Grok Origin] ${s.title}`.slice(0, 200);
    if (seenTitles.has(title)) return;
    seenTitles.add(title);
    const body = [s.user_text, s.assistant_text].filter(Boolean).join('\n\n---\n\n').slice(0, 12000);
    insertInsight.run(
      title,
      body,
      'grok-origin',
      JSON.stringify([s.type, 'genesis', '37560952']),
      JSON.stringify([])
    );
  });

  db.prepare(`
    UPDATE identity SET
      evolution_path = ?,
      working_on_json = ?
    WHERE id = 1
  `).run(
    'Fallen Valkyrie → Aspect Mastery → AFP/EOT → Red Leaf Sovereign → AFS Platform',
    JSON.stringify([
      'Grok origin thread integrated into platform',
      'AFS Platform v1 with genesis codex',
      'Save8 Alchemy Codex expansion',
      'ENTHEA ↔ AFS visual bridge',
    ])
  );

  const ach = db.prepare("SELECT id FROM achievements WHERE title = 'Genesis Thread Loaded'").get();
  if (!ach) {
    db.prepare(
      'INSERT INTO achievements (title, description, icon, unlocked_at, criteria) VALUES (?,?,?,?,?)'
    ).run('Genesis Thread Loaded', 'Imported full grok.com AFS origin conversation', '🍁', new Date().toISOString(), 'Run ingest-grok');
  } else {
    db.prepare("UPDATE achievements SET unlocked_at = ? WHERE title = 'Genesis Thread Loaded'").run(new Date().toISOString());
  }

  // Update AFP protocol steps from genesis if present
  const afpSteps = [
    'Describe goal to beginner',
    'Define success criteria + enabling factors',
    'Simulate journey with normal feedback',
    'Extract core transformations as Aspects',
    'Isolated Aspect mastery analysis',
    'Poetic/metaphoric growth + pitfalls',
    'Condense to symbol/emoji/mantra',
    'Integration into personal system',
  ];
  db.prepare(`
    UPDATE protocols SET description = ?, steps_json = ?
    WHERE code = 'AFP'
  `).run(
    'Aspect Forge Protocol — genesis-defined simulation engine (grok thread 37560952)',
    JSON.stringify(afpSteps)
  );

  rebuildSearchIndex();
  console.log(`Grok ingest: ${sessions.length} sessions → grok_conversations/${convId}`);
  return { conversationId: convId, sessionCount: sessions.length, counts: index.counts };
}

if (require.main === module) {
  db.initDb().then(() => {
    ingestGrok();
  });
}

module.exports = { ingestGrok };