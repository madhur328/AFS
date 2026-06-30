/**
 * Discover aspect synergies from Grok origin, codex, CURATED strengthens, and AFP formulas.
 */
const { canonicalAspectName } = require('./aspect-discover');
const { GROK_SYMBOL_ALIASES } = require('./grok-extract');
const { ASPECT_ALIASES } = require('./symbols');
const { CURATED } = require('./aspect-detail');

const EMOJI_RUN = /(?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)/gu;

const SYMBOL_TO_ASPECT = {
  '⚓': 'Anchor of Stability',
  '🔥': 'Fire of Conviction',
  '🔑': 'Key of Clarity',
  '🌪️': 'Tornado of Momentum',
  '🔗': 'Chain of Synchronisation',
  '🧬': 'Helix of Adaptability',
  '🌱': 'Sprout of Nurturing',
  '🚂': 'Engine of Efficiency',
  '🪽': 'Wings of Ambition',
  '🪞': 'Mirror of Truth',
  '🛡️': 'Mind Guardian',
  '💎': 'Kohinoor Forge Run',
  '🍁': 'Red Leaf Dual Acceptance',
};

/** Canonical seed synergies from genesis codex */
const CORE_SYNERGIES = [
  ['Unwavering Heart', 'Fire of Conviction', 'Sovereign Flameheart', 'Heart contains flame without wavering', 0.92],
  ['Reality Anchor', 'Mind Guardian', 'Grounded Sentinel', 'Dissociation shield + mental defense', 0.9],
  ['Red Leaf Dual Acceptance', 'Red Leaf Eternal Rome', 'Patient Rome Builder', 'Accept shadow while building Rome', 0.88],
  ['Kohinoor Forge Run', 'ConceptualCartographer', 'Heaven-Penetrating Map', 'Drill + topological learning', 0.9],
  ['Empty Mirror', 'Red Leaf Empty Mirror', 'Twin Reflection', 'Safety net for deep forge work', 0.87],
  ['Feedback Weaver', 'Reality Anchor', 'Stable Loop Designer', 'Wiener-inspired systemic stability', 0.86],
  ['Unwavering Heart', 'Reality Anchor', 'Grounded Heart', 'Heart holds while anchor labels reality', 0.85],
  ['ConvictionFire', 'Unwavering Heart', 'Sovereign Flameheart', 'Fire of Conviction embodied in Heart', 0.88],
  ['Anchor of Stability', 'Fire of Conviction', 'Stability-Conviction Core', 'Base Layer anchor + fire', 0.84],
  ['Tornado of Momentum', 'Engine of Efficiency', 'Momentum Engine', 'Volume work + process upgrade', 0.82],
  ['Sprout of Nurturing', 'Fire of Conviction', 'Nurtured Flame', 'Purity fuels conviction', 0.8],
  ['Wings of Ambition', 'Fire of Conviction', 'Ambition Vector', 'Conviction + ambition → tornado vector', 0.81],
  ['Anchor of Stability', 'Mirror of Truth', 'Inner Mirror', 'Inner anchor yields mirror of truth', 0.79],
];

function stripEmojis(text) {
  return (text || '').replace(EMOJI_RUN, '').replace(/\s+/g, ' ').trim();
}

function normalizeName(raw) {
  if (!raw) return null;
  let n = stripEmojis(raw)
    .replace(/\*\*/g, '')
    .replace(/\s*\|\s*$/g, '')
    .replace(/\?$/g, '')
    .replace(/\s*\([^)]{0,60}\)\s*$/g, '')
    .trim();
  if (!n || n.length < 3) return null;
  const aliases = { ...GROK_SYMBOL_ALIASES, ...ASPECT_ALIASES };
  if (aliases[n]) n = aliases[n];
  return canonicalAspectName(n);
}

function buildAspectIndex(aspectNames) {
  const set = new Set(aspectNames);
  const byLower = new Map();
  const byToken = new Map();

  for (const name of aspectNames) {
    byLower.set(name.toLowerCase(), name);
    const key = name.toLowerCase().replace(/^red leaf /, '');
    if (!byToken.has(key) || name.length < byToken.get(key).length) {
      byToken.set(key, name);
    }
  }

  return { set, byLower, byToken, names: aspectNames };
}

