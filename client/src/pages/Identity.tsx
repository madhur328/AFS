import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, IdentityProfile } from '../lib/api';
import { Panel, ProgressBar, TierBadge } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';

export default function Identity() {
  const [profile, setProfile] = useState<IdentityProfile | null>(null);

  useEffect(() => {
    api.identity().then(setProfile);
  }, []);

  if (!profile) return <div className="text-forge-muted">Loading identity...</div>;

  const prof = profile.proficiency as Record<string, Record<string, number>>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Current Identity</h1>
        <p className="text-forge-muted">{profile.handle} · {profile.current_phase}</p>
      </header>

      <GenesisBanner />

      <Panel title={profile.title} subtitle={profile.bio}>
        <p className="text-sm text-forge-gold">{profile.evolution_path}</p>
        {profile.grok && (
          <p className="mt-2 text-xs text-forge-muted">
            Genesis: {profile.grok.turn_count?.toLocaleString()} turns · {profile.grok.session_count} sessions ·{' '}
            <Link to="/grok" className="text-forge-ember hover:underline">explore arc</Link>
          </p>
        )}
      </Panel>

      {profile.genesisMilestones && profile.genesisMilestones.length > 0 && (
        <Panel title="Genesis Evolution Arc" subtitle="Milestones from the Grok origin thread">
          <ol className="space-y-2">
            {profile.genesisMilestones.map((m) => (
              <li key={m.order} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="font-mono text-forge-ember">{m.order}</span>
                <span className="flex-1">{m.label}</span>
                <span className="font-mono text-[10px] uppercase text-forge-muted">{m.type}</span>
              </li>
            ))}
          </ol>
          <Link to="/grok" className="mt-3 inline-block text-sm text-forge-ember hover:underline">
            Read full genesis thread →
          </Link>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Possible Evolutions">
          {profile.evolutions.map((e, i) => (
            <div key={i} className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 p-3 text-sm">
              <span className="font-mono text-forge-gold">{i + 1}</span>
              <span>{e}</span>
            </div>
          ))}
        </Panel>

        <Panel title="Top Aspect Proficiency">
          {profile.topAspects.map((a) => (
            <div key={a.id} className="mb-3">
              <div className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <TierBadge tier={a.tier} />
              </div>
              <ProgressBar value={a.proficiency} color="leaf" />
            </div>
          ))}
        </Panel>
      </div>

      <Panel title="Currently Working On">
        <ul className="space-y-2">
          {profile.workingOn.map((w, i) => (
            <li key={i} className="text-sm text-forge-cyan">▸ {w}</li>
          ))}
        </ul>
      </Panel>

      {prof.operators && (
        <Panel title="Operator Proficiency">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(prof.operators).map(([op, val]) => (
              <div key={op} className="rounded-lg bg-white/5 p-3 text-center">
                <p className="font-mono text-xs text-forge-muted">{op}</p>
                <p className="font-display text-2xl font-bold">{Math.round((val as number) * 100)}%</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}