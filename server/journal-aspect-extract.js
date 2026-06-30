/**
 * Extract forged aspects from Discord journal / bot output (Master Fusion blocks).
 */

function cleanJournalText(text) {
  return (text || '')
    .replace(/\uFFFD/g, '')
    .replace(/\u25A1/g, '')
    .replace(/\r\n/g, '\n');
}

function inferJournalOperator(text, radiantFaces = []) {
  if (/RDTQ|Trip Queen/i.test(text)) return 'RDTQ';
  if (/RCS|Resonant Chrysalis/i.test(text)) return 'RCS';
  if (radiantFaces.length >= 2) return 'DCS';
  return 'EOT';
}

function isPlaceholderJournalMantra(mantra) {
  return /^I embody .+ — forged from journal\.?$/i.test(String(mantra || '').trim());
}

function parseQuotedAffirmation(block, label) {
  const headerRe = new RegExp(`\\*\\*${label}:\\*\\*\\s*\\n+`, 'i');
  const headerMatch = block.match(headerRe);
  if (!headerMatch) return '';

  const rest = block.slice(block.indexOf(headerMatch[0]) + headerMatch[0].length).trim();
  const cleaned = rest.replace(/^\*\*/, '').trim();
  const openMatch = cleaned.match(/^[“"]/);
  if (!openMatch) {
    return cleaned.split('\n---')[0].split('\n###')[0].replace(/\*\*/g, '').trim();
  }

  const closeChar = cleaned[0] === '“' ? '”' : '"';
  const inner = cleaned.slice(1);
  const closeIdx = inner.indexOf(closeChar);
  if (closeIdx >= 0) {
    return inner.slice(0, closeIdx).replace(/\*\*/g, '').trim();
  }

  const closeMatch = inner.match(new RegExp(`([\\s\\S]*?)${closeChar}`));
  return (closeMatch?.[1] || inner.split('\n---')[0]).replace(/\*\*/g, '').trim();
}

function parseFaceSelfAffirmation(section) {
  const m = section.match(/Self-Affirmation:\s*[“"']([^"”'\n]+)[”"']/i);
  return m?.[1]?.trim() || '';
}

function parseRadiantFaces(block) {
  const faces = [];
  const re = /(\d+)\.\s*\*\*([^*]+)\*\*([\s\S]*?)(?=\n\d+\.\s*\*\*|\n###|\n---|$)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const name = m[2].trim();
    const body = m[3];
    const symbolMatch = body.match(/^\s*[\n\r]+([^\n]+)/);
    if (!symbolMatch) continue;

    const symbol = symbolMatch[1].trim().replace(/\s+/g, '');
    if (!symbol || symbol.length > 40) continue;

    const afterSymbol = body.slice(symbolMatch.index + symbolMatch[0].length);
    const selfAff = parseFaceSelfAffirmation(afterSymbol);

    let explanation = '';
    for (const line of afterSymbol.split('\n')) {
      const trimmed = line.trim().replace(/^\*|\*$/g, '');
      if (!trimmed || /Self-Affirmation:/i.test(trimmed)) {
        if (/Self-Affirmation:/i.test(trimmed)) break;
        continue;
      }
      if (/^[\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u.test(trimmed)) continue;
      explanation = trimmed;
      break;
    }

    const face = {
      name,
      symbol,
      mantra: selfAff || `I embody ${name} — forged from journal.`,
    };
    if (explanation) face.explanation = explanation;
    faces.push(face);
  }
  return faces.slice(0, 8);
}

function faceDataIsRich(faces = []) {
  return faces.some((f) => f.explanation?.trim() || !isPlaceholderJournalMantra(f.mantra));
}

function mergeJournalAspects(existing, incoming) {
  const out = { ...existing };
  if (incoming.symbol_chain?.trim() && (!out.symbol_chain || out.symbol_chain === '🍁⚒️💎')) {
    out.symbol_chain = incoming.symbol_chain;
  }
  if (incoming.coreAffirmation?.trim() && !out.coreAffirmation?.trim()) {
    out.coreAffirmation = incoming.coreAffirmation;
  }
  if (incoming.supremeMantra?.trim()) {
    const prevLen = (out.supremeMantra || '').length;
    if (incoming.supremeMantra.length > prevLen) out.supremeMantra = incoming.supremeMantra;
  }
  const incomingFaces = incoming.radiantFaces || [];
  const existingFaces = out.radiantFaces || [];
  if (
    incomingFaces.length &&
    (!existingFaces.length || (faceDataIsRich(incomingFaces) && !faceDataIsRich(existingFaces)))
  ) {
    out.radiantFaces = incomingFaces;
  }
  if (incoming.operator && (!out.operator || out.operator === 'EOT')) {
    out.operator = incoming.operator;
  }
  return out;
}

function pushJournalAspect(aspectMap, asp) {
  const key = asp.name.toLowerCase();
  if (aspectMap.has(key)) {
    aspectMap.set(key, mergeJournalAspects(aspectMap.get(key), asp));
  } else {
    aspectMap.set(key, asp);
  }
}

function buildJournalAspectFromBlock(block) {
  const nameMatch = block.match(
    /###\s*\*{0,2}\s*Master\s+(?:Fusion|Aspect)\s*\*{0,2}\s*\n+\s*\*{1,2}([^*\n]+)\*{1,2}/i
  );
  const name = nameMatch?.[1]?.trim();
  if (!name || name.length < 4) return null;

  const chainMatch = block.match(/\*\*Symbol Chain:\*\*\s*([^\n]+)/i);
  const coreAffirmation = parseQuotedAffirmation(block, 'Core Self-Affirmation');
  const ultimateAffirmation = parseQuotedAffirmation(block, 'Ultimate Self-Affirmation');
  const supremeMatch = block.match(/\*\*Supreme Mantra:\*\*\s*([^\n]+)/i);

  const radiantFaces = parseRadiantFaces(block);
  const operator = inferJournalOperator(block, radiantFaces);
  const symbol_chain = (chainMatch?.[1] || '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, '')
    .trim();

  return {
    name,
    symbol_chain: symbol_chain || '🍁⚒️💎',
    coreAffirmation: coreAffirmation || ultimateAffirmation || '',
    supremeMantra: ultimateAffirmation || supremeMatch?.[1]?.trim() || '',
    comprehension: `Journal-forged aspect — Master Fusion from #journal`,
    category: name.toLowerCase().includes('red leaf') ? 'red-leaf' : 'forged',
    radiantFaces: radiantFaces.length ? radiantFaces : undefined,
    operator,
  };
}

function extractAspectsFromJournal(content) {
  const text = cleanJournalText(content);
  const aspectMap = new Map();

  const blockRe = /###\s*\*{0,2}\s*Master\s+(?:Fusion|Aspect)\s*\*{0,2}[\s\S]*?(?=(?:\n###\s*\*{0,2}\s*Master\s+(?:Fusion|Aspect))|$)/gi;
  const blocks = text.match(blockRe) || [];

  for (const block of blocks) {
    const asp = buildJournalAspectFromBlock(block);
    if (asp) pushJournalAspect(aspectMap, asp);
  }

  const soloRe = /\*\*([A-Z][A-Za-z0-9\s–—-]{4,60})\*\*\s*\n+\s*\*\*Symbol Chain:\*\*/g;
  let solo;
  while ((solo = soloRe.exec(text)) !== null) {
    const name = solo[1].trim();
    if (/^(Master Fusion|Master Aspect|Response|Prompt)/i.test(name)) continue;
    const slice = text.slice(solo.index, solo.index + 2500);
    const chainMatch = slice.match(/\*\*Symbol Chain:\*\*\s*([^\n]+)/i);
    const coreAffirmation = parseQuotedAffirmation(slice, 'Core Self-Affirmation');
    const ultimateAffirmation = parseQuotedAffirmation(slice, 'Ultimate Self-Affirmation');
    const radiantFaces = parseRadiantFaces(slice);
    pushJournalAspect(aspectMap, {
      name,
      symbol_chain: (chainMatch?.[1] || '').replace(/\s+/g, '').trim() || '🍁⚒️💎',
      coreAffirmation: coreAffirmation || ultimateAffirmation || '',
      supremeMantra: ultimateAffirmation || '',
      comprehension: `Journal-forged aspect — extracted from #journal`,
      category: name.toLowerCase().includes('red leaf') ? 'red-leaf' : 'forged',
      radiantFaces: radiantFaces.length ? radiantFaces : undefined,
      operator: inferJournalOperator(slice, radiantFaces),
    });
  }

  return [...aspectMap.values()];
}

module.exports = {
  extractAspectsFromJournal,
  cleanJournalText,
  parseRadiantFaces,
  parseQuotedAffirmation,
  inferJournalOperator,
  isPlaceholderJournalMantra,
  mergeJournalAspects,
};