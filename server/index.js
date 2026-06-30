require('../scripts/load-env');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const PORT = process.env.PORT || 3847;

async function start() {
  await db.initDb();

  const { loadCorpusSymbols } = require('./services/symbols');
  loadCorpusSymbols();
  const { buildAspectFaceCache } = require('./services/aspect-face-cache');
  console.log('Building aspect face search index...');
  const faceCache = buildAspectFaceCache(db);
  console.log(`Face index ready: ${faceCache.aspectCount} aspects, ${faceCache.faceCount} diamond faces`);
  global.__afs_db_ready = true;

  const { seed, rebuildSearchIndex } = require('./seed');
  const aspectCount = db.prepare('SELECT COUNT(*) as c FROM aspects').get()?.c;
  if (!aspectCount) {
    console.log('Seeding AFS database...');
    seed();
  } else {
    const { ensureMediaVault } = require('./services/afs-videos');
    const media = ensureMediaVault(db);
    if (media.synced) {
      rebuildSearchIndex();
      console.log(
        `🎬  Media vault synced — ${media.inserted ?? media.videoRows ?? 0} videos, ` +
          `${media.imagesInserted ?? media.imageRows ?? 0} images` +
          (media.enthea?.action === 'copied' ? ', ENTHEA installed' : ''),
      );
    } else {
      const v = db.prepare(`SELECT COUNT(*) c FROM visualizations WHERE type='video'`).get().c;
      const e = db.prepare(`SELECT COUNT(*) c FROM visualizations WHERE type='engine'`).get().c;
      if (v < 1) {
        console.warn('⚠️  No videos in visualizations — run: npm run sync-videos');
      }
      if (e < 1) {
        console.warn('⚠️  ENTHEA engine missing — check videos/afs/addons/enthea-rs.exe');
      }
    }
  }

  const api = require('./routes/api');
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use('/api', api);

  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDist, 'index.html'));
      }
    });
  }

  const { seedBootPulse } = require('./services/pulse-bus');
  const { bootHandlers } = require('./services/kernel-spiral');
  bootHandlers();
  seedBootPulse();

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      const { loadSeedFile } = require('./services/red-leaf-kernel');
      const seed = loadSeedFile();
      const grokCount = db.prepare('SELECT COUNT(*) n FROM grok_sessions').get()?.n ?? 0;
      console.log(`⚒️  AFS Platform API running at http://localhost:${PORT}`);
      console.log(`🍁  Red Leaf kernel iteration ${seed.iteration} — pulse bus + spiral handlers online`);
      if (grokCount < 1) {
        console.warn('⚠️  grok_sessions empty — run: npm run sync-stranded-aspects');
      } else {
        console.log(`📜  Grok origin: ${grokCount} sessions loaded`);
      }
      resolve(server);
    });
  });
}

module.exports = { start };

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start AFS Platform:', err);
    process.exit(1);
  });
}