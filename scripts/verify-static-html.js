/**
 * Post-build checks for offline static HTML bundles.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadSnapshot(html) {
  const start = html.indexOf('window.__AFS_DATA__=');
  if (start < 0) throw new Error('Missing window.__AFS_DATA__');
  const jsonStart = html.indexOf('{', start);
  let depth = 0;
  let i = jsonStart;
  for (; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    else if (html[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return JSON.parse(html.slice(jsonStart, i + 1));
}

function verifyFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const data = loadSnapshot(html);
  const errors = [];

  if (!data.aspects?.length) errors.push('no aspects');
  if (!data.lore?.length) errors.push('no lore');
  if (!data.journalEntries?.length) errors.push('no journal entries');
  if (!data.redLeafKernel?.kernel?.seed) errors.push('missing red leaf kernel');
  if (!Array.isArray(data.pulses)) errors.push('missing pulses');

  const loreWithImage = (data.lore || []).filter((e) => e.has_image);
  const loreEmbedded = loreWithImage.filter((e) => e.image_data_url);
  if (loreWithImage.length && loreEmbedded.length < loreWithImage.length) {
    errors.push(`lore images ${loreEmbedded.length}/${loreWithImage.length} embedded`);
  }

  if (!/object-contain/.test(html)) errors.push('missing object-contain styles (lore images may crop)');
  if (!/__AFS_MOBILE__/.test(html) && filePath.includes('mobile')) {
    errors.push('mobile bundle missing __AFS_MOBILE__ flag');
  }

  const engineViz = (data.visualizations || []).some((v) => v.type === 'engine');
  if (engineViz) errors.push('engine visualization leaked into static export');

  return {
    file: path.basename(filePath),
    mb: (fs.statSync(filePath).size / 1024 / 1024).toFixed(2),
    aspects: data.aspects.length,
    lore: data.lore.length,
    journal: data.journalEntries.length,
    loreImages: loreEmbedded.length,
    errors,
  };
}

const files = ['afs-platform-static.html', 'afs-platform-static-mobile.html'];
let failed = false;

for (const file of files) {
  const result = verifyFile(path.join(ROOT, file));
  if (result.errors.length) {
    failed = true;
    console.error(`FAIL ${result.file}:`, result.errors.join(', '));
  } else {
    console.log(
      `OK ${result.file} (${result.mb} MB) — ${result.aspects} aspects, ${result.lore} lore, ${result.journal} journal, ${result.loreImages} lore images`
    );
  }
}

if (failed) process.exit(1);