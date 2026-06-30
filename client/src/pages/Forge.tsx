import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  ForgeBaseAspect,
  ForgeExample,
  ForgeMythology,
  ForgeReflectResult,
  ForgeResult,
  ForgeSession,
  ForgeSynthesisResult,
  GodTierAspect,
  GodTierResponse,
  Protocol,
} from '../lib/api';
import { TierBadge } from '../components/ui';
import EmojiText from '../components/EmojiText';
import AspectVisualizationModal, { type VizSubject } from '../components/forge/AspectVisualizationModal';
import ForgeAspectScene, { FORGE_CENTER_KEY } from '../components/forge/ForgeAspectScene';
import GodTierAspectsStrip from '../components/forge/GodTierAspectsStrip';
import { forgeAspectImageUrl } from '../lib/forge-aspect-images';

const PROTOCOLS = ['AFP', 'EOT', 'DCS', 'RDTQ'] as const;
type CenterTab = 'inspect' | 'directory' | 'codex' | 'myth' | 'viz' | 'simulate';

type ForgeOutput =
  | { kind: 'reflect'; data: ForgeReflectResult }
  | { kind: 'synthesize'; data: ForgeSynthesisResult }
  | { kind: 'dcs'; data: ForgeResult }
  | { kind: 'simulate'; data: ForgeResult };

const FORGE_OS_PANEL = 'border border-[rgba(0,255,136,0.18)] bg-[rgba(0,7,4,0.72)]';
const FORGE_OS_TITLE = 'font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#00ff88]';

function aspectToViz(aspect: ForgeBaseAspect): VizSubject {
  return {
    symbol: aspect.symbol,
    name: aspect.name,
    mantra: aspect.mantra,
    aura: aspect.meditation?.aura,
    prompt: aspect.meditation?.prompt,
    deepInsight: aspect.deepInsight,
    imageUrl: aspect.imageUrl || forgeAspectImageUrl(aspect.key),
    aspectKey: aspect.key,
  };
}

function godTierToViz(aspect: GodTierAspect): VizSubject {
  return {
    symbol: aspect.glyphs.split(' ')[0],
    glyphs: aspect.glyphs,
    name: aspect.name,
    mantra: aspect.essence,
    prompt: aspect.essence,
    deepInsight: aspect.deepInsight,
  };
}

