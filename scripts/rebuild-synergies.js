/**
 * Rebuild synergies from Grok origin (both conversations) + journals + codex.
 * Run: node scripts/rebuild-synergies.js
 */
const db = require('../server/db');
const { discoverSynergies } = require('../server/services/synergy-discover');
const { rebuildSearchIndex } = require('../server/seed');

async function main() {
  await db.initDb();

  const before = db.prepare('SELECT COUNT(*) as c FROM synergies').get().c;
  db.prepare('DELETE FROM synergies').run();
  console.log(`Cleared ${before} existing synergies`);

  const { synergies, stats, aspectCount } = discoverSynergies(db);

  const insert = db.prepare(`
    INSERT INTO synergies (aspect_a, aspect_b, fusion_name, description, strength)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const s of synergies) {
    insert.run(s.aspect_a, s.aspect_b, s.fusion_name, s.description, s.strength);
  }

  rebuildSearchIndex();

  console.log('\nSynergy rebuild complete:');
  console.log(`  aspects in DB:     ${aspectCount}`);
  console.log(`  synergies inserted: ${synergies.length}`);
  console.log('  sources:', stats);
  console.log('\nTop synergies:');
  synergies.slice(0, 12).forEach((s) => {
    console.log(`  ${s.strength.toFixed(2)}  ${s.aspect_a} + ${s.aspect_b} → ${s.fusion_name}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});