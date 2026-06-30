const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db'); // prepare available after initDb in index.js
const { isAllowedMediaPath, mimeForPath, launchVisualizationPath } = require('../services/afs-videos');
const { runForge, runDailyRun, OPERATORS } = require('../services/forge');
const { tierFromPotential } = require('../services/tiers');
const { buildAspectDetail, buildDetailJson } = require('../services/aspect-detail');
const { searchAspectDirectory } = require('../services/aspect-search');
const { getAspectFaceCache, invalidateAspectFaceCache } = require('../services/aspect-face-cache');
const { resolveAspectSymbolChain, displaySymbolPreview, ASPECT_SYMBOLS, ASPECT_ALIASES } = require('../services/symbols');
const pulseBus = require('../services/pulse-bus');
const { assessKernelReadiness } = require('../services/kernel-readiness');
const { generateKernelRoutes } = require('../services/kernel-codegen');
const { spiralTelemetry } = require('../services/kernel-spiral');
const kernelStore = require('../services/kernel-store');


function enrichAspect(aspect) {
  // Origin symbol chains are copied verbatim from Grok EOT — never re-resolved.
  const symbol_chain = aspect.symbol_chain?.trim()
    ? aspect.symbol_chain
    : resolveAspectSymbolChain(aspect.name, aspect.category, aspect.tier, '');
  const symbol_preview = displaySymbolPreview(symbol_chain);
  return { ...aspect, symbol_chain, symbol_preview };
}
const { rebuildSearchIndex } = require('../seed');

const router = express.Router();

router.get('/dashboard', (req, res) => {
  const { getDashboardCached, buildDashboardPayload } = require('../services/dashboard-builder');
  const kernelStore = require('../services/kernel-store');
  const bypass = req.query.fresh === '1';
  let payload;
  let cached = false;
  if (bypass) {
    payload = buildDashboardPayload();
  } else {
    const result = getDashboardCached();
    payload = result.payload;
    cached = result.hit;
  }
  const cache = kernelStore.storeStats();
  res.json({
    ...payload,
    _kernel: {
      cached,
      cacheStats: { hitRate: cache.hitRate, entries: cache.entries },
    },
  });
});

router.get('/aspects/face-index', (req, res) => {
  try {
    const cache = getAspectFaceCache(db);
    res.json({ byId: cache.byId, builtAt: cache.builtAt, aspectCount: cache.aspectCount, faceCount: cache.faceCount });
  } catch (err) {
    console.error('[aspects/face-index]', err);
    res.status(500).json({ error: err.message || 'Face index build failed' });
  }
});

