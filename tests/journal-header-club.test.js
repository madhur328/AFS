const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractSessionHeading,
  sessionHeadingLabel,
  isSummaryBlock,
  groupJournalByHeading,
  stripHeadingLines,
} = require('../server/journal-smart-club');

describe('journal header clubbing', () => {
  const discordRows = [
    {
      id: '1517624298150432878',
      content: 'So I think I will start journaling to be more self aware and be a better learner overall.',
      posted_at: '2026-06-19T20:17:08.775Z',
      channel_name: 'journal',
      attachments: [],
    },
    {
      id: '1517676471953657856',
      content: "**Apr1 2026** It's been 1 month since I decided to do productive study",
      posted_at: '2026-06-19T23:44:27.979Z',
      channel_name: 'journal',
      attachments: [],
    },
    {
      id: '1517676540115025991',
      content: '7 am: light physical activity  I will go for cycling today',
      posted_at: '2026-06-19T23:44:44.230Z',
      channel_name: 'journal',
      attachments: [],
    },
    {
      id: '1517676568640749751',
      content: '7-8 cycling 8-10 daily routine activities + meditation',
      posted_at: '2026-06-19T23:44:51.031Z',
      channel_name: 'journal',
      attachments: [],
    },
    {
      id: '1517676602639650886',
      content: '10-11:15 focused study, then light walk, more study',
      posted_at: '2026-06-19T23:44:59.137Z',
      channel_name: 'journal',
      attachments: [],
    },
    {
      id: '1517676637838114856',
      content: '**Apr1 2026** Total study time: 6:30 hours productivity rating 6/10',
      posted_at: '2026-06-19T23:45:07.529Z',
      channel_name: 'journal',
      attachments: [],
    },
  ];

  it('extracts bold and markdown headings', () => {
    assert.equal(extractSessionHeading('**Apr1 2026** daily log'), 'Apr1 2026');
    assert.equal(extractSessionHeading('### **Master Fusion**\nBody'), 'Master Fusion');
    assert.equal(extractSessionHeading('plain text only'), null);
  });

  it('detects summary blocks', () => {
    assert.equal(isSummaryBlock('Total study time: 6:30 hours'), true);
    assert.equal(isSummaryBlock('focused study block'), false);
  });

  it('groups six Discord fragments into three heading sessions', () => {
    const groups = groupJournalByHeading(discordRows);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].parts.length, 1);
    assert.equal(groups[1].parts.length, 4);
    assert.equal(groups[1].heading, 'Apr 1 2026 · Daily log');
    assert.equal(groups[2].parts.length, 1);
    assert.equal(groups[2].heading, 'Apr 1 2026 · Daily metrics');
  });

  it('strips duplicate heading lines before merge', () => {
    const stripped = stripHeadingLines("**Apr1 2026**\n\nDaily body");
    assert.equal(stripped, 'Daily body');
  });

  it('labels summary sessions distinctly', () => {
    const label = sessionHeadingLabel(discordRows[5]);
    assert.equal(label, 'Apr 1 2026 · Daily metrics');
  });
});