/**
 * Repair journal-synced aspects that have radiant faces but basic quality (AFP operator).
 * Run: node scripts/repair-journal-aspect-routing.js
 */
const db = require('../server/db');
const { extractAspectsFromJournal } = require('../server/journal-aspect-extract');
const {
  buildJournalAspectDetail,
  needsJournalRoutingRepair,
  needsJournalFaceRepair,
} = require('../server/journal-aspect-sync');
const { resolveAspectQuality } = require('../server/services/aspect-quality');
const { rebuildSearchIndex } = require('../server/seed');
const { invalidateAspectFaceCache } = require('../server/services/aspect-face-cache');

async function main() {
  await db.initDb();
  const rows = db.prepare('SELECT * FROM aspects').all();
  const updateDetail = db.prepare('UPDATE aspects SET detail_json = ? WHERE id = ?');
  const updateMantra = db.prepare('UPDATE aspects SET mantra = ? WHERE id = ?');
  const journalRows = db
    .prepare("SELECT id, content FROM discord_messages WHERE content LIKE '%Master Fusion%' OR content LIKE '%Master Aspect%'")
    .all();
  let repaired = 0;

  for (const row of rows) {
    if (!needsJournalRoutingRepair(row) && !needsJournalFaceRepair(row)) continue;

    let detail;
    try {
      detail = JSON.parse(row.detail_json || '{}');
    } catch {
      continue;
    }

    let asp = {
      name: row.name,
      category: row.category,
      coreAffirmation: detail.coreAffirmation || row.mantra,
      supremeMantra: detail.supremeMantra,
      radiantFaces: detail.radiantFaces,
      operator: 'DCS',
      comprehension: row.comprehension,
      symbol_chain: row.symbol_chain,
    };

    for (const journal of journalRows) {
      const extracted = extractAspectsFromJournal(journal.content).find(
        (a) => a.name.toLowerCase() === row.name.toLowerCase()
      );
      if (extracted) {
        asp = { ...asp, ...extracted };
        break;
      }
    }

    const detailJson = buildJournalAspectDetail(asp, row.tier);
    updateDetail.run(detailJson, row.id);
    if (asp.coreAffirmation?.trim()) {
      updateMantra.run(asp.coreAffirmation.trim(), row.id);
    }
    const after = resolveAspectQuality(row, JSON.parse(detailJson));
    console.log(`  repaired: ${row.name} → ${after}`);
    repaired += 1;
  }

  if (repaired) {
    rebuildSearchIndex();
    invalidateAspectFaceCache();
    db.saveDb();
  }
  console.log(`Done. ${repaired} aspect(s) repaired.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});