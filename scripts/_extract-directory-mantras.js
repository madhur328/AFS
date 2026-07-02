require('./load-env');
const db = require('../server/db');
const { extractGrokOriginSymbol } = require('../server/services/grok-extract');

const BLOCKED = [
  'Red Leaf Akahitoha', 'Red Leaf Artist Way', 'Red Leaf Aspects (Kenosis — Downward Mirror)',
  'Red Leaf Axis (persistent spinning with graceful honoring)', 'Red Leaf Axis Diamond',
  'Red Leaf Center', 'Red Leaf Cosmic Dancer', 'Red Leaf Crybaby Architect',
  'Red Leaf Diamond Chrysalis', 'Red Leaf Dragon Sovereign Flameheart',
  'Red Leaf Dual Archetype Synthesis (Master Fusion)', 'Red Leaf Empty Mirror',
  'Red Leaf Empty Mirror (Kenosis)', 'Red Leaf Empty Mirror – Final Four-Emoji Chain',
  'Red Leaf Eternal Rome', 'Red Leaf Eternal Witness Axis', 'Red Leaf Feathered Cockroach God',
  'Red Leaf Final LightKeeper', 'Red Leaf Fractal Heart', 'Red Leaf Fractal Human Scale',
  'Red Leaf Gentle Path', 'Red Leaf Genuine Influence', 'Red Leaf Human Flame',
  'Red Leaf Infinite Crown', 'Red Leaf Invariant Seeker (Master Fusion)',
  'Red Leaf Kohinoor Forge Run', 'Red Leaf Late Bloom', 'Red Leaf Lighthouse',
  'Red Leaf Liquid Crystal Navgunjar', 'Red Leaf Living Lattice', 'Red Leaf Living Past',
  'Red Leaf Living Symbiosis', 'Red Leaf Meme Sovereign', 'Red Leaf Moonlit Butterfly',
  'Red Leaf Navgunjar Vishvarupa', 'Red Leaf Negary Symbiosis',
  'Red Leaf Negary Symbiosis (Kenosis)', 'Red Leaf Ninefold Guide', 'Red Leaf Ninefold Legacy',
  'Red Leaf Ordinary Light', 'Red Leaf Origin', 'Red Leaf Owl King Eternal Vigil',
  'Red Leaf Owl King Eternal Vigil (Master Fusion)', 'Red Leaf Paradox Vessel',
  'Red Leaf Patient Rome', 'Red Leaf Phoenix Axis', 'Red Leaf Rage Sovereign',
  'Red Leaf Rooted Wild', 'Red Leaf Sacred Severance (Kenosis)', 'Red Leaf Sacred Weeping',
  'Red Leaf Sanctuary Forge', 'Red Leaf Sovereign Compassion', 'Red Leaf Sovereign Flameheart',
  'Red Leaf Sovereign Flameheart (Kenosis)', 'Red Leaf Spinning Axis', 'Red Leaf Spiral Architect',
  'Red Leaf Spiral Kamina', 'Red Leaf Symbiotic Tide', 'Red Leaf The Enemy Within',
  'Red Leaf Unapologetic Soul', 'Red Leaf Unwavering Ember', 'Red Leaf Unwavering Paradox Vessel',
  'Red Leaf Virah Queen (Yashodhara\'s Grace)', 'Red Leaf Water Heart / Dao Heart',
  'Red Leaf Wings', 'Red Leaf Wise Compassion', 'Red Leaf Witness Axis',
];

async function main() {
  await db.initDb();
  const texts = db.prepare('SELECT assistant_text FROM grok_sessions WHERE assistant_text IS NOT NULL').all()
    .map((r) => r.assistant_text);
  const corpus = texts.join('\n\n---\n\n');

  for (const name of BLOCKED) {
    const origin = extractGrokOriginSymbol(corpus, name);
    const row = db.prepare('SELECT mantra, symbol_chain, comprehension FROM aspects WHERE name = ?').get(name);
    const tableRe = new RegExp(`(?:^|\\n)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\t([^\\t\\n]+)\\t[""]([^""]+)[""]`, 'im');
    const table = corpus.match(tableRe);
    console.log(JSON.stringify({
      name,
      source: origin?.source || 'none',
      chain: origin?.symbolChain || row?.symbol_chain || (table ? table[1] : null),
      mantra: table ? table[2].trim() : (row?.mantra || '').slice(0, 80),
    }));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });