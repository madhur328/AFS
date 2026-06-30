const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  detectVersionFork,
  fingerprintFromJournalAsp,
  fingerprintFromRow,
} = require('../server/services/aspect-version-fork');

const JOURNAL_ASP = {
  name: 'Red Leaf Love Trial',
  symbol_chain: '🍁❤️⚖️🎲🪞',
  radiantFaces: [
    { name: 'The Accused Player', symbol: '🍁❤️⛓️', mantra: 'I acknowledge my faults.' },
    { name: 'The Judge Player', symbol: '🍁⚖️👁️', mantra: 'I judge what I accept.' },
  ],
};

const GROK_ROW = {
  name: 'Red Leaf Love Trial',
  symbol_chain: '🍁⚖️❤️‍🔥🕊️',
  comprehension: 'Grok origin aspect — 4 thread refs',
  detail_json: JSON.stringify({
    radiantFaces: [
      { name: 'The Accused Lover', symbol: '🍁⚖️💔', mantra: 'I acknowledge my mistakes in love.' },
      { name: 'Jealousy Sword', symbol: '🍁🗡️❤️', mantra: 'I recognize the blade in my own hand.' },
    ],
    integration: { originSource: 'master-fusion' },
  }),
};

describe('aspect version fork', () => {
  it('detects fork when journal faces differ from grok-stored aspect', () => {
    const fork = detectVersionFork(GROK_ROW, JOURNAL_ASP);
    assert.equal(fork.shouldSplit, true);
    assert.equal(fork.eternalName, 'Red Leaf Eternal Love Trial');
  });

  it('does not fork when stored row is already journal-sourced', () => {
    const journalRow = {
      ...GROK_ROW,
      comprehension: 'Journal-forged aspect — Master Fusion from #journal',
      detail_json: JSON.stringify({
        radiantFaces: JOURNAL_ASP.radiantFaces,
        integration: { originSource: 'journal' },
      }),
      symbol_chain: JOURNAL_ASP.symbol_chain,
    };
    const fork = detectVersionFork(journalRow, JOURNAL_ASP);
    assert.equal(fork.shouldSplit, false);
  });

  it('fingerprints capture symbol and face-name sets', () => {
    const j = fingerprintFromJournalAsp(JOURNAL_ASP);
    const g = fingerprintFromRow(GROK_ROW);
    assert.equal(j.symbol, '🍁❤️⚖️🎲🪞');
    assert.match(g.faces, /accused lover/);
    assert.notEqual(j.faces, g.faces);
  });
});