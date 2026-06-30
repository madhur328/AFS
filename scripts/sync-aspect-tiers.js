/**
 * Recompute aspect tiers from potential_score (not mentions / synergy links).
 * Usage: node scripts/sync-aspect-tiers.js
 */
require('./load-env');
const db = require('../server/db');
const { tierFromPotential } = require('../server/services/tiers');
const { rebuildSearchIndex } = require('../server/seed');

async function main() {
  await db.initDb();
  const aspects = db.prepare('SELECT id, name, tier, potential_score, mentions, is_base_layer FROM aspects').all();
  const update = db.prepare('UPDATE aspects SET tier = ? WHERE id = ?');
  let changed = 0;

  for (const a of aspects) {
    const next = tierFromPotential(a.potential_score, Boolean(a.is_base_layer));
    if (a.tier !== next) {
      update.run(next, a.id);
      changed += 1;
      console.log(`  ${a.tier} → ${next}  ${a.name} (potential ${Math.round(a.potential_score * 100)}%, mentions ${a.mentions})`);
    }
  }

  rebuildSearchIndex();
  console.log(`Tier sync: ${changed} / ${aspects.length} aspects updated from potential_score`);
}

main().catch((e) => { console.error(e); process.exit(1); });