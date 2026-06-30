const fs = require('fs');
const path = require('path');
const { getProjectRoot, getAfsVideosDir, getAfsImagesDir } = require('../../server/paths');

function encodeStaticMediaPath(relativePosix) {
  return relativePosix
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/**
 * Resolve a DB visualization path to a relative URL for offline static HTML
 * (HTML file lives at project root; media under videos/afs/).
 */
function toStaticVisualizationMediaUrl(filePath, projectRoot = getProjectRoot()) {
  if (!filePath || typeof filePath !== 'string') return null;

  const root = path.resolve(projectRoot);
  const abs = path.resolve(filePath);

  if (fs.existsSync(abs)) {
    const rel = path.relative(root, abs);
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
      return encodeStaticMediaPath(rel.split(path.sep).join('/'));
    }
  }

  const base = path.basename(abs);
  const candidates = [
    path.join(getAfsVideosDir(), base),
    path.join(getAfsImagesDir(), base),
    path.join(root, 'videos', 'afs', base),
    path.join(root, 'videos', 'afs', 'images', base),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const rel = path.relative(root, candidate);
    if (!rel.startsWith('..')) {
      return encodeStaticMediaPath(rel.split(path.sep).join('/'));
    }
  }

  return null;
}

function enrichVisualizationsForStatic(visualizations, projectRoot = getProjectRoot()) {
  let resolved = 0;
  let missing = 0;
  const rows = visualizations
    .filter((v) => v.type !== 'engine')
    .map((v) => {
      const media_url = toStaticVisualizationMediaUrl(v.path, projectRoot);
      if (media_url) resolved += 1;
      else missing += 1;
      return { ...v, media_url, media_offline: !media_url };
    });
  return { rows, resolved, missing };
}

module.exports = {
  toStaticVisualizationMediaUrl,
  enrichVisualizationsForStatic,
  encodeStaticMediaPath,
};