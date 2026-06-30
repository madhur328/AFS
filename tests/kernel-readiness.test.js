const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const pulseBus = require('../server/services/pulse-bus');
const { assessKernelReadiness, UNFOLD_BUDGET_BYTES } = require('../server/services/kernel-readiness');
const { unfoldFromSeed } = require('../server/services/red-leaf-kernel');

describe('kernel readiness', () => {
  it('unfold stays within memory budget', () => {
    const bytes = Buffer.byteLength(JSON.stringify(unfoldFromSeed()), 'utf8');
    assert.ok(bytes <= UNFOLD_BUDGET_BYTES, `unfold ${bytes}B exceeds ${UNFOLD_BUDGET_BYTES}B`);
  });

  it('assesses observability separately from generation', () => {
    const result = assessKernelReadiness(pulseBus);
    assert.equal(typeof result.observabilityReady, 'boolean');
    assert.equal(typeof result.generationReady, 'boolean');
    assert.ok(result.requirements.length >= 6);
    const runtimeReq = result.requirements.find((r) => r.id === 'runtime-flag');
    assert.ok(runtimeReq, 'runtime-flag requirement present');
    assert.equal(typeof runtimeReq.pass, 'boolean');
    assert.ok(result.strategy.phases.some((p) => p.id === 'runtime-generation'));
  });
});