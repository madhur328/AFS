const fs = require('fs');
const path = require('path');
const { dataPath } = require('./paths');

const JOURNAL_IMAGES_DIR = dataPath('journal-images');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif']);

function ensureJournalImagesDir() {
  fs.mkdirSync(JOURNAL_IMAGES_DIR, { recursive: true });
}

function isImageAttachment(att) {
  const type = (att.content_type || att.contentType || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  const name = att.name || att.url || '';
  return IMAGE_EXT.has(path.extname(name).toLowerCase());
}

function extractAttachmentsFromMessage(msg) {
  const out = [];
  const seen = new Set();

  const push = (item) => {
    if (!item?.url || seen.has(item.url)) return;
    seen.add(item.url);
    out.push(item);
  };

  if (msg.attachments?.size) {
    for (const att of msg.attachments.values()) {
      push({
        url: att.url,
        name: att.name || 'attachment',
        content_type: att.contentType || null,
        width: att.width || null,
        height: att.height || null,
      });
    }
  }

  for (const embed of msg.embeds || []) {
    if (embed.image?.url) {
      push({
        url: embed.image.url,
        name: 'embed-image',
        content_type: 'image/*',
        width: embed.image.width || null,
        height: embed.image.height || null,
      });
    }
    if (embed.thumbnail?.url) {
      push({
        url: embed.thumbnail.url,
        name: 'embed-thumbnail',
        content_type: 'image/*',
        width: embed.thumbnail.width || null,
        height: embed.thumbnail.height || null,
      });
    }
  }

  return out;
}

function extFromMime(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
    'image/avif': '.avif',
  };
  return map[(mime || '').toLowerCase()] || null;
}

function sanitizeFilename(name) {
  return (name || 'image')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image';
}

function persistJournalAttachments(entryId, attachments = []) {
  if (!attachments.length) return [];
  ensureJournalImagesDir();

  const saved = [];
  let index = 0;

  for (const att of attachments) {
    if (att.url && !att.data) {
      saved.push({
        url: att.url,
        name: att.name || 'attachment',
        content_type: att.content_type || att.contentType || null,
        width: att.width ?? null,
        height: att.height ?? null,
        local: Boolean(att.local),
      });
      continue;
    }

    const data = att.data;
    if (!data) continue;

    const contentType = att.content_type || att.contentType || 'image/jpeg';
    const ext = extFromMime(contentType) || path.extname(att.name || '') || '.jpg';
    const base = sanitizeFilename(path.basename(att.name || 'image', ext));
    const filename = `${entryId}-${index}-${base}${ext}`;
    const filePath = path.join(JOURNAL_IMAGES_DIR, filename);

    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);

    saved.push({
      url: `/api/discord/journal/media/${filename}`,
      name: att.name || filename,
      content_type: contentType,
      width: att.width ?? null,
      height: att.height ?? null,
      local: true,
    });
    index += 1;
  }

  return saved;
}

function isAllowedJournalMediaFile(filename) {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  const filePath = path.join(JOURNAL_IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) return false;
  return path.resolve(filePath).startsWith(path.resolve(JOURNAL_IMAGES_DIR));
}

function mimeForJournalMedia(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.avif': 'image/avif',
  };
  return map[ext] || 'application/octet-stream';
}

function parseAttachmentsJson(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasJournalPayload(content, attachments = []) {
  return Boolean((content || '').trim()) || attachments.length > 0;
}

async function downloadRemoteAttachment(entryId, index, att) {
  ensureJournalImagesDir();
  const res = await fetch(att.url, {
    headers: { 'User-Agent': 'AFS-Platform/1.0 (journal-sync)' },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const contentType = att.content_type || res.headers.get('content-type') || 'image/jpeg';
  const ext = extFromMime(contentType) || path.extname(att.name || '') || '.jpg';
  const base = sanitizeFilename(path.basename(att.name || 'image', ext));
  const filename = `discord-${entryId}-${index}-${base}${ext}`;
  const filePath = path.join(JOURNAL_IMAGES_DIR, filename);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/api/discord/journal/media/${filename}`,
    name: att.name || filename,
    content_type: contentType,
    width: att.width ?? null,
    height: att.height ?? null,
    local: true,
    source_url: att.url,
  };
}

async function mirrorRemoteAttachments(entryId, attachments = []) {
  if (!attachments.length) return [];

  const saved = [];
  for (let i = 0; i < attachments.length; i += 1) {
    const att = attachments[i];
    if (att.local || att.url?.startsWith('/api/')) {
      saved.push(att);
      continue;
    }
    if (!att.url?.startsWith('http://') && !att.url?.startsWith('https://')) {
      saved.push(att);
      continue;
    }
    try {
      saved.push(await downloadRemoteAttachment(entryId, i, att));
    } catch (err) {
      console.warn(`[journal] Could not mirror ${att.url}: ${err.message}`);
      saved.push(att);
    }
  }
  return saved;
}

module.exports = {
  JOURNAL_IMAGES_DIR,
  extractAttachmentsFromMessage,
  persistJournalAttachments,
  isAllowedJournalMediaFile,
  mimeForJournalMedia,
  parseAttachmentsJson,
  hasJournalPayload,
  isImageAttachment,
  mirrorRemoteAttachments,
  downloadRemoteAttachment,
};