const { addEternalPrefix } = require('./symbols');

function parseDetail(row) {
  try {
    return JSON.parse(row?.detail_json || '{}');
  } catch {
    return {};
  }
}

function aspectFaceNames(faces = []) {
  return faces.map((f) => f.name.toLowerCase()).sort().join('|');
}

function fingerprintFromJournalAsp(asp) {
  return {
    symbol: (asp.symbol_chain || '').replace(/\s/g, ''),
    faces: aspectFaceNames(asp.radiantFaces),
  };
}

function fingerprintFromRow(row) {
  const detail = parseDetail(row);
  return {
    symbol: (row.symbol_chain || '').replace(/\s/g, ''),
    faces: aspectFaceNames(detail.radiantFaces),
  };
}

function fingerprintsDiffer(a, b) {
  if (!a.faces || !b.faces) return false;
  if (!a.symbol && !b.symbol) return a.faces !== b.faces;
  return a.symbol !== b.symbol || a.faces !== b.faces;
}

function isJournalSourcedRow(row) {
  if (/journal-forged|#journal/i.test(row.comprehension || '')) return true;
  const detail = parseDetail(row);
  return (
    detail.integration?.originSource === 'journal'
    || /forged from journal/i.test(detail.identity || '')
  );
}

function isGrokOrCorpusRow(row) {
  if (/grok origin|master fusion from grok/i.test(row.comprehension || '')) return true;
  const detail = parseDetail(row);
  return ['master-fusion', 'grok', 'EOT'].includes(detail.integration?.originSource);
}

function detectVersionFork(existing, journalAsp) {
  const eternalName = addEternalPrefix(journalAsp.name);
  if (!eternalName || !/^Red Leaf /i.test(journalAsp.name)) {
    return { shouldSplit: false };
  }
  if (!journalAsp.radiantFaces?.length) return { shouldSplit: false };

  const existingFp = fingerprintFromRow(existing);
  const journalFp = fingerprintFromJournalAsp(journalAsp);
  if (!fingerprintsDiffer(existingFp, journalFp)) {
    return { shouldSplit: false };
  }
  if (isJournalSourcedRow(existing)) {
    return { shouldSplit: false };
  }
  if (!isGrokOrCorpusRow(existing) && !existingFp.faces) {
    return { shouldSplit: false };
  }

  return { shouldSplit: true, eternalName, existingFp, journalFp };
}

function buildEternalPromotionDetail(existing, eternalName, journalName) {
  const detail = parseDetail(existing);
  const integration = {
    ...(detail.integration || {}),
    originSource: detail.integration?.originSource || 'master-fusion',
    saveCodex: detail.integration?.saveCodex || 'Save8',
    priorVersion: journalName,
    evolution: [`← ${journalName} (journal EOT prior)`],
    strengthens: [
      ...(detail.integration?.strengthens || []),
      journalName,
    ].filter((v, i, a) => a.indexOf(v) === i),
  };

  return JSON.stringify({
    identity: detail.identity?.replace(existing.name, eternalName)
      || `${eternalName} — Master Fusion from Grok origin`,
    coreAffirmation: detail.coreAffirmation || existing.mantra,
    supremeMantra: detail.supremeMantra || existing.mantra,
    radiantFaces: detail.radiantFaces,
    integration,
  });
}

function splitVersionFork(db, existing, journalAsp, buildJournalAspectDetail) {
  const fork = detectVersionFork(existing, journalAsp);
  if (!fork.shouldSplit) return null;

  const { eternalName } = fork;
  const eternalExists = db
    .prepare('SELECT id, name FROM aspects WHERE LOWER(name) = LOWER(?)')
    .get(eternalName);

  const insert = db.prepare(`
    INSERT INTO aspects (
      name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
      comprehension, category, base_layer_link, is_base_layer, detail_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const updateBase = db.prepare(`
    UPDATE aspects SET
      symbol_chain = ?,
      mantra = ?,
      comprehension = ?,
      detail_json = ?
    WHERE id = ?
  `);

  let promoted = null;
  if (!eternalExists) {
    const eternalDetailJson = buildEternalPromotionDetail(existing, eternalName, journalAsp.name);
    const eternalDetail = JSON.parse(eternalDetailJson);
    const info = insert.run(
      eternalName,
      existing.symbol_chain,
      eternalDetail.supremeMantra || eternalDetail.coreAffirmation || existing.mantra,
      existing.tier,
      existing.potential_score,
      existing.mentions,
      existing.proficiency,
      `Grok origin Master Fusion — promoted from ${journalAsp.name} journal fork`,
      existing.category,
      existing.base_layer_link,
      existing.is_base_layer,
      eternalDetailJson
    );
    promoted = { name: eternalName, id: info.lastInsertRowid };
  }

  const journalDetailJson = buildJournalAspectDetail(journalAsp, existing.tier);
  const journalDetail = JSON.parse(journalDetailJson);
  journalDetail.integration = {
    ...(journalDetail.integration || {}),
    originSource: 'journal',
    evolution: [
      ...(journalDetail.integration?.evolution || []),
      `→ ${eternalName} (Grok Master Fusion)`,
    ],
  };
  updateBase.run(
    journalAsp.symbol_chain?.trim() || existing.symbol_chain,
    journalAsp.coreAffirmation?.trim() || existing.mantra,
    journalAsp.comprehension || `Journal-forged aspect — Master Fusion from #journal`,
    JSON.stringify(journalDetail),
    existing.id
  );

  return {
    action: promoted ? 'split' : 'base-restored',
    eternal: promoted || { name: eternalName, id: eternalExists.id },
    base: { name: journalAsp.name, id: existing.id },
  };
}

function storedFacesDifferFromCorpus(storedFaces, corpusFaces) {
  if (!storedFaces?.length || !corpusFaces?.length) return false;
  return aspectFaceNames(storedFaces) !== aspectFaceNames(corpusFaces);
}

function shouldPreferStoredFaces(aspect, stored, corpusFaces) {
  const useStored = stored.radiantFaces?.length;
  if (!useStored) return false;
  if (isJournalSourcedRow(aspect) || stored.integration?.originSource === 'journal') return true;
  return storedFacesDifferFromCorpus(stored.radiantFaces, corpusFaces);
}

module.exports = {
  parseDetail,
  fingerprintFromJournalAsp,
  fingerprintFromRow,
  fingerprintsDiffer,
  isJournalSourcedRow,
  shouldPreferStoredFaces,
  storedFacesDifferFromCorpus,
  detectVersionFork,
  splitVersionFork,
  buildEternalPromotionDetail,
  addEternalPrefix,
};