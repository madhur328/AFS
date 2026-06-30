/**
 * Seed lore (alchemy, myths, poems, prayers) + proficiency tracks from data/lore-corpus.json
 * Run: node scripts/seed-lore.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { rebuildSearchIndex } = require('../server/seed');
const { getDefaultProficiencyJson } = require('../server/base-layer');

const corpusPath = path.join(__dirname, '..', 'data', 'lore-corpus.json');
const storiesDir = path.join(__dirname, '..', 'data', 'lore-stories');
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));

/** Optional long-form myth bodies live in data/lore-stories/{key}.txt */
for (const section of ['myths']) {
  for (const item of corpus[section] || []) {
    const storyFile = path.join(storiesDir, `${item.key}.txt`);
    if (fs.existsSync(storyFile)) {
      item.content = fs.readFileSync(storyFile, 'utf8').trim();
    }
  }
}
const loreImagesDir = path.join(__dirname, '..', 'data', 'lore-images');

const ALCHEMY_LEVEL_HINTS = { mind: 2, body: 2, habits: 3, routines: 3, soul: 2 };

function imagePath(fileName) {
  if (!fileName) return null;
  const full = path.join(loreImagesDir, fileName);
  return fs.existsSync(full) ? full : null;
}

function seedLoreEntries() {
  db.prepare('DELETE FROM lore_entries').run();
  const insert = db.prepare(`
    INSERT INTO lore_entries (section, key, title, content, symbol, image_path, source, aspect_links_json, sort_order, meta_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let order = 0;
  const sectionMap = {
    alchemy: 'alchemy',
    myths: 'myth',
    poems: 'poem',
    prayers: 'prayer',
    base_aspects: 'base-aspect',
  };

  for (const [corpusKey, dbSection] of Object.entries(sectionMap)) {
    const items = corpus[corpusKey] || [];
    items.forEach((item, idx) => {
      const metaFields = {};
      if (item.excerpt) {
        metaFields.excerpt = item.excerpt;
        metaFields.expandable = corpusKey === 'myths';
      }
      if (item.extra_images) metaFields.extra_images = item.extra_images;
      if (item.visualization) metaFields.visualization = item.visualization;
      if (item.proficiency_pct != null) metaFields.proficiency_pct = item.proficiency_pct;
      if (item.base_layer_key) metaFields.base_layer_key = item.base_layer_key;
      const meta = Object.keys(metaFields).length ? JSON.stringify(metaFields) : null;
      insert.run(
        dbSection,
        item.key,
        item.title,
        item.content,
        item.symbol || null,
        imagePath(item.image),
        item.source || corpus.source,
        item.aspect_links ? JSON.stringify(item.aspect_links) : null,
        order++,
        meta
      );
    });
  }

  // Mirror alchemy into codex_entries for Codex page
  db.prepare("DELETE FROM codex_entries WHERE category = 'alchemy'").run();
  const codexInsert = db.prepare(`
    INSERT INTO codex_entries (category, key, title, content, symbol, sort_order)
    VALUES ('alchemy', ?, ?, ?, ?, ?)
  `);
  (corpus.alchemy || []).forEach((item, idx) => {
    codexInsert.run(item.key, item.title, item.content, item.symbol || '⚗️', idx);
  });
}

function seedProficiencyTracks() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM proficiency_tracks').get().c;
  if (existing > 0) return { skipped: true };

  const defaults = getDefaultProficiencyJson();
  const insert = db.prepare(`
    INSERT INTO proficiency_tracks (domain, key, label, level, notes, self_assessed, auto_suggested)
    VALUES (?, ?, ?, ?, ?, 1, 0)
  `);

  (corpus.alchemy || []).forEach((item) => {
    const hint = ALCHEMY_LEVEL_HINTS[item.key] ?? 1;
    insert.run('alchemy', item.key, item.title, hint, 'Seeded from Grok Origin — self-audit and adjust.');
  });

  const opMap = { EOT: 3, DCS: 2, AFP: 2, DKR: 3, DFR: 3 };
  Object.entries(defaults.operators || {}).forEach(([key, val]) => {
    const level = opMap[key] ?? Math.round((val || 0) * 7);
    insert.run('operators', key.toLowerCase(), `${key} operator`, level, 'Suggested from identity seed — edit freely.');
  });

  Object.entries(defaults.baseLayer || {}).forEach(([key, val]) => {
    const level = Math.round((val || 0) * 7);
    insert.run('base-layer', key, `Base layer: ${key}`, level, 'Suggested from base layer JSON.');
  });

  return { skipped: false };
}

function mimeForLoreImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function writeBaseAspectLoreFallback() {
  const items = corpus.base_aspects || [];
  if (!items.length) return;

  const fallback = items.map((item, idx) => {
    const meta = {
      excerpt: item.excerpt || null,
      extra_images: item.extra_images || [],
      visualization: item.visualization || null,
      proficiency_pct: item.proficiency_pct ?? null,
      base_layer_key: item.base_layer_key || null,
    };
    const primary = imagePath(item.image);
    let image_data_url = null;
    if (primary) {
      const buf = fs.readFileSync(primary);
      image_data_url = `data:${mimeForLoreImage(primary)};base64,${buf.toString('base64')}`;
    }
    const extra_image_data_urls = {};
    for (const file of meta.extra_images) {
      const full = path.join(loreImagesDir, file);
      if (!fs.existsSync(full)) continue;
      const buf = fs.readFileSync(full);
      extra_image_data_urls[file] = `data:${mimeForLoreImage(full)};base64,${buf.toString('base64')}`;
    }
    return {
      id: 9000 + idx,
      section: 'base-aspect',
      key: item.key,
      title: item.title,
      content: item.content,
      symbol: item.symbol || '⚓',
      source: item.source || corpus.source,
      aspect_links: item.aspect_links || [],
      has_image: Boolean(image_data_url),
      image_data_url,
      extra_images: meta.extra_images,
      extra_image_data_urls,
      visualization: meta.visualization,
      proficiency_pct: meta.proficiency_pct,
      base_layer_key: meta.base_layer_key,
      excerpt: meta.excerpt,
      expandable: false,
      sort_order: idx,
    };
  });

  const out = path.join(__dirname, '..', 'client', 'src', 'data', 'base-aspect-lore.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(fallback, null, 2));
  console.log(`Base aspect lore fallback: ${out} (${fallback.length} entries)`);
}

(async () => {
  await db.initDb();
  seedLoreEntries();
  writeBaseAspectLoreFallback();
  const prof = seedProficiencyTracks();
  rebuildSearchIndex();
  db.saveDb();
  const loreCount = db.prepare('SELECT COUNT(*) as c FROM lore_entries').get().c;
  const baseCount = db.prepare("SELECT COUNT(*) as c FROM lore_entries WHERE section = 'base-aspect'").get().c;
  const profCount = db.prepare('SELECT COUNT(*) as c FROM proficiency_tracks').get().c;
  console.log(`Lore seeded: ${loreCount} entries (${baseCount} base-aspect)`);
  console.log(`Proficiency tracks: ${profCount}${prof.skipped ? ' (existing, not reset)' : ''}`);
  process.exit(0);
})();