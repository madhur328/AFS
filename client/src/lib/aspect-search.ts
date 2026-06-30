import type { Aspect } from './api';
import type { RadiantFace } from './aspect-detail';
import { canHaveRadiantFaces, aspectQualityFromFaceIndex } from './aspect-quality';
import { searchAliasPhrases } from './aspect-search-aliases';
import { fieldsMatchQuery } from './search-query';

export interface DiamondFaceMatch {
  name: string;
  symbol: string;
  mantra: string;
  explanation?: string;
}

export type AspectDirectoryRow = Aspect & {
  matchKind?: 'master' | 'diamond_face';
  matchedDiamondFace?: DiamondFaceMatch;
};

export function aspectMasterMatches(aspect: Aspect, q: string): boolean {
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

export function diamondFaceMatches(
  face: Pick<RadiantFace, 'name' | 'symbol' | 'mantra' | 'explanation'>,
  q: string
): boolean {
  return fieldsMatchQuery([face.name, face.mantra, face.symbol, face.explanation || ''], q);
}

export function searchAspectDirectory(
  aspects: Aspect[],
  resolveFaces: (aspect: Aspect) => RadiantFace[],
  options: { q?: string; tier?: string; category?: string }
): AspectDirectoryRow[] {
  let rows = aspects;
  if (options.tier) rows = rows.filter((a) => a.tier === options.tier);
  if (options.category) rows = rows.filter((a) => a.category === options.category);
  const q = options.q?.trim();
  if (!q) return rows;

  const results: AspectDirectoryRow[] = [];
  for (const aspect of rows) {
    if (aspectMasterMatches(aspect, q)) {
      results.push({ ...aspect, matchKind: 'master' });
    }
    const faceCount = resolveFaces(aspect).length;
    const quality = aspectQualityFromFaceIndex(aspect, faceCount);
    if (!canHaveRadiantFaces(quality)) continue;

    for (const face of resolveFaces(aspect)) {
      if (diamondFaceMatches(face, q)) {
        results.push({
          ...aspect,
          matchKind: 'diamond_face',
          matchedDiamondFace: {
            name: face.name,
            symbol: face.symbol,
            mantra: face.mantra,
            explanation: face.explanation,
          },
        });
      }
    }
  }
  return results;
}

export function directoryRowKey(row: AspectDirectoryRow): string {
  return `${row.id}-${row.matchKind ?? 'master'}-${row.matchedDiamondFace?.name ?? ''}`;
}

/** Template diamond faces reused across many master aspects (search shows one row per parent). */
const GENERIC_DIAMOND_FACE_RE =
  /^(Raw\s+\w+\s+Witness|Heart Alignment|Red Leaf Descent|\w+\s+Ascent|\w+\s+Integration)$/i;

export function isGenericDiamondFaceName(name: string): boolean {
  return GENERIC_DIAMOND_FACE_RE.test(name.trim());
}

/** List card title — parent aspect first when the face name is a generic template. */
export function directoryDisplayName(row: AspectDirectoryRow): string {
  if (row.matchKind === 'diamond_face' && row.matchedDiamondFace) {
    const face = row.matchedDiamondFace.name;
    if (isGenericDiamondFaceName(face)) return `${row.name} — ${face}`;
    return face;
  }
  return row.name;
}