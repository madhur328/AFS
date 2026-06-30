/**
 * Import all videos from videos/afs into visualizations.
 * Run: node scripts/sync-afs-videos.js  (or use Visuals → Sync videos in UI)
 */
const db = require('../server/db');
const { syncAfsVideos } = require('../server/services/afs-videos');
const { rebuildSearchIndex } = require('../server/seed');

(async () => {
  await db.initDb();
  const result = syncAfsVideos(db);
  rebuildSearchIndex();
  db.saveDb();
  console.log(`AFS videos synced: ${result.inserted} from ${result.dir}`);
  process.exit(0);
})();