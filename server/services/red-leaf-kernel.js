/**
 * Red Leaf Kernel (RLK) — Iteration 5
 *
 * Paradox: a single 🍁 seed unfolds into the entire AFS application —
 * routes, interfaces, data-flow edges, navigation, live pulses, and static
 * self-build — through recursive reframe / transform / optimize operators.
 */
const fs = require('fs');
const path = require('path');
const { dataPath } = require('../paths');

const SEED = '🍁';

/** Domain catalog — each module is 🍁 reframed onto a named domain. */
const MODULE_CATALOG = {
  dashboard: {
    label: 'Dashboard', path: '/', glyph: '⌂', branch: 'seed',
    api: { primary: '/api/dashboard', read: ['identity', 'aspects', 'grok', 'journal'], write: [] },
    emits: ['pulse.identity'],
  },
  aspects: {
    label: 'Aspects', path: '/aspects', glyph: '💎', branch: 'reframe',
    api: { primary: '/api/aspects', read: ['aspects', 'synergies'], write: ['aspects'] },
    emits: ['pulse.aspect'],
  },
  lore: {
    label: 'Lore', path: '/lore', glyph: '✨', branch: 'reframe',
    api: { primary: '/api/lore', read: ['lore'], write: [] },
    emits: ['pulse.lore'],
  },
  insights: {
    label: 'Insights', path: '/insights', glyph: '💡', branch: 'reframe',
    api: { primary: '/api/insights', read: ['insights', 'codex'], write: [] },
    emits: ['pulse.insight'],
  },
  journal: {
    label: 'Journal', path: '/journal', glyph: '📓', branch: 'reframe',
    api: { primary: '/api/journal', read: ['journal'], write: ['journal'] },
    emits: ['pulse.journal'],
  },
  identity: {
    label: 'Identity', path: '/identity', glyph: '🪞', branch: 'reframe',
    api: { primary: '/api/identity', read: ['identity', 'aspects'], write: ['identity'] },
    emits: ['pulse.identity'],
  },
  spiral: {
    label: 'Spiral Engine', path: '/spiral', glyph: '∞', branch: 'transform',
    api: { primary: '/api/kernel', read: ['kernel'], write: [] },
    emits: ['pulse.spiral'],
  },
  fusions: {
    label: 'Fusions', path: '/fusions', glyph: '⚗️', branch: 'transform',
    api: { primary: '/api/fusions', read: ['fusions', 'aspects'], write: [] },
    emits: ['pulse.fusion'],
  },
  visualizations: {
    label: 'Visuals', path: '/visualizations', glyph: '🎬', branch: 'transform',
    api: { primary: '/api/visualizations', read: ['visualizations'], write: [] },
    emits: ['pulse.viz'],
  },
  grok: {
    label: 'Grok Origin', path: '/grok', glyph: '📜', branch: 'transform',
    api: { primary: '/api/grok/sessions', read: ['grok'], write: [] },
    emits: ['pulse.grok'],
  },
  math: {
    label: 'Mathematics', path: '/math', glyph: '∑', branch: 'transform',
    api: { primary: '/api/math', read: ['math', 'codex'], write: [] },
    emits: ['pulse.math'],
  },
  forge: {
    label: 'Forge', path: '/forge', glyph: '⚒️', branch: 'optimize',
    api: { primary: '/api/forge', read: ['aspects', 'codex'], write: ['forge_sessions'] },
    emits: ['pulse.forge'],
  },
  daily: {
    label: 'DFR / DKR', path: '/daily', glyph: '📅', branch: 'optimize',
    api: { primary: '/api/daily-runs', read: ['protocols'], write: ['daily_runs'] },
    emits: ['pulse.daily'],
  },
  codex: {
    label: 'Codex', path: '/codex', glyph: '📖', branch: 'optimize',
    api: { primary: '/api/codex', read: ['codex', 'axioms'], write: [] },
    emits: ['pulse.codex'],
  },
  goals: {
    label: 'Goals', path: '/goals', glyph: '🎯', branch: 'optimize',
    api: { primary: '/api/goals', read: ['goals'], write: ['goals'] },
    emits: ['pulse.goal'],
  },
  personas: {
    label: 'Personas', path: '/personas', glyph: '👤', branch: 'optimize',
    api: { primary: '/api/personas', read: ['personas'], write: ['personas'] },
    emits: ['pulse.persona'],
  },
  techniques: {
    label: 'Techniques', path: '/techniques', glyph: '🧠', branch: 'optimize',
    api: { primary: '/api/techniques', read: ['techniques'], write: [] },
    emits: ['pulse.technique'],
  },
  automations: {
    label: 'Automations', path: '/automations', glyph: '⚡', branch: 'optimize',
    api: { primary: '/api/automations', read: ['automations'], write: ['automations'] },
    emits: ['pulse.auto'],
  },
  search: {
    label: 'Search', path: '/search', glyph: '🔍', branch: 'optimize',
    api: { primary: '/api/search', read: ['search_index', 'aspects', 'codex'], write: [] },
    emits: ['pulse.search'],
  },
  kernel: {
    label: 'Red Leaf Kernel', path: '/kernel', glyph: '🍁', branch: 'seed',
    api: { primary: '/api/kernel', read: ['kernel'], write: [] },
    emits: ['pulse.kernel'],
  },
};

