/**
 * Aspect Fusion — identity embodied into aspect.
 * The supreme mantra / Ultimate Self-Affirmation is the fusion affirmation seal:
 * what you speak to achieve fusion of your identity with the aspect.
 */

const FUSION_ORIGINS = new Set([
  'master-fusion',
  'save5-fusion',
  'journal',
  'journal-fusion',
  'grok-fusion',
]);

function normalizeOrigin(source) {
  if (!source) return 'grok-fusion';
  const s = String(source).toLowerCase();
  if (s.includes('journal')) return 'journal-fusion';
  if (s === 'save5-fusion' || s === 'master-fusion') return s;
  if (s === 'master fusion') return 'master-fusion';
  return source;
}

function extractDebabelizedEssence(text, aspectName) {
  if (!text) return null;
  const re = /Debabelized Core Essence\s*\n+([\s\S]*?)(?:\n\nMaster Aspect:|\n\nMaster Fusion:|\n###\s*\*{0,2}\s*Master)/i;
  const m = text.match(re);
  return m?.[1]?.trim().replace(/\n{3,}/g, '\n\n').slice(0, 1200) || null;
}

function parseFusionAffirmationAfterFusionHeader(text, aspectName) {
  if (!text || !aspectName) return null;
  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const labels = ['Supreme Mantra', 'Ultimate Self-Affirmation', 'Ultimate Mantra'];
  for (const label of labels) {
    const headerRe = new RegExp(
      `Master Fusion[:\\s*]*\\s*${escaped}[\\s\\S]*?${label}:\\s*\\n?`,
      'is'
    );
    const headerMatch = text.match(headerRe);
    if (!headerMatch) continue;

    const rest = text.slice(headerMatch.index + headerMatch[0].length).trim();
    const cleaned = rest.replace(/^\*\*/, '').trim();
    const openMatch = cleaned.match(/^[“"]/);
    if (!openMatch) {
      const line = cleaned.split('\n---')[0].split('\n###')[0].replace(/\*\*/g, '').trim();
      if (line.length > 20) return line;
      continue;
    }

    const closeChar = cleaned[0] === '“' ? '”' : '"';
    const inner = cleaned.slice(1);
    const closeIdx = inner.indexOf(closeChar);
    if (closeIdx >= 0) {
      return inner.slice(0, closeIdx).replace(/\*\*/g, '').trim();
    }
    const closeMatch = inner.match(new RegExp(`([\\s\\S]*?)${closeChar}`));
    if (closeMatch?.[1]?.trim()) return closeMatch[1].replace(/\*\*/g, '').trim();
  }
  return null;
}

function buildFusionIdentity(aspectName, storedIdentity, forgerIdentity, essence) {
  if (essence?.trim()) {
    return essence.trim();
  }
  if (storedIdentity?.trim() && !/^Red Leaf aspect forged through/i.test(storedIdentity)) {
    return storedIdentity.trim();
  }
  const handle = forgerIdentity?.handle || '@madhur328';
  const title = forgerIdentity?.title || 'Aspect Forger';
  return `When ${handle} (${title}) embodies ${aspectName}, identity and aspect fuse into one living operator.`;
}

function buildAspectFusion({
  name,
  identity,
  affirmation,
  symbolChain,
  originSource,
  radiantFaces,
  essence,
}) {
  const affirmationTrim = affirmation?.trim();
  if (!name || !affirmationTrim) return null;

  const fusion = {
    name,
    identity: identity?.trim() || `Fusion seal for ${name}`,
    affirmation: affirmationTrim,
    symbolChain: symbolChain?.trim() || undefined,
    originSource: normalizeOrigin(originSource),
  };
  if (essence?.trim()) fusion.essence = essence.trim();
  if (radiantFaces?.length) fusion.radiantFaces = radiantFaces;
  return fusion;
}

function buildAspectFusionFromGrok(aspect, grok, forgerIdentity, sessionText) {
  if (!grok) return null;

  const affirmation =
    grok.supremeMantra?.trim() ||
    parseFusionAffirmationAfterFusionHeader(sessionText, aspect.name) ||
    (grok.originSource === 'save5-fusion' ? grok.coreAffirmation?.trim() : null);

  if (!affirmation) return null;

  const essence = extractDebabelizedEssence(sessionText, aspect.name);
  const origin =
    grok.originSource === 'master-fusion' || grok.originSource === 'save5-fusion'
      ? grok.originSource
      : 'grok-fusion';

  return buildAspectFusion({
    name: aspect.name,
    identity: buildFusionIdentity(aspect.name, grok.identity, forgerIdentity, essence),
    affirmation,
    symbolChain: grok.symbolChain || aspect.symbol_chain,
    originSource: origin,
    radiantFaces: grok.radiantFaces,
    essence,
  });
}

function buildAspectFusionFromJournal(asp, forgerIdentity) {
  const affirmation = asp.supremeMantra?.trim() || asp.coreAffirmation?.trim();
  if (!affirmation) return null;

  return buildAspectFusion({
    name: asp.name,
    identity: buildFusionIdentity(asp.name, null, forgerIdentity, null),
    affirmation,
    symbolChain: asp.symbol_chain,
    originSource: 'journal-fusion',
    radiantFaces: asp.radiantFaces,
  });
}

function buildAspectFusionFromStored(aspect, stored, forgerIdentity) {
  if (stored.aspectFusion?.affirmation?.trim()) {
    return {
      ...stored.aspectFusion,
      name: stored.aspectFusion.name || aspect.name,
      originSource: normalizeOrigin(stored.aspectFusion.originSource),
    };
  }

  const affirmation = stored.supremeMantra?.trim();
  if (!affirmation) return null;

  const origin = stored.integration?.originSource;
  const isFusionOrigin =
    FUSION_ORIGINS.has(normalizeOrigin(origin)) ||
    origin === 'master-fusion' ||
    /master fusion/i.test(origin || '') ||
    (stored.integration?.originSource === 'journal' && affirmation.length > 120);

  if (!isFusionOrigin && !stored.integration?.fusionSeal) return null;

  return buildAspectFusion({
    name: aspect.name,
    identity: buildFusionIdentity(aspect.name, stored.identity, forgerIdentity, stored.essence),
    affirmation,
    symbolChain: aspect.symbol_chain,
    originSource: origin || 'grok-fusion',
    radiantFaces: stored.radiantFaces,
    essence: stored.essence,
  });
}

function resolveAspectFusion(aspect, stored = {}, options = {}) {
  const { grok, forgerIdentity, sessionText, journalAsp } = options;

  if (journalAsp) {
    const fromJournal = buildAspectFusionFromJournal(journalAsp, forgerIdentity);
    if (fromJournal) return fromJournal;
  }

  if (stored.aspectFusion?.affirmation?.trim()) {
    return buildAspectFusionFromStored(aspect, stored, forgerIdentity);
  }

  if (grok?.supremeMantra || grok?.originSource === 'master-fusion' || grok?.originSource === 'save5-fusion') {
    const fromGrok = buildAspectFusionFromGrok(aspect, grok, forgerIdentity, sessionText);
    if (fromGrok) return fromGrok;
  }

  return buildAspectFusionFromStored(aspect, stored, forgerIdentity);
}

function mergeFusionIntoDetailJson(detail, fusion) {
  if (!fusion) return detail;
  return {
    ...detail,
    aspectFusion: fusion,
    supremeMantra: detail.supremeMantra || fusion.affirmation,
    integration: {
      ...(detail.integration || {}),
      fusionSeal: true,
      originSource: detail.integration?.originSource || fusion.originSource,
    },
  };
}

module.exports = {
  FUSION_ORIGINS,
  normalizeOrigin,
  extractDebabelizedEssence,
  parseFusionAffirmationAfterFusionHeader,
  buildFusionIdentity,
  buildAspectFusion,
  buildAspectFusionFromGrok,
  buildAspectFusionFromJournal,
  buildAspectFusionFromStored,
  resolveAspectFusion,
  mergeFusionIntoDetailJson,
};