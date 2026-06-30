import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, SearchResult } from '../lib/api';
import { Panel } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';
import { Search } from 'lucide-react';

const TYPE_FILTERS = ['', 'grok', 'aspect', 'lore', 'visualization', 'codex', 'insight', 'protocol'];

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      setResults(await api.search(q, type || undefined));
    } finally {
      setLoading(false);
    }
  }

  const typeColors: Record<string, string> = {
    aspect: 'text-forge-leaf',
    codex: 'text-forge-cyan',
    protocol: 'text-forge-ember',
    insight: 'text-forge-gold',
    math: 'text-forge-violet',
    grok: 'text-forge-ember',
    visualization: 'text-forge-leaf',
  };

  function openResult(r: SearchResult) {
    if (r.entity_type === 'grok') navigate(`/grok?session=${r.id}`);
    else if (r.entity_type === 'aspect') {
      const isDiamondFace = (r.tags || '').includes('diamond_face');
      const params = new URLSearchParams({ id: String(r.id), q: r.title });
      if (isDiamondFace) params.set('face', r.title);
      navigate(`/aspects?${params}`);
    }
    else if (r.entity_type === 'visualization') {
      navigate(`/visualizations?q=${encodeURIComponent(r.title)}`);
    }
    else if (r.entity_type === 'lore') navigate(`/lore`);
    else if (r.entity_type === 'codex') navigate(`/codex`);
    else if (r.entity_type === 'insight') navigate(`/insights`);
    else if (r.entity_type === 'protocol') navigate(`/forge`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Search Directory</h1>
        <p className="text-forge-muted">
          Global search — aspects, visuals, codex, protocols, insights, math,{' '}
          <Link to="/grok" className="text-forge-ember hover:underline">grok origin (2,409 sessions)</Link>
        </p>
      </header>
      <GenesisBanner compact />

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t || 'all'}
            onClick={() => setType(t)}
            className={`rounded-lg border px-3 py-1.5 text-xs uppercase ${
              type === t ? 'border-forge-cyan bg-forge-cyan/15 text-forge-cyan' : 'border-forge-border text-forge-muted'
            }`}
          >
            {t || 'all'}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search AFS universe — try Red Leaf, Mind Guardian, AFP..."
            className="w-full rounded-xl border border-forge-border bg-forge-panel py-3 pl-10 pr-4 outline-none focus:border-forge-cyan"
          />
        </div>
        <button
          onClick={search}
          disabled={loading}
          className="rounded-xl border border-forge-cyan/40 bg-forge-cyan/10 px-6 text-forge-cyan"
        >
          Search
        </button>
      </div>

      <Panel title={`Results (${results.length})`}>
        {results.length === 0 ? (
          <p className="text-forge-muted">Search for aspects, operators, genesis sessions, or math concepts.</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <button
                key={`${r.entity_type}-${r.id}`}
                onClick={() => openResult(r)}
                className="w-full rounded-lg border border-forge-border p-3 text-left transition hover:border-forge-cyan/40"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs uppercase ${typeColors[r.entity_type] || 'text-forge-muted'}`}>
                    {r.entity_type}
                  </span>
                  <h3 className="font-medium">{r.title}</h3>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-forge-muted">{r.body}</p>
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}