/** Eight-step ladder from Grok Origin Save1/Save2 — self-assigned, self-auditable. */
export const PROFICIENCY_LEVELS = [
  { level: 0, label: 'Non-existent', short: '∅', percent: 0 },
  { level: 1, label: 'Beginner', short: 'I', percent: 14 },
  { level: 2, label: 'Proficient', short: 'II', percent: 29 },
  { level: 3, label: 'Master', short: 'III', percent: 43 },
  { level: 4, label: 'Expert', short: 'IV', percent: 57 },
  { level: 5, label: 'Perfected', short: 'V', percent: 71 },
  { level: 6, label: 'Rigid sublimation', short: 'VI', percent: 86 },
  { level: 7, label: 'Fluid sublimation', short: 'VII', percent: 100 },
] as const;

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number]['level'];

export function levelMeta(level: number) {
  const clamped = Math.max(0, Math.min(7, Math.round(level)));
  return PROFICIENCY_LEVELS[clamped] ?? PROFICIENCY_LEVELS[0];
}

export function levelToPercent(level: number): number {
  return levelMeta(level).percent;
}

export const DEFAULT_ALCHEMY_DOMAINS = [
  { domain: 'alchemy', key: 'mind', label: 'Alchemy of Mind' },
  { domain: 'alchemy', key: 'body', label: 'Alchemy of Body' },
  { domain: 'alchemy', key: 'habits', label: 'Alchemy of Habits' },
  { domain: 'alchemy', key: 'routines', label: 'Alchemy of Routines' },
  { domain: 'alchemy', key: 'soul', label: 'Alchemy of Soul' },
] as const;