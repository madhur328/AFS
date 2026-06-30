/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface SegmenterOptions {
  granularity?: 'grapheme' | 'word' | 'sentence';
}

interface SegmentData {
  segment: string;
  index: number;
  input: string;
  isWordLike?: boolean;
}

declare namespace Intl {
  class Segmenter {
    constructor(locales?: string | string[], options?: SegmenterOptions);
    segment(input: string): Iterable<SegmentData>;
  }
}

declare module 'twemoji' {
  interface TwemojiOptions {
    base?: string;
    ext?: string;
    folder?: string;
    className?: string;
  }
  function parse(node: string, options?: TwemojiOptions): string;
  namespace convert {
    function toCodePoint(emoji: string): string;
  }
  const twemoji: { parse: typeof parse; convert: typeof convert };
  export default twemoji;
}