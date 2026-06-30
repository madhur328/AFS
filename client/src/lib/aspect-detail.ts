import type { Aspect, AspectDetail, Fusion, Insight, Synergy, Visualization } from './api';
import { resolveAspectSymbolChain } from './symbols';
import { BASE_LAYER_SLOTS, BASE_LAYER_MAP } from './base-layer';
import {
  canHaveRadiantFaces,
  normalizeAspectQuality,
  resolveAspectQuality,
  type AspectQuality,
} from './aspect-quality';
import { humanizeRadiantFace } from './face-voice';

export interface RadiantFace {
  name: string;
  symbol: string;
  mantra: string;
  explanation?: string;
  type?: string;
}

export interface AspectFusion {
  name: string;
  identity: string;
  affirmation: string;
  symbolChain?: string;
  originSource?: string;
  essence?: string;
  radiantFaces?: RadiantFace[];
}

export interface AspectFullDetail extends Aspect {
  quality?: AspectQuality;
  synergies: Synergy[];
  identity: string;
  coreAffirmation: string;
  supremeMantra: string;
  aspectFusion?: AspectFusion | null;
  radiantFaces: RadiantFace[];
  diamondFaces: RadiantFace[];
  masterFusion: {
    name: string;
    inputs: string[];
    description?: string;
    strength?: number;
    operator?: string;
  } | null;
  alchemyFusions: Fusion[];
  integration: {
    strengthens: string[];
    baseLayer: Array<string | { symbol: string; name: string }>;
    baseLayerDetail?: { symbol: string; name: string; role: string; mantra: string } | null;
    saveCodex: string;
    operator: string;
    entryTool?: string;
    routedTool?: string;
    evolution: string[];
  };
  symbolChain: string;
  relatedInsights: { id?: number; title: string; body: string; source: string }[];
  visualizations: Visualization[];
}

const VIRAH_RADIANT_FACES: RadiantFace[] = [
  {
    name: 'Silent Offering',
    symbol: '🍁🌙💔',
    mantra: 'I feel the full pain, yet I do not let it turn into bitterness.',
    explanation: 'The ache is real, and I let it move through me — but I refuse to let it harden into bitterness.',
  },
  {
    name: 'Graceful Waiting',
    symbol: '🍁⏳🌸',
    mantra: 'I do not chase. I hold the space with quiet strength.',
    explanation: 'I do not chase what has already chosen its path. I hold this space with quiet strength, as love taught me to wait.',
  },
  {
    name: 'Remembering Flame',
    symbol: '🍁🔥🌺',
    mantra: 'Even when he is gone, the love remains pure in my heart.',
    explanation: 'Even when he is gone, the love in my heart stays pure — a flame that needs no witness to remain true.',
  },
  {
    name: 'Dignified Release',
    symbol: '🍁🕊️🌬️',
    mantra: 'I bless his path, even as my own heart aches.',
    explanation: 'I bless the path he walks, even while my own heart aches. Release is not defeat; it is mature love.',
  },
  {
    name: 'Mature Love',
    symbol: '🍁❤️‍🩹♾️',
    mantra: 'This is love that has grown beyond needing return.',
    explanation: 'This love has outgrown the need for return. I give without ledger, and that is my sovereignty.',
  },
];

