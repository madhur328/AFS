import type { AspectFullDetail, RadiantFace } from './aspect-detail';
import { mergedSelfAffirmation, affirmationsAreSeparate } from './aspect-affirmation';
import { showsFacetEditor } from './aspect-quality';
import { tierFromPotential } from './tiers';

export interface AspectFormData {
  name: string;
  symbol_chain: string;
  mantra: string;
  tier: string;
  category: string;
  comprehension: string;
  proficiency: number;
  potential_score: number;
  mentions: number;
  base_layer_link: string;
  identity: string;
  coreAffirmation: string;
  supremeMantra: string;
  radiantFaces: RadiantFace[];
  integration: {
    operator: string;
    saveCodex: string;
    baseLayer: string[];
    strengthens: string[];
    evolution: string[];
  };
}

export const ASPECT_CATEGORIES = ['forged', 'red-leaf', 'meta'] as const;
export const ASPECT_TIERS = ['S', 'A', 'B', 'C', 'D'] as const;
export const ASPECT_OPERATORS = ['AFP', 'EOT', 'DCS', 'RCS', 'RDTQ', 'DKR', 'DFR'] as const;
export const SAVE_CODEX = ['Save8', 'Save2', 'Save1', 'Save6', 'Save0'] as const;
export {
  BASE_LAYER_SLOTS,
  BASE_LAYER_SYMBOLS,
  BASE_LAYER_LABEL,
  baseLayerDisplay,
} from './base-layer';

export function emptyAspectForm(): AspectFormData {
  return {
    name: '',
    symbol_chain: '🍁⚒️💎',
    mantra: '',
    tier: 'B',
    category: 'forged',
    comprehension: '',
    proficiency: 0.3,
    potential_score: 0.5,
    mentions: 0,
    base_layer_link: '🔥',
    identity: '',
    coreAffirmation: '',
    supremeMantra: '',
    radiantFaces: [
      { name: 'Raw Ore Witness', symbol: '🍁🪨', mantra: 'I name what I feel without judgment.' },
      { name: 'Ascent Vector', symbol: '🍁🐉', mantra: 'I rise through understanding, not escape.' },
      { name: 'Diamond Facet', symbol: '🍁💎', mantra: 'This facet seals into my codex.' },
    ],
    integration: {
      operator: 'AFP',
      saveCodex: 'Save8',
      baseLayer: ['🛡️🌱 Unwavering Heart'],
      strengthens: [],
      evolution: ['→ higher synthesis via DCS'],
    },
  };
}

export function detailToForm(d: AspectFullDetail): AspectFormData {
  const integration = d.integration ?? {
    operator: 'AFP',
    saveCodex: 'Save8',
    baseLayer: ['🛡️🌱 Unwavering Heart'],
    strengthens: [],
    evolution: [],
  };
  const separate = affirmationsAreSeparate(d.mantra, d.coreAffirmation);
  return {
    name: d.name,
    symbol_chain: d.symbol_chain || d.symbolChain || '🍁⚒️💎',
    mantra: separate ? d.mantra || '' : '',
    tier: tierFromPotential(d.potential_score),
    category: d.category,
    comprehension: d.comprehension || '',
    proficiency: d.proficiency,
    potential_score: d.potential_score,
    mentions: d.mentions,
    base_layer_link: d.base_layer_link || '🔥',
    identity: d.identity || '',
    coreAffirmation: separate
      ? d.coreAffirmation || ''
      : mergedSelfAffirmation(d.mantra, d.coreAffirmation),
    supremeMantra: d.supremeMantra || '',
    radiantFaces: (d.radiantFaces ?? d.diamondFaces ?? []).map((f) => ({
      name: f.name,
      symbol: f.symbol,
      mantra: f.mantra,
      explanation: f.explanation || '',
    })),
    integration: {
      operator: integration.operator,
      saveCodex: integration.saveCodex,
      baseLayer: integration.baseLayer.map((b) => (typeof b === 'string' ? b : b.name || b.symbol)),
      strengthens: [...integration.strengthens],
      evolution: [...integration.evolution],
    },
  };
}

export function formToPayload(form: AspectFormData) {
  const tier = tierFromPotential(form.potential_score);
  const separate = Boolean(form.mantra.trim());
  const selfAffirmation = form.coreAffirmation.trim();
  return {
    name: form.name.trim(),
    symbol_chain: form.symbol_chain,
    mantra: separate ? form.mantra.trim() : null,
    tier,
    category: form.category,
    comprehension: form.comprehension || `Manual aspect — ${form.name.trim()}`,
    proficiency: form.proficiency,
    potential_score: form.potential_score,
    mentions: form.mentions,
    base_layer_link: form.base_layer_link || null,
    identity: form.identity,
    coreAffirmation: selfAffirmation || null,
    supremeMantra: form.supremeMantra,
    radiantFaces: showsFacetEditor(form.integration.operator)
      ? form.radiantFaces.filter((f) => f.name.trim())
      : [],
    integration: form.integration,
  };
}