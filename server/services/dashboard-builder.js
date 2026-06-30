/**
 * Dashboard payload builder — used by /api/dashboard with kernel-store cache.
 */
const db = require('../db');
const kernelStore = require('./kernel-store');

function buildDashboardPayload() {
  const identity = db.prepare('SELECT * FROM identity WHERE id = 1').get();
  const aspectCount = db.prepare('SELECT COUNT(*) as c FROM aspects').get().c;
  const tierCounts = db.prepare('SELECT tier, COUNT(*) as c FROM aspects GROUP BY tier').all();
  const recentRuns = db.prepare('SELECT * FROM daily_runs ORDER BY completed_at DESC LIMIT 5').all();
  const recentForge = db.prepare('SELECT * FROM forge_sessions ORDER BY created_at DESC LIMIT 5').all();
  const goals = db.prepare("SELECT * FROM goals WHERE status = 'active' ORDER BY progress DESC").all();
  const { getBaseLayerSlots } = require('../base-layer');
  const canonicalOrder = getBaseLayerSlots().map((s) => s.symbol);
  const baseLayerRaw = db.prepare('SELECT * FROM base_layer_slots').all();
  const baseLayer = baseLayerRaw.sort(
    (a, b) => canonicalOrder.indexOf(a.symbol) - canonicalOrder.indexOf(b.symbol),
  );

  let grok = { loaded: false };
  try {
    const convs = db.prepare('SELECT * FROM grok_conversations ORDER BY imported_at DESC').all();
    const conv = convs.find((c) => c.id?.startsWith('37560952')) || convs[0];
    if (conv) {
      const typeCounts = db.prepare(
        'SELECT session_type, COUNT(*) as c FROM grok_sessions WHERE conversation_id = ? GROUP BY session_type',
      ).all(conv.id);
      const recentGrok = db.prepare(`
        SELECT id, session_type, title, session_index
        FROM grok_sessions
        WHERE conversation_id = ? AND session_type IN ('AFP','EOT','codex','origin','daily')
        ORDER BY session_index DESC LIMIT 6
      `).all(conv.id);
      const totalSessions = db.prepare('SELECT COUNT(*) as c FROM grok_sessions').get()?.c ?? 0;
      const secondarySessionCount = totalSessions - (conv.session_count || 0);
      grok = {
        loaded: true,
        ...conv,
        typeCounts,
        recentSessions: recentGrok,
        conversationCount: convs.length,
        secondarySessionCount: Math.max(0, secondarySessionCount),
        totalGrokSessions: totalSessions,
      };
    }
  } catch (_) {
    /* grok tables optional */
  }

  let journal = { loaded: false, entry_count: 0 };
  try {
    const { discordStatus, getLatestJournalEntry } = require('../discord');
    const status = discordStatus();
    const latest = getLatestJournalEntry(status.primary_journal_channel || 'journal');
    journal = {
      loaded: true,
      entry_count: status.message_count,
      configured: status.configured,
      guild_name: status.guild_name,
      latest: latest
        ? {
            id: latest.id,
            channel_name: latest.channel_name,
            posted_at: latest.posted_at,
            preview: (latest.content || '').split('\n').find((l) => l.trim())?.slice(0, 160) || '',
          }
        : null,
    };
  } catch (_) {
    /* discord optional */
  }

  return {
    identity: {
      ...identity,
      proficiency: JSON.parse(identity.proficiency_json || '{}'),
      workingOn: JSON.parse(identity.working_on_json || '[]'),
    },
    stats: { aspectCount, tierCounts },
    baseLayer: baseLayer.map((s) => ({ ...s, mantras: JSON.parse(s.mantras_json || '[]') })),
    recentRuns,
    recentForge,
    activeGoals: goals,
    grok,
    journal,
    _cachedAt: new Date().toISOString(),
  };
}

function getDashboardCached(ttlMs = kernelStore.DEFAULT_TTL_MS) {
  const { value, hit } = kernelStore.getOrBuild('dashboard', 'summary', buildDashboardPayload, ttlMs);
  return { payload: value, hit };
}

module.exports = {
  buildDashboardPayload,
  getDashboardCached,
};