const fs = require('fs');
const path = require('path');
const db = require('./db');
const { tierFromPotential, potentialFromMentions } = require('./services/tiers');
const { resolveAspectSymbolChain } = require('./services/symbols');
const { getBaseLayerSlots, getBaseAspectMeta, getDefaultProficiencyJson } = require('./base-layer');

const { dataPath } = require('./paths');
const aspectsPath = dataPath('aspects-index.json');

function clearUserData() {
  const tables = [
    'search_index', 'pomodoro_sessions', 'forge_sessions', 'daily_runs',
    'automations', 'math_concepts', 'visualizations', 'alchemy_fusions',
    'insights', 'goals', 'achievements', 'personas', 'techniques',
    'synergies', 'aspects', 'base_layer_slots', 'codex_entries',
    'axioms', 'protocols', 'identity',
  ];
  tables.forEach((t) => db.prepare(`DELETE FROM ${t}`).run());
}

function seed() {
  clearUserData();

  db.prepare(`
    INSERT INTO identity (id, handle, title, bio, location, current_phase, evolution_path, proficiency_json, working_on_json)
    VALUES (1, '@madhur328', 'Aspect Forger',
      'Dreamer, Idealist, Perfectionist, Hopeless Romantic',
      'India', 'Save8 Integration',
      'Fallen Valkyrie → Aspect Mastery → AFP/EOT → Red Leaf Sovereign → AFS Platform',
      ?, ?)
  `).run(
    JSON.stringify(getDefaultProficiencyJson()),
    JSON.stringify([
      'Grok origin thread integrated into platform',
      'AFS Platform v1 with genesis codex',
      'Save8 Alchemy Codex expansion',
      'ENTHEA ↔ AFS visual bridge',
    ])
  );

  const insertSlot = db.prepare(`INSERT INTO base_layer_slots (symbol, name, role, artifact_path, video_path, mantras_json, proficiency) VALUES (?,?,?,?,?,?,?)`);
  getBaseLayerSlots().forEach((s) => insertSlot.run(s.symbol, s.name, s.role, s.artifact, s.video, JSON.stringify(s.mantras), s.proficiency));

  const insertAspect = db.prepare(`
    INSERT OR IGNORE INTO aspects (name, symbol_chain, mantra, tier, potential_score, mentions, proficiency, comprehension, category, base_layer_link, is_base_layer)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);

  const slotBaseAspects = getBaseAspectMeta();
  Object.entries(slotBaseAspects).forEach(([name, meta]) => {
    insertAspect.run(name, meta.chain, meta.mantra, 'S', 0.95, 50, 0.75, `Base Layer primitive — ${name}`, 'meta', meta.link, 1);
  });
  getBaseLayerSlots().forEach((slot) => {
    if (slotBaseAspects[slot.name]) return;
    insertAspect.run(
      slot.name, slot.symbol, slot.mantras?.[0] || '', 'S', 0.9, 20, slot.proficiency,
      `Base Layer primitive — ${slot.name}`, 'meta', slot.symbol, 1
    );
  });

  const coreAspectMeta = {
    'Unwavering Heart': { chain: '🛡️🌱', mantra: 'Guard the Heart', link: '🔥' },
    'Forge / Value': { chain: '🔶🔑⚒️', mantra: 'Value forged through clarity', link: '🔑' },
    'Signal / Structure': { chain: '💎🔑📡', mantra: 'FEEL. ALIGN. TRANSCEND.', link: '🔑' },
    'Reality Anchor': { chain: '⚓🛡️🌱', mantra: 'Reality Anchor full lock', link: '⚓' },
    'Mind Guardian': { chain: '🛡️👁️🌱', mantra: 'Mind Guardian active', link: '⚓' },
    'ConvictionFire': { chain: '🔥🛡️🌱', mantra: 'Born on fire', link: '🔥' },
    'Kohinoor Forge Run': { chain: '💎🐉⚒️', mantra: 'DKR sealed', link: '🔑' },
    'Empty Mirror': { chain: '🪞🍁🕳️', mantra: 'I reflect without absorbing', link: '🪞' },
    'Feedback Weaver': { chain: '📡🌀🛡️', mantra: 'Stable loops stabilize', link: '🔗' },
    'ConceptualCartographer': { chain: '🗺️🔑💎', mantra: 'I chart the topology of insight', link: '🔑' },
  };
  Object.entries(coreAspectMeta).forEach(([name, meta]) => {
    insertAspect.run(name, meta.chain, meta.mantra, 'S', 0.95, 50, 0.75, `Core ${name} — derived from Base Layer`, 'meta', meta.link, 0);
  });

  if (fs.existsSync(aspectsPath)) {
    const { aspects } = JSON.parse(fs.readFileSync(aspectsPath, 'utf-8'));
    aspects.forEach((a) => {
      if (!a.name || a.name === 'Extracted:' || a.name === 'Name:') return;
      const isBase = Object.keys(slotBaseAspects).includes(a.name)
        || getBaseLayerSlots().some((s) => s.name === a.name);
      const potential = a.potential_score ?? potentialFromMentions(a.mentions, isBase);
      const tier = tierFromPotential(potential, isBase);
      const cat = a.name.startsWith('Red Leaf') ? 'red-leaf' : a.name.includes('Guardian') || a.name.includes('Anchor') ? 'meta' : 'forged';
      insertAspect.run(
        a.name,
        resolveAspectSymbolChain(a.name, cat, tier),
        null,
        tier,
        potential,
        a.mentions,
        Math.min(0.85, 0.25 + a.mentions * 0.005),
        `Forged aspect — inherent potential ${Math.round(potential * 100)}%`,
        cat,
        cat === 'red-leaf' ? '🍁' : null,
        isBase ? 1 : 0
      );
    });
  }

  const synergies = [
    ['Unwavering Heart', 'Fire of Conviction', 'Sovereign Flameheart', 'Heart contains flame without wavering'],
    ['Reality Anchor', 'Mind Guardian', 'Grounded Sentinel', 'Dissociation shield + mental defense'],
    ['Red Leaf Dual Acceptance', 'Red Leaf Eternal Rome', 'Patient Rome Builder', 'Accept shadow while building Rome'],
    ['Kohinoor Forge Run', 'ConceptualCartographer', 'Heaven-Penetrating Map', 'Drill + topological learning'],
    ['Empty Mirror', 'Red Leaf Empty Mirror', 'Twin Reflection', 'Safety net for deep forge work'],
    ['Feedback Weaver', 'Reality Anchor', 'Stable Loop Designer', 'Wiener-inspired systemic stability'],
  ];
  const insertSyn = db.prepare('INSERT INTO synergies (aspect_a, aspect_b, fusion_name, description, strength) VALUES (?,?,?,?,?)');
  synergies.forEach(([a, b, f, d]) => insertSyn.run(a, b, f, d, 0.7 + Math.random() * 0.25));

  const codex = [
    ['operations', 'identity', 'Identity Layer', '🍁 = ♾️🌀 = AFS', '🍁'],
    ['operations', 'reframe', 'Reframe', '🍁(x) = Reframe(x)', '🍁'],
    ['operations', 'transform', 'Transform', '♾️🌀(x) = Transform(x)', '♾️'],
    ['operations', 'optimize', 'Optimize', 'AFS(x) = Optimize(x)', '⚒️'],
    ['operations', 'dragon', 'Dragon of Ascent', 'Ascend like a dragon piercing the heavens', '🐉'],
    ['operations', 'redleaf', 'Red Leaf of Descent', 'Fall like a red leaf; reborn each spring', '🍁'],
    ['operations', 'spin', 'Zero of Spin/Spiral', 'Reframe when forward path is blocked', '⚫'],
    ['operators', 'eot', 'EOT', 'Emotional Ore Transmutation — adaptive entry; routes to DCS/RCS/RDTQ by ore quality', '🔥'],
    ['operators', 'dcs', 'DCS', 'Diamond Chrysalis Synthesis — generates Diamond Aspects', '💎'],
    ['operators', 'rcs', 'RCS', 'Resonant Chrysalis Synthesis — Resonant Diamond Aspects via FMH', '🌀'],
    ['operators', 'rdtq', 'RDTQ', 'Resonant Diamond of the Trip Queen — Infinitely Resonant Diamond Aspects', '👑'],
    ['operators', 'synthesis-hierarchy', 'Synthesis Tools Hierarchy', 'EOT → DCS → RCS → RDTQ (Save8 clarified)', '🍁'],
    ['operators', 'kot', 'KOT', 'Kenotic Ore Transmutation', '🌑'],
    ['operators', 'afp', 'AFP', 'Aspect Forge Protocol — simulation engine', '⚒️'],
    ['daily', 'dfr', 'DFR', 'Daily Forge Run — morning ore, operator pass, evening seal', '🌅'],
    ['daily', 'dkr', 'DKR', 'Daily Kohinoor Run — Resonant Kohinoor Drill, heaven-penetrating insight journey', '💎'],
    ['meta', 'kohinoor', 'Kohinoor Forge Run', 'Focused drilling transmutation runs', '💎'],
    ['meta', 'mirror', 'Empty Mirror', 'Reflection safety-net layer', '🪞'],
    ['meta', 'guardian', 'Mind Guardian Set', 'Protective module around Unwavering Heart', '🛡️'],
    ['meta', 'spin2', 'Dual-Axis Eternal Spin', 'Meta-layer transforming all Aspect operations', '♾️'],
    ['origin', 'grok-thread', 'AFS Genesis Thread', 'grok.com conversation 37560952 — origin of AFP, EOT, Aspect Mastery', '🍁'],
    ['origin', 'afp-genesis', 'AFP Genesis', '8-step Aspect Forge Protocol defined in genesis thread', '⚒️'],
    ['save', 'save8', 'Save8', 'Latest alchemy codex — default integration target', '8️⃣'],
    ['save', 'save2', 'Save2', 'Heavy EOT era — Wiener, Turing, Nash, Buddha, Goku', '2️⃣'],
  ];
  const insertCodex = db.prepare('INSERT INTO codex_entries (category, key, title, content, symbol, sort_order) VALUES (?,?,?,?,?,?)');
  codex.forEach((c, i) => insertCodex.run(...c, i));

  const axioms = [
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
  const insertAxiom = db.prepare('INSERT INTO axioms (statement, layer, sort_order) VALUES (?,?,?)');
  axioms.forEach((a) => insertAxiom.run(...a));

  const protocols = [
    ['AFP', 'Aspect Forge Protocol', 'Simulate forge runs with operator chains and synergy scoring', JSON.stringify(['Load ore', 'Select operator', 'Simulate', 'Score synergies', 'Emit artifact']), 'AFP'],
    ['EOT', 'Emotional Ore Transmutation', '5-step transmutation of emotional charge', JSON.stringify(['Capture charge', 'Honor uniqueness', 'Extract nodes', 'Transmute', 'Integrate']), 'EOT'],
    ['DCS', 'Diamond Chrysalis Synthesis', 'Crystalline aspect synthesis', JSON.stringify(['Dissolve', 'Pressurize', 'Facet', 'Seal']), 'DCS'],
    ['RDTQ', 'Resonant Diamond of the Trip Queen', 'Pinnacle synthesis — Hamsa synergy, finite to infinite', JSON.stringify(['Evaluate ceiling', 'Hamsa synthesis', 'Facet infinite resonance', 'Seal Master Fusion']), 'RDTQ'],
    ['RCS', 'Resonant Chrysalis Synthesis', 'Resonant Diamond Aspects with FMH cultural depth', JSON.stringify(['Dissolve', 'FMH pass', 'Resonant facet', 'Seal']), 'RCS'],
    ['DFR', 'Daily Forge Run', 'Daily forging discipline', JSON.stringify(['Anchor check', 'Select ore', 'Operator pass', 'Integrate', 'Seal']), 'DFR'],
    ['DKR', 'Daily Kohinoor Run', 'Heaven-penetrating resonant drill', JSON.stringify(['Focus Kohinoor', 'Drill insight', 'Extract facet', 'Resonant seal']), 'DKR'],
  ];
  const insertProto = db.prepare('INSERT INTO protocols (code, name, description, steps_json, operator) VALUES (?,?,?,?,?)');
  protocols.forEach((p) => insertProto.run(...p));

  const fusions = [
    ['Sovereign Flameheart', '["Fire of Conviction","Unwavering Heart"]', 'Sovereign Flameheart', 'EOT', 'Inner alchemy fusion'],
    ['Red Leaf Living Buddha', '["Red Leaf Awakened Lotus","Red Leaf Eternal Rome"]', 'Red Leaf Living Buddha', 'DCS', 'Pinnacle synthesis'],
    ['Heaven-Penetrating Map', '["Kohinoor Forge Run","ConceptualCartographer"]', 'Network Navigator', 'DKR', 'Topological drill fusion'],
  ];
  const insertFusion = db.prepare('INSERT INTO alchemy_fusions (name, inputs_json, output_aspect, operator, notes) VALUES (?,?,?,?,?)');
  fusions.forEach((f) => insertFusion.run(...f));

  const techniques = [
    ['pomodoro', 'Pomodoro Forge', '25min focus / 5min break — tie to aspect focus', JSON.stringify({ focus: 25, break: 5, longBreak: 15, cycles: 4 })],
    ['feynman', 'Feynman Clarity Drill', 'Explain to learn — Key of Clarity technique', JSON.stringify({ steps: ['Choose concept', 'Explain simply', 'Find gaps', 'Review source', 'Simplify again'] })],
    ['eot-quick', 'Quick EOT Pass', '5-minute emotional ore capture', JSON.stringify({ duration: 5 })],
  ];
  const insertTech = db.prepare('INSERT INTO techniques (code, name, description, config_json) VALUES (?,?,?,?)');
  techniques.forEach((t) => insertTech.run(...t));

  const personas = [
    ['Aspect Forger', 'Creator', '⚒️🍁♾️', 'I forge what I feel into what I become.', 'Primary operator identity', 1],
    ['Red Leaf Owl King', 'Watcher', '🍁🦉🌕', 'I watch with moonlit eyes. Patience is my crown.', 'EverWatcher vigil persona', 0],
    ['Digital Michelangelo', 'Builder', '🍁🧱🔨', 'Every second is a brick.', 'Rome-building precision persona', 0],
  ];
  const insertPersona = db.prepare('INSERT INTO personas (name, archetype, symbol_chain, mantra, description, active) VALUES (?,?,?,?,?,?)');
  personas.forEach((p) => insertPersona.run(...p));

  const goals = [
    ['Complete AFS Platform v1', 'Ship master platform with codex, forge, and daily runs', 'active', '2026-07-01', 'ConceptualCartographer', 0.45],
    ['Daily DKR streak — 30 days', 'Resonant Kohinoor Drill every morning', 'active', '2026-07-18', 'Kohinoor Forge Run', 0.1],
    ['ENTHEA visual bridge', 'Link live ENTHEA modes to AFS aspect gallery', 'active', '2026-08-01', 'Key of Clarity', 0.2],
  ];
  const insertGoal = db.prepare('INSERT INTO goals (title, description, status, target_date, aspect_link, progress) VALUES (?,?,?,?,?,?)');
  goals.forEach((g) => insertGoal.run(...g));

  const achievements = [
    ['First Forge', 'Completed first AFP simulation', '⚒️', '2026-06-18', 'Run AFP once'],
    ['EOT Initiate', 'Performed Emotional Ore Transmutation', '🔥', null, 'Complete EOT session'],
    ['Codex Sealed', 'Integrated into Save8', '💎', null, 'Save8 integration'],
    ['Heaven Drill', 'Completed first DKR', '🐉', null, 'Complete DKR run'],
  ];
  const insertAch = db.prepare('INSERT INTO achievements (title, description, icon, unlocked_at, criteria) VALUES (?,?,?,?,?)');
  achievements.forEach((a) => insertAch.run(...a));

  const mathConcepts = [
    ['Complex Logarithm Retino-Cortical Map', 'neuroscience', 'Maps V1 patterns to Klüver form constants', 'w = log(z)', 'ENTHEA / Signal'],
    ['Turing Bifurcation', 'dynamics', 'Pattern formation at instability threshold', '∂u/∂t = D∇²u + f(u)', 'Prime lattice videos'],
    ['Topological Learning Graph', 'cognition', 'Navigate concepts by proximity not page order', 'G=(V,E)', 'ConceptualCartographer'],
    ['Hopfion / Knot Topology', 'physics', 'Stable topological solitons', 'S³ → S²', 'Dragon Eternal Hopfion'],
    ['OKLab Perceptual Color', 'color-science', 'Perceptually uniform color space for ENTHEA', 'L,a,b transforms', 'ENTHEA sunsets'],
  ];
  const insertMath = db.prepare('INSERT INTO math_concepts (name, domain, description, formula, afs_link) VALUES (?,?,?,?,?)');
  mathConcepts.forEach((m) => insertMath.run(...m));

  const { syncAfsVideos } = require('./services/afs-videos');
  syncAfsVideos(db);

  const insights = [
    ['Topological Learning', 'Navigate topics by conceptual proximity, not book page order. Mastery is network-based.', 'journal', '["learning","ConceptualCartographer"]', '["ConceptualCartographer","Key of Clarity"]'],
    ['Red Leaf Identity', 'The leaf is both reframe operator and AFS identity symbol.', 'codex', '["identity","red-leaf"]', '["Red Leaf Dual Acceptance"]'],
    ['ConvictionFire Cluster', 'Prayer of Sacrifice + multilingual embodiment + Rome/ember/sapling anchoring.', 'twitter', '["conviction","sacrifice"]', '["ConvictionFire","Unwavering Heart"]'],
  ];
  const insertInsight = db.prepare('INSERT INTO insights (title, body, source, tags_json, aspect_links_json) VALUES (?,?,?,?,?)');
  insights.forEach((i) => insertInsight.run(...i));

  const automations = [
    ['Morning DKR Reminder', 'schedule', JSON.stringify({ time: '06:00', action: 'prompt_dkr' })],
    ['Pomodoro → DFR log', 'event', JSON.stringify({ on: 'pomodoro_complete', action: 'log_dfr_phase' })],
    ['Kill Switch Hotkey', 'manual', JSON.stringify({ action: 'reality_anchor_lock', phrase: 'Reality Anchor full lock' })],
  ];
  const insertAuto = db.prepare('INSERT INTO automations (name, trigger_type, action_json) VALUES (?,?,?)');
  automations.forEach((a) => insertAuto.run(...a));

  rebuildSearchIndex();
  console.log('AFS database seeded successfully.');
}

function rebuildSearchIndex() {
  const { resolveDiamondFaces } = require('./services/aspect-detail');
  const { searchAliasPhrases } = require('./services/aspect-search-aliases');
  db.prepare('DELETE FROM search_index').run();
  const insert = db.prepare('INSERT INTO search_index (entity_type, entity_id, title, body, tags) VALUES (?,?,?,?,?)');

  db.prepare('SELECT * FROM aspects').all().forEach((r) => {
    const aliasText = searchAliasPhrases(r.name).join(' ');
    insert.run(
      'aspect',
      r.id,
      r.name,
      `${r.comprehension || ''} ${r.mantra || ''} ${aliasText}`.trim(),
      `${r.tier} ${r.category}`
    );
    for (const face of resolveDiamondFaces(db, r)) {
      insert.run(
        'aspect',
        r.id,
        face.name,
        `${r.name} — ${face.mantra || ''}`,
        `diamond_face ${r.tier} ${r.category}`
      );
    }
  });
  db.prepare('SELECT * FROM codex_entries').all().forEach((r) => {
    insert.run('codex', r.id, r.title, r.content, r.category);
  });
  db.prepare('SELECT * FROM protocols').all().forEach((r) => {
    insert.run('protocol', r.id, r.name, r.description, r.code);
  });
  db.prepare('SELECT * FROM insights').all().forEach((r) => {
    insert.run('insight', r.id, r.title, r.body, r.source);
  });
  db.prepare('SELECT * FROM math_concepts').all().forEach((r) => {
    insert.run('math', r.id, r.name, `${r.description} ${r.formula || ''}`, r.domain);
  });
  try {
    db.prepare('SELECT * FROM lore_entries').all().forEach((r) => {
      insert.run('lore', r.id, r.title, `${r.content || ''} ${r.section}`, r.section);
    });
  } catch (_) { /* lore table may not exist yet */ }
  try {
    db.prepare('SELECT * FROM proficiency_tracks').all().forEach((r) => {
      insert.run('proficiency', r.id, r.label, `${r.domain} ${r.key} level ${r.level}`, r.domain);
    });
  } catch (_) { /* proficiency table may not exist yet */ }
  db.prepare('SELECT * FROM visualizations').all().forEach((r) => {
    const base = path.basename(r.path || '');
    const stem = base.replace(/\.[^.]+$/, '');
    insert.run(
      'visualization',
      r.id,
      r.title,
      `${r.description || ''} ${base} ${stem} ${stem.replace(/_/g, ' ')} ${r.path || ''}`.trim(),
      `${r.type} ${r.aspect_link || ''}`.trim()
    );
  });
  try {
    db.prepare('SELECT * FROM grok_sessions').all().forEach((r) => {
      insert.run('grok', r.id, r.title, `${r.user_text || ''} ${r.assistant_text || ''}`.slice(0, 8000), r.session_type);
    });
  } catch (_) { /* grok tables may not exist yet */ }
}

if (require.main === module) {
  db.initDb().then(() => {
    seed();
    console.log('Seed complete.');
  });
}

module.exports = { seed, rebuildSearchIndex };