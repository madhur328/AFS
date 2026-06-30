/**
 * Smart-sync journal clubbing — group Discord fragments by bold heading / markdown header.
 */
const db = require('./db');
const {
  ensureDiscordSchema,
  mergeJournalEntries,
  mergeJournalGroup,
  listJournalMessages,
  purgeSyntheticJournalEntries,
  titleFromContent,
  isDiscordSnowflakeId,
} = require('./discord');

const MAX_GAP_MS = 45 * 60 * 1000;
const HEADING_GAP_MS = 2 * 60 * 60 * 1000;
const DISCORD_SOFT_LIMIT = 1900;

function normalizeHeading(text) {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isSummaryBlock(content) {
  return /Total study time:/i.test(content || '');
}

function extractSessionHeading(content) {
  const text = content || '';
  let match = text.match(/^#{1,3}\s+\*\*([^*]+)\*\*/m);
  if (match) return match[1].trim();

  match = text.match(/^\s*\*{2}([^*\n]+)\*{2}\s*$/m);
  if (match) {
    const heading = match[1].trim();
    if (/^(?:Prompt|Propmpt|Response)\d*/i.test(heading)) return null;
    return heading;
  }

  match = text.match(/^\s*\*{2}(Apr\s*1\s*2026)\*{2}/im);
  if (match) return match[1].replace(/\s+/g, ' ').trim();

  return null;
}

function stripHeadingLines(content) {
  return (content || '')
    .replace(/^\s*\*{2}Apr\s*1\s*2026\*{2}\s*\n?/gim, '')
    .replace(/^\s*\*{2}[^*\n]+\*{2}\s*$/gm, '')
    .replace(/^#{1,3}\s+\*\*[^*]+\*\*\s*\n?/gm, '')
    .trim();
}

function sessionHeadingLabel(row) {
  const raw = extractSessionHeading(row.content);
  if (raw && isSummaryBlock(row.content)) {
    return `${raw.replace(/Apr\s*1\s*2026/i, 'Apr 1 2026')} · Daily metrics`;
  }
  if (raw && /Apr\s*1\s*2026/i.test(raw)) return 'Apr 1 2026 · Daily log';
  if (raw) return raw;
  return titleFromContent(row.content, row.channel_name, row.attachments || []);
}

function startsNewHeadingSession(row, current) {
  const heading = extractSessionHeading(row.content);
  if (isSummaryBlock(row.content)) return true;
  if (!heading || !current) return !!heading;

  const prevHeading = normalizeHeading(current.heading);
  const nextHeading = normalizeHeading(heading);
  if (prevHeading && nextHeading === prevHeading) return false;
  return true;
}

function splitDailyAndSummary(group) {
  const dailyParts = group.parts.filter((part) => !isSummaryBlock(part.content));
  const summaryParts = group.parts.filter((part) => isSummaryBlock(part.content));
  if (!dailyParts.length || !summaryParts.length) return [group];

  const groups = [
    {
      ...group,
      anchor: dailyParts[0],
      parts: dailyParts,
      heading: group.heading.includes('Daily metrics') ? 'Apr 1 2026 · Daily log' : group.heading,
    },
  ];

  for (const part of summaryParts) {
    groups.push({
      anchor: part,
      parts: [part],
      heading: sessionHeadingLabel(part),
      last_at: part.posted_at,
    });
  }
  return groups;
}

function groupJournalByHeading(rows) {
  const groups = [];
  let current = null;

  for (const row of rows) {
    const gapMs = current
      ? new Date(row.posted_at) - new Date(current.last_at || current.anchor.posted_at)
      : 0;
    const gapOk = !current || gapMs <= HEADING_GAP_MS;
    const newSession = !current || !gapOk || startsNewHeadingSession(row, current);

    if (newSession) {
      if (current) groups.push(current);
      current = {
        anchor: row,
        parts: [row],
        heading: sessionHeadingLabel(row),
        last_at: row.posted_at,
      };
      continue;
    }

    current.parts.push(row);
    current.last_at = row.posted_at;
  }
  if (current) groups.push(current);

  return groups.flatMap(splitDailyAndSummary);
}

function clubJournalByHeading({ channel = 'journal' } = {}) {
  ensureDiscordSchema();
  const rows = listJournalMessages({ channel, limit: 200 })
    .filter((row) => isDiscordSnowflakeId(row.id))
    .sort((a, b) => new Date(a.posted_at) - new Date(b.posted_at));

  const groups = groupJournalByHeading(rows);
  let clubs = 0;
  const mergedGroups = [];

  for (const group of groups) {
    if (group.parts.length <= 1) {
      const part = group.parts[0];
      const needsHeader =
        (extractSessionHeading(part.content) || isSummaryBlock(part.content))
        && !/^\s*##\s+\*\*/.test(part.content || '');
      if (needsHeader) {
        const { updateJournalEntry } = require('./discord');
        const body = stripHeadingLines(part.content);
        updateJournalEntry(part.id, {
          content: `## **${group.heading}**\n\n${body}`.trim(),
        });
      }
      mergedGroups.push({
        id: group.anchor.id,
        heading: group.heading,
        parts: 1,
      });
      continue;
    }

    const bodies = group.parts.map((part) => stripHeadingLines(part.content)).filter(Boolean);
    const merged = mergeJournalGroup(
      group.parts.map((part) => part.id),
      { heading: group.heading, bodyParts: bodies }
    );
    clubs += group.parts.length - 1;
    mergedGroups.push({
      id: merged.id,
      heading: group.heading,
      parts: group.parts.length,
    });
  }

  db.saveDb();
  return {
    clubs,
    groups: mergedGroups.length,
    headings: mergedGroups.map((g) => g.heading),
    remaining: mergedGroups.length,
    channel,
  };
}

function normalizeAspectKey(name) {
  if (!name) return null;
  return name
    .split('(')[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function aspectKeysMatch(prevKey, nextKey) {
  if (!prevKey || !nextKey) return false;
  const a = normalizeAspectKey(prevKey);
  const b = normalizeAspectKey(nextKey);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.startsWith(b) || b.startsWith(a);
}

function aspectKeyFromContent(content) {
  const { extractAspectsFromJournal } = require('./journal-aspect-extract');
  const aspects = extractAspectsFromJournal(content || '');
  if (aspects[0]?.name) return aspects[0].name.toLowerCase();
  const match = (content || '').match(/\*\*([A-Z][A-Za-z0-9\s–—-]{4,70})\*\*/);
  const name = match?.[1]?.trim();
  if (!name || /^(Response|Prompt|Master Fusion|Master Aspect)/i.test(name)) return null;
  return name.toLowerCase();
}

function isPromptLine(text) {
  return /^\*{0,2}\s*(?:Prompt|Propmpt)\d*:?\s*\*{0,2}/i.test(text);
}

function isResponseLine(text) {
  return /^\*{0,2}\s*Response\d*:?\s*\*{0,2}/i.test(text);
}

function isForgeBlock(text) {
  return /Master\s+(?:Fusion|Aspect)|Symbol Chain:|EOT Applied|RDTQ Applied|DCS Applied|RCS Applied/i.test(text);
}

function isBundledJournalEntry(row) {
  return /^journal-/.test(String(row?.id || ''));
}

function isCompleteDailyBundle(text) {
  return /^Date:\s*\d{4}-\d{2}-\d{2}/m.test(text || '') && /Tags:\s*#journal/i.test(text || '');
}

function looksLikeContinuation(prev, next) {
  const prevText = (prev.content || '').trim();
  const nextText = (next.content || '').trim();
  if (!prevText || !nextText) return false;

  if (isBundledJournalEntry(prev) && isBundledJournalEntry(next)) return false;
  if (isCompleteDailyBundle(prevText) && isCompleteDailyBundle(nextText)) return false;

  const gap = new Date(next.posted_at) - new Date(prev.posted_at);
  if (gap < 0 || gap > MAX_GAP_MS) return false;

  const prevAspect = aspectKeyFromContent(prevText);
  const nextAspect = aspectKeyFromContent(nextText);

  if (prevAspect && nextAspect && aspectKeysMatch(prevAspect, nextAspect)) return true;

  if (isPromptLine(prevText) && (isResponseLine(nextText) || isForgeBlock(nextText))) return true;
  if (isResponseLine(prevText) && (isForgeBlock(nextText) || /^---/.test(nextText))) return true;
  if (isForgeBlock(prevText) && (isPromptLine(nextText) || isResponseLine(nextText))) return true;

  if (
    /^(yes\b|continued|here is|visual image|response\d*|prompt\d*|\*\*response|\*\*prompt|propmpt)/i.test(nextText)
    && (prevAspect || isForgeBlock(prevText) || isResponseLine(prevText))
  ) {
    return true;
  }

  if (prevAspect && (next.attachments?.length || 0) > 0 && nextText.length < 400) {
    return true;
  }

  const prevTruncated =
    prevText.length >= DISCORD_SOFT_LIMIT
    || /\uFFFD/.test(prevText)
    || (!/[.!?]"?\s*$/.test(prevText) && isForgeBlock(prevText));

  if (prevTruncated && !nextAspect && gap < 15 * 60 * 1000) return true;

  if (prevAspect && !nextAspect && !isForgeBlock(nextText) && gap < 20 * 60 * 1000) {
    return true;
  }

  if (
    isResponseLine(prevText)
    && nextText.length < 600
    && !isPromptLine(nextText)
    && gap < 25 * 60 * 1000
  ) {
    return true;
  }

  return false;
}

function clubJournalEntries({ channel = 'journal' } = {}) {
  ensureDiscordSchema();
  const rows = listJournalMessages({ channel, limit: 200 })
    .sort((a, b) => new Date(a.posted_at) - new Date(b.posted_at));

  const merged = [];
  let clubs = 0;

  for (const row of rows) {
    const last = merged[merged.length - 1];
    if (last && looksLikeContinuation(last, row)) {
      try {
        const combined = mergeJournalEntries(last.id, row.id);
        merged[merged.length - 1] = combined;
        clubs += 1;
        continue;
      } catch (err) {
        console.warn(`[smart-club] merge failed ${last.id}+${row.id}:`, err.message);
      }
    }
    merged.push(row);
  }

  db.saveDb();
  return { clubs, remaining: merged.length, channel };
}

/** Discord-only smart sync: purge synthetic rows, club by heading, then forge continuations. */
function smartSyncJournal({ channel = 'journal' } = {}) {
  const purged_synthetic = purgeSyntheticJournalEntries();
  const heading_club = clubJournalByHeading({ channel });
  const forge_club = clubJournalEntries({ channel });
  return {
    purged_synthetic,
    heading_club,
    forge_club,
    remaining: forge_club.remaining,
    headings: heading_club.headings,
    channel,
  };
}

module.exports = {
  smartSyncJournal,
  clubJournalByHeading,
  clubJournalEntries,
  groupJournalByHeading,
  extractSessionHeading,
  sessionHeadingLabel,
  stripHeadingLines,
  isSummaryBlock,
  looksLikeContinuation,
  aspectKeyFromContent,
  normalizeAspectKey,
  aspectKeysMatch,
  isPromptLine,
  isResponseLine,
};