export default function Forge() {
  const [baseAspects, setBaseAspects] = useState<ForgeBaseAspect[]>([]);
  const [mythologies, setMythologies] = useState<ForgeMythology[]>([]);
  const [godTier, setGodTier] = useState<GodTierResponse | null>(null);
  const [history, setHistory] = useState<ForgeSession[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);

  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [selectedGodId, setSelectedGodId] = useState<string | null>(null);
  const [reflection, setReflection] = useState('');
  const [intensity, setIntensity] = useState(0.6);

  const [mythologyId, setMythologyId] = useState('');
  const [directive, setDirective] = useState('Evolve a great Aspect with perfect presence.');

  const [protocol, setProtocol] = useState('AFP');
  const [ore, setOre] = useState('');
  const [examples, setExamples] = useState<ForgeExample[]>([]);

  const [centerTab, setCenterTab] = useState<CenterTab>('inspect');
  const [yarnMode, setYarnMode] = useState(false);
  const [vizSubject, setVizSubject] = useState<VizSubject | null>(null);
  const [forgedKeys, setForgedKeys] = useState<Set<string>>(new Set());

  const [output, setOutput] = useState<ForgeOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [exportBlock, setExportBlock] = useState<string | null>(null);

  useEffect(() => {
    api.protocols().then(setProtocols).catch(() => {});
    api.forgeBaseAspects().then((rows) => {
      setBaseAspects(rows);
      if (rows[0] && !selectedAspect) setSelectedAspect(rows[0].key);
    }).catch(() => {});
    api.forgeMythologies().then((rows) => {
      setMythologies(rows);
      if (rows[0] && !mythologyId) setMythologyId(rows[0].id);
    }).catch(() => {});
    api.forgeGodTier().then(setGodTier).catch(() => {});
    api.forgeHistory().then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    if (centerTab !== 'simulate') return;
    if (protocol === 'AFP' || protocol === 'EOT') {
      api.forgeExamples(protocol).then(setExamples).catch(() => setExamples([]));
    } else {
      setExamples([]);
    }
  }, [protocol, centerTab]);

  const forgeCenterSelected = selectedAspect === FORGE_CENTER_KEY;
  const activeBase = forgeCenterSelected
    ? undefined
    : baseAspects.find((a) => a.key === selectedAspect);
  const activeMyth = mythologies.find((m) => m.id === mythologyId);
  const allGodTier = useMemo(
    () => [...(godTier?.directory || []), ...(godTier?.recent_forged || [])],
    [godTier]
  );
  const activeGod = allGodTier.find((g) => g.id === selectedGodId);

  const avgMastery = useMemo(() => {
    if (!baseAspects.length) return 0;
    return Math.round(
      (baseAspects.reduce((s, a) => s + a.proficiency, 0) / baseAspects.length) * 100
    );
  }, [baseAspects]);

  const toggleSynthesisAspect = (key: string) => {
    setSelectedAspects((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAspect = (key: string) => {
    setSelectedAspect(key);
    setSelectedGodId(null);
    setCenterTab('inspect');
  };

  const openViz = useCallback((subject: VizSubject | null) => {
    if (subject) setVizSubject(subject);
  }, []);

  const runReflect = useCallback(async () => {
    if (!selectedAspect || selectedAspect === FORGE_CENTER_KEY || !reflection.trim()) return;
    setLoading(true);
    setCopyMessage(null);
    try {
      const data = await api.forgeReflect({
        aspect_key: selectedAspect,
        reflection,
        intensity,
      });
      setOutput({ kind: 'reflect', data });
      setForgedKeys((prev) => new Set([...prev, selectedAspect]));
      const refreshed = await api.forgeBaseAspects();
      setBaseAspects(refreshed);
      api.forgeHistory().then(setHistory).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [selectedAspect, reflection, intensity]);

  const runSynthesize = useCallback(async () => {
    if (selectedAspects.length < 2) return;
    setLoading(true);
    try {
      const data = await api.forgeSynthesize({
        aspect_keys: selectedAspects,
        reflection,
      });
      setOutput({ kind: 'synthesize', data });
      setForgedKeys((prev) => new Set([...prev, ...selectedAspects]));
      const refreshed = await api.forgeBaseAspects();
      setBaseAspects(refreshed);
    } finally {
      setLoading(false);
    }
  }, [selectedAspects, reflection]);

  const runDcs = useCallback(async () => {
    if (!mythologyId) return;
    setLoading(true);
    try {
      const data = await api.dcsMythology({
        mythology_id: mythologyId,
        directive,
        source_aspect_keys: selectedAspects.length ? selectedAspects : undefined,
      });
      setOutput({ kind: 'dcs', data });
      api.forgeGodTier().then(setGodTier).catch(() => {});
      api.forgeHistory().then(setHistory).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [mythologyId, directive, selectedAspects]);

  const runSimulate = useCallback(async () => {
    if (!ore.trim()) return;
    setLoading(true);
    try {
      const data = await api.forge(protocol, ore);
      setOutput({ kind: 'simulate', data });
    } finally {
      setLoading(false);
    }
  }, [protocol, ore]);

  async function copySave8() {
    const res = await api.forgeExportBlock();
    setExportBlock(res.export_block);
    try {
      await navigator.clipboard.writeText(res.export_block);
      setCopyMessage('Save8 export block copied');
    } catch {
      setCopyMessage('Export ready — select below');
    }
  }

  const subjectLabel = forgeCenterSelected
    ? 'Aspect Forge Chamber'
    : activeGod?.name || activeBase?.name || '—';
  const subjectSymbol = forgeCenterSelected
    ? '⚒️'
    : activeGod?.glyphs.split(' ')[0] || activeBase?.symbol || '⚒️';
  const subjectThumb = forgeCenterSelected ? '/forge/coin-safe-talisman.jpg' : activeBase?.imageUrl;

  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] flex-col bg-black text-[#00ff88] sm:-m-6 lg:-m-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(0,255,136,0.15)] px-4 py-2">
        <div>
          <p className="font-display text-lg font-bold tracking-widest text-[#00ff88]">
            Forge OS <span className="text-[10px] opacity-45">AFS FORGE</span>
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">
            Aspect Forger · Base Layer ({baseAspects.length}) · Synthesis Kernel
          </p>
        </div>
        <div className="flex flex-wrap gap-4 font-mono text-[10px] text-white/55">
          <span>
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff88]" />
            LIVE
          </span>
          <span>
            Base <b className="text-[#ffd700]">{baseAspects.length}</b>
          </span>
          <span>
            Dir <b className="text-[#ffd700]">{allGodTier.length}</b>
          </span>
          <span>
            Mastery <b className="text-[#ffd700]">{avgMastery}%</b>
          </span>
          <span>
            History <b className="text-[#ffd700]">{history.length}</b>
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(240px,280px)_1fr_minmax(220px,260px)]">
        {/* LEFT */}
        <div className="flex flex-col gap-0 border-r border-[rgba(0,255,136,0.12)]">
          <div className={`${FORGE_OS_PANEL} border-x-0 border-t-0 p-3`}>
            <p className={FORGE_OS_TITLE}>Institutions / Projects</p>
            <div className="mt-2 space-y-1.5">
              {(godTier?.institutions || []).map((inst) => (
                <div
                  key={inst.id}
                  className="rounded border border-white/8 bg-black/50 px-2 py-1.5 text-[11px]"
                  style={{ borderLeftColor: inst.color, borderLeftWidth: 3 }}
                >
                  <span className="font-semibold text-white/85">{inst.name}</span>
                  <p className="text-[10px] text-white/45">{inst.realm}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${FORGE_OS_PANEL} flex-1 border-x-0 border-t-0 p-3`}>
            <p className={FORGE_OS_TITLE}>⚒️ Aspect Forge · Base Layer ({baseAspects.length})</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {baseAspects.map((aspect) => {
                const selected =
                  selectedAspect === aspect.key || selectedAspects.includes(aspect.key);
                return (
                  <button
                    key={aspect.key}
                    type="button"
                    onClick={() => selectAspect(aspect.key)}
                    onDoubleClick={() => toggleSynthesisAspect(aspect.key)}
                    className={`overflow-hidden rounded border text-left transition ${
                      selected
                        ? 'border-[#ffd700]/55 bg-[#ffd700]/8'
                        : 'border-[rgba(0,255,136,0.12)] bg-black/40 hover:border-cyan-500/35'
                    }`}
                  >
                    {aspect.imageUrl && (
                      <img
                        src={aspect.imageUrl}
                        alt=""
                        className="h-14 w-full object-cover object-top opacity-90"
                      />
                    )}
                    <div className="px-1.5 py-1">
                      <span className="text-[10px] text-white/80">
                        <EmojiText text={aspect.symbol} size="sm" /> {aspect.name.replace(/^.* of /, '')}
                      </span>
                      <span className="block font-mono text-[9px] text-[#00ff88]/70">
                        {Math.round(aspect.proficiency * 100)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="Reflection, journal entry, study note for selected aspect..."
              className="mt-2 w-full resize-none rounded border border-[rgba(0,255,136,0.15)] bg-black/60 p-2 text-xs text-white/85 outline-none focus:border-cyan-500/50"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={loading || !selectedAspect || forgeCenterSelected || !reflection.trim()}
                onClick={() => void runReflect()}
                className="flex-1 rounded border border-[#ffd700]/50 bg-[#ffd700]/10 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#ffd700] transition hover:bg-[#ffd700]/20 disabled:opacity-40"
              >
                Forge
              </button>
              <button
                type="button"
                disabled={loading || selectedAspects.length < 2}
                onClick={() => void runSynthesize()}
                className="flex-1 rounded border border-cyan-500/50 bg-cyan-950/30 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-900/30 disabled:opacity-40"
              >
                Synthesize
              </button>
            </div>
            <p className="mt-2 text-[9px] text-white/35">
              Click to select · Double-click to add synthesis · {selectedAspects.length} in fusion set
            </p>
            {selectedAspects.length >= 2 && (
              <p className="mt-1 text-[9px] text-cyan-400/80">
                Fusion: {selectedAspects.map((k) => baseAspects.find((a) => a.key === k)?.symbol).join(' ')}
              </p>
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="flex min-h-[420px] flex-col">
          <div className="relative flex-1">
            <ForgeAspectScene
              aspects={baseAspects}
              selectedKey={selectedAspect}
              forgeKeys={forgedKeys}
              yarnMode={yarnMode}
              onSelect={selectAspect}
            />
            <div className="absolute right-2 top-2 z-10">
              <button
                type="button"
                onClick={() => setYarnMode((v) => !v)}
                className={`rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition ${
                  yarnMode
                    ? 'border-[#ffd700]/60 bg-[#ffd700]/15 text-[#ffd700]'
                    : 'border-[rgba(0,255,136,0.3)] bg-black/70 text-[#00ff88]'
                }`}
              >
                🧶 YARN {yarnMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center font-mono text-[8px] text-white/30">
              Drag: orbit · Right-drag: pan · Dbl-click: reset · Scroll: zoom
            </p>
          </div>

          <div className={`${FORGE_OS_PANEL} border-x-0 border-b-0`}>
            <div className="flex border-b border-[rgba(0,255,136,0.12)]">
              {(
                [
                  ['inspect', 'INSPECT'],
                  ['directory', 'DIR'],
                  ['codex', 'CODEX'],
                  ['myth', 'MYTH'],
                  ['viz', 'VIZ'],
                  ['simulate', 'SIM'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCenterTab(id)}
                  className={`flex-1 px-2 py-2 font-mono text-[9px] uppercase tracking-wider transition ${
                    centerTab === id
                      ? 'border-b-2 border-[#ffd700] bg-[#ffd700]/8 text-[#ffd700]'
                      : 'text-white/45 hover:text-[#00ff88]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-[280px] overflow-y-auto p-3 text-xs text-white/75">
              {centerTab === 'inspect' && (
                <InspectPane
                  aspect={activeBase}
                  godAspect={activeGod}
                  output={output}
                  forgeCenter={forgeCenterSelected}
                />
              )}
              {centerTab === 'directory' && (
                <DirectoryPane
                  godTier={allGodTier}
                  exportBlock={exportBlock}
                  copyMessage={copyMessage}
                  onCopySave8={() => void copySave8()}
                  onSelectGod={(g) => {
                    setSelectedGodId(g.id);
                    setCenterTab('inspect');
                  }}
                />
              )}
              {centerTab === 'codex' && <CodexPane protocols={protocols} baseAspects={baseAspects} />}
              {centerTab === 'myth' && (
                <MythPane
                  mythologies={mythologies}
                  mythologyId={mythologyId}
                  directive={directive}
                  loading={loading}
                  onMythologyId={setMythologyId}
                  onDirective={setDirective}
                  onRunDcs={() => void runDcs()}
                  output={output?.kind === 'dcs' ? output.data : null}
                  activeMyth={activeMyth}
                />
              )}
              {centerTab === 'viz' && (
                <VizPane
                  aspect={activeBase}
                  godAspect={activeGod}
                  onOpen={() => {
                    if (activeGod) openViz(godTierToViz(activeGod));
                    else if (activeBase) openViz(aspectToViz(activeBase));
                  }}
                />
              )}
              {centerTab === 'simulate' && (
                <SimulatePane
                  protocol={protocol}
                  ore={ore}
                  examples={examples}
                  protocols={protocols}
                  loading={loading}
                  onProtocol={setProtocol}
                  onOre={setOre}
                  onRun={() => void runSimulate()}
                  output={output?.kind === 'simulate' ? output.data : null}
                />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-0 border-l border-[rgba(0,255,136,0.12)]">
          <div className={`${FORGE_OS_PANEL} border-x-0 border-t-0 p-3`}>
            <p className={FORGE_OS_TITLE}>Civilization Status</p>
            <div className="mt-2 space-y-1 font-mono text-[10px] text-white/55">
              <p>
                Base mastery avg: <span className="text-[#ffd700]">{avgMastery}%</span>
              </p>
              <p>
                God-tier directory: <span className="text-[#ffd700]">{godTier?.directory.length ?? 0}</span>
              </p>
              <p>
                Recent DCS forged: <span className="text-[#ffd700]">{godTier?.recent_forged.length ?? 0}</span>
              </p>
              <p>
                Yarn mode: <span className="text-cyan-300">{yarnMode ? 'chromatic wireframe' : 'textured'}</span>
              </p>
            </div>
          </div>
          <div className={`${FORGE_OS_PANEL} flex-1 border-x-0 border-t-0 p-3`}>
            <p className={FORGE_OS_TITLE}>History Log</p>
            <div className="mt-2 max-h-[min(50vh,400px)] space-y-1 overflow-y-auto font-mono text-[10px]">
              {history.length === 0 && (
                <p className="text-white/35">No forge sessions yet — reflect or run DCS.</p>
              )}
              {history.slice(0, 12).map((h) => (
                <div key={h.id} className="rounded border border-white/6 bg-black/40 px-2 py-1 text-white/50">
                  <span className="text-[#00ff88]">{h.protocol}</span>{' '}
                  {h.result?.masterAspect?.name || h.ore_input?.slice(0, 40) || 'session'}
                  <span className="block text-[9px] text-white/30">{h.created_at}</span>
                </div>
              ))}
            </div>
          </div>
          {output && (
            <div className={`${FORGE_OS_PANEL} border-x-0 border-t-0 p-3`}>
              <p className={FORGE_OS_TITLE}>Last Output</p>
              <ForgeOutputCompact output={output} activeMyth={activeMyth} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom: selected subject + god-tier */}
      <div className="border-t border-[rgba(0,255,136,0.15)]">
        <div className="flex items-center gap-3 border-b border-[rgba(0,255,136,0.1)] bg-[rgba(0,7,4,0.9)] px-4 py-2">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-[#ffd700]/35 bg-black">
            {subjectThumb ? (
              <img src={subjectThumb} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl">{subjectSymbol}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-[#ffd700]">{subjectLabel}</p>
            <p className="truncate text-[10px] italic text-cyan-300/80">
              {activeGod?.essence || activeBase?.mantra || 'Select an aspect'}
            </p>
          </div>
          <button
            type="button"
            disabled={!activeBase && !activeGod && !forgeCenterSelected}
            onClick={() => {
              if (activeGod) openViz(godTierToViz(activeGod));
              else if (activeBase) openViz(aspectToViz(activeBase));
              else if (forgeCenterSelected) {
                openViz({
                  symbol: '⚒️',
                  name: 'Aspect Forge Chamber',
                  mantra: 'Forge reflection · synthesize aspects · run DCS',
                  aura: 'synthesis kernel — center of the ring',
                  prompt: 'The chamber where emotional ore becomes forged aspects. Select a base layer aspect on the ring, write reflection, and forge.',
                  deepInsight:
                    'Synthesis law: what is forged separately must align when combined — or the lattice fractures. The center holds the operator.',
                  imageUrl: '/forge/coin-safe-talisman.jpg',
                  aspectKey: FORGE_CENTER_KEY,
                });
              }
            }}
            className="shrink-0 rounded border border-cyan-500/55 bg-cyan-950/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300 transition hover:bg-cyan-900/50 disabled:opacity-35"
          >
            Invoke · Full-screen viz
          </button>
        </div>
        <GodTierAspectsStrip
          aspects={allGodTier}
          selectedId={selectedGodId}
          onSelect={(g) => {
            setSelectedGodId(g.id);
            setCenterTab('inspect');
          }}
        />
      </div>

      <AspectVisualizationModal subject={vizSubject} onClose={() => setVizSubject(null)} />
    </div>
  );
}

function InspectPane({
  aspect,
  godAspect,
  output,
  forgeCenter,
}: {
  aspect?: ForgeBaseAspect;
  godAspect?: GodTierAspect;
  output: ForgeOutput | null;
  forgeCenter?: boolean;
}) {
  if (forgeCenter) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">⚒️</span>
          <div>
            <h3 className="font-display text-base font-bold text-[#ffd700]">Coin-Safe Talisman</h3>
            <p className="font-mono text-[9px] uppercase text-[#00ff88]/70">Forge OS · anvil + hammer · synthesis kernel</p>
          </div>
        </div>
        <p className="leading-relaxed text-white/70">
          Anvil, coin-safe vault, and hammer at the ring center — your physical talisman as the forge hub.
          Ring aspects orbit here. Select one to reflect, or two+ to synthesize.
        </p>
        <p className="border-l-2 border-amber-500/40 pl-3 text-[11px] leading-relaxed text-amber-100/75">
          Synthesis law: what is forged separately must align when combined — or the lattice fractures.
        </p>
      </div>
    );
  }

  if (godAspect) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <EmojiText text={godAspect.glyphs.split(' ')[0]} size="lg" />
          <div>
            <h3 className="font-display text-base font-bold text-[#ffd700]">{godAspect.name}</h3>
            <p className="font-mono text-[9px] uppercase text-[#00ff88]/70">
              {godAspect.ceiling} · {godAspect.category}
            </p>
          </div>
        </div>
        <p className="leading-relaxed text-white/70">{godAspect.essence}</p>
        {godAspect.deepInsight && (
          <p className="border-l-2 border-amber-500/40 pl-3 text-[11px] leading-relaxed text-amber-100/75">
            {godAspect.deepInsight}
          </p>
        )}
        {godAspect.applications && (
          <p className="text-[10px] text-white/45">
            Applications: {godAspect.applications.join(' · ')}
          </p>
        )}
      </div>
    );
  }

  if (!aspect) return <p className="text-white/40">Select a base aspect in the grid or 3D ring.</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {aspect.imageUrl && (
          <img src={aspect.imageUrl} alt="" className="h-24 w-20 rounded border border-[#ffd700]/30 object-cover" />
        )}
        <div>
          <EmojiText text={aspect.symbol} size="xl" />
          <h3 className="font-display text-base font-bold text-[#ffd700]">{aspect.name}</h3>
          <p className="font-mono text-[10px] text-[#00ff88]">{Math.round(aspect.proficiency * 100)}% mastery</p>
        </div>
      </div>
      {aspect.essence && <p className="leading-relaxed text-white/70">{aspect.essence}</p>}
      {aspect.deepInsight && (
        <p className="border-l-2 border-amber-500/40 pl-3 text-[11px] leading-relaxed text-amber-100/75">
          {aspect.deepInsight}
        </p>
      )}
      {aspect.invokeWhen && (
        <p className="text-[10px] text-cyan-400/70">
          <span className="uppercase tracking-wider">Invoke when:</span> {aspect.invokeWhen}
        </p>
      )}
      {aspect.triggers && aspect.triggers.length > 0 && (
        <p className="text-[10px] text-white/40">Triggers: {aspect.triggers.join(' · ')}</p>
      )}
      {output?.kind === 'reflect' && output.data.aspectKey === aspect.key && (
        <p className="rounded border border-[#00ff88]/20 bg-[#00ff88]/5 p-2 text-[11px] text-[#00ff88]">
          {output.data.insight}
        </p>
      )}
    </div>
  );
}

function DirectoryPane({
  godTier,
  exportBlock,
  copyMessage,
  onCopySave8,
  onSelectGod,
}: {
  godTier: GodTierAspect[];
  exportBlock: string | null;
  copyMessage: string | null;
  onCopySave8: () => void;
  onSelectGod: (g: GodTierAspect) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCopySave8}
          className="rounded border border-[#ffd700]/50 px-2 py-1 font-mono text-[9px] uppercase text-[#ffd700]"
        >
          Save8 Export
        </button>
      </div>
      {copyMessage && <p className="text-[10px] text-cyan-400">{copyMessage}</p>}
      {exportBlock && (
        <pre className="max-h-24 overflow-auto rounded bg-black/50 p-2 text-[9px] text-white/50">{exportBlock}</pre>
      )}
      <p className="text-[10px] text-white/40">Forged Aspect Directory · Red Leaf + Custom</p>
      <div className="space-y-1">
        {godTier.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelectGod(g)}
            className="block w-full rounded border border-white/8 bg-black/40 px-2 py-1.5 text-left hover:border-[#ffd700]/35"
          >
            <span className="text-[#ffd700]">{g.name.replace(/^Red Leaf /, '')}</span>
            <span className="block text-[9px] text-white/40">{g.essence.slice(0, 80)}…</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CodexPane({
  protocols,
  baseAspects,
}: {
  protocols: Protocol[];
  baseAspects: ForgeBaseAspect[];
}) {
  return (
    <div className="space-y-3">
      {protocols.slice(0, 4).map((p) => (
        <div key={p.code} className="rounded border border-white/8 bg-black/40 p-2">
          <p className="font-mono text-[10px] text-[#ffd700]">{p.code} — {p.name}</p>
          <p className="mt-1 text-[10px] text-white/45">{p.description}</p>
        </div>
      ))}
      <p className="text-[10px] text-white/35">Base layer codex keys: {baseAspects.map((a) => a.symbol).join(' ')}</p>
    </div>
  );
}

function MythPane({
  mythologies,
  mythologyId,
  directive,
  loading,
  onMythologyId,
  onDirective,
  onRunDcs,
  output,
  activeMyth,
}: {
  mythologies: ForgeMythology[];
  mythologyId: string;
  directive: string;
  loading: boolean;
  onMythologyId: (id: string) => void;
  onDirective: (v: string) => void;
  onRunDcs: () => void;
  output: ForgeResult | null;
  activeMyth?: ForgeMythology;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={directive}
        onChange={(e) => onDirective(e.target.value)}
        rows={2}
        className="w-full rounded border border-[rgba(0,255,136,0.15)] bg-black/60 p-2 text-xs text-white/85 outline-none"
        placeholder="DCS directive: perfect action every second until last breath..."
      />
      <button
        type="button"
        disabled={loading || !mythologyId}
        onClick={onRunDcs}
        className="w-full rounded border border-[#ffd700]/50 bg-[#ffd700]/10 py-2 font-mono text-[10px] uppercase text-[#ffd700] disabled:opacity-40"
      >
        🍁 Run DCS
      </button>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        {mythologies.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onMythologyId(m.id)}
            className={`block w-full rounded border px-2 py-1.5 text-left text-[10px] ${
              mythologyId === m.id
                ? 'border-[#ffd700]/50 bg-[#ffd700]/8'
                : 'border-white/8 hover:border-cyan-500/30'
            }`}
          >
            <EmojiText text={m.glyphs} size="sm" /> <strong>{m.name}</strong>
            <span className="block text-white/45">{m.essence}</span>
          </button>
        ))}
      </div>
      {output && (
        <div className="rounded border border-[#ffd700]/25 bg-[#ffd700]/5 p-2">
          <p className="text-[#ffd700]">{output.masterAspect.name}</p>
          <p className="mt-1 text-[10px] text-white/55">{output.insight}</p>
        </div>
      )}
      {activeMyth && !output && (
        <p className="text-[10px] text-white/40">Ore: {activeMyth.source}</p>
      )}
    </div>
  );
}

function VizPane({
  aspect,
  godAspect,
  onOpen,
}: {
  aspect?: ForgeBaseAspect;
  godAspect?: GodTierAspect;
  onOpen: () => void;
}) {
  const subject = godAspect || aspect;
  if (!subject) {
    return <p className="text-white/40">Select an aspect for full-screen visualization (not breathwork).</p>;
  }
  const prompt = 'meditation' in (subject as ForgeBaseAspect)
    ? (subject as ForgeBaseAspect).meditation?.prompt
    : (subject as GodTierAspect).essence;
  return (
    <div className="space-y-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-white/40">Aspect visualization · photoreal + mantra</p>
      <p className="text-4xl">{godAspect?.glyphs.split(' ')[0] || (aspect as ForgeBaseAspect)?.symbol}</p>
      <p className="font-display text-lg text-[#ffd700]">
        {godAspect?.name || (aspect as ForgeBaseAspect)?.name}
      </p>
      <p className="text-[10px] italic text-cyan-300">{prompt}</p>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded border border-cyan-500/55 py-2 font-mono text-[10px] uppercase tracking-wider text-cyan-300"
      >
        Full screen aspect
      </button>
    </div>
  );
}

function SimulatePane({
  protocol,
  ore,
  examples,
  protocols,
  loading,
  onProtocol,
  onOre,
  onRun,
  output,
}: {
  protocol: string;
  ore: string;
  examples: ForgeExample[];
  protocols: Protocol[];
  loading: boolean;
  onProtocol: (p: string) => void;
  onOre: (v: string) => void;
  onRun: () => void;
  output: ForgeResult | null;
}) {
  const activeProto = protocols.find((p) => p.code === protocol);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {PROTOCOLS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onProtocol(p)}
            className={`rounded border px-2 py-1 font-mono text-[9px] ${
              protocol === p ? 'border-[#ffd700]/50 text-[#ffd700]' : 'border-white/15 text-white/45'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {activeProto && <p className="text-[10px] text-white/45">{activeProto.name}</p>}
      {(protocol === 'AFP' || protocol === 'EOT') && examples.length > 0 && (
        <div className="max-h-20 space-y-1 overflow-y-auto">
          {examples.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onOre(ex.ore)}
              className="block w-full rounded border border-white/8 px-2 py-1 text-left text-[9px] hover:border-cyan-500/30"
            >
              {ex.title}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={ore}
        onChange={(e) => onOre(e.target.value)}
        rows={4}
        placeholder="Paste emotional ore..."
        className="w-full rounded border border-white/15 bg-black/60 p-2 text-xs text-white/85 outline-none"
      />
      <button
        type="button"
        disabled={loading || !ore.trim()}
        onClick={onRun}
        className="w-full rounded border border-[#ffd700]/50 py-2 font-mono text-[10px] uppercase text-[#ffd700] disabled:opacity-40"
      >
        Run {protocol}
      </button>
      {output && (
        <p className="text-[10px] text-cyan-400/80">{output.insight}</p>
      )}
    </div>
  );
}

function ForgeOutputCompact({
  output,
  activeMyth,
}: {
  output: ForgeOutput;
  activeMyth?: ForgeMythology;
}) {
  if (output.kind === 'reflect') {
    const { data } = output;
    return (
      <div className="text-[10px] text-white/55">
        <p className="text-[#00ff88]">
          {data.aspect.symbol} +{data.mastery.gain.toFixed(2)} mastery
        </p>
        <p className="mt-1 line-clamp-3">{data.insight}</p>
      </div>
    );
  }
  if (output.kind === 'synthesize') {
    return (
      <div className="text-[10px] text-white/55">
        <p className="text-violet-300">{output.data.title}</p>
        <p className="mt-1 line-clamp-2">{output.data.insight}</p>
      </div>
    );
  }
  const result = output.data;
  return (
    <div className="text-[10px] text-white/55">
      <div className="flex items-center gap-1">
        <EmojiText text={result.masterAspect.symbolChain} size="sm" />
        <span className="text-[#ffd700]">{result.masterAspect.name}</span>
        <TierBadge tier={result.masterAspect.tier} />
      </div>
      <p className="mt-1 line-clamp-2">{result.insight}</p>
    </div>
  );
}