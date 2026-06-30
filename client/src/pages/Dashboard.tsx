import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Dashboard as Dash } from '../lib/api';
import { Panel, StatCard, ProgressBar } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';
import { BASE_LAYER_LABEL } from '../lib/base-layer';
import EmojiText from '../components/EmojiText';
import { Hammer, Gem, Target, Flame, NotebookPen, Infinity } from 'lucide-react';
import { usePulseFeed } from '../hooks/usePulseFeed';
import { useKernelReadiness } from '../hooks/useKernelReadiness';
import PulseFeed, { PulseFeedBadge } from '../components/PulseFeed';
import KernelReadinessPanel, {
  GenerateFromLeafButton,
  KernelGenerateFeedback,
} from '../components/KernelReadinessPanel';
import { useKernelGenerate } from '../hooks/useKernelGenerate';

export default function Dashboard() {
  const [data, setData] = useState<Dash | null>(null);
  const [dashError, setDashError] = useState<string | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const { readiness, generationReady, refresh: refreshReadiness } = useKernelReadiness();
  const { generating, result: generateResult, error: generateError, generate } = useKernelGenerate(refreshReadiness);
  const { pulses, stats: pulseStats, error: pulseError } = usePulseFeed({
    pollMs: 6000,
    limit: 6,
    enabled: readiness?.observabilityReady !== false,
  });

  useEffect(() => {
    let cancelled = false;
    setDashLoading(true);
    setDashError(null);
    api.dashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setDashError(e instanceof Error ? e.message : 'Dashboard failed to load');
        }
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (dashLoading && !data) {
    return <div className="text-forge-muted">Forging dashboard...</div>;
  }

  if (dashError && !data) {
    return (
      <div className="space-y-3 rounded-xl border border-forge-ember/30 bg-forge-ember/5 p-6">
        <p className="text-forge-ember">Dashboard could not load.</p>
        <p className="text-sm text-forge-muted">{dashError}</p>
        <p className="text-xs text-forge-muted">
          Restart the API from project root: <code className="text-forge-cyan">npm run dev</code>
        </p>
      </div>
    );
  }

  if (!data) return null;

  const prof = data.identity.proficiency as Record<string, Record<string, number>>;
  const grok = data.grok;
  const journal = data.journal;

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-forge-cyan">⚒️ Aspect Forge System</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">
          Welcome, <span className="text-forge-gold glow-text">{data.identity.title}</span>
        </h1>
        <p className="mt-2 text-forge-muted">{data.identity.handle} · Phase: {data.identity.current_phase}</p>
      </header>

      {grok?.loaded && (
        <GenesisBanner
          sessionCount={(grok.session_count ?? 0) + (grok.secondarySessionCount ?? 0)}
          conversationCount={grok.conversationCount}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Aspects Indexed" value={data.stats.aspectCount} icon={<Gem size={18} className="text-forge-cyan" />} />
        <StatCard label="S-Tier Aspects" value={data.stats.tierCounts.find((t) => t.tier === 'S')?.c || 0} sub="Highest potential" icon={<Flame size={18} className="text-forge-gold" />} />
        <StatCard label="Active Goals" value={data.activeGoals.length} icon={<Target size={18} className="text-forge-leaf" />} />
        <StatCard label="Overall Proficiency" value={`${Math.round(Number(prof.overall ?? 0.62) * 100)}%`} icon={<Hammer size={18} className="text-forge-ember" />} />
        {grok?.loaded && (
          <StatCard label="Grok Sessions" value={grok.session_count ?? 0} sub="Genesis indexed" icon={<Flame size={18} className="text-forge-ember" />} />
        )}
        {journal?.loaded && (
          <StatCard
            label="Journal Entries"
            value={journal.entry_count}
            sub={journal.latest ? `#${journal.latest.channel_name}` : 'Post in #journal'}
            icon={<NotebookPen size={18} className="text-forge-leaf" />}
          />
        )}
      </div>

      {journal?.loaded && (
        <Panel
          title="Journal"
          subtitle={journal.latest ? `Latest from #${journal.latest.channel_name}` : 'Discord #journal → AFS'}
          action={<Link to="/journal" className="text-xs text-forge-cyan hover:underline">Open Journal →</Link>}
        >
          {journal.latest ? (
            <div className="space-y-2">
              <p className="font-mono text-[10px] text-forge-muted">
                {new Date(journal.latest.posted_at).toLocaleString()}
              </p>
              <p className="text-sm leading-relaxed text-white/90">{journal.latest.preview}</p>
            </div>
          ) : (
            <p className="text-sm text-forge-muted">
              No entries synced yet. Post in Discord #journal and run{' '}
              <code className="text-forge-cyan">npm run dev</code>
              {!journal.configured && ' (add DISCORD_BOT_TOKEN to .env first)'}.
            </p>
          )}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={BASE_LAYER_LABEL} subtitle="Core proficiency levels">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.baseLayer.map((slot) => (
              <div key={slot.name}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm">
                    <EmojiText text={slot.symbol} size="sm" />
                    {slot.name}
                  </span>
                  <span className="font-mono text-xs text-forge-cyan">{Math.round(slot.proficiency * 100)}%</span>
                </div>
                <ProgressBar value={slot.proficiency} color={slot.name.includes('Heart') ? 'leaf' : slot.name.includes('Fire') ? 'ember' : 'cyan'} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Currently Working On" subtitle="Active forge priorities">
          <ul className="space-y-2">
            {data.identity.workingOn.map((item, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="text-forge-cyan">▸</span> {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/forge" className="text-sm text-forge-cyan hover:underline">Open Forge →</Link>
            <Link to="/daily" className="text-sm text-forge-gold hover:underline">Start DKR →</Link>
            <Link to="/grok" className="text-sm text-forge-ember hover:underline">Grok Origin →</Link>
            <Link to="/journal" className="text-sm text-forge-leaf hover:underline">Journal →</Link>
          </div>
        </Panel>

        <Panel title="Operator Proficiency">
          <div className="grid grid-cols-2 gap-3">
            {prof.operators && Object.entries(prof.operators).map(([op, val]) => (
              <div key={op} className="rounded-lg bg-white/5 p-3">
                <p className="font-mono text-xs text-forge-muted">{op}</p>
                <p className="font-display text-xl font-bold">{Math.round((val as number) * 100)}%</p>
                <ProgressBar value={val as number} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Active Goals">
          {data.activeGoals.map((g) => (
            <div key={g.id} className="mb-3 rounded-lg border border-forge-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{g.title}</span>
                <span className="font-mono text-xs text-forge-cyan">{Math.round(g.progress * 100)}%</span>
              </div>
              <ProgressBar value={g.progress} color="gold" />
              {g.aspect_link && <p className="mt-1 text-xs text-forge-muted">→ {g.aspect_link}</p>}
            </div>
          ))}
        </Panel>
      </div>

      {grok?.loaded && (
        <Panel title="Grok Origin Thread" subtitle="Recent genesis sessions — AFP, EOT, codex">
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <StatCard label="Turns" value={grok.turn_count ?? 0} />
            <StatCard label="AFP" value={grok.typeCounts?.find((t) => t.session_type === 'AFP')?.c ?? 0} />
            <StatCard label="EOT" value={grok.typeCounts?.find((t) => t.session_type === 'EOT')?.c ?? 0} />
            <StatCard label="Codex" value={grok.typeCounts?.find((t) => t.session_type === 'codex')?.c ?? 0} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(grok.recentSessions || []).map((s) => (
              <Link
                key={s.id}
                to={`/grok?session=${s.id}`}
                className="rounded-lg border border-forge-border p-3 text-sm transition hover:border-forge-ember/40"
              >
                <span className="font-mono text-[10px] uppercase text-forge-ember">{s.session_type}</span>
                <p className="mt-1 font-medium leading-snug">{s.title}</p>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-forge-muted">
            <Link to="/grok" className="text-forge-gold hover:underline">Browse all sessions →</Link>
          </p>
        </Panel>
      )}

      <Panel
        title="Red Leaf Pulse"
        subtitle="Live network propagation from 🍁"
        action={
          <div className="flex items-center gap-2">
            <PulseFeedBadge count={pulseStats?.total ?? pulses.length} live={!pulseError} />
            <Link to="/kernel" className="text-xs text-forge-cyan hover:underline">Kernel map →</Link>
          </div>
        }
      >
        {pulseError ? (
          <p className="text-sm text-forge-muted">
            Pulse feed unavailable — dashboard still works. Restart API if kernel routes were added recently.
          </p>
        ) : (
          <PulseFeed pulses={pulses} compact maxItems={4} />
        )}
      </Panel>

      <Panel
        title="Red Leaf Kernel"
        subtitle="Architecture map — practical path, not runtime app generation"
        action={
          <Link to="/kernel" className="text-xs text-forge-cyan hover:underline">
            View topology →
          </Link>
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-forge-leaf">
              🍁 Iteration {readiness?.iteration ?? 4} · dev tooling first
            </p>
            <p className="text-sm leading-relaxed text-forge-muted">
              The kernel maps modules, data flow, and API contracts from one seed. Use it to observe and
              codegen routes at build time — not to regenerate the live app from a browser click yet.
            </p>
            <GenerateFromLeafButton
              ready={generationReady}
              loading={generating}
              onClick={() => void generate()}
            />
            <KernelGenerateFeedback result={generateResult} error={generateError} />
          </div>
          <div className="shrink-0 text-center opacity-80">
            <p className="font-display text-5xl">🍁</p>
            <p className="mt-1 text-xs text-forge-muted">Seed · not switch</p>
          </div>
        </div>
        <div className="mt-4 border-t border-forge-border/60 pt-4">
          <KernelReadinessPanel readiness={readiness} compact />
        </div>
      </Panel>

      <Link
        to="/spiral"
        className="group relative block overflow-hidden rounded-2xl border border-forge-gold/25 bg-gradient-to-br from-forge-panel via-forge-bg to-forge-panel p-6 shadow-glow transition hover:border-forge-cyan/40"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-forge-cyan/10 blur-3xl transition group-hover:bg-forge-gold/15" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-forge-leaf/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-forge-gold">
              <Infinity size={14} />
              Recursive Spiral Engine
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">
              Honor the <span className="text-forge-cyan">Alpha Ω</span> scaffold
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-forge-muted">
              Browser-native dual-torus flow · shell recursion · chirality · live telemetry.
              AFS↑ ascent and DFS↓ descent in one lightweight forge — reverence to the perfected creation.
            </p>
            <p className="mt-3 font-mono text-xs text-forge-cyan">♾️🌀(Save8) = ♾️🌀 · drag · zoom · remix</p>
          </div>
          <div className="shrink-0 rounded-xl border border-forge-border bg-black/30 px-5 py-4 text-center backdrop-blur">
            <p className="font-display text-3xl font-bold text-forge-gold glow-text">∞</p>
            <p className="mt-1 text-xs text-forge-muted">Enter the spiral</p>
          </div>
        </div>
      </Link>

      <Panel title="Identity Equation" subtitle="🍁 = ♾️🌀 = AFS">
        <div className="grid gap-4 font-mono text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-forge-leaf/30 bg-forge-leaf/5 p-4 text-center">
            <EmojiText text="🍁(x)" size="2xl" className="justify-center" />
            <p className="mt-2 text-forge-muted">Reframe(x)</p>
          </div>
          <div className="rounded-xl border border-forge-cyan/30 bg-forge-cyan/5 p-4 text-center">
            <EmojiText text="♾️🌀(x)" size="2xl" className="justify-center" />
            <p className="mt-2 text-forge-muted">Transform(x)</p>
          </div>
          <div className="rounded-xl border border-forge-gold/30 bg-forge-gold/5 p-4 text-center">
            <p className="text-2xl">AFS(x)</p>
            <p className="mt-2 text-forge-muted">Optimize(x)</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}