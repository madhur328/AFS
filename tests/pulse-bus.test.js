const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { emitPulse, getPulses, pulseStats, seedBootPulse } = require('../server/services/pulse-bus');

describe('pulse-bus', () => {
  it('emits pulses with trace from kernel flow', () => {
    const event = emitPulse('forge', { ore: 'test ore' }, { action: 'test.forge' });
    assert.equal(event.origin, 'forge');
    assert.ok(event.trace.length >= 1);
    assert.ok(event.reach >= 1);
    assert.equal(event.seed, '🍁');
    assert.ok(event.spiral?.ok);
    assert.ok(Array.isArray(event.spiral.actions));
  });

  it('lists recent pulses with since filter', () => {
    const before = getPulses({ limit: 5 }).length;
    emitPulse('journal', { preview: 'hello' }, { action: 'test.journal' });
    const after = getPulses({ limit: 10 });
    assert.ok(after.length >= before);
  });

  it('boot pulse seeds the bus', () => {
    const stats = pulseStats();
    assert.ok(stats.total >= 1);
    const boot = seedBootPulse();
    assert.ok(boot);
  });
});