router.get('/aspects', (req, res) => {
  try {
    const tier = req.query.tier && req.query.tier !== 'undefined' ? req.query.tier : '';
    const category = req.query.category && req.query.category !== 'undefined' ? req.query.category : '';
    const q = req.query.q && req.query.q !== 'undefined' ? req.query.q : '';
    const fresh = req.query.fresh === '1';
    const { getAspectsRegistry } = require('../services/module-cache');

    if (!tier && !category && !q.trim()) {
      const { data } = getAspectsRegistry(
        () => {
          const rows = db
            .prepare('SELECT * FROM aspects ORDER BY potential_score DESC, tier ASC, name ASC')
            .all();
          return rows.map(enrichAspect);
        },
        { fresh },
      );
      return res.json(data);
    }

    let sql = 'SELECT * FROM aspects WHERE 1=1';
    const params = [];
    if (tier) { sql += ' AND tier = ?'; params.push(tier); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY potential_score DESC, tier ASC, name ASC';
    const rows = db.prepare(sql).all(...params);

    if (q.trim()) {
      return res.json(searchAspectDirectory(db, rows, { q, enrichAspect }));
    }

    res.json(rows.map(enrichAspect));
  } catch (err) {
    console.error('[aspects]', err);
    res.status(500).json({ error: err.message || 'Aspect registry failed' });
  }
});

router.get('/aspects/:id', (req, res) => {
  try {
    const aspect = db.prepare('SELECT * FROM aspects WHERE id = ?').get(req.params.id);
    if (!aspect) return res.status(404).json({ error: 'Not found' });
    const enriched = enrichAspect(aspect);
    res.json(buildAspectDetail(db, { ...aspect, symbol_chain: enriched.symbol_chain }));
  } catch (err) {
    console.error('[aspects/:id]', err);
    res.status(500).json({ error: err.message || 'Aspect detail failed' });
  }
});

router.post('/aspects', (req, res) => {
  const {
    name, symbol_chain, mantra, category = 'forged',
    comprehension, proficiency = 0.3, potential_score = 0.5, mentions = 0,
    base_layer_link, is_base_layer = 0,
    identity, coreAffirmation, supremeMantra, radiantFaces, integration,
  } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  const tier = tierFromPotential(potential_score, Boolean(is_base_layer));
  const detailJson = buildDetailJson({ identity, coreAffirmation, supremeMantra, radiantFaces, integration });
  try {
    const info = db.prepare(`
      INSERT INTO aspects (
        name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
        comprehension, category, base_layer_link, is_base_layer, detail_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      name.trim(),
      symbol_chain || resolveAspectSymbolChain(name.trim(), category, tier),
      mantra || null,
      tier,
      potential_score,
      mentions,
      proficiency,
      comprehension || `Manual aspect — ${name.trim()}`,
      category,
      base_layer_link || null,
      is_base_layer ? 1 : 0,
      detailJson
    );
    rebuildSearchIndex();
    invalidateAspectFaceCache();
    const aspect = db.prepare('SELECT * FROM aspects WHERE id = ?').get(info.lastInsertRowid);
    pulseBus.emitPulse('aspects', { name: name.trim(), tier }, { action: 'aspects.create', aspectId: info.lastInsertRowid });
    res.status(201).json(buildAspectDetail(db, aspect));
  } catch (err) {
    if (String(err).includes('UNIQUE')) return res.status(409).json({ error: 'Aspect name already exists' });
    throw err;
  }
});

router.patch('/aspects/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM aspects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const {
    name, symbol_chain, mantra, category, comprehension,
    proficiency, potential_score, mentions, base_layer_link, is_base_layer,
    identity, coreAffirmation, supremeMantra, radiantFaces, integration,
  } = req.body;

  const detailJson = buildDetailJson({
    identity, coreAffirmation, supremeMantra, radiantFaces, integration,
  }) ?? existing.detail_json;

  const nextPotential = potential_score ?? existing.potential_score;
  const nextIsBase = is_base_layer != null ? Boolean(is_base_layer) : Boolean(existing.is_base_layer);
  const nextTier = tierFromPotential(nextPotential, nextIsBase);

  db.prepare(`
    UPDATE aspects SET
      name = COALESCE(?, name),
      symbol_chain = COALESCE(?, symbol_chain),
      mantra = COALESCE(?, mantra),
      tier = ?,
      category = COALESCE(?, category),
      comprehension = COALESCE(?, comprehension),
      proficiency = COALESCE(?, proficiency),
      potential_score = COALESCE(?, potential_score),
      mentions = COALESCE(?, mentions),
      base_layer_link = COALESCE(?, base_layer_link),
      is_base_layer = COALESCE(?, is_base_layer),
      detail_json = COALESCE(?, detail_json)
    WHERE id = ?
  `).run(
    name?.trim() || null,
    symbol_chain ?? null,
    mantra ?? null,
    nextTier,
    category ?? null,
    comprehension ?? null,
    proficiency ?? null,
    potential_score ?? null,
    mentions ?? null,
    base_layer_link ?? null,
    is_base_layer != null ? (is_base_layer ? 1 : 0) : null,
    detailJson,
    req.params.id
  );
  rebuildSearchIndex();
  invalidateAspectFaceCache();
  const aspect = db.prepare('SELECT * FROM aspects WHERE id = ?').get(req.params.id);
  res.json(buildAspectDetail(db, aspect));
});

router.delete('/aspects/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM aspects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const name = existing.name;
  db.prepare('DELETE FROM synergies WHERE aspect_a = ? OR aspect_b = ?').run(name, name);
  db.prepare('DELETE FROM aspects WHERE id = ?').run(req.params.id);
  rebuildSearchIndex();
  invalidateAspectFaceCache();
  res.json({ ok: true, id: Number(req.params.id), name });
});

router.get('/synergies', (req, res) => {
  res.json(db.prepare('SELECT * FROM synergies ORDER BY strength DESC').all());
});

router.get('/codex', (req, res) => {
  const { getCodexGrouped } = require('../services/module-cache');
  const fresh = req.query.fresh === '1';
  const { data } = getCodexGrouped(
    () => {
      const entries = db.prepare('SELECT * FROM codex_entries ORDER BY category, sort_order').all();
      return entries.reduce((acc, e) => {
        (acc[e.category] = acc[e.category] || []).push(e);
        return acc;
      }, {});
    },
    { fresh },
  );
  res.json(data);
});

function enrichLoreRow(row) {
  if (!row) return row;
  const meta = JSON.parse(row.meta_json || '{}');
  const {
    excerpt,
    expandable,
    extra_images,
    visualization,
    proficiency_pct,
    base_layer_key,
    ...restMeta
  } = meta;
  const loreImagesDir = path.join(require('../paths').getProjectRoot(), 'data', 'lore-images');
  const extraImageFiles = Array.isArray(extra_images) ? extra_images : [];
  return {
    ...row,
    aspect_links: JSON.parse(row.aspect_links_json || '[]'),
    has_image: Boolean(row.image_path && fs.existsSync(row.image_path)),
    excerpt: excerpt || null,
    expandable: Boolean(expandable && excerpt),
    extra_images: extraImageFiles,
    extra_images_available: extraImageFiles.filter((file) =>
      fs.existsSync(path.join(loreImagesDir, file))
    ),
    visualization: visualization || null,
    proficiency_pct: proficiency_pct ?? null,
    base_layer_key: base_layer_key || null,
    meta_json: Object.keys(restMeta).length ? JSON.stringify(restMeta) : null,
  };
}

router.get('/lore', (req, res) => {
  const section = (req.query.section || '').trim();
  const rows = section
    ? db.prepare('SELECT * FROM lore_entries WHERE section = ? ORDER BY sort_order').all(section)
    : db.prepare('SELECT * FROM lore_entries ORDER BY section, sort_order').all();
  res.json(rows.map(enrichLoreRow));
});

/** Full myth body from data/lore-stories/{key}.txt (survives stale in-memory DB). */
router.get('/lore/story/:key', (req, res) => {
  const key = String(req.params.key || '').trim();
  if (!/^[a-z0-9-]+$/.test(key)) return res.status(400).json({ error: 'Invalid story key' });

  const storyPath = require('path').join(require('../paths').getProjectRoot(), 'data', 'lore-stories', `${key}.txt`);
  if (fs.existsSync(storyPath)) {
    return res.json({ key, content: fs.readFileSync(storyPath, 'utf8').trim(), source: 'file' });
  }

  const row = db.prepare('SELECT content, title FROM lore_entries WHERE key = ? AND section = ?').get(key, 'myth');
  if (!row?.content) return res.status(404).json({ error: 'Story not found' });
  res.json({ key, content: row.content, source: 'db' });
});

router.get('/lore/:id/media', (req, res) => {
  const row = db.prepare('SELECT * FROM lore_entries WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Image not found' });

  const requested = String(req.query.file || '').trim();
  let imagePath = row.image_path;
  if (requested) {
    const meta = JSON.parse(row.meta_json || '{}');
    const extras = Array.isArray(meta.extra_images) ? meta.extra_images : [];
    if (!extras.includes(requested)) return res.status(404).json({ error: 'Image not found' });
    imagePath = path.join(require('../paths').getProjectRoot(), 'data', 'lore-images', requested);
  }

  if (!imagePath || !fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }
  const mime = mimeForPath(imagePath);
  res.setHeader('Content-Type', mime);
  fs.createReadStream(imagePath).pipe(res);
});

router.get('/proficiency-tracks', (req, res) => {
  const domain = (req.query.domain || '').trim();
  const rows = domain
    ? db.prepare('SELECT * FROM proficiency_tracks WHERE domain = ? ORDER BY label').all(domain)
    : db.prepare('SELECT * FROM proficiency_tracks ORDER BY domain, label').all();
  res.json(rows);
});

router.post('/proficiency-tracks', (req, res) => {
  const { domain, key, label, level = 0, notes = '' } = req.body || {};
  if (!domain || !key || !label) {
    return res.status(400).json({ error: 'domain, key, and label required' });
  }
  const lvl = Math.max(0, Math.min(7, Math.round(Number(level) || 0)));
  try {
    const r = db.prepare(`
      INSERT INTO proficiency_tracks (domain, key, label, level, notes, self_assessed, auto_suggested, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 0, datetime('now'))
    `).run(domain, key, label.trim(), lvl, notes);
    const row = db.prepare('SELECT * FROM proficiency_tracks WHERE id = ?').get(r.lastInsertRowid);
    rebuildSearchIndex();
    res.status(201).json(row);
  } catch (err) {
    res.status(409).json({ error: err.message || 'Track already exists' });
  }
});

router.patch('/proficiency-tracks/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM proficiency_tracks WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Track not found' });
  const { label, level, notes, self_assessed } = req.body || {};
  const lvl = level != null ? Math.max(0, Math.min(7, Math.round(Number(level)))) : row.level;
  db.prepare(`
    UPDATE proficiency_tracks
    SET label = ?, level = ?, notes = ?, self_assessed = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    label != null ? String(label).trim() : row.label,
    lvl,
    notes != null ? notes : row.notes,
    self_assessed != null ? (self_assessed ? 1 : 0) : row.self_assessed,
    row.id
  );
  rebuildSearchIndex();
  res.json(db.prepare('SELECT * FROM proficiency_tracks WHERE id = ?').get(row.id));
});

router.delete('/proficiency-tracks/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM proficiency_tracks WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Track not found' });
  db.prepare('DELETE FROM proficiency_tracks WHERE id = ?').run(row.id);
  rebuildSearchIndex();
  res.json({ ok: true, id: row.id });
});

