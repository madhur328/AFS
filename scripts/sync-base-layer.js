/**
 * Sync Base Layer slots + base aspects into live DB (idempotent).
 * Usage: node scripts/sync-base-layer.js
 */
const db = require('../server/db');
const {
  getBaseLayerSlots,
  getBaseAspectMeta,
  getDefaultProficiencyJson,
  getBaseLayerLabel,
  REMOVED_BASE_SYMBOLS,
  getRemovedBaseMeta,
  loadBaseLayerConfig,
} = require('../server/base-layer');
const { rebuildSearchIndex } = require('../server/seed');

const REMOVED_LINK_REMAP = {
  '🫶': '🔥',
  '🔶': '🔑',
  '💎': '🔑',
};

async function main() {
  await db.initDb();

  const slots = getBaseLayerSlots();
  const baseAspects = getBaseAspectMeta();
  const canonicalSymbols = slots.map((s) => s.symbol);
  const removedNames = getRemovedBaseMeta().map((r) => r.name);

  const existing = db.prepare('SELECT symbol FROM base_layer_slots').all().map((r) => r.symbol);
  const insertSlot = db.prepare(`
    INSERT INTO base_layer_slots (symbol, name, role, artifact_path, video_path, mantras_json, proficiency)
    VALUES (?,?,?,?,?,?,?)
  `);
  const updateSlot = db.prepare(`
    UPDATE base_layer_slots SET name=?, role=?, artifact_path=?, video_path=?, mantras_json=?, proficiency=?
    WHERE symbol=?
  `);

  let added = 0;
  let updated = 0;
  for (const s of slots) {
    if (!existing.includes(s.symbol)) {
      insertSlot.run(
        s.symbol, s.name, s.role, s.artifact, s.video,
        JSON.stringify(s.mantras), s.proficiency
      );
      added += 1;
    } else {
      updateSlot.run(s.name, s.role, s.artifact, s.video, JSON.stringify(s.mantras), s.proficiency, s.symbol);
      updated += 1;
    }
  }

  let removedSlots = 0;
  for (const sym of existing) {
    if (!canonicalSymbols.includes(sym)) {
      db.prepare('DELETE FROM base_layer_slots WHERE symbol = ?').run(sym);
      removedSlots += 1;
    }
  }

  const upsertAspect = db.prepare(`
    INSERT INTO aspects (
      name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
      comprehension, category, base_layer_link, is_base_layer
    ) VALUES (?,?,?,?,?,?,?,?,?,?,1)
    ON CONFLICT(name) DO UPDATE SET
      symbol_chain = excluded.symbol_chain,
      mantra = COALESCE(excluded.mantra, aspects.mantra),
      tier = 'S',
      category = 'meta',
      base_layer_link = excluded.base_layer_link,
      is_base_layer = 1,
      comprehension = excluded.comprehension
  `);

  for (const [name, meta] of Object.entries(baseAspects)) {
    upsertAspect.run(
      name, meta.chain, meta.mantra, 'S', 0.9, 25, 0.65,
      `Base Layer primitive — ${name}`,
      'meta', meta.link
    );
  }

  for (const slot of slots) {
    if (Object.keys(baseAspects).includes(slot.name)) continue;
    upsertAspect.run(
      slot.name,
      slot.symbol,
      slot.mantras?.[0] || '',
      'S', 0.9, 20, slot.proficiency,
      `Base Layer primitive — ${slot.name}`,
      'meta', slot.symbol
    );
  }

  db.prepare(`
    UPDATE aspects SET is_base_layer = 1, base_layer_link = '🌪️', category = 'meta', tier = 'S'
    WHERE name = 'Tornado of Momentum'
  `).run();

  const demote = db.prepare(`
    UPDATE aspects SET is_base_layer = 0,
      comprehension = CASE
        WHEN name = 'Unwavering Heart' THEN 'Derived aspect — emotional core anchored in Fire of Conviction'
        WHEN name = 'Signal / Structure' THEN 'Derived aspect — FEEL. ALIGN. TRANSCEND. via Key of Clarity'
        WHEN name = 'Forge / Value' THEN 'Derived aspect — value forged through clarity and action'
        ELSE comprehension
      END
    WHERE is_base_layer = 1 AND (base_layer_link IN (?,?,?) OR name IN (?,?,?))
  `);
  demote.run(...REMOVED_BASE_SYMBOLS, ...removedNames);

  for (const [oldLink, newLink] of Object.entries(REMOVED_LINK_REMAP)) {
    db.prepare(`
      UPDATE aspects SET base_layer_link = ?, is_base_layer = 0
      WHERE base_layer_link = ? AND is_base_layer = 0
    `).run(newLink, oldLink);
  }

  db.prepare(`
    UPDATE aspects SET base_layer_link = '🔥', is_base_layer = 0, symbol_chain = '🛡️🌱'
    WHERE name = 'Unwavering Heart'
  `).run();

  for (const [name, chain, mantra, link] of [
    ['Forge / Value', '🔶🔑⚒️', 'Value forged through clarity', '🔑'],
    ['Signal / Structure', '💎🔑📡', 'FEEL. ALIGN. TRANSCEND.', '🔑'],
  ]) {
    db.prepare(`
      INSERT INTO aspects (name, symbol_chain, mantra, tier, potential_score, mentions, proficiency, comprehension, category, base_layer_link, is_base_layer)
      VALUES (?, ?, ?, 'A', 0.7, 10, 0.6, 'Derived aspect', 'meta', ?, 0)
      ON CONFLICT(name) DO UPDATE SET symbol_chain = excluded.symbol_chain, is_base_layer = 0, base_layer_link = excluded.base_layer_link
    `).run(name, chain, mantra, link);
  }

  db.prepare(`
    UPDATE aspects SET base_layer_link = '🔑', is_base_layer = 0
    WHERE name IN ('Kohinoor Forge Run', 'ConceptualCartographer', 'Signal / Structure')
  `).run();

  const identity = db.prepare('SELECT proficiency_json FROM identity WHERE id = 1').get();
  let prof = {};
  try { prof = JSON.parse(identity?.proficiency_json || '{}'); } catch { prof = {}; }
  db.prepare('UPDATE identity SET proficiency_json = ? WHERE id = 1').run(
    JSON.stringify(getDefaultProficiencyJson(prof))
  );

  const label = getBaseLayerLabel();
  db.prepare(`
    INSERT OR REPLACE INTO codex_entries (category, key, title, content, symbol, sort_order)
    VALUES ('origin', 'base-layer-canonical', ?, ?, '⚓', 102)
  `).run(
    label,
    loadBaseLayerConfig().codexSummary
      + ' — Forge / Value, Unwavering Heart, and Signal / Structure are derived aspects (not base primitives).'
  );

  db.prepare(`
    UPDATE goals SET aspect_link = 'Key of Clarity' WHERE aspect_link = 'Signal / Structure'
  `).run();

  rebuildSearchIndex();
  console.log(
    `Base Layer sync: +${added} slots, updated ${updated}, removed ${removedSlots} slots, ` +
    `${Object.keys(baseAspects).length} pipeline base aspects, demoted ${removedNames.join(', ')}`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });