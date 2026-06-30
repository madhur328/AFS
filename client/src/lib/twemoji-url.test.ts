import {
  applyEmojiFallbacks,
  normalizeEmojiGrapheme,
  expandRenderableGraphemes,
  emojiCodePointForUrl,
  twemojiAssetUrl,
  TWEMOJI_BASE,
} from './twemoji-url';

describe('twemoji-url', () => {
  it('applies ZWJ fallbacks from shared config', () => {
    expect(applyEmojiFallbacks('❤️‍🔥')).toBe('❤️🔥');
    expect(applyEmojiFallbacks('🙋‍♀️')).toBe('🙋');
  });

  it('builds non-empty codepoints for Red Leaf symbol chains', () => {
    const chain = '🍁🖥️🗿✨🖨️';
    for (const g of expandRenderableGraphemes(chain)) {
      const cp = emojiCodePointForUrl(g);
      expect(cp.length).toBeGreaterThan(0);
      expect(cp).not.toBe('undefined');
      expect(twemojiAssetUrl(g)).toMatch(new RegExp(`^${TWEMOJI_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }
  });

  it('normalizes gender ZWJ suffixes', () => {
    expect(normalizeEmojiGrapheme('🏃‍♂️')).toBe('🏃');
  });

  it('strips corruption before URL encoding', () => {
    expect(normalizeEmojiGrapheme('🪞\uFFFD')).toBe('🪞');
    const url = twemojiAssetUrl('🪞');
    expect(url).not.toContain('undefined');
    expect(url).not.toContain('fffd');
  });
});