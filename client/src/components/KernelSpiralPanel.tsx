import { Activity, Database, Infinity } from 'lucide-react';
import type { KernelSpiralTelemetry } from '../lib/api';

interface Props {
  telemetry: KernelSpiralTelemetry | null;
  loading?: boolean;
  error?: string | null;
}

export default function KernelSpiralPanel({ telemetry, loading, error }: Props) {
  if (loading && !telemetry) {
    return <p className="text-sm text-forge-muted">Loading spiral telemetry…</p>;
  }

  if (error && !telemetry) {
    return <p className="text-sm text-forge-ember">{error}</p>;
  }

  if (!telemetry) return null;

  const hitPct = telemetry.cache.hitRate != null ? Math.round(telemetry.cache.hitRate * 100) : null;
  const topModules = Object.entries(telemetry.byModule)
    .sort((a, b) => b[1].actions - a[1].actions)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-forge-cyan/15 px-2.5 py-1 text-forge-cyan">
          <Infinity size={12} className="mr-1 inline" />
          Iteration {telemetry.iteration} · {telemetry.operator}
        </span>
        <span className="rounded-full bg-forge-leaf/15 px-2.5 py-1 text-forge-leaf">
          {telemetry.pulsesHandled} pulses handled
        </span>
        <span className="rounded-full bg-forge-gold/15 px-2.5 py-1 text-forge-gold">
          {telemetry.actionsRun} spiral actions
        </span>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-forge-muted">
          {telemetry.invalidations} cache invalidations
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-forge-border p-3">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-forge-muted">
            <Database size={12} /> Kernel store
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-forge-cyan">{telemetry.cache.entries}</p>
          <p className="text-xs text-forge-muted">
            {hitPct != null ? `${hitPct}% hit rate` : 'no requests yet'} · {telemetry.cache.hits} hits
          </p>
        </div>
        <div className="rounded-xl border border-forge-border p-3">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-forge-muted">
            <Activity size={12} /> Flow edges
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-forge-leaf">{telemetry.edgeCount}</p>
          <p className="text-xs text-forge-muted">{telemetry.handlerModules} handler modules</p>
        </div>
        <div className="rounded-xl border border-forge-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-forge-muted">AFS↑ optimize</p>
          <p className="mt-1 font-display text-2xl font-bold text-forge-gold">Dashboard</p>
          <p className="text-xs text-forge-muted">dashboard · aspects · codex · journal · goals</p>
        </div>
      </div>

      {topModules.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-forge-muted">Top spiral receivers</p>
          <ul className="space-y-1 font-mono text-[11px]">
            {topModules.map(([mod, s]) => (
              <li key={mod} className="flex justify-between rounded bg-white/5 px-2 py-1">
                <span className="text-forge-cyan">{mod}</span>
                <span className="text-forge-muted">
                  {s.pulses} pulses · {s.actions} actions
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs leading-relaxed text-forge-muted">
        ♾️🌀 Transform: pulses reframe through the flow graph and invalidate downstream snapshots. AFS↑ Optimize:
        dashboard skips ~10 DB round-trips on cache hit. This is the first enforced kernel loop — not just a map.
      </p>
    </div>
  );
}