/** Page component + layout + smoke-test heading — consumed by route codegen. */
const ROUTE_META = {
  dashboard: { page: 'Dashboard', layout: 'shell', testHeading: 'Welcome|Test Forger' },
  codex: { page: 'Codex', layout: 'shell', testHeading: 'AFS Codex' },
  lore: { page: 'Lore', layout: 'shell', testHeading: 'Lore & Alchemy' },
  aspects: { page: 'Aspects', layout: 'shell', testHeading: 'Aspect Registry' },
  forge: { page: 'Forge', layout: 'shell', testHeading: 'Aspect Forge Protocol' },
  daily: { page: 'Daily', layout: 'shell', testHeading: 'Daily Forge Runs' },
  goals: { page: 'Goals', layout: 'shell', testHeading: 'Goals & Achievements' },
  personas: { page: 'Personas', layout: 'shell', testHeading: '^Personas$' },
  insights: { page: 'Insights', layout: 'shell', testHeading: '^Insights$' },
  grok: { page: 'GrokOrigin', layout: 'shell', testHeading: 'Grok Origin' },
  journal: { page: 'Journal', layout: 'shell', testHeading: '^Journal$' },
  visualizations: { page: 'Visualizations', layout: 'shell', testHeading: '^Visualizations$' },
  spiral: { page: 'SpiralEngine', layout: 'fullscreen', testHeading: 'Recursive Spiral Engine' },
  kernel: { page: 'RedLeafKernel', layout: 'shell', testHeading: 'Red Leaf Kernel' },
  math: { page: 'MathPage', layout: 'shell', testHeading: '^Mathematics$' },
  techniques: { page: 'Techniques', layout: 'shell', testHeading: '^Techniques$' },
  fusions: { page: 'Fusions', layout: 'shell', testHeading: 'Alchemy Fusions & Synergies' },
  automations: { page: 'Automations', layout: 'shell', testHeading: '^Automations$' },
  identity: { page: 'Identity', layout: 'shell', testHeading: 'Current Identity' },
  search: { page: 'SearchPage', layout: 'shell', testHeading: 'Search Directory' },
};

const NAV_ORDER = [
  'dashboard', 'codex', 'lore', 'aspects', 'forge', 'daily', 'goals', 'personas',
  'insights', 'grok', 'journal', 'visualizations', 'spiral', 'kernel', 'math',
  'techniques', 'fusions', 'automations', 'identity', 'search',
];

const BRANCHES = {
  seed: { operator: 'seed', symbol: SEED, label: 'Origin', vector: 'origin', modules: ['dashboard', 'kernel'] },
  reframe: { operator: 'reframe', symbol: '🍁', label: 'Reframe', vector: 'descent', modules: ['aspects', 'lore', 'insights', 'journal', 'identity'] },
  transform: { operator: 'transform', symbol: '♾️🌀', label: 'Transform', vector: 'spiral', modules: ['spiral', 'fusions', 'visualizations', 'grok', 'math'] },
  optimize: { operator: 'optimize', symbol: 'AFS', label: 'Optimize', vector: 'ascent', modules: ['forge', 'daily', 'codex', 'goals', 'personas', 'techniques', 'automations', 'search'] },
};