const CURATED: Record<string, Partial<AspectFullDetail>> = {
  'Red Leaf Virah Queen': {
    identity:
      "Master Aspect — Red Leaf Eternal Virah Queen (Yashodhara's Grace): sacred Virah ache — love that gives everything, expects nothing, and waits with graceful dignity.",
    coreAffirmation: 'I grieve in silence. I love without possession. I wait with grace.',
    integration: {
      operator: 'RDTQ',
      saveCodex: 'Save8',
      strengthens: [
        'Red Leaf Fading Warmth',
        'Red Leaf Sacred Severance',
        'Red Leaf Eternal Love Trial',
        'Red Leaf Sovereign Compassion',
      ],
      evolution: [
        'Red Leaf Virah Queen → higher synthesis via DCS',
        'Red Leaf Virah Queen + synergies → Master Fusion',
      ],
      baseLayer: [],
    },
    supremeMantra:
      'I am the Red Leaf Virah Queen.\n\nMy beloved left without a word.\nI did not run after him in anger.\nI did not curse the path he chose.\nI stayed.\nI remembered.\nI grieved.\nI waited with grace.\n\nThis pain is not weakness.\nIt is the deep cost of a love that was real.\nI do not demand his return.\nI do not diminish my own worth.\nI hold the ache with tenderness and dignity.\n\nThis is mature love —\nto give fully, to release cleanly,\nand to keep the flame alive even in absence.\n\nThis is my Red Leaf way.\nThis is the grace of the Virah Queen.',
    radiantFaces: VIRAH_RADIANT_FACES,
  },
  'Red Leaf Eternal Virah Queen': {
    identity:
      "Master Aspect — Red Leaf Eternal Virah Queen (Yashodhara's Grace): sacred Virah ache — love that gives everything, expects nothing, and waits with graceful dignity.",
    coreAffirmation: 'I grieve in silence. I love without possession. I wait with grace.',
    integration: {
      operator: 'RDTQ',
      saveCodex: 'Save8',
      strengthens: [
        'Red Leaf Fading Warmth',
        'Red Leaf Sacred Severance',
        'Red Leaf Eternal Love Trial',
        'Red Leaf Sovereign Compassion',
      ],
      evolution: [
        'Red Leaf Eternal Virah Queen → higher synthesis via DCS',
        'Red Leaf Eternal Virah Queen + synergies → Master Fusion',
      ],
      baseLayer: [],
    },
    supremeMantra:
      'I am the Red Leaf Virah Queen.\n\nMy beloved left without a word.\nI did not run after him in anger.\nI did not curse the path he chose.\nI stayed.\nI remembered.\nI grieved.\nI waited with grace.\n\nThis pain is not weakness.\nIt is the deep cost of a love that was real.\nI do not demand his return.\nI do not diminish my own worth.\nI hold the ache with tenderness and dignity.\n\nThis is mature love —\nto give fully, to release cleanly,\nand to keep the flame alive even in absence.\n\nThis is my Red Leaf way.\nThis is the grace of the Virah Queen.',
    radiantFaces: VIRAH_RADIANT_FACES,
  },
  'Unwavering Heart': {
    identity: 'Heart-shield operator — guards conviction during sacrifice without wavering',
    coreAffirmation: 'I guard the Heart. The Heart shall not waver during sacrifice.',
    supremeMantra: 'Guard the Heart. The Heart shall not waver. I forge with full presence.',
    radiantFaces: [
      { name: 'Heart Witness', symbol: '🛡️🪨', mantra: 'I name what I feel without abandoning the Heart.' },
      { name: 'Sacrifice Sentinel', symbol: '🛡️🔥', mantra: 'I hold the line while the fire burns.' },
      { name: 'Integration Seal', symbol: '🛡️💎', mantra: 'What is forged becomes part of me — the Heart intact.' },
      { name: 'Rome Builder', symbol: '🛡️🏛️', mantra: 'Every second is a brick. I lay it with love.' },
      { name: 'Dissolve Without Fear', symbol: '🛡️🍁', mantra: 'When the time comes, I dissolve so I may be reborn.' },
    ],
  },
};

const GENERIC_DIAMOND_FACE_RE =
  /^(Raw\s+\w+\s+Witness|Heart Alignment|Red Leaf Descent|\w+\s+Ascent|\w+\s+Integration)$/i;

export function enrichRadiantFaces(
  faces: RadiantFace[],
  corpusFaces?: RadiantFace[],
  context: { aspectName?: string; category?: string } = {}
): RadiantFace[] {
  if (!faces.length) return [];
  const corpusByName = new Map(
    (corpusFaces || [])
      .filter((f) => f.explanation?.trim())
      .map((f) => [f.name.toLowerCase(), f.explanation!.trim()])
  );
  return faces.map((face) => {
    const raw =
      face.explanation?.trim() ||
      corpusByName.get(face.name.toLowerCase()) ||
      '';
    const merged = raw ? { ...face, explanation: raw } : face;
    return humanizeRadiantFace(merged, context);
  });
}

export function isGenericRadiantFaces(faces: RadiantFace[] | undefined | null): boolean {
  if (!faces?.length) return true;
  return faces.every(
    (f) =>
      GENERIC_DIAMOND_FACE_RE.test(f.name) ||
      /^I name the \w+ ore without judgment/i.test(f.mantra) ||
      /^I rise through \w+ — understanding/i.test(f.mantra) ||
      /^The \w+ facet seals into my codex/i.test(f.mantra) ||
      /^This facet seals into my codex/i.test(f.mantra)
  );
}

