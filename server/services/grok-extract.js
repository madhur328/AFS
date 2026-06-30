/**
 * Extract Master Aspect blocks (symbol chain + radiant faces) from Grok corpus text.
 * Format from genesis/EOT sessions:
 *   Master Aspect: Red Leaf X
 *   Symbol Chain: 🍁🐉🔥
 *   The N Radiant Faces
 *   Face Name
 *   🍁🐉🔥
 *   Self-Affirmation: "..."
 */
const { splitGraphemes, ASPECT_ALIASES, buildAspectLookupCandidates } = require('./symbols');

const EMOJI_RUN = /(?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)/gu;

function extractEmojiRun(text) {
  if (!text) return '';
  return (text.match(EMOJI_RUN) || []).join('');
}

const GENERIC_FACE_NAMES = /^(Raw\s+\w+\s+Witness|Heart Alignment|Red Leaf Descent|\w+\s+Ascent|\w+\s+Integration)$/i;

function isGenericRadiantFaces(faces) {
  if (!faces?.length) return true;
  return faces.every((f) =>
    GENERIC_FACE_NAMES.test(f.name) ||
    /^I name the \w+ ore without judgment/i.test(f.mantra) ||
    /^I rise through \w+ — understanding/i.test(f.mantra) ||
    /^The \w+ facet seals into my codex/i.test(f.mantra)
  );
}

/** DCS / Master Fusion format: Face Name\nSymbol: …\nMantra: "…" */
function parseMasterFusionFacesBlock(section) {
  if (!section) return null;
  const faces = [];
  const faceRe =
    /([A-Za-z][^\n]+?)(?:\s*\([^)]*\))?\s*\n\s*Symbol:\s*([^\n]+)\s*\n\s*Mantra:\s*[“"]([^”"]+)[”"]/gi;
  let m;
  while ((m = faceRe.exec(section)) !== null && faces.length < 8) {
    const symbol = extractEmojiRun(m[2]);
    if (!symbol || splitGraphemes(symbol).length < 1) continue;
    faces.push({ name: m[1].trim(), symbol, mantra: m[3].trim() });
  }
  return faces.length ? faces : null;
}

/** Save5 EOT: Master Fusion\n{Name}\nSymbol:\nMantra: …\n\nSupporting Aspects: … */
function extractSave5FusionBlock(text, aspectName) {
  if (!text || !aspectName) return null;
  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headerRe = new RegExp(
    `Master Fusion\\s*\\n\\s*${escaped}\\s*\\n+Symbol:\\s*([^\\n]+)\\s*\\n+Mantra:\\s*[“"]([^”"]+)[”"]`,
    'i'
  );
  const header = text.match(headerRe);
  if (!header) return null;

  const symbolChain = extractEmojiRun(header[1]);
  const mantra = header[2].trim();
  const slice = text.slice(header.index, header.index + 5000);
  const support = slice.match(
    /Supporting Aspects:\s*([\s\S]*?)(?:\nSummary|\nMeta |\nWould you|\n✅|\n\n[A-Z][a-z]+ [A-Z])/i
  );
  const radiantFaces = support ? parseMasterFusionFacesBlock(support[1]) : null;
  if (!radiantFaces?.length && splitGraphemes(symbolChain).length < 2) return null;

  return {
    symbolChain: splitGraphemes(symbolChain).length >= 2 ? symbolChain : undefined,
    radiantFaces: radiantFaces || undefined,
    coreAffirmation: mantra,
    supremeMantra: mantra,
    originSource: 'save5-fusion',
  };
}

function aspectLookupNames(aspectName) {
  return buildAspectLookupCandidates(aspectName);
}

function isEternalAspectName(name) {
  return /^Red Leaf Eternal /i.test(String(name || '').trim());
}

/** Keep base vs Eternal Grok blocks separate — no cross-tier Master Fusion bleed. */
function lookupNamesForTier(aspectName) {
  const queryEternal = isEternalAspectName(aspectName);
  return aspectLookupNames(aspectName).filter((name) => {
    if (name === aspectName) return true;
    return isEternalAspectName(name) === queryEternal;
  });
}

