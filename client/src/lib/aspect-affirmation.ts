export type AffirmationRelation =
  | 'identical'
  | 'subset'
  | 'different'
  | 'mantra_only'
  | 'core_only'
  | 'both_empty';

export function stripAffirmationQuotes(s: string | null | undefined): string {
  return String(s || '').trim().replace(/^["']|["']$/g, '');
}

function norm(s: string): string {
  return stripAffirmationQuotes(s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function affirmationRelation(
  mantra: string | null | undefined,
  core: string | null | undefined
): AffirmationRelation {
  const m = stripAffirmationQuotes(mantra);
  const c = stripAffirmationQuotes(core);
  if (!m && !c) return 'both_empty';
  if (!m) return 'core_only';
  if (!c) return 'mantra_only';
  const nm = norm(m);
  const nc = norm(c);
  if (nm === nc || m === c) return 'identical';
  if (nc.includes(nm) || nm.includes(nc)) return 'subset';
  const embodyTail = c.replace(/^I embody[^:]+:\s*/i, '');
  if (c.match(/^I embody .+:\s*/i) && norm(embodyTail) === nm) return 'subset';
  return 'different';
}

/** True when mantra is a distinct short trigger, not mergeable with core. */
export function affirmationsAreSeparate(
  mantra: string | null | undefined,
  core: string | null | undefined
): boolean {
  return affirmationRelation(mantra, core) === 'different';
}

/** Single display/storage value when mantra + core collapse. */
export function mergedSelfAffirmation(
  mantra: string | null | undefined,
  core: string | null | undefined
): string {
  const c = stripAffirmationQuotes(core);
  const m = stripAffirmationQuotes(mantra);
  if (c) return c;
  return m;
}

export interface ResolvedAffirmations {
  merged: boolean;
  selfAffirmation: string;
  triggerMantra?: string;
}

export function resolveAffirmations(
  mantra: string | null | undefined,
  core: string | null | undefined
): ResolvedAffirmations {
  const m = stripAffirmationQuotes(mantra);
  const c = stripAffirmationQuotes(core);
  const separate = affirmationsAreSeparate(m, c);
  if (separate) {
    return {
      merged: false,
      selfAffirmation: c,
      triggerMantra: m,
    };
  }
  return {
    merged: true,
    selfAffirmation: mergedSelfAffirmation(m, c),
  };
}