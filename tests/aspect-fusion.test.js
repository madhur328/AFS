const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAspectFusion,
  buildAspectFusionFromJournal,
  parseFusionAffirmationAfterFusionHeader,
  extractDebabelizedEssence,
  resolveAspectFusion,
} = require('../server/services/aspect-fusion');

const GROK_BLOCK = `Debabelized Core Essence

Love is a courtroom.
Both the lover and the beloved are guilty.

Master Aspect: Red Leaf Eternal Love Trial

The Diamond's Radiant Faces
The Accused Lover
Symbol: 🍁⚖️💔
Mantra: "I acknowledge my mistakes in love without defensiveness."

Master Fusion: Red Leaf Eternal Love Trial

Ultimate Symbol: 🍁⚖️❤️‍🔥♾️🕊️
Supreme Mantra:

"Love is a trial, and I stand before it willingly.
I have committed crimes of the heart — jealousy, clinging, unrealistic demands, and fearful betrayal.
I will leave the courtroom wiser, gentler, and more mature."`;

const JOURNAL_ASP = {
  name: 'Red Leaf Love Trial',
  symbol_chain: '🍁❤️⚖️🎲🪞',
  coreAffirmation: 'Love is a trial. Love is a game.',
  supremeMantra: 'Love is a trial. Love is a game between two imperfect players.\nI plead, I judge, I make mistakes.',
  radiantFaces: [
    { name: 'The Accused Player', symbol: '🍁❤️⛓️', mantra: 'I acknowledge my faults.' },
  ],
};

describe('aspect fusion model', () => {
  it('parses multiline Supreme Mantra from Grok Master Fusion block', () => {
    const affirmation = parseFusionAffirmationAfterFusionHeader(
      GROK_BLOCK,
      'Red Leaf Eternal Love Trial'
    );
    assert.match(affirmation, /stand before it willingly/i);
    assert.match(affirmation, /leave the courtroom wiser/i);
  });

  it('extracts debabelized essence prose', () => {
    const essence = extractDebabelizedEssence(GROK_BLOCK, 'Red Leaf Eternal Love Trial');
    assert.match(essence, /Love is a courtroom/i);
    assert.match(essence, /both.*guilty/i);
  });

  it('builds journal fusion with affirmation seal', () => {
    const fusion = buildAspectFusionFromJournal(JOURNAL_ASP, { handle: '@madhur328', title: 'Aspect Forger' });
    assert.ok(fusion);
    assert.equal(fusion.name, 'Red Leaf Love Trial');
    assert.equal(fusion.originSource, 'journal-fusion');
    assert.match(fusion.affirmation, /two imperfect players/i);
    assert.match(fusion.identity, /@madhur328/);
  });

  it('resolveAspectFusion prefers stored aspectFusion', () => {
    const aspect = { name: 'Test Aspect', symbol_chain: '🍁💎', category: 'red-leaf' };
    const stored = {
      aspectFusion: buildAspectFusion({
        name: 'Test Aspect',
        identity: 'Identity fused.',
        affirmation: 'I am the fused seal.',
        symbolChain: '🍁💎',
        originSource: 'master-fusion',
      }),
    };
    const fusion = resolveAspectFusion(aspect, stored, {});
    assert.equal(fusion.affirmation, 'I am the fused seal.');
  });
});