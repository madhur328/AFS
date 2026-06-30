/**
 * Sync motion artifacts from videos/afs into visualizations table.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  getProjectRoot,
  getAfsVideosDir,
  getAfsImagesDir,
  getEntheaExePath,
} = require('../paths');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

/** Filename stem → aspect_link when a clear mapping exists */
const ASPECT_HINTS = [
  [/anchor\s*\(inner\)/i, 'Anchor of Stability'],
  [/flames of conviction/i, 'Fire of Conviction'],
  [/^red leaf$/i, 'Red Leaf Dual Acceptance'],
  [/valkyrie/i, 'Red Leaf Fallen Valkyrie – Redemption'],
  [/infinite.?spiral/i, 'Eternal Spin'],
  [/resonant shell/i, 'Feedback Weaver'],
  [/dream weaver/i, 'Wings of Ambition'],
  [/explosion_of_perception|explosion of perception/i, 'Empty Mirror'],
  [/drill of heavenly/i, 'Kohinoor Forge Run'],
  [/lotus_of_purity|lotus of purity/i, 'Sprout of Nurturing'],
  [/afs synthesis/i, 'Aspect Forger'],
  [/emotional.?waterfall/i, 'ConvictionFire'],
  [/resonant root/i, 'Feedback Weaver'],
  [/prime_lattice/i, 'ConceptualCartographer'],
  [/tesseract/i, 'DimensionalHarmonizer'],
  [/scales_of_sacrifice/i, 'Unwavering Heart'],
  [/portal/i, 'Empty Mirror'],
  [/collective boat|boat of learning/i, 'Anchor of Stability'],
];

const KNOWN_VIDEO_TITLES = {
  'Collective Boat of Spirituality': 'Boat of Learnings',
};

const LEGACY_VIDEO_ROOTS = [
  'F:\\Videos\\AFS',
  'F:/Videos/AFS',
];

function titleFromFilename(fileName) {
  const stem = path.basename(fileName, path.extname(fileName));
  return stem.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function guessAspectLink(title) {
  for (const [re, aspect] of ASPECT_HINTS) {
    if (re.test(title)) return aspect;
  }
  return null;
}

function listAfsVideoFiles(dir = getAfsVideosDir()) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => VIDEO_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function listAfsImageFiles(dir = getAfsImagesDir()) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dir, e.name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function getAllowedMediaRoots() {
  return [
    path.resolve(getAfsVideosDir()),
    path.resolve(getAfsImagesDir()),
    path.resolve(getProjectRoot()),
    path.resolve(getProjectRoot(), 'videos'),
    path.resolve(getAfsVideosDir(), 'addons'),
    path.resolve('C:\\Users\\Madhur\\ENTHEA'),
  ];
}

/** Copy bundled ENTHEA from videos/afs/addons when root copy is missing. */
function ensureEntheaInstalled() {
  const rootExe = path.join(getProjectRoot(), 'enthea-rs.exe');
  if (fs.existsSync(rootExe)) return { path: rootExe, action: 'ok' };
  const bundled = path.join(getAfsVideosDir(), 'addons', 'enthea-rs.exe');
  if (!fs.existsSync(bundled)) {
    return { path: getEntheaExePath(), action: 'missing' };
  }
  try {
    fs.copyFileSync(bundled, rootExe);
    return { path: rootExe, action: 'copied' };
  } catch (err) {
    return { path: bundled, action: `use-bundled (${err.message})` };
  }
}

function purgeLegacyVideoRows(db) {
  const dir = getAfsVideosDir();
  db.prepare(`DELETE FROM visualizations WHERE type = 'video' AND path LIKE ?`).run(`${dir}%`);
  for (const legacy of LEGACY_VIDEO_ROOTS) {
    db.prepare(`DELETE FROM visualizations WHERE type = 'video' AND path LIKE ?`).run(`${legacy}%`);
  }
}

const LEGACY_IMAGE_ROOTS = [
  'D:\\wallpapers',
  'D:/wallpapers',
];

function purgeLegacyImageRows(db) {
  const dir = getAfsImagesDir();
  db.prepare(`DELETE FROM visualizations WHERE type = 'image' AND path LIKE ?`).run(`${dir}%`);
  for (const legacy of LEGACY_IMAGE_ROOTS) {
    db.prepare(`DELETE FROM visualizations WHERE type = 'image' AND path LIKE ?`).run(`${legacy}%`);
  }
}

function ensureEntheaEngine(db) {
  ensureEntheaInstalled();
  const entheaPath = getEntheaExePath();
  const row = db.prepare(`SELECT id FROM visualizations WHERE type = 'engine' AND title = 'ENTHEA Live'`).get();
  if (row) {
    db.prepare(`UPDATE visualizations SET path = ? WHERE id = ?`).run(entheaPath, row.id);
    return fs.existsSync(entheaPath) ? 'updated' : 'missing-file';
  }
  if (!fs.existsSync(entheaPath)) return 'missing-file';
  db.prepare(`
    INSERT INTO visualizations (title, type, path, description, aspect_link)
    VALUES ('ENTHEA Live', 'engine', ?, 'Live psychedelic visual synthesizer', 'ENTHEA')
  `).run(entheaPath);
  return 'inserted';
}

/** Filename stem → aspect_link for canonical stills */
const IMAGE_HINTS = [
  [/^8(-aspect-forger-avatar)?$/i, 'Aspect Forger'],
  [/aspect.?forger/i, 'Aspect Forger'],
  [/signal|feel.*align.*transcend/i, 'Key of Clarity'],
  [/unwavering.?heart|^5-c$/i, 'Unwavering Heart'],
  [/^1-1-c/i, 'Forge / Value'],
  [/^2-2-c/i, 'ConceptualCartographer'],
  [/^3-2-c/i, 'ConceptualCartographer'],
  [/^4-1-s/i, 'Fire of Conviction'],
  [/^6(-dragon)?/i, 'ConvictionFire'],
];

function guessImageAspectLink(title, fileName) {
  const hay = `${title} ${fileName}`;
  for (const [re, aspect] of IMAGE_HINTS) {
    if (re.test(hay)) return aspect;
  }
  return guessAspectLink(title);
}

function imageTitleFromPath(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const known = {
    '8-aspect-forger-avatar': 'Aspect Forger Avatar',
    '8': 'Aspect Forger Avatar',
    'signal-feel-align-transcend': 'SIGNAL',
    'file_000000005ad871f493024711d32636bb': 'SIGNAL',
    'Unwavering Heart': 'Unwavering Heart',
    '5-c-unwavering-heart-alt': 'Unwavering Heart (alt)',
    '5-c': 'Unwavering Heart (alt)',
    '1-1-c-forge-value': 'Forge Value Tree',
    '1-1-c': 'Forge Value Tree',
    '2-2-c-infinity-snake': 'Infinity Snake Connect',
    '2-2-c': 'Infinity Snake Connect',
    '3-2-c-incomplete-ring': 'Incomplete Ring Framework',
    '3-2-c': 'Incomplete Ring Framework',
    '4-1-s-conviction-warrior': 'Conviction Warrior',
    '4-1-s': 'Conviction Warrior',
    '6-dragon-headphones': 'Dragon Headphones Forge',
    '6': 'Dragon Headphones Forge',
  };
  return known[base] || titleFromFilename(filePath);
}

function syncAfsImages(db) {
  const dir = getAfsImagesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  purgeLegacyImageRows(db);

  const insert = db.prepare(`
    INSERT INTO visualizations (title, type, path, description, aspect_link)
    VALUES (?, 'image', ?, ?, ?)
  `);

  const files = listAfsImageFiles(dir);
  let inserted = 0;
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const title = imageTitleFromPath(filePath);
    const aspect = guessImageAspectLink(title, fileName);
    insert.run(
      title,
      filePath,
      `AFS still — ${title}`,
      aspect
    );
    inserted += 1;
  }

  return { imagesDir: dir, imagesInserted: inserted, imageFiles: files.length };
}

