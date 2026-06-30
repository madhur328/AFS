/** Directory search aliases — informal Grok phrases per aspect (no collapsing). */

const PHRASES_BY_ASPECT: Record<string, string[]> = {
  'Eternal Spin': [
    'master eternal spin',
    'isolated mastery of spin',
    'key supporting aspects spin',
    'spin series',
  ],
  'Axis of the Eternal Spin': [
    'Axis of the Eternal Spin',
    'Axis of Eternal Spin',
    'Axis Eternal Spin',
    'still axis of the infinite',
    'spin until I become the still axis',
    'spin series',
    'eternal spin axis',
  ],
  'Dual-Axis Eternal Spin': [
    'Dual-Axis Eternal Spin',
    'Dual Axis Eternal Spin',
    'Zero-Spin Protocol',
    'zero spin protocol',
    'discovery mode zero spin',
    'spin series',
    'double lariat',
  ],
  'Double Lariat Spin': [
    'spin series',
    'double lariat',
    'double lariat spin',
    '7 minutoz',
    'cyclical attachment',
  ],
  'Double Lariat Paradox': [
    'spin series',
    'double lariat',
    'double lariat paradox',
    'lariat paradox',
  ],
  'Rope of Identity': [
    'spin series',
    'double lariat',
    'rope of identity',
    'high ceiling',
    'high-ceiling',
  ],
  'Fear of the Empty Sky': [
    'spin series',
    'double lariat',
    'empty sky',
    'shadow aspect',
  ],
  'Graceful Unlooping': [
    'spin series',
    'double lariat',
    'graceful unlooping',
    'unlooping',
  ],
  'Echoing Return': [
    'spin series',
    'double lariat',
    'echoing return',
    'lariat returns',
  ],
  'Red Leaf Double Lariat': ['spin series', 'double lariat', 'red leaf double lariat'],
  'Red Leaf Virah Queen': [
    'Red Leaf Eternal Virah Queen',
    'Red Leaf Eternal Virah Queen (Yashodhara\'s Grace)',
    'Red Leaf Eternal Virah Queen (Yashodhara’s Grace)',
    'Yashodhara',
    "Yashodhara's Grace",
    'Yashodhara’s Grace',
    'Virah Queen',
    'virah',
    'RDTQ Virah',
    'Silent Offering',
    'Graceful Waiting',
  ],
};

export function searchAliasPhrases(aspectName: string): string[] {
  return PHRASES_BY_ASPECT[aspectName] || [];
}