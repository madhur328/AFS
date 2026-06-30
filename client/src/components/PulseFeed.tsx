import EmojiText from './EmojiText';
import type { PulseEvent } from '../lib/pulse-store';
import { BRANCH_COLORS } from '../lib/red-leaf-kernel';
import { Activity, Radio } from 'lucide-react';

interface Props {
  pulses: PulseEvent[];
  compact?: boolean;
  maxItems?: number;
  onEmit?: (from: string) => void;
  emitting?: boolean;
}

export default function PulseFeed({ pulses, compact, maxItems = 12, onEmit, emitting }: Props) {
  const items = pulses.slice(0, maxItems);

  if (!items.length) {
    return (
      <p className="text-sm text-forge-muted">
        No pulses yet — forge, journal, or daily runs will propagate 🍁 through the network.
      </p>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? '' : 'max-h-80 overflow-y-auto pr-1'}`}>
      {items.map((p) => (
        <div
          key={p.id}
          className="rounded-lg border border-forge-border/80 bg-black/25 px-3 py-2 transition hover:border-forge-leaf/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-xs">
              <EmojiText text={p.originSymbol} size="sm" />
              <span className="font-mono text-forge-cyan">{p.origin}</span>
              {p.meta?.action && (
                <span className="text-forge-muted">· {String(p.meta.action)}</span>
              )}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-forge-muted">
              reach {p.reach}
            </span>
          </div>
          {!compact && p.trace.length > 0 && (
            <p className="mt-1 truncate font-mono text-[10px] text-forge-muted">
              {p.trace.slice(0, 5).map((t) => t.module).join(' → ')}
              {p.trace.length > 5 ? '…' : ''}
            </p>
          )}
          <p className="mt-0.5 font-mono text-[9px] text-forge-muted/80">
            {new Date(p.at).toLocaleString()}
          </p>
        </div>
      ))}
      {onEmit && !compact && (
        <button
          type="button"
          disabled={emitting}
          onClick={() => onEmit('kernel')}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-forge-leaf/30 py-2 text-xs text-forge-leaf transition hover:bg-forge-leaf/10 disabled:opacity-50"
        >
          <Radio size={12} />
          Emit test pulse from kernel
        </button>
      )}
    </div>
  );
}

export function PulseFeedBadge({ count, live }: { count: number; live?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-forge-leaf/30 bg-forge-leaf/10 px-2 py-0.5 font-mono text-[10px] text-forge-leaf">
      <Activity size={10} className={live ? 'animate-pulse' : ''} />
      {count} pulse{count === 1 ? '' : 's'}
    </span>
  );
}