router.post('/proficiency-tracks/auto-suggest', (req, res) => {
  const identity = db.prepare('SELECT proficiency_json FROM identity WHERE id = 1').get();
  const prof = identity?.proficiency_json ? JSON.parse(identity.proficiency_json) : {};
  const { getBaseLayerSlots } = require('../base-layer');
  const slots = getBaseLayerSlots();
  const find = db.prepare('SELECT id FROM proficiency_tracks WHERE domain = ? AND key = ?');
  const insert = db.prepare(`
    INSERT INTO proficiency_tracks (domain, key, label, level, notes, self_assessed, auto_suggested, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, 1, datetime('now'))
  `);
  const update = db.prepare(`
    UPDATE proficiency_tracks SET level = ?, auto_suggested = 1, updated_at = datetime('now') WHERE id = ?
  `);
  let updated = 0;
  const upsert = (domain, key, label, level, notes) => {
    const existing = find.get(domain, key);
    if (existing) update.run(level, existing.id);
    else insert.run(domain, key, label, level, notes);
    updated += 1;
  };
  Object.entries(prof.operators || {}).forEach(([op, val]) => {
    upsert('operators', op.toLowerCase(), `${op} operator`, Math.round((val || 0) * 7), 'Auto-suggested from identity operators');
  });
  slots.forEach((slot) => {
    const key = slot.proficiencyKey || slot.name.toLowerCase();
    upsert('base-layer', key, slot.name, Math.round((slot.proficiency || 0) * 7), 'Auto-suggested from base layer');
  });
  rebuildSearchIndex();
  const tracks = db.prepare('SELECT * FROM proficiency_tracks ORDER BY domain, label').all();
  res.json({ ok: true, updated, tracks });
});

router.get('/axioms', (req, res) => {
  res.json(db.prepare('SELECT * FROM axioms ORDER BY sort_order').all());
});

router.get('/protocols', (req, res) => {
  res.json(db.prepare('SELECT * FROM protocols ORDER BY code').all().map((p) => ({
    ...p,
    steps: JSON.parse(p.steps_json || '[]'),
  })));
});

router.get('/operators', (req, res) => {
  res.json(OPERATORS);
});

router.post('/forge/simulate', (req, res) => {
  const { protocol = 'AFP', ore, context } = req.body;
  if (!ore) return res.status(400).json({ error: 'ore input required' });
  const aspects = db.prepare(
    'SELECT name, mentions, potential_score, is_base_layer FROM aspects ORDER BY mentions DESC LIMIT 50'
  ).all();
  const result = runForge(protocol, ore, context, aspects);
  db.prepare('INSERT INTO forge_sessions (protocol, ore_input, result_json, operator) VALUES (?,?,?,?)')
    .run(protocol, ore, JSON.stringify(result), protocol);
  pulseBus.emitPulse('forge', { ore: String(ore).slice(0, 200), protocol }, { action: 'forge.simulate', protocol });
  res.json(result);
});

