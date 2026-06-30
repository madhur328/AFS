import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Insight } from '../lib/api';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import {
  SOURCE_FILTERS,
  INSIGHT_SECTIONS,
  filterInsights,
  groupCodexInsights,
  insightSectionId,
  isArchiveInsight,
  isCodexInsight,
  sectionMeta,
  sourceColor,
  sourceLabel,
} from '../lib/insight-ui';
import { Panel } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';
import EmojiText from '../components/EmojiText';

function SectionSymbol({ symbol }: { symbol: string }) {
  return <EmojiText text={symbol} size="sm" className="shrink-0" />;
}

function SynthesisHero({ insight }: { insight: Insight }) {
  const lines = insight.body.split('\n').filter(Boolean);
  return (
    <Panel className="border-forge-leaf/25 bg-gradient-to-br from-forge-leaf/5 to-transparent">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-forge-leaf">Closing insight · living synthesis</p>
      <blockquote className="mt-4 space-y-2 border-l-2 border-forge-leaf/40 pl-4 font-display text-lg leading-relaxed text-forge-text sm:text-xl">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </blockquote>
      {insight.aspectLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {insight.aspectLinks.map((a) => (
            <Link
              key={a}
              to={`/aspects?q=${encodeURIComponent(a)}`}
              className="rounded-full border border-forge-leaf/30 bg-forge-leaf/10 px-2.5 py-0.5 text-xs text-forge-leaf hover:border-forge-leaf/60"
            >
              → {a}
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function InsightCard({ insight, compact = false }: { insight: Insight; compact?: boolean }) {
  const archive = isArchiveInsight(insight);
  return (
    <Panel className={`h-full ${isCodexInsight(insight) ? 'border-forge-border/80' : 'border-forge-border/50'}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold leading-snug sm:text-lg">{insight.title}</h3>
        <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${sourceColor(insight.source)}`}>
          {sourceLabel(insight.source)}
        </span>
      </div>
      <p
        className={`mt-3 text-sm leading-relaxed text-forge-muted ${
          archive && compact ? 'line-clamp-4' : ''
        }`}
      >
        {insight.body}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {insight.tags
          .filter((t) => !t.startsWith('section:') && t !== 'save8' && t !== 'red-leaf')
          .slice(0, 6)
          .map((t) => (
            <span key={t} className="rounded-full bg-forge-cyan/10 px-2 py-0.5 text-xs text-forge-cyan">
              #{t}
            </span>
          ))}
        {insight.aspectLinks.map((a) => (
          <Link
            key={a}
            to={`/aspects?q=${encodeURIComponent(a)}`}
            className="rounded-full bg-forge-leaf/10 px-2 py-0.5 text-xs text-forge-leaf hover:underline"
          >
            → {a}
          </Link>
        ))}
      </div>
      {archive && (
        <Link to="/grok" className="mt-3 inline-block text-xs text-forge-ember hover:underline">
          View genesis thread →
        </Link>
      )}
      {insight.source === 'discord' && (
        <Link to="/journal" className="mt-3 inline-block text-xs text-forge-cyan hover:underline">
          View journal →
        </Link>
      )}
    </Panel>
  );
}

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('save8-codex');
  const [sectionFilter, setSectionFilter] = useState('');
  const [filter, setFilter] = useState('');
  const debouncedFilter = useDebouncedValue(filter, 120);

  useEffect(() => {
    setLoading(true);
    api
      .insights(sourceFilter || undefined)
      .then(setInsights)
      .finally(() => setLoading(false));
  }, [sourceFilter]);

  const directoryLoading = Boolean(filter.trim() && filter !== debouncedFilter);

  const filtered = useMemo(() => {
    let rows = filterInsights(insights, debouncedFilter);
    if (sectionFilter) {
      rows = rows.filter((i) => insightSectionId(i) === sectionFilter);
    }
    return rows;
  }, [insights, debouncedFilter, sectionFilter]);

  const codexRows = filtered.filter(isCodexInsight);
  const archiveRows = filtered.filter((i) => !isCodexInsight(i));
  const grouped = groupCodexInsights(codexRows);
  const synthesis = codexRows.find((i) => insightSectionId(i) === 'synthesis');

  const showCodexLayout = sourceFilter === 'save8-codex' || (!sourceFilter && codexRows.length > 0);
  const sectionChipsVisible = showCodexLayout && (sourceFilter === 'save8-codex' || sourceFilter === '');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Insights</h1>
        <p className="text-forge-muted">
          Save8 Red Leaf AFS — distilled principles, daily practice, and mythic wisdom from the forge
        </p>
        <p className="mt-1 font-mono text-xs text-forge-cyan">
          {loading
            ? 'Loading insights…'
            : directoryLoading
              ? `Searching for "${filter.trim()}"…`
              : `${filtered.length} insight${filtered.length === 1 ? '' : 's'}${debouncedFilter.trim() ? ` matching "${debouncedFilter.trim()}"` : ''}`}
        </p>
      </header>

      <GenesisBanner compact />

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search insights, principles, aspects…"
          className="min-w-0 flex-1 rounded-lg border border-forge-border bg-forge-panel px-4 py-2.5 text-base outline-none focus:border-forge-cyan disabled:opacity-50 sm:min-w-[220px] sm:text-sm"
        />
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.id || 'all'}
            type="button"
            onClick={() => {
              setSourceFilter(f.id);
              setSectionFilter('');
            }}
            className={`rounded-lg border px-3 py-2 text-xs font-mono uppercase ${
              sourceFilter === f.id
                ? 'border-forge-cyan bg-forge-cyan/10 text-forge-cyan'
                : 'border-forge-border text-forge-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sectionChipsVisible && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSectionFilter('')}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              !sectionFilter
                ? 'border-forge-leaf bg-forge-leaf/10 text-forge-leaf'
                : 'border-forge-border text-forge-muted'
            }`}
          >
            All sections
          </button>
          {INSIGHT_SECTIONS.filter((s) => s.id !== 'synthesis').map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSectionFilter(s.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                sectionFilter === s.id
                  ? 'border-forge-leaf bg-forge-leaf/10 text-forge-leaf'
                  : 'border-forge-border text-forge-muted'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <SectionSymbol symbol={s.symbol} />
                {s.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {directoryLoading && (
        <Panel title="Searching" subtitle={filter.trim() ? `"${filter.trim()}"` : 'Insights'}>
          <p className="text-sm text-forge-muted">Filtering insight codex…</p>
        </Panel>
      )}

      {!directoryLoading && filtered.length === 0 && (
        <Panel title="No matches">
          <p className="text-sm text-forge-muted">
            No insights match your filters. Try Save8 Codex or run{' '}
            <code className="text-forge-cyan">node scripts/seed-afs-insights.js</code>.
          </p>
        </Panel>
      )}

      {!directoryLoading && showCodexLayout && synthesis && !sectionFilter && (
        <SynthesisHero insight={synthesis} />
      )}

      {!directoryLoading &&
        showCodexLayout &&
        INSIGHT_SECTIONS.filter((s) => s.id !== 'synthesis').map((section) => {
          const items = (grouped.get(section.id) || []).filter(
            (i) => !sectionFilter || sectionFilter === section.id
          );
          if (!items.length) return null;
          if (sectionFilter && sectionFilter !== section.id) return null;
          const meta = sectionMeta(section.id);
          return (
            <section key={section.id} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-forge-border/60 pb-2">
                <EmojiText text={meta?.symbol ?? ''} size="lg" />
                <h2 className="font-display text-lg font-semibold text-forge-text">{meta?.label}</h2>
                <span className="font-mono text-xs text-forge-muted">{items.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            </section>
          );
        })}

      {!directoryLoading && !showCodexLayout && archiveRows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-forge-border/60 pb-2">
            <h2 className="font-display text-lg font-semibold text-forge-ember">Archive</h2>
            <span className="font-mono text-xs text-forge-muted">{archiveRows.length}</span>
          </div>
          <div className="grid gap-4">
            {archiveRows.map((i) => (
              <InsightCard key={i.id} insight={i} compact />
            ))}
          </div>
        </section>
      )}

      {!directoryLoading && sourceFilter === '' && archiveRows.length > 0 && codexRows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-forge-border/60 pb-2">
            <h2 className="font-display text-lg font-semibold text-forge-muted">Other sources</h2>
            <span className="font-mono text-xs text-forge-muted">{archiveRows.length}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {archiveRows.map((i) => (
              <InsightCard key={i.id} insight={i} compact={isArchiveInsight(i)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}