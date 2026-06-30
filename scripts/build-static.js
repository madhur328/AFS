/**
 * Full static HTML build — desktop + mobile single-file bundles.
 *
 *   node scripts/build-static.js           → both HTML files
 *   node scripts/build-static.js --desktop → afs-platform-static.html only
 *   node scripts/build-static.js --mobile  → afs-platform-static-mobile.html only
 *
 * Steps: fix axioms → export DB → Vite static build → bundle HTML
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EXPORT_PATH = path.join(ROOT, 'data', 'static-export.json');
const { ensureEntheaInstalled } = require('../server/services/afs-videos');

const args = new Set(process.argv.slice(2));
const desktopOnly = args.has('--desktop');
const mobileOnly = args.has('--mobile');
const buildDesktop = desktopOnly || (!desktopOnly && !mobileOnly);
const buildMobile = mobileOnly || (!desktopOnly && !mobileOnly);

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
}

function verifyExport() {
  if (!fs.existsSync(EXPORT_PATH)) {
    throw new Error(`Missing export: ${EXPORT_PATH}`);
  }
  const snapshot = JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'));
  const axiomCount = snapshot.axioms?.length ?? 0;
  if (axiomCount < 2) {
    throw new Error(`Export has ${axiomCount} axioms — expected 2 canonical spiral axioms`);
  }
  const journalCount = snapshot.journalEntries?.length ?? 0;
  if (journalCount < 1) {
    throw new Error('Export has no journal entries — run journal-sync or ensure April 1 entries');
  }
  const loreRows = snapshot.lore || [];
  const loreExpected = loreRows.filter((e) => e.has_image).length;
  const loreEmbedded = loreRows.filter((e) => e.image_data_url).length;
  if (loreExpected > 0 && loreEmbedded < loreExpected) {
    throw new Error(
      `Export has ${loreExpected} lore images but only ${loreEmbedded} embedded as data URLs`
    );
  }
  if (!snapshot.redLeafKernel?.kernel?.seed) {
    throw new Error('Export missing redLeafKernel — run export-red-leaf-kernel before static build');
  }
  if (!Array.isArray(snapshot.pulses)) {
    throw new Error('Export missing pulses array for offline pulse feed');
  }
  console.log(
    `  verified: ${axiomCount} axioms, ${snapshot.aspects?.length ?? 0} aspects, ${journalCount} journal entries, ${loreEmbedded} lore images, 🍁 kernel + ${snapshot.pulses.length} pulses`
  );
  return snapshot;
}

function main() {
  console.log('=== Step 0: Unfold 🍁 kernel + codegen routes ===');
  run('node scripts/export-red-leaf-kernel.js');

  console.log('\n=== Step 1: Ensure canonical axioms in DB ===');
  run('node scripts/fix-axioms.js');

  console.log('\n=== Step 2: Ensure ENTHEA binary beside static HTML ===');
  const enthea = ensureEntheaInstalled();
  console.log(`  enthea-rs.exe: ${enthea.action} (${enthea.path})`);

  console.log('\n=== Step 3: Export database snapshot ===');
  run('node scripts/export-static-data.js');
  verifyExport();

  console.log('\n=== Step 4: Build static client (Vite IIFE) ===');
  run('npm run build:static --prefix client');

  if (buildDesktop) {
    console.log('\n=== Step 5: Bundle desktop HTML ===');
    run('node scripts/bundle-static-html.js');
  }

  if (buildMobile) {
    console.log('\n=== Step 6: Bundle mobile HTML ===');
    run('node scripts/bundle-static-html.js --mobile');
  }

  console.log('\nDone.');
  if (buildDesktop) console.log('  Desktop: afs-platform-static.html');
  if (buildMobile) console.log('  Mobile:  afs-platform-static-mobile.html');
}

main();