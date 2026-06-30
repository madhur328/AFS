import type { LoreEntry } from './api';

/** Long-form myths seeded from data/lore-stories/{key}.txt */
export const EXPANDABLE_MYTH_KEYS = new Set([
  'fallen-valkyrie',
  'invisible-enemy',
  'stone-god-cannot-lift',
  'final-lightkeeper',
  'awakening-river',
]);

const FALLBACK_EXCERPTS: Record<string, string> = {
  'fallen-valkyrie':
    'A valkyrie destined to fly forgot her wings, mistook nurturing for restriction, and bound herself in chains of her own making. Through honest tears and return to origin, she remembered — and grew new wings.\n\nCore teaching: What is forgotten becomes chains. What is remembered becomes wings.',
  'invisible-enemy':
    'The invisible enemy lives inside — well hidden, always close. It chips at meaning and dresses illusion as undefeatable fate. It chases until you flee; when you turn and confront it, its power is seen-through fog.\n\nCore teaching: What is examined loses the power of illusion.',
  'stone-god-cannot-lift':
    'Can God create a stone so heavy they cannot lift it? A prodigy who rejected destiny became that stone — dead dreams pulling everything down. Until the paradox revealed that meaning survives when achievement is no longer worshipped as god.\n\nCore teaching: Sacred ruins of dead dreams still deserve reverence; tend the light that remains.',
  'final-lightkeeper':
    'I used to reject the idea of destiny. Fate sounded like surrender disguised as wisdom — until failure did not leave, and dead dreams became sacred ruins I could not throw away.\n\nCore teaching: Tend the light entrusted to you, even when storms gather around the tower.',
  'awakening-river':
    'You arrived in this World as a baby — weak, wondering, learning to walk and talk through falls and tears. No two moments are alike, yet continuity connects us all.\n\nCore teaching: The lamps are different, but the Light is the same. Awaken the Heart — the River flows through us all.',
};

const LONG_MYTH_CHARS = 800;

export function mythExcerpt(entry: LoreEntry): string {
  return entry.excerpt || FALLBACK_EXCERPTS[entry.key] || entry.content;
}

export function mythIsExpandable(entry: LoreEntry, activeTab?: string): boolean {
  const onMythTab = activeTab === 'myth' || entry.section === 'myth';
  if (!onMythTab) return false;
  if (EXPANDABLE_MYTH_KEYS.has(entry.key)) return true;
  if (entry.expandable && entry.excerpt) return true;
  const excerpt = mythExcerpt(entry);
  return entry.content.length > excerpt.length + 120 || entry.content.length >= LONG_MYTH_CHARS;
}

export function mythHasFullBody(entry: LoreEntry): boolean {
  const excerpt = mythExcerpt(entry);
  return entry.content.length > excerpt.length + 120;
}