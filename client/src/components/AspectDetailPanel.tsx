import { useState } from 'react';
import type { AspectFullDetail } from '../lib/aspect-detail';
import { resolveAffirmations } from '../lib/aspect-affirmation';
import { copyAspectDiscordMarkdown } from '../lib/aspect-discord-export';
import { ASPECT_QUALITY_HINTS, formatEotRoutingLabel, normalizeAspectQuality } from '../lib/aspect-quality';
import { Panel, TierBadge, QualityBadge, ProgressBar, Button } from './ui';
import EmojiText from './EmojiText';
import { Pencil, Share2, Trash2 } from 'lucide-react';

interface Props {
  detail: AspectFullDetail | null;
  loading?: boolean;
  onEdit?: (detail: AspectFullDetail) => void;
  onDelete?: (detail: AspectFullDetail) => void;
  deleting?: boolean;
  highlightFace?: string | null;
  focusMasterFusion?: boolean;
}

function AspectFusionPanel({ fusion }: { fusion: NonNullable<AspectFullDetail['aspectFusion']> }) {
  return (
    <Panel
      title="Aspect Fusion"
      subtitle="Identity embodied into aspect — speak the fusion affirmation to seal"
      className="ring-1 ring-forge-leaf/40 shadow-glow"
    >
      {fusion.essence?.trim() ? (
        <div className="mb-4">
          <p className="font-mono text-xs uppercase text-forge-muted">Debabelized essence</p>
          <p className="mt-1 text-sm leading-relaxed text-forge-muted whitespace-pre-wrap">{fusion.essence}</p>
        </div>
      ) : null}
      <div className="mb-3">
        <p className="font-mono text-xs uppercase text-forge-ember">Fused identity</p>
        <p className="mt-1 text-sm text-white/90 whitespace-pre-wrap">{fusion.identity}</p>
      </div>
      {fusion.symbolChain ? (
        <div className="mb-3">
          <p className="font-mono text-xs uppercase text-forge-muted">Fusion symbol</p>
          <EmojiText text={fusion.symbolChain} size="2xl" title={fusion.symbolChain} nowrap />
        </div>
      ) : null}
      <div>
        <p className="font-mono text-xs uppercase text-forge-leaf">Fusion affirmation</p>
        <blockquote className="mt-1 rounded-lg border border-forge-leaf/30 bg-forge-leaf/5 p-3 italic leading-relaxed text-forge-leaf whitespace-pre-wrap">
          {fusion.affirmation}
        </blockquote>
      </div>
      {fusion.originSource ? (
        <p className="mt-2 font-mono text-[10px] text-forge-muted">Origin: {fusion.originSource}</p>
      ) : null}
    </Panel>
  );
}

function SynergyFusionPanel({
  fusion,
  emphasized = false,
}: {
  fusion: NonNullable<AspectFullDetail['masterFusion']>;
  emphasized?: boolean;
}) {
  return (
    <Panel
      title="Synergy Fusion"
      subtitle={emphasized ? 'Diamond face resolves to synergy output' : 'Aspect combination output'}
      className={emphasized ? 'ring-1 ring-forge-gold/50 shadow-glow' : ''}
    >
      <h4 className="font-display text-lg text-forge-gold">{fusion.name}</h4>
      <div className="mt-2 flex flex-wrap gap-1">
        {fusion.inputs.map((i, idx) => (
          <span key={`${i}-${idx}`} className="rounded bg-white/10 px-2 py-0.5 text-xs">{i}</span>
        ))}
      </div>
      {fusion.description && (
        <p className="mt-2 text-sm text-forge-muted">{fusion.description}</p>
      )}
      {fusion.strength != null && (
        <p className="mt-1 font-mono text-xs text-forge-violet">Synergy {Math.round(fusion.strength * 100)}%</p>
      )}
      {fusion.operator && (
        <p className="mt-1 font-mono text-[10px] text-forge-ember">{fusion.operator}</p>
      )}
    </Panel>
  );
}

