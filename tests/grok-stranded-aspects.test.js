const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { getGrokDataDir, grokDataPath } = require('../server/paths');
const { hasGrokBundle } = require('../scripts/ensure-grok-data');
const { discoverAspectNames, DOUBLE_LARIAT_SPIN_SERIES } = require('../server/services/aspect-discover');

describe('grok stranded aspects', () => {
  it('resolves grok data dir with sessions-full.json', () => {
    const dir = getGrokDataDir();
    const full = grokDataPath('sessions-full.json');
    assert.ok(fs.existsSync(full), `missing ${full} — run npm run ensure-grok-data`);
    assert.ok(hasGrokBundle(dir));
  });

  it('discovers Double Lariat spin family after grok ingest', async () => {
    const db = require('../server/db');
    await db.initDb();
    const count = db.prepare('SELECT COUNT(*) n FROM grok_sessions').get().n;
    if (count < 1) {
      console.log('skip: grok_sessions empty — run npm run sync-stranded-aspects first');
      return;
    }
    const { names } = discoverAspectNames(db);
    assert.ok(names.includes('Eternal Spin'), 'Eternal Spin should be discovered');
    assert.ok(names.includes('Double Lariat Spin'), 'Double Lariat Spin should be discovered');
    assert.ok(names.includes('Dual-Axis Eternal Spin'), 'Dual-Axis Eternal Spin should be discovered');
    for (const name of DOUBLE_LARIAT_SPIN_SERIES) {
      assert.ok(names.includes(name), `${name} should be discovered from Double Lariat EOT`);
    }
  });
});