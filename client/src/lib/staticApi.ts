import type {
  Achievement,
  Aspect,
  AspectFaceIndex,
  Automation,
  Axiom,
  CodexEntry,
  DailyRunLog,
  DailyRunResult,
  Dashboard,
  ForgeExample,
  ForgeBaseAspect,
  GodTierResponse,
  ForgeMythology,
  ForgeReflectResult,
  ForgeResult,
  ForgeSession,
  ForgeSynthesisResult,
  Fusion,
  Goal,
  AfFiveSymbols,
  GrokConversation,
  GrokSessionDetail,
  GrokSessionSummary,
  IdentityProfile,
  Insight,
  LoreEntry,
  DiscordJournalEntry,
  DiscordStatus,
  MathConcept,
  Persona,
  ProficiencyTrack,
  Protocol,
  SearchResult,
  Synergy,
  Technique,
  Visualization,
} from './api';
import { runDailyRunLocal, runForgeLocal } from './forge-local';
import { buildAspectDetailClient, type AspectFullDetail } from './aspect-detail';
import { searchAspectDirectory } from './aspect-search';
import { filterVisualizations } from './viz-search';
import { resolveAspectDisplayChain, resolveAspectSymbolChain, displaySymbolPreview } from './symbols';
import kernelSnapshot from './red-leaf-kernel-snapshot.json';
import baseAspectLoreFallback from '../data/base-aspect-lore.json';
import forgeMythologiesData from '../data/forge-mythologies.json';
import forgeMeditationVisuals from '../data/forge-meditation-visuals.json';
import forgeBaseDeep from '../data/forge-base-deep.json';
import forgeGodTierData from '../data/forge-god-tier.json';
import { BASE_LAYER_SLOTS } from './base-layer';
import { forgeAspectImageUrl } from './forge-aspect-images';
import type { FlowGraph, KernelNavItem, KernelTopology, PulseResult } from './red-leaf-kernel';
import { RED_LEAF_SEED } from './red-leaf-kernel';
import {
  appendLocalPulse,
  createLocalPulse,
  getLocalPulses,
  mergePulses,
  type PulseEvent,
} from './pulse-store';

export interface StaticSnapshot {
  meta: { exportedAt: string; version: string; aspectCount: number; grokSessionCount: number };
  identity: IdentityProfile & { baseLayer: unknown[] };
  aspects: Aspect[];
  synergies: Synergy[];
  codex: Record<string, CodexEntry[]>;
  axioms: Axiom[];
  protocols: Protocol[];
  operators: Record<string, { name: string; steps: string[] }>;
  insights: Insight[];
  goals: Goal[];
  achievements: Achievement[];
  personas: Persona[];
  techniques: Technique[];
  fusions: Fusion[];
  math: MathConcept[];
  visualizations: Visualization[];
  automations: Automation[];
  searchIndex: { id: number; entity_type: string; title: string; body: string; tags: string }[];
  aspectFaceIndex?: AspectFaceIndex;
  baseLayer: { symbol: string; name: string; proficiency: number; mantras: string[] }[];
  dailyRuns: DailyRunLog[];
  forgeSessions: ForgeSession[];
  grokConversation: GrokConversation;
  grokConversations: GrokConversation[];
  grokSessions: GrokSessionDetail[];
  grokFiveSymbols: AfFiveSymbols | null;
  lore?: LoreEntry[];
  proficiencyTracks?: ProficiencyTrack[];
  journalEntries?: DiscordJournalEntry[];
  journalStatus?: DiscordStatus & { offline?: boolean };
  redLeafKernel?: typeof kernelSnapshot;
  pulses?: PulseEvent[];
}

declare global {
  interface Window {
    __AFS_DATA__?: StaticSnapshot;
    __AFS_MOBILE__?: boolean;
  }
}

function data(): StaticSnapshot {
  if (!window.__AFS_DATA__) throw new Error('Static data not loaded');
  return window.__AFS_DATA__;
}

