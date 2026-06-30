/**
 * Module cache — Iteration 6 (AFS↑ multi-module snapshots)
 * Hot read paths cached per module; invalidated by ♾️🌀 spiral handlers.
 */
const kernelStore = require('./kernel-store');

const TTL = {
  aspects: 120_000,
  codex: 300_000,
  journal: 60_000,
  goals: 60_000,
};

function cacheMeta(hit) {
  const s = kernelStore.storeStats();
  return { cached: hit, hitRate: s.hitRate, entries: s.entries };
}

function getAspectsRegistry(builder, { fresh = false } = {}) {
  if (fresh) {
    kernelStore.invalidateKey('aspects', 'registry');
  }
  const { value, hit } = kernelStore.getOrBuild('aspects', 'registry', builder, TTL.aspects);
  return { data: value, hit };
}

function getCodexGrouped(builder, { fresh = false } = {}) {
  if (fresh) {
    kernelStore.invalidateKey('codex', 'registry');
  }
  const { value, hit } = kernelStore.getOrBuild('codex', 'registry', builder, TTL.codex);
  return { data: value, hit };
}

function getJournalList(key, builder, { fresh = false } = {}) {
  if (fresh) {
    kernelStore.invalidateKey('journal', key);
  }
  const { value, hit } = kernelStore.getOrBuild('journal', key, builder, TTL.journal);
  return { data: value, hit };
}

function getGoalsActive(builder, { fresh = false } = {}) {
  if (fresh) {
    kernelStore.invalidateKey('goals', 'active');
  }
  const { value, hit } = kernelStore.getOrBuild('goals', 'active', builder, TTL.goals);
  return { data: value, hit };
}

function moduleCacheStats() {
  const s = kernelStore.storeStats();
  return {
    modules: ['dashboard', 'aspects', 'codex', 'journal', 'goals'],
    ttl: TTL,
    store: s,
  };
}

module.exports = {
  TTL,
  cacheMeta,
  getAspectsRegistry,
  getCodexGrouped,
  getJournalList,
  getGoalsActive,
  moduleCacheStats,
};