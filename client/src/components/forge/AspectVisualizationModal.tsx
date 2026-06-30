import { useEffect, useState } from 'react';
import { forgeAspectImageUrl } from '../../lib/forge-aspect-images';

export interface VizSubject {
  symbol: string;
  name: string;
  mantra: string;
  aura?: string;
  prompt?: string;
  deepInsight?: string;
  imageUrl?: string | null;
  aspectKey?: string;
  glyphs?: string;
}

export default function AspectVisualizationModal({
  subject,
  onClose,
}: {
  subject: VizSubject | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!subject) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [subject, onClose]);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!subject) {
      setImgSrc(null);
      setImgFailed(false);
      return;
    }
    setImgFailed(false);
    setImgSrc(subject.imageUrl || (subject.aspectKey ? forgeAspectImageUrl(subject.aspectKey) : null));
  }, [subject]);

  if (!subject) return null;

  const glow = subject.aura || 'steady downward column';

  const handleImgError = () => {
    if (imgFailed || !subject.aspectKey) return;
    const loreData = forgeAspectImageUrl(subject.aspectKey, true);
    const baseData = forgeAspectImageUrl(subject.aspectKey, false);
    if (imgSrc !== loreData && loreData) {
      setImgSrc(loreData);
      return;
    }
    if (imgSrc !== baseData && baseData) {
      setImgSrc(baseData);
      return;
    }
    setImgFailed(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#020810]">
      {/* Cyan descent rays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-3 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 w-px bg-gradient-to-b from-cyan-400/70 via-cyan-500/25 to-transparent"
            style={{ marginLeft: i === 0 ? 0 : undefined, opacity: 0.35 + i * 0.1 }}
          />
        ))}
      </div>

      {/* Ambient halo */}
      <div
        className="pointer-events-none absolute left-1/2 top-[38%] h-[min(68vh,560px)] w-[min(78vw,820px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(68,170,204,0.28) 0%, transparent 70%)' }}
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded border border-cyan-500/50 bg-black/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-950/40"
      >
        Exit · ESC
      </button>

      <div className="relative flex h-full flex-col items-center justify-center px-6 pb-36 pt-16">
        <div className="relative z-10 max-w-3xl border border-white/90 bg-black/20 p-1 shadow-[0_0_80px_rgba(0,0,0,0.65)]">
          {imgSrc && !imgFailed ? (
            <img
              src={imgSrc}
              alt={subject.name}
              onError={handleImgError}
              className="mx-auto max-h-[min(52vh,520px)] max-w-[min(72vw,880px)] object-contain"
            />
          ) : (
            <div className="flex h-64 w-[min(72vw,640px)] items-center justify-center bg-[#0a1e30] text-6xl">
              {subject.symbol || subject.glyphs}
            </div>
          )}
          <div className="border-t border-white/20 py-2 text-center text-2xl text-white/90">
            {subject.symbol || (subject.glyphs || '').split(' ')[0]}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/95 to-transparent px-6 pb-14 pt-24 text-center">
          <h1 className="font-display text-3xl font-bold tracking-wide text-[#ffd700] md:text-4xl">
            {subject.name}
          </h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">
            {glow}
          </p>
          <p className="mt-4 text-base italic tracking-wide text-cyan-300">
            &ldquo;{subject.mantra}&rdquo;
          </p>
          {subject.prompt && (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/80">
              {subject.prompt}
            </p>
          )}
          {subject.deepInsight && (
            <p className="mx-auto mt-3 max-w-2xl border-t border-white/10 pt-4 text-xs leading-relaxed text-amber-100/75">
              {subject.deepInsight}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}