export default function AspectDetailPanel({
  detail,
  loading,
  onEdit,
  onDelete,
  deleting,
  highlightFace,
  focusMasterFusion,
}: Props) {
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function shareAspect() {
    if (!detail) return;
    try {
      await copyAspectDiscordMarkdown(detail, { highlightFace });
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2000);
    } catch {
      setShareState('error');
      window.setTimeout(() => setShareState('idle'), 2500);
    }
  }

  if (loading) {
    return (
      <Panel title="Loading aspect..." subtitle="Forging full detail">
        <p className="text-sm text-forge-muted">Pulling identity, faces, fusion, integration...</p>
      </Panel>
    );
  }

  if (!detail) {
    return (
      <Panel title="Select Aspect" subtitle="Comprehension panel">
        <p className="text-forge-muted">Click an aspect to view identity, mantras, fusion, and integration. Diamond aspects also show radiant faces.</p>
      </Panel>
    );
  }

  const integration = detail.integration ?? {
    operator: 'AFP',
    saveCodex: 'Save8',
    baseLayer: [{ symbol: '⚓', name: 'Anchor of Stability' }],
    strengthens: [],
    evolution: [`${detail.name} → higher synthesis via DCS`],
  };
  const quality = normalizeAspectQuality(detail.quality ?? 'basic');
  const showFacets = quality === 'diamond' || quality === 'resonant' || quality === 'infinite';
  const diamondFaces = showFacets ? (detail.diamondFaces ?? detail.radiantFaces ?? []) : [];
  const synergies = detail.synergies ?? [];
  const alchemyFusions = detail.alchemyFusions ?? [];
  const relatedInsights = detail.relatedInsights ?? [];
  const visualizations = detail.visualizations ?? [];
  const showFusionFirst = focusMasterFusion && detail.masterFusion;
  const aspectFusion = detail.aspectFusion;
  const affirmations = resolveAffirmations(detail.mantra, detail.coreAffirmation);
  const showSeparateSupreme =
    detail.supremeMantra?.trim() &&
    (!aspectFusion?.affirmation || detail.supremeMantra.trim() !== aspectFusion.affirmation.trim());

  return (
    <div className="space-y-4">
      {highlightFace && showFacets && (
        <div className="rounded-xl border border-forge-violet/30 bg-forge-violet/10 px-4 py-3 text-sm">
          <p className="font-mono text-[10px] uppercase tracking-wider text-forge-violet">Diamond face match</p>
          <p className="mt-1">
            <span className="font-medium text-white">{highlightFace}</span>
            <span className="text-forge-muted"> → Master Aspect </span>
            <span className="font-medium text-forge-cyan">{detail.name}</span>
          </p>
        </div>
      )}

      {aspectFusion ? <AspectFusionPanel fusion={aspectFusion} /> : null}

      {showFusionFirst && <SynergyFusionPanel fusion={detail.masterFusion!} emphasized />}

      <Panel
        title={detail.name}
        subtitle={`${ASPECT_QUALITY_HINTS[quality]} · Tier ${detail.tier} · ${formatEotRoutingLabel(integration)}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shareAspect}
              className="inline-flex items-center gap-1 rounded-lg border border-forge-border px-2.5 py-1.5 text-xs text-forge-muted transition-colors hover:border-forge-cyan/40 hover:text-forge-cyan"
              title="Copy Discord markdown to clipboard"
            >
              <Share2 size={14} />
              {shareState === 'copied' ? 'Copied!' : shareState === 'error' ? 'Copy failed' : 'Share'}
            </button>
            {onEdit && (
              <Button variant="ghost" onClick={() => onEdit(detail)} className="!px-2 !py-1">
                <span className="inline-flex items-center gap-1 text-xs">
                  <Pencil size={14} /> Edit
                </span>
              </Button>
            )}
            {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(detail)}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 rounded-lg border border-forge-ember/30 px-2.5 py-1.5 text-xs text-forge-ember transition-colors hover:bg-forge-ember/10 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <EmojiText text={detail.symbolChain} size="3xl" title={detail.symbolChain} nowrap />
          <QualityBadge quality={quality} />
          <TierBadge tier={detail.tier} />
          <span className="font-mono text-xs text-forge-muted">{detail.mentions} corpus refs · tier {detail.tier} from potential</span>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="font-mono text-xs uppercase text-forge-ember">Identity</p>
            <p className="mt-1 text-forge-muted">{detail.identity}</p>
          </div>
          {affirmations.merged ? (
            affirmations.selfAffirmation ? (
              <div>
                <p className="font-mono text-xs uppercase text-forge-cyan">Self-Affirmation</p>
                <blockquote className="mt-1 border-l-2 border-forge-cyan/50 pl-3 italic text-white/90">
                  {affirmations.selfAffirmation}
                </blockquote>
              </div>
            ) : null
          ) : (
            <>
              {affirmations.triggerMantra ? (
                <div>
                  <p className="font-mono text-xs uppercase text-forge-gold">Trigger Mantra</p>
                  <blockquote className="mt-1 border-l-2 border-forge-gold pl-3 italic text-forge-gold">
                    {affirmations.triggerMantra}
                  </blockquote>
                </div>
              ) : null}
              {affirmations.selfAffirmation ? (
                <div>
                  <p className="font-mono text-xs uppercase text-forge-cyan">Self-Affirmation</p>
                  <p className="mt-1 text-white/90">{affirmations.selfAffirmation}</p>
                </div>
              ) : null}
            </>
          )}
          {showSeparateSupreme ? (
            <div>
              <p className="font-mono text-xs uppercase text-forge-leaf">
                {aspectFusion ? 'Supreme Mantra' : 'Supreme Mantra / Fusion Affirmation'}
              </p>
              <blockquote className="mt-1 rounded-lg border border-forge-leaf/30 bg-forge-leaf/5 p-3 italic leading-relaxed text-forge-leaf whitespace-pre-wrap">
                {detail.supremeMantra}
              </blockquote>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-xs"><span>Proficiency</span><span className="font-mono text-forge-cyan">{Math.round(detail.proficiency * 100)}%</span></div>
            <ProgressBar value={detail.proficiency} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs"><span>Potential</span><span className="font-mono text-forge-gold">{Math.round(detail.potential_score * 100)}%</span></div>
            <ProgressBar value={detail.potential_score} color="gold" />
          </div>
        </div>
        <p className="mt-3 text-sm text-forge-muted">{detail.comprehension}</p>
      </Panel>

      {showFacets && diamondFaces.length > 0 && (
      <Panel title="Diamond Radiant Faces" subtitle={`${diamondFaces.length} facets`}>
        <div className="space-y-3">
          {diamondFaces.map((f, idx) => {
            const highlighted = highlightFace === f.name;
            return (
              <div
                key={`${f.name}-${idx}`}
                className={`rounded-xl border p-3 ${
                  highlighted
                    ? 'border-forge-violet/50 bg-forge-violet/10 ring-1 ring-forge-violet/40'
                    : 'border-forge-cyan/20 bg-forge-cyan/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <EmojiText text={f.symbol} size="xl" nowrap />
                  <h4 className={`font-medium ${highlighted ? 'text-forge-violet' : 'text-forge-cyan'}`}>{f.name}</h4>
                </div>
                {f.explanation?.trim() ? (
                  <p className="mt-2 text-sm text-forge-muted">{f.explanation}</p>
                ) : null}
                <p className="mt-2 text-sm italic text-white/80">
                  <span className="font-mono text-[10px] uppercase not-italic text-forge-cyan/80">Self-Affirmation</span>
                  <span className="block mt-0.5">&ldquo;{f.mantra}&rdquo;</span>
                </p>
              </div>
            );
          })}
        </div>
      </Panel>
      )}

      {detail.masterFusion && !showFusionFirst && (
        <SynergyFusionPanel fusion={detail.masterFusion} />
      )}

      {alchemyFusions.length > 0 && (
        <Panel title="Alchemy Fusions" subtitle="Related fusion paths">
          <div className="space-y-2">
            {alchemyFusions.map((f) => (
              <div key={f.id} className="rounded-lg border border-forge-gold/25 bg-forge-gold/5 p-3 text-sm">
                <p className="font-medium text-forge-gold">{f.name}</p>
                <p className="mt-1 text-xs text-forge-muted">{f.inputs.join(' + ')} → {f.output_aspect}</p>
                <p className="mt-1 font-mono text-[10px] text-forge-ember">{f.operator}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {synergies.length > 0 && (
        <Panel title="Synergies" subtitle={`${synergies.length} linked`}>
          <div className="space-y-2">
            {synergies.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-forge-border p-2 text-xs">
                <span className="text-forge-cyan">{s.aspect_a}</span>
                <span className="text-forge-muted">+</span>
                <span className="text-forge-leaf">{s.aspect_b}</span>
                <span className="text-forge-muted">=</span>
                <strong className="text-forge-gold">{s.fusion_name}</strong>
                <span className="ml-auto font-mono text-forge-violet">{Math.round(s.strength * 100)}%</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Integration" subtitle={`Save ${integration.saveCodex}`}>
        <div className="space-y-2 text-sm">
          <p><span className="text-forge-muted">Operator:</span> <span className="font-mono text-forge-cyan">{integration.operator}</span></p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-forge-muted">Base Layer:</span>
            {integration.baseLayer.map((b) => {
              const entry = typeof b === 'string'
                ? { symbol: b, name: '' }
                : b;
              return (
                <span key={`${entry.symbol}-${entry.name}`} className="inline-flex items-center gap-1">
                  <EmojiText text={entry.symbol} size="sm" />
                  {entry.name ? <span className="text-white/90">{entry.name}</span> : null}
                </span>
              );
            })}
          </div>
          {integration.strengthens.length > 0 && (
            <div>
              <p className="text-forge-muted">Strengthens / pairs with:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {integration.strengthens.map((s, idx) => (
                  <span key={`${s}-${idx}`} className="rounded bg-forge-leaf/10 px-2 py-0.5 text-xs text-forge-leaf">{s}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-forge-muted">Evolution paths:</p>
            <ul className="mt-1 list-disc pl-5 text-forge-muted">
              {integration.evolution.map((e, idx) => <li key={`${e}-${idx}`}>{e}</li>)}
            </ul>
          </div>
        </div>
      </Panel>

      {relatedInsights.length > 0 && (
        <Panel title="Related Insights">
          {relatedInsights.map((i, idx) => (
            <div key={i.id ?? `${i.title}-${idx}`} className="mb-3 rounded-lg bg-white/5 p-3 text-sm">
              <p className="font-medium">{i.title}</p>
              <p className="mt-1 line-clamp-3 text-forge-muted">{i.body}</p>
            </div>
          ))}
        </Panel>
      )}

      {visualizations.length > 0 && (
        <Panel title="Visualizations">
          {visualizations.map((v) => (
            <div key={v.id} className="mb-2 text-sm">
              <p className="font-medium">{v.title}</p>
              <p className="text-xs text-forge-muted">{v.description}</p>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}