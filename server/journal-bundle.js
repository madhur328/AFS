/**
 * Bundle Discord #journal fragments into April 1 entries.
 * Merges multi-message sessions (Apr1 anchor + continuations).
 */
const db = require('./db');
const {
  loadConfig,
  upsertDiscordMessage,
  ensureDiscordSchema,
  removeJournalIndexes,
  titleFromContent,
} = require('./discord');
const { parseAttachmentsJson } = require('./journal-attachments');

const APRIL1_ANCHOR = /\bApr\s*1\s*2026\b/i;
const APRIL1_LINE = /^\s*\*{0,2}\s*Apr\s*1\s*2026\s*\*{0,2}\s*$/im;
const APRIL1_BUNDLE_ID = /^journal-april1-/;

function isDiscordSnowflake(id) {
  return /^\d{17,20}$/.test(String(id || ''));
}

function isApril1BundleId(id) {
  return APRIL1_BUNDLE_ID.test(String(id || ''));
}

function hasApril1Anchor(content) {
  return APRIL1_ANCHOR.test(content || '');
}

function purgeExistingApril1Bundles() {
  const rows = db.prepare(`SELECT * FROM discord_messages WHERE id LIKE 'journal-april1-%'`).all();
  for (const row of rows) {
    removeJournalIndexes(
      row.id,
      titleFromContent(row.content, row.channel_name, parseAttachmentsJson(row.attachments_json)),
      row.content
    );
    db.prepare('DELETE FROM discord_messages WHERE id = ?').run(row.id);
  }
  return rows.length;
}

function isSummaryBlock(text) {
  return /Total study time:/i.test(text);
}

function stripApril1Decorations(content) {
  return (content || '')
    .replace(/^Date:\s*2026-04-01\s*\n(?:Tags:[^\n]*\n)?/im, '')
    .replace(/^\s*\*{0,2}\s*Apr\s*1\s*2026\s*\*{0,2}\s*\n?/gim, '')
    .trim();
}

function bundleApril1Entries() {
  ensureDiscordSchema();
  const config = loadConfig();
  const channel = (config.primary_journal_channel || 'journal').toLowerCase();

  const purged_prior_bundles = purgeExistingApril1Bundles();

  const rows = db.prepare(`
    SELECT * FROM discord_messages
    WHERE LOWER(channel_name) = ?
      AND id GLOB '[0-9]*'
    ORDER BY posted_at ASC
  `).all(channel);

  const sessions = [];
  let current = null;

  for (const row of rows) {
    const body = stripApril1Decorations(row.content);

    if (hasApril1Anchor(row.content)) {
      if (current) sessions.push(current);
      current = {
        anchor_id: row.id,
        source: row,
        parts: body ? [body] : [],
        posted_at: row.posted_at,
      };
      continue;
    }

    if (current) {
      const gapMs = new Date(row.posted_at) - new Date(current.last_at || current.posted_at);
      if (gapMs > 2 * 60 * 60 * 1000) {
        sessions.push(current);
        current = null;
        continue;
      }
      if (body) current.parts.push(body);
      current.last_at = row.posted_at;
    }
  }
  if (current) sessions.push(current);

  const bundled = [];
  const absorbedIds = new Set();

  let dailyOrdinal = 0;

  sessions.forEach((session) => {
    const merged = session.parts.join('\n\n').trim();
    if (!merged) return;

    session.source_ids = collectSessionSourceIds(rows, session);
    session.source_ids.forEach((id) => absorbedIds.add(id));

    const isSummary = isSummaryBlock(merged);
    if (!isSummary) dailyOrdinal += 1;
    const id = isSummary
      ? 'journal-april1-2026-summary'
      : dailyOrdinal === 1
        ? 'journal-april1-2026-daily'
        : `journal-april1-2026-daily-${dailyOrdinal}`;

    const postedAt = isSummary
      ? '2026-04-01T18:00:00.000Z'
      : '2026-04-01T09:00:00.000Z';

    const aspect = isSummary
      ? '📊 Daily metrics · Reflection'
      : '📓 Daily log · Apr 1 2026';

    const content = `Date: 2026-04-01
Aspect/symbol: ${aspect}
Tags: #journal #daily #april1

${merged}`;

    upsertBundledRow(session.source, id, content, postedAt);
    bundled.push(id);
  });

  for (const id of absorbedIds) {
    if (!bundled.includes(id)) {
      const row = db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(id);
      if (row) {
        removeJournalIndexes(
          id,
          titleFromContent(row.content, row.channel_name, parseAttachmentsJson(row.attachments_json)),
          row.content
        );
      }
      db.prepare('DELETE FROM discord_messages WHERE id = ?').run(id);
    }
  }

  const bundledBodies = bundled
    .map((id) => db.prepare('SELECT content FROM discord_messages WHERE id = ?').get(id)?.content || '')
    .filter(Boolean);
  const purged = purgeFragmentsAbsorbedIntoBundles(channel, bundledBodies, new Set(bundled));

  db.saveDb();
  return {
    source_count: sessions.length,
    bundled_count: bundled.length,
    ids: bundled,
    removed_fragments: absorbedIds.size,
    purged_duplicates: purged,
    purged_prior_bundles,
  };
}

