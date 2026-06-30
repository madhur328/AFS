/**
 * Replace Twemoji-broken ZWJ emoji sequences across DB + symbol JSON maps.
 * Run: node scripts/fix-broken-emojis.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { applyEmojiFallbacks } = require('./emoji-fallbacks');

const ROOT = path.join(__dirname, '..');

function fixString(s) {
  if (!s || typeof s !== 'string') return { value: s, changed: false };
  const next = applyEmojiFallbacks(s);
  return { value: next, changed: next !== s };
}

function walkJson(value) {
  if (typeof value === 'string') {
    const { value: next, changed } = fixString(value);
    return { value: next, changed };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const arr = value.map((v) => {
      const r = walkJson(v);
      if (r.changed) changed = true;
      return r.value;
    });
    return { value: arr, changed };
  }
  if (value && typeof value === 'object') {
    let changed = false;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const r = walkJson(v);
      if (r.changed) changed = true;
      out[k] = r.value;
    }
    return { value: out, changed };
  }
  return { value, changed: false };
}

function fixJsonFile(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return 0;
  const raw = fs.readFileSync(full, 'utf8');
  const data = JSON.parse(raw);
  const { value, changed } = walkJson(data);
  if (!changed) return 0;
  fs.writeFileSync(full, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`  fixed ${relPath}`);
  return 1;
}

function fixTextFile(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return 0;
  const raw = fs.readFileSync(full, 'utf8');
  const { value, changed } = fixString(raw);
  if (!changed) return 0;
  fs.writeFileSync(full, value);
  console.log(`  fixed ${relPath}`);
  return 1;
}

function fixJsFile(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return 0;
  let raw = fs.readFileSync(full, 'utf8');
  let changed = false;
  for (const m of raw.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'/g)) {
    const original = m[1].replace(/\\n/g, '\n').replace(/\\'/g, "'");
    if (!/\p{Extended_Pictographic}/u.test(original)) continue;
    const { value: next } = fixString(original);
    if (next !== original) {
      const escaped = next.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      raw = raw.replace(m[0], `'${escaped}'`);
      changed = true;
    }
  }
  if (!changed) return 0;
  fs.writeFileSync(full, raw);
  console.log(`  fixed ${relPath}`);
  return 1;
}

(async () => {
  await db.initDb();
  let total = 0;

  console.log('JSON symbol maps…');
  for (const f of ['data/aspect-symbol-map.json', 'data/aspect-corpus-symbols.json']) {
    total += fixJsonFile(f);
  }

  console.log('JS/TS symbol registries…');
  total += fixJsFile('server/services/symbols.js');
  total += fixJsFile('server/services/aspect-detail.js');
  total += fixJsFile('client/src/lib/symbols.ts');

  console.log('Database aspect chains…');
  const rows = db.prepare('SELECT id, name, symbol_chain, mantra, detail_json FROM aspects').all();
  const upd = db.prepare(
    'UPDATE aspects SET symbol_chain = ?, mantra = ?, detail_json = ? WHERE id = ?'
  );
  let dbFixes = 0;
  for (const row of rows) {
    const chain = row.symbol_chain != null ? fixString(row.symbol_chain) : { value: row.symbol_chain, changed: false };
    const mantra = row.mantra != null ? fixString(row.mantra) : { value: row.mantra, changed: false };
    let detail = row.detail_json;
    let detailChanged = false;
    if (detail) {
      try {
        const parsed = JSON.parse(detail);
        const walked = walkJson(parsed);
        if (walked.changed) {
          detail = JSON.stringify(walked.value);
          detailChanged = true;
        }
      } catch (_) {}
    }
    if (chain.changed || mantra.changed || detailChanged) {
      upd.run(chain.value, mantra.value, detail, row.id);
      if (chain.changed) {
        console.log(`  ${row.name}: ${row.symbol_chain} → ${chain.value}`);
      } else if (detailChanged) {
        console.log(`  ${row.name}: detail_json emoji normalized`);
      }
      dbFixes++;
    }
  }
  total += dbFixes;

  db.saveDb();
  console.log(`\nDone — ${total} file/record fix(es).`);
  process.exit(0);
})();