const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { generateKernelRoutes, OUT_JSON, OUT_TSX } = require('../server/services/kernel-codegen');

describe('kernel codegen', () => {
  it('dry run returns manifest without writing files', () => {
    const beforeTsx = fs.readFileSync(OUT_TSX, 'utf8');
    const beforeJson = fs.readFileSync(OUT_JSON, 'utf8');
    const result = generateKernelRoutes({ dryRun: true });
    assert.equal(result.ok, true);
    assert.ok(result.routeCount >= 18);
    assert.equal(result.dryRun, true);
    assert.equal(fs.readFileSync(OUT_TSX, 'utf8'), beforeTsx);
    assert.equal(fs.readFileSync(OUT_JSON, 'utf8'), beforeJson);
  });

  it('writes synced manifest on live generate', () => {
    const result = generateKernelRoutes();
    assert.equal(result.ok, true);
    const manifest = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    assert.equal(manifest.routes.length, result.routeCount);
    assert.ok(fs.readFileSync(OUT_TSX, 'utf8').includes('AUTO-GENERATED from Red Leaf Kernel'));
  });
});