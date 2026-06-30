/**
 * Bundle static Vite build + exported DB snapshot into a single HTML file.
 * Usage:
 *   node scripts/bundle-static-html.js          → afs-platform-static.html
 *   node scripts/bundle-static-html.js --mobile → afs-platform-static-mobile.html
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'client', 'dist-static');
const DATA = path.join(ROOT, 'data', 'static-export.json');

const MOBILE = process.argv.includes('--mobile');
const OUT = path.join(ROOT, MOBILE ? 'afs-platform-static-mobile.html' : 'afs-platform-static.html');
const SPIRAL_SRC = path.join(ROOT, 'client', 'public', 'afs-recursive-spiral-engine.html');
const THREE_VENDOR = path.join(ROOT, 'scripts', 'vendor', 'three-r128.min.js');
const THREE_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

const MOBILE_INLINE_CSS = `
html, body { touch-action: manipulation; }
body { padding-bottom: env(safe-area-inset-bottom); }
.afs-mobile-tabbar { box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.45); }
.afs-mobile-static header.sticky { padding-top: max(0.75rem, env(safe-area-inset-top)); }
`;

function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

function resolveImagePath(imagePath) {
  if (!imagePath) return null;
  const candidates = [
    imagePath,
    path.join(ROOT, imagePath),
    path.join(ROOT, 'data', imagePath.replace(/^data[\\/]/, '')),
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function embedLoreImages(snapshot) {
  if (!Array.isArray(snapshot.lore)) return snapshot;
  const loreImagesDir = path.join(ROOT, 'data', 'lore-images');
  let embedded = 0;
  for (const entry of snapshot.lore) {
    if (entry.image_path && !entry.image_data_url) {
      const filePath = resolveImagePath(entry.image_path);
      if (filePath) {
        const buf = fs.readFileSync(filePath);
        entry.image_data_url = `data:${mimeForPath(filePath)};base64,${buf.toString('base64')}`;
        entry.has_image = true;
        embedded += 1;
      }
    }
    const extras = Array.isArray(entry.extra_images) ? entry.extra_images : [];
    if (extras.length) {
      entry.extra_image_data_urls = entry.extra_image_data_urls || {};
      for (const file of extras) {
        if (entry.extra_image_data_urls[file]) continue;
        const filePath = path.join(loreImagesDir, file);
        if (!fs.existsSync(filePath)) continue;
        const buf = fs.readFileSync(filePath);
        entry.extra_image_data_urls[file] = `data:${mimeForPath(filePath)};base64,${buf.toString('base64')}`;
        embedded += 1;
      }
    }
  }
  if (embedded) console.log(`Embedded ${embedded} lore images (bundle fallback)`);
  return snapshot;
}

function readAssetFromHtml(html, pattern) {
  const m = html.match(pattern);
  if (!m) throw new Error(`Could not find asset matching ${pattern}`);
  const rel = m[1].replace(/^\.\//, '');
  return path.join(DIST, rel);
}

function loadThreeJs() {
  if (fs.existsSync(THREE_VENDOR)) return fs.readFileSync(THREE_VENDOR, 'utf8');
  throw new Error(
    `Missing ${THREE_VENDOR} — run: curl -sL -o scripts/vendor/three-r128.min.js ${THREE_CDN}`
  );
}

/** Spiral engine embedded for offline /spiral — Three.js inlined so no CDN needed. */
function prepareSpiralHtml() {
  if (!fs.existsSync(SPIRAL_SRC)) {
    console.warn('Spiral HTML not found — offline /spiral will be unavailable');
    return null;
  }
  let html = fs.readFileSync(SPIRAL_SRC, 'utf8');
  const threeJs = loadThreeJs();
  html = html.replace(
    `<script src="${THREE_CDN}"></script>`,
    `<script>${threeJs}</script>`
  );
  return html;
}

