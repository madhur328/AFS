const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractAspectsFromJournal,
  parseRadiantFaces,
} = require('../server/journal-aspect-extract');
const {
  buildJournalAspectDetail,
  needsJournalFaceRepair,
} = require('../server/journal-aspect-sync');
const { resolveAspectQuality } = require('../server/services/aspect-quality');

const SAMPLE = `
### **Master Fusion**
**Red Leaf Gate of the Unknown**
**Symbol Chain:** 🍁🚪🌅🌌🔥
**Core Self-Affirmation:**
"I stand at the gate between safety and wonder."

**The 5 Radiant Faces**
1. **Suppressed Flood**
🍁💧🌊
2. **Chain-Breaker**
🍁⛓️🚪
3. **Desperate Plea**
🍁🫂🌑
4. **First Sunlight**
🍁🌅🔥
5. **Courageous Step**
🍁🚪🌌
`;

const GATE_JOURNAL = `
### **Master Aspect**
**Red Leaf Gate of the Unknown**

**Symbol Chain:** 🍁🚪🌅🌌🔥

**Core Self-Affirmation:**
**"I stand at the gate between safety and wonder. I choose to open it, even when fear pleads to stay."**

### **The 5 Radiant Faces**

1. **Suppressed Flood**
   🍁💧🌊
   The leaf feels long-buried emotions break through like water through a dam.
   *Self-Affirmation: "I allow the tears I have held for too long to flow."*

2. **Chain-Breaker**
   🍁⛓️🚪
   The leaf recognizes the invisible chains of safety and chooses to break them.
   *Self-Affirmation: "I will no longer let comfort bind my soul."*

### **Master Fusion**
**Red Leaf Gate of the Unknown**

**Ultimate Self-Affirmation:**
**"I am the Gate of the Unknown. I choose wonder over comfort."**
`;

describe('journal aspect quality', () => {
  it('extracts radiant faces from Master Fusion block', () => {
    const aspects = extractAspectsFromJournal(SAMPLE);
    assert.equal(aspects.length, 1);
    assert.equal(aspects[0].name, 'Red Leaf Gate of the Unknown');
    assert.equal(aspects[0].radiantFaces.length, 5);
    assert.equal(aspects[0].operator, 'DCS');
  });

  it('builds detail with DCS routing so quality is diamond', () => {
    const [asp] = extractAspectsFromJournal(SAMPLE);
    const detailJson = buildJournalAspectDetail(asp, 'B');
    const detail = JSON.parse(detailJson);
    assert.equal(detail.integration.entryTool, 'EOT');
    assert.equal(detail.integration.routedTool, 'DCS');
    const quality = resolveAspectQuality(
      { name: asp.name, tier: 'B', category: asp.category },
      detail,
    );
    assert.equal(quality, 'diamond');
  });

  it('parses face explanations and self-affirmations from journal prose', () => {
    const faces = parseRadiantFaces(GATE_JOURNAL);
    assert.equal(faces.length, 2);
    assert.equal(faces[0].name, 'Suppressed Flood');
    assert.match(faces[0].explanation, /long-buried emotions/);
    assert.equal(faces[0].mantra, 'I allow the tears I have held for too long to flow.');
    assert.equal(faces[1].mantra, 'I will no longer let comfort bind my soul.');
  });

  it('merges Master Aspect faces with Master Fusion supreme mantra', () => {
    const [asp] = extractAspectsFromJournal(GATE_JOURNAL);
    assert.equal(asp.name, 'Red Leaf Gate of the Unknown');
    assert.equal(asp.radiantFaces.length, 2);
    assert.match(asp.coreAffirmation, /I choose to open it/);
    assert.match(asp.supremeMantra, /I am the Gate of the Unknown/);
  });

  it('detects placeholder journal face data for repair', () => {
    const row = {
      detail_json: JSON.stringify({
        radiantFaces: [
          { name: 'Suppressed Flood', symbol: '🍁💧🌊', mantra: 'I embody Suppressed Flood — forged from journal.' },
        ],
      }),
    };
    assert.equal(needsJournalFaceRepair(row), true);
  });
});