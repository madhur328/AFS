/**
 * Kernel Store — Iteration 5 (AFS↑ Optimize)
 * Module-scoped snapshot cache with pulse-driven invalidation.
 */
const stats = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  sets: 0,
};

/** @type {Map<string, { value: unknown, at: number, ttlMs: number, module: string }>} */
const entries = new Map();

const DEFAULT_TTL_MS = 30_000;

function cacheKey(module, key) {
  return `${module}:${key}`;
}

function get(module, key) {
  const k = cacheKey(module, key);
  const row = entries.get(k);
  if (!row) {
    stats.misses += 1;
    return null;
  }
  if (Date.now() - row.at > row.ttlMs) {
    entries.delete(k);
    stats.misses += 1;
    return null;
  }
  stats.hits += 1;
  return row.value;
}

function set(module, key, value, ttlMs = DEFAULT_TTL_MS) {
  const k = cacheKey(module, key);
  entries.set(k, { value, at: Date.now(), ttlMs, module });
  stats.sets += 1;
  return value;
}

function getOrBuild(module, key, builder, ttlMs = DEFAULT_TTL_MS) {
  const k = cacheKey(module, key);
  const row = entries.get(k);
  if (row && Date.now() - row.at <= row.ttlMs) {
    stats.hits += 1;
    return { value: row.value, hit: true };
  }
  if (row) entries.delete(k);
  stats.misses += 1;
  const value = builder();
  set(module, key, value, ttlMs);
  return { value, hit: false };
}

function invalidateModule(module) {
  let count = 0;
  for (const [k, row] of entries) {
    if (row.module === module) {
      entries.delete(k);
      count += 1;
    }
  }
  stats.invalidations += count;
  return count;
}

function invalidateKey(module, key) {
  const k = cacheKey(module, key);
  if (entries.delete(k)) {
    stats.invalidations += 1;
    return 1;
  }
  return 0;
}

function clearAll() {
  const n = entries.size;
  entries.clear();
  stats.invalidations += n;
  return n;
}

function storeStats() {
  const byModule = {};
  for (const row of entries.values()) {
    byModule[row.module] = (byModule[row.module] || 0) + 1;
  }
  const total = stats.hits + stats.misses;
  return {
    entries: entries.size,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total ? Math.round((stats.hits / total) * 1000) / 1000 : null,
    invalidations: stats.invalidations,
    sets: stats.sets,
    byModule,
  };
}

module.exports = {
  DEFAULT_TTL_MS,
  get,
  set,
  getOrBuild,
  invalidateModule,
  invalidateKey,
  clearAll,
  storeStats,
};