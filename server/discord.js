const fs = require('fs');
const path = require('path');
const db = require('./db');
const { dataPath } = require('./paths');
const {
  extractAttachmentsFromMessage,
  persistJournalAttachments,
  parseAttachmentsJson,
  hasJournalPayload,
} = require('./journal-attachments');

const CONFIG_PATH = dataPath('discord-server.json');

function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const guildId = process.env.DISCORD_GUILD_ID || raw.guild_id;
  const syncChannels = process.env.DISCORD_SYNC_CHANNELS
    ? process.env.DISCORD_SYNC_CHANNELS.split(',').map((s) => s.trim()).filter(Boolean)
    : raw.sync_channel_ids || [];
  const syncChannelNames = process.env.DISCORD_SYNC_CHANNEL_NAMES
    ? process.env.DISCORD_SYNC_CHANNEL_NAMES.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : (raw.sync_channel_names || [raw.primary_journal_channel || 'journal']).map((s) => s.toLowerCase());
  return {
    ...raw,
    guild_id: guildId,
    sync_channel_ids: syncChannels,
    sync_channel_names: syncChannelNames,
  };
}

function ensureDiscordSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS discord_messages (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_name TEXT,
      author_id TEXT,
      author_name TEXT,
      content TEXT,
      attachments_json TEXT DEFAULT '[]',
      journal_type TEXT,
      tags_json TEXT,
      posted_at TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_discord_messages_posted ON discord_messages(posted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_discord_messages_channel ON discord_messages(channel_id);
    CREATE INDEX IF NOT EXISTS idx_discord_messages_type ON discord_messages(journal_type);
  `);

  const cols = db.prepare('PRAGMA table_info(discord_messages)').all();
  if (!cols.some((c) => c.name === 'attachments_json')) {
    db.exec(`ALTER TABLE discord_messages ADD COLUMN attachments_json TEXT DEFAULT '[]'`);
  }
}

function inferJournalType(channelName, config) {
  const key = (channelName || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  return config.channel_journal_types?.[key] || 'journal';
}

function discordEntityId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  return h;
}

function extractHashtags(content) {
  const tags = new Set();
  const re = /#([\w-]+)/g;
  let m;
  while ((m = re.exec(content || '')) !== null) tags.add(m[1].toLowerCase());
  return [...tags];
}

function titleFromContent(content, channelName, attachments = []) {
  const skipMeta = (line) =>
    !line ||
    line === '---' ||
    /^Date:/i.test(line) ||
    /^Tags:/i.test(line) ||
    /^Aspect\/symbol:/i.test(line) ||
    /^Ritual:/i.test(line) ||
    /^Reflection:/i.test(line);
  const line =
    (content || '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => !skipMeta(l)) || '';
  const trimmed = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').slice(0, 120);
  if (trimmed) return trimmed;
  if (attachments.length) {
    const image = attachments.find((a) => (a.content_type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(a.name || ''));
    if (image?.name) return `Photo: ${image.name.replace(/\.[^.]+$/, '')}`;
    return `Journal photo (${attachments.length})`;
  }
  return `Entry in #${channelName || 'channel'}`;
}

/** Stable tag linking insights ↔ discord_messages (prevents duplicate insights on re-sync). */
function discordMsgInsightTag(messageId) {
  return `discord_msg:${messageId}`;
}

function journalTags(row) {
  const tags = new Set(row.tags || []);
  extractHashtags(row.content).forEach((t) => tags.add(t));
  tags.add(discordMsgInsightTag(row.id));
  return [...tags];
}

function removeDiscordInsightsForMessage(messageId) {
  ensureDiscordSchema();
  const needle = `%${discordMsgInsightTag(messageId)}%`;
  db.prepare(`DELETE FROM insights WHERE source = 'discord' AND tags_json LIKE ?`).run(needle);
}

function upsertDiscordMessage(row) {
  ensureDiscordSchema();
  const tags = journalTags(row);
  db.prepare(`
    INSERT INTO discord_messages (
      id, guild_id, channel_id, channel_name, author_id, author_name,
      content, attachments_json, journal_type, tags_json, posted_at, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      content = excluded.content,
      attachments_json = excluded.attachments_json,
      channel_name = excluded.channel_name,
      author_name = excluded.author_name,
      journal_type = excluded.journal_type,
      tags_json = excluded.tags_json,
      posted_at = excluded.posted_at,
      synced_at = datetime('now')
  `).run(
    row.id,
    row.guild_id,
    row.channel_id,
    row.channel_name,
    row.author_id,
    row.author_name,
    row.content || '',
    JSON.stringify(row.attachments || []),
    row.journal_type,
    JSON.stringify(tags),
    row.posted_at
  );

  removeDiscordInsightsForMessage(row.id);
  db.prepare(`
    INSERT INTO insights (title, body, source, tags_json, aspect_links_json, created_at)
    VALUES (?, ?, 'discord', ?, '[]', ?)
  `).run(row.title, row.content, JSON.stringify(tags), row.posted_at);

  const attachmentNote = (row.attachments || []).map((a) => a.name).join(' ');
  const searchBody = `${row.content}\n${attachmentNote}\n#${row.channel_name} ${tags.map((t) => `#${t}`).join(' ')}`;
  const entityId = discordEntityId(row.id);
  db.prepare('DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?').run('discord', entityId);
  db.prepare(
    'INSERT INTO search_index (entity_type, entity_id, title, body, tags) VALUES (?,?,?,?,?)'
  ).run('discord', entityId, row.title, searchBody, tags.join(','));

  db.saveDb();
}

function messageToRow(msg, config) {
  const channelName = msg.channel?.name || 'unknown';
  const content = msg.content || '';
  const attachments = extractAttachmentsFromMessage(msg);
  const tags = extractHashtags(content);
  const journalType = inferJournalType(channelName, config);
  if (journalType === 'meta') return null;
  if (!hasJournalPayload(content, attachments)) return null;
  return {
    id: msg.id,
    guild_id: msg.guildId || config.guild_id,
    channel_id: msg.channelId,
    channel_name: channelName,
    author_id: msg.author?.id,
    author_name: msg.author?.globalName || msg.author?.username || 'unknown',
    content,
    attachments,
    journal_type: journalType,
    tags,
    title: titleFromContent(content, channelName, attachments),
    posted_at: msg.createdAt?.toISOString?.() || new Date().toISOString(),
  };
}

function mapJournalRow(r) {
  if (!r) return null;
  return {
    ...r,
    tags: JSON.parse(r.tags_json || '[]'),
    attachments: parseAttachmentsJson(r.attachments_json),
  };
}

function getJournalEntry(id) {
  ensureDiscordSchema();
  return mapJournalRow(db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(id));
}

function getLatestJournalEntry(channelName) {
  ensureDiscordSchema();
  let sql = 'SELECT * FROM discord_messages WHERE 1=1';
  const params = [];
  if (channelName) {
    sql += ' AND LOWER(channel_name) = ?';
    params.push(channelName.toLowerCase());
  }
  sql += ' ORDER BY posted_at DESC LIMIT 1';
  return mapJournalRow(db.prepare(sql).get(...params));
}

function listJournalMessages({ type, q, limit = 50, channel } = {}) {
  ensureDiscordSchema();
  let sql = 'SELECT * FROM discord_messages WHERE 1=1';
  const params = [];
  if (type) {
    sql += ' AND journal_type = ?';
    params.push(type);
  }
  if (channel) {
    sql += ' AND LOWER(channel_name) = ?';
    params.push(channel.toLowerCase());
  }
  if (q) {
    sql += ' AND (content LIKE ? OR channel_name LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY posted_at DESC LIMIT ?';
  params.push(Math.min(limit, 200));
  return db.prepare(sql).all(...params).map(mapJournalRow);
}

function rowFromJournalRecord(record, overrides = {}) {
  const content = overrides.content ?? record.content;
  const attachments = overrides.attachments ?? parseAttachmentsJson(record.attachments_json);
  const channelName = record.channel_name || 'journal';
  const tags = extractHashtags(content);
  return {
    id: record.id,
    guild_id: record.guild_id,
    channel_id: record.channel_id,
    channel_name: channelName,
    author_id: record.author_id,
    author_name: overrides.author_name ?? record.author_name,
    content,
    attachments,
    journal_type: record.journal_type || 'journal',
    tags,
    title: titleFromContent(content, channelName, attachments),
    posted_at: overrides.posted_at ?? record.posted_at,
  };
}

function removeJournalIndexes(id, title, content) {
  const entityId = discordEntityId(id);
  db.prepare('DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?').run('discord', entityId);
  removeDiscordInsightsForMessage(id);
  if (title && content) {
    db.prepare(`DELETE FROM insights WHERE source = 'discord' AND title = ? AND body = ?`).run(title, content);
  }
}

function insertLocalJournalEntry({ content = '', author_name = 'Madhur', posted_at, attachments = [] }) {
  const config = loadConfig();
  const channelName = config.primary_journal_channel || 'journal';
  const id = `local-${Date.now()}`;
  const savedAttachments = persistJournalAttachments(id, attachments);
  if (!hasJournalPayload(content, savedAttachments)) {
    throw new Error('Journal entry requires text or at least one image');
  }
  const row = {
    id,
    guild_id: config.guild_id,
    channel_id: 'local',
    channel_name: channelName,
    author_id: 'local',
    author_name,
    content: (content || '').trim(),
    attachments: savedAttachments,
    journal_type: inferJournalType(channelName, config),
    tags: extractHashtags(content),
    title: titleFromContent(content, channelName, savedAttachments),
    posted_at: posted_at || new Date().toISOString(),
  };
  upsertDiscordMessage(row);
  return mapJournalRow(db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(id));
}

function updateJournalEntry(id, { content, author_name, posted_at, attachments }) {
  ensureDiscordSchema();
  const existing = db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(id);
  if (!existing) return null;

  const prevAttachments = parseAttachmentsJson(existing.attachments_json);
  removeJournalIndexes(
    id,
    titleFromContent(existing.content, existing.channel_name, prevAttachments),
    existing.content
  );

  const nextContent = content !== undefined ? content.trim() : existing.content;
  const nextAttachments = attachments !== undefined
    ? persistJournalAttachments(id, attachments)
    : prevAttachments;

  if (!hasJournalPayload(nextContent, nextAttachments)) {
    throw new Error('Journal entry requires text or at least one image');
  }

  const row = rowFromJournalRecord(existing, {
    content: nextContent,
    author_name,
    posted_at,
    attachments: nextAttachments,
  });
  upsertDiscordMessage(row);
  return mapJournalRow(db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(id));
}

function mergeJournalEntries(firstId, secondId) {
  ensureDiscordSchema();
  if (firstId === secondId) throw new Error('Cannot merge an entry with itself');

  const first = mapJournalRow(db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(firstId));
  const second = mapJournalRow(db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(secondId));
  if (!first || !second) throw new Error('One or both journal entries not found');

  const mergedContent = [first.content, second.content]
    .map((c) => (c || '').trim())
    .filter(Boolean)
    .join('\n\n---\n\n');

  const mergedAttachments = [
    ...(first.attachments || []),
    ...(second.attachments || []),
  ];

  if (!hasJournalPayload(mergedContent, mergedAttachments)) {
    throw new Error('Merged entry would be empty');
  }

  const earlierPosted = first.posted_at <= second.posted_at ? first.posted_at : second.posted_at;

  removeJournalIndexes(
    second.id,
    titleFromContent(second.content, second.channel_name, second.attachments),
    second.content
  );
  db.prepare('DELETE FROM discord_messages WHERE id = ?').run(second.id);

  const row = rowFromJournalRecord(first, {
    content: mergedContent,
    attachments: mergedAttachments,
    posted_at: earlierPosted,
  });
  upsertDiscordMessage(row);
  db.saveDb();

  return mapJournalRow(db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(firstId));
}

function isDiscordSnowflakeId(id) {
  return /^\d{17,20}$/.test(String(id || ''));
}

/** Remove bundled/local journal rows — keep only Discord snowflake messages. */
function purgeSyntheticJournalEntries() {
  ensureDiscordSchema();
  const rows = db.prepare(`
    SELECT * FROM discord_messages WHERE id NOT GLOB '[0-9]*'
  `).all();
  for (const row of rows) {
    removeJournalIndexes(
      row.id,
      titleFromContent(row.content, row.channel_name, parseAttachmentsJson(row.attachments_json)),
      row.content
    );
    db.prepare('DELETE FROM discord_messages WHERE id = ?').run(row.id);
  }
  if (rows.length) db.saveDb();
  return rows.length;
}

/** Merge multiple journal rows into the earliest anchor, optionally prefixing a heading. */
function mergeJournalGroup(ids, { heading, bodyParts } = {}) {
  ensureDiscordSchema();
  const uniqueIds = [...new Set((ids || []).map(String))].filter(Boolean);
  if (uniqueIds.length < 2) {
    throw new Error('mergeJournalGroup requires at least two entry ids');
  }

  const rows = uniqueIds
    .map((id) => mapJournalRow(db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(id)))
    .filter(Boolean)
    .sort((a, b) => new Date(a.posted_at) - new Date(b.posted_at));

  if (rows.length < 2) throw new Error('One or more journal entries not found');

  const anchor = rows[0];
  const bodies = (bodyParts || rows.map((r) => (r.content || '').trim())).filter(Boolean);
  const header = heading ? `## **${heading}**\n\n` : '';
  const mergedContent = `${header}${bodies.join('\n\n')}`.trim();
  const mergedAttachments = rows.flatMap((r) => r.attachments || []);

  if (!hasJournalPayload(mergedContent, mergedAttachments)) {
    throw new Error('Merged entry would be empty');
  }

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    removeJournalIndexes(
      row.id,
      titleFromContent(row.content, row.channel_name, row.attachments),
      row.content
    );
    db.prepare('DELETE FROM discord_messages WHERE id = ?').run(row.id);
  }

  const merged = rowFromJournalRecord(anchor, {
    content: mergedContent,
    attachments: mergedAttachments,
    posted_at: anchor.posted_at,
  });
  upsertDiscordMessage(merged);
  db.saveDb();
  return mapJournalRow(db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(anchor.id));
}

function deleteJournalEntry(id) {
  ensureDiscordSchema();
  const existing = db.prepare('SELECT * FROM discord_messages WHERE id = ?').get(id);
  if (!existing) return false;

  const existingAttachments = parseAttachmentsJson(existing.attachments_json);
  removeJournalIndexes(
    id,
    titleFromContent(existing.content, existing.channel_name, existingAttachments),
    existing.content
  );
  db.prepare('DELETE FROM discord_messages WHERE id = ?').run(id);
  db.saveDb();
  return true;
}

function discordStatus() {
  const config = loadConfig();
  ensureDiscordSchema();
  const count = db.prepare('SELECT COUNT(*) as c FROM discord_messages').get()?.c || 0;
  const latest = db.prepare('SELECT posted_at, channel_name FROM discord_messages ORDER BY posted_at DESC LIMIT 1').get();
  const byType = db.prepare(
    'SELECT journal_type, COUNT(*) as c FROM discord_messages GROUP BY journal_type ORDER BY c DESC'
  ).all();
  return {
    configured: Boolean(process.env.DISCORD_BOT_TOKEN),
    guild_id: config.guild_id,
    guild_name: config.guild_name,
    invite_url: config.invite_url,
    sync_channel_ids: config.sync_channel_ids,
    sync_channel_names: config.sync_channel_names,
    primary_journal_channel: config.primary_journal_channel || 'journal',
    message_count: count,
    latest_posted_at: latest?.posted_at || null,
    latest_channel: latest?.channel_name || null,
    by_type: byType,
    recommended_channels: config.recommended_channels,
  };
}

module.exports = {
  loadConfig,
  ensureDiscordSchema,
  upsertDiscordMessage,
  discordMsgInsightTag,
  removeDiscordInsightsForMessage,
  removeJournalIndexes,
  titleFromContent,
  messageToRow,
  getJournalEntry,
  getLatestJournalEntry,
  listJournalMessages,
  insertLocalJournalEntry,
  updateJournalEntry,
  mergeJournalEntries,
  mergeJournalGroup,
  isDiscordSnowflakeId,
  purgeSyntheticJournalEntries,
  deleteJournalEntry,
  discordStatus,
};