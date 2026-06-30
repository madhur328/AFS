import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, MathConcept } from '../lib/api';
import { Panel } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';

export default function MathPage() {
  const [concepts, setConcepts] = useState<MathConcept[]>([]);

  useEffect(() => {
    api.math().then(setConcepts);
  }, []);

  const byDomain = concepts.reduce<Record<string, MathConcept[]>>((acc, c) => {
    (acc[c.domain] = acc[c.domain] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Mathematics</h1>
        <p className="text-forge-muted">
          Math concepts linked to AFS aspects and{' '}
          <Link to="/grok?type=codex" className="text-forge-ember hover:underline">ENTHEA genesis</Link>
        </p>
      </header>
      <GenesisBanner compact />

      {Object.entries(byDomain).map(([domain, items]) => (
        <Panel key={domain} title={domain}>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((c) => (
              <div key={c.id} className="rounded-xl border border-forge-border p-4">
                <h3 className="font-medium text-forge-cyan">{c.name}</h3>
                <p className="mt-2 text-sm text-forge-muted">{c.description}</p>
                {c.formula && (
                  <code className="mt-3 block rounded bg-forge-bg px-3 py-2 font-mono text-xs text-forge-gold">{c.formula}</code>
                )}
                <p className="mt-2 text-xs text-forge-leaf">→ {c.afs_link}</p>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}