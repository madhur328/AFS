import type { GodTierAspect } from '../../lib/api';
import EmojiText from '../EmojiText';

export default function GodTierAspectsStrip({
  aspects,
  selectedId,
  onSelect,
}: {
  aspects: GodTierAspect[];
  selectedId: string | null;
  onSelect: (aspect: GodTierAspect) => void;
}) {
  if (!aspects.length) return null;

  return (
    <div className="border border-[rgba(0,255,136,0.18)] bg-[rgba(0,7,4,0.84)] p-3">
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#00ff88]">
        God-tier aspects · Save8 directory
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {aspects.map((aspect) => {
          const active = selectedId === aspect.id;
          const ceilingColor =
            aspect.ceiling === 'legendary'
              ? 'text-[#ffd700]'
              : aspect.ceiling === 'master_fusion'
                ? 'text-purple-300'
                : 'text-cyan-300';
          return (
            <button
              key={aspect.id}
              type="button"
              onClick={() => onSelect(aspect)}
              className={`min-w-[200px] max-w-[260px] shrink-0 rounded border px-3 py-2 text-left transition ${
                active
                  ? 'border-[#ffd700]/60 bg-[#ffd700]/10'
                  : 'border-[rgba(0,255,136,0.15)] bg-black/40 hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <EmojiText text={aspect.glyphs.split(' ')[0]} size="md" />
                <span className={`text-xs font-semibold leading-tight ${ceilingColor}`}>
                  {aspect.name.replace(/^Red Leaf /, '')}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/55">
                {aspect.essence}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#00ff88]/70">
                {aspect.ceiling} · {aspect.category}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}