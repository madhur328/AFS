/**
 * Kernel Spiral Engine — Iteration 5 (♾️🌀 Transform)
 * Pulses propagate through the flow graph and trigger downstream side effects.
 */
const { FLOW_EDGES, unfoldModule, SEED, loadSeedFile } = require('./red-leaf-kernel');
const kernelStore = require('./kernel-store');
const { invalidateAspectFaceCache } = require('./aspect-face-cache');

/** @type {Map<string, Array<(event: object, ctx: object) => object | void>>} */
const handlers = new Map();

const spiralStats = {
  pulsesHandled: 0,
  actionsRun: 0,
  invalidations: 0,
  byModule: {},
};

function recordModule(module, actions) {
  spiralStats.byModule[module] = spiralStats.byModule[module] || { pulses: 0, actions: 0 };
  spiralStats.byModule[module].pulses += 1;
  spiralStats.byModule[module].actions += actions;
}

function registerHandler(moduleId, fn) {
  const list = handlers.get(moduleId) || [];
  list.push(fn);
  handlers.set(moduleId, list);
}

function invalidateDownstreamStores(moduleId, event) {
  const mod = unfoldModule(moduleId);
  if (!mod) return { module: moduleId, invalidated: 0, keys: [] };

  const keys = [];
  let invalidated = 0;

  if (mod.dataSinks?.length || mod.api?.write?.length) {
    invalidated += kernelStore.invalidateModule(moduleId);
    keys.push(`${moduleId}:*`);
  }

  if (mod.dataSources?.includes('aspects') || moduleId === 'aspects') {
    invalidated += kernelStore.invalidateModule('aspects');
    keys.push('aspects:*');
  }

  if (['dashboard', 'journal', 'goals', 'forge', 'daily', 'codex', 'aspects'].includes(moduleId)) {
    invalidated += kernelStore.invalidateKey('dashboard', 'summary');
    keys.push('dashboard:summary');
  }

  if (moduleId === 'codex' || mod.dataSources?.includes('codex')) {
    invalidated += kernelStore.invalidateModule('codex');
    keys.push('codex:*');
  }

  if (moduleId === 'journal') {
    invalidated += kernelStore.invalidateModule('journal');
    keys.push('journal:*');
  }

  if (moduleId === 'goals') {
    invalidated += kernelStore.invalidateModule('goals');
    keys.push('goals:*');
  }

  if (moduleId === 'forge' || moduleId === 'aspects') {
    try {
      invalidateAspectFaceCache();
      keys.push('aspects:face-index');
    } catch (_) {
      /* db may not be ready in tests */
    }
  }

  spiralStats.invalidations += invalidated;
  return { module: moduleId, invalidated, keys };
}

function defaultHandler(moduleId) {
  return (event) => {
    const inv = invalidateDownstreamStores(moduleId, event);
    return { type: 'invalidate', ...inv };
  };
}

function bootHandlers() {
  if (handlers.size) return;
  for (const moduleId of Object.keys(FLOW_EDGES)) {
    registerHandler(moduleId, defaultHandler(moduleId));
  }
  registerHandler('kernel', (event) => ({
    type: 'observe',
    module: 'kernel',
    action: event.meta?.action ?? 'pulse',
  }));
}

/**
 * Run spiral transforms on downstream modules reached by the pulse trace.
 * Skips hop 0 (origin) — origin already acted; spiral transforms receivers.
 */
function propagateSpiral(event, routed) {
  bootHandlers();
  if (!routed?.ok || !event?.trace?.length) {
    return { ok: false, actions: [], reach: 0 };
  }

  const actions = [];
  const seen = new Set();

  for (const step of event.trace) {
    if (step.hop === 0) continue;
    if (seen.has(step.module)) continue;
    seen.add(step.module);

    const fns = handlers.get(step.module) || [];
    for (const fn of fns) {
      try {
        const result = fn(event, { step, routed });
        if (result) {
          actions.push(result);
          spiralStats.actionsRun += 1;
        }
      } catch (_) {
        actions.push({ type: 'error', module: step.module });
      }
    }
    recordModule(step.module, fns.length);
  }

  spiralStats.pulsesHandled += 1;

  return {
    ok: true,
    seed: SEED,
    operator: '♾️🌀',
    paradox: '♾️🌀(pulse) = Transform(network)',
    origin: event.origin,
    reach: seen.size,
    actions,
  };
}

function spiralTelemetry() {
  const store = kernelStore.storeStats();
  return {
    seed: SEED,
    iteration: loadSeedFile().iteration ?? 6,
    operator: '♾️🌀',
    pulsesHandled: spiralStats.pulsesHandled,
    actionsRun: spiralStats.actionsRun,
    invalidations: spiralStats.invalidations,
    byModule: spiralStats.byModule,
    cache: store,
    edgeCount: Object.values(FLOW_EDGES).flat().length,
    handlerModules: handlers.size,
  };
}

function resetSpiralStats() {
  spiralStats.pulsesHandled = 0;
  spiralStats.actionsRun = 0;
  spiralStats.invalidations = 0;
  spiralStats.byModule = {};
}

module.exports = {
  registerHandler,
  propagateSpiral,
  spiralTelemetry,
  resetSpiralStats,
  invalidateDownstreamStores,
  bootHandlers,
};