const { v4: uuid } = require('uuid');
const { tierFromPotential, potentialFromMentions } = require('./tiers');

const OPERATORS = {
  EOT: {
    name: 'Emotional Ore Transmutation',
    steps: ['Capture raw emotional charge', 'Honor uniqueness', 'Extract ore nodes', 'Transmute to Aspect fuel', 'Integrate into codex'],
  },
  DCS: {
    name: 'Diamond Chrysalis Synthesis',
    steps: ['Dissolve old form', 'Pressure crystallization', 'Facet radiant faces', 'Seal Master Aspect'],
  },
  RDTQ: {
    name: 'Resonant Deep Thought Query',
    steps: ['Pose resonant question', 'Drill through layers', 'Extract invariant', 'Query synergies', 'Return actionable insight'],
  },
  AFP: {
    name: 'Aspect Forge Protocol',
    steps: ['Load ore + context', 'Simulate operator chain', 'Score synergies', 'Project evolution paths', 'Emit forge artifact'],
  },
  KOT: { name: 'Kenotic Ore Transmutation', steps: ['Empty attachment', 'Receive void ore', 'Transmute through kenosis', 'Integrate'] },
  RCS: { name: 'Resonant Chrysalis Synthesis', steps: ['Find resonance frequency', 'Chrysalis wrap', 'Harmonic fusion', 'Seal'] },
};

function extractKeywords(text) {
  const words = text.toLowerCase().match(/[a-z]{4,}/g) || [];
  return [...new Set(words)].slice(0, 8);
}

function generateAspectName(ore, operator) {
  const keywords = extractKeywords(ore);
  const seed = keywords[0] || 'ember';
  const caps = seed.charAt(0).toUpperCase() + seed.slice(1);
  if (operator === 'EOT' || operator === 'DCS') return `Red Leaf ${caps} Forge`;
  return `${caps} Aspect`;
}

function runForge(protocol, ore, context = {}, existingAspects = []) {
  const op = OPERATORS[protocol] || OPERATORS.AFP;
  const aspectName = generateAspectName(ore, protocol);
  const existing = existingAspects.find((a) => a.name === aspectName);
  const potential = existing?.potential_score ?? 0.5;
  const isBase = Boolean(existing?.is_base_layer);

  const synergies = existingAspects
    .filter((a) => {
      const oreWords = extractKeywords(ore);
      const nameWords = a.name.toLowerCase().split(/\s+/);
      return oreWords.some((w) => nameWords.some((n) => n.includes(w) || w.includes(n)));
    })
    .slice(0, 4)
    .map((a) => ({ name: a.name, strength: 0.6 + Math.random() * 0.3 }));

  const result = {
    sessionId: uuid(),
    protocol,
    operatorName: op.name,
    stepsCompleted: op.steps,
    masterAspect: {
      name: aspectName,
      symbolChain: protocol === 'DKR' ? '🍁💎🐉♾️' : '🍁⚒️🔥🪞',
      mantra: `"I transmute what I feel into what I forge."`,
      affirmation: `I honor the ore. I forge ${aspectName} with clarity and conviction.`,
      tier: tierFromPotential(potential, isBase),
      potential,
    },
    radiantFaces: [
      { name: 'Raw Ore Witness', symbol: '🪨', mantra: 'I name what I feel without judgment.' },
      { name: 'Ascent Vector', symbol: '🐉', mantra: 'I rise through understanding, not escape.' },
      { name: 'Integration Seal', symbol: '💎', mantra: 'What is forged becomes part of me.' },
    ],
    synergies: synergies.length ? synergies : [
      { name: 'Unwavering Heart', strength: 0.85 },
      { name: 'Reality Anchor', strength: 0.72 },
    ],
    integration: {
      baseLayer: require('../base-layer').getBaseLayerIntegrationList(),
      saveCodex: 'Save8',
      evolution: [`${aspectName} → higher synthesis via DCS`],
    },
    insight: `Ore processed through ${op.name}. Core invariant: ${extractKeywords(ore).join(', ') || 'conviction'}.`,
    context,
  };

  return result;
}

function runDailyRun(type, notes, ore = '') {
  const templates = {
    DFR: {
      title: 'Daily Forge Run',
      phases: ['Morning anchor check', 'Ore selection', 'Single operator pass', 'Integration note', 'Evening seal'],
      mantra: 'Every second is a brick. I lay it with full presence.',
    },
    DKR: {
      title: 'Daily Kohinoor Run — Resonant Kohinoor Drill',
      phases: ['Heaven-penetrating focus', 'Drill insight layer', 'Extract diamond facet', 'Resonant seal'],
      mantra: 'I drill through the heavens with the Kohinoor of my focused soul.',
    },
  };
  const t = templates[type] || templates.DFR;
  return {
    runType: type,
    title: t.title,
    phases: t.phases,
    mantra: t.mantra,
    notes,
    oreInput: ore,
    completedPhases: t.phases.length,
    insight: ore
      ? `DKR/DFR complete. Resonance detected in: ${extractKeywords(ore).join(', ')}`
      : 'Run sealed. Forge state updated.',
  };
}

module.exports = {
  OPERATORS,
  runForge,
  runDailyRun,
  generateAspectName,
};