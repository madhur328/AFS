import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, Visualization } from '../lib/api';
import { isStaticMode } from '../lib/staticApi';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { filterVisualizations, fileNameFromPath } from '../lib/viz-search';
import { Panel, Button } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';
import { RefreshCw } from 'lucide-react';

const TYPE_FILTERS = ['', 'video', 'image', 'engine'] as const;
const STATIC_TYPE_FILTERS = ['', 'video', 'image'] as const;

function vizFileName(v: Visualization): string {
  return fileNameFromPath(v.path);
}

const typeColors: Record<string, string> = {
  image: 'border-forge-cyan/40',
  video: 'border-forge-leaf/40',
  engine: 'border-forge-violet/40',
};

function VizPreview({ v }: { v: Visualization }) {
  const src = api.visualizationMediaUrl(v.id);
  const missing = (v.type === 'image' || v.type === 'video') && !src;

  if (missing) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-forge-border/60 bg-black/40 px-3 text-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-forge-muted">Media not bundled</span>
        <span className="text-[10px] text-forge-muted/80">Keep videos/afs beside the static HTML file</span>
      </div>
    );
  }

  if (v.type === 'image') {
    return (
      <img
        src={src}
        alt={v.title}
        className="aspect-video w-full rounded-lg object-cover bg-black/50"
        loading="lazy"
      />
    );
  }

  if (v.type === 'video') {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/60">
        <video
          src={src}
          preload="metadata"
          muted
          playsInline
          className="h-full w-full object-cover opacity-80"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-forge-leaf/50 bg-forge-leaf/20 text-2xl text-forge-leaf">
            ▶
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex aspect-video w-full items-center justify-center rounded-lg border border-forge-violet/30 bg-forge-violet/10">
      <span className="font-mono text-sm uppercase tracking-widest text-forge-violet">Launch app</span>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-forge-violet/50 bg-forge-violet/20 text-2xl text-forge-violet">
          ↗
        </span>
      </div>
    </div>
  );
}

const LOOP_PREF_KEY = 'afs-viz-video-loop';

