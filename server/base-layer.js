const fs = require('fs');
const path = require('path');
const { dataPath, getProjectRoot } = require('./paths');

function resolveAssetPath(p) {
  if (!p) return null;
  if (path.isAbsolute(p)) return p;
  return path.join(getProjectRoot(), p.replace(/\//g, path.sep));
}

let cached = null;

function loadBaseLayerConfig() {
  if (cached) return cached;
  const file = dataPath('base-layer.json');
  cached = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return cached;
}

function getBaseLayerSlots() {
  return loadBaseLayerConfig().slots.map((s) => ({
    ...s,
    video: resolveAssetPath(s.video),
    artifact: s.artifact ? resolveAssetPath(s.artifact) : s.artifact,
  }));
}

function getBaseLayerMap() {
  const map = {};
  for (const slot of getBaseLayerSlots()) {
    map[slot.symbol] = {
      name: slot.name,
      role: slot.role,
      mantra: slot.mantras[0] || '',
    };
  }
  map['🍁'] = {
    name: 'Red Leaf Operator',
    role: 'Identity reframe — 🍁 = ♾️🌀 = AFS',
    mantra: 'I am the Leaf that spreads without consuming the Tree.',
  };
  return map;
}

function getBaseAspectMeta() {
  return loadBaseLayerConfig().baseAspects || {};
}

function getBaseLayerLabel() {
  const cfg = loadBaseLayerConfig();
  return cfg.label || `Base Layer (${cfg.slots.length})`;
}

function getBaseLayerSymbols() {
  return getBaseLayerSlots().map((s) => s.symbol);
}

const REMOVED_BASE_SYMBOLS = ['🔶', '🫶', '💎', '🛡️🌱', '🛡️'];
const REMOVED_BASE_NAMES = ['Forge / Value', 'Unwavering Heart', 'Signal / Structure'];
const REMOVED_PROFICIENCY_KEYS = ['forge', 'heart', 'signal'];

function getRemovedBaseMeta() {
  return loadBaseLayerConfig().removedSlots || [];
}

function getBaseLayerIntegrationList() {
  return getBaseLayerSlots().map((s) => ({ symbol: s.symbol, name: s.name }));
}

function isRemovedBaseRef(symbolOrText) {
  if (!symbolOrText) return false;
  const t = String(symbolOrText).trim();
  if (REMOVED_BASE_SYMBOLS.includes(t)) return true;
  if (REMOVED_BASE_NAMES.some((n) => t.includes(n))) return true;
  return false;
}

function normalizeBaseLayerEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'object' && entry.symbol) {
    if (isRemovedBaseRef(entry.symbol) || isRemovedBaseRef(entry.name)) return null;
    return { symbol: entry.symbol, name: entry.name || getBaseLayerMap()[entry.symbol]?.name || '' };
  }
  const text = String(entry).trim();
  if (!text || isRemovedBaseRef(text)) return null;
  const map = getBaseLayerMap();
  if (map[text]) return { symbol: text, name: map[text].name };
  const slot = getBaseLayerSlots().find((s) => text.startsWith(s.symbol));
  if (slot) return { symbol: slot.symbol, name: slot.name };
  const sym = text.split(/\s+/)[0];
  if (map[sym]) return { symbol: sym, name: map[sym].name };
  return null;
}

function getCanonicalBaseLayerIntegration(link) {
  if (link && !isRemovedBaseRef(link)) {
    const slot = getBaseLayerMap()[link];
    if (slot) return [{ symbol: link, name: slot.name }];
  }
  return getBaseLayerIntegrationList();
}

function getDefaultProficiencyJson(existing = {}) {
  const baseLayer = { ...(existing.baseLayer || {}) };
  for (const key of REMOVED_PROFICIENCY_KEYS) delete baseLayer[key];
  for (const slot of getBaseLayerSlots()) {
    if (slot.proficiencyKey && baseLayer[slot.proficiencyKey] == null) {
      baseLayer[slot.proficiencyKey] = slot.proficiency;
    }
  }
  return {
    overall: existing.overall ?? 0.62,
    operators: existing.operators ?? { EOT: 0.78, DCS: 0.55, AFP: 0.48, DKR: 0.71, DFR: 0.65 },
    baseLayer,
  };
}

module.exports = {
  loadBaseLayerConfig,
  getBaseLayerSlots,
  getBaseLayerMap,
  getBaseAspectMeta,
  getBaseLayerLabel,
  getBaseLayerSymbols,
  getBaseLayerIntegrationList,
  getRemovedBaseMeta,
  REMOVED_BASE_SYMBOLS,
  REMOVED_BASE_NAMES,
  REMOVED_PROFICIENCY_KEYS,
  isRemovedBaseRef,
  normalizeBaseLayerEntry,
  getCanonicalBaseLayerIntegration,
  getDefaultProficiencyJson,
};