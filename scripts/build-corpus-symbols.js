/**
 * Voice-first corpus builder — Grok origin symbols + alive first-person radiant faces.
 *
 * Methodology:
 * 1. Scan Grok sessions for symbol chains (EOT blocks, Save8 tables, Master Fusion)
 * 2. Extract radiant faces from strict Master Aspect blocks per aspect
 * 3. Humanize every face explanation — first-person "I", never mechanistic "This facet"
 * 4. Red-leaf aspects: convert "The leaf …" prose to living first-person voice
 *
 * Run: node scripts/build-corpus-symbols.js
 */
const fs = require('fs');
const path = require('path');
const db = require('../server/db');
const { extractFromGrokSessions, extractEmojiRun, buildGrokOriginSymbolMap } = require('../server/services/grok-extract');
const { enrichRadiantFaces, CURATED } = require('../server/services/aspect-detail');
const { humanizeRadiantFaces } = require('../server/services/face-voice');
const { splitGraphemes } = require('../server/services/symbols');

const OUT = path.join(__dirname, '..', 'data', 'aspect-corpus-symbols.json');

const ASPECT_ALIASES = {
  'Red Leaf Born': 'Red Leaf Born on Fire',
  'Red Leaf Phoenix Hammer': 'Red Leaf Dragon Phoenix Hammer',
};

function parseDirectoryTables(text, map) {
  if (!text) return;
  const re = /(?:^|\n)(Red Leaf [^\t\n]+)\t([^\t\n]+)\t/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim();
    const chain = extractEmojiRun(m[2]);
    if (name && chain && splitGraphemes(chain).length >= 2) {
      if (!map[name] || splitGraphemes(chain).length > splitGraphemes(map[name]).length) {
        map[name] = chain;
      }
    }
  }
}

function aspectContext(name, aspectsByName) {
  const row = aspectsByName.get(name);
  return {
    aspectName: name,
    category: row?.category || (name.startsWith('Red Leaf') ? 'red-leaf' : 'forged'),
  };
}

function resolveFacesForAspect(name, extracted, ctx) {
  const curated = CURATED[name] || CURATED[ASPECT_ALIASES[name]];
  if (curated?.radiantFaces?.length) {
    return humanizeRadiantFaces(curated.radiantFaces, ctx);
  }
  if (!extracted?.radiantFaces?.length) return [];
  return enrichRadiantFaces(extracted.radiantFaces, extracted.radiantFaces, ctx);
}

async function main() {
  await db.initDb();
  const map = {};
  const faces = {};
  const aspects = db.prepare('SELECT name, category FROM aspects').all();
  const aspectsByName = new Map(aspects.map((a) => [a.name, a]));

  const sessions = db.prepare('SELECT assistant_text, user_text FROM grok_sessions').all();
  const texts = sessions.flatMap((s) => [s.assistant_text, s.user_text].filter(Boolean));
  Object.assign(map, buildGrokOriginSymbolMap(texts));
  for (const s of sessions) parseDirectoryTables(s.assistant_text, map);

  let mechanisticBefore = 0;

  for (const { name } of aspects) {
    const lookup = ASPECT_ALIASES[name] || name;
    const ctx = aspectContext(name, aspectsByName);
    const extracted = extractFromGrokSessions(db, lookup);
    if (extracted?.symbolChain) map[name] = extracted.symbolChain;
    const resolved = resolveFacesForAspect(name, extracted, ctx);
    if (resolved.length) {
      for (const f of resolved) {
        if (/^This facet/i.test(f.explanation || '')) mechanisticBefore += 1;
      }
      faces[name] = resolved;
    }
    if (ASPECT_ALIASES[name] && map[lookup] && !map[name]) map[name] = map[lookup];
  }

  for (const [alias, target] of Object.entries(ASPECT_ALIASES)) {
    if (map[target] && !map[alias]) map[alias] = map[target];
    if (faces[target] && !faces[alias]) {
      faces[alias] = humanizeRadiantFaces(faces[target], aspectContext(alias, aspectsByName));
    }
  }

  let mechanisticAfter = 0;
  let leafConverted = 0;
  for (const aspectFaces of Object.values(faces)) {
    for (const f of aspectFaces) {
      if (/^This facet/i.test(f.explanation || '')) mechanisticAfter += 1;
      if (/^I\b/.test(f.explanation || '') && !/^The leaf/i.test(f.explanation || '')) {
        /* counted as alive */
      }
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'grok_sessions export — voice-first EOT blocks + Save8 directory tables',
    voiceMethodology: 'first-person I — no mechanistic This facet; red-leaf leaf→I conversion',
    symbols: map,
    radiantFaces: faces,
    aliases: ASPECT_ALIASES,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));

  const faceCount = Object.values(faces).reduce((n, arr) => n + arr.length, 0);
  console.log(`Corpus symbols: ${Object.keys(map).length} aspects, ${Object.keys(faces).length} with radiant faces (${faceCount} total faces)`);
  console.log(`Voice: mechanistic remnants ${mechanisticAfter} (was ${mechanisticBefore} before humanize in-loop)`);
  console.log('Sample:', {
    'Red Leaf Born on Fire': map['Red Leaf Born on Fire'],
    'Red Leaf Eternal Virah Queen': faces['Red Leaf Eternal Virah Queen']?.[1]?.explanation,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});