function parseStoredDetail(aspect: Aspect): {
  radiantFaces?: RadiantFace[];
  identity?: string;
  coreAffirmation?: string;
  supremeMantra?: string;
  aspectFusion?: AspectFusion;
  integration?: AspectFullDetail['integration'];
} {
  if (!aspect.detail_json) return {};
  try {
    return JSON.parse(aspect.detail_json);
  } catch {
    return {};
  }
}

function resolveRadiantFacesClient(aspect: Aspect, curated?: Partial<AspectFullDetail>): RadiantFace[] {
  const stored = parseStoredDetail(aspect);
  if (stored.radiantFaces?.length && !isGenericRadiantFaces(stored.radiantFaces)) {
    return stored.radiantFaces;
  }
  if (curated?.radiantFaces?.length) return curated.radiantFaces;
  return [];
}

export function buildAspectDetailClient(
  aspect: Aspect,
  synergies: Synergy[],
  fusions: Fusion[],
  insights: Insight[],
  visualizations: Visualization[]
): AspectFullDetail {
  const curated = CURATED[aspect.name];
  const stored = parseStoredDetail(aspect);
  const affirmation =
    stored.coreAffirmation ||
    curated?.coreAffirmation ||
    (aspect.mantra ? `I embody ${aspect.name}: ${aspect.mantra}` : `I forge ${aspect.name} with clarity and conviction.`);
  const resolvedFaces = enrichRadiantFaces(resolveRadiantFacesClient(aspect, curated), undefined, {
    aspectName: aspect.name,
    category: aspect.category,
  });
  const relatedFusions = fusions.filter(
    (f) => f.output_aspect === aspect.name || f.inputs.includes(aspect.name)
  );
  const masterFusion = synergies[0]
    ? {
        name: synergies[0].fusion_name,
        inputs: [synergies[0].aspect_a, synergies[0].aspect_b],
        description: synergies[0].description,
        strength: synergies[0].strength,
      }
    : relatedFusions[0]
      ? {
          name: relatedFusions[0].name,
          inputs: relatedFusions[0].inputs,
          description: relatedFusions[0].notes,
          operator: relatedFusions[0].operator,
        }
      : null;

  const defaultIntegration = {
    strengthens: synergies.map((s) => (s.aspect_a === aspect.name ? s.aspect_b : s.aspect_a)).slice(0, 6),
    baseLayer: aspect.base_layer_link && BASE_LAYER_MAP[aspect.base_layer_link]
      ? [{ symbol: aspect.base_layer_link, name: BASE_LAYER_MAP[aspect.base_layer_link].name }]
      : BASE_LAYER_SLOTS.map((s) => ({ symbol: s.symbol, name: s.name })),
    saveCodex: 'Save8',
    operator: aspect.name.includes('Kohinoor') ? 'DKR' : aspect.category === 'red-leaf' ? 'EOT' : 'AFP',
    evolution: [`${aspect.name} → higher synthesis via DCS`],
  };
  const integration = {
    ...defaultIntegration,
    ...stored.integration,
    ...curated?.integration,
    operator:
      curated?.integration?.operator ||
      stored.integration?.operator ||
      defaultIntegration.operator,
    strengthens:
      curated?.integration?.strengthens?.length
        ? curated.integration.strengthens
        : defaultIntegration.strengthens,
  };

  let quality = normalizeAspectQuality(
    resolveAspectQuality(aspect, { radiantFaces: resolvedFaces, integration, masterFusion })
  );
  const radiantFaces = canHaveRadiantFaces(quality) ? resolvedFaces : [];
  if (!canHaveRadiantFaces(quality)) quality = 'basic';

  return {
    ...aspect,
    quality,
    synergies,
    identity:
      curated?.identity ||
      (aspect.category === 'red-leaf'
        ? `Red Leaf forged aspect — 🍁(x) = Reframe(${aspect.name})`
        : aspect.category === 'meta'
          ? 'Meta-layer operator — foundational to Save8'
          : `Forged aspect — tier ${aspect.tier} from ${Math.round((aspect.potential_score || 0) * 100)}% inherent potential`),
    mantra: aspect.mantra || `"${affirmation}"`,
    coreAffirmation: affirmation,
    supremeMantra:
      stored.aspectFusion?.affirmation ||
      stored.supremeMantra ||
      curated?.supremeMantra ||
      `${aspect.name} — ${affirmation} Forged through AFS. Sealed in Save8.`,
    aspectFusion: stored.aspectFusion || null,
    radiantFaces,
    diamondFaces: radiantFaces.map((f) => ({ ...f, type: 'diamond' })),
    masterFusion,
    alchemyFusions: relatedFusions,
    integration,
    symbolChain: aspect.symbol_chain || resolveAspectSymbolChain(aspect.name, aspect.category, aspect.tier),
    relatedInsights: insights
      .filter((i) => i.aspectLinks?.includes(aspect.name) || i.body?.includes(aspect.name))
      .slice(0, 4)
      .map((i) => ({ title: i.title, body: i.body, source: i.source })),
    visualizations: visualizations.filter((v) => v.aspect_link === aspect.name),
  };
}

