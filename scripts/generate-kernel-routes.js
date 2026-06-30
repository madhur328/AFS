/**
 * Generate React Router tree from Red Leaf Kernel 🍁
 * Run: node scripts/generate-kernel-routes.js
 *
 * Output:
 *   client/src/generated/kernel-routes.tsx
 *   client/src/generated/kernel-routes.manifest.json
 */
const { generateKernelRoutes } = require('../server/services/kernel-codegen');

function main() {
  try {
    const result = generateKernelRoutes();
    console.log(`Kernel routes generated from ${result.seed}`);
    console.log(
      `  ${result.routeCount} routes (${result.fullscreenCount} fullscreen, ${result.shellCount} shell)`,
    );
    console.log(`  ${result.outputs.tsx}`);
    console.log(`  ${result.outputs.manifest}`);
  } catch (err) {
    if (err.code === 'KERNEL_VERIFY_FAILED') {
      console.error('Cannot generate routes — kernel verification failed:');
      (err.errors || []).forEach((e) => console.error('  -', e));
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

main();