function resolveToDb(name, index) {
  const n = normalizeName(name);
  if (!n) return null;
  if (index.set.has(n)) return n;

  const aliases = { ...GROK_SYMBOL_ALIASES, ...ASPECT_ALIASES };
  const alias = aliases[n];
  if (alias && index.set.has(alias)) return alias;

  const lower = n.toLowerCase();
  if (index.byLower.has(lower)) return index.byLower.get(lower);

  const withoutRl = lower.replace(/^red leaf /, '');
  if (index.byToken.has(withoutRl)) return index.byToken.get(withoutRl);

  // Best partial match (longest name contained)
  let best = null;
  for (const candidate of index.names) {
    const cLow = candidate.toLowerCase();
    if (cLow.includes(lower) || lower.includes(cLow)) {
      if (!best || candidate.length > best.length) best = candidate;
    }
  }
  if (best && (lower.length >= 8 || best.toLowerCase().startsWith(lower))) return best;

  return null;
}

function pairKey(a, b) {
  return [a, b].sort().join('\0');
}

function addSynergy(map, { aspectA, aspectB, fusionName, description, strength, source }) {
  const a = aspectA;
  const b = aspectB;
  if (!a || !b || a === b) return false;

  const key = pairKey(a, b);
  const entry = {
    aspect_a: a,
    aspect_b: b,
    fusion_name: fusionName || `${a} + ${b}`,
    description: (description || '').slice(0, 500),
    strength: Math.min(0.99, Math.max(0.5, strength)),
    source,
  };

  const prev = map.get(key);
  if (!prev || entry.strength > prev.strength) {
    map.set(key, entry);
    return true;
  }
  return false;
}

function parsePlusSynergyLines(text, index, map, source, baseStrength) {
  if (!text) return 0;
  let added = 0;

  const sectionRe = /Strong Synerg(?:y|ies)[^:\n]*:([\s\S]*?)(?=\n\n|Recommended Master Fusion|Master Fusion:|Step \d|Would you like|✅|$)/gi;
  let section;
  while ((section = sectionRe.exec(text)) !== null) {
    added += parseStrongSynergyBlock(section[1], index, map, baseStrength, source);
  }

  // Inline "A + B = C" outside sections (Save-era fusions)
  const inlineRe = /(?:^|\n)(Red Leaf [^\n+]{2,80}|[A-Z][^\n+]{2,60})\s*\+\s*(Red Leaf [^\n+]{2,80}|[A-Z][^\n+]{2,60})\s*[=→]\s*([^\n]{8,200})/gim;
  let m;
  while ((m = inlineRe.exec(text)) !== null) {
    const a = resolveToDb(m[1], index);
    const b = resolveToDb(m[2], index);
    if (!a || !b) continue;
    const desc = stripEmojis(m[3]);
    if (/^(Phase|Step|Year|Day|Week|Month)\b/i.test(desc)) continue;
    if (addSynergy(map, {
      aspectA: a,
      aspectB: b,
      fusionName: desc.slice(0, 80),
      description: desc,
      strength: baseStrength - 0.05,
      source,
    })) added += 1;
  }

  return added;
}

function parseStrongSynergyBlock(block, index, map, baseStrength, source) {
  let added = 0;
  const lineRe = /^([^\n+→=]{3,120})\s*\+\s*([^\n+→=]{3,120})\s*[=→]\s*([^\n]+)/gim;
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    const a = resolveToDb(m[1], index);
    const b = resolveToDb(m[2], index);
    const desc = stripEmojis(m[3]);
    if (addSynergy(map, {
      aspectA: a,
      aspectB: b,
      fusionName: desc.split(/[.—]/)[0].trim().slice(0, 80),
      description: desc,
      strength: baseStrength,
      source,
    })) added += 1;
  }
  return added;
}

