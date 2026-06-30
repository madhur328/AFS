/**
 * Verify Red Leaf Kernel invariants — single 🍁 unfolds entire app.
 * Run: node scripts/verify-red-leaf-kernel.js
 */
const { verifyKernel, SEED } = require('../server/services/red-leaf-kernel');

const result = verifyKernel();

console.log('Red Leaf Kernel Verification');
console.log('  Seed:', SEED);
console.log('  Modules:', result.kernel.topology.nodeCount);
console.log('  Flow edges:', result.flow.edgeCount);
console.log('  Nav items:', result.nav.length);
console.log('  Routes:', result.routes.length);

if (!result.ok) {
  console.error('\nFAILED:');
  result.errors.forEach((e) => console.error('  -', e));
  process.exit(1);
}

console.log('\n✓ All invariants pass — 🍁 unfolds the system');
process.exit(0);