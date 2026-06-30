/**
 * Copy scattered AFS stills into videos/afs/images and re-sync visualizations DB.
 * Run: node scripts/consolidate-afs-media.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { getAfsImagesDir } = require('../server/paths');
const { syncAfsVideos } = require('../server/services/afs-videos');
const { rebuildSearchIndex } = require('../server/seed');

const WALLPAPERS = path.resolve('D:\\wallpapers');

/** Canonical forge art — source relative to D:\wallpapers */
const IMAGE_SOURCES = [
  { src: '8.jpg', title: 'Aspect Forger Avatar' },
  { src: 'file_000000005ad871f493024711d32636bb.webp', title: 'SIGNAL' },
  { src: path.join('Aspect Images', 'Unwavering Heart.jpg'), title: 'Unwavering Heart' },
  { src: '5-c.jpg', title: 'Unwavering Heart (alt)' },
  { src: '1-1-c.png', title: 'Forge Value Tree' },
  { src: '2-2-c.png', title: 'Infinity Snake Connect' },
  { src: '3-2-c.png', title: 'Incomplete Ring Framework' },
  { src: '4-1-s.jpg', title: 'Conviction Warrior' },
  { src: '6.png', title: 'Dragon Headphones Forge' },
];

function copyIfNewer(src, dest) {
  if (!fs.existsSync(src)) {
    return { status: 'missing', src };
  }
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(dest)) {
    const srcStat = fs.statSync(src);
    const destStat = fs.statSync(dest);
    if (destStat.mtimeMs >= srcStat.mtimeMs && destStat.size === srcStat.size) {
      return { status: 'skipped', dest };
    }
  }
  fs.copyFileSync(src, dest);
  return { status: 'copied', dest };
}

(async () => {
  await db.initDb();
  const imagesDir = getAfsImagesDir();
  const results = [];

  for (const item of IMAGE_SOURCES) {
    const src = path.join(WALLPAPERS, item.src);
    const dest = path.join(imagesDir, path.basename(item.src));
    results.push({ ...item, ...copyIfNewer(src, dest) });
  }

  const sync = syncAfsVideos(db);
  rebuildSearchIndex();
  db.saveDb();

  const copied = results.filter((r) => r.status === 'copied').length;
  const missing = results.filter((r) => r.status === 'missing');

  console.log(`Images vault: ${imagesDir}`);
  console.log(`Copied: ${copied}, skipped: ${results.length - copied - missing.length}, missing: ${missing.length}`);
  if (missing.length) {
    console.log('Missing sources:');
    missing.forEach((m) => console.log(`  - ${m.src}`));
  }
  console.log(`DB sync: ${sync.inserted} videos, ${sync.imagesInserted} images`);
  process.exit(0);
})();