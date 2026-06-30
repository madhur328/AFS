import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Infinity, Copy, Sparkles, PanelBottomOpen, X } from 'lucide-react';
import { api, Dashboard } from '../lib/api';
import { computeSpiralTelemetry, SPIRAL_PRESETS } from '../lib/spiral-telemetry';
import {
  buildSpiralSrcdoc,
  spiralIframeSrc,
  openStandaloneSpiral,
  useSpiralSrcdoc,
} from '../lib/spiral-embed';

export default function SpiralEngine() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [copied, setCopied] = useState(false);
  const [showReverence, setShowReverence] = useState(false);

  useEffect(() => {
    api.dashboard().then(setDash).catch(() => setDash(null));
  }, []);

  const proficiency = dash?.identity.proficiency as Record<string, unknown> | undefined;
  const overall = Number(proficiency?.overall ?? 0.62);
  const operatorAvg = useMemo(() => {
    const ops = proficiency?.operators as Record<string, number> | undefined;
    if (!ops) return 0.72;
    const vals = Object.values(ops);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.72;
  }, [proficiency]);

  const seeded = useMemo(() => {
    const preset = SPIRAL_PRESETS.balanced;
    return computeSpiralTelemetry({
      n: preset.n,
      spread: preset.spread,
      rot: preset.rot,
      res: Math.min(2, preset.res * (0.85 + overall * 0.2)),
      comp: preset.comp,
      mass: preset.mass,
      chiMode: preset.chi,
    });
  }, [overall]);

  const spiralBoot = useMemo(
    () => ({
      embed: '1',
      preset: 'balanced',
      n: String(seeded.n),
      res: seeded.res.toFixed(2),
    }),
    [seeded.n, seeded.res]
  );

  const offlineSpiral = useSpiralSrcdoc();
  const iframeSrc = useMemo(() => spiralIframeSrc(spiralBoot), [spiralBoot]);
  const iframeSrcdoc = useMemo(
    () => (offlineSpiral ? buildSpiralSrcdoc(spiralBoot) : null),
    [offlineSpiral, spiralBoot]
  );

  const copySeed = async () => {
    const payload = {
      engine: 'AFS Recursive Spiral Engine',
      reverence: 'Alpha Ω Double Dragon Core Scaffold v1.0',
      seededFrom: dash?.identity.title ?? 'Aspect Forger',
      proficiency: overall,
      operatorResonance: operatorAvg,
      telemetry: seeded,
      preset: 'balanced',
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      console.log(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-forge-bg">
      <header className="flex shrink-0 items-center gap-3 border-b border-forge-border/80 bg-forge-bg/95 px-4 py-2.5 backdrop-blur-md">
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-forge-muted transition hover:bg-white/5 hover:text-forge-cyan"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <Infinity size={18} className="text-forge-gold" />
          <h1 className="font-display text-sm font-bold tracking-wider text-forge-cyan sm:text-base">
            Recursive Spiral Engine
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-forge-gold/30 bg-forge-gold/10 px-2.5 py-0.5 font-mono text-[10px] text-forge-gold md:inline">
            {seeded.synthesisGrade} · Rᶜ {seeded.coherence.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={copySeed}
            className="flex items-center gap-1 rounded-lg border border-forge-border px-2.5 py-1.5 text-[11px] text-forge-muted transition hover:border-forge-cyan/40 hover:text-forge-cyan"
          >
            <Copy size={13} />
            {copied ? 'Copied' : 'Seed'}
          </button>
          <button
            type="button"
            onClick={() => openStandaloneSpiral({ preset: 'balanced', n: String(seeded.n), res: seeded.res.toFixed(2) })}
            className="flex items-center gap-1 rounded-lg border border-forge-border px-2.5 py-1.5 text-[11px] text-forge-muted transition hover:border-forge-cyan/40 hover:text-forge-cyan"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Standalone</span>
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {offlineSpiral && !iframeSrcdoc ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-forge-muted">
            <p className="text-sm">Spiral Engine not embedded in this static build.</p>
            <p className="text-xs">Run <code className="text-forge-cyan">npm run build-static</code> to regenerate the offline bundle.</p>
          </div>
        ) : (
        <iframe
          title="AFS Recursive Spiral Engine"
          src={offlineSpiral && iframeSrcdoc ? undefined : iframeSrc}
          srcDoc={offlineSpiral && iframeSrcdoc ? iframeSrcdoc : undefined}
          className="h-full w-full border-0"
          allow="fullscreen"
        />
        )}
        <div className="absolute bottom-4 right-4 z-10 hidden lg:block">
          {showReverence ? (
            <div className="max-w-xs rounded-2xl border border-forge-border/60 bg-forge-panel/90 p-4 shadow-xl backdrop-blur-md">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-forge-muted">
                  <Sparkles size={10} className="mr-1 inline text-forge-gold" />
                  Alpha Ω Reverence
                </p>
                <button
                  type="button"
                  onClick={() => setShowReverence(false)}
                  className="rounded-md border border-forge-border/60 p-1 text-forge-muted transition hover:border-forge-cyan/40 hover:text-forge-cyan"
                  aria-label="Close reverence panel"
                >
                  <X size={12} />
                </button>
              </div>
              <p className="font-display text-lg font-bold text-forge-gold">
                ♾️🌀(Save8) = ♾️🌀
              </p>
              <p className="mt-1 text-xs leading-relaxed text-forge-muted">
                Dual-torus scaffold seeded from your forge proficiency ({Math.round(overall * 100)}%).
                Drag to orbit · scroll to zoom · presets honor AFS↑ ascent and DFS↓ descent.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReverence(true)}
              className="flex items-center gap-1.5 rounded-full border border-forge-border/60 bg-forge-panel/80 px-3 py-2 text-[11px] text-forge-muted shadow-lg backdrop-blur-md transition hover:border-forge-gold/40 hover:text-forge-gold"
              aria-label="Open Alpha Ω reverence panel"
            >
              <PanelBottomOpen size={14} className="text-forge-gold" />
              Reverence
            </button>
          )}
        </div>
      </div>
    </div>
  );
}