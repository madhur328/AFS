/**
 * Wipe all journal entries and re-import from Discord #journal.
 * Stops the live discord-bot first so it cannot immediately re-backfill stale rows.
 * Run: npm run journal-reset
 */
require('./load-env');
const { execSync } = require('child_process');
const db = require('../server/db');
const { ensureDiscordSchema } = require('../server/discord');
const { syncJournalFromDiscord } = require('../server/discord-sync');

function stopDiscordBot() {
  try {
    execSync('node scripts/kill-dev-processes.js', {
      cwd: require('path').join(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    });
  } catch {
    /* ports may already be free */
  }
}

async function wipeJournalData() {
  await db.initDb();
  ensureDiscordSchema();

  const before = db.prepare('SELECT COUNT(*) as c FROM discord_messages').get().c;
  db.prepare('DELETE FROM discord_messages').run();
  db.prepare(`DELETE FROM insights WHERE source = 'discord'`).run();
  db.prepare(`DELETE FROM search_index WHERE entity_type = 'discord'`).run();
  db.saveDb();

  const after = db.prepare('SELECT COUNT(*) as c FROM discord_messages').get().c;
  if (after !== 0) throw new Error(`Wipe failed — ${after} rows remain`);
  return before;
}

(async () => {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('DISCORD_BOT_TOKEN missing — add it to .env first.');
    process.exit(1);
  }

  console.log('Stopping discord-bot / dev listeners (prevents instant re-backfill)…');
  stopDiscordBot();

  const removed = await wipeJournalData();
  console.log(`Wiped ${removed} journal entries (+ discord insights/search rows).`);
  console.log('Syncing from Super learners #journal…');

  const result = await syncJournalFromDiscord({ smartClub: true });
  const snowflakes = db.prepare(`SELECT COUNT(*) c FROM discord_messages WHERE id GLOB '[0-9]*'`).get().c;
  const synthetic = db.prepare(`SELECT COUNT(*) c FROM discord_messages WHERE id NOT GLOB '[0-9]*'`).get().c;

  console.log('Journal reset complete');
  console.log(`  Messages fetched: ${result.messages_fetched}`);
  console.log(`  Channels synced:  ${result.channels_synced}`);
  console.log(`  Total entries:    ${result.total_entries} (Discord snowflakes only)`);
  console.log(`  Breakdown:        ${snowflakes} clubbed entries, ${synthetic} synthetic rows`);
  if (result.smart_sync?.headings?.length) {
    console.log(`  Smart club:       ${result.smart_sync.headings.join(' · ')}`);
  }
  if (result.smart_sync?.heading_club?.clubs) {
    console.log(`  Fragments merged: ${result.smart_sync.heading_club.clubs} by heading`);
  }
  console.log('\nRestart the app: npm run dev');
  console.log('Then hard-refresh Journal (Ctrl+Shift+R) so the API reloads the DB.');
})().catch((err) => {
  console.error('Journal reset failed:', err.message);
  process.exit(1);
});