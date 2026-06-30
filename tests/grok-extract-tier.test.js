const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractFromTextForAspect } = require('../server/services/grok-extract');

const RCS_BLOCK = `✅ Resonant Chrysalis Synthesis (RCS) Applied on "Love Trial"

Master Aspect: Red Leaf Love Trial

Symbol: 🍁⚖️❤️‍🔥🕊️
Mantra: "Love is a trial. I will face it with honesty, take responsibility, and seek true understanding instead of victory."

The Diamond's Radiant Faces
The Accused Lover
Symbol: 🍁⚖️💔
Mantra: "I acknowledge my mistakes in love without defensiveness."
Jealousy Sword
Symbol: 🍁🗡️❤️
Mantra: "When love turns into a weapon, I recognize the blade in my own hand."

Master Fusion: Red Leaf Eternal Love Trial

Ultimate Symbol: 🍁⚖️❤️‍🔥♾️🕊️
Supreme Mantra:

"Love is a trial, and I stand before it willingly.
I have committed crimes of the heart — jealousy, clinging, unrealistic demands, and fearful betrayal."`;

describe('grok extract tier separation', () => {
  it('base Love Trial does not inherit Eternal Master Fusion supreme mantra', () => {
    const base = extractFromTextForAspect(RCS_BLOCK, 'Red Leaf Love Trial');
    assert.ok(base);
    assert.match(base.coreAffirmation || '', /seek true understanding instead of victory/i);
    assert.doesNotMatch(base.supremeMantra || '', /stand before it willingly/i);
    assert.equal(base.radiantFaces?.[0]?.name, 'The Accused Lover');
  });

  it('Eternal Love Trial picks up Master Fusion supreme mantra', () => {
    const eternal = extractFromTextForAspect(RCS_BLOCK, 'Red Leaf Eternal Love Trial');
    assert.ok(eternal);
    assert.match(eternal.supremeMantra || '', /stand before it willingly/i);
    assert.equal(eternal.symbolChain, '🍁⚖️❤️‍🔥♾️🕊️');
  });
});