const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const kernelStore = require('../server/services/kernel-store');

describe('kernel store', () => {
  beforeEach(() => kernelStore.clearAll());

  it('caches and hits module snapshots', () => {
    let built = 0;
    const builder = () => {
      built += 1;
      return { n: built };
    };
    const a = kernelStore.getOrBuild('dashboard', 'summary', builder, 60_000);
    const b = kernelStore.getOrBuild('dashboard', 'summary', builder, 60_000);
    assert.equal(a.hit, false);
    assert.equal(b.hit, true);
    assert.equal(built, 1);
  });

  it('invalidates module entries on pulse', () => {
    kernelStore.set('dashboard', 'summary', { ok: true });
    kernelStore.set('dashboard', 'goals', { ok: true });
    kernelStore.set('aspects', 'list', { ok: true });
    const n = kernelStore.invalidateModule('dashboard');
    assert.equal(n, 2);
    assert.equal(kernelStore.get('aspects', 'list')?.ok, true);
  });
});