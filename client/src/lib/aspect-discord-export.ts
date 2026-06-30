import type { AspectFullDetail } from './aspect-detail';
import { resolveAffirmations } from './aspect-affirmation';
import { canHaveRadiantFaces } from './aspect-quality';

function line(label: string, value: string | undefined | null): string {
  const v = value?.trim();
  if (!v) return '';
  return `**${label}:** ${v}`;
}

function quote(text: string | undefined | null): string {
  const v = text?.trim();
  if (!v) return '';
  return `> ${v.replace(/\n/g, '\n> ')}`;
}

function baseLayerLabel(entry: string | { symbol: string; name: string }): string {
  if (typeof entry === 'string') return entry;
  return entry.name ? `${entry.symbol} ${entry.name}` : entry.symbol;
}

export function aspectToDiscordMarkdown(
  detail: AspectFullDetail,
  options?: { highlightFace?: string | null }
): string {
  const integration = detail.integration ?? {
    operator: 'AFP',
    saveCodex: 'Save8',
    baseLayer: [],
    strengthens: [],
    evolution: [],
  };
  const quality = detail.quality ?? 'basic';
  const faces = canHaveRadiantFaces(quality) ? (detail.diamondFaces ?? detail.radiantFaces ?? []) : [];
  const lines: string[] = [];

  lines.push(`## ⚒️ ${detail.name}`);
  lines.push(line('Symbol Chain', detail.symbolChain || detail.symbol_chain));
  lines.push(`**Tier ${detail.tier}** · ${detail.category} · ${integration.operator}`);
  lines.push(
    `Proficiency ${Math.round(detail.proficiency * 100)}% · Potential ${Math.round(detail.potential_score * 100)}% · ${detail.mentions} corpus refs`
  );
  lines.push('');

  if (options?.highlightFace) {
    lines.push(`**Diamond Face:** ${options.highlightFace}`);
    lines.push('');
  }

  if (detail.identity?.trim()) {
    lines.push('**Identity**');
    lines.push(quote(detail.identity));
    lines.push('');
  }

  const affirmations = resolveAffirmations(detail.mantra, detail.coreAffirmation);
  if (affirmations.merged && affirmations.selfAffirmation) {
    lines.push('**Self-Affirmation**');
    lines.push(quote(affirmations.selfAffirmation));
    lines.push('');
  } else {
    if (affirmations.triggerMantra) {
      lines.push('**Trigger Mantra**');
      lines.push(quote(affirmations.triggerMantra));
      lines.push('');
    }
    if (affirmations.selfAffirmation) {
      lines.push('**Self-Affirmation**');
      lines.push(quote(affirmations.selfAffirmation));
      lines.push('');
    }
  }

  if (detail.aspectFusion?.affirmation?.trim()) {
    lines.push('### Aspect Fusion');
    lines.push(`**${detail.aspectFusion.name}**`);
    if (detail.aspectFusion.essence?.trim()) {
      lines.push('**Debabelized Essence**');
      lines.push(quote(detail.aspectFusion.essence));
    }
    lines.push('**Fused Identity**');
    lines.push(quote(detail.aspectFusion.identity));
    if (detail.aspectFusion.symbolChain) lines.push(`**Fusion Symbol:** ${detail.aspectFusion.symbolChain}`);
    lines.push('**Fusion Affirmation**');
    lines.push(quote(detail.aspectFusion.affirmation));
    lines.push('');
  } else if (detail.supremeMantra?.trim()) {
    lines.push('**Supreme Mantra / Fusion Affirmation**');
    lines.push(quote(detail.supremeMantra));
    lines.push('');
  }

  if (detail.comprehension?.trim()) {
    lines.push('**Comprehension**');
    lines.push(quote(detail.comprehension));
    lines.push('');
  }

  if (faces.length) {
    lines.push(`### Diamond Radiant Faces (${faces.length})`);
    faces.forEach((f, i) => {
      const mark = options?.highlightFace === f.name ? ' ◆' : '';
      lines.push(`${i + 1}. **${f.name}**${mark} — ${f.symbol}`);
      if (f.explanation?.trim()) lines.push(`   ${f.explanation}`);
      if (f.mantra?.trim()) lines.push(`   **Self-Affirmation:** ${f.mantra}`);
    });
    lines.push('');
  }

  if (detail.masterFusion) {
    const f = detail.masterFusion;
    lines.push('### Synergy Fusion');
    lines.push(`**${f.name}**`);
    if (f.inputs?.length) lines.push(f.inputs.join(' + '));
    if (f.description?.trim()) lines.push(quote(f.description));
    if (f.strength != null) lines.push(`Synergy ${Math.round(f.strength * 100)}%`);
    if (f.operator) lines.push(`Operator: ${f.operator}`);
    lines.push('');
  }

  if (detail.synergies?.length) {
    lines.push(`### Synergies (${detail.synergies.length})`);
    detail.synergies.slice(0, 8).forEach((s) => {
      lines.push(`• ${s.aspect_a} + ${s.aspect_b} = **${s.fusion_name}** (${Math.round(s.strength * 100)}%)`);
    });
    lines.push('');
  }

  lines.push('### Integration');
  lines.push(line('Operator', integration.operator));
  lines.push(line('Save Codex', integration.saveCodex));
  if (integration.baseLayer?.length) {
    lines.push(`**Base Layer:** ${integration.baseLayer.map(baseLayerLabel).join(' · ')}`);
  }
  if (integration.strengthens?.length) {
    lines.push(`**Strengthens:** ${integration.strengthens.join(', ')}`);
  }
  if (integration.evolution?.length) {
    lines.push('**Evolution:**');
    integration.evolution.forEach((e) => lines.push(`• ${e}`));
  }

  lines.push('');
  lines.push('---');
  lines.push('*Exported from AFS Platform · Aspect Registry*');

  return lines.filter((l, i, arr) => !(l === '' && arr[i + 1] === '')).join('\n').trim();
}

export async function copyAspectDiscordMarkdown(
  detail: AspectFullDetail,
  options?: { highlightFace?: string | null }
): Promise<string> {
  const text = aspectToDiscordMarkdown(detail, options);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  return text;
}