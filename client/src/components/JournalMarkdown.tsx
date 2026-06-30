import { useMemo } from 'react';
import EmojiText from './EmojiText';
import { repairTruncatedSymbolChain, splitTrailingSymbolChain } from '../lib/symbols';

function cleanText(text: string) {
  return text
    .replace(/\uFFFD/g, '')
    .replace(/\u25A1/g, '')
    .replace(/\*\*\*\*/g, '**')
    .replace(/\*\*Symbol Chain:\*\*\s*/gi, '**Symbol Chain:** ');
}

const EMOJI_ONLY_RE =
  /^[\s\p{Extended_Pictographic}\uFE0F\u200D]+$/u;

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'symbol-chain'; chain: string }
  | { type: 'face-symbol'; symbols: string; label?: string }
  | { type: 'paragraph'; text: string }
  | { type: 'divider' };

function parseBlocks(content: string): Block[] {
  const lines = cleanText(content).split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let pendingFaceLabel: string | undefined;

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      pendingFaceLabel = undefined;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      pendingFaceLabel = undefined;
      blocks.push({ type: 'divider' });
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      pendingFaceLabel = undefined;
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].replace(/\*\*/g, '') });
      continue;
    }

    const chainInline = trimmed.match(/^\*\*Symbol Chain:\*\*\s*(.+)$/i);
    if (chainInline) {
      flushParagraph();
      pendingFaceLabel = undefined;
      blocks.push({
        type: 'symbol-chain',
        chain: chainInline[1].replace(/\*\*/g, '').trim(),
      });
      continue;
    }

    const faceHeading = trimmed.match(/^\d+\.\s*\*\*([^*]+)\*\*/);
    if (faceHeading) {
      flushParagraph();
      pendingFaceLabel = faceHeading[1].trim();
      blocks.push({ type: 'paragraph', text: trimmed });
      continue;
    }

    if (EMOJI_ONLY_RE.test(trimmed) && trimmed.length <= 24) {
      flushParagraph();
      blocks.push({ type: 'face-symbol', symbols: trimmed.replace(/\s+/g, ''), label: pendingFaceLabel });
      pendingFaceLabel = undefined;
      continue;
    }

    pendingFaceLabel = undefined;
    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}

function renderInline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={`${key}-b-${i}`} className="font-semibold text-white">
          <EmojiText text={bold[1]} mixed size="sm" />
        </strong>
      );
    }
    return (
      <span key={`${key}-t-${i}`}>
        <EmojiText text={part} mixed size="sm" />
      </span>
    );
  });
}

export default function JournalMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-white/90">
      {blocks.map((block, i) => {
        if (block.type === 'divider') {
          return <hr key={i} className="border-forge-border/60" />;
        }
        if (block.type === 'heading') {
          const Tag = block.level <= 2 ? 'h3' : 'h4';
          return (
            <Tag
              key={i}
              className={`font-display font-bold text-white ${block.level <= 2 ? 'text-xl' : 'text-lg'}`}
            >
              <EmojiText text={block.text} mixed size="sm" />
            </Tag>
          );
        }
        if (block.type === 'symbol-chain') {
          return (
            <div key={i} className="rounded-xl border border-forge-cyan/25 bg-forge-cyan/5 px-4 py-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-forge-cyan">Symbol Chain</p>
              <div className="flex flex-wrap items-center gap-2">
                <EmojiText text={block.chain} size="2xl" />
              </div>
            </div>
          );
        }
        if (block.type === 'face-symbol') {
          return (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-forge-border/50 bg-white/[0.02] px-3 py-2">
              <EmojiText text={block.symbols} size="xl" />
              {block.label && (
                <span className="text-xs text-forge-muted">{block.label}</span>
              )}
            </div>
          );
        }
        const { body, chain } = splitTrailingSymbolChain(block.text);
        const symbolChain = chain ? repairTruncatedSymbolChain(chain, block.text) : null;
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(body, `p-${i}`)}
            {symbolChain && (
              <span className="emoji-chain-inline ml-1">
                <EmojiText text={symbolChain} size="2xl" />
              </span>
            )}
          </p>
        );
      })}
    </div>
  );
}