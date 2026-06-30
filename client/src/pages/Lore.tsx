import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { api, LoreEntry, LoreVisualizationLink, ProficiencyTrack, Visualization } from '../lib/api';
import { isStaticMode } from '../lib/staticApi';
import {
  DEFAULT_ALCHEMY_DOMAINS,
  levelMeta,
  PROFICIENCY_LEVELS,
} from '../lib/proficiency-levels';
import { Panel, Button, ProgressBar } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';
import EmojiText from '../components/EmojiText';
import { EXPANDABLE_MYTH_KEYS, mythExcerpt, mythHasFullBody, mythIsExpandable } from '../lib/lore-myths';
import { BASE_LAYER_SLOTS } from '../lib/base-layer';

type Tab = 'alchemy' | 'base-aspect' | 'myth' | 'poem' | 'prayer' | 'proficiency';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'alchemy', label: 'Alchemy', emoji: '⚗️' },
  { id: 'base-aspect', label: 'Base Aspects', emoji: '⚓' },
  { id: 'myth', label: 'Myths', emoji: '🪽' },
  { id: 'poem', label: 'Poems', emoji: '📜' },
  { id: 'prayer', label: 'Prayers', emoji: '🕯️' },
  { id: 'proficiency', label: 'Proficiency', emoji: '📊' },
];

/** Standardized lore image frames — scale to fit, never crop. */
const LORE_IMAGE_SHELL =
  'mx-auto mb-4 w-full overflow-hidden rounded-xl border border-forge-border bg-black/40 shadow-lg';
const LORE_IMAGE_CANVAS =
  'flex min-h-0 items-center justify-center p-3 sm:p-4';
const LORE_IMAGE_IMG = 'max-h-full max-w-full object-contain object-center';

function loreImageShellClass(variant: 'single' | 'gallery') {
  return variant === 'gallery'
    ? `${LORE_IMAGE_SHELL} max-w-lg sm:max-w-xl`
    : `${LORE_IMAGE_SHELL} max-w-sm sm:max-w-md`;
}

