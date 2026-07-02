/**
 * Delete one aspect and related refs. Usage:
 *   node scripts/_delete-aspect.js "Aspect Name"
 */
require('./load-env');
const db = require('../server/db');
const { rebuildSearchIndexFromStored } = require('../server/seed');
const { invalidateAspectFaceCache } = require('../server/services/aspect-face-cache');

function deleteAspect(db, aspect) {
  const name = aspect.name;
  db.prepare('DELETE FROM synergies WHERE aspect_a = ? OR aspect_b = ?').run(name, name);
  db.prepare('DELETE FROM visualizations WHERE aspect_link = ?').run(name);

  const fusions = db.prepare('SELECT id, inputs_json, output_aspect FROM alchemy_fusions').all();
  for (const f of fusions) {
    const inputs = JSON.parse(f.inputs_json || '[]');
    if (f.output_aspect === name || inputs.includes(name)) {
      db.prepare('DELETE FROM alchemy_fusions WHERE id = ?').run(f.id);
    }
  }

  const insights = db.prepare('SELECT id, aspect_links_json FROM insights').all();
  for (const row of insights) {
    const links = JSON.parse(row.aspect_links_json || '[]');
    if (!links.includes(name)) continue;
    const next = links.filter((n) => n !== name);
    db.prepare('UPDATE insights SET aspect_links_json = ? WHERE id = ?').run(JSON.stringify(next), row.id);
  }

  db.prepare('DELETE FROM search_index WHERE entity_type = ? AND title = ?').run('aspect', name);
  db.prepare('DELETE FROM aspects WHERE id = ?').run(aspect.id);
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: node scripts/_delete-aspect.js "Aspect Name"');
    process.exit(1);
  }
  await db.initDb();
  const aspect = db.prepare('SELECT * FROM aspects WHERE name = ?').get(name);
  if (!aspect) {
    console.error(`Not found: ${name}`);
    process.exit(1);
  }
  deleteAspect(db, aspect);
  invalidateAspectFaceCache();
  rebuildSearchIndexFromStored();
  console.log(`Deleted: ${name} (id ${aspect.id})`);
}

main().catch((e) => { console.error(e); process.exit(1); });