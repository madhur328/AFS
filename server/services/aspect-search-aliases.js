/**
 * Directory search aliases — informal Grok phrases per canonical aspect (no collapsing).
 */
const PHRASES_BY_ASPECT = {
  'Eternal Spin': [
    'master eternal spin',
    'isolated mastery of spin',
    'key supporting aspects spin',
  ],
  'Axis of the Eternal Spin': [
    'Axis of the Eternal Spin',
    'Axis of Eternal Spin',
    'Axis Eternal Spin',
    'still axis of the infinite',
    'spin until I become the still axis',
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
  'Axis of the Eternal Spin': ['spin series', 'eternal spin axis'],
  'Eternal Spin': ['spin series', 'master eternal spin'],
  'Red Leaf Love Trial': [
    'Red Leaf Eternal Love Trial',
    'Love Trial',
    "Ren'ai Saiban",
    '恋愛裁判',
    'game of love',
    'two-player game',
  ],
  'Red Leaf Eternal Love Trial': [
    'Red Leaf Love Trial',
    'Love Trial courtroom',
    'RCS Love Trial',
    'Master Fusion Love Trial',
  ],
  'Red Leaf Virah Queen': [
    'Red Leaf Eternal Virah Queen',
    "Red Leaf Eternal Virah Queen (Yashodhara's Grace)",
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

function searchAliasPhrases(aspectName) {
  return PHRASES_BY_ASPECT[aspectName] || [];
}

module.exports = {
  PHRASES_BY_ASPECT,
  searchAliasPhrases,
};