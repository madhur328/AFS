const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  looksLikeContinuation,
  aspectKeysMatch,
  isPromptLine,
  isResponseLine,
} = require('../server/journal-smart-club');

describe('journal smart-club continuation', () => {
  const posted = '2026-06-20T08:00:00.000Z';

  it('merges Prompt → Response in same forge session', () => {
    const prev = {
      content: '**Prompt**: Apply RDTQ to the image',
      posted_at: posted,
      attachments: [],
    };
    const next = {
      content: '**Response:****✅ RDTQ Applied: Between the Visible and the Invisible**',
      posted_at: '2026-06-20T08:01:00.000Z',
      attachments: [],
    };
    assert.equal(looksLikeContinuation(prev, next), true);
  });

  it('merges Response → Master Fusion block', () => {
    const prev = {
      content: '**Response:****✅ RDTQ Applied**',
      posted_at: posted,
      attachments: [],
    };
    const next = {
      content: '---\n\n### **Master Fusion**\n**Red Leaf Threshold Guardian**',
      posted_at: '2026-06-20T08:02:00.000Z',
      attachments: [],
    };
    assert.equal(looksLikeContinuation(prev, next), true);
  });

  it('merges forge block → yes visual follow-up', () => {
    const prev = {
      content: '### **Master Fusion**\n**Red Leaf Threshold Guardian**\n**Symbol Chain:** 🍁🌌',
      posted_at: posted,
      attachments: [],
    };
    const next = {
      content: '**Propmpt2:** yes, visual image please',
      posted_at: '2026-06-20T08:03:00.000Z',
      attachments: [],
    };
    assert.equal(looksLikeContinuation(prev, next), true);
  });

  it('detects prompt/response line helpers', () => {
    assert.equal(isPromptLine('**Prompt**: foo'), true);
    assert.equal(isPromptLine('**Propmpt2:** yes'), true);
    assert.equal(isResponseLine('**Response2:****✅ Visual**'), true);
  });

  it('merges Master Aspect + Master Fusion when subtitle differs (Akahitoha no Saiban)', () => {
    const prev = {
      content: `**✅ Converted to Symbolic Chain Format**

### **Master Aspect**
**Red Leaf Akahitoha no Saiban (The Trial of the Single Red Leaf)**

**Symbol Chain:** 🍁❤️⚖️🍂🪞`,
      posted_at: '2026-06-26T00:53:37.706Z',
      attachments: [],
    };
    const next = {
      content: `---

### **Master Fusion**
**Red Leaf Akahitoha no Saiban**

**Symbol Chain:** 🍁❤️⚖️🍂🪞♾️`,
      posted_at: '2026-06-26T00:53:40.810Z',
      attachments: [],
    };
    assert.equal(aspectKeysMatch(
      'red leaf akahitoha no saiban (the trial of the single red leaf)',
      'red leaf akahitoha no saiban'
    ), true);
    assert.equal(looksLikeContinuation(prev, next), true);
  });

  it('does not merge separate forged aspects in the same session window', () => {
    const prev = {
      content: '**✅ EOT Applied: "恋愛裁判 (Ren\'ai Saiban) / Love Trial"**\n### **Master Fusion**\n**Red Leaf Love Trial**',
      posted_at: '2026-06-25T03:36:52.838Z',
      attachments: [],
    };
    const next = {
      content: '**✅ EOT Applied: "紅一葉 (Akahitoha) / A Single Red Leaf"**\n### **Master Fusion**\n**Red Leaf Akahitoha (Single Red Leaf)**',
      posted_at: '2026-06-25T03:38:03.311Z',
      attachments: [],
    };
    assert.equal(looksLikeContinuation(prev, next), false);
  });

  it('does not merge separate April 1 bundled daily entries', () => {
    const header = 'Date: 2026-04-01\nAspect/symbol: 📓 Daily log\nTags: #journal #daily #april1\n\n';
    const prev = {
      id: 'journal-april1-2026-daily',
      content: `${header}Session A`,
      posted_at: '2026-04-01T09:00:00.000Z',
      attachments: [],
    };
    const next = {
      id: 'journal-april1-2026-daily-2',
      content: `${header}Session B`,
      posted_at: '2026-04-01T09:00:00.000Z',
      attachments: [],
    };
    assert.equal(looksLikeContinuation(prev, next), false);
  });
});

describe('discord insight dedup tag', () => {
  it('uses stable discord_msg tag', () => {
    const { discordMsgInsightTag } = require('../server/discord');
    assert.equal(discordMsgInsightTag('1518494002096377857'), 'discord_msg:1518494002096377857');
  });
});