/** Prevent `<script` / `</script>` inside JSON from breaking the HTML parser (blank screen). */
function safeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * Escape only `</script>` in inlined JS — do NOT replace all `<` (breaks `<=`, `<<`, etc.).
 */
function safeInlineScript(js) {
  return js.replace(/<\/script>/gi, '<\\/script>');
}

function extractScriptBodies(html) {
  const bodies = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) bodies.push(m[1]);
  return bodies;
}

function verifyBundledHtml(html) {
  if (!html.includes('window.__AFS_DATA__=')) {
    throw new Error('Static HTML missing window.__AFS_DATA__ bootstrap');
  }
  const bodies = extractScriptBodies(html);
  if (bodies.length < 2 || bodies.length > 4) {
    throw new Error(`Expected 2–4 script blocks, found ${bodies.length}`);
  }
  const vm = require('vm');
  bodies.forEach((body, i) => {
    try {
      new vm.Script(body, { filename: `afs-static-script-${i}.js` });
    } catch (err) {
      throw new Error(`Script block #${i} syntax error: ${err.message}`);
    }
  });
}

function buildHtml({ css, js, dataJson, spiralHtml }) {
  const title = MOBILE
    ? 'AFS — Aspect Forge (Mobile)'
    : 'AFS — Aspect Forge System (Static)';
  const description = MOBILE
    ? 'Aspect Forge System — offline mobile app. Add to home screen for full-screen use.'
    : 'Aspect Forge System — offline snapshot';

  return `<!DOCTYPE html>
<html lang="en"${MOBILE ? ' class="afs-mobile-static"' : ''}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5, viewport-fit=cover" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="AFS" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="theme-color" content="#0a0f14" />
  <meta name="description" content="${description}" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  ${css ? `<style>${css}</style>` : ''}
  ${MOBILE ? `<style>${MOBILE_INLINE_CSS}</style>` : ''}
</head>
<body${MOBILE ? ' class="afs-mobile-static"' : ''}>
  <div id="root"></div>
  <script>window.__AFS_DATA__=${dataJson};${MOBILE ? 'window.__AFS_MOBILE__=true;' : ''}</script>
  ${spiralHtml ? `<script>window.__AFS_SPIRAL_HTML__=${spiralHtml};</script>` : ''}
  <script>${js}</script>
</body>
</html>
`;
}

function main() {
  if (!fs.existsSync(DIST)) throw new Error('Run static client build first (npm run build:static)');
  if (!fs.existsSync(DATA)) throw new Error('Run export-static-data.js first (npm run export-static)');

  const indexPath = path.join(DIST, 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  const jsPath = readAssetFromHtml(html, /src="(\.\/assets\/[^"]+\.js)"/);
  const cssMatch = html.match(/href="(\.\/assets\/[^"]+\.css)"/);
  const css = cssMatch
    ? fs.readFileSync(path.join(DIST, cssMatch[1].replace(/^\.\//, '')), 'utf8')
    : '';
  const js = safeInlineScript(fs.readFileSync(jsPath, 'utf8'));

  let snapshot = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  snapshot = embedLoreImages(snapshot);
  const dataJson = safeScriptJson(snapshot);

  const spiralRaw = prepareSpiralHtml();
  const spiralHtml = spiralRaw ? safeScriptJson(spiralRaw) : null;
  const single = buildHtml({ css, js, dataJson, spiralHtml });
  verifyBundledHtml(single);
  fs.writeFileSync(OUT, single);

  if (spiralHtml) console.log('Embedded Recursive Spiral Engine (offline-ready, Three.js inlined)');
  const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
  console.log(`Static HTML: ${OUT} (${mb} MB)${MOBILE ? ' [mobile]' : ''}`);
  if (MOBILE) {
    console.log('Mobile: bottom tab bar, safe-area layout, embedded lore images');
    console.log('Open on phone → Share → Add to Home Screen for app-like use');
  } else {
    console.log('Open in any browser — no server required. Uses hash routes (#/grok, #/forge, etc.)');
  }
}

main();