router.post('/forge/eot', (req, res) => {
  req.body.protocol = 'EOT';
  const { ore, context } = req.body;
  if (!ore) return res.status(400).json({ error: 'ore required' });
  const aspects = db.prepare('SELECT name, mentions FROM aspects').all();
  const result = runForge('EOT', ore, context, aspects);
  db.prepare('INSERT INTO forge_sessions (protocol, ore_input, result_json, operator) VALUES (?,?,?,?)')
    .run('EOT', ore, JSON.stringify(result), 'EOT');
  pulseBus.emitPulse('forge', { ore: String(ore).slice(0, 200), protocol: 'EOT' }, { action: 'forge.eot', protocol: 'EOT' });
  res.json(result);
});

router.post('/forge/dcs', (req, res) => {
  try {
    const { mythology_id, directive, source_aspect_keys, ore, context } = req.body || {};
    if (mythology_id) {
      const {
        runDcsWithMythology,
        dcsResultToForgeResult,
      } = require('../services/forge-os');
      const result = runDcsWithMythology(db, {
        mythologyId: mythology_id,
        directive,
        sourceAspectKeys: source_aspect_keys,
      });
      db.saveDb();
      pulseBus.emitPulse(
        'forge',
        { ore: result.mythology?.name, protocol: 'DCS' },
        { action: 'forge.dcs.myth', protocol: 'DCS' }
      );
      return res.json(dcsResultToForgeResult(result));
    }
    if (!ore) return res.status(400).json({ error: 'ore or mythology_id required' });
    const aspects = db.prepare(
      'SELECT name, mentions, potential_score, is_base_layer FROM aspects'
    ).all();
    const result = runForge('DCS', ore, context, aspects);
    db.prepare('INSERT INTO forge_sessions (protocol, ore_input, result_json, operator) VALUES (?,?,?,?)')
      .run('DCS', ore, JSON.stringify(result), 'DCS');
    pulseBus.emitPulse('forge', { ore: String(ore).slice(0, 200), protocol: 'DCS' }, { action: 'forge.dcs', protocol: 'DCS' });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/forge/mythologies', (_req, res) => {
  try {
    const { getMythologies } = require('../services/forge-os');
    res.json(getMythologies());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/forge/base-aspects', (_req, res) => {
  try {
    const { getBaseAspectCatalog } = require('../services/forge-os');
    res.json(getBaseAspectCatalog());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/forge/god-tier', (_req, res) => {
  try {
    const { getGodTierAspects } = require('../services/forge-os');
    res.json(getGodTierAspects(db));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/forge/tools', (_req, res) => {
  try {
    const { getForgeTools } = require('../services/forge-os');
    res.json(getForgeTools());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/forge/export-block', (_req, res) => {
  try {
    const { buildSave8ExportBlock } = require('../services/forge-os');
    const block = buildSave8ExportBlock(db);
    res.json({ name: 'save8', export_block: block });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/forge/reflect', (req, res) => {
  try {
    const { aspect_key, reflection, intensity } = req.body || {};
    const { runBaseReflection } = require('../services/forge-os');
    const result = runBaseReflection(db, {
      aspectKey: aspect_key,
      reflection,
      intensity,
    });
    db.saveDb();
    pulseBus.emitPulse('forge', { aspect: aspect_key }, { action: 'forge.reflect', protocol: 'REFLECT' });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/forge/synthesize', (req, res) => {
  try {
    const { aspect_keys, reflection } = req.body || {};
    const { runSynthesis } = require('../services/forge-os');
    const result = runSynthesis(db, { aspectKeys: aspect_keys, reflection });
    db.saveDb();
    pulseBus.emitPulse('forge', { aspects: aspect_keys }, { action: 'forge.synthesize', protocol: 'SYNTHESIS' });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/forge/syntheses', (_req, res) => {
  res.json(
    db.prepare('SELECT * FROM forge_syntheses ORDER BY created_at DESC LIMIT 20').all().map((r) => ({
      ...r,
      aspect_keys: JSON.parse(r.aspect_keys_json || '[]'),
    }))
  );
});

router.get('/forge/reflections', (_req, res) => {
  res.json(db.prepare('SELECT * FROM forge_reflections ORDER BY created_at DESC LIMIT 30').all());
});

router.post('/daily-runs', (req, res) => {
  const { type = 'DFR', notes = '', ore = '', duration_min } = req.body;
  const result = runDailyRun(type, notes, ore);
  const info = db.prepare(
    'INSERT INTO daily_runs (run_type, title, notes, ore_input, result_json, duration_min) VALUES (?,?,?,?,?,?)'
  ).run(type, result.title, notes, ore, JSON.stringify(result), duration_min || null);
  pulseBus.emitPulse('daily', { type, title: result.title }, { action: 'daily.run', runType: type });
  res.json({ id: info.lastInsertRowid, ...result });
});

router.get('/daily-runs', (req, res) => {
  res.json(db.prepare('SELECT * FROM daily_runs ORDER BY completed_at DESC LIMIT 30').all().map((r) => ({
    ...r,
    result: JSON.parse(r.result_json || '{}'),
  })));
});

router.get('/insights', (req, res) => {
  const { source } = req.query;
  let sql = 'SELECT * FROM insights';
  const params = [];
  if (source) {
    sql += ' WHERE source = ?';
    params.push(source);
  }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params).map((i) => ({
    ...i,
    tags: JSON.parse(i.tags_json || '[]'),
    aspectLinks: JSON.parse(i.aspect_links_json || '[]'),
  })));
});

router.post('/insights', (req, res) => {
  const { title, body, source, tags, aspectLinks } = req.body;
  const info = db.prepare(
    'INSERT INTO insights (title, body, source, tags_json, aspect_links_json) VALUES (?,?,?,?,?)'
  ).run(title, body, source || 'user', JSON.stringify(tags || []), JSON.stringify(aspectLinks || []));
  rebuildSearchIndex();
  res.json({ id: info.lastInsertRowid });
});

router.get('/goals', (req, res) => {
  const { getGoalsActive } = require('../services/module-cache');
  const status = req.query.status;
  const fresh = req.query.fresh === '1';
  if (status === 'active') {
    const { data } = getGoalsActive(
      () => db.prepare("SELECT * FROM goals WHERE status = 'active' ORDER BY progress DESC").all(),
      { fresh },
    );
    return res.json(data);
  }
  if (status) {
    return res.json(
      db.prepare('SELECT * FROM goals WHERE status = ? ORDER BY created_at DESC').all(status)
    );
  }
  res.json(db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all());
});

router.post('/goals', (req, res) => {
  const goalsService = require('../services/goals');
  const parsed = goalsService.validateCreate(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const info = db.prepare(
    'INSERT INTO goals (title, description, status, target_date, aspect_link, progress) VALUES (?,?,?,?,?,?)'
  ).run(
    parsed.title,
    parsed.description,
    parsed.status,
    parsed.target_date,
    parsed.aspect_link,
    parsed.progress
  );
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(info.lastInsertRowid);
  pulseBus.emitPulse('goals', { title: row.title, status: row.status }, { action: 'goals.create', goalId: row.id });
  res.status(201).json(row);
});

router.patch('/goals/:id', (req, res) => {
  const goalsService = require('../services/goals');
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Goal not found' });
  const patch = goalsService.mergePatch(row, req.body);
  if (!patch.title) return res.status(400).json({ error: 'title required' });
  db.prepare(`
    UPDATE goals
    SET title = ?, description = ?, target_date = ?, aspect_link = ?, progress = ?, status = ?
    WHERE id = ?
  `).run(
    patch.title,
    patch.description,
    patch.target_date,
    patch.aspect_link,
    patch.progress,
    patch.status,
    row.id
  );
  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(row.id);
  pulseBus.emitPulse(
    'goals',
    { title: updated.title, status: updated.status, progress: updated.progress },
    { action: 'goals.update', goalId: row.id }
  );
  res.json(updated);
});

router.delete('/goals/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Goal not found' });
  db.prepare('DELETE FROM goals WHERE id = ?').run(row.id);
  pulseBus.emitPulse('goals', { title: row.title }, { action: 'goals.delete', goalId: row.id });
  res.json({ ok: true, id: row.id });
});

router.get('/achievements', (req, res) => {
  res.json(db.prepare('SELECT * FROM achievements ORDER BY CASE WHEN unlocked_at IS NULL THEN 1 ELSE 0 END, unlocked_at DESC').all());
});

router.get('/personas', (req, res) => {
  res.json(db.prepare('SELECT * FROM personas ORDER BY active DESC').all());
});

router.post('/personas/:id/activate', (req, res) => {
  db.prepare('UPDATE personas SET active = 0').run();
  db.prepare('UPDATE personas SET active = 1 WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM personas WHERE id = ?').get(req.params.id));
});

router.get('/techniques', (req, res) => {
  res.json(db.prepare('SELECT * FROM techniques').all().map((t) => ({
    ...t,
    config: JSON.parse(t.config_json || '{}'),
  })));
});

router.post('/techniques/pomodoro', (req, res) => {
  const { focus_min, break_min, cycles, aspect_focus, notes } = req.body;
  const info = db.prepare(
    'INSERT INTO pomodoro_sessions (focus_min, break_min, cycles, aspect_focus, notes) VALUES (?,?,?,?,?)'
  ).run(focus_min || 25, break_min || 5, cycles || 1, aspect_focus, notes);
  res.json({ id: info.lastInsertRowid, message: 'Pomodoro session logged' });
});

router.get('/alchemy-fusions', (req, res) => {
  res.json(db.prepare('SELECT * FROM alchemy_fusions').all().map((f) => ({
    ...f,
    inputs: JSON.parse(f.inputs_json || '[]'),
  })));
});

router.get('/math', (req, res) => {
  res.json(db.prepare('SELECT * FROM math_concepts ORDER BY domain').all());
});

router.get('/visualizations', (req, res) => {
  const rows = db.prepare('SELECT * FROM visualizations').all();
  const q = (req.query.q || '').trim();
  if (!q) return res.json(rows);
  const { filterVisualizations } = require('../services/viz-search');
  res.json(filterVisualizations(rows, q));
});

router.post('/visualizations/sync', (req, res) => {
  try {
    const { syncAfsVideos, getAfsVideosDir, getEntheaExePath } = require('../services/afs-videos');
    const result = syncAfsVideos(db);
    db.saveDb();
    rebuildSearchIndex();
    const total = db.prepare('SELECT COUNT(*) as c FROM visualizations').get().c;
    res.json({
      ok: true,
      ...result,
      totalVisualizations: total,
      videosDir: getAfsVideosDir(),
      entheaExe: getEntheaExePath(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Video sync failed' });
  }
});

router.post('/visualizations/:id/launch', (req, res) => {
  const row = db.prepare('SELECT * FROM visualizations WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Visualization not found' });
  if (row.type !== 'engine') return res.status(400).json({ error: 'Visualization is not launchable' });
  try {
    res.json(launchVisualizationPath(row.path));
  } catch (err) {
    res.status(403).json({ error: err.message || 'Launch failed' });
  }
});

router.get('/visualizations/:id/media', (req, res) => {
  const row = db.prepare('SELECT * FROM visualizations WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Visualization not found' });
  if (!isAllowedMediaPath(row.path)) return res.status(403).json({ error: 'Media path not allowed' });

  let stat;
  try {
    stat = fs.statSync(row.path);
  } catch {
    return res.status(404).json({ error: 'Media file missing' });
  }

  const mime = mimeForPath(row.path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) return res.status(416).end();
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    if (start >= fileSize || end >= fileSize) return res.status(416).end();
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': mime,
    });
    fs.createReadStream(row.path, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': fileSize,
    'Content-Type': mime,
    'Accept-Ranges': 'bytes',
  });
  fs.createReadStream(row.path).pipe(res);
});

router.get('/automations', (req, res) => {
  res.json(db.prepare('SELECT * FROM automations').all().map((a) => ({
    ...a,
    action: JSON.parse(a.action_json || '{}'),
  })));
});

router.get('/identity', (req, res) => {
  const identity = db.prepare('SELECT * FROM identity WHERE id = 1').get();
  const baseLayer = db.prepare('SELECT * FROM base_layer_slots').all();
  const topAspects = db.prepare('SELECT * FROM aspects ORDER BY proficiency DESC LIMIT 8').all();
  const genesisMilestones = [
    { order: 1, label: 'Fallen Valkyrie, Redemption', type: 'origin' },
    { order: 2, label: 'Symbolic journaling → Stability / Anchor', type: 'codex' },
    { order: 3, label: 'Five core symbols ⚓🔥🌱🌪️🚂', type: 'codex' },
    { order: 4, label: 'Aspect Mastery named', type: 'codex' },
    { order: 5, label: 'Aspect Forge Protocol (AFP)', type: 'AFP' },
    { order: 6, label: 'Base Layer formalized', type: 'codex' },
    { order: 7, label: 'EOT cluster → Mind Guardian Set', type: 'EOT' },
    { order: 8, label: 'Red Leaf / ENTHEA / @madhur328', type: 'codex' },
  ];
  let grok = null;
  try {
    const conv = db.prepare('SELECT id, url, turn_count, session_count FROM grok_conversations LIMIT 1').get();
    if (conv) grok = conv;
  } catch (_) { /* optional */ }
  res.json({
    ...identity,
    proficiency: JSON.parse(identity.proficiency_json || '{}'),
    workingOn: JSON.parse(identity.working_on_json || '[]'),
    baseLayer,
    topAspects,
    genesisMilestones,
    grok,
    evolutions: [
      'Fallen Valkyrie → regrown wings (genesis thread)',
      'Red Leaf Sovereign — full conviction embodiment',
      'Living Buddha synthesis — compassion + Rome builder',
      'AFS Platform Architect — codex in software',
      'ENTHEA Visual Mage — live geometry mastery',
    ],
  });
});

router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const type = (req.query.type || '').trim();
  if (!q) return res.json([]);
  let sql = 'SELECT * FROM search_index WHERE (title LIKE ? OR body LIKE ? OR tags LIKE ?)';
  const params = [`%${q}%`, `%${q}%`, `%${q}%`];
  if (type) {
    sql += ' AND entity_type = ?';
    params.push(type);
  }
  sql += ' ORDER BY CASE entity_type WHEN "grok" THEN 0 WHEN "aspect" THEN 1 ELSE 2 END LIMIT 60';
  res.json(db.prepare(sql).all(...params));
});

