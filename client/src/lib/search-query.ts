const STOP_WORDS = new Set([
  'aspect',
  'aspects',
  'the',
  'a',
  'an',
  'of',
  'for',
  'my',
  'and',
  'or',
]);

export function searchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function normalizeSearchHaystack(text: string | null | undefined): string {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Every token must appear somewhere in the text (order-independent). */
export function textMatchesSearchTokens(text: string | null | undefined, tokens: string[]): boolean {
  if (!tokens.length) return false;
  const hay = normalizeSearchHaystack(text);
  return tokens.every((tok) => hay.includes(tok));
}

export function fieldsMatchQuery(
  fields: Array<string | null | undefined>,
  query: string
): boolean {
  const trimmed = query.trim();
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