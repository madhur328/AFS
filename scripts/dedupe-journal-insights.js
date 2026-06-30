/**
 * One-shot cleanup: remove duplicate discord insights and re-tag from journal messages.
 * Run: node scripts/dedupe-journal-insights.js
 */
const db = require('../server/db');
const { upsertDiscordMessage, titleFromContent } = require('../server/discord');
const { parseAttachmentsJson } = require('../server/journal-attachments');

async function main() {
  await db.initDb();

  const dupes = db.prepare(`
    SELECT title, COUNT(*) c FROM insights WHERE source = 'discord'
    GROUP BY title HAVING c > 1 ORDER BY c DESC
  `).all();
  console.log(`Duplicate insight titles before cleanup: ${dupes.length}`);

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

  const after = db.prepare(`
    SELECT title, COUNT(*) c FROM insights WHERE source = 'discord'
    GROUP BY title HAVING c > 1
  `).all();
  console.log(`Journal messages: ${rows.length}`);
  console.log(`Insights re-built: ${rows.length}`);
  console.log(`Duplicate insight titles after cleanup: ${after.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});