/** Cross-module data-flow edges (downstream consumers). */
const FLOW_EDGES = {
  dashboard: ['aspects', 'forge', 'journal', 'kernel'],
  kernel: ['dashboard', 'codex', 'aspects', 'forge'],
  codex: ['forge', 'aspects', 'insights', 'math'],
  aspects: ['forge', 'fusions', 'search', 'identity', 'goals'],
  forge: ['aspects', 'insights', 'journal', 'daily'],
  daily: ['goals', 'journal', 'dashboard'],
  journal: ['aspects', 'insights', 'dashboard'],
  grok: ['aspects', 'codex', 'insights'],
  lore: ['insights', 'aspects'],
  insights: ['forge', 'codex'],
  fusions: ['aspects'],
  visualizations: ['aspects', 'lore'],
  spiral: ['codex', 'kernel'],
  goals: ['dashboard', 'daily'],
  personas: ['identity', 'forge'],
  identity: ['dashboard', 'personas'],
  search: ['aspects', 'codex', 'lore', 'journal'],
  math: ['codex', 'spiral'],
  techniques: ['forge', 'daily'],
  automations: ['journal', 'daily'],
};

let unfoldCache = null;
let unfoldCacheMtime = 0;

function loadSeedFile() {
  const file = dataPath('red-leaf-seed.json');
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function seedMtime() {
  try {
    return fs.statSync(dataPath('red-leaf-seed.json')).mtimeMs;
  } catch {
    return 0;
  }
}

function bustUnfoldCache() {
  unfoldCache = null;
  unfoldCacheMtime = 0;
}

function composeSymbol(branchKey, glyph) {
  const branch = BRANCHES[branchKey];
  if (!branch) return `${SEED}${glyph}`;
  if (branchKey === 'seed') return `${SEED}${glyph}`;
  return `${SEED}${branch.symbol}${glyph}`;
}

function unfoldModule(id) {
  const spec = MODULE_CATALOG[id];
  if (!spec) return null;
  const branchKey = spec.branch;
  const branch = BRANCHES[branchKey];
  return {
    id,
    symbol: composeSymbol(branchKey, spec.glyph),
    path: spec.path,
    label: spec.label,
    branch: branchKey,
    operator: branch?.operator ?? 'seed',
    operatorSymbol: branch?.symbol ?? SEED,
    vector: branch?.vector ?? 'origin',
    depth: branchKey === 'seed' ? 0 : branchKey === 'reframe' ? 1 : 2,
    glyph: spec.glyph,
    api: spec.api,
    emits: spec.emits,
    dataSources: spec.api.read,
    dataSinks: spec.api.write,
    ...(ROUTE_META[id] || {}),
  };
}

function buildRouteManifest() {
  return NAV_ORDER.map((id) => {
    const spec = MODULE_CATALOG[id];
    const meta = ROUTE_META[id];
    if (!spec || !meta) return null;
    const unfolded = unfoldModule(id);
    return {
      id,
      path: spec.path,
      page: meta.page,
      layout: meta.layout,
      label: spec.label,
      symbol: unfolded.symbol,
      branch: spec.branch,
      testHeading: meta.testHeading,
      end: spec.path === '/',
    };
  }).filter(Boolean);
}

function unfoldFromSeed() {
  const mtime = seedMtime();
  if (unfoldCache && unfoldCacheMtime === mtime) return unfoldCache;

  const seedDoc = loadSeedFile();
  const modules = Object.keys(MODULE_CATALOG).map(unfoldModule).filter(Boolean);
  const branches = Object.entries(BRANCHES).map(([key, b]) => ({
    id: key,
    operator: b.operator,
    symbol: b.symbol,
    label: b.label,
    vector: b.vector,
    moduleIds: b.modules,
    modules: b.modules.map(unfoldModule).filter(Boolean),
  }));

  const nodes = modules.length;
  const allSymbolsStartWithSeed = modules.every((m) => m.symbol.startsWith(SEED));

  unfoldCache = {
    seed: SEED,
    version: seedDoc.version,
    iteration: seedDoc.iteration,
    paradox: seedDoc.paradox,
    axiom: seedDoc.axiom,
    capabilities: seedDoc.capabilities ?? {},
    spiral: {
      operator: '♾️🌀',
      rings: ['reframe', 'transform', 'optimize'],
      flowEdgeCount: Object.values(FLOW_EDGES).flat().length,
    },
    generatedAt: new Date().toISOString(),
    topology: { branches, modules, nodeCount: nodes },
    invariant: {
      singleSeed: SEED,
      allSymbolsContainSeed: allSymbolsStartWithSeed,
      moduleCount: nodes,
      branchCount: branches.length,
    },
  };
  unfoldCacheMtime = mtime;
  return unfoldCache;
}

function buildNavFromKernel() {
  const kernel = unfoldFromSeed();
  const byId = Object.fromEntries(kernel.topology.modules.map((m) => [m.id, m]));
  return NAV_ORDER.filter((id) => byId[id]).map((id) => {
    const m = byId[id];
    return { id: m.id, to: m.path, label: m.label, symbol: m.symbol, branch: m.branch, operator: m.operator };
  });
}

function buildFlowGraph() {
  const modules = Object.keys(MODULE_CATALOG);
  const edges = [];
  for (const [from, targets] of Object.entries(FLOW_EDGES)) {
    for (const to of targets) {
      if (MODULE_CATALOG[from] && MODULE_CATALOG[to]) {
        edges.push({
          from,
          to,
          fromSymbol: unfoldModule(from)?.symbol,
          toSymbol: unfoldModule(to)?.symbol,
          kind: 'data-flow',
        });
      }
    }
  }
  return {
    seed: SEED,
    nodes: modules.map((id) => {
      const m = unfoldModule(id);
      return { id, symbol: m.symbol, label: m.label, reads: m.dataSources, writes: m.dataSinks };
    }),
    edges,
    edgeCount: edges.length,
  };
}

function routePulse(originId, payload = {}) {
  const origin = unfoldModule(originId);
  if (!origin) {
    return { ok: false, error: `Unknown module: ${originId}` };
  }

  const visited = new Set();
  const trace = [];
  const queue = [{ id: originId, hop: 0, via: null }];

  while (queue.length) {
    const { id, hop, via } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const node = unfoldModule(id);
    trace.push({
      hop,
      module: id,
      symbol: node.symbol,
      via,
      action: hop === 0 ? 'emit' : 'receive',
    });

    const downstream = FLOW_EDGES[id] || [];
    for (const next of downstream) {
      if (!visited.has(next)) {
        queue.push({ id: next, hop: hop + 1, via: id });
      }
    }
  }

  return {
    ok: true,
    seed: SEED,
    paradox: '🍁(pulse) = Reframe(network)',
    origin: { id: originId, symbol: origin.symbol },
    payload,
    trace,
    reach: trace.length,
    hops: Math.max(...trace.map((t) => t.hop), 0),
  };
}

function resolveModule(id) {
  const mod = unfoldModule(id);
  if (!mod) return null;
  const inbound = [];
  const outbound = FLOW_EDGES[id] || [];
  for (const [from, targets] of Object.entries(FLOW_EDGES)) {
    if (targets.includes(id)) inbound.push(from);
  }
  return { ...mod, flow: { inbound, outbound } };
}

function verifyKernel() {
  const kernel = unfoldFromSeed();
  const nav = buildNavFromKernel();
  const flow = buildFlowGraph();
  const errors = [];

  if (kernel.seed !== SEED) errors.push('Seed must be 🍁');
  if (kernel.topology.nodeCount < 18) errors.push(`Expected ≥18 modules, got ${kernel.topology.nodeCount}`);
  if (!kernel.invariant.allSymbolsContainSeed) errors.push('All module symbols must contain 🍁');
  if (nav.length !== kernel.topology.nodeCount) errors.push('Nav count mismatch');

  const routes = buildRouteManifest();
  if (routes.length !== kernel.topology.nodeCount) {
    errors.push(`Route manifest mismatch: ${routes.length} vs ${kernel.topology.nodeCount}`);
  }
  const paths = routes.map((r) => r.path);
  if (new Set(paths).size !== paths.length) errors.push('Duplicate route paths in manifest');
  for (const id of Object.keys(MODULE_CATALOG)) {
    if (!ROUTE_META[id]) errors.push(`Missing ROUTE_META for module: ${id}`);
  }

  const unreachable = kernel.topology.modules.filter(
    (m) => m.id !== 'dashboard' && !(FLOW_EDGES[m.id] || []).length && !Object.values(FLOW_EDGES).flat().includes(m.id),
  );
  if (unreachable.length > 2) {
    errors.push(`Flow graph isolates: ${unreachable.map((m) => m.id).join(', ')}`);
  }

  return { ok: errors.length === 0, errors, kernel, nav, flow, routes };
}

module.exports = {
  SEED,
  MODULE_CATALOG,
  ROUTE_META,
  NAV_ORDER,
  BRANCHES,
  FLOW_EDGES,
  loadSeedFile,
  bustUnfoldCache,
  unfoldFromSeed,
  buildNavFromKernel,
  buildRouteManifest,
  buildFlowGraph,
  routePulse,
  resolveModule,
  verifyKernel,
  unfoldModule,
};