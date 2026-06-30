/**
 * Seed Save8 Red Leaf AFS insight codex from data/afs-insights-codex.json
 * Run: node scripts/seed-afs-insights.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { rebuildSearchIndex } = require('../server/seed');

const CODEX_PATH = path.join(__dirname, '..', 'data', 'afs-insights-codex.json');
const SOURCE = 'save8-codex';

function sectionTag(sectionId) {
  return `section:${sectionId}`;
}

async function main() {
  await db.initDb();
  const codex = JSON.parse(fs.readFileSync(CODEX_PATH, 'utf8'));

  db.prepare('DELETE FROM insights WHERE source = ?').run(SOURCE);

  const insert = db.prepare(`
    INSERT INTO insights (title, body, source, tags_json, aspect_links_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  let count = 0;

  if (codex.synthesis) {
    const s = codex.synthesis;
    insert.run(
      s.title,
      s.body,
      SOURCE,
      JSON.stringify([...(s.tags || []), 'section:synthesis', 'save8', 'red-leaf']),
      JSON.stringify(s.aspectLinks || [])
    );
    count += 1;
  }

  for (const section of codex.sections || []) {
    for (const insight of section.insights || []) {
      const tags = [
        ...(insight.tags || []),
        sectionTag(section.id),
        'save8',
        'red-leaf',
      ];
      insert.run(
        insight.title,
        insight.body,
        SOURCE,
        JSON.stringify(tags),
        JSON.stringify(insight.aspectLinks || [])
      );
      count += 1;
    }
  }

  rebuildSearchIndex();
  console.log(`Seeded ${count} Save8 codex insights from ${CODEX_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});