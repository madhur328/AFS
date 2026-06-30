import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRedLeafKernel } from '../hooks/useRedLeafKernel';
import { usePulseFeed } from '../hooks/usePulseFeed';
import { useKernelReadiness } from '../hooks/useKernelReadiness';
import { Panel } from '../components/ui';
import EmojiText from '../components/EmojiText';
import PulseFeed, { PulseFeedBadge } from '../components/PulseFeed';
import KernelReadinessPanel, {
  GenerateFromLeafButton,
  KernelGenerateFeedback,
} from '../components/KernelReadinessPanel';
import { useKernelGenerate } from '../hooks/useKernelGenerate';
import { useKernelSpiral } from '../hooks/useKernelSpiral';
import KernelSpiralPanel from '../components/KernelSpiralPanel';
import type { KernelPulseResponse } from '../lib/api';
import { BRANCH_BG, BRANCH_COLORS, RED_LEAF_SEED } from '../lib/red-leaf-kernel';
import { Radio, Network, Leaf, Zap, Activity } from 'lucide-react';

const PULSE_ORIGINS = ['forge', 'journal', 'aspects', 'kernel', 'dashboard'] as const;

export default function RedLeafKernel() {
  const { topology, flow, loading, error, pulse } = useRedLeafKernel();
  const { readiness, generationReady, refresh: refreshReadiness } = useKernelReadiness();
  const { generating, result: generateResult, error: generateError, generate } = useKernelGenerate(refreshReadiness);
  const { telemetry: spiralTelemetry, loading: spiralLoading, error: spiralError } = useKernelSpiral();
  const { pulses: livePulses, stats: pulseStats, emit: emitLive, refresh: refreshPulses } = usePulseFeed({
    pollMs: 3500,
    enabled: readiness?.observabilityReady !== false,
  });
  const [pulseResult, setPulseResult] = useState<KernelPulseResponse | null>(null);
  const [pulsing, setPulsing] = useState(false);

  const runPulse = async (from: string) => {
    setPulsing(true);
    try {
      const result = await pulse(from, { ore: 'emotional resonance', at: new Date().toISOString() });
      setPulseResult(result);
    } finally {
      setPulsing(false);
    }
  };

  if (loading) {
    return <div className="text-forge-muted">Unfolding 🍁 from seed...</div>;
  }

  if (error || !topology || !flow) {
    return <div className="text-forge-ember">Kernel unfold failed: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-forge-leaf">
          Iteration {topology.iteration} · architecture map
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">
          <EmojiText text={RED_LEAF_SEED} size="2xl" className="inline" /> Red Leaf Kernel
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-forge-muted">
          {topology.paradox.mantra} One seed describes the whole system — modules, flow edges, and API
          contracts — for observation and dev-time codegen. Runtime app generation stays locked until readiness
          gates pass.
        </p>
        <p className="mt-2 font-mono text-xs text-forge-gold">{topology.paradox.equation} · {topology.axiom}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <GenerateFromLeafButton
            ready={generationReady}
            loading={generating}
            onClick={() => void generate()}
          />
          <span className="text-xs text-forge-muted">
            {generationReady
              ? 'All requirements met — click to regenerate routes from 🍁.'
              : 'Locked — see requirements below.'}
          </span>
        </div>
        <KernelGenerateFeedback result={generateResult} error={generateError} />
      </header>

      <Panel title="Readiness & practical strategy" subtitle="Requirements before unlocking generate-from-leaf">
        <KernelReadinessPanel readiness={readiness} />
      </Panel>

      <Panel
        title="Spiral Engine Telemetry"
        subtitle="Iteration 5 — ♾️🌀 transforms pulses into cache invalidation; AFS↑ optimizes hot paths"
      >
        <KernelSpiralPanel telemetry={spiralTelemetry} loading={spiralLoading} error={spiralError} />
      </Panel>

      <Panel
        title="Live Pulse Feed"
        subtitle="Forge, journal, and daily runs propagate through the kernel in real time"
        action={<PulseFeedBadge count={pulseStats?.total ?? livePulses.length} live />}
      >
        <div className="mb-3 flex items-center gap-2 text-xs text-forge-muted">
          <Activity size={14} className="text-forge-leaf" />
          SSE stream at <code className="text-forge-cyan">/api/kernel/pulses/stream</code> · poll every 3.5s
        </div>
        <PulseFeed
          pulses={livePulses}
          onEmit={async (from) => {
            await emitLive(from, { test: true });
            await refreshPulses();
          }}
          emitting={pulsing}
        />
      </Panel>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-forge-leaf/30 bg-forge-leaf/5 p-4 text-center">
          <p className="font-display text-4xl font-bold text-forge-leaf">{RED_LEAF_SEED}</p>
          <p className="mt-1 text-xs text-forge-muted">Single seed</p>
        </div>
        <div className="rounded-xl border border-forge-border p-4 text-center">
          <p className="font-display text-3xl font-bold text-forge-cyan">{topology.topology.nodeCount}</p>
          <p className="mt-1 text-xs text-forge-muted">Modules unfolded</p>
        </div>
        <div className="rounded-xl border border-forge-border p-4 text-center">
          <p className="font-display text-3xl font-bold text-forge-gold">{flow.edgeCount}</p>
          <p className="mt-1 text-xs text-forge-muted">Data-flow edges</p>
        </div>
        <div className="rounded-xl border border-forge-border p-4 text-center">
          <p className="font-display text-3xl font-bold text-forge-ember">v{topology.iteration}</p>
          <p className="mt-1 text-xs text-forge-muted">Kernel iteration</p>
        </div>
      </div>

      <Panel title="Unfold Topology" subtitle="Three operators emerge from 🍁 — every module is a reframe">
        <div className="grid gap-4 lg:grid-cols-2">
          {topology.topology.branches.map((branch) => (
            <div
              key={branch.id}
              className={`rounded-xl border p-4 ${BRANCH_BG[branch.id] ?? 'border-forge-border'}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <EmojiText text={branch.symbol} size="lg" />
                <div>
                  <h3 className={`font-mono text-sm font-bold ${BRANCH_COLORS[branch.id]}`}>{branch.label}</h3>
                  <p className="text-[10px] uppercase tracking-wider text-forge-muted">{branch.vector}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {branch.modules.map((mod) => (
                  <li key={mod.id}>
                    <Link
                      to={mod.path}
                      className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm transition hover:bg-black/35"
                    >
                      <span className="flex items-center gap-2">
                        <EmojiText text={mod.glyph} size="sm" />
                        {mod.label}
                      </span>
                      <span className="font-mono text-[10px] text-forge-muted">{mod.symbol}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Data Flow Graph" subtitle="Networking edges — pulse propagates downstream">
          <div className="max-h-[420px] space-y-1 overflow-y-auto font-mono text-[11px]">
            {flow.edges.slice(0, 40).map((e) => (
              <div key={`${e.from}-${e.to}`} className="flex items-center gap-2 rounded bg-white/5 px-2 py-1.5">
                <span className="text-forge-cyan">{e.from}</span>
                <span className="text-forge-muted">→</span>
                <span className="text-forge-leaf">{e.to}</span>
              </div>
            ))}
            {flow.edgeCount > 40 && (
              <p className="pt-2 text-xs text-forge-muted">+{flow.edgeCount - 40} more edges</p>
            )}
          </div>
        </Panel>

        <Panel
          title="Pulse Router"
          subtitle="Test networking — emit from a module, trace reach"
          action={
            <Network size={16} className="text-forge-cyan" />
          }
        >
          <p className="mb-3 text-xs text-forge-muted">
            A Red Leaf pulse is 🍁(network) — reframe the signal through the flow graph.
          </p>
          <div className="flex flex-wrap gap-2">
            {PULSE_ORIGINS.map((origin) => (
              <button
                key={origin}
                type="button"
                disabled={pulsing}
                onClick={() => runPulse(origin)}
                className="rounded-lg border border-forge-border px-3 py-1.5 text-xs text-forge-muted transition hover:border-forge-cyan/50 hover:text-forge-cyan disabled:opacity-50"
              >
                <Zap size={12} className="mr-1 inline" />
                Pulse from {origin}
              </button>
            ))}
          </div>
          {pulseResult?.ok && (pulseResult.route?.trace || pulseResult.event?.trace) && (
            <div className="mt-4 rounded-xl border border-forge-cyan/20 bg-forge-cyan/5 p-3">
              <p className="font-mono text-[10px] text-forge-cyan">
                Reach: {pulseResult.route?.reach ?? pulseResult.event?.reach} modules · {pulseResult.route?.hops ?? pulseResult.event?.hops} hops · origin {pulseResult.route?.origin?.symbol ?? pulseResult.event?.originSymbol}
              </p>
              <ol className="mt-2 space-y-1">
                {(pulseResult.route?.trace ?? pulseResult.event?.trace ?? []).map((step, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-forge-muted">h{step.hop}</span>
                    <EmojiText text={step.symbol} size="sm" />
                    <span>{step.module}</span>
                    <span className="text-forge-muted">{step.action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Interface Registry" subtitle="Each module declares read/write API contracts">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {topology.topology.modules.map((mod) => (
            <div key={mod.id} className="rounded-xl border border-forge-border p-3">
              <div className="flex items-center gap-2">
                <Radio size={12} className="text-forge-gold" />
                <span className="font-medium text-sm">{mod.label}</span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-forge-cyan">{mod.api.primary}</p>
              <p className="mt-2 text-[10px] text-forge-muted">
                read: {mod.dataSources.join(', ') || '—'}
              </p>
              {mod.dataSinks.length > 0 && (
                <p className="text-[10px] text-forge-leaf">write: {mod.dataSinks.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Iteration Roadmap" subtitle="Incremental — stable core before runtime generation">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-forge-border p-4 opacity-80">
            <h3 className="font-mono text-sm font-bold text-forge-muted">1–2 ✓</h3>
            <p className="mt-1 text-xs text-forge-muted">Seed unfold · flow graph · dev route codegen</p>
          </div>
          <div className="rounded-xl border border-forge-leaf/40 bg-forge-leaf/5 p-4">
            <Leaf size={18} className="text-forge-leaf" />
            <h3 className="mt-2 font-mono text-sm font-bold text-forge-leaf">3 ✓</h3>
            <p className="mt-1 text-xs text-forge-muted">Pulse bus · live feed · forge/journal hooks</p>
          </div>
          <div className="rounded-xl border border-forge-gold/40 bg-forge-gold/5 p-4">
            <h3 className="font-mono text-sm font-bold text-forge-gold">4 ✓</h3>
            <p className="mt-1 text-xs text-forge-muted">Static export embeds kernel snapshot</p>
          </div>
          <div className="rounded-xl border border-forge-cyan/40 bg-forge-cyan/5 p-4">
            <h3 className="font-mono text-sm font-bold text-forge-cyan">5 ✓</h3>
            <p className="mt-1 text-xs text-forge-muted">Spiral handlers + kernel store — pulses invalidate, dashboard caches</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}