function LoreImages({ entry }: { entry: LoreEntry }) {
  const extras = entry.extra_images_available?.length
    ? entry.extra_images_available
    : entry.extra_images || [];

  const frames: { key: string; src: string; alt: string }[] = [];
  if (entry.has_image) {
    frames.push({ key: 'primary', src: api.loreMediaUrl(entry.id), alt: entry.title });
  }
  for (const file of extras) {
    frames.push({
      key: file,
      src: api.loreMediaUrl(entry.id, file),
      alt: `${entry.title} — ${file}`,
    });
  }

  if (frames.length === 0) return null;

  if (frames.length === 1) {
    return (
      <div className={loreImageShellClass('single')}>
        <div className={`${LORE_IMAGE_CANVAS} h-48 sm:h-56 md:h-60`}>
          <img
            src={frames[0].src}
            alt={frames[0].alt}
            className={LORE_IMAGE_IMG}
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={loreImageShellClass('gallery')}>
      <div className="grid h-44 grid-cols-[2fr_3fr] sm:h-52 md:h-56">
        {frames.map((frame, idx) => (
          <div
            key={frame.key}
            className={`flex h-full min-h-0 items-center justify-center overflow-hidden bg-black/30 ${
              idx > 0 ? 'border-l border-forge-border/60' : ''
            }`}
          >
            <img
              src={frame.src}
              alt={frame.alt}
              className={`${LORE_IMAGE_IMG} px-2 py-2`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function findLinkedVisualization(rows: Visualization[], viz: LoreVisualizationLink) {
  const needles = [viz.title, viz.legacy_title]
    .filter((s): s is string => Boolean(s))
    .map((s) => s.toLowerCase());
  return rows.find((row) => {
    if (row.type !== 'video') return false;
    const title = row.title.toLowerCase();
    const path = (row.path || row.media_url || '').toLowerCase();
    return needles.some(
      (n) =>
        title === n ||
        title.includes(n) ||
        path.includes(n) ||
        path.includes(n.replace(/\s+/g, '%20'))
    );
  });
}

function LoreVisualizationPlayer({ entry }: { entry: LoreEntry }) {
  const viz = entry.visualization;
  const [open, setOpen] = useState(false);
  const [video, setVideo] = useState<Visualization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<HTMLVideoElement>(null);

  if (!viz?.title) return null;

  const resolveVideo = async () => {
    if (video) return video;
    setLoading(true);
    setError(null);
    try {
      const rows = await api.visualizations();
      const found = findLinkedVisualization(rows, viz);
      if (!found) {
        throw new Error(`${viz.title} not found in the media vault`);
      }
      if (found.media_offline) {
        throw new Error('Video file not bundled beside the static HTML');
      }
      setVideo(found);
      return found;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load video';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    const resolved = await resolveVideo();
    if (!resolved) return;
    setOpen(true);
    requestAnimationFrame(() => {
      mediaRef.current?.play().catch(() => {});
    });
  };

  const handleClose = () => {
    mediaRef.current?.pause();
    setOpen(false);
  };

  const src = video ? api.visualizationMediaUrl(video.id) : '';

  return (
    <div className="mt-4 rounded-lg border border-forge-leaf/30 bg-forge-leaf/5 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-forge-muted">Motion artifact</p>

      {!open ? (
        <button
          type="button"
          onClick={() => void handlePlay()}
          disabled={loading}
          className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-forge-leaf transition hover:text-forge-cyan disabled:opacity-60"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-forge-leaf/40 bg-forge-leaf/15 text-xs">
            ▶
          </span>
          {loading ? 'Loading video…' : `Watch: ${viz.title}`}
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-forge-leaf">{video?.title || viz.title}</p>
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-lg border border-forge-border px-2.5 py-1 text-xs text-forge-muted transition hover:border-forge-cyan/40 hover:text-forge-cyan"
            >
              Close
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-forge-border bg-black">
            <video
              ref={mediaRef}
              src={src}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full object-contain"
            />
          </div>
        </div>
      )}

      {viz.legacy_title && viz.legacy_title !== viz.title && !open && (
        <p className="mt-1 font-mono text-[10px] text-forge-muted/80">
          formerly &ldquo;{viz.legacy_title}&rdquo;
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function LoreContent({ text }: { text: string }) {
  return (
    <div className="max-h-none whitespace-pre-wrap font-sans text-sm leading-relaxed text-forge-muted lg:columns-1">
      {text.split('\n').map((line, i) =>
        line.startsWith('**') && line.endsWith('**') ? (
          <h4 key={i} className="mb-2 mt-6 font-display text-base font-semibold text-forge-ember first:mt-0">
            {line.replace(/\*\*/g, '')}
          </h4>
        ) : line === '---' ? (
          <hr key={i} className="my-6 border-forge-border/60" />
        ) : (
          <p key={i} className={line ? 'mb-3' : 'mb-1'}>
            {line}
          </p>
        )
      )}
    </div>
  );
}

function LoreAspectTags({ links }: { links: string[] }) {
  if (!links?.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((a) => (
        <span
          key={a}
          className="rounded-full border border-forge-leaf/30 bg-forge-leaf/10 px-2 py-0.5 text-xs text-forge-leaf"
        >
          {a}
        </span>
      ))}
    </div>
  );
}

function LoreCardHeader({ entry }: { entry: LoreEntry }) {
  return (
    <div className="flex items-start gap-2">
      <EmojiText text={entry.symbol || '·'} size="xl" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold text-forge-cyan">{entry.title}</h3>
          {entry.proficiency_pct != null && (
            <span className="rounded-full border border-forge-cyan/30 bg-forge-cyan/10 px-2 py-0.5 font-mono text-[10px] text-forge-cyan">
              {entry.proficiency_pct}%
            </span>
          )}
        </div>
        {entry.source && (
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-forge-muted">
            {entry.source}
          </p>
        )}
      </div>
    </div>
  );
}

function ExpandableMythCard({ entry }: { entry: LoreEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const preview = mythExcerpt(entry);
  const hasFullBody = mythHasFullBody(entry);
  const needsFetch = EXPANDABLE_MYTH_KEYS.has(entry.key) || !hasFullBody;

  const loadFullStory = async () => {
    if (fullContent) return fullContent;
    if (hasFullBody && !EXPANDABLE_MYTH_KEYS.has(entry.key)) {
      setFullContent(entry.content);
      return entry.content;
    }
    setLoadingStory(true);
    setStoryError(null);
    try {
      const story = await api.loreStory(entry.key);
      setFullContent(story.content);
      return story.content;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load myth';
      setStoryError(msg);
      return null;
    } finally {
      setLoadingStory(false);
    }
  };

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (needsFetch) await loadFullStory();
    setExpanded(true);
    requestAnimationFrame(() => {
      document.getElementById(`myth-${entry.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <article
      id={`myth-${entry.id}`}
      className={`rounded-xl border border-forge-border bg-white/[0.03] p-5 transition ${
        expanded ? 'border-forge-cyan/30 shadow-glow' : 'cursor-pointer hover:border-forge-cyan/40 hover:bg-white/[0.05]'
      }`}
      role={expanded ? undefined : 'button'}
      tabIndex={expanded ? undefined : 0}
      onClick={!expanded ? () => void toggle() : undefined}
      onKeyDown={(e) => {
        if (!expanded && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          void toggle();
        }
      }}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <LoreCardHeader entry={entry} />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggle();
          }}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-forge-cyan/30 bg-forge-cyan/10 px-3 py-1.5 text-xs font-medium text-forge-cyan transition hover:border-forge-cyan/50 hover:bg-forge-cyan/20"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse myth' : 'Read full myth'}
        >
          {expanded ? (
            <>
              Collapse
              <ChevronUp size={14} />
            </>
          ) : (
            <>
              Read full myth
              <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>

      <div className="mt-4">
        {expanded ? (
          <>
            <LoreImages entry={entry} />
            {loadingStory ? (
              <p className="text-sm text-forge-muted">Loading full myth…</p>
            ) : storyError ? (
              <p className="text-sm text-red-300">{storyError}</p>
            ) : (
              <LoreContent text={fullContent || entry.content} />
            )}
          </>
        ) : (
          <>
            <LoreContent text={preview} />
            <p className="mt-4 flex items-center gap-1 border-t border-dashed border-forge-border/70 pt-3 text-xs font-medium text-forge-cyan">
              Click card to read the original myth
              <ChevronDown size={14} />
            </p>
          </>
        )}
      </div>

      <LoreAspectTags links={entry.aspect_links} />
    </article>
  );
}

function BaseAspectLoreSection({ entries }: { entries: LoreEntry[] }) {
  const [subKey, setSubKey] = useState('anchor');
  const activeSlot = BASE_LAYER_SLOTS.find((s) => s.loreKey === subKey) ?? BASE_LAYER_SLOTS[0];
  const activeEntry = entries.find((e) => e.base_layer_key === subKey);

  return (
    <div className="space-y-5">
      <p className="text-sm text-forge-muted">
        Base Layer primitives — irreducible aspects. Lore grows one subsection at a time.
      </p>

      <div className="flex flex-wrap gap-2">
        {BASE_LAYER_SLOTS.map((slot) => {
          const hasLore = entries.some((e) => e.base_layer_key === slot.loreKey);
          const active = subKey === slot.loreKey;
          return (
            <button
              key={slot.loreKey}
              type="button"
              onClick={() => setSubKey(slot.loreKey)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                active
                  ? 'border-forge-cyan bg-forge-cyan/15 text-forge-cyan shadow-glow'
                  : 'border-forge-border bg-white/5 text-forge-muted hover:border-forge-cyan/30 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <EmojiText text={slot.symbol} size="sm" />
                <span>{slot.name}</span>
              </span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider">
                {slot.proficiencyPct}%
                {!hasLore ? ' · coming soon' : ''}
              </span>
            </button>
          );
        })}
      </div>

      <Panel
        title={`${activeSlot.symbol} ${activeSlot.name}`}
        subtitle={`Base Layer · ${activeSlot.proficiencyPct}% proficiency`}
      >
        {activeEntry ? (
          <LoreCard entry={activeEntry} nested />
        ) : (
          <p className="text-sm text-forge-muted">
            Lore for <span className="text-forge-cyan">{activeSlot.name}</span> is not forged yet.
            Anchor of Stability is the first entry in this series.
          </p>
        )}
      </Panel>
    </div>
  );
}

function LoreCard({ entry, expandable, nested }: { entry: LoreEntry; expandable?: boolean; nested?: boolean }) {
  if (expandable) {
    return <ExpandableMythCard entry={entry} />;
  }

  return (
    <article
      className={
        nested
          ? 'bg-transparent p-0'
          : 'rounded-xl border border-forge-border bg-white/[0.03] p-5 transition hover:border-forge-cyan/30'
      }
    >
      <LoreImages entry={entry} />
      <LoreCardHeader entry={entry} />
      <div className="mt-4">
        <LoreContent text={entry.content} />
      </div>
      <LoreVisualizationPlayer entry={entry} />
      <LoreAspectTags links={entry.aspect_links} />
    </article>
  );
}

export default function Lore() {
  const [tab, setTab] = useState<Tab>('alchemy');
  const [lore, setLore] = useState<LoreEntry[]>([]);
  const [tracks, setTracks] = useState<ProficiencyTrack[]>([]);
  const [viewMode, setViewMode] = useState<'label' | 'percent'>('label');
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const staticMode = isStaticMode();

  const load = useCallback(async () => {
    setLoading(true);
    const [l, t] = await Promise.all([api.lore(), api.proficiencyTracks()]);
    setLore(l);
    setTracks(t);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => lore.filter((e) => e.section === tab),
    [lore, tab]
  );

  const alchemyTracks = tracks.filter((t) => t.domain === 'alchemy');

  const updateTrack = async (id: number, patch: Partial<ProficiencyTrack>) => {
    const updated = await api.updateProficiencyTrack(id, patch);
    setTracks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const addTrack = async () => {
    if (!newLabel.trim()) return;
    const key = newLabel.trim().toLowerCase().replace(/\s+/g, '-');
    try {
      const created = await api.createProficiencyTrack({
        domain: 'custom',
        key,
        label: newLabel.trim(),
        level: 0,
      });
      setTracks((prev) => [...prev, created]);
      setNewLabel('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not add track');
    }
  };

  const autoSuggest = async () => {
    if (staticMode) return;
    const result = await api.autoSuggestProficiency();
    setTracks(result.tracks);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Lore & Alchemy</h1>
        <p className="text-forge-muted">
          Codex from the{' '}
          <Link to="/grok" className="text-forge-ember hover:underline">
            Grok Origin
          </Link>{' '}
          — alchemy domains, base layer lore, myths, poems, prayers, and self-audited proficiency.
        </p>
      </header>

      <GenesisBanner />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-forge-cyan/15 text-forge-cyan shadow-glow'
                : 'bg-white/5 text-forge-muted hover:text-white'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <EmojiText text={t.emoji} size="sm" />
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-forge-muted">Loading lore...</p>
      ) : tab === 'proficiency' ? (
        <div className="space-y-6">
          <Panel
            title="Proficiency Ladder"
            subtitle="Eight steps: non-existent → fluid sublimation · self-assigned · self-auditable"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-forge-muted">View as:</span>
              <button
                type="button"
                onClick={() => setViewMode('label')}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  viewMode === 'label' ? 'bg-forge-cyan/20 text-forge-cyan' : 'bg-white/5 text-forge-muted'
                }`}
              >
                Labels
              </button>
              <button
                type="button"
                onClick={() => setViewMode('percent')}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  viewMode === 'percent' ? 'bg-forge-cyan/20 text-forge-cyan' : 'bg-white/5 text-forge-muted'
                }`}
              >
                Percentages
              </button>
              {!staticMode && (
                <Button variant="ghost" onClick={autoSuggest} className="ml-auto text-xs">
                  Auto-suggest from identity
                </Button>
              )}
            </div>

            <div className="mb-6 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {PROFICIENCY_LEVELS.map((lvl) => (
                <div
                  key={lvl.level}
                  className="rounded-lg border border-forge-border/60 bg-black/20 px-2 py-2 text-center"
                >
                  <p className="font-mono text-[10px] text-forge-muted">{lvl.short}</p>
                  <p className="text-xs text-forge-cyan">{lvl.label}</p>
                  <p className="font-mono text-[10px] text-forge-muted">{lvl.percent}%</p>
                </div>
              ))}
            </div>

            <h4 className="mb-3 font-mono text-xs uppercase tracking-widest text-forge-leaf">
              Alchemy domains
            </h4>
            <div className="space-y-4">
              {alchemyTracks.length === 0 &&
                DEFAULT_ALCHEMY_DOMAINS.map((d) => (
                  <p key={d.key} className="text-sm text-forge-muted">
                    Run <code className="text-forge-cyan">npm run seed-lore</code> to seed tracks.
                  </p>
                ))}
              {alchemyTracks.map((track) => (
                <ProficiencyRow
                  key={track.id}
                  track={track}
                  viewMode={viewMode}
                  readOnly={staticMode}
                  onChange={(patch) => updateTrack(track.id, patch)}
                />
              ))}
            </div>

            <h4 className="mb-3 mt-8 font-mono text-xs uppercase tracking-widest text-forge-muted">
              Operators & base layer
            </h4>
            <div className="space-y-3">
              {tracks
                .filter((t) => t.domain !== 'alchemy' && t.domain !== 'custom')
                .map((track) => (
                  <ProficiencyRow
                    key={track.id}
                    track={track}
                    viewMode={viewMode}
                    readOnly={staticMode}
                    onChange={(patch) => updateTrack(track.id, patch)}
                  />
                ))}
            </div>

            {!staticMode && (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-forge-border pt-6">
                <input
                  className="min-w-[200px] flex-1 rounded-lg border border-forge-border bg-black/30 px-3 py-2 text-sm"
                  placeholder="Add custom track label..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTrack()}
                />
                <Button onClick={addTrack}>Add track</Button>
              </div>
            )}
          </Panel>
        </div>
      ) : tab === 'base-aspect' ? (
        <BaseAspectLoreSection entries={filtered} />
      ) : (
        <div
          className={`grid gap-6 ${
            tab === 'myth' || tab === 'prayer' ? '' : 'lg:grid-cols-2'
          }`}
        >
          {filtered.length === 0 ? (
            <p className="text-forge-muted">
              No entries — run <code className="text-forge-cyan">npm run seed-lore</code>
            </p>
          ) : (
            filtered.map((entry) => (
              <LoreCard
                key={entry.id}
                entry={entry}
                expandable={tab === 'myth' && mythIsExpandable(entry, tab)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ProficiencyRow({
  track,
  viewMode,
  readOnly,
  onChange,
}: {
  track: ProficiencyTrack;
  viewMode: 'label' | 'percent';
  readOnly: boolean;
  onChange: (patch: Partial<ProficiencyTrack>) => void;
}) {
  const meta = levelMeta(track.level);
  const display =
    viewMode === 'percent' ? `${meta.percent}%` : `${meta.short} · ${meta.label}`;

  return (
    <div className="rounded-xl border border-forge-border bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-white">{track.label}</p>
          <p className="font-mono text-[10px] uppercase text-forge-muted">
            {track.domain}
            {track.auto_suggested ? ' · auto-suggested' : ''}
          </p>
        </div>
        <p className="font-display text-xl font-bold text-forge-cyan">{display}</p>
      </div>
      <div className="mt-3">
        <ProgressBar value={meta.percent / 100} color="cyan" />
      </div>
      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="range"
            min={0}
            max={7}
            step={1}
            value={track.level}
            onChange={(e) => onChange({ level: Number(e.target.value) })}
            className="min-w-[120px] flex-1 accent-forge-cyan"
          />
          <span className="font-mono text-xs text-forge-muted">L{track.level}</span>
        </div>
      )}
    </div>
  );
}