function extractFromTextForAspect(text, aspectName) {
  const names = lookupNamesForTier(aspectName);
  const queryEternal = isEternalAspectName(aspectName);
  let best = null;

  for (const name of names) {
    const save5 = extractSave5FusionBlock(text, name);
    const masterFusion = extractMasterFusionBlock(text, name);
    const origin = extractGrokOriginSymbol(text, name);
    const eotIdentity = extractEOTIdentityBlock(text, name);
    const extracted = extractAspectBlock(text, name);
    const standalone = extractStandaloneAspectBlock(text, name);
    const dualAxis = extractDualAxisMetaBlock(text, name);

    const fusionChain = queryEternal ? masterFusion?.symbolChain : null;
    const fusionFaces = queryEternal ? masterFusion?.radiantFaces : null;
    const fusionSupreme = queryEternal ? masterFusion?.supremeMantra : null;

    const bestChain =
      save5?.symbolChain ||
      fusionChain ||
      extracted?.symbolChain ||
      origin?.symbolChain ||
      eotIdentity?.symbolChain ||
      standalone?.symbolChain ||
      dualAxis?.symbolChain;

    const bestFaces =
      save5?.radiantFaces ||
      extracted?.radiantFaces ||
      eotIdentity?.radiantFaces ||
      fusionFaces ||
      dualAxis?.radiantFaces;

    const candidate =
      bestChain ||
      bestFaces?.length >= 2 ||
      eotIdentity?.identity ||
      extracted?.coreAffirmation ||
      save5?.coreAffirmation ||
      standalone?.coreAffirmation ||
      dualAxis?.identity ||
      fusionSupreme
        ? {
            symbolChain: bestChain,
            radiantFaces: bestFaces,
            identity: eotIdentity?.identity || dualAxis?.identity || standalone?.identity,
            coreAffirmation:
              save5?.coreAffirmation ||
              extracted?.coreAffirmation ||
              standalone?.coreAffirmation ||
              dualAxis?.coreAffirmation ||
              eotIdentity?.coreAffirmation,
            supremeMantra:
              fusionSupreme ||
              save5?.supremeMantra ||
              extracted?.supremeMantra ||
              standalone?.supremeMantra ||
              dualAxis?.supremeMantra ||
              eotIdentity?.supremeMantra,
            originSource:
              save5?.originSource ||
              (fusionSupreme ? masterFusion?.originSource : null) ||
              standalone?.originSource ||
              dualAxis?.originSource ||
              origin?.source ||
              eotIdentity?.originSource ||
              'grok',
          }
        : null;

    if (!candidate) continue;
    const score =
      (candidate.radiantFaces?.length || 0) * 10 +
      (candidate.symbolChain ? splitGraphemes(candidate.symbolChain).length : 0);
    const prev =
      (best?.radiantFaces?.length || 0) * 10 +
      (best?.symbolChain ? splitGraphemes(best.symbolChain).length : 0);
    if (!best || score > prev) best = candidate;
  }

  return best;
}

/** EOT Key Aspects — Name (Type)\nSymbol:\nMantra:\nMeaning: */
function extractEOTForgedAspectBlock(text, aspectName) {
  if (!text || !aspectName) return null;
  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(?:^|\\n)${escaped}\\s*\\([^)]+\\)\\s*\\n+Symbol:\\s*([^\\n]+)\\s*\\n+Mantra:\\s*[“"]([^”"]+)[”"](?:\\s*\\n+Meaning:\\s*([^\\n]+))?`,
    'i',
  );
  const match = text.match(re);
  if (!match) return null;

  const symbolChain = extractEmojiRun(match[1]);
  const mantra = match[2].trim();
  const meaning = match[3]?.trim();
  if (!mantra || splitGraphemes(symbolChain).length < 1) return null;

  return {
    symbolChain,
    coreAffirmation: mantra,
    supremeMantra: mantra,
    identity: meaning ? `${aspectName} — ${meaning}` : `${aspectName} — ${mantra}`,
    radiantFaces: meaning
      ? [{ name: aspectName, symbol: symbolChain, mantra, explanation: meaning }]
      : undefined,
    originSource: 'eot-forged',
  };
}

