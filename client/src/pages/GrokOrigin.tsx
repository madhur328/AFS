import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  api,
  AfFiveSymbols,
  GrokConversation,
  GrokSessionDetail,
  GrokSessionSummary,
} from '../lib/api';
import { Panel, StatCard } from '../components/ui';
import EmojiText from '../components/EmojiText';
import { ExternalLink, MessageSquare, Sparkles } from 'lucide-react';
import {
  GrokMilestone,
  grokConversationUrl,
  milestonesForConversation,
} from '../lib/grok-milestones';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'daily', label: 'Daily' },
  { id: 'AFP', label: 'AFP' },
  { id: 'EOT', label: 'EOT' },
  { id: 'codex', label: 'Codex' },
  { id: 'origin', label: 'Origin' },
] as const;

const typeColors: Record<string, string> = {
  daily: 'text-forge-gold border-forge-gold/30 bg-forge-gold/10',
  AFP: 'text-forge-cyan border-forge-cyan/30 bg-forge-cyan/10',
  EOT: 'text-forge-ember border-forge-ember/30 bg-forge-ember/10',
  codex: 'text-forge-gold border-forge-gold/30 bg-forge-gold/10',
  origin: 'text-forge-leaf border-forge-leaf/30 bg-forge-leaf/10',
  other: 'text-forge-muted border-forge-border bg-white/5',
};

type SessionFilter = (typeof FILTERS)[number]['id'];

function parseTypeFilter(raw: string | null): SessionFilter {
  const t = raw || '';
  return FILTERS.some((f) => f.id === t) ? (t as SessionFilter) : '';
}

function convLabel(c: GrokConversation) {
  if (!c.id) return c.title || 'Thread';
  if (c.id.startsWith('37560952')) return 'Genesis Thread';
  if (c.id.startsWith('30fe2380')) return 'Symbols & Daily Tasks';
  return c.title || c.id.slice(0, 8);
}