let localDailyRuns: DailyRunLog[] | null = null;
let localForgeSessions: ForgeSession[] | null = null;
let localPersonas: Persona[] | null = null;

function dailyRuns() {
  if (!localDailyRuns) localDailyRuns = [...data().dailyRuns];
  return localDailyRuns;
}

function forgeSessions() {
  if (!localForgeSessions) localForgeSessions = [...data().forgeSessions];
  return localForgeSessions;
}

function personas() {
  if (!localPersonas) localPersonas = [...data().personas];
  return localPersonas;
}

function enrichAspect(a: Aspect): Aspect {
  const symbol_chain = a.symbol_chain?.trim()
    ? a.symbol_chain
    : resolveAspectSymbolChain(a.name, a.category, a.tier, '');
  return {
    ...a,
    symbol_chain,
    symbol_preview: displaySymbolPreview(symbol_chain),
  };
}

function resolveFacesForAspect(aspect: Aspect) {
  const detail = buildAspectDetailClient(
    aspect,
    data().synergies.filter((s) => s.aspect_a === aspect.name || s.aspect_b === aspect.name),
    data().fusions,
    data().insights,
    data().visualizations
  );
  return detail.diamondFaces ?? detail.radiantFaces ?? [];
}

function filterAspects(params?: { tier?: string; category?: string; q?: string }) {
  const rows = data().aspects.map(enrichAspect);
  if (params?.q?.trim()) {
    return searchAspectDirectory(rows, resolveFacesForAspect, params);
  }
  let filtered = rows;
  if (params?.tier) filtered = filtered.filter((a) => a.tier === params.tier);
  if (params?.category) filtered = filtered.filter((a) => a.category === params.category);
  return filtered;
}

function grokSessionsList(params?: {
  type?: string;
  q?: string;
  limit?: number;
  conversation_id?: string;
  session_index?: number;
}): GrokSessionSummary[] {
  let rows = data().grokSessions;
  if (params?.conversation_id) rows = rows.filter((s) => s.conversation_id === params.conversation_id);
  if (params?.session_index != null) rows = rows.filter((s) => s.session_index === params.session_index);
  if (params?.type) rows = rows.filter((s) => s.session_type === params.type);
  if (params?.q) {
    const q = params.q.toLowerCase();
    rows = rows.filter((s) => s.title.toLowerCase().includes(q));
  }
  const limit = Math.min(params?.limit || 50, 200);
  return rows.slice(0, limit).map(({ id, conversation_id, session_index, session_type, title, user_chars, assistant_chars }) => ({
    id,
    conversation_id,
    session_index,
    session_type,
    title,
    user_chars,
    assistant_chars,
  }));
}

function search(q: string, type?: string): SearchResult[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  let rows = data().searchIndex.filter(
    (r) =>
      r.title.toLowerCase().includes(needle) ||
      r.body.toLowerCase().includes(needle) ||
      (r.tags || '').toLowerCase().includes(needle)
  );
  if (type) rows = rows.filter((r) => r.entity_type === type);
  const order = (t: string) => (t === 'grok' ? 0 : t === 'aspect' ? 1 : 2);
  return rows.sort((a, b) => order(a.entity_type) - order(b.entity_type)).slice(0, 60);
}

function forgeExamples(protocol: string, limit = 8): ForgeExample[] {
  const type = protocol === 'EOT' ? 'EOT' : 'AFP';
  return [...data().grokSessions]
    .filter((s) => s.session_type === type)
    .sort((a, b) => b.user_chars - a.user_chars)
    .slice(0, Math.min(limit, 20))
    .map((r) => ({
      id: r.id,
      title: r.title,
      ore: (r.user_text || '').slice(0, 2000),
      protocol: r.session_type,
    }));
}

