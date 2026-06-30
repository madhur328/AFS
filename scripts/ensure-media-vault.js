/**
 * Ensure videos/afs media + ENTHEA are registered in visualizations.
 * Run: node scripts/ensure-media-vault.js
 */
const db = require('../server/db');
const { ensureMediaVault } = require('../server/services/afs-videos');
const { rebuildSearchIndex } = require('../server/seed');

(async () => {
  await db.initDb();
  const result = ensureMediaVault(db);
  if (result.synced) {
    rebuildSearchIndex();
    console.log('Media vault synced:');
    console.log(`  videos: ${result.inserted ?? 0} files`);
    console.log(`  images: ${result.imagesInserted ?? 0} files`);
    console.log(`  enthea: ${result.enthea?.action || result.enthea || 'n/a'}`);
  } else {
    console.log('Media vault OK — no sync needed');
    console.log(`  DB: ${result.videoRows} videos, ${result.imageRows} images, ${result.engineRows} engines`);
    console.log(`  disk: ${result.diskVideos} videos, ${result.diskImages} images`);
  }
  const total = db.prepare('SELECT COUNT(*) c FROM visualizations').get().c;
  console.log(`  total visualizations: ${total}`);

  try {
    const res = await fetch('http://localhost:3847/api/admin/reload-db', { method: 'POST' });
    if (res.ok) {
      const body = await res.json();
      console.log(`  API hot-reloaded (${body.aspectCount} aspects)`);
    }
  } catch {
    console.log('  (API offline — restart npm run dev to see visuals in the app)');
  }
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});