import { render, screen } from '@testing-library/react';
import EmojiText from './EmojiText';

describe('EmojiText', () => {
  it('renders Twemoji images for symbol chains', () => {
    render(<EmojiText text="🍁🔥🪞" size="lg" />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThanOrEqual(3);
    for (const img of imgs) {
      expect(img).toHaveAttribute('src', expect.stringMatching(/twemoji@16/));
    }
  });

  it('strips replacement characters from input', () => {
    const { container } = render(<EmojiText text="🍁\uFFFD🔥" size="md" />);
    expect(container.textContent).not.toContain('\uFFFD');
  });

  it('renders mixed prose with emoji and plain text', () => {
    render(<EmojiText text="Forge 🍁 with heart ❤️" mixed size="sm" />);
    expect(screen.getByText(/Forge/)).toBeInTheDocument();
    expect(screen.getByText(/with heart/)).toBeInTheDocument();
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2);
  });

  it('renders Michelangelo facet symbols without error', () => {
    const symbols = ['🍁🎨🌟💥', '🍁🖌️😭🔄', '🍁🤖🎨🗑️', '🍁⏰🔥🚀', '🍁😂🪞🌟'];
    for (const symbol of symbols) {
      const { unmount } = render(<EmojiText text={symbol} size="md" nowrap />);
      expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('returns null for empty text', () => {
    const { container } = render(<EmojiText text="" />);
    expect(container.firstChild).toBeNull();
  });
});