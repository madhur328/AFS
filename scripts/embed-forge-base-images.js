/**
 * Embed Base Layer forge images as data URLs for offline bundled HTML.
 * Usage: node scripts/embed-forge-base-images.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'client', 'public', 'forge', 'base-layer');
const OUT = path.join(ROOT, 'client', 'src', 'data', 'forge-base-layer-images.json');

const KEY_FILES = {
  anchor: 'anchor_of_stability.jpg',
  fire: 'fire_of_conviction.jpg',
  clarity: 'key_of_clarity.jpg',
  tornado: 'tornado_of_momentum.jpg',
  chain: 'chain_of_synchronization.jpg',
  helix: 'helix_of_adaptability.jpg',
};

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function main() {
  const out = {};
  for (const [key, file] of Object.entries(KEY_FILES)) {
    const filePath = path.join(SRC_DIR, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing forge image: ${filePath}`);
    }
    const buf = fs.readFileSync(filePath);
    out[key] = `data:${mimeFor(file)};base64,${buf.toString('base64')}`;
  }
  fs.writeFileSync(OUT, JSON.stringify(out));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`Embedded ${Object.keys(out).length} forge base-layer images → ${OUT} (${kb} KB)`);
}

main();