router.get('/forge/examples', (req, res) => {
  const { protocol = 'AFP', limit = 8 } = req.query;
  const type = protocol === 'EOT' ? 'EOT' : 'AFP';
  try {
    const rows = db.prepare(`
      SELECT id, title, user_text, session_type
      FROM grok_sessions
      WHERE session_type = ?
      ORDER BY user_chars DESC
      LIMIT ?
    `).all(type, Math.min(parseInt(limit, 10) || 8, 20));
    res.json(rows.map((r) => ({
      id: r.id,
      title: r.title,
      ore: (r.user_text || '').slice(0, 2000),
      protocol: r.session_type,
    })));
  } catch (_) {
    res.json([]);
  }
});

router.get('/forge/history', (req, res) => {
  res.json(db.prepare('SELECT * FROM forge_sessions ORDER BY created_at DESC LIMIT 20').all().map((s) => ({
    ...s,
    result: JSON.parse(s.result_json || '{}'),
  })));
});

function enrichGrokConversation(conv) {
  if (!conv) return { loaded: false };
  const typeCounts = db.prepare(
    'SELECT session_type, COUNT(*) as c FROM grok_sessions WHERE conversation_id = ? GROUP BY session_type'
  ).all(conv.id);
  return { loaded: true, ...conv, typeCounts };
}

