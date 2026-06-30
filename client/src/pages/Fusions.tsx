import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Fusion, Synergy } from '../lib/api';
import { Panel } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';

export default function Fusions() {
  const [fusions, setFusions] = useState<Fusion[]>([]);
  const [synergies, setSynergies] = useState<Synergy[]>([]);

  useEffect(() => {
    Promise.all([api.fusions(), api.synergies()]).then(([f, s]) => {
      setFusions(f);
      setSynergies(s);
    });
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Alchemy Fusions & Synergies</h1>
        <p className="text-forge-muted">
          Aspect combinations · fusion outputs ·{' '}
          <Link to="/grok?type=codex" className="text-forge-ember hover:underline">genesis codex</Link>
        </p>
      </header>
      <GenesisBanner compact />

      <Panel title="Alchemy Fusions">
        <div className="grid gap-4 sm:grid-cols-2">
          {fusions.map((f) => (
            <div key={f.id} className="rounded-xl border border-forge-gold/30 bg-forge-gold/5 p-4">
              <h3 className="font-display font-bold text-forge-gold">{f.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {f.inputs.map((i) => (
                  <span key={i} className="rounded bg-white/10 px-2 py-0.5 text-xs">{i}</span>
                ))}
              </div>
              <p className="mt-3 text-sm">→ <strong>{f.output_aspect}</strong></p>
              <p className="mt-1 font-mono text-xs text-forge-ember">{f.operator}</p>
              <p className="mt-2 text-xs text-forge-muted">{f.notes}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Synergy Map">
        <div className="space-y-3">
          {synergies.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-lg border border-forge-border p-3 text-sm">
              <span className="text-forge-cyan">{s.aspect_a}</span>
              <span className="text-forge-muted">+</span>
              <span className="text-forge-leaf">{s.aspect_b}</span>
              <span className="text-forge-muted">=</span>
              <strong className="text-forge-gold">{s.fusion_name}</strong>
              <span className="ml-auto font-mono text-xs text-forge-violet">{Math.round(s.strength * 100)}%</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}