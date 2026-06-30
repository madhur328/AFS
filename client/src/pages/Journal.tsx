import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DiscordJournalEntry, DiscordStatus } from '../lib/api';
import { Panel, Button } from '../components/ui';
import JournalEntryReader, { JournalEntryPreview } from '../components/JournalEntryReader';
import JournalImageAttachments from '../components/JournalImageAttachments';
import { journalPreview } from '../lib/journal-parse';
import {
  draftToPayload,
  entryToDraftAttachments,
  revokeDraftPreviews,
  type DraftJournalAttachment,
} from '../lib/journal-attachments';
import EmojiText from '../components/EmojiText';
import {
  CloudDownload,
  ExternalLink,
  GitMerge,
  MessageSquare,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { JournalExtractedAspect } from '../lib/api';
import { isStaticMode } from '../lib/staticApi';

const JOURNAL_TEMPLATE = `Date: ${new Date().toISOString().slice(0, 10)}
Aspect/symbol: 🌪️ Tornado of Momentum
Ritual: Morning anchor reset — 60 seconds
Reflection: Today I noticed...
Tags: #daily #journal`;

export default function Journal() {
  const offline = isStaticMode();
  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [entries, setEntries] = useState<DiscordJournalEntry[]>([]);
  const [selected, setSelected] = useState<DiscordJournalEntry | null>(null);
  const [draft, setDraft] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<DraftJournalAttachment[]>([]);
  const [editDraft, setEditDraft] = useState('');
  const [editAttachments, setEditAttachments] = useState<DraftJournalAttachment[]>([]);
  const [editing, setEditing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergeFirstId, setMergeFirstId] = useState('');
  const [mergeSecondId, setMergeSecondId] = useState('');
  const [aspectPreview, setAspectPreview] = useState<JournalExtractedAspect[] | null>(null);
  const [aspectBusy, setAspectBusy] = useState(false);
  const [aspectMessage, setAspectMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, list] = await Promise.all([
        api.discordStatus(),
        api.discordJournal({ channel: 'journal', limit: 100 }),
      ]);
      setStatus(st);
      setEntries(list);
      setSelected((prev) => {
        if (prev && list.some((e) => e.id === prev.id)) {
          return list.find((e) => e.id === prev.id) ?? list[0] ?? null;
        }
        return list[0] ?? null;
      });
    } catch {
      setEntries([]);
      setError('Could not load journal — is the API running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (selected && !editing) {
      setEditDraft(selected.content);
      setEditAttachments(entryToDraftAttachments(selected));
      setAspectPreview(null);
      setAspectMessage(null);
    }
  }, [selected, editing]);

  const latest = entries[0] ?? null;
  const empty = !loading && entries.length === 0;

  async function syncFromDiscord(smart = true) {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const result = await api.syncJournalFromDiscord({ smart });
      const parts = [
        `Synced ${result.messages_fetched} Discord messages → ${result.total_entries} clubbed entries`,
      ];
      if (result.smart_sync?.headings?.length) {
        parts.push(result.smart_sync.headings.join(' · '));
      }
      if (result.smart_sync?.heading_club?.clubs) {
        parts.push(`merged ${result.smart_sync.heading_club.clubs} fragment${result.smart_sync.heading_club.clubs === 1 ? '' : 's'} by heading`);
      }
      setSyncMessage(parts.join(' · '));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discord sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function runSmartClubOnly() {
    setSyncing(true);
    setError(null);
    try {
      const result = await api.clubJournalEntries();
      const headings = result.headings?.length ? ` — ${result.headings.join(' · ')}` : '';
      setSyncMessage(`Smart club: ${result.remaining} entries${headings}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Smart merge failed');
    } finally {
      setSyncing(false);
    }
  }

  async function saveLocalEntry() {
    if (!draft.trim() && draftAttachments.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const row = await api.createJournalEntry(draft.trim(), {
        attachments: draftToPayload(draftAttachments),
      });
      setDraft('');
      revokeDraftPreviews(draftAttachments);
      setDraftAttachments([]);
      setShowCompose(false);
      await refresh();
      setSelected(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!selected || (!editDraft.trim() && editAttachments.length === 0)) return;
    setSaving(true);
    setError(null);
    try {
      const row = await api.updateJournalEntry(selected.id, editDraft.trim(), {
        attachments: draftToPayload(editAttachments),
      });
      setEditing(false);
      await refresh();
      setSelected(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function runMerge() {
    if (!mergeFirstId || !mergeSecondId || mergeFirstId === mergeSecondId) {
      setError('Pick two different entries — first message, then continuation');
      return;
    }
    setSaving(true);
    setError(null);
    setSyncMessage(null);
    try {
      const row = await api.mergeJournalEntries(mergeFirstId, mergeSecondId);
      setMergeFirstId('');
      setMergeSecondId('');
      setSyncMessage(`Merged into one entry (${row.attachments?.length || 0} images)`);
      await refresh();
      setSelected(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setSaving(false);
    }
  }

  async function loadAspectPreview(entryId: string) {
    setAspectBusy(true);
    setAspectMessage(null);
    setError(null);
    try {
      const result = await api.previewJournalAspects(entryId);
      setAspectPreview(result.aspects);
      if (!result.aspects.length) {
        setAspectMessage('No Master Fusion / Master Aspect blocks found in this entry.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse aspects');
      setAspectPreview(null);
    } finally {
      setAspectBusy(false);
    }
  }

  async function syncAspectsToRegistry() {
    if (!selected) return;
    setAspectBusy(true);
    setAspectMessage(null);
    setError(null);
    try {
      const result = await api.syncJournalAspects(selected.id);
      const parts = [];
      if (result.created.length) {
        parts.push(`Added ${result.created.length}: ${result.created.map((c) => c.name).join(', ')}`);
      }
      if (result.repaired?.length) {
        parts.push(`Repaired routing: ${result.repaired.map((r) => r.name).join(', ')}`);
      }
      if (result.skipped.length) {
        parts.push(`Already in registry: ${result.skipped.map((s) => s.name).join(', ')}`);
      }
      setAspectMessage(parts.join(' · ') || 'No new aspects to add');
      await loadAspectPreview(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aspect sync failed');
    } finally {
      setAspectBusy(false);
    }
  }

  async function deleteEntry() {
    if (!selected) return;
    if (!window.confirm('Delete this journal entry from AFS? (Does not remove the Discord message.)')) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteJournalEntry(selected.id);
      setEditing(false);
      setSelected(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  const setupSteps = useMemo(
    () => [
      'Create #journal in Super learners (if not done)',
      'Copy .env.example → .env and add DISCORD_BOT_TOKEN',
      'Invite bot with bot scope · enable Message Content Intent',
      'Run: npm run dev (live sync) or click Sync from Discord',
      'Post in #journal — or add entries manually below',
    ],
    []
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-forge-ember">Symbolic Archive</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Journal</h1>
          <p className="mt-2 max-w-xl text-forge-muted">
            {offline ? (
              <>Offline journal snapshot — {entries.length} entries bundled in static build.</>
            ) : (
              <>
                Your living forge log — synced from Discord <span className="text-forge-cyan">#journal</span>, editable in AFS.
              </>
            )}
          </p>
          {status?.invite_url && (
            <a
              href={status.invite_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-forge-cyan hover:underline"
            >
              {status.guild_name} <ExternalLink size={14} />
            </a>
          )}
        </div>
        {!offline && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCompose(true);
                setDraft(JOURNAL_TEMPLATE);
                setDraftAttachments([]);
              }}
            >
              <Plus size={14} className="mr-1.5" />
              Add entry
            </Button>
            <Button onClick={() => syncFromDiscord(true)} disabled={syncing || !status?.configured}>
              <CloudDownload size={14} className={`mr-1.5 ${syncing ? 'animate-pulse' : ''}`} />
              {syncing ? 'Syncing...' : 'Smart sync'}
            </Button>
            <Button variant="ghost" onClick={runSmartClubOnly} disabled={syncing || entries.length < 2}>
              <GitMerge size={14} className="mr-1.5" />
              Re-club by heading
            </Button>
            <button
              type="button"
              onClick={() => refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-forge-border px-3 py-2 text-xs text-forge-muted transition hover:border-forge-cyan/40 hover:text-white"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        )}
      </header>

      {syncMessage && (
        <p className="rounded-lg border border-forge-leaf/30 bg-forge-leaf/10 px-4 py-2 text-sm text-forge-leaf">
          {syncMessage}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-forge-ember/30 bg-forge-ember/10 px-4 py-2 text-sm text-forge-ember">
          {error}
        </p>
      )}

      {latest && (
        <Panel
          title="Latest entry"
          subtitle={`#${latest.channel_name} · ${new Date(latest.posted_at).toLocaleString()}`}
          action={
            <Link to="/search" className="text-xs text-forge-muted hover:text-forge-cyan">
              Search all →
            </Link>
          }
        >
          <JournalEntryReader entry={latest} showMeta={false} />
        </Panel>
      )}

      {empty && !offline && (
        <Panel title="No entries yet" subtitle="Sync from Discord or add one manually">
          <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-forge-muted">
            {setupSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => syncFromDiscord(true)} disabled={syncing || !status?.configured}>
              <CloudDownload size={14} className="mr-1.5" />
              Sync from Discord
            </Button>
            <Button variant="ghost" onClick={() => { setShowCompose(true); setDraft(JOURNAL_TEMPLATE); setDraftAttachments([]); }}>
              <Plus size={14} className="mr-1.5" />
              Add entry
            </Button>
          </div>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          {!offline && (
          <Panel title="Merge split messages" subtitle="Discord length limits often break one journal into two posts">
            <p className="mb-3 text-xs text-forge-muted">
              Select the <span className="text-forge-cyan">first</span> message, then the{' '}
              <span className="text-forge-cyan">continuation</span>. Images from both are kept.
            </p>
            <div className="space-y-2">
              <label className="block text-xs text-forge-muted">
                1st message (earlier part)
                <select
                  value={mergeFirstId}
                  onChange={(e) => setMergeFirstId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-forge-border bg-forge-panel px-3 py-2 text-sm outline-none focus:border-forge-cyan"
                >
                  <option value="">Select entry…</option>
                  {entries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {new Date(e.posted_at).toLocaleString()} — {journalPreview(e.content, 50, e.attachments?.length || 0)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-forge-muted">
                2nd message (continues first)
                <select
                  value={mergeSecondId}
                  onChange={(e) => setMergeSecondId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-forge-border bg-forge-panel px-3 py-2 text-sm outline-none focus:border-forge-cyan"
                >
                  <option value="">Select entry…</option>
                  {entries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {new Date(e.posted_at).toLocaleString()} — {journalPreview(e.content, 50, e.attachments?.length || 0)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={runMerge}
                disabled={saving || !mergeFirstId || !mergeSecondId || mergeFirstId === mergeSecondId}
              >
                <GitMerge size={14} className="mr-1.5" />
                Merge entries
              </Button>
              {selected && (
                <button
                  type="button"
                  onClick={() => {
                    if (!mergeFirstId) setMergeFirstId(selected.id);
                    else if (!mergeSecondId && selected.id !== mergeFirstId) setMergeSecondId(selected.id);
                  }}
                  className="rounded-lg border border-forge-border px-3 py-2 text-xs text-forge-muted hover:text-white"
                >
                  Use selected entry
                </button>
              )}
            </div>
          </Panel>
          )}

          <Panel title="Timeline" subtitle={`${entries.length} entries · #journal`}>
            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {entries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setSelected(e);
                    setEditing(false);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition hover:border-forge-cyan/40 ${
                    selected?.id === e.id
                      ? 'border-forge-cyan/50 bg-forge-cyan/5'
                      : 'border-forge-border bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <JournalEntryPreview entry={e} />
                    <span className="shrink-0 font-mono text-[10px] text-forge-muted">
                      {new Date(e.posted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-forge-muted">
                    {journalPreview(e.content, 70, e.attachments?.length || 0)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(e.attachments?.length || 0) > 0 && (
                      <span className="rounded bg-forge-leaf/10 px-1.5 py-0.5 font-mono text-[9px] text-forge-leaf">
                        📷 {e.attachments?.length}
                      </span>
                    )}
                    {e.channel_id === 'local' && (
                      <span className="rounded bg-forge-gold/10 px-1.5 py-0.5 font-mono text-[9px] text-forge-gold">
                        in-app
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {empty && !loading && (
                <div className="flex flex-col items-center py-12 text-forge-muted">
                  <NotebookPen size={28} className="mb-2 opacity-40" />
                  <p className="text-sm">No entries yet</p>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-3">
          <Panel
            title={editing ? 'Edit entry' : 'Reader'}
            subtitle={selected ? new Date(selected.posted_at).toLocaleString() : 'Select an entry'}
            action={
              selected && !editing && !offline ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setEditDraft(selected.content);
                      setEditAttachments(entryToDraftAttachments(selected));
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-forge-border px-2.5 py-1.5 text-xs text-forge-muted hover:border-forge-cyan/40 hover:text-white"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={deleteEntry}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-forge-ember/30 px-2.5 py-1.5 text-xs text-forge-ember hover:bg-forge-ember/10"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              ) : editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1 text-xs text-forge-muted hover:text-white"
                >
                  <X size={12} />
                  Cancel
                </button>
              ) : null
            }
          >
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-20 text-forge-muted">
                <MessageSquare size={32} className="mb-3 opacity-40" />
                <p className="text-sm">Select an entry from the timeline</p>
              </div>
            ) : editing ? (
              <div className="space-y-3">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={16}
                  className="w-full rounded-xl border border-forge-border bg-forge-panel px-4 py-3 font-mono text-sm leading-relaxed outline-none focus:border-forge-cyan"
                />
                <JournalImageAttachments
                  attachments={editAttachments}
                  onChange={setEditAttachments}
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={saveEdit}
                    disabled={saving || (!editDraft.trim() && editAttachments.length === 0)}
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <JournalEntryReader entry={selected} />

                {!offline && (
                <div className="rounded-xl border border-forge-violet/25 bg-forge-violet/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wider text-forge-violet">Aspect registry</p>
                      <p className="mt-1 text-xs text-forge-muted">
                        Extract Master Fusion aspects from this entry into the Aspect directory
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => loadAspectPreview(selected.id)}
                        disabled={aspectBusy}
                      >
                        Preview
                      </Button>
                      <Button onClick={syncAspectsToRegistry} disabled={aspectBusy}>
                        <Sparkles size={14} className="mr-1.5" />
                        Sync to registry
                      </Button>
                    </div>
                  </div>
                  {aspectMessage && (
                    <p className="mt-3 text-sm text-forge-leaf">{aspectMessage}</p>
                  )}
                  {aspectPreview && aspectPreview.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {aspectPreview.map((a) => (
                        <li
                          key={a.name}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-forge-border bg-black/20 px-3 py-2 text-sm"
                        >
                          <span>
                            <EmojiText text={a.symbol_chain} size="sm" /> {a.name}
                          </span>
                          {a.exists ? (
                            <Link
                              to={`/aspects?id=${a.aspect_id}`}
                              className="font-mono text-[10px] text-forge-muted hover:text-forge-cyan"
                            >
                              already in registry →
                            </Link>
                          ) : (
                            <span className="font-mono text-[10px] text-forge-leaf">new</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {showCompose && !offline && (
        <Panel
          title="Add journal entry"
          subtitle="Saved in AFS — use Sync from Discord to pull #journal posts"
          action={
            <button type="button" onClick={() => setShowCompose(false)} className="text-forge-muted hover:text-white">
              <X size={16} />
            </button>
          }
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            placeholder={JOURNAL_TEMPLATE}
            className="mb-3 w-full rounded-xl border border-forge-border bg-forge-panel px-4 py-3 font-mono text-sm leading-relaxed outline-none focus:border-forge-cyan"
          />
          <JournalImageAttachments
            attachments={draftAttachments}
            onChange={setDraftAttachments}
            disabled={saving}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={saveLocalEntry}
              disabled={saving || (!draft.trim() && draftAttachments.length === 0)}
            >
              {saving ? 'Saving...' : 'Save entry'}
            </Button>
            <button
              type="button"
              onClick={() => setDraft(JOURNAL_TEMPLATE)}
              className="rounded-lg border border-forge-border px-3 py-2 text-xs text-forge-muted hover:text-white"
            >
              Insert template
            </button>
          </div>
        </Panel>
      )}

      {!offline && (
      <Panel title="Discord template" subtitle="Copy this when posting in #journal">
        <pre className="overflow-x-auto rounded-xl border border-forge-border bg-black/20 p-4 font-mono text-xs leading-relaxed text-forge-muted whitespace-pre-wrap">
          {JOURNAL_TEMPLATE}
        </pre>
        <p className="mt-3 text-xs text-forge-muted">
          <code className="text-forge-cyan">npm run journal-sync</code> or the Sync button transfers Discord posts into AFS,
          including image attachments. Edits and deletes here are local to AFS only.
        </p>
      </Panel>
      )}
    </div>
  );
}