const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

const GROK_FALLBACK_DIRS = [
  process.env.GROK_DATA_DIR,
  path.join('D:', 'wallpapers', 'afs-platform', 'data', 'grok-37560952'),
].filter(Boolean);

function getDataDir() {
  return process.env.AFS_DATA_DIR || path.join(PROJECT_ROOT, 'data');
}

function dataPath(...segments) {
  return path.join(getDataDir(), ...segments);
}

function getProjectRoot() {
  return PROJECT_ROOT;
}

/** Local motion artifacts — was F:\Videos\AFS */
function getAfsVideosDir() {
  return process.env.AFS_VIDEOS_DIR || path.join(PROJECT_ROOT, 'videos', 'afs');
}

/** Still images — was D:\wallpapers\ forge art + Aspect Images */
function getAfsImagesDir() {
  return process.env.AFS_IMAGES_DIR || path.join(getAfsVideosDir(), 'images');
}

function getEntheaExePath() {
  const candidates = [
    process.env.ENTHEA_EXE,
    path.join(PROJECT_ROOT, 'enthea-rs.exe'),
    path.join(getAfsVideosDir(), 'addons', 'enthea-rs.exe'),
    path.join('C:\\Users\\Madhur', 'ENTHEA', 'enthea-rs.exe'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(PROJECT_ROOT, 'enthea-rs.exe');
}

function grokDataPath(...segments) {
  return path.join(getGrokDataDir(), ...segments);
}

/** Resolve Grok origin folder — project data first, then known fallbacks. */
function getGrokDataDir() {
  const local = dataPath('grok-37560952');
  if (fs.existsSync(path.join(local, 'sessions-full.json'))) return local;
  for (const dir of GROK_FALLBACK_DIRS) {
    if (dir && fs.existsSync(path.join(dir, 'sessions-full.json'))) return dir;
  }
  return local;
}

function listGrokFallbackDirs() {
  return [dataPath('grok-37560952'), ...GROK_FALLBACK_DIRS.filter((d) => d !== dataPath('grok-37560952'))];
}

module.exports = {
  getDataDir,
  dataPath,
  getProjectRoot,
  getAfsVideosDir,
  getAfsImagesDir,
  getEntheaExePath,
  getGrokDataDir,
  grokDataPath,
  listGrokFallbackDirs,
};