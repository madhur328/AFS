const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../server/db');
const { buildAspectDetail } = require('../server/services/aspect-detail');
const { loadCorpusSymbols } = require('../server/services/symbols');

const JOURNAL_FACES = [
  {
    name: 'The Accused Player',
    symbol: '🍁❤️⛓️',
    mantra: 'I acknowledge my faults and still dare to ask for another chance.',
    explanation: 'The leaf plays the role of the defendant — making mistakes, pleading, and hoping for mercy.',
  },
  {
    name: 'The Judge Player',
    symbol: '🍁⚖️👁️',
    mantra: 'I have the right to judge what I can and cannot accept.',
    explanation: 'The leaf also plays the role of the judge — setting boundaries, delivering verdicts, and protecting their own heart.',
  },
];

describe('aspect detail journal face priority', () => {
  it('prefers journal-stored faces over corpus Grok faces when corpus is loaded', async () => {
    await db.initDb();
    loadCorpusSymbols();

    const aspect = {
      name: 'Red Leaf Love Trial',
      category: 'red-leaf',
      tier: 'D',
      symbol_chain: '🍁❤️⚖️🎲🪞',
      mantra: 'Love is a trial. Love is a game.',
      comprehension: 'Journal-forged aspect — EOT game-lens from #journal',
      detail_json: JSON.stringify({
        radiantFaces: JOURNAL_FACES,
        integration: { originSource: 'journal' },
      }),
    };

    const detail = buildAspectDetail(db, aspect);
    assert.equal(detail.radiantFaces[0].name, 'The Accused Player');
    assert.equal(detail.radiantFaces[1].name, 'The Judge Player');
    assert.match(detail.radiantFaces[0].explanation, /^The red leaf plays/);
    assert.equal(detail.radiantFaces[0].mantra, JOURNAL_FACES[0].mantra);
    assert.ok(!detail.radiantFaces.some((f) => f.name === 'The Accused Lover'));
  });
});