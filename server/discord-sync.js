/**
 * Pull #journal messages from Discord into AFS (one-shot gateway session).
 */
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const db = require('./db');
const {
  loadConfig,
  upsertDiscordMessage,
  messageToRow,
  discordStatus,
} = require('./discord');
const { mirrorRemoteAttachments } = require('./journal-attachments');
const { smartSyncJournal } = require('./journal-smart-club');

function buildSyncContext() {
  const config = loadConfig();
  const syncSet = new Set(config.sync_channel_ids || []);
  const syncNames = new Set((config.sync_channel_names || ['journal']).map((n) => n.toLowerCase()));
  return { config, syncSet, syncNames };
}

function shouldSyncChannel(channel, { syncSet, syncNames }) {
  if (!channel) return false;
  if (syncSet.size && syncSet.has(channel.id)) return true;
  if (syncNames.size && syncNames.has((channel.name || '').toLowerCase())) return true;
  return false;
}

async function resolveSyncChannels(guild, ctx) {
  const channels = [];
  const seen = new Set();
  const { syncSet, syncNames } = ctx;

  for (const channelId of syncSet) {
    try {
      const channel = await guild.channels.fetch(channelId);
      if (channel?.isTextBased?.() && !seen.has(channel.id)) {
        channels.push(channel);
        seen.add(channel.id);
      }
    } catch (err) {
      console.warn(`Could not fetch channel ${channelId}:`, err.message);
    }
  }

  await guild.channels.fetch();
  for (const channel of guild.channels.cache.values()) {
    if (!channel.isTextBased?.()) continue;
    const name = (channel.name || '').toLowerCase();
    if (!syncNames.has(name) || seen.has(channel.id)) continue;
    channels.push(channel);
    seen.add(channel.id);
    syncSet.add(channel.id);
  }
  return channels;
}

async function backfillChannel(channel, ctx) {
  let fetched = 0;
  let before;
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    const ordered = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const msg of ordered) {
      if (!msg.guildId || msg.author?.bot) continue;
      if (!shouldSyncChannel(msg.channel, ctx)) continue;
      const row = messageToRow(msg, ctx.config);
      if (!row) continue;
      if (row.attachments?.length) {
        row.attachments = await mirrorRemoteAttachments(row.id, row.attachments);
      }
      upsertDiscordMessage(row);
      fetched += 1;
    }
    before = ordered[0]?.id;
    if (batch.size < 100) break;
  }
  return fetched;
}

async function syncJournalFromDiscord({ smartClub = true } = {}) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN not configured');
  }

  await db.initDb();
  const ctx = buildSyncContext();
  const beforeCount = discordStatus().message_count;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  let messagesFetched = 0;
  let channelsSynced = 0;

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Discord sync timed out after 5 minutes')), 5 * 60 * 1000);

      client.once(Events.ClientReady, async (c) => {
        try {
          await c.guilds.fetch();
          let guild = c.guilds.cache.get(ctx.config.guild_id);
          if (!guild && c.guilds.cache.size === 1) {
            guild = c.guilds.cache.first();
          }
          if (!guild) throw new Error('Bot not in configured Discord server');

          const channels = await resolveSyncChannels(guild, ctx);
          if (!channels.length) throw new Error('No sync channels found');

          for (const channel of channels) {
            messagesFetched += await backfillChannel(channel, ctx);
            channelsSynced += 1;
          }
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          clearTimeout(timeout);
        }
      });

      client.login(token).catch(reject);
    });
  } finally {
    client.destroy();
  }

  let smartSyncResult = null;
  if (smartClub) {
    const channel = ctx.config.primary_journal_channel || 'journal';
    smartSyncResult = smartSyncJournal({ channel });
  }

  const afterCount = discordStatus().message_count;
  return {
    ok: true,
    messages_fetched: messagesFetched,
    channels_synced: channelsSynced,
    total_entries: afterCount,
    new_entries: Math.max(0, afterCount - beforeCount),
    smart_sync: smartSyncResult,
  };
}

module.exports = {
  syncJournalFromDiscord,
  backfillChannel,
  resolveSyncChannels,
};