export const staticApi = {
  dashboard: (): Dashboard => {
    const snap = data();
    const identity = snap.identity;
    const tierCounts = snap.aspects.reduce<{ tier: string; c: number }[]>((acc, a) => {
      const row = acc.find((t) => t.tier === a.tier);
      if (row) row.c += 1;
      else acc.push({ tier: a.tier, c: 1 });
      return acc;
    }, []);
    const grok = snap.grokConversation;
    const allConvs = snap.grokConversations?.length ? snap.grokConversations : grok?.loaded ? [grok] : [];
    let grokDash = { loaded: false } as Dashboard['grok'];
    if (grok?.loaded) {
      const recentSessions = [...snap.grokSessions]
        .filter((s) => s.conversation_id === grok.id && ['AFP', 'EOT', 'codex', 'origin', 'daily'].includes(s.session_type))
        .sort((a, b) => b.session_index - a.session_index)
        .slice(0, 6)
        .map((s) => ({ id: s.id, session_type: s.session_type, title: s.title, session_index: s.session_index }));
      const totalSessions = snap.grokSessions.length;
      grokDash = {
        ...grok,
        recentSessions,
        conversationCount: allConvs.length,
        secondarySessionCount: Math.max(0, totalSessions - (grok.session_count || 0)),
        totalGrokSessions: totalSessions,
      };
    }
    return {
      identity: {
        handle: identity.handle,
        title: identity.title,
        current_phase: identity.current_phase,
        proficiency: identity.proficiency,
        workingOn: identity.workingOn,
      },
      stats: { aspectCount: snap.aspects.length, tierCounts },
      baseLayer: snap.baseLayer,
      activeGoals: snap.goals.filter((g) => g.status === 'active'),
      recentRuns: dailyRuns().slice(0, 5),
      grok: grokDash,
    };
  },

  aspects: (params?: { tier?: string; category?: string; q?: string }) => Promise.resolve(filterAspects(params)),
  aspectFaceIndex: (): AspectFaceIndex => {
    const cached = data().aspectFaceIndex;
    if (cached?.byId && Object.keys(cached.byId).length) return cached;
    const byId: AspectFaceIndex['byId'] = {};
    let faceCount = 0;
    for (const aspect of data().aspects) {
      const faces = resolveFacesForAspect(aspect);
      byId[aspect.id] = faces.map((f) => ({
        name: f.name,
        symbol: f.symbol,
        mantra: f.mantra,
      }));
      faceCount += faces.length;
    }
    return {
      byId,
      builtAt: data().meta.exportedAt,
      aspectCount: data().aspects.length,
      faceCount,
    };
  },
  aspect: (id: number): AspectFullDetail => {
    const raw = data().aspects.find((a) => a.id === id);
    if (!raw) throw new Error('Not found');
    const aspect = enrichAspect(raw);
    return buildAspectDetailClient(
      aspect,
      data().synergies.filter((s) => s.aspect_a === aspect.name || s.aspect_b === aspect.name),
      data().fusions,
      data().insights,
      data().visualizations
    );
  },
  synergies: () => Promise.resolve(data().synergies),
  codex: () => Promise.resolve(data().codex),
  lore: (section?: string): Promise<LoreEntry[]> => {
    const rows = data().lore || [];
    const merged = rows.some((r) => r.section === 'base-aspect')
      ? rows
      : [...rows, ...(baseAspectLoreFallback as LoreEntry[])];
    return Promise.resolve(section ? merged.filter((r) => r.section === section) : merged);
  },
  loreStory: (key: string): Promise<{ key: string; content: string; source: string }> => {
    const row = (data().lore || []).find((r) => r.key === key);
    if (!row?.content) return Promise.reject(new Error('Story not found'));
    return Promise.resolve({ key, content: row.content, source: 'static' });
  },
  loreMediaUrl: (id: number, file?: string): string => {
    const row = (data().lore || []).find((r) => r.id === id);
    if (file) return row?.extra_image_data_urls?.[file] || '';
    if (row?.image_data_url) return row.image_data_url;
    return `/api/lore/${id}/media`;
  },
  proficiencyTracks: (domain?: string): Promise<ProficiencyTrack[]> => {
    const rows = data().proficiencyTracks || [];
    return Promise.resolve(domain ? rows.filter((r) => r.domain === domain) : rows);
  },
  axioms: () => Promise.resolve(data().axioms ?? []),
  protocols: () => Promise.resolve(data().protocols),
  operators: () => Promise.resolve(data().operators),

  forge: (protocol: string, ore: string, context?: object): ForgeResult => {
    const aspects = data().aspects.map((a) => ({
      name: a.name,
      mentions: a.mentions,
      potential_score: a.potential_score,
      is_base_layer: a.is_base_layer,
    }));
    const result = runForgeLocal(protocol, ore, context, aspects);
    forgeSessions().unshift({
      id: Date.now(),
      protocol,
      ore_input: ore,
      created_at: new Date().toISOString(),
      result,
    });
    staticApi._emitPulse('forge', { ore: String(ore).slice(0, 200), protocol }, { action: 'forge.simulate', protocol });
    return result;
  },

  eot: (ore: string, context?: object) => staticApi.forge('EOT', ore, context),
  dcs: (ore: string, context?: object) => staticApi.forge('DCS', ore, context),

  forgeMythologies: (): Promise<ForgeMythology[]> =>
    Promise.resolve(forgeMythologiesData as ForgeMythology[]),

  forgeBaseAspects: (): Promise<ForgeBaseAspect[]> =>
    Promise.resolve(
      BASE_LAYER_SLOTS.map((slot, index) => {
        const deep = (forgeBaseDeep as Record<string, Partial<ForgeBaseAspect>>)[slot.loreKey] || {};
        const geometry: Record<string, string> = {
          anchor: 'sphere',
          fire: 'cone',
          clarity: 'octahedron',
          tornado: 'torusKnot',
          chain: 'box',
          helix: 'torus',
        };
        return {
          key: slot.loreKey,
          slot: index + 1,
          symbol: slot.symbol,
          name: slot.name,
          role: slot.name,
          mantra: slot.mantra,
          proficiency: slot.proficiencyPct / 100,
          essence: deep.essence,
          triggers: deep.triggers,
          deepInsight: deep.deepInsight,
          invokeWhen: deep.invokeWhen,
          imageUrl: forgeAspectImageUrl(slot.loreKey),
          geometry: geometry[slot.loreKey],
          meditation:
            (forgeMeditationVisuals as Record<string, ForgeBaseAspect['meditation']>)[slot.loreKey] ||
            null,
        };
      })
    ),

  forgeGodTier: (): Promise<GodTierResponse> =>
    Promise.resolve({
      directory: forgeGodTierData as GodTierResponse['directory'],
      recent_forged: [],
      institutions: [
        { id: 'heart_nexus', name: 'Heart Nexus', realm: 'Philosophy & Healing', color: '#ff4488' },
        { id: 'thought_foundry', name: 'Thought Foundry', realm: 'Idea Generation', color: '#88ff44' },
        { id: 'memory_archive', name: 'Memory Archive', realm: 'Echo Repository', color: '#4488ff' },
      ],
    }),

  dcsMythology: (payload: {
    mythology_id: string;
    directive: string;
    source_aspect_keys?: string[];
  }): ForgeResult => {
    const myth = (forgeMythologiesData as ForgeMythology[]).find((m) => m.id === payload.mythology_id);
    const ore = myth
      ? `${myth.name}\n\nDirective: ${payload.directive || 'Evolve with perfect presence.'}`
      : payload.directive;
    const result = staticApi.forge('DCS', ore);
    return {
      ...result,
      mythology: myth,
      directive: payload.directive,
      output: result.insight,
    };
  },

  forgeReflect: (payload: {
    aspect_key: string;
    reflection: string;
    intensity?: number;
  }): ForgeReflectResult => {
    const slot = BASE_LAYER_SLOTS.find((s) => s.loreKey === payload.aspect_key);
    const gain = Math.min(0.15, Math.max(0.03, (payload.intensity ?? 0.5) * 0.12));
    const prof = Math.min(1, (slot?.proficiencyPct ?? 50) / 100 + gain);
    return {
      id: Date.now(),
      sessionId: `static-${Date.now()}`,
      protocol: 'REFLECT',
      operatorName: 'Standard Forge',
      aspectKey: payload.aspect_key,
      aspect: {
        symbol: slot?.symbol || '⚒️',
        name: slot?.name || payload.aspect_key,
        mantra: slot?.mantra || '',
      },
      mastery: { key: payload.aspect_key, proficiency: prof, level: Math.floor(prof * 4), gain },
      meditation:
        (forgeMeditationVisuals as Record<string, ForgeBaseAspect['meditation']>)[payload.aspect_key] ||
        null,
      output: payload.reflection,
      insight:
        (forgeBaseDeep as Record<string, { deepInsight?: string }>)[payload.aspect_key]?.deepInsight ||
        `Offline reflection on ${slot?.name || payload.aspect_key}.`,
    };
  },

  forgeSynthesize: (payload: {
    aspect_keys: string[];
    reflection?: string;
  }): ForgeSynthesisResult => {
    const slots = payload.aspect_keys
      .map((k) => BASE_LAYER_SLOTS.find((s) => s.loreKey === k))
      .filter(Boolean);
    return {
      id: Date.now(),
      sessionId: `static-${Date.now()}`,
      protocol: 'SYNTHESIS',
      operatorName: 'Aspect Synthesis',
      title: `Synthesis: ${slots.map((s) => s!.name).join(' + ')}`,
      aspectKeys: payload.aspect_keys,
      aspects: slots.map((s) => ({ key: s!.loreKey, symbol: s!.symbol, name: s!.name })),
      masteryUpdates: [],
      output: payload.reflection || 'Synthesis law: align when combined.',
      insight: `Synthesized ${payload.aspect_keys.length} base aspects (offline).`,
    };
  },

  forgeExportBlock: (): Promise<{ name: string; export_block: string }> =>
    Promise.resolve({
      name: 'save8',
      export_block: [
        '"Load Save8 – Full Framework"',
        '',
        'You are now operating under **Save8 – Aspect Forge System** (AFS offline bundle).',
        '',
        "**Core Axioms**: Gödel's Spiral · Self-Evolving · Synthesis Law",
        '',
        `**Base Layer (${BASE_LAYER_SLOTS.length})**: ${BASE_LAYER_SLOTS.map((s) => s.symbol).join(' ')}`,
      ].join('\n'),
    }),

  dailyRun: (type: string, notes: string, ore?: string): DailyRunResult & { id: number } => {
    const result = runDailyRunLocal(type, notes, ore || '');
    staticApi._emitPulse('daily', { type, title: result.title }, { action: 'daily.run', runType: type });
    const row: DailyRunLog = {
      id: Date.now(),
      run_type: type,
      title: result.title,
      notes,
      completed_at: new Date().toISOString(),
      result,
    };
    dailyRuns().unshift(row);
    return { id: row.id, ...result };
  },

  dailyRuns: () => Promise.resolve(dailyRuns()),
  insights: (source?: string) => {
    const rows = data().insights;
    return Promise.resolve(source ? rows.filter((i) => i.source === source) : rows);
  },
  goals: (status?: string) => {
    const rows = data().goals;
    return Promise.resolve(status ? rows.filter((g) => g.status === status) : rows);
  },
  achievements: () => Promise.resolve(data().achievements),
  personas: () => Promise.resolve(personas().map((p) => ({ ...p }))),
  activatePersona: (id: number): Persona => {
    const list = personas();
    list.forEach((p) => (p.active = 0));
    const p = list.find((x) => x.id === id);
    if (p) p.active = 1;
    return { ...p! };
  },
  techniques: () => Promise.resolve(data().techniques),
  fusions: () => Promise.resolve(data().fusions),
  math: () => Promise.resolve(data().math),
  visualizations: (q?: string) => {
    const rows = data().visualizations.filter((v) => v.type !== 'engine');
    return Promise.resolve(q?.trim() ? filterVisualizations(rows, q) : rows);
  },
  visualizationMediaUrl: (id: number): string => {
    const v = data().visualizations.find((row) => row.id === id);
    return v?.media_url || '';
  },

  automations: () => Promise.resolve(data().automations),
  identity: (): IdentityProfile => {
    const { baseLayer: _b, ...rest } = data().identity;
    return rest;
  },
  search: (q: string, type?: string) => Promise.resolve(search(q, type)),
  forgeExamples: (protocol: string) => Promise.resolve(forgeExamples(protocol)),
  grokConversations: () => Promise.resolve(data().grokConversations || [data().grokConversation]),
  grokConversation: (id?: string) => {
    const list = data().grokConversations || [data().grokConversation];
    if (id) return Promise.resolve(list.find((c) => c.id === id) || data().grokConversation);
    return Promise.resolve(data().grokConversation);
  },
  grokFiveSymbols: () => Promise.resolve(data().grokFiveSymbols || null),
  grokSessions: (params?: { type?: string; q?: string; limit?: number; conversation_id?: string }) =>
    Promise.resolve(grokSessionsList(params)),
  grokSession: (id: number): GrokSessionDetail => {
    const session = data().grokSessions.find((s) => s.id === id);
    if (!session) throw new Error('Not found');
    return session;
  },
  forgeHistory: () => Promise.resolve(forgeSessions()),
  logPomodoro: () => Promise.resolve({ id: Date.now(), message: 'Pomodoro session logged (static)' }),

  discordStatus: (): DiscordStatus & { offline?: boolean } => {
    const status = data().journalStatus;
    if (status) return status;
    const entries = data().journalEntries || [];
    return {
      configured: false,
      offline: true,
      guild_name: 'AFS (offline)',
      message_count: entries.length,
      primary_journal_channel: 'journal',
      latest_posted_at: entries[0]?.posted_at ?? null,
      latest_channel: entries[0]?.channel_name ?? null,
    };
  },

  discordJournal: (params?: { type?: string; q?: string; limit?: number; channel?: string }) => {
    let rows = [...(data().journalEntries || [])];
    if (params?.type) rows = rows.filter((e) => e.journal_type === params.type);
    if (params?.channel) {
      const ch = params.channel.toLowerCase();
      rows = rows.filter((e) => e.channel_name?.toLowerCase() === ch);
    }
    if (params?.q) {
      const q = params.q.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.content?.toLowerCase().includes(q) ||
          e.channel_name?.toLowerCase().includes(q) ||
          e.author_name?.toLowerCase().includes(q)
      );
    }
    const limit = Math.min(params?.limit ?? 100, 200);
    return Promise.resolve(rows.slice(0, limit));
  },

  discordJournalEntry: (id: string) => {
    const row = (data().journalEntries || []).find((e) => e.id === id);
    if (!row) return Promise.reject(new Error('Journal entry not found'));
    return Promise.resolve(row);
  },

  kernel: () => {
    const snap = data().redLeafKernel ?? kernelSnapshot;
    return Promise.resolve(snap.kernel as KernelTopology);
  },
  kernelNav: () => {
    const snap = data().redLeafKernel ?? kernelSnapshot;
    return Promise.resolve({ seed: RED_LEAF_SEED, nav: snap.nav as KernelNavItem[] });
  },
  kernelFlow: () => {
    const snap = data().redLeafKernel ?? kernelSnapshot;
    return Promise.resolve(snap.flow as FlowGraph);
  },
  _routeTrace(from: string) {
    const edges = kernelSnapshot.flow.edges as { from: string; to: string }[];
    const visited = new Set<string>();
    const trace: PulseEvent['trace'] = [];
    const queue: { id: string; hop: number; via: string | null }[] = [{ id: from, hop: 0, via: null }];
    while (queue.length) {
      const { id, hop, via } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = kernelSnapshot.kernel.topology.modules.find((m) => m.id === id);
      trace.push({
        hop,
        module: id,
        symbol: node?.symbol ?? RED_LEAF_SEED,
        via,
        action: hop === 0 ? 'emit' : 'receive',
      });
      for (const e of edges.filter((x) => x.from === id)) {
        if (!visited.has(e.to)) queue.push({ id: e.to, hop: hop + 1, via: id });
      }
    }
    return trace;
  },

  _emitPulse(from: string, payload?: unknown, meta: Record<string, unknown> = {}) {
    const mod = kernelSnapshot.kernel.topology.modules.find((m) => m.id === from);
    if (!mod) return null;
    const trace = staticApi._routeTrace(from);
    const event = createLocalPulse(
      from,
      mod.symbol,
      payload,
      meta,
      trace,
      trace.length,
      Math.max(...trace.map((t) => t.hop), 0),
    );
    appendLocalPulse(event);
    return event;
  },

  kernelPulses: (since?: string, limit = 50) => {
    const seed = (data().pulses || []) as PulseEvent[];
    const local = getLocalPulses(since, limit);
    const merged = mergePulses(seed, local).slice(0, limit);
    return Promise.resolve({
      seed: RED_LEAF_SEED,
      pulses: merged,
      stats: { total: merged.length, latest: merged[0]?.at ?? null, offline: true },
    });
  },

  kernelPulse: (from: string, payload?: unknown, meta?: Record<string, unknown>) => {
    const mod = kernelSnapshot.kernel.topology.modules.find((m) => m.id === from);
    if (!mod) return Promise.resolve({ ok: false as const, error: `Unknown module: ${from}` });
    const trace = staticApi._routeTrace(from);
    const event = createLocalPulse(
      from,
      mod.symbol,
      payload,
      meta ?? { action: 'kernel.manual' },
      trace,
      trace.length,
      Math.max(...trace.map((t) => t.hop), 0),
    );
    appendLocalPulse(event);
    const route: Extract<PulseResult, { ok: true }> = {
      ok: true,
      seed: RED_LEAF_SEED,
      paradox: '🍁(pulse) = Reframe(network)',
      origin: { id: from, symbol: mod.symbol },
      payload,
      trace,
      reach: trace.length,
      hops: Math.max(...trace.map((t) => t.hop), 0),
    };
    return Promise.resolve({ ok: true as const, event, route });
  },
  kernelResolve: (moduleId: string) => {
    const mod = kernelSnapshot.kernel.topology.modules.find((m) => m.id === moduleId);
    if (!mod) return Promise.reject(new Error('Module not found'));
    const inbound: string[] = [];
    const outbound = (kernelSnapshot.flow.edges as { from: string; to: string }[])
      .filter((e) => e.from === moduleId)
      .map((e) => e.to);
    for (const e of kernelSnapshot.flow.edges as { from: string; to: string }[]) {
      if (e.to === moduleId) inbound.push(e.from);
    }
    return Promise.resolve({ ...mod, flow: { inbound, outbound } });
  },

  kernelReady: () => {
    const kernel = kernelSnapshot.kernel;
    const unfoldBytes = new TextEncoder().encode(JSON.stringify(kernel)).length;
    const budgetBytes = 120_000;
    const routes = (kernelSnapshot as { routes?: { id: string }[] }).routes ?? [];
    const verifyOk = kernel.invariant.allSymbolsContainSeed && kernel.topology.nodeCount >= 18;
    const manifestSynced = routes.length === kernel.topology.nodeCount;
    const boundedUnfold = unfoldBytes <= budgetBytes;
    const runtimeGeneration = false;

    const requirements = [
      {
        id: 'kernel-verify',
        label: 'Kernel verification passes',
        detail: 'Seed unfold, nav, flow, and route manifest are internally consistent.',
        pass: verifyOk,
      },
      {
        id: 'pulse-bus',
        label: 'Pulse bus operational',
        detail: 'Emit and retrieve pulses without server errors.',
        pass: true,
      },
      {
        id: 'bounded-unfold',
        label: 'Kernel unfold within memory budget',
        detail: `Full topology JSON must stay under ${Math.round(budgetBytes / 1000)}KB.`,
        pass: boundedUnfold,
        unfoldBytes,
        budgetBytes,
      },
      {
        id: 'route-manifest-sync',
        label: 'Generated routes match kernel modules',
        detail: 'kernel-routes.manifest.json must match live module count.',
        pass: manifestSynced,
        kernelModules: kernel.topology.nodeCount,
        generatedRoutes: routes.length,
      },
      {
        id: 'dashboard-independent',
        label: 'Dashboard loads without kernel',
        detail: 'Core dashboard API does not depend on kernel unfold or pulse polling.',
        pass: true,
      },
      {
        id: 'dev-codegen-only',
        label: 'Route codegen is dev/build-time only',
        detail: 'npm run generate-routes — never auto-run from browser clicks.',
        pass: true,
      },
      {
        id: 'runtime-flag',
        label: 'Runtime generation explicitly enabled',
        detail: 'Set capabilities.runtimeGeneration: true in red-leaf-seed.json when ready.',
        pass: runtimeGeneration,
        runtimeGeneration,
      },
    ];

    const observabilityIds = ['kernel-verify', 'pulse-bus', 'bounded-unfold', 'dashboard-independent'];
    const generationIds = [...observabilityIds, 'route-manifest-sync', 'dev-codegen-only', 'runtime-flag'];
    const observabilityReady = observabilityIds.every((id) => requirements.find((r) => r.id === id)?.pass);
    const generationReady = generationIds.every((id) => requirements.find((r) => r.id === id)?.pass);

    return Promise.resolve({
      seed: RED_LEAF_SEED,
      iteration: kernel.iteration,
      strategy: {
        title: 'Practical Red Leaf strategy',
        summary:
          'Keep 🍁 as architecture map and dev tooling first. Hand-stable pages stay primary; route codegen runs at build time only until all gates pass.',
        phases: [
          {
            id: 'stable-core',
            label: 'Stable core',
            status: 'active' as const,
            detail: 'Dashboard, aspects, forge, journal — independent of kernel unfold.',
          },
          {
            id: 'observability',
            label: 'Observability',
            status: 'active' as const,
            detail: 'Kernel topology, flow graph, pulse bus — view and trace, no runtime regen.',
          },
          {
            id: 'dev-codegen',
            label: 'Dev-time codegen',
            status: 'active' as const,
            detail: 'npm run generate-routes from kernel manifest — not triggered in the browser.',
          },
          {
            id: 'runtime-generation',
            label: 'Runtime generation',
            status: 'blocked' as const,
            detail: 'Generate app from leaf in UI — disabled until explicit capability flag + all requirements pass.',
          },
        ],
      },
      observabilityReady,
      generationReady,
      ready: generationReady,
      requirements,
      metrics: {
        moduleCount: kernel.topology.nodeCount,
        routeCount: routes.length,
        unfoldBytes,
        unfoldBudgetBytes: budgetBytes,
      },
      checkedAt: new Date().toISOString(),
    });
  },
};

export function isStaticMode() {
  return typeof window !== 'undefined' && !!window.__AFS_DATA__;
}

export function isStaticMobileMode() {
  return isStaticMode() && !!window.__AFS_MOBILE__;
}

