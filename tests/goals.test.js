const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  STATUSES,
  normalizeStatus,
  clampProgress,
  validateCreate,
  mergePatch,
} = require('../server/services/goals');

describe('goals service', () => {
  it('exports expected statuses', () => {
    assert.deepEqual(STATUSES, ['active', 'inactive', 'completed']);
  });

  it('normalizes status with fallback', () => {
    assert.equal(normalizeStatus('active'), 'active');
    assert.equal(normalizeStatus('bogus', 'inactive'), 'inactive');
  });

  it('clamps progress between 0 and 1', () => {
    assert.equal(clampProgress(1.5), 1);
    assert.equal(clampProgress(-0.2), 0);
    assert.equal(clampProgress(null, 0.4), 0.4);
  });

  it('validates create input', () => {
    assert.equal(validateCreate({}).error, 'title required');
    const row = validateCreate({
      title: '  Ship v1 ',
      description: 'desc',
      aspect_link: 'Cartographer',
      progress: 2,
      status: 'completed',
    });
    assert.equal(row.title, 'Ship v1');
    assert.equal(row.progress, 1);
    assert.equal(row.status, 'completed');
  });

  it('merges patch without dropping fields', () => {
    const base = {
      title: 'Old',
      description: 'd',
      target_date: '2026-07-01',
      aspect_link: 'A',
      progress: 0.2,
      status: 'active',
    };
    const merged = mergePatch(base, { title: ' New ', progress: 0.9, status: 'inactive' });
    assert.equal(merged.title, 'New');
    assert.equal(merged.progress, 0.9);
    assert.equal(merged.status, 'inactive');
    assert.equal(merged.aspect_link, 'A');
    assert.equal(merged.target_date, '2026-07-01');
  });
});