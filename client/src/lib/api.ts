import { isStaticMode, staticApi } from './staticApi';
import baseAspectLoreFallback from '../data/base-aspect-lore.json';
import type { PulseEvent } from './pulse-store';
import type { PulseResult } from './red-leaf-kernel';

const BASE = '/api';

export interface KernelPulseResponse {
  ok: boolean;
  event?: PulseEvent;
  route?: Extract<PulseResult, { ok: true }>;
  error?: string;
}

export interface KernelSpiralTelemetry {
  seed: string;
  iteration: number;
  operator: string;
  pulsesHandled: number;
  actionsRun: number;
  invalidations: number;
  byModule: Record<string, { pulses: number; actions: number }>;
  cache: { entries: number; hits: number; misses: number; hitRate: number | null; invalidations: number };
  edgeCount: number;
  handlerModules: number;
}

export interface KernelStoreStats {
  seed?: string;
  entries: number;
  hits: number;
  misses: number;
  hitRate: number | null;
  invalidations: number;
  sets: number;
  byModule: Record<string, number>;
}

export interface KernelGenerateResult {
  ok: boolean;
  seed: string;
  routeCount: number;
  fullscreenCount: number;
  shellCount: number;
  generatedAt: string;
  dryRun?: boolean;
  outputs: { tsx: string; manifest: string };
  routes?: Array<{
    id: string;
    path: string;
    page: string;
    layout: string;
    label: string;
    symbol: string;
  }>;
  message?: string;
  error?: string;
  failedRequirements?: string[];
}

