import { useState } from 'react';
import {
  ASPECT_CATEGORIES,
  ASPECT_OPERATORS,
  BASE_LAYER_SLOTS,
  AspectFormData,
  SAVE_CODEX,
  emptyAspectForm,
} from '../lib/aspect-pattern';
import { showsFacetEditor } from '../lib/aspect-quality';
import { tierFromPotential, TIER_POTENTIAL_LABELS } from '../lib/tiers';
import { Panel, Button } from './ui';
import EmojiText from './EmojiText';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  initial?: AspectFormData;
  mode: 'create' | 'edit';
  onSave: (data: AspectFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

const inputClass =
  'w-full rounded-lg border border-forge-border bg-forge-panel px-3 py-2 text-sm outline-none focus:border-forge-cyan';
const labelClass = 'font-mono text-[10px] uppercase tracking-wider text-forge-muted';

export default function AspectForm({ initial, mode, onSave, onCancel, onDelete, deleting }: Props) {
  const [form, setForm] = useState<AspectFormData>(initial ?? emptyAspectForm());
  const [useTriggerMantra, setUseTriggerMantra] = useState(() => Boolean(initial?.mantra?.trim()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const showFacetEditor = showsFacetEditor(form.integration.operator);

  function set<K extends keyof AspectFormData>(key: K, value: AspectFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setFace(i: number, field: 'name' | 'symbol' | 'mantra' | 'explanation', value: string) {
    setForm((f) => {
      const faces = [...f.radiantFaces];
      faces[i] = { ...faces[i], [field]: value };
      return { ...f, radiantFaces: faces };
    });
  }

  async function submit() {
    if (!form.name.trim()) {
      setError('Master Aspect name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title={mode === 'create' ? 'Forge New Aspect' : `Edit — ${form.name}`}
      subtitle={
        showFacetEditor
          ? 'Diamond Aspect — Master Aspect → Mantra → Radiant Faces → Integration'
          : 'Basic Aspect — EOT simple route · mantra & integration only (use DCS / RCS / RDTQ for facets)'
      }
    >
      <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
        <section>
          <p className={labelClass}>Master Aspect</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <input
                className={inputClass}
                placeholder="Red Leaf [Name] — Master Aspect"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div>
              <p className={labelClass}>Symbol Chain</p>
              <div className="mt-1 flex items-center gap-2">
                <input className={`flex-1 ${inputClass}`} value={form.symbol_chain} onChange={(e) => set('symbol_chain', e.target.value)} />
                <EmojiText text={form.symbol_chain} size="lg" />
              </div>
            </div>
            <div>
              <p className={labelClass}>Base Layer</p>
              <select className={`mt-1 ${inputClass}`} value={form.base_layer_link} onChange={(e) => set('base_layer_link', e.target.value)}>
                {BASE_LAYER_SLOTS.map((s) => (
                  <option key={s.symbol} value={s.symbol}>{s.symbol} {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className={labelClass}>Tier (from potential)</p>
              <p className="mt-1 rounded-lg border border-forge-border bg-forge-panel px-3 py-2 font-mono text-sm text-forge-cyan">
                {tierFromPotential(form.potential_score)} — {TIER_POTENTIAL_LABELS[tierFromPotential(form.potential_score)] || 'set potential below'}
              </p>
            </div>
            <div>
              <p className={labelClass}>Category</p>
              <select className={`mt-1 ${inputClass}`} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {ASPECT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <p className={labelClass}>Identity & Mantras</p>
          <div className="mt-2 space-y-2">
            <textarea className={inputClass} rows={2} placeholder="Identity — what this aspect is in AFS" value={form.identity} onChange={(e) => set('identity', e.target.value)} />
            {useTriggerMantra ? (
              <>
                <input
                  className={inputClass}
                  placeholder='Trigger mantra — short quotable line (e.g. "Guard the Heart")'
                  value={form.mantra}
                  onChange={(e) => set('mantra', e.target.value)}
                />
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Self-Affirmation — I-statement"
                  value={form.coreAffirmation}
                  onChange={(e) => set('coreAffirmation', e.target.value)}
                />
              </>
            ) : (
              <textarea
                className={inputClass}
                rows={2}
                placeholder="Self-Affirmation — I-statement"
                value={form.coreAffirmation}
                onChange={(e) => set('coreAffirmation', e.target.value)}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (useTriggerMantra) set('mantra', '');
                setUseTriggerMantra((v) => !v);
              }}
              className="text-xs text-forge-cyan hover:underline"
            >
              {useTriggerMantra ? 'Merge into single self-affirmation' : 'Add separate trigger mantra'}
            </button>
            <textarea className={inputClass} rows={3} placeholder="Supreme Mantra — ultimate seal" value={form.supremeMantra} onChange={(e) => set('supremeMantra', e.target.value)} />
            <textarea className={inputClass} rows={2} placeholder="Comprehension notes" value={form.comprehension} onChange={(e) => set('comprehension', e.target.value)} />
          </div>
        </section>

        {showFacetEditor ? (
        <section>
          <div className="flex items-center justify-between">
            <p className={labelClass}>Diamond Radiant Faces</p>
            <button
              type="button"
              onClick={() => set('radiantFaces', [...form.radiantFaces, { name: '', symbol: '🍁💎', mantra: '', explanation: '' }])}
              className="inline-flex items-center gap-1 text-xs text-forge-cyan hover:underline"
            >
              <Plus size={12} /> Add face
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {form.radiantFaces.map((f, i) => (
              <div key={i} className="rounded-lg border border-forge-border p-3">
                <div className="mb-2 flex justify-between">
                  <span className="font-mono text-xs text-forge-cyan">Face {i + 1}</span>
                  {form.radiantFaces.length > 1 && (
                    <button type="button" onClick={() => set('radiantFaces', form.radiantFaces.filter((_, j) => j !== i))} className="text-forge-muted hover:text-forge-ember">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className={inputClass} placeholder="Name" value={f.name} onChange={(e) => setFace(i, 'name', e.target.value)} />
                  <div className="flex items-center gap-2">
                    <input className={`flex-1 ${inputClass}`} placeholder="Symbol" value={f.symbol} onChange={(e) => setFace(i, 'symbol', e.target.value)} />
                    <EmojiText text={f.symbol} size="md" />
                  </div>
                  <input className={inputClass} placeholder="Self-Affirmation" value={f.mantra} onChange={(e) => setFace(i, 'mantra', e.target.value)} />
                </div>
                <textarea
                  className={`mt-2 ${inputClass}`}
                  rows={2}
                  placeholder="Explanation — what this facet does / means"
                  value={f.explanation || ''}
                  onChange={(e) => setFace(i, 'explanation', e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>
        ) : (
          <p className="rounded-lg border border-forge-border bg-white/[0.02] px-3 py-2 text-xs text-forge-muted">
            Basic aspects have no radiant-face lattice. Use DCS (Diamond), RCS (Resonant Diamond), or RDTQ (Infinitely Resonant) as the synthesis operator.
          </p>
        )}

        <section>
          <p className={labelClass}>Integration</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Operator</p>
              <select
                className={`mt-1 ${inputClass}`}
                value={form.integration.operator}
                onChange={(e) => set('integration', { ...form.integration, operator: e.target.value })}
              >
                {ASPECT_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <p className={labelClass}>Save Codex</p>
              <select
                className={`mt-1 ${inputClass}`}
                value={form.integration.saveCodex}
                onChange={(e) => set('integration', { ...form.integration, saveCodex: e.target.value })}
              >
                {SAVE_CODEX.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className={labelClass}>Strengthens (comma-separated aspect names)</p>
              <input
                className={`mt-1 ${inputClass}`}
                value={form.integration.strengthens.join(', ')}
                onChange={(e) =>
                  set('integration', {
                    ...form.integration,
                    strengthens: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <p className={labelClass}>Evolution paths (one per line)</p>
              <textarea
                className={`mt-1 ${inputClass}`}
                rows={2}
                value={form.integration.evolution.join('\n')}
                onChange={(e) =>
                  set('integration', {
                    ...form.integration,
                    evolution: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </div>
            <div>
              <p className={labelClass}>Proficiency (0–1)</p>
              <input type="number" step="0.05" min="0" max="1" className={`mt-1 ${inputClass}`} value={form.proficiency} onChange={(e) => set('proficiency', Number(e.target.value))} />
            </div>
            <div>
              <p className={labelClass}>Potential (0–1)</p>
              <input type="number" step="0.05" min="0" max="1" className={`mt-1 ${inputClass}`} value={form.potential_score} onChange={(e) => set('potential_score', Number(e.target.value))} />
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-forge-ember">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={submit} disabled={saving || deleting}>{saving ? 'Saving...' : mode === 'create' ? 'Forge Aspect' : 'Save Changes'}</Button>
          <Button variant="ghost" onClick={onCancel} disabled={saving || deleting}>Cancel</Button>
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving || deleting}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-forge-ember/30 px-3 py-2 text-sm text-forge-ember transition-colors hover:bg-forge-ember/10 disabled:opacity-40"
            >
              <Trash2 size={14} />
              {deleting ? 'Deleting...' : 'Delete Aspect'}
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}