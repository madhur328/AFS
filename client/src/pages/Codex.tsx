import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, CodexEntry, Axiom, Protocol } from '../lib/api';
import { Panel, CollapsiblePanel } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';
import EmojiText from '../components/EmojiText';

function CodexEntryCard({ entry }: { entry: CodexEntry }) {
  const [open, setOpen] = useState(false);
  const long = entry.content.length > 120;
  const displayText =
    long && !open ? `${entry.content.slice(0, 120).trim()}…` : entry.content;

  return (
    <div className="min-w-0 rounded-xl border border-forge-border p-4 transition hover:border-forge-cyan/40">
      <button
        type="button"
        onClick={() => long && setOpen((v) => !v)}
        className={`flex w-full items-start gap-2 text-left ${long ? 'cursor-pointer' : 'cursor-default'}`}
        aria-expanded={long ? open : undefined}
        disabled={!long}
      >
        <EmojiText text={entry.symbol} size="xl" />
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-sm font-bold text-forge-cyan">{entry.title}</h3>
          <div className="mt-2 text-sm leading-relaxed text-forge-muted">
            <EmojiText text={displayText} mixed size="sm" />
          </div>
          {long && (
            <span className="mt-2 inline-block text-xs text-forge-ember">
              {open ? 'Show less' : 'Read more'}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

export default function Codex() {
  const [codex, setCodex] = useState<Record<string, CodexEntry[]>>({});
  const [axioms, setAxioms] = useState<Axiom[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);

  useEffect(() => {
    Promise.all([api.codex(), api.axioms(), api.protocols()]).then(([c, a, p]) => {
      setCodex(c);
      setAxioms(a);
      setProtocols(p);
    });
  }, []);

  const categoryLabels: Record<string, string> = {
    origin: 'Genesis Thread (Grok Origin)',
    operations: 'Core Operations',
    operators: 'Operators',
    daily: 'Daily Protocols',
    meta: 'Meta-Layers',
    save: 'Save Codex Versions',
    alchemy: 'Alchemy of Self',
  };

  const orderedCategories = ['origin', 'alchemy', 'operations', 'operators', 'daily', 'meta', 'save'];

  const renderCategory = (cat: string, entries: CodexEntry[]) => (
    <CollapsiblePanel
      key={cat}
      title={categoryLabels[cat] || cat}
      subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} — tap to expand`}
      badge={
        <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-forge-muted">
          {entries.length}
        </span>
      }
    >
      {cat === 'alchemy' && (
        <p className="mb-4 text-sm text-forge-muted">
          Mind, body, habits, routines, soul — with myths, poems, and prayers on the{' '}
          <Link to="/lore" className="text-forge-ember hover:underline">
            Lore page
          </Link>
          .
        </p>
      )}
      {cat === 'origin' && (
        <p className="mb-4 text-sm text-forge-muted">
          Entries sourced from the{' '}
          <Link to="/grok" className="text-forge-ember hover:underline">
            Grok origin thread
          </Link>
          .
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <CodexEntryCard key={e.id} entry={e} />
        ))}
      </div>
    </CollapsiblePanel>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">AFS Codex</h1>
        <p className="text-forge-muted">
          Genesis · Alchemy · Operations · Operators · Protocols ·{' '}
          <Link to="/lore" className="text-forge-ember hover:underline">
            full Lore hub →
          </Link>
        </p>
      </header>

      <GenesisBanner />

      <Panel title="Axioms" subtitle="Foundational truths">
        <div className="grid gap-3 sm:grid-cols-2">
          {axioms.map((a) => (
            <div
              key={a.id}
              className="min-w-0 rounded-xl border border-forge-border bg-white/5 p-4"
            >
              <h3 className="font-display text-sm font-semibold text-forge-cyan">{a.layer}</h3>
              <div className="mt-2 text-sm leading-relaxed text-forge-muted">
                <EmojiText text={a.statement} mixed size="sm" />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {orderedCategories
        .filter((cat) => codex[cat]?.length)
        .map((cat) => renderCategory(cat, codex[cat]))}

      {Object.entries(codex)
        .filter(([cat]) => !orderedCategories.includes(cat))
        .map(([cat, entries]) => renderCategory(cat, entries))}

      <CollapsiblePanel
        title="Protocols & Definitions"
        subtitle={`${protocols.length} protocols — tap to expand`}
        badge={
          <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-forge-muted">
            {protocols.length}
          </span>
        }
      >
        <div className="space-y-4">
          {protocols.map((p) => (
            <div key={p.id} className="rounded-xl border border-forge-border p-4">
              <div className="flex items-center gap-3">
                <span className="rounded bg-forge-ember/20 px-2 py-1 font-mono text-sm text-forge-ember">{p.code}</span>
                <h3 className="font-medium">{p.name}</h3>
              </div>
              <p className="mt-2 text-sm text-forge-muted">{p.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.steps.map((s, i) => (
                  <span key={i} className="rounded-full bg-white/5 px-3 py-1 text-xs">{i + 1}. {s}</span>
                ))}
              </div>
              {p.code === 'AFP' && (
                <Link to="/grok?type=AFP" className="mt-3 inline-block text-xs text-forge-ember hover:underline">
                  View 40 genesis AFP runs →
                </Link>
              )}
              {p.code === 'EOT' && (
                <Link to="/grok?type=EOT" className="mt-3 inline-block text-xs text-forge-ember hover:underline">
                  View 61 genesis EOT runs →
                </Link>
              )}
            </div>
          ))}
        </div>
      </CollapsiblePanel>
    </div>
  );
}