router.get('/grok/conversations', (req, res) => {
  try {
    const convs = db.prepare('SELECT * FROM grok_conversations ORDER BY imported_at DESC').all();
    res.json(convs.map(enrichGrokConversation));
  } catch (_) {
    res.json([]);
  }
});

router.get('/grok/five-symbols', (req, res) => {
  const fs = require('fs');
  const p = require('../paths').dataPath('afp-five-symbols.json');
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'not found' });
  res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
});

router.get('/grok/conversation', (req, res) => {
  const { id } = req.query;
  const conv = id
    ? db.prepare('SELECT * FROM grok_conversations WHERE id = ?').get(id)
    : db.prepare('SELECT * FROM grok_conversations ORDER BY imported_at DESC LIMIT 1').get();
  res.json(enrichGrokConversation(conv));
});

router.get('/grok/sessions', (req, res) => {
  const { type, q, limit = 50, conversation_id, session_index } = req.query;
  let sql = 'SELECT id, conversation_id, session_index, session_type, title, user_chars, assistant_chars FROM grok_sessions WHERE 1=1';
  const params = [];
  if (conversation_id) { sql += ' AND conversation_id = ?'; params.push(conversation_id); }
  if (type) { sql += ' AND session_type = ?'; params.push(type); }
  if (session_index != null && session_index !== '') {
    sql += ' AND session_index = ?';
    params.push(parseInt(session_index, 10));
  }
  if (q) { sql += ' AND title LIKE ?'; params.push(`%${q}%`); }
  sql += ' ORDER BY session_index ASC LIMIT ?';
  params.push(Math.min(parseInt(limit, 10) || 50, 200));
  res.json(db.prepare(sql).all(...params));
});