function parseMasterFusionInputs(text, index, map) {
  if (!text) return 0;
  let added = 0;

  // Save-era format: Master Fusion (Add to Save5):\n\n{Name}\nSymbol:
  const blockRe = /Master Fusion[^\n]*\n+\s*([^\n]+)\s*\n+Symbol:/gi;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const output = resolveToDb(m[1], index);
    if (!output) continue;
    const lookback = text.slice(Math.max(0, m.index - 2500), m.index);
    const synSection = lookback.match(/Strong Synerg(?:y|ies)[^:\n]*:([\s\S]*)$/i);
    if (synSection) {
      added += parseStrongSynergyBlock(synSection[1], index, map, 0.87, 'master-fusion');
      // Link each mentioned aspect to fusion output
      const names = [...synSection[1].matchAll(/^([^\n+→=]{3,120})\s*\+\s*([^\n+→=]{3,120})/gim)];
      const linked = new Set();
      for (const hit of names) {
        for (const part of [hit[1], hit[2]]) {
          const resolved = resolveToDb(part, index);
          if (!resolved || resolved === output || linked.has(resolved)) continue;
          linked.add(resolved);
          if (addSynergy(map, {
            aspectA: resolved,
            aspectB: output,
            fusionName: output,
            description: `Strong Synergy feeds Master Fusion → ${output}`,
            strength: 0.85,
            source: 'master-fusion',
          })) added += 1;
        }
      }
    }

    const used = lookback.match(/Aspects? Used:\s*([^\n]+)/i);
    if (used) {
      const parts = used[1].split(/\s*\+\s*/).map((p) => resolveToDb(p, index)).filter(Boolean);
      for (let i = 0; i < parts.length; i += 1) {
        for (let j = i + 1; j < parts.length; j += 1) {
          if (addSynergy(map, {
            aspectA: parts[i],
            aspectB: parts[j],
            fusionName: output,
            description: `Aspects Used → ${output}`,
            strength: 0.88,
            source: 'master-fusion',
          })) added += 1;
        }
      }
    }
  }

  // DCS format: Master Fusion: Name + Ultimate Symbol
  const fusionRe = /Master Fusion:?\s*([^\n]+)\s*\n+Ultimate Symbol:[^\n]*/gi;
  while ((m = fusionRe.exec(text)) !== null) {
    const output = resolveToDb(m[1], index);
    if (!output) continue;
    const lookback = text.slice(Math.max(0, m.index - 2000), m.index);
    const synSection = lookback.match(/Strong Synerg(?:y|ies)[^:\n]*:([\s\S]*)$/i);
    if (synSection) added += parseStrongSynergyBlock(synSection[1], index, map, 0.87, 'master-fusion');
  }

  return added;
}

function collectFromCurated(index, map) {
  let added = 0;
  for (const [aspectName, meta] of Object.entries(CURATED)) {
    const source = resolveToDb(aspectName, index);
    if (!source || !meta.strengthens?.length) continue;
    for (const target of meta.strengthens) {
      const resolved = resolveToDb(target, index);
      if (addSynergy(map, {
        aspectA: source,
        aspectB: resolved,
        fusionName: `${source} ↔ ${resolved}`,
        description: `CURATED strengthens link — ${source} + ${resolved}`,
        strength: 0.84,
        source: 'curated',
      })) added += 1;
    }
  }
  return added;
}

function collectFromAlchemyFusions(db, index, map) {
  let added = 0;
  try {
    const rows = db.prepare('SELECT name, inputs_json, output_aspect, notes FROM alchemy_fusions').all();
    for (const row of rows) {
      let inputs = [];
      try { inputs = JSON.parse(row.inputs_json || '[]'); } catch { inputs = []; }
      const resolved = inputs.map((i) => resolveToDb(i, index)).filter(Boolean);
      const output = resolveToDb(row.output_aspect, index) || resolveToDb(row.name, index);
      for (let i = 0; i < resolved.length; i += 1) {
        for (let j = i + 1; j < resolved.length; j += 1) {
          if (addSynergy(map, {
            aspectA: resolved[i],
            aspectB: resolved[j],
            fusionName: output || row.name,
            description: row.notes || `Alchemy fusion → ${output || row.name}`,
            strength: 0.83,
            source: 'alchemy',
          })) added += 1;
        }
      }
    }
  } catch { /* table may be empty */ }
  return added;
}

