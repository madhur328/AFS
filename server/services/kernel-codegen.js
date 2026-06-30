/**
 * Kernel route codegen — shared by dev script and runtime POST /kernel/generate.
 */
const fs = require('fs');
const path = require('path');
const { buildRouteManifest, verifyKernel, SEED } = require('./red-leaf-kernel');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'client', 'src', 'generated');
const OUT_TSX = path.join(OUT_DIR, 'kernel-routes.tsx');
const OUT_JSON = path.join(OUT_DIR, 'kernel-routes.manifest.json');

function escapeRegexForTs(str) {
  return str.replace(/\\/g, '\\\\');
}

function generateTsx(manifest) {
  const pages = [...new Set(manifest.map((r) => r.page))].sort();
  const imports = [
    "import { Route } from 'react-router-dom';",
    "import Layout from '../components/Layout';",
    ...pages.map((p) => `import ${p} from '../pages/${p}';`),
  ].join('\n');

  const fullscreen = manifest.filter((r) => r.layout === 'fullscreen');
  const shell = manifest.filter((r) => r.layout === 'shell');

  const fullscreenRoutes = fullscreen
    .map((r) => `      <Route path="${r.path}" element={<${r.page} />} />`)
    .join('\n');

  const shellRoutes = shell
    .map((r) => {
      if (r.end || r.path === '/') {
        return `        <Route index element={<${r.page} />} />`;
      }
      return `        <Route path="${r.path}" element={<${r.page} />} />`;
    })
    .join('\n');

  const manifestLiteral = manifest
    .map(
      (r) =>
        `  { id: '${r.id}', path: '${r.path}', page: '${r.page}', layout: '${r.layout}', label: ${JSON.stringify(r.label)}, symbol: ${JSON.stringify(r.symbol)}, branch: '${r.branch}', testHeading: '${escapeRegexForTs(r.testHeading)}', end: ${r.end} }`,
    )
    .join(',\n');

  return `/**
 * AUTO-GENERATED from Red Leaf Kernel ${SEED}
 * Source: scripts/generate-kernel-routes.js — do not edit manually.
 * Regenerate: npm run generate-routes
 */
${imports}

export interface KernelRouteEntry {
  id: string;
  path: string;
  page: string;
  layout: 'shell' | 'fullscreen';
  label: string;
  symbol: string;
  branch: string;
  testHeading: string;
  end: boolean;
}

export const KERNEL_ROUTE_MANIFEST: KernelRouteEntry[] = [
${manifestLiteral},
];

/** Route tree unfolded from 🍁 — pass directly as child of <Routes> */
export const kernelRouteElements = (
  <>
${fullscreenRoutes}
    <Route element={<Layout />}>
${shellRoutes}
    </Route>
  </>
);
`;
}

/**
 * Generate kernel route files from live unfold.
 * @param {{ dryRun?: boolean }} [options]
 */
function generateKernelRoutes(options = {}) {
  const { dryRun = false } = options;
  const verify = verifyKernel();
  if (!verify.ok) {
    const err = new Error('Kernel verification failed');
    err.code = 'KERNEL_VERIFY_FAILED';
    err.errors = verify.errors;
    throw err;
  }

  const manifest = buildRouteManifest();
  const generatedAt = new Date().toISOString();
  const tsx = generateTsx(manifest);
  const manifestDoc = {
    meta: {
      seed: SEED,
      generatedAt,
      generator: dryRun ? 'kernel-codegen.dryRun' : 'generate-kernel-routes.js',
      routeCount: manifest.length,
    },
    routes: manifest,
  };

  if (!dryRun) {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_TSX, tsx);
    fs.writeFileSync(OUT_JSON, JSON.stringify(manifestDoc, null, 2));
  }

  return {
    ok: true,
    seed: SEED,
    routeCount: manifest.length,
    fullscreenCount: manifest.filter((r) => r.layout === 'fullscreen').length,
    shellCount: manifest.filter((r) => r.layout === 'shell').length,
    generatedAt,
    dryRun,
    outputs: {
      tsx: path.relative(ROOT, OUT_TSX),
      manifest: path.relative(ROOT, OUT_JSON),
    },
    routes: manifest,
  };
}

module.exports = {
  OUT_TSX,
  OUT_JSON,
  generateKernelRoutes,
  generateTsx,
};