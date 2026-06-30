/**
 * Export Red Leaf Kernel snapshot for static/offline client unfold.
 * Run: node scripts/export-red-leaf-kernel.js
 */
const fs = require('fs');
const path = require('path');
const {
  unfoldFromSeed,
  buildNavFromKernel,
  buildFlowGraph,
  verifyKernel,
} = require('../server/services/red-leaf-kernel');

const ROOT = path.join(__dirname, '..');
const outData = path.join(ROOT, 'data', 'red-leaf-kernel-snapshot.json');
const outClient = path.join(ROOT, 'client', 'src', 'lib', 'red-leaf-kernel-snapshot.json');

function main() {
  const verify = verifyKernel();
  if (!verify.ok) {
    console.error('Kernel verification failed:', verify.errors);
    process.exit(1);
  }

  const snapshot = {
    meta: { exportedAt: new Date().toISOString(), iteration: 4, seed: '🍁' },
    kernel: unfoldFromSeed(),
    nav: buildNavFromKernel(),
    flow: buildFlowGraph(),
    routes: require('../server/services/red-leaf-kernel').buildRouteManifest(),
  };

  const json = JSON.stringify(snapshot, null, 2);
  fs.writeFileSync(outData, json);
  fs.writeFileSync(outClient, json);
  console.log(`Red Leaf Kernel snapshot exported (${snapshot.kernel.topology.nodeCount} modules)`);
  console.log(`  ${outData}`);
  console.log(`  ${outClient}`);

  console.log('\n=== Regenerating routes from kernel ===');
  require('./generate-kernel-routes.js');
}

main();