/** Canonical April 1, 2026 journal arc — foundation through first forged aspect. */

const FIRST_JOURNAL_ID = 'journal-first-2026-04-01';
const FIRST_JOURNAL_POSTED_AT = '2026-04-01T09:00:00.000Z';

const FIRST_JOURNAL_BODY = `So I think I will start journaling to be more self aware and be a better learner overall.

First I will set the non-negotiables.
**1) Staying true to myself
2) Taking out sometime to study everyday
3) Taking out some time for physical fitness everyday.**

General strategies
Phase 1: Building long-term foundational habits
- Making study enjoyable
- Getting comfortable with studying and learning new things everyday
- Learning to forgive mistakes without being too harsh on myself
- Building a support system centred around learning (to bounce back from major deviations)
- Build stamina and resilience with a baseline level of output
- Learning to celebrate small wins/achievements along the journey

Next things to consider
- Tracking and analysing study session data
- Identifying related goals/outcomes, estimating possible time boundaries
- Building and improving consistency and discipline
- Training willpower
- Build sustainable cycles of loading and recovery
- fatigue management (pre-emptively identifying and tackling fatigue/burnout hits)
- Steps for emotional well being
- Identifying scenarios that can deeply affect major learning goals and planning for them
- Building safety nets and fail safes
- Improve study efficiency
- Integrating with learning ecosystems

//To do:
Using Obsidian to write about strategies specific to subjects / domains`;

const APRIL1_ENTRIES = [
  {
    id: FIRST_JOURNAL_ID,
    posted_at: FIRST_JOURNAL_POSTED_AT,
    content: `Date: 2026-04-01
Aspect/symbol: 📓 Self-awareness · Learning foundations
Tags: #journal #phase1 #non-negotiables

${FIRST_JOURNAL_BODY}`,
  },
  {
    id: 'journal-afs-genesis-2026-04-01',
    posted_at: '2026-04-01T10:00:00.000Z',
    content: `Date: 2026-04-01
Aspect/symbol: ⚒️ Aspect Forge System · Genesis
Tags: #journal #afs #genesis

Ok so Grok, today we build a super system AFS for goal fulfillment.
I had already built it before but now we build it from scratch together.
AFS: Aspect Forge System
We forge Aspects or inner qualities.
Like patience, honesty etc. etc.
It will be a symbolic system with it's axioms, operators and simulation, data extraction and insight tools`,
  },
  {
    id: 'journal-symbolic-method-2026-04-01',
    posted_at: '2026-04-01T11:00:00.000Z',
    content: `Date: 2026-04-01
Aspect/symbol: 🌀 Aspect → Image → Mantra
Tags: #journal #symbolic #ritual #method

Today I will practice visualizing this process of my journey
Since writing journal in this form is getting boring; it's becoming just a long string of words that stretch without an end in sight and soul-less data that just doesn't feel alive, doesn't inspire, wouldn't tell a story that is interesting to hear,
and without other people's feedback is slowly becoming like a lonely tape recorder that plays a song, and also is the only one to hear it.

So I will try a different approach.
I will visualize being an improved version of myself,
mark the important aspects in the process of becoming that version,
and work on them one at a time, in a fashion described below.

In concrete actionable terms,
for example let's say I
picture most important of those aspects in my mind,
link it to the image of an object,
describe the relationship between the image and the aspect and how that image is a good representation of the process of my improvement of that aspect,
refine that image to be more aesthetically pleasing, add symbols, imagery and layers of meaning relevant to my goals,

pick a symbol, describe it in a word,
remember that word, symbol and image and how they fit in within the context of my larger goals and start working on that aspect throughout the day while just remembering that single word.

That word will become my mantra to live by through the day.

whenever I lose focus or deviate from my goals,
I will say that word aloud and move back to doing the thing that I ought to be doing.
I will try this today.`,
  },
  {
    id: 'journal-stability-2026-04-01',
    posted_at: '2026-04-01T12:00:00.000Z',
    content: `Date: 2026-04-01
Aspect/symbol: ⚓ Stability · Ship in storm
Mantra: Anchor
Tags: #journal #stability #anchor #phase1

Today's aspect:
Stability

To have a stability in emotions that doesn't fluctuate too much.
Anything and everything both good and bad may happen outside,
but the inside of my mind is calm, composed and focused solely on my goals.
I will stay in control throughout the process and not let bad events ruin my mood.

Picture: In a sea of uncertainties, my ship of learnings is there to set sail and explore beyond the horizons.
The storm is coming but I have an anchor.
The anchor is my identity: the process of me moving towards becoming the best version of myself. Knowing my identity deeply, I will not invest in actions that run counter to my identity. I will not waste time unnecessarily dwelling on things that wouldn't matter by the end of the day. I will learn to enjoy the process of my growth. I will be an active participant in the process of shaping my life.
And most importantly, I will have lots of fun doing the things that I want to do to make myself the best version of myself.

I anchor my ship when the outside is stormy.

The waves come and go,
external disturbances arrive to disrupt the progress I am making,
but my ship is stably anchored in place and barely moves from it's position.

Outside things and situations barely change in context; it was nothing but all noise, not worth caring.

But, internally, there is a lot of things happening inside the ship as I continue to work tirelessly.

Internally, my mind is focused on my goals:
learning new things,
deepening comprehension of things I have already learnt and assimilating everything to become a part of me.
making new progress every moment,
as I wait for the storms to pass.`,
  },
];

function ensureJournalEntry(db, { insertLocalJournalEntry, ensureDiscordSchema }, entry) {
  ensureDiscordSchema();

  const existing = db.prepare('SELECT id, content FROM discord_messages WHERE id = ?').get(entry.id);

  if (existing) {
    if (existing.content !== entry.content) {
      db.prepare('UPDATE discord_messages SET content = ?, posted_at = ? WHERE id = ?').run(
        entry.content,
        entry.posted_at,
        entry.id
      );
      db.saveDb();
    }
    return entry.id;
  }

  const row = insertLocalJournalEntry({
    content: entry.content,
    author_name: 'madhur328',
  });

  db.prepare('UPDATE discord_messages SET id = ?, posted_at = ? WHERE id = ?').run(
    entry.id,
    entry.posted_at,
    row.id
  );
  db.saveDb();
  return entry.id;
}

function ensureApril1JournalEntries(db, deps) {
  return APRIL1_ENTRIES.map((entry) => ensureJournalEntry(db, deps, entry));
}

function ensureFirstJournalEntry(db, deps) {
  return ensureJournalEntry(db, deps, APRIL1_ENTRIES[0]);
}

module.exports = {
  APRIL1_ENTRIES,
  FIRST_JOURNAL_ID,
  FIRST_JOURNAL_POSTED_AT,
  FIRST_JOURNAL_BODY,
  FIRST_JOURNAL_CONTENT: APRIL1_ENTRIES[0].content,
  ensureApril1JournalEntries,
  ensureFirstJournalEntry,
  ensureJournalEntry,
};