function normalizeBody(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** Remove raw Discord snowflakes whose body is already contained in a bundled entry. */
function purgeFragmentsAbsorbedIntoBundles(channel, bundledBodies, keepIds) {
  if (!bundledBodies.length) return 0;
  const normBundles = bundledBodies.map(normalizeBody).filter((b) => b.length >= 120);
  if (!normBundles.length) return 0;

  const snowflakes = db.prepare(`
    SELECT * FROM discord_messages
    WHERE LOWER(channel_name) = ?
      AND id NOT LIKE 'journal-%'
      AND id NOT LIKE 'local-%'
  `).all(channel);

  let purged = 0;
  for (const row of snowflakes) {
    if (keepIds.has(row.id)) continue;
    const body = normalizeBody(stripApril1Decorations(row.content));
    if (body.length < 80) continue;
    const absorbed = normBundles.some((b) => b.includes(body));
    if (!absorbed) continue;
    removeJournalIndexes(
      row.id,
      titleFromContent(row.content, row.channel_name, parseAttachmentsJson(row.attachments_json)),
      row.content
    );
    db.prepare('DELETE FROM discord_messages WHERE id = ?').run(row.id);
    purged += 1;
  }
  return purged;
}

function collectSessionSourceIds(allRows, session) {
  const ids = [session.anchor_id];
  const startIdx = allRows.findIndex((r) => r.id === session.anchor_id);
  if (startIdx < 0) return ids;

  for (let i = startIdx + 1; i < allRows.length; i += 1) {
    const row = allRows[i];
    if (hasApril1Anchor(row.content)) break;
    const gapMs = new Date(row.posted_at) - new Date(allRows[i - 1].posted_at);
    if (gapMs > 2 * 60 * 60 * 1000) break;
    ids.push(row.id);
  }
  return ids;
}

function upsertBundledRow(source, id, content, postedAt) {
  const tags = ['journal', 'daily', 'april1'];
  upsertDiscordMessage({
    id,
    guild_id: source.guild_id,
    channel_id: source.channel_id,
    channel_name: source.channel_name,
    author_id: source.author_id,
    author_name: source.author_name,
    content,
    journal_type: source.journal_type || 'journal',
    tags,
    title: content.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('Date:') && !l.startsWith('Tags:') && !l.startsWith('Aspect/symbol:'))?.slice(0, 120) || 'Apr 1 2026',
    posted_at: postedAt,
  });
}

module.exports = {
  hasApril1Anchor,
  isApril1BundleId,
  isDiscordSnowflake,
  purgeExistingApril1Bundles,
  bundleApril1Entries,
  purgeFragmentsAbsorbedIntoBundles,
};