/** Sync videos/afs → DB when vault is empty or out of date with disk. */
function ensureMediaVault(db) {
  const videoRows = db.prepare(`SELECT COUNT(*) c FROM visualizations WHERE type = 'video'`).get().c;
  const imageRows = db.prepare(`SELECT COUNT(*) c FROM visualizations WHERE type = 'image'`).get().c;
  const engineRows = db.prepare(`SELECT COUNT(*) c FROM visualizations WHERE type = 'engine'`).get().c;
  const diskVideos = listAfsVideoFiles().length;
  const diskImages = listAfsImageFiles().length;
  const enthea = ensureEntheaInstalled();

  const needsSync =
    videoRows !== diskVideos ||
    imageRows !== diskImages ||
    engineRows < 1 ||
    enthea.action === 'copied' ||
    enthea.action === 'missing';

  if (!needsSync) {
    return { synced: false, videoRows, imageRows, engineRows, diskVideos, diskImages, enthea };
  }

  const result = syncAfsVideos(db);
  return { synced: true, ...result, enthea: ensureEntheaInstalled() };
}

function syncAfsVideos(db) {
  const dir = getAfsVideosDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  purgeLegacyVideoRows(db);

  const insert = db.prepare(`
    INSERT INTO visualizations (title, type, path, description, aspect_link)
    VALUES (?, 'video', ?, ?, ?)
  `);

  const files = listAfsVideoFiles(dir);
  let inserted = 0;
  for (const filePath of files) {
    const stemTitle = titleFromFilename(filePath);
    const title = KNOWN_VIDEO_TITLES[stemTitle] || stemTitle;
    const aspect = guessAspectLink(`${title} ${stemTitle}`);
    insert.run(
      title,
      filePath,
      `AFS motion artifact — ${title}`,
      aspect
    );
    inserted += 1;
  }

  const enthea = ensureEntheaEngine(db);
  const images = syncAfsImages(db);

  return {
    dir,
    imagesDir: images.imagesDir,
    entheaPath: getEntheaExePath(),
    enthea,
    inserted,
    files: files.length,
    imagesInserted: images.imagesInserted,
    imageFiles: images.imageFiles,
    newest: files.slice(-5).map((f) => path.basename(f)),
  };
}

function isAllowedMediaPath(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const normalized = path.resolve(filePath);
  return getAllowedMediaRoots().some((root) => normalized.startsWith(root));
}

const LAUNCHABLE_EXTENSIONS = new Set(['.exe', '.bat', '.cmd']);

function isLaunchablePath(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const ext = path.extname(filePath).toLowerCase();
  return LAUNCHABLE_EXTENSIONS.has(ext) && isAllowedMediaPath(filePath);
}

function launchVisualizationPath(filePath) {
  if (!isLaunchablePath(filePath)) {
    throw new Error('Launch path not allowed or missing');
  }
  const child = spawn(filePath, [], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  return { launched: true, path: filePath };
}

function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.html': 'text/html',
  };
  return map[ext] || 'application/octet-stream';
}

module.exports = {
  getAfsVideosDir,
  getAfsImagesDir,
  getEntheaExePath,
  ensureEntheaInstalled,
  ensureMediaVault,
  syncAfsVideos,
  syncAfsImages,
  listAfsVideoFiles,
  listAfsImageFiles,
  isAllowedMediaPath,
  isLaunchablePath,
  launchVisualizationPath,
  mimeForPath,
  titleFromFilename,
  guessAspectLink,
};