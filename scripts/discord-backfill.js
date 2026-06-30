/**
 * CLI: transfer Discord #journal → AFS
 * Run: npm run journal-sync
 */
require('./load-env');
const { syncJournalFromDiscord } = require('../server/discord-sync');

(async () => {
  const result = await syncJournalFromDiscord();
  console.log('Journal sync complete');
  console.log(`  Messages fetched: ${result.messages_fetched}`);
  console.log(`  Channels synced:  ${result.channels_synced}`);
  console.log(`  Total entries:    ${result.total_entries}`);
  if (result.bundle?.bundled_count) {
    console.log(`  April 1 bundles:  ${result.bundle.bundled_count}`);
  }
})().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});