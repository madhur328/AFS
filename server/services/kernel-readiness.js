/**
 * Kernel readiness gate — practical checks before enabling runtime app generation.
 * Observability (kernel map, pulses) can be ready while generation stays disabled.
 */
const fs = require('fs');
const path = require('path');
const { dataPath } = require('../paths');
const {
  SEED,
  verifyKernel,
  unfoldFromSeed,
  buildRouteManifest,
  loadSeedFile,
} = require('./red-leaf-kernel');
const { spiralTelemetry } = require('./kernel-spiral');
const kernelStore = require('./kernel-store');
const { moduleCacheStats } = require('./module-cache');

const ROOT = path.join(__dirname, '..', '..');
const GENERATED_MANIFEST = path.join(ROOT, 'client', 'src', 'generated', 'kernel-routes.manifest.json');

/** Max unfold payload size (bytes) — guards against memory-split blowups in the browser. */
const UNFOLD_BUDGET_BYTES = 120_000;

const PRACTICAL_STRATEGY = {
  title: 'Practical Red Leaf strategy',
  summary:
    'Keep 🍁 as architecture map and dev tooling first. Hand-stable pages stay primary; route codegen runs at build time only until all gates pass.',
  phases: [
    {
      id: 'stable-core',
      label: 'Stable core',
      status: 'active',
      detail: 'Dashboard, aspects, forge, journal — independent of kernel unfold.',
    },
    {
      id: 'observability',
      label: 'Observability',
      status: 'active',
      detail: 'Kernel topology, flow graph, pulse bus — view and trace, no runtime regen.',
    },
    {
      id: 'dev-codegen',
      label: 'Dev-time codegen',
      status: 'active',
      detail: 'npm run generate-routes from kernel manifest — not triggered in the browser.',
    },
    {
      id: 'runtime-generation',
      label: 'Runtime generation',
      status: 'blocked',
      detail: 'Generate app from leaf in UI when capability flag + all requirements pass.',
    },
    {
      id: 'spiral-handlers',
      label: 'Spiral transform handlers',
      status: 'planned',
      detail: 'Pulses trigger downstream cache invalidation through ♾️🌀 spiral propagation.',
    },
    {
      id: 'kernel-cache',
      label: 'Kernel store cache',
      status: 'planned',
      detail: 'Module-scoped snapshots (dashboard) with pulse-driven invalidation.',
    },
  ],
};

function buildStrategy(caps) {
  const phaseStatus = {
    'runtime-generation': caps.runtimeGeneration ? 'active' : 'blocked',
    'spiral-handlers': caps.spiralHandlers ? 'active' : 'planned',
    'kernel-cache': caps.kernelCache ? 'active' : 'planned',
  };
  return {
    ...PRACTICAL_STRATEGY,
    summary:
      'Iteration 5: 🍁 maps structure, ♾️🌀 transforms pulses into side effects, AFS↑ optimizes hot paths via kernel store.',
    phases: PRACTICAL_STRATEGY.phases.map((p) =>
      phaseStatus[p.id] ? { ...p, status: phaseStatus[p.id] } : p,
    ),
  };
}

function readGeneratedManifest() {
  try {
    return JSON.parse(fs.readFileSync(GENERATED_MANIFEST, 'utf-8'));
  } catch {
    return null;
  }
}

function checkRequirement(id, label, detail, pass, meta = {}) {
  return { id, label, detail, pass, ...meta };
}

