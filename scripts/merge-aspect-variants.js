/**
 * Merge aspect rows that differ only by junk suffixes (Master Aspect parens, etc.)
 * Run: node scripts/merge-aspect-variants.js
 */
const db = require('../server/db');
const { stripVariantSuffix } = require('../server/services/grok-extract');
const { rebuildSearchIndex } = require('../server/seed');
const fs = require('fs');
const path = require('path');

async function main() {
  await db.initDb();
  const rows = db.prepare('SELECT id, name, mentions, detail_json FROM aspects').all();
  let merged = 0;

  for (const row of rows) {
    const base = stripVariantSuffix(row.name);
    if (!base || base === row.name) continue;
    const canon = db.prepare('SELECT id, name, mentions, detail_json FROM aspects WHERE name = ?').get(base);
    if (!canon || canon.id === row.id) continue;

    const canonFaces = JSON.parse(canon.detail_json || '{}').radiantFaces?.length || 0;
    const rowFaces = JSON.parse(row.detail_json || '{}').radiantFaces?.length || 0;
    const keepDetail = rowFaces > canonFaces ? row.detail_json : canon.detail_json;

    db.prepare('UPDATE aspects SET mentions = mentions + ?, detail_json = COALESCE(?, detail_json) WHERE id = ?').run(
      row.mentions,
      keepDetail,
      canon.id,
    );
    db.prepare('DELETE FROM aspects WHERE id = ?').run(row.id);
    console.log(`  merged: ${row.name} → ${base}`);
    merged += 1;
  }

  rebuildSearchIndex();
  const all = db.prepare('SELECT name, mentions FROM aspects ORDER BY mentions DESC').all();
  fs.writeFileSync(
    path.join(__dirname, '../data/aspects-index.json'),
    JSON.stringify({ total: all.length, aspects: all.map((r) => ({ name: r.name, mentions: r.mentions })) }, null, 2),
  );
  console.log(`Merged ${merged} variant rows. Registry: ${all.length} aspects.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});