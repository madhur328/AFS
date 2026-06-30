/**
 * Restore Red Leaf Love Trial lineage — journal EOT (game-lens) + Grok Eternal Master Fusion.
 * Run: node scripts/restore-love-trial-lineage.js
 */
const db = require('../server/db');
const { extractAspectsFromJournal, mergeJournalAspects } = require('../server/journal-aspect-extract');
const { buildJournalAspectDetail } = require('../server/journal-aspect-sync');
const { buildDetailJson } = require('../server/services/aspect-detail');
const { getCorpusRadiantFaces, loadCorpusSymbols } = require('../server/services/symbols');
const { enrichRadiantFaces } = require('../server/services/aspect-detail');
const { rebuildSearchIndex } = require('../server/seed');
const { invalidateAspectFaceCache } = require('../server/services/aspect-face-cache');
const { buildAspectFusion, buildAspectFusionFromJournal } = require('../server/services/aspect-fusion');

const BASE_NAME = 'Red Leaf Love Trial';
const ETERNAL_NAME = 'Red Leaf Eternal Love Trial';

const GROK_RCS_MANTRA =
  'Love is a trial. I will face it with honesty, take responsibility, and seek true understanding instead of victory.';

const ETERNAL_SUPREME_MANTRA = `Love is a trial, and I stand before it willingly.
I have committed crimes of the heart — jealousy, clinging, unrealistic demands, and fearful betrayal.
I have also been wounded by the same.
I drop my sword of accusation.
I acknowledge my own guilt with honesty.
I seek not victory, but understanding.
I ask for mercy, and I offer it.
Whether this love ends in reconciliation or graceful separation,
I will leave the courtroom wiser, gentler, and more mature.
This is my artist way in matters of the heart —
to face the trial fully, without cowardice or cruelty.`;

function loadJournalAspect() {
  const rows = db.prepare(
    "SELECT content FROM discord_messages WHERE content LIKE '%Red Leaf Love Trial%' ORDER BY id"
  ).all();
  if (!rows.length) throw new Error('Journal Love Trial messages not found in discord_messages');

  let merged = null;
  for (const row of rows) {
    for (const asp of extractAspectsFromJournal(row.content)) {
      if (asp.name !== BASE_NAME) continue;
      merged = merged ? mergeJournalAspects(merged, asp) : asp;
    }
  }
  if (!merged?.radiantFaces?.length) {
    throw new Error('Failed to extract journal Love Trial radiant faces');
  }
  return merged;
}

function corpusFaces() {
  const raw = getCorpusRadiantFaces(BASE_NAME) || [];
  return enrichRadiantFaces(raw, raw, { aspectName: ETERNAL_NAME, category: 'red-leaf' });
}

