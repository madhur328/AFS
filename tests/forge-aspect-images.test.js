const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EMBED_OUT = path.join(ROOT, 'client', 'src', 'data', 'forge-base-layer-images.json');
const PUBLIC_DIR = path.join(ROOT, 'client', 'public', 'forge', 'base-layer');

describe('forge base-layer image embed', () => {
  it('embed script output exists with all six base keys', () => {
    assert.ok(fs.existsSync(EMBED_OUT), 'run: node scripts/embed-forge-base-images.js');
    const map = JSON.parse(fs.readFileSync(EMBED_OUT, 'utf8'));
    for (const key of ['anchor', 'fire', 'clarity', 'tornado', 'chain', 'helix']) {
      assert.match(map[key], /^data:image\/jpeg;base64,/, key);
    }
  });

  it('public forge base-layer source files exist', () => {
    const expected = [
      'anchor_of_stability.jpg',
      'fire_of_conviction.jpg',
      'key_of_clarity.jpg',
      'tornado_of_momentum.jpg',
      'chain_of_synchronization.jpg',
      'helix_of_adaptability.jpg',
    ];
    for (const file of expected) {
      assert.ok(fs.existsSync(path.join(PUBLIC_DIR, file)), file);
    }
  });
});