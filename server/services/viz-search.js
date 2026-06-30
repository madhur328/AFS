const path = require('path');

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'for', 'my', 'and', 'or', 'video', 'mp4',
]);

function searchTokens(query) {
  return String(query)
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function normalizeHaystack(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function textMatchesTokens(text, tokens) {
  if (!tokens.length) return false;
  const hay = normalizeHaystack(text);
  return tokens.every((tok) => hay.includes(tok));
}

function fileNameFromPath(filePath) {
  if (!filePath) return '';
  return path.basename(filePath);
}

function fileStemFromPath(filePath) {
  const base = fileNameFromPath(filePath);
  const ext = path.extname(base);
  return ext ? base.slice(0, -ext.length) : base;
}

function visualizationSearchFields(v) {
  const fileName = fileNameFromPath(v.path);
  const stem = fileStemFromPath(v.path);
  return [
    v.title,
    v.path,
    fileName,
    stem,
    stem.replace(/_/g, ' '),
    v.description,
    v.aspect_link,
    v.type,
  ];
}

function visualizationMatches(v, query) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return true;
  const tokens = searchTokens(trimmed);
  const fields = visualizationSearchFields(v);
  if (!tokens.length) {
    const fallback = trimmed.toLowerCase();
    return fields.some((f) => String(f || '').toLowerCase().includes(fallback));
  }
  return fields.some((f) => textMatchesTokens(String(f), tokens));
}

function filterVisualizations(rows, query) {
  return rows.filter((v) => visualizationMatches(v, query));
}

module.exports = {
  filterVisualizations,
  visualizationMatches,
  visualizationSearchFields,
  fileNameFromPath,
  fileStemFromPath,
};