function staticMode() {
  return isStaticMode() || import.meta.env.VITE_STATIC === 'true';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
  } catch {
    throw new Error(
      'Cannot reach AFS API at localhost:3847. Start the server from project root: node server/index.js or npm run dev'
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed (${res.status})`);
  }
  return res.json();
}

function toQuery(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  dashboard: () =>
    staticMode() ? Promise.resolve(staticApi.dashboard()) : request<Dashboard>('/dashboard'),
  aspects: (params?: { tier?: string; category?: string; q?: string }) => {
    if (staticMode()) return staticApi.aspects(params);
    return request<Aspect[]>(`/aspects${toQuery(params)}`);
  },
  aspectFaceIndex: () =>
    staticMode()
      ? Promise.resolve(staticApi.aspectFaceIndex())
      : request<AspectFaceIndex>('/aspects/face-index'),
  aspect: (id: number) =>
    staticMode() ? Promise.resolve(staticApi.aspect(id)) : request<AspectDetail>(`/aspects/${id}`),
  createAspect: (data: object) =>
    staticMode()
      ? Promise.reject(new Error('Create aspect requires live server'))
      : request<AspectDetail>('/aspects', { method: 'POST', body: JSON.stringify(data) }),
  updateAspect: (id: number, data: object) =>
    staticMode()
      ? Promise.reject(new Error('Edit aspect requires live server'))
      : request<AspectDetail>(`/aspects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAspect: (id: number) =>
    staticMode()
      ? Promise.reject(new Error('Delete aspect requires live server'))
      : request<{ ok: boolean; id: number; name: string }>(`/aspects/${id}`, { method: 'DELETE' }),
  synergies: () => (staticMode() ? staticApi.synergies() : request<Synergy[]>('/synergies')),
  codex: () => (staticMode() ? staticApi.codex() : request<Record<string, CodexEntry[]>>('/codex')),
  lore: async (section?: string) => {
    if (staticMode()) return staticApi.lore(section);
    const rows = await request<LoreEntry[]>(
      `/lore${section ? `?section=${encodeURIComponent(section)}` : ''}`
    );
    const merged = rows.some((r) => r.section === 'base-aspect')
      ? rows
      : [...rows, ...(baseAspectLoreFallback as LoreEntry[])];
    return section ? merged.filter((r) => r.section === section) : merged;
  },
  loreStory: (key: string) =>
    staticMode()
      ? staticApi.loreStory(key)
      : request<{ key: string; content: string; source: string }>(`/lore/story/${encodeURIComponent(key)}`),
  loreMediaUrl: (id: number, file?: string) => {
    if (staticMode()) return staticApi.loreMediaUrl(id, file);
    const qs = file ? `?file=${encodeURIComponent(file)}` : '';
    return `${BASE}/lore/${id}/media${qs}`;
  },
  proficiencyTracks: (domain?: string) =>
    staticMode()
      ? staticApi.proficiencyTracks(domain)
      : request<ProficiencyTrack[]>(
          `/proficiency-tracks${domain ? `?domain=${encodeURIComponent(domain)}` : ''}`
        ),
  createProficiencyTrack: (data: {
    domain: string;
    key: string;
    label: string;
    level?: number;
    notes?: string;
  }) =>
    staticMode()
      ? Promise.reject(new Error('Requires live server'))
      : request<ProficiencyTrack>('/proficiency-tracks', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
  updateProficiencyTrack: (id: number, data: Partial<ProficiencyTrack>) =>
    staticMode()
      ? Promise.reject(new Error('Requires live server'))
      : request<ProficiencyTrack>(`/proficiency-tracks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
  autoSuggestProficiency: () =>
    staticMode()
      ? Promise.reject(new Error('Requires live server'))
      : request<{ ok: boolean; updated: number; tracks: ProficiencyTrack[] }>(
          '/proficiency-tracks/auto-suggest',
          { method: 'POST' }
        ),
  axioms: () => (staticMode() ? staticApi.axioms() : request<Axiom[]>('/axioms')),
  protocols: () => (staticMode() ? staticApi.protocols() : request<Protocol[]>('/protocols')),
  operators: () => (staticMode() ? staticApi.operators() : request<Record<string, Operator>>('/operators')),
  forge: (protocol: string, ore: string, context?: object) =>
    staticMode()
      ? Promise.resolve(staticApi.forge(protocol, ore, context))
      : request<ForgeResult>('/forge/simulate', {
          method: 'POST',
          body: JSON.stringify({ protocol, ore, context }),
        }),
  eot: (ore: string) =>
    staticMode()
      ? Promise.resolve(staticApi.eot(ore))
      : request<ForgeResult>('/forge/eot', { method: 'POST', body: JSON.stringify({ ore }) }),
  dcs: (ore: string) =>
    staticMode()
      ? Promise.resolve(staticApi.dcs(ore))
      : request<ForgeResult>('/forge/dcs', { method: 'POST', body: JSON.stringify({ ore }) }),
  dcsMythology: (payload: {
    mythology_id: string;
    directive: string;
    source_aspect_keys?: string[];
  }) =>
    staticMode()
      ? staticApi.dcsMythology(payload)
      : request<ForgeResult>('/forge/dcs', { method: 'POST', body: JSON.stringify(payload) }),
  forgeMythologies: () =>
    staticMode()
      ? staticApi.forgeMythologies()
      : request<ForgeMythology[]>('/forge/mythologies'),
  forgeBaseAspects: () =>
    staticMode()
      ? staticApi.forgeBaseAspects()
      : request<ForgeBaseAspect[]>('/forge/base-aspects'),
  forgeReflect: (payload: { aspect_key: string; reflection: string; intensity?: number }) =>
    staticMode()
      ? staticApi.forgeReflect(payload)
      : request<ForgeReflectResult>('/forge/reflect', { method: 'POST', body: JSON.stringify(payload) }),
  forgeSynthesize: (payload: { aspect_keys: string[]; reflection?: string }) =>
    staticMode()
      ? staticApi.forgeSynthesize(payload)
      : request<ForgeSynthesisResult>('/forge/synthesize', { method: 'POST', body: JSON.stringify(payload) }),
  forgeExportBlock: () =>
    staticMode()
      ? staticApi.forgeExportBlock()
      : request<{ name: string; export_block: string }>('/forge/export-block'),
  forgeGodTier: () =>
    staticMode()
      ? staticApi.forgeGodTier()
      : request<GodTierResponse>('/forge/god-tier'),
  dailyRun: (type: string, notes: string, ore?: string) =>
    staticMode()
      ? Promise.resolve(staticApi.dailyRun(type, notes, ore))
      : request<DailyRunResult>('/daily-runs', {
          method: 'POST',
          body: JSON.stringify({ type, notes, ore }),
        }),
  dailyRuns: () => (staticMode() ? staticApi.dailyRuns() : request<DailyRunLog[]>('/daily-runs')),
  insights: (source?: string) =>
    staticMode()
      ? staticApi.insights(source)
      : request<Insight[]>(`/insights${source ? `?source=${encodeURIComponent(source)}` : ''}`),
  goals: (status?: string) =>
    staticMode()
      ? staticApi.goals(status)
      : request<Goal[]>(`/goals${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  createGoal: (data: GoalInput) =>
    staticMode()
      ? Promise.reject(new Error('Requires live server'))
      : request<Goal>('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: number, data: Partial<GoalInput>) =>
    staticMode()
      ? Promise.reject(new Error('Requires live server'))
      : request<Goal>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGoal: (id: number) =>
    staticMode()
      ? Promise.reject(new Error('Requires live server'))
      : request<{ ok: boolean; id: number }>(`/goals/${id}`, { method: 'DELETE' }),
  achievements: () => (staticMode() ? staticApi.achievements() : request<Achievement[]>('/achievements')),
  personas: () => (staticMode() ? staticApi.personas() : request<Persona[]>('/personas')),
  activatePersona: (id: number) =>
    staticMode()
      ? Promise.resolve(staticApi.activatePersona(id))
      : request<Persona>(`/personas/${id}/activate`, { method: 'POST' }),
  techniques: () => (staticMode() ? staticApi.techniques() : request<Technique[]>('/techniques')),
  fusions: () => (staticMode() ? staticApi.fusions() : request<Fusion[]>('/alchemy-fusions')),
  math: () => (staticMode() ? staticApi.math() : request<MathConcept[]>('/math')),
  visualizations: (q?: string) =>
    staticMode()
      ? staticApi.visualizations(q)
      : request<Visualization[]>(q ? `/visualizations?q=${encodeURIComponent(q)}` : '/visualizations'),
  visualizationMediaUrl: (id: number) =>
    staticMode() ? staticApi.visualizationMediaUrl(id) : `${BASE}/visualizations/${id}/media`,
  launchVisualization: (id: number) => {
    if (staticMode()) {
      return Promise.reject(new Error('ENTHEA launch requires the live server'));
    }
    return request<{ launched: boolean; path: string; mode?: string }>(`/visualizations/${id}/launch`, {
      method: 'POST',
    });
  },
  syncVisualizations: () =>
    staticMode()
      ? Promise.reject(new Error('Sync requires live server'))
      : request<VideoSyncResult>('/visualizations/sync', { method: 'POST' }),
  automations: () => (staticMode() ? staticApi.automations() : request<Automation[]>('/automations')),
  identity: () =>
    staticMode() ? Promise.resolve(staticApi.identity()) : request<IdentityProfile>('/identity'),
  search: (q: string, type?: string) => {
    if (staticMode()) return staticApi.search(q, type);
    const params = new URLSearchParams({ q });
    if (type) params.set('type', type);
    return request<SearchResult[]>(`/search?${params}`);
  },
  forgeExamples: (protocol: string) =>
    staticMode()
      ? staticApi.forgeExamples(protocol)
      : request<ForgeExample[]>(`/forge/examples?protocol=${encodeURIComponent(protocol)}&limit=8`),
  grokConversations: () =>
    staticMode() ? staticApi.grokConversations() : request<GrokConversation[]>('/grok/conversations'),
  grokConversation: (id?: string) =>
    staticMode()
      ? staticApi.grokConversation(id)
      : request<GrokConversation>(`/grok/conversation${id ? `?id=${encodeURIComponent(id)}` : ''}`),
  grokFiveSymbols: () =>
    staticMode() ? staticApi.grokFiveSymbols() : request<AfFiveSymbols>('/grok/five-symbols'),
  grokSessions: (params?: {
    type?: string;
    q?: string;
    limit?: number;
    conversation_id?: string;
    session_index?: number;
  }) => {
    if (staticMode()) return staticApi.grokSessions(params);
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
      )
    ).toString();
    return request<GrokSessionSummary[]>(`/grok/sessions${q ? `?${q}` : ''}`);
  },
  grokSession: (id: number) =>
    staticMode() ? Promise.resolve(staticApi.grokSession(id)) : request<GrokSessionDetail>(`/grok/sessions/${id}`),
  discordStatus: () =>
    staticMode() ? staticApi.discordStatus() : request<DiscordStatus>('/discord/status'),
  discordJournal: (params?: { type?: string; q?: string; limit?: number; channel?: string }) =>
    staticMode()
      ? staticApi.discordJournal(params)
      : request<DiscordJournalEntry[]>(
          `/discord/journal${toQuery({
            type: params?.type,
            q: params?.q,
            channel: params?.channel,
            limit: params?.limit != null ? String(params.limit) : undefined,
          })}`
        ),
  discordJournalLatest: (channel?: string) =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<DiscordJournalEntry>(`/discord/journal/latest${channel ? `?channel=${encodeURIComponent(channel)}` : ''}`),
  discordJournalEntry: (id: string) =>
    staticMode()
      ? staticApi.discordJournalEntry(id)
      : request<DiscordJournalEntry>(`/discord/journal/${encodeURIComponent(id)}`),
  createJournalEntry: (
    content: string,
    options?: { author_name?: string; posted_at?: string; attachments?: JournalAttachment[] }
  ) =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<DiscordJournalEntry>('/discord/journal', {
          method: 'POST',
          body: JSON.stringify({
            content,
            author_name: options?.author_name,
            posted_at: options?.posted_at,
            attachments: options?.attachments,
          }),
        }),
  syncJournalFromDiscord: (options?: { smart?: boolean }) =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<JournalSyncResult>('/discord/journal/sync', {
          method: 'POST',
          body: JSON.stringify({
            smart: options?.smart !== false,
          }),
        }),
  clubJournalEntries: () =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<JournalSmartClubResult>('/discord/journal/smart-club', {
          method: 'POST',
        }),
  updateJournalEntry: (
    id: string,
    content: string,
    options?: { author_name?: string; posted_at?: string; attachments?: JournalAttachment[] }
  ) =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<DiscordJournalEntry>(`/discord/journal/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify({
            content,
            author_name: options?.author_name,
            posted_at: options?.posted_at,
            attachments: options?.attachments,
          }),
        }),
  mergeJournalEntries: (first_id: string, second_id: string) =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<DiscordJournalEntry>('/discord/journal/merge', {
          method: 'POST',
          body: JSON.stringify({ first_id, second_id }),
        }),
  previewJournalAspects: (id: string) =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<{ entry_id: string; aspects: JournalExtractedAspect[] }>(
          `/discord/journal/${encodeURIComponent(id)}/aspects`
        ),
  syncJournalAspects: (id: string) =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<JournalAspectSyncResult>(`/discord/journal/${encodeURIComponent(id)}/sync-aspects`, {
          method: 'POST',
        }),
  deleteJournalEntry: (id: string) =>
    staticMode()
      ? Promise.reject(new Error('Journal requires live server'))
      : request<{ ok: boolean; id: string }>(`/discord/journal/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
  forgeHistory: () => (staticMode() ? staticApi.forgeHistory() : request<ForgeSession[]>('/forge/history')),
  logPomodoro: (data: object) =>
    staticMode()
      ? staticApi.logPomodoro()
      : request('/techniques/pomodoro', { method: 'POST', body: JSON.stringify(data) }),
  kernel: () =>
    staticMode() ? staticApi.kernel() : request<import('./red-leaf-kernel').KernelTopology>('/kernel'),
  kernelNav: () =>
    staticMode()
      ? staticApi.kernelNav()
      : request<{ seed: string; nav: import('./red-leaf-kernel').KernelNavItem[] }>('/kernel/nav'),
  kernelFlow: () =>
    staticMode() ? staticApi.kernelFlow() : request<import('./red-leaf-kernel').FlowGraph>('/kernel/flow'),
  kernelPulses: (since?: string, limit = 50) =>
    staticMode()
      ? staticApi.kernelPulses(since, limit)
      : request<{
          seed: string;
          pulses: import('./pulse-store').PulseEvent[];
          stats: { total: number; latest: string | null; offline?: boolean };
        }>(`/kernel/pulses${toQuery({ since, limit: String(limit) })}`).catch(() =>
          staticApi.kernelPulses(since, limit),
        ),
  kernelPulse: (from: string, payload?: unknown, meta?: Record<string, unknown>) =>
    staticMode()
      ? staticApi.kernelPulse(from, payload, meta)
      : request<KernelPulseResponse>('/kernel/pulse', {
          method: 'POST',
          body: JSON.stringify({ from, payload, meta }),
        }),
  kernelResolve: (moduleId: string) =>
    staticMode()
      ? staticApi.kernelResolve(moduleId)
      : request<import('./red-leaf-kernel').KernelModule & { flow: { inbound: string[]; outbound: string[] } }>(
          `/kernel/resolve/${encodeURIComponent(moduleId)}`
        ),
  kernelGenerate: () =>
    staticMode()
      ? Promise.reject(new Error('Runtime generation requires the live API — start npm run dev'))
      : request<KernelGenerateResult>('/kernel/generate', { method: 'POST' }),
  kernelSpiral: async () => {
    if (staticMode()) throw new Error('Spiral telemetry requires live API');
    try {
      return await request<KernelSpiralTelemetry>('/kernel/spiral');
    } catch (err) {
      const ready = await request<import('./kernel-readiness').KernelReadiness & { spiral?: KernelSpiralTelemetry | null }>('/kernel/ready');
      if (ready.spiral) return ready.spiral;
      const msg = err instanceof Error ? err.message : 'Spiral telemetry unavailable';
      if (msg.includes('404') || msg.includes('Cannot GET')) {
        throw new Error('API stale — restart from G:\\AFS: npm run dev (needs kernel iteration 5+ routes)');
      }
      throw err;
    }
  },
  kernelStore: () =>
    staticMode()
      ? Promise.reject(new Error('Kernel store stats require live API'))
      : request<KernelStoreStats>('/kernel/store'),
  kernelReady: async () => {
    if (staticMode()) return staticApi.kernelReady();
    try {
      return await request<import('./kernel-readiness').KernelReadiness>('/kernel/ready');
    } catch {
      const fallback = await staticApi.kernelReady();
      return {
        ...fallback,
        observabilityReady: false,
        requirements: fallback.requirements.map((req) =>
          req.id === 'pulse-bus'
            ? {
                ...req,
                pass: false,
                detail: 'API missing kernel routes — restart from project root: npm run dev',
              }
            : req,
        ),
      };
    }
  },
};

export interface DiamondFaceMatch {
  name: string;
  symbol: string;
  mantra: string;
  explanation?: string;
}

export interface AspectFaceIndex {
  byId: Record<number, DiamondFaceMatch[]>;
  builtAt: string;
  aspectCount: number;
  faceCount: number;
}

export interface Aspect {
  id: number;
  name: string;
  symbol_chain: string;
  symbol_preview?: string;
  mantra: string | null;
  tier: string;
  potential_score: number;
  mentions: number;
  proficiency: number;
  comprehension: string;
  category: string;
  base_layer_link: string | null;
  is_base_layer: number;
  detail_json?: string | null;
  matchKind?: 'master' | 'diamond_face';
  matchedDiamondFace?: DiamondFaceMatch;
}

export interface RadiantFace {
  name: string;
  symbol: string;
  mantra: string;
  explanation?: string;
  type?: string;
}

export type AspectQuality = 'basic' | 'diamond' | 'resonant' | 'infinite';

export interface AspectFusion {
  name: string;
  identity: string;
  affirmation: string;
  symbolChain?: string;
  originSource?: string;
  essence?: string;
  radiantFaces?: RadiantFace[];
}

export interface AspectDetail extends Aspect {
  quality?: AspectQuality;
  synergies: Synergy[];
  identity?: string;
  coreAffirmation?: string;
  supremeMantra?: string;
  aspectFusion?: AspectFusion | null;
  radiantFaces?: RadiantFace[];
  diamondFaces?: RadiantFace[];
  masterFusion?: {
    name: string;
    inputs: string[];
    description?: string;
    strength?: number;
    operator?: string;
  } | null;
  alchemyFusions?: Fusion[];
  integration?: {
    strengthens: string[];
    baseLayer: Array<string | { symbol: string; name: string }>;
    saveCodex: string;
    operator: string;
    evolution: string[];
  };
  symbolChain?: string;
  relatedInsights?: { id?: number; title: string; body: string; source: string }[];
  visualizations?: Visualization[];
}

export interface Synergy {
  id: number;
  aspect_a: string;
  aspect_b: string;
  fusion_name: string;
  description: string;
  strength: number;
}

export interface CodexEntry {
  id: number;
  category: string;
  key: string;
  title: string;
  content: string;
  symbol: string;
}

export interface LoreVisualizationLink {
  title: string;
  legacy_title?: string;
}

export interface LoreEntry {
  id: number;
  section: string;
  key: string;
  title: string;
  content: string;
  symbol: string;
  image_path?: string | null;
  source?: string | null;
  aspect_links: string[];
  has_image?: boolean;
  image_data_url?: string | null;
  extra_images?: string[];
  extra_images_available?: string[];
  extra_image_data_urls?: Record<string, string>;
  visualization?: LoreVisualizationLink | null;
  proficiency_pct?: number | null;
  base_layer_key?: string | null;
  sort_order?: number;
  excerpt?: string | null;
  expandable?: boolean;
}

export interface ProficiencyTrack {
  id: number;
  domain: string;
  key: string;
  label: string;
  level: number;
  notes?: string | null;
  self_assessed: number;
  auto_suggested: number;
  updated_at?: string;
}

export interface Axiom { id: number; statement: string; layer: string; }
export interface Protocol { id: number; code: string; name: string; description: string; steps: string[]; operator: string; }
export interface Operator { name: string; steps: string[]; }

export interface ForgeMythology {
  id: string;
  name: string;
  glyphs: string;
  source: string;
  essence: string;
  themes: string[];
}

export interface ForgeBaseAspect {
  key: string;
  slot?: number;
  symbol: string;
  name: string;
  role: string;
  mantra: string;
  proficiency: number;
  essence?: string;
  triggers?: string[];
  deepInsight?: string;
  invokeWhen?: string;
  imageUrl?: string | null;
  geometry?: string;
  meditation?: {
    primary: string;
    glow: string;
    gradient: string[];
    breath: string;
    aura: string;
    prompt: string;
  } | null;
}

export interface GodTierAspect {
  id: string;
  name: string;
  glyphs: string;
  ceiling: string;
  category: string;
  essence: string;
  deepInsight?: string;
  applications?: string[];
  forged_at?: string;
}

export interface GodTierResponse {
  directory: GodTierAspect[];
  recent_forged: GodTierAspect[];
  institutions: { id: string; name: string; realm: string; color: string }[];
}

export interface ForgeReflectResult {
  id: number;
  sessionId: string;
  protocol: string;
  operatorName: string;
  aspectKey: string;
  aspect: { symbol: string; name: string; mantra: string };
  mastery: { key: string; proficiency: number; level: number; gain: number };
  meditation?: ForgeBaseAspect['meditation'];
  deepInsight?: string;
  invokeWhen?: string;
  output: string;
  insight: string;
}

export interface ForgeSynthesisResult {
  id: number;
  sessionId: string;
  protocol: string;
  operatorName: string;
  title: string;
  aspectKeys: string[];
  aspects: { key: string; symbol: string; name: string }[];
  masteryUpdates: { key: string; proficiency: number; level: number; gain: number }[];
  output: string;
  insight: string;
}

export interface ForgeResult {
  sessionId: string;
  protocol: string;
  operatorName: string;
  masterAspect: { name: string; symbolChain: string; mantra: string; affirmation: string; tier: string; potential: number };
  radiantFaces: { name: string; symbol: string; mantra: string }[];
  synergies: { name: string; strength: number }[];
  integration: { baseLayer: { symbol: string; name: string }[] | string[]; saveCodex: string; evolution: string[] };
  insight: string;
  output?: string;
  mythology?: ForgeMythology;
  directive?: string;
}

export interface DailyRunResult {
  runType: string;
  title: string;
  phases: string[];
  mantra: string;
  insight: string;
}

export interface DailyRunLog {
  id: number;
  run_type: string;
  title: string;
  notes: string;
  completed_at: string;
  result: DailyRunResult;
}

export interface GrokSessionBrief {
  id: number;
  session_type: string;
  title: string;
  session_index: number;
}

export interface DashboardGrok extends GrokConversation {
  recentSessions?: GrokSessionBrief[];
  conversationCount?: number;
  secondarySessionCount?: number;
  totalGrokSessions?: number;
}

export interface DashboardJournal {
  loaded: boolean;
  entry_count: number;
  configured?: boolean;
  guild_name?: string;
  latest?: {
    id: string;
    channel_name: string;
    posted_at: string;
    preview: string;
  } | null;
}

export interface Dashboard {
  identity: { handle: string; title: string; current_phase: string; proficiency: object; workingOn: string[] };
  stats: { aspectCount: number; tierCounts: { tier: string; c: number }[] };
  baseLayer: { symbol: string; name: string; proficiency: number; mantras: string[] }[];
  activeGoals: Goal[];
  recentRuns: DailyRunLog[];
  grok?: DashboardGrok;
  journal?: DashboardJournal;
}

export interface ForgeExample {
  id: number;
  title: string;
  ore: string;
  protocol: string;
}

export interface GenesisMilestone {
  order: number;
  label: string;
  type: string;
}

export type GoalStatus = 'active' | 'inactive' | 'completed';

export interface Goal {
  id: number;
  title: string;
  description: string;
  progress: number;
  aspect_link: string;
  status: GoalStatus | string;
  target_date?: string | null;
  created_at?: string;
}

export interface GoalInput {
  title: string;
  description?: string;
  aspect_link?: string;
  target_date?: string | null;
  status?: GoalStatus;
  progress?: number;
}
export interface Achievement { id: number; title: string; description: string; icon: string; unlocked_at: string | null; }
export interface Persona { id: number; name: string; archetype: string; symbol_chain: string; mantra: string; description: string; active: number; }
export interface Technique { id: number; code: string; name: string; description: string; config: object; }
export interface Fusion { id: number; name: string; inputs: string[]; output_aspect: string; operator: string; notes: string; }
export interface MathConcept { id: number; name: string; domain: string; description: string; formula: string; afs_link: string; }
export interface Visualization {
  id: number;
  title: string;
  type: string;
  path: string;
  description: string;
  aspect_link: string;
  /** Relative path for offline static HTML (e.g. videos/afs/foo.mp4) */
  media_url?: string | null;
  media_offline?: boolean;
  /** Relative exe path for engine launches (static) */
  launch_path?: string | null;
  launch_cmd?: string | null;
}
export interface VideoSyncResult {
  ok: boolean;
  dir: string;
  imagesDir?: string;
  inserted: number;
  files: number;
  imagesInserted?: number;
  imageFiles?: number;
  enthea: string;
  entheaPath: string;
  totalVisualizations: number;
  videosDir: string;
  entheaExe: string;
  newest?: string[];
}
export interface Automation { id: number; name: string; trigger_type: string; action: object; enabled: number; }
export interface Insight { id: number; title: string; body: string; source: string; tags: string[]; aspectLinks: string[]; }
export interface IdentityProfile {
  handle: string; title: string; bio: string; current_phase: string; evolution_path: string;
  proficiency: Record<string, unknown>; workingOn: string[]; evolutions: string[];
  topAspects: Aspect[];
  genesisMilestones?: GenesisMilestone[];
  grok?: { id: string; url: string; turn_count: number; session_count: number } | null;
}
export interface SearchResult { id: number; entity_type: string; title: string; body: string; tags: string; }
export interface ForgeSession { id: number; protocol: string; ore_input: string; created_at: string; result: ForgeResult; }
export interface GrokConversation {
  loaded: boolean;
  id?: string;
  title?: string;
  url?: string;
  turn_count?: number;
  char_count?: number;
  session_count?: number;
  source?: string;
  typeCounts?: { session_type: string; c: number }[];
}

export interface AfFiveSymbolEntry {
  symbol: string;
  name: string;
  aspect: string;
  ritual: string;
  task: string;
  alternatives: string[];
}

export interface AfFiveSymbols {
  title: string;
  source: string;
  pipeline: string[];
  symbols: AfFiveSymbolEntry[];
  cycle: string;
  formulas: { formula: string; name: string }[];
}
export interface GrokSessionSummary {
  id: number;
  conversation_id: string;
  session_index: number;
  session_type: string;
  title: string;
  user_chars: number;
  assistant_chars: number;
}
export interface GrokSessionDetail extends GrokSessionSummary {
  user_text: string;
  assistant_text: string;
}

export interface DiscordStatus {
  configured: boolean;
  guild_id?: string;
  guild_name?: string;
  invite_url?: string;
  sync_channel_ids?: string[];
  sync_channel_names?: string[];
  primary_journal_channel?: string;
  message_count: number;
  latest_posted_at?: string | null;
  latest_channel?: string | null;
  by_type?: { journal_type: string; c: number }[];
  recommended_channels?: { name: string; journal_type: string; purpose: string }[];
}

export interface JournalExtractedAspect {
  name: string;
  symbol_chain: string;
  coreAffirmation?: string;
  supremeMantra?: string;
  comprehension?: string;
  category?: string;
  exists?: boolean;
  aspect_id?: number | null;
  radiantFaces?: { name: string; symbol: string; mantra: string }[];
}

export interface JournalAspectSyncResult {
  entry_id: string;
  extracted: string[];
  created: { name: string; id: number; symbol_chain: string }[];
  repaired?: { name: string; id: number; reason: string }[];
  skipped: { name: string; id: number; reason: string }[];
  errors: { name: string; error: string }[];
}

export interface JournalAttachment {
  url?: string;
  name: string;
  content_type?: string | null;
  width?: number | null;
  height?: number | null;
  local?: boolean;
  data?: string;
  /** Offline static bundle — inlined image */
  data_url?: string;
}

export interface DiscordJournalEntry {
  id: string;
  guild_id: string;
  channel_id: string;
  channel_name: string;
  author_id: string;
  author_name: string;
  content: string;
  attachments?: JournalAttachment[];
  journal_type: string;
  tags: string[];
  posted_at: string;
  synced_at: string;
}

export interface JournalHeadingClubResult {
  clubs: number;
  groups: number;
  headings: string[];
  remaining: number;
  channel: string;
}

export interface JournalSmartClubResult {
  purged_synthetic: number;
  heading_club: JournalHeadingClubResult;
  forge_club: { clubs: number; remaining: number; channel: string };
  remaining: number;
  headings: string[];
  channel: string;
}

export interface JournalSyncResult {
  ok: boolean;
  messages_fetched: number;
  channels_synced: number;
  total_entries: number;
  new_entries: number;
  smart_sync?: JournalSmartClubResult;
}