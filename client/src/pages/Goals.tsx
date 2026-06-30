import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { api, Goal, GoalInput, Achievement } from '../lib/api';
import { isStaticMode } from '../lib/staticApi';
import { Panel, Button, ProgressBar, StatCard, CollapsiblePanel } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';

type GoalFilter = 'active' | 'inactive' | 'completed' | 'all';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-forge-cyan/20 text-forge-cyan',
  inactive: 'bg-white/10 text-forge-muted',
  completed: 'bg-forge-gold/20 text-forge-gold',
};

const EMPTY_FORM: GoalInput = {
  title: '',
  description: '',
  aspect_link: '',
  target_date: '',
  status: 'active',
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function Goals() {
  const staticMode = isStaticMode();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filter, setFilter] = useState<GoalFilter>('active');
  const [form, setForm] = useState<GoalInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GoalInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [g, a] = await Promise.all([api.goals(), api.achievements()]);
    setGoals(g);
    setAchievements(a);
  }, []);

  useEffect(() => {
    reload()
      .catch(() => setError('Could not load goals'))
      .finally(() => setLoading(false));
  }, [reload]);

  const counts = useMemo(
    () => ({
      active: goals.filter((g) => g.status === 'active').length,
      inactive: goals.filter((g) => g.status === 'inactive').length,
      completed: goals.filter((g) => g.status === 'completed').length,
      total: goals.length,
    }),
    [goals]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return goals;
    return goals.filter((g) => g.status === filter);
  }, [goals, filter]);

  async function addGoal() {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createGoal({
        title: form.title.trim(),
        description: form.description?.trim() || '',
        aspect_link: form.aspect_link?.trim() || '',
        target_date: form.target_date?.trim() || null,
        status: 'active',
      });
      setForm(EMPTY_FORM);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create goal');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: number) {
    if (!editForm.title?.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateGoal(id, {
        title: editForm.title.trim(),
        description: editForm.description?.trim() || '',
        aspect_link: editForm.aspect_link?.trim() || '',
        target_date: editForm.target_date?.trim() || null,
        progress: editForm.progress,
        status: editForm.status,
      });
      setEditingId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update goal');
    } finally {
      setSaving(false);
    }
  }

  async function patchGoal(id: number, patch: Partial<GoalInput>) {
    setError(null);
    try {
      await api.updateGoal(id, patch);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update goal');
    }
  }

  async function removeGoal(goal: Goal) {
    if (!window.confirm(`Remove goal "${goal.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.deleteGoal(goal.id);
      if (editingId === goal.id) setEditingId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete goal');
    }
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditForm({
      title: goal.title,
      description: goal.description || '',
      aspect_link: goal.aspect_link || '',
      target_date: goal.target_date || '',
      progress: goal.progress,
      status: goal.status as GoalInput['status'],
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Goals & Achievements</h1>
        <p className="text-forge-muted">
          Forge targets linked to aspects · track progress · pause or resume pursuit ·{' '}
          <Link to="/grok" className="text-forge-ember hover:underline">
            genesis arc
          </Link>
        </p>
      </header>
      <GenesisBanner compact />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active" value={counts.active} icon={<Target size={18} className="text-forge-cyan" />} />
        <StatCard label="Inactive" value={counts.inactive} icon={<PauseCircle size={18} className="text-forge-muted" />} />
        <StatCard label="Completed" value={counts.completed} icon={<CheckCircle2 size={18} className="text-forge-gold" />} />
        <StatCard label="Total" value={counts.total} />
      </div>

      {error && (
        <p className="rounded-lg border border-forge-ember/40 bg-forge-ember/10 px-3 py-2 text-sm text-forge-ember">
          {error}
        </p>
      )}

      {!staticMode && (
        <Panel title="Forge a Goal" subtitle="Name the pursuit, link an aspect, set a target date">
          <div className="grid gap-3 lg:grid-cols-2">
            <input
              className="rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm outline-none focus:border-forge-cyan/50"
              placeholder="Goal title *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            />
            <input
              className="rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm outline-none focus:border-forge-cyan/50"
              placeholder="Linked aspect (optional)"
              value={form.aspect_link}
              onChange={(e) => setForm((f) => ({ ...f, aspect_link: e.target.value }))}
            />
            <input
              type="date"
              className="rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm outline-none focus:border-forge-cyan/50"
              value={form.target_date || ''}
              onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
            />
            <textarea
              rows={2}
              className="rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm outline-none focus:border-forge-cyan/50 lg:col-span-2"
              placeholder="Description — what does done look like?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={addGoal} disabled={saving || !form.title.trim()}>
              <Plus size={14} className="mr-1.5 inline" />
              {saving ? 'Sealing...' : 'Add goal'}
            </Button>
          </div>
        </Panel>
      )}

      {staticMode && (
        <p className="text-sm text-forge-muted">
          Static export is read-only for goals. Run the live platform to add, remove, and toggle goals.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Goal Registry"
          subtitle="Active goals surface on the dashboard"
          action={
            <div className="flex flex-wrap gap-1">
              {(['active', 'inactive', 'completed', 'all'] as GoalFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] capitalize ${
                    filter === key ? 'bg-forge-cyan/20 text-forge-cyan' : 'bg-white/5 text-forge-muted'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <p className="text-sm text-forge-muted">Loading goals...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-forge-muted">
              {filter === 'active'
                ? 'No active goals — forge one above to begin pursuit.'
                : `No ${filter === 'all' ? '' : `${filter} `}goals in the registry.`}
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((g) => (
                <div key={g.id} className="rounded-xl border border-forge-border p-4">
                  {editingId === g.id ? (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm"
                        value={editForm.title}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      />
                      <textarea
                        rows={2}
                        className="w-full rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm"
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          className="rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm"
                          placeholder="Aspect link"
                          value={editForm.aspect_link}
                          onChange={(e) => setEditForm((f) => ({ ...f, aspect_link: e.target.value }))}
                        />
                        <input
                          type="date"
                          className="rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm"
                          value={editForm.target_date || ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, target_date: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => saveEdit(g.id)} disabled={saving}>
                          Save
                        </Button>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium">{g.title}</h3>
                          {g.description && (
                            <p className="mt-1 text-sm text-forge-muted">{g.description}</p>
                          )}
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[g.status] || STATUS_STYLES.inactive}`}
                        >
                          {g.status}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs">
                          {g.aspect_link ? (
                            <Link
                              to={`/aspects?q=${encodeURIComponent(g.aspect_link)}`}
                              className="text-forge-cyan hover:underline"
                            >
                              → {g.aspect_link}
                            </Link>
                          ) : (
                            <span className="text-forge-muted">No aspect link</span>
                          )}
                          <span className="font-mono text-forge-gold">
                            {Math.round(g.progress * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(g.progress * 100)}
                          disabled={staticMode}
                          className="mb-2 w-full accent-forge-gold disabled:opacity-50"
                          onChange={(e) =>
                            patchGoal(g.id, { progress: Number(e.target.value) / 100 })
                          }
                        />
                        <ProgressBar value={g.progress} color="gold" />
                      </div>

                      {(g.target_date || g.created_at) && (
                        <p className="mt-2 text-[11px] text-forge-muted">
                          {g.target_date && <>Target {formatDate(g.target_date)}</>}
                          {g.target_date && g.created_at && ' · '}
                          {g.created_at && <>Forged {formatDate(g.created_at)}</>}
                        </p>
                      )}

                      {!staticMode && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {g.status === 'active' ? (
                            <Button
                              variant="ghost"
                              className="text-xs"
                              onClick={() => patchGoal(g.id, { status: 'inactive' })}
                            >
                              <PauseCircle size={13} className="mr-1 inline" />
                              Pause
                            </Button>
                          ) : g.status === 'inactive' ? (
                            <Button
                              variant="leaf"
                              className="text-xs"
                              onClick={() => patchGoal(g.id, { status: 'active' })}
                            >
                              <PlayCircle size={13} className="mr-1 inline" />
                              Resume
                            </Button>
                          ) : null}
                          {g.status !== 'completed' && (
                            <Button
                              variant="ghost"
                              className="text-xs"
                              onClick={() => patchGoal(g.id, { status: 'completed', progress: 1 })}
                            >
                              <CheckCircle2 size={13} className="mr-1 inline" />
                              Complete
                            </Button>
                          )}
                          {g.status === 'completed' && (
                            <Button
                              variant="ghost"
                              className="text-xs"
                              onClick={() => patchGoal(g.id, { status: 'active' })}
                            >
                              <Archive size={13} className="mr-1 inline" />
                              Reopen
                            </Button>
                          )}
                          <Button variant="ghost" className="text-xs" onClick={() => startEdit(g)}>
                            Edit
                          </Button>
                          <Button
                            variant="ember"
                            className="text-xs"
                            onClick={() => removeGoal(g)}
                          >
                            <Trash2 size={13} className="mr-1 inline" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Achievements">
          <div className="grid gap-3 sm:grid-cols-2">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-4 text-center ${
                  a.unlocked_at ? 'border-forge-gold/40 bg-forge-gold/5' : 'border-forge-border opacity-50'
                }`}
              >
                <p className="text-3xl">{a.icon}</p>
                <h3 className="mt-2 text-sm font-medium">{a.title}</h3>
                <p className="mt-1 text-xs text-forge-muted">{a.description}</p>
                {a.unlocked_at && (
                  <p className="mt-2 font-mono text-[10px] text-forge-gold">
                    Unlocked
                    {a.title === 'Genesis Thread Loaded' && (
                      <>
                        {' '}
                        ·{' '}
                        <Link to="/grok" className="text-forge-ember hover:underline">
                          view origin
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {counts.inactive > 0 && filter === 'active' && (
        <CollapsiblePanel
          title="Paused goals"
          subtitle={`${counts.inactive} inactive — not shown on dashboard`}
          badge={
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-forge-muted">
              {counts.inactive}
            </span>
          }
        >
          <div className="space-y-2">
            {goals
              .filter((g) => g.status === 'inactive')
              .map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-lg border border-forge-border/60 px-3 py-2 text-sm"
                >
                  <span>{g.title}</span>
                  {!staticMode && (
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => patchGoal(g.id, { status: 'active' })}
                    >
                      Resume
                    </Button>
                  )}
                </div>
              ))}
          </div>
        </CollapsiblePanel>
      )}
    </div>
  );
}