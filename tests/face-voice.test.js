const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  humanizeExplanation,
  normalizeRedLeafExplanationVoice,
  humanizeRadiantFace,
} = require('../server/services/face-voice');

const GATE_CTX = {
  aspectName: 'Red Leaf Gate of the Unknown',
  category: 'red-leaf',
  faceName: 'Suppressed Flood',
};

describe('red leaf explanation voice', () => {
  it('keeps journal "The leaf" as red leaf operator voice, not I', () => {
    const raw = 'The leaf feels long-buried emotions break through like water through a dam.';
    const out = humanizeExplanation(raw, GATE_CTX);
    assert.equal(
      out,
      'The red leaf feels long-buried emotions break through like water through a dam.'
    );
    assert.ok(!/^I feel\b/i.test(out));
  });

  it('converts This facet to The red leaf on red-leaf aspects', () => {
    const out = humanizeExplanation('This facet recognizes the invisible chains.', {
      aspectName: 'Red Leaf Gate of the Unknown',
      category: 'red-leaf',
    });
    assert.match(out, /^The red leaf recognizes/);
  });

  it('leaves self-affirmation mantra unchanged when used as mantra field', () => {
    const face = humanizeRadiantFace(
      {
        name: 'Suppressed Flood',
        symbol: '🍁💧🌊',
        mantra: 'I allow the tears I have held for too long to flow.',
        explanation: 'The leaf feels long-buried emotions break through like water through a dam.',
      },
      GATE_CTX
    );
    assert.match(face.explanation, /^The red leaf feels/);
    assert.equal(face.mantra, 'I allow the tears I have held for too long to flow.');
  });

  it('keeps Virah Queen first-person I voice', () => {
    const out = humanizeExplanation(
      'The ache is real, and I let it move through me — but I refuse to let it harden into bitterness.',
      { aspectName: 'Red Leaf Virah Queen', category: 'red-leaf', faceName: 'Silent Offering' }
    );
    assert.match(out, /^The ache is real, and I let/);
  });

  it('converts non-red-leaf This facet to I', () => {
    const out = humanizeExplanation('This facet holds the line.', {
      aspectName: 'Mind Guardian',
      category: 'meta',
    });
    assert.match(out, /^I holds|^I hold/);
  });
});