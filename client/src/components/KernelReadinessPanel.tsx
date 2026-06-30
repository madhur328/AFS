import { CheckCircle2, Circle, Lock, Leaf } from 'lucide-react';
import type { KernelReadiness } from '../lib/kernel-readiness';

interface Props {
  readiness: KernelReadiness | null;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

export default function KernelReadinessPanel({ readiness, loading, error, compact }: Props) {
  if (loading && !readiness) {
    return <p className="text-sm text-forge-muted">Checking kernel readiness…</p>;
  }

  if (error && !readiness) {
    return (
      <p className="text-sm text-forge-ember">
        Cannot verify readiness — API may be stale (server started before kernel routes were added). Restart with{' '}
        <code className="text-forge-cyan">npm run dev</code>.
      </p>
    );
  }

  if (!readiness) return null;

  const { strategy, requirements, generationReady, observabilityReady, metrics } = readiness;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-forge-leaf">{strategy.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-forge-muted">{strategy.summary}</p>
      </div>

      {!compact && (
        <div className="grid gap-2 sm:grid-cols-2">
          {strategy.phases.map((phase) => (
            <div
              key={phase.id}
              className={`rounded-lg border px-3 py-2 ${
                phase.status === 'blocked'
                  ? 'border-forge-ember/30 bg-forge-ember/5'
                  : 'border-forge-border bg-white/5'
              }`}
            >
              <p className="text-xs font-medium text-white">{phase.label}</p>
              <p className="mt-0.5 text-[11px] text-forge-muted">{phase.detail}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-2.5 py-1 ${
            observabilityReady ? 'bg-forge-leaf/15 text-forge-leaf' : 'bg-forge-ember/15 text-forge-ember'
          }`}
        >
          Observability {observabilityReady ? 'ready' : 'not ready'}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 ${
            generationReady ? 'bg-forge-gold/15 text-forge-gold' : 'bg-forge-muted/20 text-forge-muted'
          }`}
        >
          Generation {generationReady ? 'ready' : 'locked'}
        </span>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-forge-muted">
          Unfold {Math.round(metrics.unfoldBytes / 1000)}KB / {Math.round(metrics.unfoldBudgetBytes / 1000)}KB
        </span>
      </div>

      <ul className="space-y-2">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-start gap-2 text-sm">
            {req.pass ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-forge-leaf" />
            ) : (
              <Circle size={16} className="mt-0.5 shrink-0 text-forge-muted" />
            )}
            <div>
              <p className={req.pass ? 'text-white/90' : 'text-forge-muted'}>{req.label}</p>
              {!compact && <p className="text-[11px] text-forge-muted">{req.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GenerateFromLeafButton({
  ready,
  loading,
  onClick,
}: {
  ready: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!ready || loading}
      onClick={onClick}
      title={
        ready
          ? 'Generate app routes from kernel seed'
          : 'Locked until all readiness requirements pass and runtimeGeneration is enabled'
      }
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
        ready
          ? 'border-forge-leaf/50 bg-forge-leaf/15 text-forge-leaf hover:bg-forge-leaf/25'
          : 'cursor-not-allowed border-forge-border bg-white/5 text-forge-muted opacity-70'
      }`}
    >
      {ready ? <Leaf size={16} /> : <Lock size={16} />}
      {loading ? 'Generating from leaf…' : 'Generate app from leaf'}
    </button>
  );
}

export function KernelGenerateFeedback({
  result,
  error,
}: {
  result?: { routeCount: number; generatedAt: string; outputs: { tsx: string; manifest: string }; message?: string } | null;
  error?: string | null;
}) {
  if (!result && !error) return null;

  if (error) {
    return (
      <p className="mt-3 rounded-lg border border-forge-ember/30 bg-forge-ember/10 px-3 py-2 text-sm text-forge-ember">
        {error}
      </p>
    );
  }

  if (!result) return null;

  return (
    <div className="mt-3 rounded-lg border border-forge-leaf/30 bg-forge-leaf/10 px-3 py-2 text-sm text-forge-leaf">
      <p>
        Generated <strong>{result.routeCount}</strong> routes at{' '}
        {new Date(result.generatedAt).toLocaleString()}.
      </p>
      <p className="mt-1 text-xs text-forge-muted">
        Wrote <code>{result.outputs.tsx}</code> and <code>{result.outputs.manifest}</code>.
      </p>
      {result.message && <p className="mt-2 text-xs text-forge-gold">{result.message}</p>}
    </div>
  );
}