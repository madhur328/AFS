/** Canonical Base Layer — mirrors data/base-layer.json */

export const BASE_LAYER_SLOTS = [
  { symbol: '⚓', name: 'Anchor of Stability', mantra: 'I am the still lake', loreKey: 'anchor', proficiencyPct: 70 },
  { symbol: '🔥', name: 'Fire of Conviction', mantra: 'Born on fire', loreKey: 'fire', proficiencyPct: 75 },
  { symbol: '🔑', name: 'Key of Clarity', mantra: 'I see clearly', loreKey: 'clarity', proficiencyPct: 50 },
  { symbol: '🌪️', name: 'Tornado of Momentum', mantra: 'Momentum is real', loreKey: 'tornado', proficiencyPct: 68 },
  { symbol: '🔗', name: 'Chain of Synchronisation', mantra: 'I chain intention to action', loreKey: 'chain', proficiencyPct: 55 },
  { symbol: '🧬', name: 'Helix of Adaptability', mantra: 'I adapt without losing my core', loreKey: 'helix', proficiencyPct: 60 },
] as const;

export const BASE_LAYER_SYMBOLS = BASE_LAYER_SLOTS.map((s) => s.symbol);

export const BASE_LAYER_MAP: Record<string, { name: string; mantra: string }> = Object.fromEntries(
  BASE_LAYER_SLOTS.map((s) => [s.symbol, { name: s.name, mantra: s.mantra }])
);

export const BASE_LAYER_LABEL = `Base Layer (${BASE_LAYER_SLOTS.length})`;

export const BASE_LAYER_CODEX =
  '⚓ Anchor · 🔥 Fire · 🔑 Clarity · 🌪️ Tornado · 🔗 Chain · 🧬 Helix';

/** Former base slots — now derived aspects only */
export const DERIVED_FROM_REMOVED_BASE = [
  { symbol: '🔶', name: 'Forge / Value', derivesFrom: '🔑' },
  { symbol: '🛡️🌱', name: 'Unwavering Heart', derivesFrom: '🔥' },
  { symbol: '💎', name: 'Signal / Structure', derivesFrom: '🔑' },
] as const;

export function baseLayerDisplay(link: string): string {
  const entry = BASE_LAYER_MAP[link];
  return entry ? `${link} ${entry.name}` : link;
}