router.get('/grok/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM grok_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
});

router.get('/discord/status', (req, res) => {
  try {
    const { discordStatus } = require('../discord');
    res.json(discordStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/discord/journal', (req, res) => {
  try {
    const { listJournalMessages } = require('../discord');
    const { getJournalList } = require('../services/module-cache');
    const { type, q, limit, channel } = req.query;
    const lim = parseInt(limit, 10) || 50;
    const fresh = req.query.fresh === '1';
    const cacheKey = `list:${channel || 'all'}:${type || 'all'}:${lim}:${(q || '').slice(0, 40)}`;
    const { data } = getJournalList(
      cacheKey,
      () =>
        listJournalMessages({
          type,
          q,
          channel,
          limit: lim,
        }),
      { fresh },
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/discord/journal/:id/aspects', (req, res) => {
  try {
    const { getJournalEntry } = require('../discord');
    const { extractAspectsFromJournal } = require('../journal-aspect-extract');
    const entry = getJournalEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    const aspects = extractAspectsFromJournal(entry.content);
    const existing = aspects.map((a) => {
      const row = db.prepare('SELECT id, name FROM aspects WHERE LOWER(name) = LOWER(?)').get(a.name);
      return { ...a, exists: Boolean(row), aspect_id: row?.id || null };
    });
    res.json({ entry_id: entry.id, aspects: existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/discord/journal/:id/sync-aspects', (req, res) => {
  try {
    const { syncAspectsFromJournalEntry } = require('../journal-aspect-sync');
    const result = syncAspectsFromJournalEntry(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/discord/journal/smart-club', (req, res) => {
  try {
    const { smartSyncJournal } = require('../journal-smart-club');
    const { discordStatus } = require('../discord');
    const status = discordStatus();
    const channel = req.body?.channel || status.primary_journal_channel || 'journal';
    const result = smartSyncJournal({ channel });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/discord/journal/merge', (req, res) => {
  try {
    const { first_id, second_id } = req.body || {};
    if (!first_id || !second_id) {
      return res.status(400).json({ error: 'first_id and second_id required' });
    }
    const { mergeJournalEntries } = require('../discord');
    const row = mergeJournalEntries(String(first_id), String(second_id));
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/discord/journal/sync', async (req, res) => {
  try {
    if (!process.env.DISCORD_BOT_TOKEN) {
      return res.status(503).json({
        error: 'DISCORD_BOT_TOKEN not configured — add it to .env and restart the API server',
      });
    }
    const { syncJournalFromDiscord } = require('../discord-sync');
    const result = await syncJournalFromDiscord({
      smartClub: req.body?.smart !== false,
    });
    const { reloadFromDisk } = require('../db');
    await reloadFromDisk();
    pulseBus.emitPulse('journal', { synced: result.synced ?? result.imported ?? 0 }, { action: 'journal.sync' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/discord/journal/latest', (req, res) => {
  try {
    const { getLatestJournalEntry, discordStatus } = require('../discord');
    const { channel } = req.query;
    const status = discordStatus();
    const entry = getLatestJournalEntry(channel || status.primary_journal_channel || 'journal');
    if (!entry) return res.status(404).json({ error: 'No journal entries yet' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/discord/journal/proxy', async (req, res) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ error: 'url query required' });
    }
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return res.status(400).json({ error: 'invalid url' });
    }
    const host = parsed.hostname.toLowerCase();
    const allowed = host.endsWith('discordapp.com') || host.endsWith('discordapp.net');
    if (!allowed) return res.status(403).json({ error: 'host not allowed' });

    const upstream = await fetch(rawUrl, {
      headers: { 'User-Agent': 'AFS-Platform/1.0 (journal-proxy)' },
      redirect: 'follow',
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'upstream failed' });

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' });
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.end(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/discord/journal/media/:file', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { isAllowedJournalMediaFile, mimeForJournalMedia } = require('../journal-attachments');
    const file = req.params.file;
    if (!isAllowedJournalMediaFile(file)) {
      return res.status(404).json({ error: 'Media not found' });
    }
    const { JOURNAL_IMAGES_DIR } = require('../journal-attachments');
    const filePath = path.join(JOURNAL_IMAGES_DIR, file);
    res.writeHead(200, { 'Content-Type': mimeForJournalMedia(file) });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/discord/journal/:id', (req, res) => {
  try {
    const { getJournalEntry } = require('../discord');
    const entry = getJournalEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/discord/journal', (req, res) => {
  try {
    const { content, author_name, posted_at, attachments } = req.body || {};
    const { insertLocalJournalEntry } = require('../discord');
    const { hasJournalPayload } = require('../journal-attachments');
    if (!hasJournalPayload(content, attachments || [])) {
      return res.status(400).json({ error: 'content or attachments required' });
    }
    const row = insertLocalJournalEntry({
      content: (content || '').trim(),
      author_name,
      posted_at,
      attachments: attachments || [],
    });
    pulseBus.emitPulse('journal', { preview: (content || '').slice(0, 120) }, { action: 'journal.create', entryId: row.id });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/discord/journal/:id', (req, res) => {
  try {
    const { content, author_name, posted_at, attachments } = req.body || {};
    const { updateJournalEntry } = require('../discord');
    const row = updateJournalEntry(req.params.id, {
      content: content !== undefined ? String(content).trim() : undefined,
      author_name,
      posted_at,
      attachments,
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/discord/journal/:id', (req, res) => {
  try {
    const { deleteJournalEntry, getJournalEntry } = require('../discord');
    const existing = getJournalEntry(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    deleteJournalEntry(req.params.id);
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/reload-db', async (req, res) => {
  try {
    const { reloadFromDisk, getDbPath } = require('../db');
    const ok = await reloadFromDisk();
    if (!ok) return res.status(404).json({ error: 'Database file not found' });
    invalidateAspectFaceCache();
    const cache = require('../services/aspect-face-cache').buildAspectFaceCache(db);
    const eternal = db.prepare('SELECT id, detail_json FROM aspects WHERE name = ?').get('Eternal Spin');
    let faceCount = 0;
    try {
      faceCount = JSON.parse(eternal?.detail_json || '{}').radiantFaces?.length || 0;
    } catch { /* ignore */ }
    res.json({
      ok: true,
      dbPath: getDbPath(),
      aspectCount: cache.aspectCount,
      faceCount: cache.faceCount,
      eternalSpinFaces: faceCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Red Leaf Kernel — single 🍁 seed unfolds the entire system topology ──
const redLeafKernel = require('../services/red-leaf-kernel');


router.get('/kernel', (req, res) => {
  res.json(redLeafKernel.unfoldFromSeed());
});

router.get('/kernel/nav', (req, res) => {
  res.json({ seed: redLeafKernel.SEED, nav: redLeafKernel.buildNavFromKernel() });
});

router.get('/kernel/flow', (req, res) => {
  res.json(redLeafKernel.buildFlowGraph());
});

router.get('/kernel/resolve/:moduleId', (req, res) => {
  const mod = redLeafKernel.resolveModule(req.params.moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found in kernel unfold' });
  res.json(mod);
});

router.post('/kernel/pulse', (req, res) => {
  const origin = req.body?.from || req.body?.module || 'forge';
  const payload = req.body?.payload ?? req.body?.ore ?? {};
  const meta = req.body?.meta ?? { action: 'kernel.manual' };
  const event = pulseBus.emitPulse(origin, payload, meta);
  res.json({ ok: true, event, route: redLeafKernel.routePulse(origin, payload) });
});

router.get('/kernel/pulses', (req, res) => {
  try {
    const since = req.query.since && req.query.since !== 'undefined' ? String(req.query.since) : undefined;
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 100);
    const origin = req.query.origin && req.query.origin !== 'undefined' ? String(req.query.origin) : undefined;
    res.json({
      seed: redLeafKernel.SEED,
      pulses: pulseBus.getPulses({ since, limit, origin }),
      stats: pulseBus.pulseStats(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message, seed: redLeafKernel.SEED, pulses: [], stats: { total: 0, latest: null } });
  }
});

router.get('/kernel/pulses/stats', (req, res) => {
  res.json(pulseBus.pulseStats());
});

router.get('/kernel/pulses/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify({ type: 'connected', seed: redLeafKernel.SEED })}\n\n`);
  const unsub = pulseBus.subscribe((event) => {
    res.write(`data: ${JSON.stringify({ type: 'pulse', event })}\n\n`);
  });
  req.on('close', () => unsub());
});

router.get('/kernel/ready', (req, res) => {
  try {
    res.json(assessKernelReadiness(pulseBus));
  } catch (err) {
    res.status(500).json({ error: err.message, ready: false, generationReady: false, observabilityReady: false });
  }
});

router.post('/kernel/generate', (req, res) => {
  try {
    const readiness = assessKernelReadiness(pulseBus);
    if (!readiness.generationReady) {
      const failed = readiness.requirements.filter((r) => !r.pass).map((r) => r.id);
      return res.status(403).json({
        ok: false,
        error: 'Runtime generation locked — readiness gates not satisfied.',
        failedRequirements: failed,
        generationReady: false,
      });
    }

    const result = generateKernelRoutes();
    const event = pulseBus.emitPulse(
      'kernel',
      { routeCount: result.routeCount, generatedAt: result.generatedAt },
      { action: 'runtime.generate' },
    );

    res.json({
      ...result,
      event,
      message: `Generated ${result.routeCount} routes from ${result.seed}. Restart Vite dev server to pick up route file changes.`,
    });
  } catch (err) {
    if (err.code === 'KERNEL_VERIFY_FAILED') {
      return res.status(422).json({ ok: false, error: err.message, errors: err.errors });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/health', (req, res) => {
  const seedDoc = redLeafKernel.loadSeedFile();
  res.json({
    ok: true,
    kernelIteration: seedDoc.iteration ?? 5,
    features: {
      kernelReady: true,
      pulseBus: true,
      kernelPulses: true,
      kernelSpiral: Boolean(seedDoc.capabilities?.spiralHandlers),
      kernelStore: Boolean(seedDoc.capabilities?.kernelCache),
      kernelGenerate: Boolean(seedDoc.capabilities?.runtimeGeneration),
    },
  });
});

router.get('/kernel/verify', (req, res) => {
  res.json(redLeafKernel.verifyKernel());
});

router.get('/kernel/routes', (req, res) => {
  res.json({ seed: redLeafKernel.SEED, routes: redLeafKernel.buildRouteManifest() });
});

router.get('/kernel/spiral', (req, res) => {
  res.json(spiralTelemetry());
});

router.get('/kernel/store', (req, res) => {
  res.json({ seed: redLeafKernel.SEED, ...kernelStore.storeStats() });
});

router.post('/kernel/store/clear', (req, res) => {
  const cleared = kernelStore.clearAll();
  res.json({ ok: true, cleared });
});

module.exports = router;