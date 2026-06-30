const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const kernelStore = require('../server/services/kernel-store');
const { propagateSpiral, bootHandlers, resetSpiralStats } = require('../server/services/kernel-spiral');
const { emitPulse } = require('../server/services/pulse-bus');

describe('kernel spiral', () => {
  before(() => {
    kernelStore.clearAll();
    resetSpiralStats();
    bootHandlers();
  });

  it('propagates spiral actions on journal pulse', () => {
    kernelStore.set('dashboard', 'summary', { test: true });
    const event = emitPulse('journal', { preview: 'forge log' }, { action: 'test.journal' });
    assert.ok(event.spiral?.ok);
    assert.ok(event.spiral.actions.length >= 1);
    assert.equal(kernelStore.get('dashboard', 'summary'), null);
  });

  it('reports spiral telemetry', () => {
    const { spiralTelemetry } = require('../server/services/kernel-spiral');
    const t = spiralTelemetry();
    assert.ok(t.iteration >= 5);
    assert.ok(t.pulsesHandled >= 1);
    assert.ok(t.handlerModules >= 10);
  });
});