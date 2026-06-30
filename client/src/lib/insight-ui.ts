import type { Insight } from './api';
import { fieldsMatchQuery } from './search-query';

export const INSIGHT_SECTIONS = [
  { id: 'synthesis', label: 'Living Synthesis', symbol: '💎' },
  { id: 'core-philosophy', label: 'Core Philosophy', symbol: '🍁' },
  { id: 'daily-practice', label: 'Daily Practice', symbol: '🔥' },
  { id: 'structures', label: 'Dual / Triadic', symbol: '🌀' },
  { id: 'governance', label: 'Governance & Truth', symbol: '⚖️' },
  { id: 'mythic', label: 'Mythic & Symbolic', symbol: '🪽' },
] as const;

export const SOURCE_FILTERS = [
  { id: '', label: 'All' },
  { id: 'save8-codex', label: 'Save8 Codex' },
  { id: 'grok-origin', label: 'Grok Archive' },
  { id: 'journal', label: 'Journal' },
  { id: 'codex', label: 'Codex' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'discord', label: 'Discord' },
] as const;

export function insightSectionId(insight: Insight): string | null {
  const tag = insight.tags.find((t) => t.startsWith('section:'));
  return tag ? tag.slice('section:'.length) : null;
}

export function insightSearchFields(insight: Insight): string[] {
  return [
    insight.title,
    insight.body,
    insight.source,
    ...insight.tags,
    ...insight.aspectLinks,
  ];
}

export function insightMatches(insight: Insight, query: string): boolean {
  return fieldsMatchQuery(insightSearchFields(insight), query);
}

export function filterInsights(items: Insight[], query: string): Insight[] {
  const q = query.trim();
  if (!q) return items;
  return items.filter((i) => insightMatches(i, q));
}

export function isCodexInsight(insight: Insight): boolean {
  return insight.source === 'save8-codex';
}

export function isArchiveInsight(insight: Insight): boolean {
  return insight.source === 'grok-origin';
}

export function groupCodexInsights(insights: Insight[]): Map<string, Insight[]> {
  const map = new Map<string, Insight[]>();
  for (const section of INSIGHT_SECTIONS) {
    map.set(section.id, []);
  }
  for (const insight of insights.filter(isCodexInsight)) {
    const sid = insightSectionId(insight) || 'core-philosophy';
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid)!.push(insight);
  }
  return map;
}

export function sectionMeta(sectionId: string) {
  return INSIGHT_SECTIONS.find((s) => s.id === sectionId);
}

export function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    'save8-codex': 'Save8',
    'grok-origin': 'Grok',
    journal: 'Journal',
    codex: 'Codex',
    twitter: 'Twitter',
    discord: 'Discord',
    user: 'User',
  };
  return map[source] || source;
}

export function sourceColor(source: string): string {
  if (source === 'save8-codex') return 'text-forge-leaf border-forge-leaf/30 bg-forge-leaf/10';
  if (source === 'grok-origin') return 'text-forge-ember border-forge-ember/30 bg-forge-ember/10';
  if (source === 'discord') return 'text-forge-cyan border-forge-cyan/30 bg-forge-cyan/10';
  return 'text-forge-muted border-forge-border bg-forge-panel';
}