/**
 * AFS Discord Journal Archiver
 *
 * Setup:
 * 1. Create bot at https://discord.com/developers/applications
 * 2. Enable Message Content Intent
 * 3. Invite bot to your server (OAuth2 URL Generator → bot scope)
 * 4. Copy token to .env as DISCORD_BOT_TOKEN=
 * 5. node scripts/discord-bot.js
 */

require('./load-env');
const db = require('../server/db');
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const {
  loadConfig,
  upsertDiscordMessage,
  messageToRow,
  discordStatus,
} = require('../server/discord');
const { smartSyncJournal } = require('../server/journal-smart-club');
const { mirrorRemoteAttachments } = require('../server/journal-attachments');

async function boot() {
  await db.initDb();
}

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('Missing DISCORD_BOT_TOKEN. Copy .env.example → .env and add your bot token.');
  process.exit(1);
}

const config = loadConfig();
const syncSet = new Set(config.sync_channel_ids || []);
const syncNames = new Set((config.sync_channel_names || ['journal']).map((n) => n.toLowerCase()));

function shouldSyncChannel(channel) {
  if (!channel) return false;
  if (syncSet.size && syncSet.has(channel.id)) return true;
  if (syncNames.size && syncNames.has((channel.name || '').toLowerCase())) return true;
  if (!syncSet.size && !syncNames.size) return true;
  return false;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

async function syncMessage(msg) {
  if (!msg.guildId || msg.author?.bot) return;
  const channel = msg.channel;
  if (!shouldSyncChannel(channel)) return;
  const row = messageToRow(msg, config);
  if (!row) return;
  if (row.attachments?.length) {
    row.attachments = await mirrorRemoteAttachments(row.id, row.attachments);
  }
  upsertDiscordMessage(row);
  const photoNote = row.attachments?.length ? ` 📷${row.attachments.length}` : '';
  console.log(`[sync] #${row.channel_name} — ${row.title.slice(0, 60)}${photoNote}`);
}

async function backfillChannel(channel) {
  let fetched = 0;
  let before;
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    const ordered = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const msg of ordered) {
      await syncMessage(msg);
      fetched += 1;
    }
    before = ordered[0]?.id;
    if (batch.size < 100) break;
  }
  console.log(`[backfill] #${channel.name}: ${fetched} messages processed`);
}

async function resolveSyncChannels(guild) {
  const channels = [];
  const seen = new Set();

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

client.once(Events.ClientReady, async (c) => {
  console.log(`Discord bot ready as ${c.user.tag}`);
  console.log(`Guild: ${config.guild_name} (${config.guild_id})`);
  console.log(`Sync by name: #${[...syncNames].join(', #')}`);

  const guild = c.guilds.cache.get(config.guild_id);
  if (!guild) {
    console.warn('Bot is not in the configured guild yet. Invite it with your OAuth2 URL.');
    return;
  }

  const channels = await resolveSyncChannels(guild);
  if (!channels.length) {
    console.warn(`No sync channels found. Create #${[...syncNames][0] || 'journal'} in Discord, then restart the bot.`);
    return;
  }

  console.log(`Syncing: ${channels.map((ch) => `#${ch.name} (${ch.id})`).join(', ')}`);

  for (const channel of channels) {
    await backfillChannel(channel);
  }

  const channel = config.primary_journal_channel || 'journal';
  const smart = smartSyncJournal({ channel });
  const status = discordStatus();
  console.log(`Archive: ${status.message_count} Discord journal entries in AFS`);
  if (smart.heading_club?.headings?.length) {
    console.log(`Smart club: ${smart.remaining} entries — ${smart.heading_club.headings.join(' · ')}`);
  }
});

client.on(Events.MessageCreate, (msg) => syncMessage(msg).catch(console.error));
client.on(Events.MessageUpdate, (_old, msg) => syncMessage(msg).catch(console.error));

boot()
  .then(() => client.login(token))
  .catch((err) => {
    console.error('Discord bot failed:', err.message);
    process.exit(1);
  });