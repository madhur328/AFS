import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { staticApi } from './staticApi';

describe('staticApi axioms', () => {
  const prior = window.__AFS_DATA__;

  beforeEach(() => {
    window.__AFS_DATA__ = {
      meta: { exportedAt: '', version: '1', aspectCount: 0, grokSessionCount: 0 },
      identity: {
        handle: '@test',
        title: 'Test',
        bio: '',
        current_phase: 'forge',
        evolution_path: '',
        proficiency: {},
        workingOn: [],
        evolutions: [],
        topAspects: [],
        baseLayer: [],
      },
      aspects: [],
      synergies: [],
      codex: {},
      axioms: [
        {
          id: 1,
          layer: "Gödel's Spiral Axiom of Incompleteness",
          statement:
            'The Infinity Spiral (♾️🌀) is the infinite, transcendent idealization.',
        },
        {
          id: 2,
          layer: 'Self-Evolving Spiral Axiom',
          statement: '♾️🌀(AFS) = ♾️🌀 — The system is a self-evolving spiral.',
        },
      ],
      protocols: [],
      operators: {},
      insights: [],
      goals: [],
      achievements: [],
      personas: [],
      techniques: [],
      fusions: [],
      math: [],
      visualizations: [],
      automations: [],
      searchIndex: [],
      baseLayer: [],
      dailyRuns: [],
      forgeSessions: [],
      grokConversation: { loaded: false },
      grokConversations: [],
      grokSessions: [],
      grokFiveSymbols: null,
    };
  });

  afterEach(() => {
    window.__AFS_DATA__ = prior;
  });

  it('returns exported axioms (not empty stub)', async () => {
    const axioms = await staticApi.axioms();
    expect(axioms).toHaveLength(2);
    expect(axioms[0].layer).toContain('Gödel');
    expect(axioms[1].statement).toContain('♾️🌀');
  });
});

describe('staticApi journal', () => {
  const prior = window.__AFS_DATA__;

  beforeEach(() => {
    window.__AFS_DATA__ = {
      meta: { exportedAt: '', version: '1', aspectCount: 0, grokSessionCount: 0 },
      identity: {
        handle: '@test',
        title: 'Test',
        bio: '',
        current_phase: 'forge',
        evolution_path: '',
        proficiency: {},
        workingOn: [],
        evolutions: [],
        topAspects: [],
        baseLayer: [],
      },
      aspects: [],
      synergies: [],
      codex: {},
      axioms: [],
      protocols: [],
      operators: {},
      insights: [],
      goals: [],
      achievements: [],
      personas: [],
      techniques: [],
      fusions: [],
      math: [],
      visualizations: [],
      automations: [],
      searchIndex: [],
      baseLayer: [],
      dailyRuns: [],
      forgeSessions: [],
      grokConversation: { loaded: false },
      grokConversations: [],
      grokSessions: [],
      grokFiveSymbols: null,
      journalEntries: [
        {
          id: 'local-april1-1',
          guild_id: 'local',
          channel_id: 'local',
          channel_name: 'journal',
          author_id: 'local',
          author_name: 'Madhur',
          content: 'Date: 2025-04-01\nReflection: bundled journal entry.',
          posted_at: '2025-04-01T12:00:00.000Z',
          synced_at: '2025-04-01T12:00:00.000Z',
          journal_type: 'daily',
          tags: [],
          attachments: [],
        },
      ],
      journalStatus: {
        configured: false,
        offline: true,
        guild_name: 'AFS (offline)',
        message_count: 1,
        primary_journal_channel: 'journal',
        latest_posted_at: '2025-04-01T12:00:00.000Z',
        latest_channel: 'journal',
      },
    };
  });

  afterEach(() => {
    window.__AFS_DATA__ = prior;
  });

  it('returns bundled journal entries in offline mode', async () => {
    const entries = await staticApi.discordJournal({ channel: 'journal', limit: 100 });
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toContain('bundled journal entry');
  });

  it('reports offline journal status', () => {
    const status = staticApi.discordStatus();
    expect(status.offline).toBe(true);
    expect(status.message_count).toBe(1);
  });
});

