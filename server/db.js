require('../scripts/load-env');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const { getDataDir } = require('./paths');
const dataDir = getDataDir();
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'afs.db');

let db = null;
let saveDeferred = 0;

function saveDb() {
  if (!db || saveDeferred > 0) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

/** Batch many writes — one disk flush at the end (avoids OOM during search index rebuild). */
function deferSave(fn) {
  saveDeferred += 1;
  try {
    return fn();
  } finally {
    saveDeferred -= 1;
    if (saveDeferred === 0) saveDb();
  }
}

function prepare(sql) {
  return {
    run(...params) {
      db.run(sql, params);
      saveDb();
      const r = db.exec('SELECT last_insert_rowid() as id');
      return { lastInsertRowid: r[0]?.values[0]?.[0] ?? 0 };
    },
    get(...params) {
      const stmt = db.prepare(sql);
      try {
        if (params.length) stmt.bind(params);
        return stmt.step() ? stmt.getAsObject() : undefined;
      } finally {
        stmt.free();
      }
    },
    all(...params) {
      const stmt = db.prepare(sql);
      const rows = [];
      try {
        if (params.length) stmt.bind(params);
        while (stmt.step()) rows.push(stmt.getAsObject());
      } finally {
        stmt.free();
      }
      return rows;
    },
  };
}

function exec(sql) {
  db.exec(sql);
  saveDb();
}

function initSchema() {
  exec(`
    CREATE TABLE IF NOT EXISTS identity (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      handle TEXT, title TEXT, bio TEXT, location TEXT,
      current_phase TEXT, evolution_path TEXT,
      proficiency_json TEXT, working_on_json TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS base_layer_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT, name TEXT, role TEXT,
      artifact_path TEXT, video_path TEXT,
      mantras_json TEXT, proficiency REAL DEFAULT 0.5
    );
    CREATE TABLE IF NOT EXISTS aspects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      symbol_chain TEXT, mantra TEXT, tier TEXT,
      potential_score REAL, mentions INTEGER DEFAULT 0,
      proficiency REAL DEFAULT 0.3, comprehension TEXT,
      category TEXT, base_layer_link TEXT,
      is_base_layer INTEGER DEFAULT 0,
      detail_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS synergies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aspect_a TEXT, aspect_b TEXT,
      fusion_name TEXT, description TEXT,
      strength REAL DEFAULT 0.5
    );
    CREATE TABLE IF NOT EXISTS codex_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, key TEXT NOT NULL,
      title TEXT NOT NULL, content TEXT, symbol TEXT,
      sort_order INTEGER DEFAULT 0,
      UNIQUE(category, key)
    );
    CREATE TABLE IF NOT EXISTS axioms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement TEXT NOT NULL, layer TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS protocols (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE, name TEXT NOT NULL,
      description TEXT, steps_json TEXT, operator TEXT
    );
    CREATE TABLE IF NOT EXISTS alchemy_fusions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, inputs_json TEXT,
      output_aspect TEXT, operator TEXT, notes TEXT
    );
    CREATE TABLE IF NOT EXISTS insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, body TEXT, source TEXT,
      tags_json TEXT, aspect_links_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, description TEXT,
      status TEXT DEFAULT 'active', target_date TEXT,
      aspect_link TEXT, progress REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, description TEXT,
      icon TEXT, unlocked_at TEXT, criteria TEXT
    );
    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, archetype TEXT,
      symbol_chain TEXT, mantra TEXT,
      description TEXT, active INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS techniques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE, name TEXT NOT NULL,
      description TEXT, config_json TEXT
    );
    CREATE TABLE IF NOT EXISTS daily_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_type TEXT NOT NULL, title TEXT, notes TEXT,
      ore_input TEXT, result_json TEXT,
      duration_min INTEGER,
      completed_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS forge_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocol TEXT NOT NULL, ore_input TEXT,
      result_json TEXT, operator TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, trigger_type TEXT,
      action_json TEXT, enabled INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS math_concepts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, domain TEXT,
      description TEXT, formula TEXT, afs_link TEXT
    );
    CREATE TABLE IF NOT EXISTS visualizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, type TEXT,
      path TEXT, description TEXT, aspect_link TEXT
    );
    CREATE TABLE IF NOT EXISTS search_index (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT, entity_id INTEGER,
      title TEXT, body TEXT, tags TEXT
    );
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      technique TEXT DEFAULT 'pomodoro',
      focus_min INTEGER, break_min INTEGER,
      cycles INTEGER, aspect_focus TEXT,
      notes TEXT, completed_at TEXT DEFAULT (datetime('now'))
    );
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
      user_chars INTEGER, assistant_chars INTEGER,
      FOREIGN KEY (conversation_id) REFERENCES grok_conversations(id)
    );
    CREATE INDEX IF NOT EXISTS idx_grok_sessions_type ON grok_sessions(session_type);
    CREATE INDEX IF NOT EXISTS idx_grok_sessions_conv ON grok_sessions(conversation_id);
    CREATE TABLE IF NOT EXISTS lore_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL,
      key TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      symbol TEXT,
      image_path TEXT,
      source TEXT,
      aspect_links_json TEXT,
      sort_order INTEGER DEFAULT 0,
      meta_json TEXT,
      UNIQUE(section, key)
    );
    CREATE TABLE IF NOT EXISTS proficiency_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      key TEXT NOT NULL,
      label TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      notes TEXT,
      self_assessed INTEGER DEFAULT 1,
      auto_suggested INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(domain, key)
    );
  `);
}

function migrateSchema() {
  const cols = prepare('PRAGMA table_info(aspects)').all();
  if (!cols.some((c) => c.name === 'detail_json')) {
    exec('ALTER TABLE aspects ADD COLUMN detail_json TEXT');
  }

  exec(`
    CREATE TABLE IF NOT EXISTS forge_reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aspect_key TEXT NOT NULL,
      reflection TEXT NOT NULL,
      intensity REAL DEFAULT 0.5,
      mastery_gain REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS forge_syntheses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      aspect_keys_json TEXT NOT NULL,
      reflection TEXT DEFAULT '',
      output TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

let SQL = null;

async function initDb() {
  SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  initSchema();
  migrateSchema();
  saveDb();
}

/** Reload sql.js from disk — required after offline scripts mutate afs.db while API is running. */
async function reloadFromDisk() {
  if (!SQL) SQL = await initSqlJs();
  if (!fs.existsSync(dbPath)) return false;
  db = new SQL.Database(fs.readFileSync(dbPath));
  return true;
}

function getDbPath() {
  return dbPath;
}

module.exports = { initDb, reloadFromDisk, getDbPath, prepare, exec, saveDb, deferSave };