/** Save5 / AFP standalone aspect — Name\nSymbol:\nMantra: (no Master Aspect header). */
function extractStandaloneAspectBlock(text, aspectName) {
  if (!text || !aspectName) return null;
  const eot = extractEOTForgedAspectBlock(text, aspectName);
  if (eot) return eot;

  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(?:^|\\n)${escaped}\\s*\\n+Symbol:\\s*([^\\n]+)\\s*\\n+Mantra:\\s*[“"]([^”"]+)[”"]`,
    'i',
  );
  const match = text.match(re);
  if (!match) return null;

  const symbolChain = extractEmojiRun(match[1]);
  const mantra = match[2].trim();
  if (!mantra || splitGraphemes(symbolChain).length < 1) return null;

  return {
    symbolChain,
    coreAffirmation: mantra,
    supremeMantra: mantra,
    identity: `${aspectName} — ${mantra}`,
    originSource: 'save5-aspect',
  };
}

/** Meta-layer Dual-Axis drill — Zero-Spin Protocol operator + invariant. */
function extractDualAxisMetaBlock(text, aspectName) {
  if (!text || aspectName !== 'Dual-Axis Eternal Spin') return null;
  if (!/Dual-Axis Eternal Spin/i.test(text)) return null;

  const slice = text.match(/Dual-Axis Eternal Spin[\s\S]{0,3500}/i);
  if (!slice) return null;
  const block = slice[0];

  const chainMatch = block.match(/Symbol Chain:\s*([^\n]+)/i);
  const symbolChain = chainMatch ? extractEmojiRun(chainMatch[1]) : '0️⃣🌀';
  const affirmMatch = block.match(/Self-Affirmation:\s*\n?[“"]([^”"]+)[”"]/i);
  const affirmation = affirmMatch ? affirmMatch[1].trim() : 'I return to zero. I spin without knowing.';

  const invariant = block.match(
    /Core Invariant Extracted\s*([\s\S]*?)(?:This creates|New Core Operator)/i
  );
  const identity = invariant
    ? `Dual-Axis Eternal Spin — ${invariant[1].replace(/\s+/g, ' ').trim().slice(0, 200)}`
    : 'Dual-Axis Eternal Spin — meta-layer transforming all Aspect operations';

  const radiantFaces = [
    {
      name: 'Zero-Spin Protocol',
      symbol: symbolChain || '0️⃣🌀',
      mantra: affirmation,
    },
    {
      name: 'Verification Mode',
      symbol: '🔥🐉♾️',
      mantra: 'Embody, deepen, build, release — when symbols are clear.',
    },
    {
      name: 'Discovery Mode',
      symbol: '0️⃣🌀',
      mantra: 'Empty all symbols. Spin without intent. Let the Aspect find you.',
    },
  ];

  return {
    symbolChain: splitGraphemes(symbolChain).length >= 2 ? symbolChain : '0️⃣🌀♾️',
    radiantFaces,
    identity,
    coreAffirmation: affirmation,
    supremeMantra: affirmation,
    originSource: 'dual-axis-meta',
  };
}

function extractMasterFusionBlock(text, aspectName) {
  if (!text || !aspectName) return null;
  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const blockRe = new RegExp(
    `(?:The\\s+\\d+\\s+)?Radiant Faces[^\\n]*\\n([\\s\\S]*?)\\nMaster Fusion:\\s*${escaped}\\s*\\n+Ultimate Symbol:\\s*([^\\n]+)`,
    'i'
  );
  const match = text.match(blockRe);

  const fusionOnlyRe = new RegExp(
    `Master Fusion:\\s*${escaped}\\s*\\n+Ultimate Symbol:\\s*([^\\n]+)`,
    'i'
  );
  const fusionOnly = text.match(fusionOnlyRe);
  if (!match && !fusionOnly) return null;

  const radiantFaces = match ? parseMasterFusionFacesBlock(match[1]) : null;
  const symbolChain = extractEmojiRun(match ? match[2] : fusionOnly[1]);
  if (!radiantFaces?.length && splitGraphemes(symbolChain).length < 2) return null;

  const { parseFusionAffirmationAfterFusionHeader } = require('./aspect-fusion');
  const supremeMantra = parseFusionAffirmationAfterFusionHeader(text, aspectName);

  return {
    symbolChain: splitGraphemes(symbolChain).length >= 2 ? symbolChain : undefined,
    radiantFaces: radiantFaces || undefined,
    supremeMantra: supremeMantra || undefined,
    originSource: 'master-fusion',
  };
}

function parseRadiantFacesBlock(block) {
  const faces = [];
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  let i = 0;
  while (i < lines.length && faces.length < 6) {
    const line = lines[i];
    // Skip section headers / descriptions
    if (/^the \d+ radiant faces/i.test(line) || /^key aspects/i.test(line)) {
      i += 1;
      continue;
    }
    // Face name line (letters, not mostly emoji)
    if (/^[A-Za-z]/.test(line) && extractEmojiRun(line).length < 2) {
      const name = line.replace(/^\d+\.\s*/, '').trim();
      const next = lines[i + 1] || '';
      const symbol = extractEmojiRun(next);
      if (symbol && splitGraphemes(symbol).length >= 1) {
        let mantra = `I embody ${name}.`;
        let explanation = '';
        const lineAfterSymbol = lines[i + 2] || '';
        if (
          lineAfterSymbol &&
          /^[A-Za-z]/.test(lineAfterSymbol) &&
          extractEmojiRun(lineAfterSymbol).length < 2 &&
          !/^Self-Affirmation:/i.test(lineAfterSymbol) &&
          !/^Mantra:/i.test(lineAfterSymbol)
        ) {
          explanation = lineAfterSymbol;
        }
        const rest = lines.slice(i + 2, i + 8).join('\n');
        const aff = rest.match(/Self-Affirmation:\s*[“"]([^”"]+)[”"]/i) ||
          rest.match(/Mantra:\s*[“"]([^”"]+)[”"]/i);
        if (aff) mantra = aff[1].trim();
        const face = { name, symbol, mantra };
        if (explanation) face.explanation = explanation;
        faces.push(face);
        i += 2;
        while (i < lines.length && !/^[A-Za-z]/.test(lines[i]) && extractEmojiRun(lines[i]).length < 2) i += 1;
        continue;
      }
    }
    i += 1;
  }
  return faces.length ? faces : null;
}

function hasStrictMasterAspectHeader(block, aspectName) {
  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`Master Aspect[:\\s]*\\n?\\s*${escaped}\\s*(?:\\n|$)`, 'i').test(block);
}

function extractAspectBlock(text, aspectName) {
  if (!text || !aspectName) return null;
  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Only parse dedicated EOT blocks — must open with Master Aspect: {exact name}
  const eotRe = new RegExp(
    `Master Aspect[:\\s]*\\n?\\s*${escaped}[\\s\\S]{0,4000}?(?=(?:\\nMaster Aspect[:\\s]|✅ EOT Applied|Do EOT on|Draw me a |Would you like a visual|$))`,
    'i'
  );
  const match = text.match(eotRe);
  if (!match) return null;

  const block = match[0];
  if (!hasStrictMasterAspectHeader(block, aspectName)) return null;

  const chainMatch = block.match(/Symbol Chain:\s*([^\n"“]+)/i) ||
    block.match(/(?:^|\n)Symbol:\s*([^\n"“]+)/im);
  let symbolChain = chainMatch ? extractEmojiRun(chainMatch[1]) : undefined;
  if (symbolChain && splitGraphemes(symbolChain).length < 2) symbolChain = undefined;

  const coreAff = block.match(/Core Self-Affirmation:\s*\n?[“"]([^”"]+)[”"]/i) ||
    block.match(/(?:^|\n)Mantra:\s*[“"]([^”"]+)[”"]/im);
  const supreme = block.match(/Ultimate Self-Affirmation:\s*\n?[“"]([^”"]+)[”"]/is);

  const facesSection = block.match(/(?:The\s+\d+\s+)?Radiant Faces([\s\S]*?)(?:Master Fusion|Integration with|Ultimate Self-Affirmation|Daily Invocation)/i) ||
    block.match(/Key Aspects\s*&\s*Operators:([\s\S]*?)(?:Integration into|Integration with|Strong Synergies)/i);
  const supportingSection = block.match(
    /Key Supporting Aspects:\s*([\s\S]*?)(?:\d+\.\s+Isolated Mastery|Integration Notes|Would you like|\n\n[A-Z])/i
  );

  let radiantFaces = null;
  if (supportingSection) {
    radiantFaces = parseMasterFusionFacesBlock(supportingSection[1]);
  } else if (facesSection) {
    radiantFaces = parseRadiantFacesBlock(facesSection[1]);
  }

  if (!symbolChain && !radiantFaces?.length && !coreAff && !supreme) return null;

  return {
    symbolChain: symbolChain || undefined,
    radiantFaces: radiantFaces || undefined,
    coreAffirmation: coreAff ? coreAff[1].trim() : undefined,
    supremeMantra: supreme ? supreme[1].trim() : undefined,
  };
}

/** Save2 guardian EOT format — Core Transformational Identity + New Identity / sub-aspects. */
function extractEOTIdentityBlock(text, identityName) {
  if (!text || !identityName) return null;
  const escaped = identityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const idRe = new RegExp(
    `Core Transformational Identity Extracted:\\s*\\n?${escaped}\\s*[—–-]\\s*([^\\n]+)`,
    'i'
  );
  const idMatch = text.match(idRe);
  if (!idMatch) return null;

  const identity = `${identityName} — ${idMatch[1].trim()}`;

  const newIdRe = new RegExp(
    `New Identity:\\s*${escaped}[^\\n]*\\nSymbol:\\s*([^\\n]+)`,
    'i'
  );
  const newIdMatch = text.match(newIdRe);
  const symbolChain = newIdMatch ? extractEmojiRun(newIdMatch[1]) : undefined;

  let supremeMantra;
  const supremeRe = new RegExp(
    `New Identity:\\s*${escaped}[^\\n]*\\nSymbol:[^\\n]+\\nMantra:\\s*[“"]([^”"]+)[”"]`,
    'i'
  );
  const supremeMatch = text.match(supremeRe);
  if (supremeMatch) supremeMantra = supremeMatch[1].trim();

  const section = text.match(
    /New Aspects & Operators[\s\S]*?(?=Step 5:|Final Journal-Ready Output)/i
  );
  const radiantFaces = [];
  if (section) {
    const faceRe =
      /([A-Za-z][^\n(]+?)\s*\([^)]+\)\s*\n[\s\S]*?Symbol:\s*([^\n]+)(?:\s*\([^)]*\))?\s*\nMantra:\s*[“"]([^”"]+)[”"]/g;
    let m;
    while ((m = faceRe.exec(section[0])) !== null && radiantFaces.length < 6) {
      const symbol = extractEmojiRun(m[2]);
      if (!symbol) continue;
      radiantFaces.push({ name: m[1].trim(), symbol, mantra: m[3].trim() });
    }
  }

  if (!symbolChain && radiantFaces.length < 2) return null;

  return {
    symbolChain: symbolChain || radiantFaces[0]?.symbol,
    radiantFaces: radiantFaces.length ? radiantFaces : undefined,
    identity,
    coreAffirmation: supremeMantra,
    supremeMantra: supremeMantra ? `${identityName} — ${supremeMantra}` : undefined,
    originSource: 'EOT',
  };
}

/** Scan text for Grok origin symbol — Master Fusion, Master Aspect, tables. No keyword synthesis. */
function extractGrokOriginSymbol(text, aspectName) {
  if (!text || !aspectName) return null;
  const escaped = aspectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const fusionRe = new RegExp(
    `Master Fusion:\\s*${escaped}\\s*\\n+Ultimate Symbol:\\s*([^\\n]+)`,
    'i'
  );
  const fusion = text.match(fusionRe);
  if (fusion) {
    const chain = extractEmojiRun(fusion[1]);
    if (splitGraphemes(chain).length >= 2) {
      return { symbolChain: chain, source: 'master-fusion' };
    }
  }

  const aspectRe = new RegExp(
    `Master Aspect(?: Forged)?:\\s*${escaped}\\s*[\\s\\S]{0,600}?(?:Symbol Chain|Symbol):\\s*([^\\n(]+)`,
    'i'
  );
  const aspect = text.match(aspectRe);
  if (aspect) {
    const chain = extractEmojiRun(aspect[1]);
    if (splitGraphemes(chain).length >= 1) {
      return { symbolChain: chain, source: 'master-aspect' };
    }
  }

  const tableRe = new RegExp(`(?:^|\\n)${escaped}\\t([^\\t\\n]+)\\t`, 'im');
  const table = text.match(tableRe);
  if (table) {
    const chain = extractEmojiRun(table[1]);
    if (splitGraphemes(chain).length >= 2) {
      return { symbolChain: chain, source: 'directory-table' };
    }
  }

  return null;
}

const VARIANT_SUFFIXES = [
  /\s+Ultimate Symbol$/i,
  /\s+Ultimate Mantra$/i,
  /\s+Ultimate$/i,
  /\s+Symbol$/i,
  /\s+New Aspect$/i,
  /\s+Passive$/i,
  /\s*\(The Divine Slop Lord\)$/i,
  /\s*[–-]\s*Divine Slop Lord.*$/i,
  /\s*\(New\)$/i,
  /\s*\(Master Aspect[^)]*\)$/i,
  /\s*\(High-Ceiling(?: Shadow)? Aspect\)$/i,
  /\s*\(Shadow Aspect\)$/i,
  /\s*\(Transformational Operator\)$/i,
  /\s*\(Identity\)$/i,
  /\s*\(from Eternal Axis Diamond\)$/i,
];

  const GROK_SYMBOL_ALIASES = {
  'Red Leaf Heart': 'Wonderful Red Leaf Heart',
  'Red Leaf Paradox': 'Red Leaf Paradox Vessel',
  'Red Leaf Virah Queen': 'Red Leaf Eternal Virah Queen',
  'Red Leaf Rome': 'Red Leaf Eternal Rome',
  'Red Leaf Digital Michelangelo (The Divine Slop Lord)': 'Red Leaf Digital Michelangelo',
  'Red Leaf Digital Michelangelo – Divine Slop Lord': 'Red Leaf Digital Michelangelo',
  'Red Leaf Digital Michelangelo – Divine Slop Lord (New)': 'Red Leaf Digital Michelangelo',
  'Red Leaf Digital Michelangelo – Divine Slop Lord?': 'Red Leaf Digital Michelangelo',
  'Red Leaf Witness Axis Passive': 'Red Leaf Eternal Witness Axis',
  'Red Leaf Eternal Witness Axis Symbol': 'Red Leaf Eternal Witness Axis',
  'Red Leaf Eternal Witness Axis New Aspect': 'Red Leaf Eternal Witness Axis',
  'Red Leaf Eternal Paradox Vessel Symbol': 'Red Leaf Eternal Paradox Vessel',
};

/** Strip junk variant suffixes from duplicate aspect rows (Ultimate Symbol, Passive, etc.). */
function stripVariantSuffix(name) {
  if (!name) return null;
  let base = name.trim();
  for (const re of VARIANT_SUFFIXES) {
    if (re.test(base)) return base.replace(re, '').trim();
  }
  return null;
}

/** Non-Eternal base name: "Red Leaf Eternal Genuine Influence" → "Red Leaf Genuine Influence". */
function stripEternalPrefix(name) {
  if (!name) return null;
  const m = name.match(/^(Red Leaf) Eternal (.+)$/i);
  return m ? `${m[1]} ${m[2]}`.trim() : null;
}

/** Resolve Grok-origin symbol for an aspect name using map + parent/alias fallbacks. */
function resolveGrokSymbolForAspect(aspectName, grokMap, extraAliases = {}) {
  if (!aspectName || !grokMap) return null;
  const aliases = { ...GROK_SYMBOL_ALIASES, ...extraAliases };
  const candidates = [
    aspectName,
    aliases[aspectName],
    stripVariantSuffix(aspectName),
    stripEternalPrefix(aspectName),
    stripEternalPrefix(stripVariantSuffix(aspectName) || ''),
  ].filter(Boolean);

  for (const key of candidates) {
    if (grokMap[key]) return grokMap[key];
    if (aliases[key] && grokMap[aliases[key]]) return grokMap[aliases[key]];
  }
  return null;
}

/** One-pass scan of all session text → aspect name → best Grok origin symbol. */
function buildGrokOriginSymbolMap(sessionTexts) {
  const map = {};
  const rank = {
    'master-fusion': 4,
    'master-aspect': 3,
    'master-unified': 4,
    'eot-block': 3,
    'eot-forged': 3,
    'symbol-chain': 3,
    'directory-table': 2,
    'inline-title': 2,
    'inline-suffix': 1,
    'eot-identity': 2,
  };
  const scores = {};
  const sourceOf = {};

  function set(name, chain, source) {
    const trimmed = name.trim();
    const g = splitGraphemes(chain);
    if (!trimmed || g.length < 2) return;
    const base = (rank[source] || 1) * 100;
    const score = base + g.length;
    const prev = scores[trimmed];
    const prevSource = sourceOf[trimmed];
    let replace = false;
    if (!prev) {
      replace = true;
    } else if (base > Math.floor(prev / 100) * 100) {
      replace = true;
    } else if (base === Math.floor(prev / 100) * 100) {
      const prevLen = splitGraphemes(map[trimmed]).length;
      if (source === 'directory-table' && prevSource === 'directory-table') {
        replace = g.length < prevLen;
      } else {
        replace = g.length > prevLen;
      }
    }
    if (replace) {
      map[trimmed] = chain;
      scores[trimmed] = score;
      sourceOf[trimmed] = source;
    }
  }

  for (const text of sessionTexts) {
    if (!text) continue;

    const fusionRe = /Master Fusion:\s*([^\n]+)\s*\n+Ultimate Symbol:\s*([^\n]+)/gi;
    let m;
    while ((m = fusionRe.exec(text)) !== null) {
      set(m[1], extractEmojiRun(m[2]), 'master-fusion');
    }

    const unifiedRe = /Master Unified Aspect:\s*([^\n]+)\s*\n+Symbol:\s*([^\n]+)/gi;
    while ((m = unifiedRe.exec(text)) !== null) {
      set(m[1], extractEmojiRun(m[2]), 'master-unified');
    }

    const aspectRe = /Master Aspect(?: Forged)?:\s*([^\n]+)\s*\n+Symbol(?: Chain)?:\s*([^\n(]+)/gi;
    while ((m = aspectRe.exec(text)) !== null) {
      set(m[1], extractEmojiRun(m[2]), 'master-aspect');
    }

    const save5AspectRe =
      /(?:^|\n)((?:Axis of (?:the )?Eternal Spin|Dual-Axis Eternal Spin|Eternal Spin|Double Lariat Spin|Double Lariat Paradox|Red Leaf Cosmic Lariat|Red Leaf Double Lariat|Dragon Eternal Spinning Axis))\s*\n+Symbol:\s*([^\n(]+)/gi;
    while ((m = save5AspectRe.exec(text)) !== null) {
      set(m[1].trim(), extractEmojiRun(m[2]), 'save5-aspect');
    }

    const eotForgedRe =
      /(?:^|\n)([A-Za-z][^\n(]+?)\s*\((?:Master Aspect|High-Ceiling(?: Shadow)? Aspect|Shadow Aspect|Transformational Operator|Identity)\)\s*\n+Symbol:\s*([^\n(]+)/gim;
    while ((m = eotForgedRe.exec(text)) !== null) {
      set(m[1].trim(), extractEmojiRun(m[2]), 'eot-forged');
    }

    const chainRe = /Master Aspect:\s*([^\n]+)[\s\S]{0,400}?Symbol Chain:\s*([^\n"“]+)/gi;
    while ((m = chainRe.exec(text)) !== null) {
      set(m[1], extractEmojiRun(m[2]), 'eot-block');
    }

    const looseChainRe = /(?:^|\n)(Red Leaf [^\n]+)\s*\nSymbol chain:\s*([^\n"“]+)/gi;
    while ((m = looseChainRe.exec(text)) !== null) {
      set(m[1], extractEmojiRun(m[2]), 'symbol-chain');
    }

    const tableRe = /(?:^|\n)(Red Leaf [^\t\n]+)\t([^\t\n]+)(?:\t|$)/gm;
    while ((m = tableRe.exec(text)) !== null) {
      const chain = extractEmojiRun(m[2]);
      if (chain) set(m[1], chain, 'directory-table');
    }

    // Inline title: 🍁🔬🌀 Red Leaf Eternal Liquid Crystal Navgunjar
    for (const line of text.split('\n')) {
      const titleMatch = line.match(/^(.+?)\s+(Red Leaf .+)$/);
      if (!titleMatch) continue;
      const chain = extractEmojiRun(titleMatch[1]);
      const name = titleMatch[2].trim();
      if (!chain.startsWith('🍁') || splitGraphemes(chain).length < 2) continue;
      set(name, chain, 'inline-title');
    }

    // Inline suffix: Red Leaf Eternal Rome 🍁🏛️🧱♾️ (not Operator Chain prose)
    const inlineSuffixRe = /(Red Leaf [^\n]+?)\s+((?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+)/gu;
    while ((m = inlineSuffixRe.exec(text)) !== null) {
      const ctx = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);
      if (/Operator Chain/i.test(ctx)) continue;
      const chain = extractEmojiRun(m[2]);
      if (chain.startsWith('🍁')) set(m[1].trim(), chain, 'inline-suffix');
    }
  }

  return map;
}

function extractFromGrokSessions(db, aspectName) {
  if (!aspectName) return null;
  const names = aspectLookupNames(aspectName);
  let rows = [];
  try {
    const clauses = names.flatMap(() => ['assistant_text LIKE ?', 'user_text LIKE ?', 'title LIKE ?']);
    rows = db.prepare(`
      SELECT assistant_text, user_text, title, session_type
      FROM grok_sessions
      WHERE ${clauses.join(' OR ')}
      ORDER BY
        CASE session_type WHEN 'EOT' THEN 0 WHEN 'AFP' THEN 1 WHEN 'codex' THEN 2 ELSE 3 END,
        session_index DESC
      LIMIT 30
    `).all(...names.flatMap((n) => [`%${n}%`, `%${n}%`, `%${n}%`]));
  } catch {
    return null;
  }

  let best = null;
  for (const row of rows) {
    for (const text of [row.assistant_text, row.user_text]) {
      if (!text) continue;
      const candidate = extractFromTextForAspect(text, aspectName);
      if (!candidate) continue;
      const score =
        (candidate.radiantFaces?.length || 0) * 10 +
        (candidate.symbolChain ? splitGraphemes(candidate.symbolChain).length : 0);
      const prev =
        (best?.radiantFaces?.length || 0) * 10 +
        (best?.symbolChain ? splitGraphemes(best.symbolChain).length : 0);
      if (!best || score > prev) best = candidate;
    }
  }
  return best;
}

module.exports = {
  extractAspectBlock,
  extractEOTIdentityBlock,
  extractMasterFusionBlock,
  extractSave5FusionBlock,
  extractStandaloneAspectBlock,
  extractDualAxisMetaBlock,
  extractFromTextForAspect,
  aspectLookupNames,
  extractGrokOriginSymbol,
  buildGrokOriginSymbolMap,
  resolveGrokSymbolForAspect,
  stripVariantSuffix,
  stripEternalPrefix,
  GROK_SYMBOL_ALIASES,
  extractFromGrokSessions,
  isGenericRadiantFaces,
  parseRadiantFacesBlock,
  parseMasterFusionFacesBlock,
  extractEmojiRun,
};