describe('staticApi personas & lore', () => {
  const prior = window.__AFS_DATA__;

  beforeEach(() => {
    window.__AFS_DATA__ = {
      meta: { exportedAt: '', version: '1', aspectCount: 0, grokSessionCount: 0 },
      identity: {
        handle: '@test',
        title: 'Test',
        bio: '',
        current_phase: 'forge',
        evolution_path: '',
        proficiency: {},
        workingOn: [],
        evolutions: [],
        topAspects: [],
        baseLayer: [],
      },
      aspects: [],
      synergies: [],
      codex: {},
      axioms: [],
      protocols: [],
      operators: {},
      insights: [],
      goals: [],
      achievements: [],
      personas: [
        {
          id: 1,
          name: 'Aspect Forger',
          archetype: 'Creator',
          symbol_chain: '⚒️🍁♾️',
          mantra: 'I forge what I feel into what I become.',
          description: 'Primary operator identity',
          active: 1,
        },
        {
          id: 2,
          name: 'Red Leaf Owl King',
          archetype: 'Watcher',
          symbol_chain: '🍁🦉🌕',
          mantra: 'I watch with moonlit eyes.',
          description: 'EverWatcher vigil persona',
          active: 0,
        },
      ],
      techniques: [],
      fusions: [],
      math: [],
      visualizations: [],
      automations: [],
      searchIndex: [],
      baseLayer: [],
      dailyRuns: [],
      forgeSessions: [],
      grokConversation: { loaded: false },
      grokConversations: [],
      grokSessions: [],
      grokFiveSymbols: null,
      lore: [
        {
          id: 10,
          section: 'myth',
          key: 'fallen-valkyrie',
          title: 'Fallen Valkyrie',
          content: 'Myth body',
          symbol: '🪽',
          image_path: 'data/lore-images/lore-fallen-valkyrie-redemption.jpg',
          has_image: true,
          image_data_url: 'data:image/jpeg;base64,abc',
          aspect_links: [],
        },
      ],
    };
  });

  afterEach(() => {
    window.__AFS_DATA__ = prior;
  });

  it('activates a persona for the static session', async () => {
    staticApi.activatePersona(2);
    const rows = await staticApi.personas();
    expect(rows.find((p) => p.id === 2)?.active).toBe(1);
    expect(rows.find((p) => p.id === 1)?.active).toBe(0);
  });

  it('serves embedded lore image data URLs', () => {
    const url = staticApi.loreMediaUrl(10);
    expect(url).toBe('data:image/jpeg;base64,abc');
  });
});

describe('staticApi visualizations', () => {
  const prior = window.__AFS_DATA__;

  beforeEach(() => {
    window.__AFS_DATA__ = {
      meta: { exportedAt: '', version: '1', aspectCount: 0, grokSessionCount: 0 },
      identity: {
        handle: '@test',
        title: 'Test',
        bio: '',
        current_phase: 'forge',
        evolution_path: '',
        proficiency: {},
        workingOn: [],
        evolutions: [],
        topAspects: [],
        baseLayer: [],
      },
      aspects: [],
      synergies: [],
      codex: {},
      axioms: [],
      protocols: [],
      operators: {},
      insights: [],
      goals: [],
      achievements: [],
      personas: [],
      techniques: [],
      fusions: [],
      math: [],
      visualizations: [
        {
          id: 42,
          title: 'Red Leaf',
          type: 'video',
          path: 'D:\\wallpapers\\afs-platform\\videos\\afs\\Red Leaf.mp4',
          description: '',
          aspect_link: 'Red Leaf',
          media_url: 'videos/afs/Red%20Leaf.mp4',
        },
      ],
      automations: [],
      searchIndex: [],
      baseLayer: [],
      dailyRuns: [],
      forgeSessions: [],
      grokConversation: { loaded: false },
      grokConversations: [],
      grokSessions: [],
      grokFiveSymbols: null,
    };
  });

  afterEach(() => {
    window.__AFS_DATA__ = prior;
  });

  it('returns relative media_url for offline visuals', () => {
    expect(staticApi.visualizationMediaUrl(42)).toBe('videos/afs/Red%20Leaf.mp4');
    expect(staticApi.visualizationMediaUrl(999)).toBe('');
  });
});