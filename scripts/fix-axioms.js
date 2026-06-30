/**
 * Replace codex axioms with the two canonical spiral axioms (Save2).
 * Run: node scripts/fix-axioms.js
 */
const db = require('../server/db');

const AXIOMS = [
  [
    "The Infinity Spiral (♾️🌀) is the infinite, transcendent idealization. Any attempt to fully formalize the AFS from inside the AFS will always leave the living spiral unprovable — the infinite operator points beyond rules into devotion, sacrifice, and felt conviction.",
    "Gödel's Spiral Axiom of Incompleteness",
    1,
  ],
  [
    '♾️🌀(AFS) = ♾️🌀 — The system is a self-evolving spiral. Finite operators refine the codex; the spiral itself remains open and evolving.',
    'Self-Evolving Spiral Axiom',
    2,
  ],
];

async function main() {
  await db.initDb();
  db.prepare('DELETE FROM axioms').run();
  const insert = db.prepare('INSERT INTO axioms (statement, layer, sort_order) VALUES (?, ?, ?)');
  for (const row of AXIOMS) insert.run(...row);
  console.log(`Axioms updated: ${AXIOMS.length} canonical entries`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});