export default function GrokOrigin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<GrokConversation[]>([]);
  const [conv, setConv] = useState<GrokConversation | null>(null);
  const [fiveSymbols, setFiveSymbols] = useState<AfFiveSymbols | null>(null);
  const [filter, setFilter] = useState<SessionFilter>(() => parseTypeFilter(searchParams.get('type')));
  const [q, setQ] = useState('');
  const [sessions, setSessions] = useState<GrokSessionSummary[]>([]);
  const [selected, setSelected] = useState<GrokSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const activeConvId = searchParams.get('conv') || conv?.id || '';

  useEffect(() => {
    api.grokConversations().then((list) => {
      setConversations(list.filter((c) => c.loaded));
      const preferred = searchParams.get('conv');
      const pick = preferred
        ? list.find((c) => c.id === preferred)
        : list.find((c) => c.id?.startsWith('37560952')) || list[0];
      if (pick) setConv(pick);
    }).catch(console.error);
    api.grokFiveSymbols().then(setFiveSymbols).catch(() => setFiveSymbols(null));
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    api.grokConversation(activeConvId).then(setConv).catch(console.error);
  }, [activeConvId]);

  useEffect(() => {
    const t = parseTypeFilter(searchParams.get('type'));
    if (t !== filter) setFilter(t);
  }, [searchParams, filter]);

  useEffect(() => {
    if (!activeConvId) return;
    setLoading(true);
    api
      .grokSessions({
        conversation_id: activeConvId,
        type: filter || undefined,
        q: q || undefined,
        limit: 100,
      })
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, q, activeConvId]);

  useEffect(() => {
    const raw = searchParams.get('session');
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id)) return;
    api.grokSession(id).then(setSelected).catch(console.error);
  }, [searchParams]);

  const milestones = useMemo(() => milestonesForConversation(conv?.id), [conv?.id]);
  const grokUrl = grokConversationUrl(conv?.id, conv?.url);
  const isShare3 = conv?.id?.startsWith('30fe2380');

  async function openSession(id: number) {
    const detail = await api.grokSession(id);
    setSelected(detail);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('session', String(id));
      if (activeConvId) next.set('conv', activeConvId);
      if (filter) next.set('type', filter);
      else next.delete('type');
      return next;
    });
  }

  function setTypeFilter(next: SessionFilter) {
    setFilter(next);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next) params.set('type', next);
      else params.delete('type');
      return params;
    });
  }

  function selectConversation(id: string) {
    setSelected(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('conv', id);
      next.delete('session');
      return next;
    });
  }

  async function jumpToMilestone(m: GrokMilestone) {
    const typeFilter = (m.type || '') as SessionFilter;
    setFilter(typeFilter);
    setQ(m.query);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (activeConvId) next.set('conv', activeConvId);
      next.delete('session');
      if (typeFilter) next.set('type', typeFilter);
      else next.delete('type');
      return next;
    });

    let session = null as GrokSessionSummary | null;
    if (m.sessionIndex != null) {
      const byIndex = await api.grokSessions({
        conversation_id: activeConvId,
        session_index: m.sessionIndex,
        limit: 1,
      });
      session = byIndex[0] ?? null;
    }
    if (!session) {
      const matches = await api.grokSessions({
        conversation_id: activeConvId,
        type: m.type,
        q: m.query,
        limit: 10,
      });
      session = matches[0] ?? null;
    }
    if (session) await openSession(session.id);
  }

  if (!conv?.loaded && conversations.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold">Grok Origin</h1>
        <p className="text-forge-muted">
          Genesis thread not loaded. Run{' '}
          <code className="text-forge-cyan">node scripts/ingest-share3.js</code> and{' '}
          <code className="text-forge-cyan">npm run ingest-grok</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-forge-ember">Genesis Archive</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Grok Origin</h1>
        <p className="mt-2 text-forge-muted">
          {isShare3
            ? 'Share-3 thread — AFP symbols, daily rituals, alchemical formulas'
            : 'AFS birth conversation — Fallen Valkyrie through AFP, EOT, Base Layer, Red Leaf'}
        </p>
        {grokUrl && (
          <a
            href={grokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-forge-cyan/30 bg-forge-cyan/10 px-3 py-1.5 text-sm font-medium text-forge-cyan transition hover:border-forge-cyan/60 hover:bg-forge-cyan/20 hover:underline"
          >
            Open on grok.com <ExternalLink size={14} />
          </a>
        )}
      </header>

      {conversations.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id!)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                c.id === activeConvId
                  ? 'border-forge-cyan bg-forge-cyan/15 text-forge-cyan'
                  : 'border-forge-border text-forge-muted hover:border-forge-cyan/40 hover:text-white'
              }`}
            >
              {convLabel(c)}
              <span className="ml-2 font-mono text-[10px] opacity-70">{c.session_count} sessions</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Messages" value={conv?.turn_count ?? 0} />
        <StatCard label="Sessions" value={conv?.session_count ?? 0} />
        <StatCard label="Daily" value={conv?.typeCounts?.find((t) => t.session_type === 'daily')?.c ?? 0} />
        <StatCard label="AFP Runs" value={conv?.typeCounts?.find((t) => t.session_type === 'AFP')?.c ?? 0} />
        <StatCard label="Codex" value={conv?.typeCounts?.find((t) => t.session_type === 'codex')?.c ?? 0} />
      </div>

      {fiveSymbols && (isShare3 || filter === 'daily') && (
        <Panel title="Five AFP Symbols — Daily Protocol" subtitle={fiveSymbols.cycle}>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            {fiveSymbols.formulas.map((f) => (
              <div key={f.formula} className="rounded-lg border border-forge-ember/25 bg-forge-ember/5 px-3 py-2 text-center">
                <EmojiText text={f.formula} size="md" className="justify-center" />
                <p className="mt-1 text-[10px] text-forge-muted">{f.name}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {fiveSymbols.symbols.map((s) => (
              <div
                key={s.name}
                className="rounded-xl border border-forge-border bg-white/[0.03] p-4 transition hover:border-forge-gold/30"
              >
                <div className="flex items-center gap-2">
                  <EmojiText text={s.symbol} size="lg" />
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="font-mono text-[10px] text-forge-gold">{s.ritual}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-forge-muted">{s.aspect}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/80">{s.task}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Evolution Arc" subtitle="Click a milestone to jump to that session — or open the thread on grok.com">
        <ol className="grid gap-2 sm:grid-cols-2">
          {milestones.map((m, i) => (
            <li key={m.label}>
              <button
                type="button"
                onClick={() => jumpToMilestone(m)}
                className="group flex w-full items-start gap-2 rounded-lg border border-transparent bg-white/5 px-3 py-2 text-left text-sm transition hover:border-forge-cyan/30 hover:bg-forge-cyan/10"
                title={`Open session: ${m.label}`}
              >
                <span className="font-mono text-forge-cyan">{i + 1}.</span>
                <span className="flex-1 group-hover:text-forge-cyan group-hover:underline">{m.label}</span>
                {grokUrl && (
                  <a
                    href={grokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 rounded p-0.5 text-forge-muted opacity-0 transition hover:text-forge-cyan group-hover:opacity-100"
                    title="Open thread on grok.com"
                    aria-label={`Open ${m.label} on grok.com`}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </button>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sessions" subtitle="Browse daily rituals, AFP, EOT, and codex extracts">
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id || 'all'}
                onClick={() => setTypeFilter(f.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  filter === f.id
                    ? 'border-forge-cyan bg-forge-cyan/15 text-forge-cyan'
                    : 'border-forge-border text-forge-muted hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by title..."
            className="mb-4 w-full rounded-xl border border-forge-border bg-forge-panel px-4 py-2 text-sm outline-none focus:border-forge-cyan"
          />
          {loading ? (
            <p className="text-forge-muted">Loading sessions...</p>
          ) : (
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSession(s.id)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:border-forge-cyan/40 ${
                    selected?.id === s.id ? 'border-forge-cyan/50 bg-forge-cyan/5' : 'border-forge-border bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-snug">{s.title}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase ${typeColors[s.session_type] || typeColors.other}`}>
                      {s.session_type}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-forge-muted">
                    #{s.session_index} · user {s.user_chars.toLocaleString()} · assistant {s.assistant_chars.toLocaleString()}
                  </p>
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-forge-muted">No sessions match this filter.</p>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title="Session Detail"
          subtitle={selected ? selected.title : 'Select a session'}
        >
          {!selected ? (
            <div className="flex flex-col items-center justify-center py-16 text-forge-muted">
              <MessageSquare size={32} className="mb-3 opacity-40" />
              <p className="text-sm">Click a session to read the exchange</p>
              {isShare3 && (
                <p className="mt-2 flex items-center gap-1 text-xs text-forge-gold">
                  <Sparkles size={12} /> Try filter: Daily — five symbol rituals
                </p>
              )}
            </div>
          ) : (
            <div className="max-h-[600px] space-y-4 overflow-y-auto pr-1">
              {selected.user_text && (
                <div>
                  <p className="mb-2 font-mono text-xs uppercase text-forge-leaf">You</p>
                  <div className="rounded-xl border border-forge-leaf/20 bg-forge-leaf/5 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {selected.user_text}
                  </div>
                </div>
              )}
              {selected.assistant_text && (
                <div>
                  <p className="mb-2 font-mono text-xs uppercase text-forge-cyan">Grok</p>
                  <div className="rounded-xl border border-forge-cyan/20 bg-forge-cyan/5 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {selected.assistant_text}
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}