/**
 * Remove duplicate journal rows (April 1 bundle re-run artifacts, etc.) and rebuild insights.
 * Run: node scripts/dedupe-journal-entries.js
 */
const db = require('../server/db');
const {
  upsertDiscordMessage,
  titleFromContent,
  removeJournalIndexes,
  ensureDiscordSchema,
} = require('../server/discord');
const { parseAttachmentsJson } = require('../server/journal-attachments');
const { bundleApril1Entries, purgeExistingApril1Bundles } = require('../server/journal-bundle');

function normalizeContent(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function pickCanonicalRow(rows) {
  const rank = (id) => {
    if (id === 'journal-april1-2026-daily') return 0;
    if (id === 'journal-april1-2026-summary') return 1;
    if (id.startsWith('journal-april1-')) return 2;
    if (/^\d+$/.test(id)) return 3;
    return 4;
  };
  return [...rows].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id))[0];
}

function dedupeByContent() {
  const rows = db.prepare('SELECT * FROM discord_messages ORDER BY posted_at ASC').all();
  const groups = new Map();

  for (const row of rows) {
    const key = normalizeContent(row.content);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let removed = 0;
  for (const [, list] of groups) {
    if (list.length < 2) continue;
    const keep = pickCanonicalRow(list);
    for (const row of list) {
      if (row.id === keep.id) continue;
      removeJournalIndexes(
        row.id,
        titleFromContent(row.content, row.channel_name, parseAttachmentsJson(row.attachments_json)),
        row.content
      );
      db.prepare('DELETE FROM discord_messages WHERE id = ?').run(row.id);
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  await db.initDb();
  ensureDiscordSchema();

  const before = db.prepare('SELECT COUNT(*) as c FROM discord_messages').get().c;
  const purgedBundles = purgeExistingApril1Bundles();
  const removedDupes = dedupeByContent();

  const bundle = bundleApril1Entries();

  db.prepare(`DELETE FROM insights WHERE source = 'discord'`).run();
  const rows = db.prepare('SELECT * FROM discord_messages ORDER BY posted_at ASC').all();
  for (const row of rows) {
    const attachments = parseAttachmentsJson(row.attachments_json);
    upsertDiscordMessage({
      id: row.id,
      guild_id: row.guild_id,
      channel_id: row.channel_id,
      channel_name: row.channel_name,
      author_id: row.author_id,
      author_name: row.author_name,
      content: row.content,
      attachments,
      journal_type: row.journal_type,
      tags: JSON.parse(row.tags_json || '[]').filter((t) => !String(t).startsWith('discord_msg:')),
      title: titleFromContent(row.content, row.channel_name, attachments),
      posted_at: row.posted_at,
    });
  }

  const after = db.prepare('SELECT COUNT(*) as c FROM discord_messages').get().c;
  const insightDupes = db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT title FROM insights WHERE source = 'discord'
      GROUP BY title HAVING COUNT(*) > 1
    )
  `).get().c;

  console.log(`Journal entries: ${before} → ${after}`);
  console.log(`Removed prior April 1 bundles: ${purgedBundles}`);
  console.log(`Removed duplicate content rows: ${removedDupes}`);
  console.log(`Re-bundled April 1 sessions: ${bundle.bundled_count} (${bundle.ids.join(', ')})`);
  console.log(`Insights rebuilt: ${rows.length}`);
  console.log(`Duplicate insight titles remaining: ${insightDupes}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});