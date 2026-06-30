const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isDiscordSnowflake,
  isApril1BundleId,
  hasApril1Anchor,
} = require('../server/journal-bundle');

describe('journal bundle id guards', () => {
  it('detects Discord snowflakes', () => {
    assert.equal(isDiscordSnowflake('1518494002096377857'), true);
    assert.equal(isDiscordSnowflake('journal-april1-2026-daily'), false);
    assert.equal(isDiscordSnowflake('local-123'), false);
  });

  it('detects April 1 bundle ids', () => {
    assert.equal(isApril1BundleId('journal-april1-2026-daily-5'), true);
    assert.equal(isApril1BundleId('journal-first-2026-04-01'), false);
  });

  it('matches Apr 1 anchor in bundled header text', () => {
    const bundled = `Date: 2026-04-01
Aspect/symbol: 📓 Daily log · Apr 1 2026
Tags: #journal #daily #april1`;
    assert.equal(hasApril1Anchor(bundled), true);
  });
});