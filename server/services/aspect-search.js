const { getFacesForAspect } = require('./aspect-face-cache');
const { searchAliasPhrases } = require('./aspect-search-aliases');

const STOP_WORDS = new Set([
  'aspect', 'aspects', 'the', 'a', 'an', 'of', 'for', 'my', 'and', 'or',
]);

function searchTokens(query) {
  return String(query)
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function normalizeSearchHaystack(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function textMatchesSearchTokens(text, tokens) {
  if (!tokens.length) return false;
  const hay = normalizeSearchHaystack(text);
  return tokens.every((tok) => hay.includes(tok));
}

function fieldsMatchQuery(fields, query) {
  const trimmed = String(query).trim();
  if (!trimmed) return true;
  const tokens = searchTokens(trimmed);
  if (!tokens.length) {
    const fallback = trimmed.toLowerCase().replace(/\b(aspect|aspects)\b/gi, '').trim();
    if (!fallback) return false;
    return fields
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(fallback));
  }
  return fields
    .filter(Boolean)
    .some((field) => textMatchesSearchTokens(String(field), tokens));
}

function aspectMasterMatches(aspect, q) {
  return fieldsMatchQuery(
    [
      aspect.name,
      aspect.mantra,
      aspect.comprehension,
      aspect.category,
      aspect.symbol_chain,
      aspect.tier,
      ...searchAliasPhrases(aspect.name),
    ],
    q
  );
}

function diamondFaceMatches(face, q) {
  return fieldsMatchQuery([face.name, face.mantra, face.symbol], q);
}

function searchAspectDirectory(db, aspects, { q, enrichAspect }) {
  const needle = q.trim();
  const results = [];

  for (const aspect of aspects) {
    const enriched = enrichAspect(aspect);
    if (aspectMasterMatches(enriched, needle)) {
      results.push({ ...enriched, matchKind: 'master' });
    }
    for (const face of getFacesForAspect(db, aspect.id)) {
      if (diamondFaceMatches(face, needle)) {
        results.push({
          ...enriched,
          matchKind: 'diamond_face',
          matchedDiamondFace: {
            name: face.name,
            symbol: face.symbol,
            mantra: face.mantra,
          },
        });
      }
    }
  }

  return results;
}

module.exports = { searchAspectDirectory, aspectMasterMatches, diamondFaceMatches };