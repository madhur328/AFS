export type GrokMilestone = {
  label: string;
  /** Session type filter */
  type?: 'daily' | 'AFP' | 'EOT' | 'codex' | 'origin';
  /** Title search to locate the session */
  query: string;
  /** Precise session index when title search is ambiguous */
  sessionIndex?: number;
};

export const GENESIS_CONV_ID = '37560952-5989-4407-a50e-cfb153c0fdaf';
export const SHARE3_CONV_ID = '30fe2380-069b-42b8-bffe-b64689325eaf';

export const GENESIS_GROK_URL = `https://grok.com/c/${GENESIS_CONV_ID}`;
export const SHARE3_GROK_URL =
  'https://grok.com/share/c2hhcmQtMw_30fe2380-069b-42b8-bffe-b64689325eaf';

export const GENESIS_MILESTONES: GrokMilestone[] = [
  { label: 'Fallen Valkyrie poem', type: 'origin', query: 'Fallen Valkyrie', sessionIndex: 1 },
  {
    label: 'Symbolic journaling → Stability / Anchor',
    query: 'continuation of the texts',
    sessionIndex: 5,
  },
  { label: 'Five core symbols ⚓🔥🌱🌪️🚂', query: 'anchor provides stability', sessionIndex: 6 },
  {
    label: 'Aspect Mastery named',
    type: 'codex',
    query: 'After building a transformative',
    sessionIndex: 7,
  },
  { label: 'Aspect Forge Protocol (AFP)', type: 'AFP', query: 'Goal Name', sessionIndex: 9 },
  { label: 'Base Layer formalized', type: 'AFP', query: 'Lovy: Alchemical', sessionIndex: 36 },
  { label: 'EOT cluster → Mind Guardian Set', type: 'EOT', query: 'Tanjiro', sessionIndex: 42 },
  { label: 'Red Leaf / ENTHEA / @madhur328', type: 'EOT', query: 'Akahitoha', sessionIndex: 100 },
];

export const SHARE3_MILESTONES: GrokMilestone[] = [
  {
    label: 'Synergistically fuse — cosmic sphere visual',
    type: 'origin',
    query: 'fuse with cosmic',
    sessionIndex: 78,
  },
  {
    label: 'Five AFP symbols + fit analysis',
    type: 'daily',
    query: 'Five AFP Symbols',
    sessionIndex: 2,
  },
  {
    label: 'Daily rituals per symbol',
    type: 'daily',
    query: 'Five AFP Symbols',
    sessionIndex: 2,
  },
  {
    label: 'Alchemical formulas 🔥🪽⚓=🌪️',
    type: 'codex',
    query: 'Alchemical formulas',
    sessionIndex: 4,
  },
  {
    label: 'Mirror of Truth + Whirlpool',
    type: 'codex',
    query: 'momentum + reflection',
    sessionIndex: 4,
  },
  {
    label: 'Unwavering Heart → 🛡️🌱',
    type: 'codex',
    query: 'Mountain Heart',
    sessionIndex: 28,
  },
  {
    label: 'DFS / Save integration',
    type: 'codex',
    query: 'Daily Forge Run',
    sessionIndex: 30,
  },
];

export function grokConversationUrl(convId?: string | null, convUrl?: string | null): string | undefined {
  if (convUrl) return convUrl;
  if (!convId) return undefined;
  if (convId.startsWith('37560952')) return GENESIS_GROK_URL;
  if (convId.startsWith('30fe2380')) return SHARE3_GROK_URL;
  return `https://grok.com/c/${convId}`;
}

export function milestonesForConversation(convId?: string | null): GrokMilestone[] {
  if (convId?.startsWith('30fe2380')) return SHARE3_MILESTONES;
  return GENESIS_MILESTONES;
}