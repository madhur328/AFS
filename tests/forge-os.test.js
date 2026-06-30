const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../server/db');
const {
  getMythologies,
  getBaseAspectCatalog,
  getGodTierAspects,
  runBaseReflection,
  runSynthesis,
  runDcsWithMythology,
  buildSave8ExportBlock,
} = require('../server/services/forge-os');

describe('forge-os integration', () => {
  before(async () => {
    await db.initDb();
  });

  it('loads mythology ore catalog', () => {
    const myths = getMythologies();
    assert.ok(myths.length >= 5);
    assert.equal(myths[0].id, 'rome_song');
  });

  it('lists six canonical base aspects with deep metadata', () => {
    const catalog = getBaseAspectCatalog();
    assert.equal(catalog.length, 6);
    const anchor = catalog.find((a) => a.key === 'anchor');
    assert.ok(anchor);
    assert.ok(anchor.deepInsight);
    assert.ok(anchor.imageUrl);
    assert.match(anchor.imageUrl, /lore-anchor-ship-storm/);
    assert.equal(anchor.geometry, 'sphere');
  });

  it('returns god-tier directory and institutions', () => {
    const gt = getGodTierAspects(db);
    assert.ok(gt.directory.length >= 8);
    assert.ok(gt.institutions.length >= 3);
    assert.equal(gt.directory[0].id, 'fallen_valkyrie');
  });

  it('forges reflection and bumps proficiency track', () => {
    const result = runBaseReflection(db, {
      aspectKey: 'anchor',
      reflection: 'I held the line through doubt today.',
      intensity: 0.7,
    });
    assert.equal(result.protocol, 'REFLECT');
    assert.ok(result.mastery.gain > 0);
    assert.match(result.output, /Anchor of Stability/);
    assert.ok(result.deepInsight);
    assert.match(result.insight, /chains|wings|keel/i);
  });

  it('synthesizes two base aspects', () => {
    const result = runSynthesis(db, {
      aspectKeys: ['fire', 'clarity'],
      reflection: 'Passion with clear sight.',
    });
    assert.equal(result.protocol, 'SYNTHESIS');
    assert.equal(result.aspectKeys.length, 2);
    assert.match(result.output, /Synthesis law/);
  });

  it('runs DCS with mythology ore and radiant faces', () => {
    const result = runDcsWithMythology(db, {
      mythologyId: 'phoenix_hammer',
      directive: 'Keep hammering through the night.',
      sourceAspectKeys: ['fire'],
    });
    assert.equal(result.protocol, 'DCS');
    assert.equal(result.radiantFaces.length, 5);
    assert.match(result.masterAspect.name, /Phoenix Hammer/);
    assert.match(result.output, /Diamond Chrysalis/);
  });

  it('builds Save8 export block', () => {
    const block = buildSave8ExportBlock(db);
    assert.match(block, /Save8/);
    assert.match(block, /Gödel/);
  });
});