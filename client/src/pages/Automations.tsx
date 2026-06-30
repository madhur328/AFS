import { useEffect, useState } from 'react';
import { api, Automation } from '../lib/api';
import { Panel } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';

export default function Automations() {
  const [items, setItems] = useState<Automation[]>([]);

  useEffect(() => {
    api.automations().then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Automations</h1>
        <p className="text-forge-muted">Scheduled triggers · event hooks · kill switch</p>
      </header>
      <GenesisBanner compact />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <Panel key={a.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{a.name}</h3>
              <span className={`h-2 w-2 rounded-full ${a.enabled ? 'bg-forge-cyan' : 'bg-forge-muted'}`} />
            </div>
            <p className="mt-2 font-mono text-xs text-forge-cyan">{a.trigger_type}</p>
            <pre className="mt-3 overflow-x-auto rounded bg-forge-bg p-2 font-mono text-[10px] text-forge-muted">
              {JSON.stringify(a.action, null, 2)}
            </pre>
          </Panel>
        ))}
      </div>

      <Panel title="Kill Switch Protocol">
        <blockquote className="border-l-2 border-forge-leaf pl-4 text-forge-leaf">
          "Reality Anchor full lock. All agents dissolve. Return to single Unwavering Heart."
        </blockquote>
        <p className="mt-2 text-sm text-forge-muted">Use when genuine dissociation or loss of control is felt.</p>
      </Panel>
    </div>
  );
}