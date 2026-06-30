import { useMemo, useState } from 'react';
import { isEmojiGrapheme, segmentMixedText, splitGraphemes } from '../lib/symbols';
import {
  applyEmojiFallbacks,
  expandRenderableGraphemes,
  normalizeEmojiGrapheme,
  twemojiAssetUrl,
} from '../lib/twemoji-url';

type EmojiSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface Props {
  text: string;
  className?: string;
  size?: EmojiSize;
  title?: string;
  /** Render emoji via Twemoji inside prose; leave plain text as-is */
  mixed?: boolean;
  /** Keep symbol chains on one line (aspect cards, face rows) */
  nowrap?: boolean;
}

/** Twemoji PNG is more reliable on Windows 10 than SVG or native fonts (e.g. 🪽 🪞). */
function prefersPngFirst(grapheme: string): boolean {
  return isEmojiGrapheme(grapheme);
}

function resolveFormat(attempt: number, pngFirst: boolean, chainMode: boolean): 'png' | 'svg' | 'native' {
  if (attempt === 0) return pngFirst ? 'png' : 'svg';
  if (attempt === 1) return 'png';
  if (attempt === 2) return 'svg';
  return chainMode ? 'png' : 'native';
}

function EmojiGraphemeSingle({
  grapheme,
  title,
  chainMode,
}: {
  grapheme: string;
  title?: string;
  chainMode?: boolean;
}) {
  const pngFirst = chainMode || prefersPngFirst(grapheme);
  const [attempt, setAttempt] = useState(0);
  const clean = normalizeEmojiGrapheme(grapheme);
  if (!clean) return null;

  const format = resolveFormat(attempt, pngFirst, Boolean(chainMode));

  if (format === 'native') {
    return (
      <span className="emoji-native" title={title} aria-hidden>
        {clean}
      </span>
    );
  }

  return (
    <img
      className="emoji-img"
      src={twemojiAssetUrl(clean, format)}
      alt={clean}
      title={title}
      draggable={false}
      loading="lazy"
      onError={() => setAttempt((a) => (a >= 3 ? a : a + 1))}
    />
  );
}

function EmojiGrapheme({
  grapheme,
  title,
  chainMode,
}: {
  grapheme: string;
  title?: string;
  chainMode?: boolean;
}) {
  const expanded = useMemo(() => expandRenderableGraphemes(grapheme), [grapheme]);
  if (expanded.length > 1) {
    return (
      <>
        {expanded.map((part, i) => (
          <EmojiGraphemeSingle
            key={`${part}-${i}`}
            grapheme={part}
            title={i === 0 ? title : undefined}
            chainMode={chainMode}
          />
        ))}
      </>
    );
  }

  return (
    <EmojiGraphemeSingle
      grapheme={expanded[0] || grapheme}
      title={title}
      chainMode={chainMode}
    />
  );
}

export default function EmojiText({
  text,
  className = '',
  size = 'md',
  title,
  mixed = false,
  nowrap = false,
}: Props) {
  const safeText = useMemo(
    () => applyEmojiFallbacks((text || '').replace(/\uFFFD/g, '').replace(/\u25A1/g, '')),
    [text]
  );
  const graphemes = useMemo(() => splitGraphemes(safeText), [safeText]);
  const mixedSegments = useMemo(() => (mixed ? segmentMixedText(safeText) : []), [mixed, safeText]);

  if (!safeText) return null;

  const chainMode = !mixed;

  if (mixed) {
    return (
      <span
        className={`emoji-text emoji-text--mixed emoji-text--${size} ${className}`.trim()}
        title={title}
      >
        {mixedSegments.map((seg, i) =>
          seg.type === 'emoji' ? (
            <EmojiGrapheme key={`e-${i}`} grapheme={seg.value} chainMode={false} />
          ) : (
            <span key={`t-${i}`} className="emoji-text-plain">
              {seg.value}
            </span>
          )
        )}
      </span>
    );
  }

  return (
    <span
      className={`emoji-text emoji-text--${size}${nowrap ? ' emoji-text--nowrap' : ''} ${className}`.trim()}
      title={title}
    >
      {graphemes.map((g, i) =>
        isEmojiGrapheme(g) ? (
          <EmojiGrapheme
            key={`${g}-${i}`}
            grapheme={g}
            title={i === 0 ? title : undefined}
            chainMode={chainMode}
          />
        ) : (
          <span key={`${g}-${i}`} className="emoji-text-plain" title={i === 0 ? title : undefined}>
            {g}
          </span>
        )
      )}
    </span>
  );
}