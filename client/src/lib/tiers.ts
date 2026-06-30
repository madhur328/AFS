/** Aspect tier = inherent potential, not mentions or synergy link count. */
export function tierFromPotential(potential: number, isBase = false): string {
  if (isBase) return 'S';
  const p = Number(potential);
  if (!Number.isFinite(p)) return 'D';
  if (p >= 0.85) return 'S';
  if (p >= 0.7) return 'A';
  if (p >= 0.55) return 'B';
  if (p >= 0.4) return 'C';
  return 'D';
}

export const TIER_POTENTIAL_LABELS: Record<string, string> = {
  S: '≥ 85% inherent potential',
  A: '70–84% inherent potential',
  B: '55–69% inherent potential',
  C: '40–54% inherent potential',
  D: '< 40% inherent potential',
};