/**
 * Export full AFS database snapshot for offline static HTML bundle.
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { OPERATORS } = require('../server/services/forge');
const { resolveAspectSymbolChain, displaySymbolPreview, loadCorpusSymbols } = require('../server/services/symbols');
const { buildAspectFaceCache } = require('../server/services/aspect-face-cache');
const {
  ensureDiscordSchema,
  listJournalMessages,
  discordStatus,
  purgeSyntheticJournalEntries,
} = require('../server/discord');
const { dataPath } = require('../server/paths');
const { mimeForJournalMedia } = require('../server/journal-attachments');
const { enrichVisualizationsForStatic } = require('./lib/static-viz-media');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'static-export.json');
const JOURNAL_IMAGES_DIR = dataPath('journal-images');
const LORE_IMAGES_DIR = dataPath('lore-images');

function mimeForLoreImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

function resolveLoreImagePath(imagePath) {
  if (!imagePath) return null;
  const candidates = [
    imagePath,
    path.join(ROOT, imagePath),
    path.join(ROOT, 'data', String(imagePath).replace(/^data[\\/]/, '')),
    path.join(LORE_IMAGES_DIR, path.basename(imagePath)),
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function embedLoreImageDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:${mimeForLoreImage(filePath)};base64,${buf.toString('base64')}`;
}

function embedLoreImageDataUrls(lore) {
  if (!Array.isArray(lore)) return lore;
  let embedded = 0;
  for (const entry of lore) {
    if (entry.image_path && !entry.image_data_url) {
      const filePath = resolveLoreImagePath(entry.image_path);
      if (filePath) {
        entry.image_data_url = embedLoreImageDataUrl(filePath);
        entry.has_image = true;
        embedded += 1;
      }
    }
    const extras = Array.isArray(entry.extra_images) ? entry.extra_images : [];
    if (extras.length) {
      entry.extra_image_data_urls = entry.extra_image_data_urls || {};
      for (const file of extras) {
        if (entry.extra_image_data_urls[file]) continue;
        const filePath = path.join(LORE_IMAGES_DIR, file);
        if (!fs.existsSync(filePath)) continue;
        entry.extra_image_data_urls[file] = embedLoreImageDataUrl(filePath);
        embedded += 1;
      }
    }
  }
  if (embedded) console.log(`  embedded ${embedded} lore images for offline static`);
  return lore;
}

function embedJournalAttachmentDataUrls(entries) {
  let embedded = 0;
  for (const entry of entries) {
    if (!entry.attachments?.length) continue;
    for (const att of entry.attachments) {
      if (att.data_url) continue;
      const url = att.url || '';
      const filename = url.split('/').pop();
      if (!filename) continue;
      const filePath = path.join(JOURNAL_IMAGES_DIR, filename);
      if (!fs.existsSync(filePath)) continue;
      const buf = fs.readFileSync(filePath);
      att.data_url = `data:${mimeForJournalMedia(filename)};base64,${buf.toString('base64')}`;
      embedded += 1;
    }
  }
  if (embedded) console.log(`  embedded ${embedded} journal images for offline static`);
  return entries;
}

async function main() {
  await db.initDb();
  ensureDiscordSchema();
  purgeSyntheticJournalEntries();

  const identity = db.prepare('SELECT * FROM identity WHERE id = 1').get();
  loadCorpusSymbols();

  const aspects = db.prepare('SELECT * FROM aspects ORDER BY potential_score DESC, mentions DESC').all().map((a) => {
    const symbol_chain = a.symbol_chain?.trim()
      ? a.symbol_chain
      : resolveAspectSymbolChain(a.name, a.category, a.tier, '');
    return {
      ...a,
      symbol_chain,
      symbol_preview: displaySymbolPreview(symbol_chain),
    };
  });
  const synergies = db.prepare('SELECT * FROM synergies ORDER BY strength DESC').all();
  const codexEntries = db.prepare('SELECT * FROM codex_entries ORDER BY category, sort_order').all();
  const codex = codexEntries.reduce((acc, e) => {
    (acc[e.category] = acc[e.category] || []).push(e);
    return acc;
  }, {});
  const axioms = db.prepare('SELECT * FROM axioms ORDER BY sort_order').all();
  const protocols = db.prepare('SELECT * FROM protocols ORDER BY code').all().map((p) => ({
    ...p,
    steps: JSON.parse(p.steps_json || '[]'),
  }));
  const insights = db.prepare('SELECT * FROM insights ORDER BY created_at DESC').all().map((i) => ({
    ...i,
    tags: JSON.parse(i.tags_json || '[]'),
    aspectLinks: JSON.parse(i.aspect_links_json || '[]'),
  }));
  const goals = db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all();
  const achievements = db.prepare('SELECT * FROM achievements ORDER BY CASE WHEN unlocked_at IS NULL THEN 1 ELSE 0 END, unlocked_at DESC').all();
  const personas = db.prepare('SELECT * FROM personas ORDER BY active DESC').all();
  const techniques = db.prepare('SELECT * FROM techniques').all().map((t) => ({
    ...t,
    config: JSON.parse(t.config_json || '{}'),
  }));
  const fusions = db.prepare('SELECT * FROM alchemy_fusions').all().map((f) => ({
    ...f,
    inputs: JSON.parse(f.inputs_json || '[]'),
  }));
  const math = db.prepare('SELECT * FROM math_concepts ORDER BY domain').all();
  const vizRaw = db.prepare('SELECT * FROM visualizations').all();
  const { rows: visualizations, resolved: vizResolved, missing: vizMissing } =
    enrichVisualizationsForStatic(vizRaw, ROOT);
  if (vizResolved || vizMissing) {
    console.log(`  static viz media: ${vizResolved} relative URLs, ${vizMissing} missing on disk`);
  }
  const automations = db.prepare('SELECT * FROM automations').all().map((a) => ({
    ...a,
    action: JSON.parse(a.action_json || '{}'),
  }));
  let lore = [];
  let proficiencyTracks = [];
  try {
    lore = db.prepare('SELECT * FROM lore_entries ORDER BY section, sort_order').all().map((r) => {
      const meta = JSON.parse(r.meta_json || '{}');
      const {
        excerpt,
        expandable,
        extra_images,
        visualization,
        proficiency_pct,
        base_layer_key,
      } = meta;
      return {
        ...r,
        aspect_links: JSON.parse(r.aspect_links_json || '[]'),
        has_image: Boolean(r.image_path),
        excerpt: excerpt || null,
        expandable: Boolean(expandable && excerpt),
        extra_images: Array.isArray(extra_images) ? extra_images : [],
        visualization: visualization || null,
        proficiency_pct: proficiency_pct ?? null,
        base_layer_key: base_layer_key || null,
      };
    });
    proficiencyTracks = db.prepare('SELECT * FROM proficiency_tracks ORDER BY domain, label').all();
    lore = embedLoreImageDataUrls(lore);
  } catch (_) { /* tables may not exist */ }

  const searchIndex = db.prepare('SELECT * FROM search_index').all();
  const aspectFaceIndex = buildAspectFaceCache(db);
  const { getBaseLayerSlots } = require('../server/base-layer');
  const canonicalOrder = getBaseLayerSlots().map((s) => s.symbol);
  const baseLayer = db.prepare('SELECT * FROM base_layer_slots').all()
    .sort((a, b) => canonicalOrder.indexOf(a.symbol) - canonicalOrder.indexOf(b.symbol))
    .map((s) => ({
    ...s,
    mantras: JSON.parse(s.mantras_json || '[]'),
  }));
  const dailyRuns = db.prepare('SELECT * FROM daily_runs ORDER BY completed_at DESC LIMIT 30').all().map((r) => ({
    ...r,
    result: JSON.parse(r.result_json || '{}'),
  }));
  const forgeSessions = db.prepare('SELECT * FROM forge_sessions ORDER BY created_at DESC LIMIT 20').all().map((s) => ({
    ...s,
    result: JSON.parse(s.result_json || '{}'),
  }));

  let grokConversation = { loaded: false };
  let grokConversations = [];
  let grokSessions = [];
  let grokFiveSymbols = null;
  try {
    const convs = db.prepare('SELECT * FROM grok_conversations ORDER BY imported_at DESC').all();
    grokConversations = convs.map((conv) => {
      const typeCounts = db.prepare(
        'SELECT session_type, COUNT(*) as c FROM grok_sessions WHERE conversation_id = ? GROUP BY session_type'
      ).all(conv.id);
      return { loaded: true, ...conv, typeCounts };
    });
    const conv = convs.find((c) => c.id?.startsWith('37560952')) || convs[0];
    if (conv) {
      grokConversation = grokConversations.find((c) => c.id === conv.id) || { loaded: true, ...conv };
      grokSessions = db.prepare('SELECT * FROM grok_sessions ORDER BY conversation_id, session_index ASC').all();
    }
    const fivePath = path.join(__dirname, '..', 'data', 'afp-five-symbols.json');
    if (fs.existsSync(fivePath)) {
      grokFiveSymbols = JSON.parse(fs.readFileSync(fivePath, 'utf-8'));
    }
  } catch (_) { /* optional */ }

  const journalEntries = embedJournalAttachmentDataUrls(
    listJournalMessages({ limit: 200 })
  );
  const journalStatus = {
    ...discordStatus(),
    configured: false,
    offline: true,
    message_count: journalEntries.length,
  };

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

  const pulseBus = require('../server/services/pulse-bus');
  pulseBus.seedBootPulse();
  let redLeafKernel = null;
  const kernelSnapPath = dataPath('red-leaf-kernel-snapshot.json');
  if (fs.existsSync(kernelSnapPath)) {
    redLeafKernel = JSON.parse(fs.readFileSync(kernelSnapPath, 'utf8'));
  }
  const pulses = pulseBus.getPulses({ limit: 40 });

  const snapshot = {
    meta: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      aspectCount: aspects.length,
      grokSessionCount: grokSessions.length,
      redLeafSeed: '🍁',
      kernelIteration: redLeafKernel?.meta?.iteration ?? 3,
    },
    identity: {
      ...identity,
      proficiency: JSON.parse(identity.proficiency_json || '{}'),
      workingOn: JSON.parse(identity.working_on_json || '[]'),
      baseLayer,
      topAspects: aspects.slice(0, 8),
      genesisMilestones,
      grok: grokConversation.loaded
        ? { id: grokConversation.id, url: grokConversation.url, turn_count: grokConversation.turn_count, session_count: grokConversation.session_count }
        : null,
      evolutions: [
        'Fallen Valkyrie → regrown wings (genesis thread)',
        'Red Leaf Sovereign — full conviction embodiment',
        'Living Buddha synthesis — compassion + Rome builder',
        'AFS Platform Architect — codex in software',
        'ENTHEA Visual Mage — live geometry mastery',
      ],
    },
    aspects,
    synergies,
    codex,
    axioms,
    protocols,
    operators: OPERATORS,
    insights,
    goals,
    achievements,
    personas,
    techniques,
    fusions,
    math,
    visualizations,
    automations,
    searchIndex,
    aspectFaceIndex,
    baseLayer,
    dailyRuns,
    forgeSessions,
    grokConversation,
    grokConversations,
    grokSessions,
    grokFiveSymbols,
    lore,
    proficiencyTracks,
    journalEntries,
    journalStatus,
    redLeafKernel,
    pulses,
  };

  fs.writeFileSync(OUT, JSON.stringify(snapshot));
  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
  console.log(
    `Static export: ${OUT} (${mb} MB, ${grokSessions.length} grok sessions, ${journalEntries.length} journal entries)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});