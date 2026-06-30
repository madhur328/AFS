import type { Aspect } from './api';
import type { AspectFullDetail } from './aspect-detail';
import { isGenericRadiantFaces } from './aspect-detail';

/** Save8 clarified synthesis grades */
export type AspectQuality = 'basic' | 'diamond' | 'resonant' | 'infinite';

export const SYNTHESIS_TOOLS = ['EOT', 'DCS', 'RCS', 'RDTQ'] as const;
export const FACET_OPERATORS = ['DCS', 'RCS', 'RDTQ'] as const;

export const ASPECT_QUALITY_LABELS: Record<AspectQuality, string> = {
  basic: 'Basic Aspect',
  diamond: 'Diamond Aspect',
  resonant: 'Resonant Diamond Aspect',
  infinite: 'Infinitely Resonant Diamond Aspect',
};

export const ASPECT_QUALITY_HINTS: Record<AspectQuality, string> = {
  basic: 'EOT → basic — mantra & integration only',
  diamond: 'EOT → DCS — diamond radiant-face lattice',
  resonant: 'EOT → RCS — cultural & multi-meaning resonance (FMH)',
  infinite: 'EOT → RDTQ — Hamsa synthesis, finite → infinite',
};

export function gradeFromOperator(operator: string): AspectQuality {
  switch (operator) {
    case 'RDTQ':
      return 'infinite';
    case 'RCS':
      return 'resonant';
    case 'DCS':
      return 'diamond';
    default:
      return 'basic';
  }
}

export function resolveAspectQuality(
  aspect: Pick<Aspect, 'tier' | 'category'>,
  detail: {
    radiantFaces?: AspectFullDetail['radiantFaces'];
    diamondFaces?: AspectFullDetail['diamondFaces'];
    integration?: AspectFullDetail['integration'];
    masterFusion?: AspectFullDetail['masterFusion'];
  } = {}
): AspectQuality {
  const faces = detail.radiantFaces ?? detail.diamondFaces ?? [];
  const hasFacets = faces.length >= 2 && !isGenericRadiantFaces(faces);
  const routedTool =
    detail.integration?.routedTool || detail.integration?.operator || 'AFP';

  if (!hasFacets) return 'basic';

  const routed = gradeFromOperator(routedTool);
  if (routed !== 'basic') return routed;

  if (routedTool === 'EOT') {
    if (detail.masterFusion?.name && aspect.category === 'red-leaf') return 'infinite';
    return 'diamond';
  }

  if (aspect.tier === 'S' || aspect.tier === 'A') return 'diamond';

  return 'basic';
}

/** Legacy values before Save8 4-tier grades. */
export function normalizeAspectQuality(quality?: string | null): AspectQuality {
  if (quality === 'master') return 'infinite';
  if (quality === 'diamond' || quality === 'resonant' || quality === 'infinite' || quality === 'basic') {
    return quality;
  }
  return 'basic';
}

export function canHaveRadiantFaces(quality: AspectQuality | string | undefined): boolean {
  const q = normalizeAspectQuality(quality);
  return q === 'diamond' || q === 'resonant' || q === 'infinite';
}

export function showsFacetEditor(operator: string): boolean {
  return FACET_OPERATORS.includes(operator as (typeof FACET_OPERATORS)[number]);
}

export function formatEotRoutingLabel(integration?: {
  entryTool?: string;
  routedTool?: string;
  operator?: string;
}): string {
  const entry = integration?.entryTool || 'EOT';
  const routed = integration?.routedTool || integration?.operator || entry;
  if (routed === 'EOT') return `${entry} → basic`;
  return `${entry} → ${routed}`;
}

export function aspectQualityFromFaceIndex(aspect: Aspect, indexedFaceCount: number): AspectQuality {
  if (indexedFaceCount >= 2) return 'diamond';
  if (aspect.category === 'meta' || aspect.is_base_layer) return 'diamond';
  return 'basic';
}