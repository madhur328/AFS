import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Persona } from '../lib/api';
import { Panel, Button } from '../components/ui';
import EmojiText from '../components/EmojiText';
import GenesisBanner from '../components/GenesisBanner';
import { isStaticMode } from '../lib/staticApi';

export default function Personas() {
  const offline = isStaticMode();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  useEffect(() => {
    api.personas().then(setPersonas);
  }, []);

  async function activate(id: number) {
    if (activatingId != null) return;
    setActivatingId(id);
    try {
      await api.activatePersona(id);
      const list = await api.personas();
      setPersonas(list.map((p) => ({ ...p })));
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Personas</h1>
        <p className="text-forge-muted">
          Operational identities for forge sessions ·{' '}
          <Link to="/grok?type=EOT" className="text-forge-ember hover:underline">Mind Guardian EOT runs</Link>
          {offline && (
            <>
              {' '}
              · <span className="text-forge-cyan">Tap a persona to activate (saved for this session)</span>
            </>
          )}
        </p>
      </header>
      <GenesisBanner compact />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((p) => {
          const isActive = Boolean(p.active);
          const busy = activatingId === p.id;

          return (
            <div
              key={p.id}
              role={!isActive ? 'button' : undefined}
              tabIndex={!isActive ? 0 : undefined}
              onClick={!isActive ? () => void activate(p.id) : undefined}
              onKeyDown={
                !isActive
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void activate(p.id);
                      }
                    }
                  : undefined
              }
              className={!isActive ? 'cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-forge-cyan/50' : ''}
            >
              <Panel
                className={`h-full transition ${
                  isActive
                    ? 'ring-1 ring-forge-gold'
                    : 'hover:border-forge-cyan/40 hover:bg-white/[0.02]'
                }`}
              >
                <div className="text-center">
                  <EmojiText text={p.symbol_chain} size="3xl" className="justify-center" />
                  <h3 className="mt-2 font-display text-lg font-bold">{p.name}</h3>
                  <p className="text-xs text-forge-cyan">{p.archetype}</p>
                  <blockquote className="mt-3 text-sm italic text-forge-gold">"{p.mantra}"</blockquote>
                  <p className="mt-2 text-xs text-forge-muted">{p.description}</p>
                  {isActive ? (
                    <span className="mt-4 inline-block rounded-full bg-forge-gold/20 px-3 py-1 text-xs text-forge-gold">
                      ACTIVE
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      className="mt-4"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        void activate(p.id);
                      }}
                    >
                      {busy ? 'Activating…' : 'Activate'}
                    </Button>
                  )}
                </div>
              </Panel>
            </div>
          );
        })}
      </div>
    </div>
  );
}