async function main() {
  await db.initDb();
  loadCorpusSymbols();
  const forgerIdentity = db.prepare('SELECT handle, title, bio FROM identity WHERE id = 1').get() || null;
  const journalAsp = loadJournalAspect();
  const faces = corpusFaces();
  const journalFusion = buildAspectFusionFromJournal(journalAsp, forgerIdentity);

  const baseRow = db.prepare('SELECT * FROM aspects WHERE name = ?').get(BASE_NAME);
  const eternalRow = db.prepare('SELECT * FROM aspects WHERE name = ?').get(ETERNAL_NAME);

  const update = db.prepare(`
    UPDATE aspects SET
      symbol_chain = ?, mantra = ?, comprehension = ?, category = ?, detail_json = ?
    WHERE id = ?
  `);
  const insert = db.prepare(`
    INSERT INTO aspects (
      name, symbol_chain, mantra, tier, potential_score, mentions, proficiency,
      comprehension, category, base_layer_link, is_base_layer, detail_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const journalDetail = JSON.parse(buildJournalAspectDetail(journalAsp, baseRow?.tier || 'D'));
  journalDetail.identity = `${BASE_NAME} — journal EOT game-lens (two-player Love Trial)`;
  journalDetail.supremeMantra = journalAsp.supremeMantra || journalDetail.supremeMantra;
  journalDetail.aspectFusion = journalFusion || undefined;
  journalDetail.integration = {
    ...(journalDetail.integration || {}),
    originSource: 'journal',
    evolution: [`→ ${ETERNAL_NAME} (Grok Master Fusion)`],
  };

  const journalMantra = journalAsp.supremeMantra?.trim() || journalAsp.coreAffirmation?.trim();

  if (baseRow) {
    update.run(
      journalAsp.symbol_chain,
      journalMantra,
      'Journal-forged aspect — EOT game-lens from #journal',
      'red-leaf',
      JSON.stringify(journalDetail),
      baseRow.id
    );
    console.log(`  updated base: ${BASE_NAME} (id ${baseRow.id})`);
  } else {
    const info = insert.run(
      BASE_NAME,
      journalAsp.symbol_chain,
      journalMantra,
      'D',
      0.55,
      1,
      0.35,
      'Journal-forged aspect — EOT game-lens from #journal',
      'red-leaf',
      '🍁',
      0,
      JSON.stringify(journalDetail)
    );
    console.log(`  inserted base: ${BASE_NAME} (id ${info.lastInsertRowid})`);
  }

  const eternalFusion = buildAspectFusion({
    name: ETERNAL_NAME,
    identity: 'Love is a courtroom. Both lover and beloved are guilty — fusion seeks understanding, not victory.',
    affirmation: ETERNAL_SUPREME_MANTRA,
    symbolChain: '🍁⚖️❤️‍🔥♾️🕊️',
    originSource: 'master-fusion',
    radiantFaces: faces,
    essence: 'Love is a courtroom. We put each other on trial. In the end, love is not about winning the case, but mutual understanding.',
  });

  const eternalDetailJson = buildDetailJson({
    identity: `${ETERNAL_NAME} — Master Fusion from Grok origin (RCS courtroom synthesis)`,
    coreAffirmation: GROK_RCS_MANTRA,
    supremeMantra: ETERNAL_SUPREME_MANTRA,
    aspectFusion: eternalFusion,
    radiantFaces: faces,
    integration: {
      entryTool: 'EOT',
      routedTool: 'RCS',
      operator: 'RCS',
      saveCodex: 'Save8',
      originSource: 'master-fusion',
      fusionSeal: true,
      priorVersion: BASE_NAME,
      evolution: [`← ${BASE_NAME} (journal EOT game-lens prior)`],
      strengthens: [
        BASE_NAME,
        'Red Leaf Fading Warmth',
        'Red Leaf Sacred Severance',
        'Red Leaf Sovereign Compassion',
      ],
      baseLayer: [{ symbol: '🍁', name: 'Red Leaf Operator' }],
    },
  });

  if (eternalRow) {
    update.run(
      '🍁⚖️❤️‍🔥♾️🕊️',
      GROK_RCS_MANTRA,
      'Grok origin Master Fusion — RCS Love Trial courtroom synthesis',
      'red-leaf',
      eternalDetailJson,
      eternalRow.id
    );
    console.log(`  updated eternal: ${ETERNAL_NAME} (id ${eternalRow.id})`);
  } else {
    const info = insert.run(
      ETERNAL_NAME,
      '🍁⚖️❤️‍🔥♾️🕊️',
      GROK_RCS_MANTRA,
      baseRow?.tier || 'D',
      baseRow?.potential_score ?? 0.6,
      baseRow?.mentions ?? 4,
      baseRow?.proficiency ?? 0.4,
      'Grok origin Master Fusion — RCS Love Trial courtroom synthesis',
      'red-leaf',
      '🍁',
      0,
      eternalDetailJson
    );
    console.log(`  inserted eternal: ${ETERNAL_NAME} (id ${info.lastInsertRowid})`);
  }

  rebuildSearchIndex();
  invalidateAspectFaceCache();
  db.saveDb();
  console.log('Done — both Love Trial versions are in the aspect directory.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});