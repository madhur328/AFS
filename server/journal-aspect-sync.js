const db = require('./db');
const { getJournalEntry } = require('./discord');
const { extractAspectsFromJournal, isPlaceholderJournalMantra } = require('./journal-aspect-extract');
const { tierFromPotential } = require('./services/tiers');
const { buildDetailJson } = require('./services/aspect-detail');
const { resolveAspectSymbolChain } = require('./services/symbols');
const { buildEotIntegration } = require('./services/eot-routing');
const { resolveAspectQuality } = require('./services/aspect-quality');
const { rebuildSearchIndex } = require('./seed');
const { invalidateAspectFaceCache } = require('./services/aspect-face-cache');
const { detectVersionFork, splitVersionFork } = require('./services/aspect-version-fork');
const { buildAspectFusionFromJournal, mergeFusionIntoDetailJson } = require('./services/aspect-fusion');

function buildJournalAspectDetail(asp, tier, forgerIdentity = null) {
  const radiantFaces = asp.radiantFaces?.length ? asp.radiantFaces : undefined;
  const facetAspect = { name: asp.name, category: asp.category || 'forged', tier };
  const routing = buildEotIntegration(facetAspect, {
    faces: radiantFaces || [],
    integration: { operator: asp.operator },
  });

  const aspectFusion = buildAspectFusionFromJournal(asp, forgerIdentity);
  const baseDetail = {
    identity: `${asp.name} — forged from journal Master Fusion`,
    coreAffirmation: asp.coreAffirmation || null,
    supremeMantra: asp.supremeMantra || asp.coreAffirmation || null,
    aspectFusion: aspectFusion || undefined,
    radiantFaces,
    integration: {
      entryTool: routing.entryTool,
      routedTool: routing.routedTool,
      operator: routing.operator,
      saveCodex: 'Save8',
      baseLayer: ['🛡️🌱 Unwavering Heart'],
      strengthens: [],
      evolution: ['→ journal synthesis'],
      originSource: 'journal',
      fusionSeal: Boolean(aspectFusion),
    },
  };

  return buildDetailJson(mergeFusionIntoDetailJson(baseDetail, aspectFusion));
}

function needsJournalRoutingRepair(row) {
  if (!row?.detail_json) return false;
  let detail;
  try {
    detail = JSON.parse(row.detail_json);
  } catch {
    return false;
  }
  const faces = detail.radiantFaces || [];
  if (faces.length < 2) return false;
  const aspect = { name: row.name, tier: row.tier, category: row.category };
  return resolveAspectQuality(aspect, detail) === 'basic';
}

function needsJournalFaceRepair(row) {
  if (!row?.detail_json) return false;
  let detail;
  try {
    detail = JSON.parse(row.detail_json);
  } catch {
    return false;
  }
  const faces = detail.radiantFaces || [];
  if (!faces.length) return false;
  return faces.some((f) => !f.explanation?.trim() || isPlaceholderJournalMantra(f.mantra));
}

function syncAspectsFromJournalEntry(entryId) {
  const entry = getJournalEntry(entryId);
  if (!entry) throw new Error('Journal entry not found');

  const forgerIdentity = db.prepare('SELECT handle, title, bio FROM identity WHERE id = 1').get() || null;
  const extracted = extractAspectsFromJournal(entry.content);
  const created = [];
  const skipped = [];
  const repaired = [];
  const versionSplit = [];
  const errors = [];

  const insert = db.prepare(`
    INSERT INTO aspects (
      name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
      comprehension, category, base_layer_link, is_base_layer, detail_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const updateDetail = db.prepare('UPDATE aspects SET detail_json = ? WHERE id = ?');
  const updateMantra = db.prepare('UPDATE aspects SET mantra = ? WHERE id = ?');

  let dirty = false;

  for (const asp of extracted) {
    const existing = db.prepare('SELECT * FROM aspects WHERE LOWER(name) = LOWER(?)').get(asp.name);
    if (existing) {
      const fork = detectVersionFork(existing, asp);
      if (fork.shouldSplit) {
        try {
          const split = splitVersionFork(db, existing, asp, buildJournalAspectDetail);
          if (split) {
            versionSplit.push(split);
            dirty = true;
          }
        } catch (err) {
          errors.push({ name: asp.name, error: err.message });
        }
        continue;
      }

      const routingRepair = needsJournalRoutingRepair(existing);
      const faceRepair = needsJournalFaceRepair(existing);
      if (routingRepair || faceRepair) {
        try {
          const detailJson = buildJournalAspectDetail(asp, existing.tier, forgerIdentity);
          updateDetail.run(detailJson, existing.id);
          if (asp.coreAffirmation?.trim()) {
            updateMantra.run(asp.coreAffirmation.trim(), existing.id);
          }
          repaired.push({
            name: asp.name,
            id: existing.id,
            reason: routingRepair && faceRepair
              ? 'routing-and-face-repair'
              : routingRepair
                ? 'routing-repair'
                : 'face-repair',
          });
          dirty = true;
        } catch (err) {
          errors.push({ name: asp.name, error: err.message });
        }
      } else {
        skipped.push({ name: asp.name, id: existing.id, reason: 'exists' });
      }
      continue;
    }

    const tier = tierFromPotential(0.55);
    const symbol_chain = asp.symbol_chain?.trim()
      || resolveAspectSymbolChain(asp.name, asp.category, tier);
    const detailJson = buildJournalAspectDetail(asp, tier, forgerIdentity);

    try {
      const info = insert.run(
        asp.name,
        symbol_chain,
        asp.coreAffirmation || null,
        tier,
        0.55,
        1,
        0.35,
        asp.comprehension,
        asp.category || 'forged',
        '🍁',
        0,
        detailJson
      );
      created.push({ name: asp.name, id: info.lastInsertRowid, symbol_chain });
      dirty = true;
    } catch (err) {
      errors.push({ name: asp.name, error: err.message });
    }
  }

  if (dirty) {
    rebuildSearchIndex();
    invalidateAspectFaceCache();
    db.saveDb();
  }

  return {
    entry_id: entryId,
    extracted: extracted.map((a) => a.name),
    created,
    repaired,
    versionSplit,
    skipped,
    errors,
  };
}

module.exports = {
  syncAspectsFromJournalEntry,
  buildJournalAspectDetail,
  needsJournalRoutingRepair,
  needsJournalFaceRepair,
};