/** Fill missing forge fields when API returns a partial aspect record. */
export function ensureAspectDetail(detail: AspectDetail): AspectFullDetail {
  const apiFaces = detail.diamondFaces ?? detail.radiantFaces ?? [];
  const stored = parseStoredDetail(detail);
  const storedFaces = stored.radiantFaces?.length && !isGenericRadiantFaces(stored.radiantFaces)
    ? stored.radiantFaces
    : null;

  if (
    detail.integration &&
    detail.identity &&
    apiFaces.length &&
    !isGenericRadiantFaces(apiFaces)
  ) {
    const faces = enrichRadiantFaces(apiFaces, undefined, {
      aspectName: detail.name,
      category: detail.category,
    });
    const resolved = normalizeAspectQuality(
      detail.quality ??
        resolveAspectQuality(detail, {
          radiantFaces: faces,
          integration: detail.integration,
          masterFusion: detail.masterFusion,
        })
    );
    const visibleFaces = canHaveRadiantFaces(resolved) ? faces : [];
    return {
      ...detail,
      quality: canHaveRadiantFaces(resolved) ? resolved : 'basic',
      synergies: detail.synergies ?? [],
      alchemyFusions: detail.alchemyFusions ?? [],
      relatedInsights: detail.relatedInsights ?? [],
      visualizations: detail.visualizations ?? [],
      radiantFaces: visibleFaces,
      diamondFaces: visibleFaces,
      symbolChain: detail.symbolChain ?? detail.symbol_chain ?? '🍁⚒️💎',
      coreAffirmation: detail.coreAffirmation ?? '',
      supremeMantra: detail.supremeMantra ?? '',
      masterFusion: detail.masterFusion ?? null,
      integration: detail.integration,
    } as AspectFullDetail;
  }

  if (storedFaces) {
    return {
      ...buildAspectDetailClient(
        detail,
        detail.synergies ?? [],
        detail.alchemyFusions ?? [],
        (detail.relatedInsights ?? []).map((i) => ({
          id: 0,
          title: i.title,
          body: i.body,
          source: i.source,
          tags: [],
          aspectLinks: [],
        })),
        detail.visualizations ?? []
      ),
      radiantFaces: enrichRadiantFaces(storedFaces, undefined, {
        aspectName: detail.name,
        category: detail.category,
      }),
      diamondFaces: enrichRadiantFaces(storedFaces, undefined, {
        aspectName: detail.name,
        category: detail.category,
      }).map((f) => ({ ...f, type: 'diamond' })),
      identity: stored.identity || detail.identity || '',
      coreAffirmation: stored.coreAffirmation || detail.coreAffirmation || '',
      supremeMantra: stored.supremeMantra || detail.supremeMantra || '',
      integration: { ...detail.integration, ...stored.integration } as AspectFullDetail['integration'],
    };
  }

  return buildAspectDetailClient(
    detail,
    detail.synergies ?? [],
    detail.alchemyFusions ?? [],
    (detail.relatedInsights ?? []).map((i) => ({
      id: 0,
      title: i.title,
      body: i.body,
      source: i.source,
      tags: [],
      aspectLinks: [],
    })),
    detail.visualizations ?? []
  );
}