function collectFromShare3Formulas(index, map) {
  let added = 0;
  const formulas = [
    { parts: ['Fire of Conviction', 'Wings of Ambition', 'Anchor of Stability'], out: 'Tornado of Momentum', desc: '🔥 + 🪽 + ⚓ = 🌪️ — Share-3 alchemical formula' },
    { parts: ['Anchor of Stability'], out: 'Mirror of Truth', desc: 'Inner anchor yields mirror of truth' },
    { parts: ['Tornado of Momentum'], out: 'Helix of Adaptability', desc: 'Slowed tornado → introspective integration' },
    { parts: ['Anchor of Stability', 'Sprout of Nurturing'], out: 'Unwavering Heart', desc: 'Anchor + sprout → heart shield' },
    { parts: ['Fire of Conviction', 'Sprout of Nurturing'], out: 'ConvictionFire', desc: 'Fire + nurturing sprout' },
  ];

  for (const f of formulas) {
    const resolved = f.parts.map((p) => resolveToDb(p, index)).filter(Boolean);
    const out = resolveToDb(f.out, index);
    for (const p of resolved) {
      if (out && p !== out) {
        if (addSynergy(map, {
          aspectA: p,
          aspectB: out,
          fusionName: f.out,
          description: f.desc,
          strength: 0.78,
          source: 'share3',
        })) added += 1;
      }
    }
    for (let i = 0; i < resolved.length; i += 1) {
      for (let j = i + 1; j < resolved.length; j += 1) {
        if (addSynergy(map, {
          aspectA: resolved[i],
          aspectB: resolved[j],
          fusionName: f.out,
          description: f.desc,
          strength: 0.76,
          source: 'share3',
        })) added += 1;
      }
    }
  }
  return added;
}

function collectFromDetailJson(db, index, map) {
  let added = 0;
  const rows = db.prepare('SELECT name, detail_json FROM aspects WHERE detail_json IS NOT NULL').all();
  for (const row of rows) {
    let detail;
    try { detail = JSON.parse(row.detail_json); } catch { continue; }
    const source = resolveToDb(row.name, index);
    if (!source || !detail.integration?.strengthens?.length) continue;
    for (const target of detail.integration.strengthens) {
      const resolved = resolveToDb(target, index);
      if (addSynergy(map, {
        aspectA: source,
        aspectB: resolved,
        fusionName: `${source} ↔ ${resolved}`,
        description: `Integration strengthens — ${source} + ${resolved}`,
        strength: 0.8,
        source: 'detail-json',
      })) added += 1;
    }
  }
  return added;
}

function discoverSynergies(db) {
  const aspectNames = db.prepare('SELECT name FROM aspects').all().map((r) => r.name);
  const index = buildAspectIndex(aspectNames);
  const map = new Map();
  const stats = { core: 0, grok: 0, fusion: 0, curated: 0, alchemy: 0, share3: 0, detail: 0 };

  for (const [a, b, fusion, desc, strength] of CORE_SYNERGIES) {
    const ra = resolveToDb(a, index);
    const rb = resolveToDb(b, index);
    if (addSynergy(map, { aspectA: ra, aspectB: rb, fusionName: fusion, description: desc, strength, source: 'core' })) {
      stats.core += 1;
    }
  }

  stats.curated = collectFromCurated(index, map);
  stats.alchemy = collectFromAlchemyFusions(db, index, map);
  stats.share3 = collectFromShare3Formulas(index, map);
  stats.detail = collectFromDetailJson(db, index, map);

  const sessions = db.prepare('SELECT assistant_text, user_text FROM grok_sessions').all();
  for (const row of sessions) {
    for (const text of [row.assistant_text, row.user_text]) {
      stats.grok += parsePlusSynergyLines(text, index, map, 'grok-origin', 0.74);
      stats.fusion += parseMasterFusionInputs(text, index, map);
    }
  }

  // Journal corpus
  try {
    const journals = db.prepare('SELECT content FROM discord_messages').all();
    for (const row of journals) {
      stats.grok += parsePlusSynergyLines(row.content, index, map, 'journal', 0.68);
    }
  } catch { /* optional */ }

  const synergies = [...map.values()].sort((a, b) => b.strength - a.strength);
  return { synergies, stats, aspectCount: aspectNames.length };
}

module.exports = {
  discoverSynergies,
  resolveToDb,
  normalizeName,
  CORE_SYNERGIES,
  buildAspectIndex,
};