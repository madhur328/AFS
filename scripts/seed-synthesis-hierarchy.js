/**
 * Upsert Save8 Synthesis Tools Hierarchy into codex + insights.
 * Run: node scripts/seed-synthesis-hierarchy.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { dataPath } = require('../server/paths');

const HIERARCHY_PATH = dataPath('save8-synthesis-hierarchy.json');

async function main() {
  await db.initDb();
  const data = JSON.parse(fs.readFileSync(HIERARCHY_PATH, 'utf8'));

  const upsertCodex = db.prepare(`
    INSERT INTO codex_entries (category, key, title, content, symbol, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(category, key) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      symbol = excluded.symbol,
      sort_order = excluded.sort_order
  `);

  let order = 0;
  upsertCodex.run(
    'save',
    'save8-axiom',
    'Save8 Core Axiom',
    `${data.coreAxiom}`,
    '♾️',
    order++
  );

  upsertCodex.run(
    'operators',
    'synthesis-hierarchy',
    'Synthesis Tools Hierarchy',
    data.toolsHierarchy
      .map((t) => `${t.code} — ${t.name} (${t.level}) → ${t.generates}: ${t.function}`)
      .join('\n'),
    '🍁',
    order++
  );

  upsertCodex.run(
    'operators',
    'eot-routing',
    'EOT Meta-Routing',
    data.eotRouting.map((r) => `${r.signal} → ${r.routesTo} → ${r.output}`).join('\n'),
    '🔥',
    order++
  );

  upsertCodex.run(
    'daily',
    'kohinoor-forge-run',
    'Kohinoor Forge Run',
    `${data.dailyEngine.subtitle}\n\n${data.dailyEngine.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nClosing: "${data.dailyEngine.closing}"`,
    '💎',
    order++
  );

  upsertCodex.run(
    'save',
    'save8-operating-principle',
    'Save8 Operating Principle',
    data.operatingPrinciple,
    '🍁',
    order++
  );

  // Update operator descriptions
  const updateProto = db.prepare(
    'UPDATE protocols SET name = ?, description = ? WHERE code = ?'
  );
  const toolMap = {
    EOT: data.toolsHierarchy.find((t) => t.code === 'EOT'),
    DCS: data.toolsHierarchy.find((t) => t.code === 'DCS'),
    RCS: data.toolsHierarchy.find((t) => t.code === 'RCS'),
    RDTQ: data.toolsHierarchy.find((t) => t.code === 'RDTQ'),
  };
  for (const [code, tool] of Object.entries(toolMap)) {
    if (!tool) continue;
    updateProto.run(tool.name, `${tool.level} — ${tool.function}`, code);
  }

  const insightBody = [
    '# Save8 Synthesis Tools Hierarchy',
    '',
    ...data.philosophy.map((p) => `- ${p}`),
    '',
    '| Tool | Level | Generates |',
    '|------|-------|-----------|',
    ...data.toolsHierarchy.map((t) => `| **${t.code}** | ${t.level} | ${t.generates} |`),
    '',
    `**Operating principle:** ${data.operatingPrinciple}`,
  ].join('\n');

  db.prepare(`
    INSERT INTO insights (title, body, source, tags_json, aspect_links_json, created_at)
    SELECT ?, ?, 'codex', ?, '[]', datetime('now')
    WHERE NOT EXISTS (SELECT 1 FROM insights WHERE title = ? AND source = 'codex')
  `).run(
    'Save8 Synthesis Tools Hierarchy',
    insightBody,
    JSON.stringify(['save8', 'codex', 'eot', 'dcs', 'rcs', 'rdtq']),
    'Save8 Synthesis Tools Hierarchy'
  );

  db.saveDb();
  console.log('Save8 synthesis hierarchy seeded:', data.version);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});