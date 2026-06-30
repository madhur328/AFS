import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, Aspect, type DiamondFaceMatch } from '../lib/api';
import { isStaticMode } from '../lib/staticApi';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { aspectQualityFromFaceIndex } from '../lib/aspect-quality';
import { Panel, TierBadge, QualityBadge, ProgressBar, Button } from '../components/ui';
import AspectDetailPanel from '../components/AspectDetailPanel';
import AspectForm from '../components/AspectForm';
import { ensureAspectDetail, type AspectFullDetail } from '../lib/aspect-detail';
import { detailToForm, formToPayload, type AspectFormData } from '../lib/aspect-pattern';
import { resolveAspectDisplayChain } from '../lib/symbols';
import {
  directoryDisplayName,
  directoryRowKey,
  isGenericDiamondFaceName,
  searchAspectDirectory,
  type AspectDirectoryRow,
} from '../lib/aspect-search';
import EmojiText from '../components/EmojiText';
import { Plus, RefreshCw } from 'lucide-react';

const TIERS = ['S', 'A', 'B', 'C', 'D'];

type EditorMode = 'view' | 'create' | 'edit';
type RegistryStatus = 'loading' | 'ready' | 'error';

export default function Aspects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allAspects, setAllAspects] = useState<Aspect[]>([]);
  const [faceIndex, setFaceIndex] = useState<Record<number, DiamondFaceMatch[]>>({});
  const [directoryRows, setDirectoryRows] = useState<AspectDirectoryRow[]>([]);
  const [filter, setFilter] = useState(() => searchParams.get('q') || '');
  const debouncedFilter = useDebouncedValue(filter, 120);
  const [tier, setTier] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const id = searchParams.get('id');
    return id ? Number(id) : null;
  });
  const [highlightedFace, setHighlightedFace] = useState<string | null>(() => searchParams.get('face'));
  const [detail, setDetail] = useState<AspectFullDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [registryStatus, setRegistryStatus] = useState<RegistryStatus>('loading');
  const [loadError, setLoadError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [editForm, setEditForm] = useState<AspectFormData | undefined>();
  const [deleting, setDeleting] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const staticMode = isStaticMode() || import.meta.env.VITE_STATIC === 'true';

  const reloadList = useCallback(() => {
    setRegistryStatus('loading');
    setLoadError('');
    return Promise.all([
      api.aspects(),
      api.aspectFaceIndex().catch(() => ({ byId: {}, builtAt: '', aspectCount: 0, faceCount: 0 })),
    ])
      .then(([rows, index]) => {
        setAllAspects(rows);
        setFaceIndex(index.byId);
        setRegistryStatus('ready');
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load aspects');
        setRegistryStatus('error');
        throw err;
      });
  }, []);

  useEffect(() => {
    reloadList().catch(() => {});
  }, [reloadList]);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== filter) setFilter(q);
    const id = searchParams.get('id');
    setSelectedId(id ? Number(id) : null);
    setHighlightedFace(searchParams.get('face'));
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId || editorMode !== 'view') {
      if (!selectedId) setDetail(null);
      return;
    }
    setDetailLoading(true);
    api
      .aspect(selectedId)
      .then((raw) => setDetail(ensureAspectDetail(raw)))
      .catch((err) => {
        setSearchError(err instanceof Error ? err.message : 'Failed to load aspect detail');
      })
      .finally(() => setDetailLoading(false));
  }, [selectedId, editorMode]);

  useEffect(() => {
    if (registryStatus !== 'ready') return;
    setSearchError('');

    if (!debouncedFilter.trim()) {
      let rows = allAspects;
      if (tier) rows = rows.filter((a) => a.tier === tier);
      setDirectoryRows(rows);
      return;
    }

    setDirectoryRows(
      searchAspectDirectory(
        allAspects,
        (aspect) => faceIndex[aspect.id] || [],
        { q: debouncedFilter.trim(), tier: tier || undefined }
      )
    );
  }, [debouncedFilter, tier, allAspects, faceIndex, registryStatus]);

  const directoryLoading = Boolean(filter.trim() && filter !== debouncedFilter);

  const aspects = directoryRows;

  const subtitle = useMemo(() => {
    if (registryStatus === 'loading') return 'Loading aspect registry…';
    if (registryStatus === 'error') return 'Registry unavailable — API not reachable';
    if (directoryLoading && filter.trim()) return `Searching for "${filter.trim()}"…`;
    if (filter.trim()) {
      if (searchError && aspects.length === 0) return `Search failed for "${filter.trim()}"`;
      const faceCount = aspects.filter((a) => a.matchKind === 'diamond_face').length;
      const masterCount = aspects.filter((a) => a.matchKind !== 'diamond_face').length;
      const parts = [`${aspects.length} match${aspects.length === 1 ? '' : 'es'} for "${filter.trim()}"`];
      if (faceCount) parts.push(`${faceCount} diamond face${faceCount === 1 ? '' : 's'}`);
      if (masterCount) parts.push(`${masterCount} master aspect${masterCount === 1 ? '' : 's'}`);
      return parts.join(' · ');
    }
    if (tier) return `${aspects.length} tier ${tier} aspect${aspects.length === 1 ? '' : 's'} · ${allAspects.length} indexed`;
    return `${allAspects.length} indexed · tiers from inherent potential (not link count)`;
  }, [filter, tier, aspects, allAspects.length, directoryLoading, registryStatus, searchError]);

  function updateFilter(value: string) {
    setFilter(value);
    setEditorMode('view');
    setHighlightedFace(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value.trim()) next.set('q', value);
      else next.delete('q');
      next.delete('id');
      next.delete('face');
      return next;
    });
    setSelectedId(null);
  }

  function selectDirectoryRow(row: AspectDirectoryRow) {
    setEditorMode('view');
    setSelectedId(row.id);
    const faceName = row.matchedDiamondFace?.name ?? null;
    setHighlightedFace(faceName);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('id', String(row.id));
      if (filter.trim()) next.set('q', filter);
      if (faceName) next.set('face', faceName);
      else next.delete('face');
      return next;
    });
    if (window.matchMedia('(max-width: 1279px)').matches) {
      window.requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function startCreate() {
    setEditorMode('create');
    setEditForm(undefined);
    setSelectedId(null);
    setDetail(null);
    setHighlightedFace(null);
  }

  function startEdit(d: AspectFullDetail) {
    setEditorMode('edit');
    setEditForm(detailToForm(d));
  }

  function cancelEditor() {
    setEditorMode('view');
    setEditForm(undefined);
  }

  function confirmDeleteAspect(d: AspectFullDetail | AspectFormData) {
    const baseLayerNote = 'is_base_layer' in d && d.is_base_layer
      ? '\n\nThis is a Base Layer aspect.'
      : '';
    return window.confirm(
      `Are you sure you want to delete "${d.name}" from the Aspect Registry?\n\nThis cannot be undone.${baseLayerNote}`
    );
  }

  async function deleteAspect(d: AspectFullDetail) {
    if (!confirmDeleteAspect(d)) return;
    setDeleting(true);
    setLoadError('');
    try {
      await api.deleteAspect(d.id);
      await reloadList();
      setEditorMode('view');
      setEditForm(undefined);
      setSelectedId(null);
      setDetail(null);
      setHighlightedFace(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        next.delete('face');
        return next;
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function saveAspect(form: AspectFormData) {
    const payload = formToPayload(form);
    if (editorMode === 'create') {
      const created = await api.createAspect(payload);
      const full = ensureAspectDetail(created);
      await reloadList();
      setEditorMode('view');
      setSelectedId(full.id);
      setDetail(full);
      setHighlightedFace(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('id', String(full.id));
        next.delete('face');
        return next;
      });
    } else if (selectedId) {
      const updated = await api.updateAspect(selectedId, payload);
      const full = ensureAspectDetail(updated);
      await reloadList();
      setEditorMode('view');
      setDetail(full);
    }
  }

  const focusMasterFusion = Boolean(highlightedFace);
  const showNoMatches =
    !directoryLoading && !searchError && debouncedFilter.trim() && aspects.length === 0 && registryStatus === 'ready';
  const showSearchFailed = !directoryLoading && searchError && aspects.length === 0 && debouncedFilter.trim();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Aspect Registry</h1>
          <p className="text-forge-muted">{subtitle}</p>
          {registryStatus === 'ready' && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-forge-leaf">
              Registry online · {allAspects.length} aspects loaded
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {registryStatus === 'error' && (
            <Button variant="ghost" onClick={() => reloadList().catch(() => {})}>
              <span className="inline-flex items-center gap-2 text-xs">
                <RefreshCw size={14} /> Retry load
              </span>
            </Button>
          )}
          <Button onClick={startCreate} variant="leaf" disabled={registryStatus === 'loading'}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} /> Forge New Aspect
            </span>
          </Button>
        </div>
      </header>

      {loadError && (
        <Panel title="Registry unavailable" className="border-forge-ember/30">
          <p className="text-sm text-forge-ember">{loadError}</p>
          <p className="mt-2 text-sm text-forge-muted">
            From <code className="text-forge-cyan">D:\wallpapers\afs-platform</code> run{' '}
            <code className="text-forge-cyan">npm run dev</code> or{' '}
            <code className="text-forge-cyan">node server/index.js</code>, then retry.
          </p>
          <Button className="mt-3" variant="ghost" onClick={() => reloadList().catch(() => {})}>
            <span className="inline-flex items-center gap-2 text-xs">
              <RefreshCw size={14} /> Retry
            </span>
          </Button>
        </Panel>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={filter}
          onChange={(e) => updateFilter(e.target.value)}
          placeholder="Search basic & diamond aspects, mantras..."
          disabled={registryStatus === 'loading'}
          className="min-w-0 flex-1 rounded-lg border border-forge-border bg-forge-panel px-4 py-2.5 text-base outline-none focus:border-forge-cyan disabled:opacity-50 sm:min-w-[220px] sm:text-sm"
        />
        {['', ...TIERS].map((t) => (
          <button
            key={t || 'all'}
            onClick={() => setTier(t)}
            disabled={registryStatus === 'loading'}
            className={`rounded-lg border px-3 py-2 text-xs font-mono disabled:opacity-50 ${tier === t ? 'border-forge-cyan bg-forge-cyan/10 text-forge-cyan' : 'border-forge-border text-forge-muted'}`}
          >
            {t || 'ALL'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          {registryStatus === 'loading' ? (
            <Panel title="Loading registry" subtitle={staticMode ? 'Reading offline snapshot' : 'Fetching aspects from API'}>
              <p className="text-sm text-forge-muted">
                {staticMode ? 'Indexing aspect registry…' : 'Connecting to localhost:3847…'}
              </p>
            </Panel>
          ) : registryStatus === 'error' && allAspects.length === 0 ? (
            <Panel title="Registry not loaded">
              <p className="text-sm text-forge-muted">
                Aspects cannot load until the API is running. Start the server and click Retry above.
              </p>
            </Panel>
          ) : directoryLoading ? (
            <Panel title="Searching" subtitle={filter.trim() ? `"${filter.trim()}"` : 'Registry'}>
              <p className="text-sm text-forge-muted">Querying aspect directory…</p>
            </Panel>
          ) : showNoMatches ? (
            <Panel title="No matches">
              <p className="text-sm text-forge-muted">
                No aspects match &ldquo;{debouncedFilter}&rdquo;{tier ? ` in tier ${tier}` : ''}.
              </p>
            </Panel>
          ) : aspects.length === 0 ? (
            <Panel title="Registry empty">
              <p className="text-sm text-forge-muted">No aspects in the database.</p>
            </Panel>
          ) : (
            <div className="max-h-[50dvh] space-y-2 overflow-y-auto pr-1 xl:max-h-[70dvh]">
              {aspects.map((a) => {
                const isFace = a.matchKind === 'diamond_face' && a.matchedDiamondFace;
                const displayName = directoryDisplayName(a);
                const displayChain = isFace ? a.matchedDiamondFace!.symbol : resolveAspectDisplayChain(a);
                const genericFace = isFace && isGenericDiamondFaceName(a.matchedDiamondFace!.name);
                const listQuality = isFace
                  ? 'diamond'
                  : aspectQualityFromFaceIndex(a, (faceIndex[a.id] || []).length);
                const isSelected =
                  selectedId === a.id &&
                  editorMode === 'view' &&
                  (isFace ? highlightedFace === a.matchedDiamondFace!.name : !highlightedFace);

                return (
                  <button
                    key={directoryRowKey(a)}
                    onClick={() => selectDirectoryRow(a)}
                    className={`glass-panel w-full rounded-xl p-3 text-left transition-all hover:shadow-glow ${isSelected ? 'ring-1 ring-forge-cyan' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <EmojiText text={displayChain} size="lg" title={displayName} nowrap />
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <QualityBadge quality={listQuality} />
                        <TierBadge tier={a.tier} />
                      </div>
                    </div>
                    <h3 className="mt-1 font-medium leading-tight">{displayName}</h3>
                    {isFace && (
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-forge-violet">
                        {genericFace ? 'Diamond facet' : `Diamond facet · ${a.name}`}
                      </p>
                    )}
                    <div className="mt-1 flex items-center justify-between text-[10px] text-forge-muted">
                      <span>Potential {Math.round(a.potential_score * 100)}%</span>
                      <span>{a.mentions} corpus refs</span>
                    </div>
                    <ProgressBar value={a.proficiency} color={a.category === 'red-leaf' ? 'leaf' : 'cyan'} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div ref={detailRef} className="max-h-none overflow-y-auto xl:col-span-3 xl:max-h-[70dvh]">
          {editorMode === 'create' ? (
            <AspectForm mode="create" onSave={saveAspect} onCancel={cancelEditor} />
          ) : editorMode === 'edit' && editForm ? (
            <AspectForm
              initial={editForm}
              mode="edit"
              onSave={saveAspect}
              onCancel={cancelEditor}
              onDelete={detail ? () => deleteAspect(detail) : undefined}
              deleting={deleting}
            />
          ) : (
            <AspectDetailPanel
              detail={detail}
              loading={detailLoading}
              onEdit={registryStatus === 'ready' ? startEdit : undefined}
              onDelete={deleteAspect}
              deleting={deleting}
              highlightFace={highlightedFace}
              focusMasterFusion={focusMasterFusion}
            />
          )}
        </div>
      </div>
    </div>
  );
}