function readLoopPref() {
  try {
    return localStorage.getItem(LOOP_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

function FullscreenViewer({
  v,
  onClose,
}: {
  v: Visualization;
  onClose: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [loop, setLoop] = useState(readLoopPref);
  const src = api.visualizationMediaUrl(v.id);

  const toggleLoop = () => {
    setLoop((on) => {
      const next = !on;
      try {
        localStorage.setItem(LOOP_PREF_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    if (mediaRef.current) mediaRef.current.loop = loop;
  }, [loop]);

  const close = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    shell.requestFullscreen?.().catch(() => {});

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
      if (document.fullscreenElement === shell) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [close, onClose]);

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={v.title}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold text-white">{v.title}</h2>
          {v.aspect_link && (
            <p className="truncate text-sm text-forge-leaf">{v.aspect_link}</p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-sm text-forge-muted transition hover:border-white/40 hover:text-white"
        >
          Close
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-4">
        {v.type === 'video' && (
          <div className="flex h-full w-full max-w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/80">
            <video
              ref={mediaRef}
              src={src}
              controls
              autoPlay
              loop={loop}
              playsInline
              className="min-h-0 flex-1 w-full object-contain"
            />
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black/95 px-4 py-3">
              <span className="font-mono text-xs uppercase tracking-wider text-forge-muted">Playback</span>
              <button
                type="button"
                onClick={toggleLoop}
                aria-pressed={loop}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  loop
                    ? 'border-forge-leaf bg-forge-leaf/20 text-forge-leaf'
                    : 'border-forge-cyan/40 bg-forge-cyan/10 text-forge-cyan hover:border-forge-cyan/70'
                }`}
              >
                {loop ? 'Loop: ON' : 'Loop: OFF'}
              </button>
            </div>
          </div>
        )}
        {v.type === 'image' && (
          <img src={src} alt={v.title} className="max-h-full max-w-full object-contain" />
        )}
      </div>
    </div>
  );
}

export default function Visualizations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Visualization[]>([]);
  const [filter, setFilter] = useState(() => searchParams.get('q') || '');
  const debouncedFilter = useDebouncedValue(filter, 120);
  const [active, setActive] = useState<Visualization | null>(null);
  const [launchingId, setLaunchingId] = useState<number | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const staticMode = isStaticMode() || import.meta.env.VITE_STATIC === 'true';

  const loadVisualizations = useCallback(() => {
    return api.visualizations().then(setItems);
  }, []);

  function updateFilter(value: string) {
    setFilter(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value.trim()) next.set('q', value);
      else next.delete('q');
      return next;
    });
  }

  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== filter) setFilter(q);
  }, [searchParams]);

  useEffect(() => {
    loadVisualizations().catch(() => {});
  }, [loadVisualizations]);

  const syncVideos = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setLaunchError(null);
    try {
      const result = await api.syncVisualizations();
      await loadVisualizations();
      setSyncMessage(
        `Synced ${result.inserted} videos + ${result.imagesInserted ?? 0} images from videos/afs (${result.totalVisualizations} total visuals).`
      );
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Video sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const openViz = async (v: Visualization) => {
    if (v.type === 'engine') {
      if (staticMode) return;
      setLaunchError(null);
      setLaunchingId(v.id);
      try {
        await api.launchVisualization(v.id);
        setSyncMessage('ENTHEA Live launched.');
      } catch (err) {
        setLaunchError(err instanceof Error ? err.message : 'Failed to launch ENTHEA');
      } finally {
        setLaunchingId(null);
      }
      return;
    }
    setActive(v);
  };

  const directoryLoading = Boolean(filter.trim() && filter !== debouncedFilter);

  const filtered = useMemo(() => {
    let rows = filterVisualizations(items, debouncedFilter);
    if (typeFilter) rows = rows.filter((v) => v.type === typeFilter);
    return rows;
  }, [items, debouncedFilter, typeFilter]);

  const sorted = useMemo(() => {
    const order = { video: 0, image: 1, engine: 2 };
    return [...filtered].sort((a, b) => {
      const ta = order[a.type as keyof typeof order] ?? 3;
      const tb = order[b.type as keyof typeof order] ?? 3;
      if (ta !== tb) return ta - tb;
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    });
  }, [filtered]);

  const searchActive = Boolean(debouncedFilter.trim() || typeFilter);
  const showNoMatches = !directoryLoading && searchActive && sorted.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Visualizations</h1>
          <p className="text-forge-muted">
            Forge art · motion artifacts ·{' '}
            <Link to="/grok" className="text-forge-ember hover:underline">
              Red Leaf / ENTHEA origin
            </Link>
          </p>
          <p className="mt-1 font-mono text-xs text-forge-cyan">
            {directoryLoading && filter.trim()
              ? `Searching for "${filter.trim()}"…`
              : searchActive
                ? `${sorted.length} match${sorted.length === 1 ? '' : 'es'}${debouncedFilter.trim() ? ` for "${debouncedFilter.trim()}"` : ''}${typeFilter ? ` · ${typeFilter}` : ''} · ${items.length} total`
                : staticMode
                  ? `${items.length} artifacts — click videos/images for fullscreen`
                  : `${items.length} artifacts — click videos/images for fullscreen, engines launch locally`}
          </p>
          <p className="mt-1 font-mono text-xs text-forge-muted">
            {staticMode ? (
              <>
                Offline: media from <span className="text-forge-cyan">videos/afs/</span> beside this HTML
              </>
            ) : (
              <>
                Media vault: <span className="text-forge-cyan">videos/afs</span> (videos +{' '}
                <span className="text-forge-cyan">images/</span>) · ENTHEA:{' '}
                <span className="text-forge-cyan">enthea-rs.exe</span>
              </>
            )}
          </p>
          {syncMessage && <p className="mt-2 text-sm text-forge-leaf">{syncMessage}</p>}
          {launchError && <p className="mt-2 text-sm text-red-400">{launchError}</p>}
        </div>
        {!staticMode && (
          <Button
            variant="ghost"
            onClick={syncVideos}
            disabled={syncing}
            className="shrink-0 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync videos'}
          </Button>
        )}
      </header>
      <GenesisBanner compact />

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => updateFilter(e.target.value)}
          placeholder="Search titles, filenames, aspects…"
          className="min-w-0 flex-1 rounded-lg border border-forge-border bg-forge-panel px-4 py-2.5 text-base outline-none focus:border-forge-cyan disabled:opacity-50 sm:min-w-[220px] sm:text-sm"
        />
        {(staticMode ? STATIC_TYPE_FILTERS : TYPE_FILTERS).map((t) => (
          <button
            key={t || 'all'}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`rounded-lg border px-3 py-2 text-xs font-mono uppercase ${
              typeFilter === t
                ? 'border-forge-cyan bg-forge-cyan/10 text-forge-cyan'
                : 'border-forge-border text-forge-muted'
            }`}
          >
            {t || 'ALL'}
          </button>
        ))}
      </div>

      {directoryLoading ? (
        <Panel title="Searching" subtitle={filter.trim() ? `"${filter.trim()}"` : 'Visuals'}>
          <p className="text-sm text-forge-muted">Querying motion artifacts and filenames…</p>
        </Panel>
      ) : showNoMatches ? (
        <Panel title="No matches">
          <p className="text-sm text-forge-muted">
            No visuals match &ldquo;{debouncedFilter || typeFilter}&rdquo;
            {typeFilter ? ` in type ${typeFilter}` : ''}. Try part of a filename (e.g. infinite spiral).
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!directoryLoading && sorted.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => openViz(v)}
            disabled={launchingId === v.id}
            className="group text-left transition hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-forge-cyan/60 disabled:opacity-60"
          >
            <Panel className={`h-full cursor-pointer ${typeColors[v.type] || ''}`}>
              <VizPreview v={v} />
              <span className="mt-3 block font-mono text-xs uppercase text-forge-muted">{v.type}</span>
              <h3 className="mt-1 font-medium group-hover:text-forge-cyan">
                {launchingId === v.id ? 'Launching…' : v.title}
              </h3>
              {vizFileName(v) && vizFileName(v) !== `${v.title}.mp4` && (
                <p className="mt-1 truncate font-mono text-[10px] text-forge-muted/80" title={v.path}>
                  {vizFileName(v)}
                </p>
              )}
              {v.description && (
                <p className="mt-1 line-clamp-2 text-sm text-forge-muted">{v.description}</p>
              )}
              {v.aspect_link && (
                <span className="mt-3 inline-block rounded bg-forge-leaf/10 px-2 py-1 text-xs text-forge-leaf">
                  {v.aspect_link}
                </span>
              )}
            </Panel>
          </button>
        ))}
      </div>

      {active && <FullscreenViewer v={active} onClose={() => setActive(null)} />}
    </div>
  );
}