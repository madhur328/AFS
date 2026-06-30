/**
 * Ensure Grok origin data exists under project data/grok-37560952.
 * Copies from D:\wallpapers\afs-platform fallback when local copy is missing.
 *
 * Run: node scripts/ensure-grok-data.js
 */
const fs = require('fs');
const path = require('path');
const { dataPath, getGrokDataDir, listGrokFallbackDirs } = require('../server/paths');

const REQUIRED = ['sessions-full.json', 'sessions-index.json'];

function hasGrokBundle(dir) {
  return REQUIRED.every((f) => fs.existsSync(path.join(dir, f)));
}

function copyGrokBundle(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      copyGrokBundle(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function main() {
  const dest = dataPath('grok-37560952');
  if (hasGrokBundle(dest)) {
    console.log(`Grok origin data OK: ${dest}`);
    return { ok: true, path: dest, copied: false };
  }

  for (const src of listGrokFallbackDirs()) {
    if (!src || src === dest || !hasGrokBundle(src)) continue;
    console.log(`Copying Grok origin data:\n  from ${src}\n  to   ${dest}`);
    copyGrokBundle(src, dest);
    console.log('Grok origin data copied into project data/.');
    return { ok: true, path: dest, copied: true, source: src };
  }

  const resolved = getGrokDataDir();
  if (hasGrokBundle(resolved)) {
    console.log(`Using Grok data via fallback path: ${resolved}`);
    return { ok: true, path: resolved, copied: false, fallback: true };
  }

  throw new Error(
    'Grok origin data not found. Expected sessions-full.json in data/grok-37560952 '
      + 'or D:\\wallpapers\\afs-platform\\data\\grok-37560952. Run extract_grok_sessions.py first.',
  );
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = { main, hasGrokBundle, copyGrokBundle };