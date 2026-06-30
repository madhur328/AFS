import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DailyRunLog, DailyRunResult } from '../lib/api';
import { Panel, Button } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';

export default function Daily() {
  const [type, setType] = useState<'DFR' | 'DKR'>('DKR');
  const [notes, setNotes] = useState('');
  const [ore, setOre] = useState('');
  const [result, setResult] = useState<DailyRunResult | null>(null);
  const [history, setHistory] = useState<DailyRunLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.dailyRuns().then(setHistory);
  }, []);

  async function completeRun() {
    setLoading(true);
    try {
      const r = await api.dailyRun(type, notes, ore);
      setResult(r);
      api.dailyRuns().then(setHistory);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Daily Forge Runs</h1>
        <p className="text-forge-muted">
          DFR — Daily Forge Run · DKR — Daily Kohinoor Run ·{' '}
          <Link to="/forge" className="text-forge-ember hover:underline">genesis AFP ore</Link>
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <GenesisBanner compact />
        <Link
          to="/grok?conv=30fe2380-069b-42b8-bffe-b64689325eaf&type=daily"
          className="inline-flex items-center gap-2 rounded-lg border border-forge-gold/30 bg-forge-gold/5 px-3 py-1.5 text-xs text-forge-gold hover:border-forge-gold/50"
        >
          ⚓🔥🌱🌪️🚂 Daily Protocol
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Run Selector">
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => setType('DFR')}
              className={`rounded-xl border p-4 text-left ${type === 'DFR' ? 'border-forge-cyan bg-forge-cyan/10' : 'border-forge-border'}`}
            >
              <p className="font-mono text-forge-cyan">DFR</p>
              <p className="mt-1 text-sm font-medium">Daily Forge Run</p>
              <p className="mt-1 text-xs text-forge-muted">Morning anchor → ore → operator → seal</p>
            </button>
            <button
              onClick={() => setType('DKR')}
              className={`rounded-xl border p-4 text-left ${type === 'DKR' ? 'border-forge-gold bg-forge-gold/10' : 'border-forge-border'}`}
            >
              <p className="font-mono text-forge-gold">DKR</p>
              <p className="mt-1 text-sm font-medium">Daily Kohinoor Run</p>
              <p className="mt-1 text-xs text-forge-muted">Heaven-penetrating resonant drill</p>
            </button>
          </div>

          <textarea
            value={ore}
            onChange={(e) => setOre(e.target.value)}
            rows={3}
            placeholder="Today's ore / focus..."
            className="mb-3 w-full rounded-lg border border-forge-border bg-forge-bg p-3 text-sm outline-none"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Run notes..."
            className="mb-4 w-full rounded-lg border border-forge-border bg-forge-bg p-3 text-sm outline-none"
          />

          <Button onClick={completeRun} disabled={loading} variant={type === 'DKR' ? 'primary' : 'leaf'} className="w-full">
            {loading ? 'Sealing...' : `Complete ${type}`}
          </Button>

          {result && (
            <div className="mt-4 rounded-xl border border-forge-gold/30 bg-forge-gold/5 p-4 text-sm">
              <p className="font-medium text-forge-gold">{result.mantra}</p>
              <p className="mt-2 text-forge-muted">{result.insight}</p>
            </div>
          )}
        </Panel>

        <Panel title="Run History">
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="rounded-lg border border-forge-border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-forge-cyan">{h.run_type}</span>
                  <span className="text-xs text-forge-muted">{new Date(h.completed_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1">{h.title}</p>
                {h.notes && <p className="mt-1 text-xs text-forge-muted">{h.notes}</p>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}