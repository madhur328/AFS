/**
 * Merge duplicate aspect rows into canonical names (sum mentions, keep best detail).
 * Run: node scripts/merge-canonical-aspects.js
 */
const db = require('../server/db');
const { ASPECT_ALIASES } = require('../server/services/symbols');
const { rebuildSearchIndex } = require('../server/seed');
const { invalidateAspectFaceCache, buildAspectFaceCache } = require('../server/services/aspect-face-cache');

function deleteAspectRefs(db, name) {
  db.prepare('DELETE FROM synergies WHERE aspect_a = ? OR aspect_b = ?').run(name, name);
  db.prepare('DELETE FROM visualizations WHERE aspect_link = ?').run(name);
  db.prepare('DELETE FROM search_index WHERE entity_type = ? AND title = ?').run('aspect', name);
}

async function main() {
  await db.initDb();
  const aspects = db.prepare('SELECT * FROM aspects').all();
  const byName = new Map(aspects.map((a) => [a.name, a]));

  let merged = 0;
  let deleted = 0;

  for (const [alias, canonical] of Object.entries(ASPECT_ALIASES)) {
    const dup = byName.get(alias);
    const target = byName.get(canonical);
    if (!dup) continue;

    if (!target) {
      db.prepare('UPDATE aspects SET name = ? WHERE id = ?').run(canonical, dup.id);
      byName.delete(alias);
      byName.set(canonical, { ...dup, name: canonical });
      console.log(`  rename: ${alias} → ${canonical}`);
      merged += 1;
      continue;
    }

    const totalMentions = (target.mentions || 0) + (dup.mentions || 0);
    const keepDetail = (target.detail_json?.length || 0) >= (dup.detail_json?.length || 0)
      ? target.detail_json
      : dup.detail_json;

    db.prepare('UPDATE aspects SET mentions = ?, detail_json = COALESCE(?, detail_json) WHERE id = ?').run(
      totalMentions,
      keepDetail,
      target.id
    );
    deleteAspectRefs(db, alias);
    db.prepare('DELETE FROM aspects WHERE id = ?').run(dup.id);
    byName.delete(alias);
    console.log(`  merge: ${alias} → ${canonical} (+${dup.mentions} mentions)`);
    merged += 1;
    deleted += 1;
  }

  invalidateAspectFaceCache();
  buildAspectFaceCache(db);
  rebuildSearchIndex();
  console.log(`\nMerged ${merged} aliases, deleted ${deleted} duplicate rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});