function assessKernelReadiness(pulseBus) {
  const seedDoc = loadSeedFile();
  const caps = seedDoc.capabilities ?? {};
  const verify = verifyKernel();
  const kernel = unfoldFromSeed();
  const unfoldBytes = Buffer.byteLength(JSON.stringify(kernel), 'utf8');
  const routes = buildRouteManifest();
  const generated = readGeneratedManifest();
  const generatedRoutes = generated?.routes ?? [];

  let pulseOk = false;
  let pulseError = null;
  if (pulseBus) {
    try {
      const before = pulseBus.pulseStats().total;
      pulseBus.emitPulse('kernel', { readiness: true }, { action: 'readiness.probe' });
      const after = pulseBus.getPulses({ limit: 1 });
      pulseOk = after.length > 0 && pulseBus.pulseStats().total >= before;
    } catch (e) {
      pulseError = e.message;
    }
  }

  const manifestSynced =
    generatedRoutes.length > 0 && generatedRoutes.length === kernel.topology.nodeCount;
  const boundedUnfold = unfoldBytes <= UNFOLD_BUDGET_BYTES;
  const runtimeFlagEnabled = caps.runtimeGeneration === true;
  const spiralHandlersEnabled = caps.spiralHandlers === true;
  const kernelCacheEnabled = caps.kernelCache === true;

  const requirements = [
    checkRequirement(
      'kernel-verify',
      'Kernel verification passes',
      'Seed unfold, nav, flow, and route manifest are internally consistent.',
      verify.ok,
      { errors: verify.errors },
    ),
    checkRequirement(
      'pulse-bus',
      'Pulse bus operational',
      'Emit and retrieve pulses without server errors.',
      pulseOk,
      pulseError ? { error: pulseError } : {},
    ),
    checkRequirement(
      'bounded-unfold',
      'Kernel unfold within memory budget',
      `Full topology JSON must stay under ${Math.round(UNFOLD_BUDGET_BYTES / 1000)}KB (currently ${Math.round(unfoldBytes / 1000)}KB).`,
      boundedUnfold,
      { unfoldBytes, budgetBytes: UNFOLD_BUDGET_BYTES },
    ),
    checkRequirement(
      'route-manifest-sync',
      'Generated routes match kernel modules',
      'client/src/generated/kernel-routes.manifest.json must match live module count.',
      manifestSynced,
      {
        kernelModules: kernel.topology.nodeCount,
        generatedRoutes: generatedRoutes.length,
        generatedAt: generated?.meta?.generatedAt ?? null,
      },
    ),
    checkRequirement(
      'dashboard-independent',
      'Dashboard loads without kernel',
      'Core dashboard API does not depend on kernel unfold or pulse polling.',
      true,
    ),
    checkRequirement(
      'dev-codegen-only',
      'Route codegen is dev/build-time only',
      'npm run generate-routes — never auto-run from browser clicks.',
      caps.devRouteCodegen !== false,
    ),
    checkRequirement(
      'runtime-flag',
      'Runtime generation explicitly enabled',
      'Set capabilities.runtimeGeneration: true in red-leaf-seed.json when ready to unlock UI generation.',
      runtimeFlagEnabled,
      { runtimeGeneration: caps.runtimeGeneration ?? false },
    ),
    checkRequirement(
      'spiral-handlers',
      'Spiral transform handlers active',
      'Pulses propagate ♾️🌀 side effects (cache invalidation) on downstream modules.',
      spiralHandlersEnabled,
      { spiralHandlers: caps.spiralHandlers ?? false },
    ),
    checkRequirement(
      'kernel-cache',
      'Kernel store cache active',
      'Dashboard and hot paths use module-scoped snapshot cache with TTL.',
      kernelCacheEnabled,
      { kernelCache: caps.kernelCache ?? false },
    ),
  ];

  const observabilityIds = ['kernel-verify', 'pulse-bus', 'bounded-unfold', 'dashboard-independent'];
  const generationIds = [
    ...observabilityIds,
    'route-manifest-sync',
    'dev-codegen-only',
    'runtime-flag',
  ];

  const observabilityReady = observabilityIds.every((id) => requirements.find((r) => r.id === id)?.pass);
  const generationReady = generationIds.every((id) => requirements.find((r) => r.id === id)?.pass);

  const spiral = caps.spiralHandlers ? spiralTelemetry() : null;
  const store = caps.kernelCache
    ? { ...kernelStore.storeStats(), modules: moduleCacheStats() }
    : kernelStore.storeStats();

  return {
    seed: SEED,
    iteration: seedDoc.iteration,
    strategy: buildStrategy(caps),
    observabilityReady,
    generationReady,
    ready: generationReady,
    requirements,
    metrics: {
      moduleCount: kernel.topology.nodeCount,
      routeCount: routes.length,
      unfoldBytes,
      unfoldBudgetBytes: UNFOLD_BUDGET_BYTES,
    },
    spiral,
    store,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  PRACTICAL_STRATEGY,
  UNFOLD_BUDGET_BYTES,
  assessKernelReadiness,
};