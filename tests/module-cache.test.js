const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const kernelStore = require('../server/services/kernel-store');
const { getAspectsRegistry, getCodexGrouped } = require('../server/services/module-cache');

describe('module cache', () => {
  beforeEach(() => kernelStore.clearAll());

  it('caches aspects registry', () => {
    let n = 0;
    const builder = () => {
      n += 1;
      return [{ id: 1, name: 'Test' }];
    };
    getAspectsRegistry(builder);
    const second = getAspectsRegistry(builder);
    assert.equal(n, 1);
    assert.equal(second.hit, true);
  });

  it('caches codex grouped', () => {
    let n = 0;
    const builder = () => {
      n += 1;
      return { operators: [{ id: 1 }] };
    };
    getCodexGrouped(builder);
    getCodexGrouped(builder);
    assert.equal(n, 1);
  });
});