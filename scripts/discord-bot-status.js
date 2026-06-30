/**
 * Check Discord bot connectivity and print invite URL if needed.
 * Run: node scripts/discord-bot-status.js
 */
require('./load-env');
const db = require('../server/db');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { loadConfig, discordStatus } = require('../server/discord');

const APP_ID = process.env.DISCORD_APP_ID || '1517626921351909466';
const BOT_INVITE = `https://discord.com/oauth2/authorize?client_id=${APP_ID}&permissions=66560&scope=bot`;

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('Missing DISCORD_BOT_TOKEN in .env');
  process.exit(1);
}

const config = loadConfig();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  await db.initDb();
  await c.guilds.fetch();
  const status = discordStatus();
  const headers = { Authorization: `Bot ${token}` };
  const app = await fetch('https://discord.com/api/v10/oauth2/applications/@me', { headers }).then((r) => r.json());

  console.log(`Bot: ${c.user.tag}`);
  console.log(`Configured guild: ${config.guild_name} (${config.guild_id})`);
  console.log(`Sync channels: #${(config.sync_channel_names || ['journal']).join(', #')}`);
  console.log(`DB messages: ${status.message_count}`);
  console.log(`Guild installs: ${app.approximate_guild_count ?? '?'}`);
  if (app.install_params?.scopes) {
    console.log(`Install scopes: ${app.install_params.scopes.join(', ')}`);
    console.log(`Install permissions: ${app.install_params.permissions}`);
  }

  const guild = c.guilds.cache.get(config.guild_id);
  if (guild) {
    console.log(`OK — bot is in ${guild.name}`);
    client.destroy();
    process.exit(0);
  }

  console.log('\n---');
  console.log('/test "hello world" works because the app has applications.commands only.');
  console.log('Journal sync needs the BOT in the server with Read Message History.');
  console.log('\nFix in Discord Developer Portal → journal reader → Installation:');
  console.log('  1. Scopes: check BOTH "bot" AND "applications.commands"');
  console.log('  2. Bot permissions: View Channels + Read Message History');
  console.log('  3. Bot → Privileged Gateway Intents → enable Message Content Intent');
  console.log('  4. Save, then re-invite using this URL:\n');
  console.log(`     ${BOT_INVITE}%20applications.commands`);
  console.log('\nThen run: npm run discord-backfill');

  client.destroy();
  process.exit(1);
});

client.login(token).catch((err) => {
  console.error('Login failed:', err.message);
  process.exit(1);
});