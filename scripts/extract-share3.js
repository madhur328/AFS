/**
 * Extract sessions from Grok share-3 conversation (AFP Symbols & Daily Tasks).
 * Input: data/grok-share-3/conversation.xml (from renderchat --save-xml)
 */
const fs = require('fs');
const path = require('path');

const SRC_XML = path.join(__dirname, '..', 'data', 'grok-share-3', 'conversation.xml');
const OUT_DIR = path.join(__dirname, '..', 'data', 'grok-share-3');

const CONV_ID = '30fe2380-069b-42b8-bffe-b64689325eaf';
const CONV_URL = 'https://grok.com/share/c2hhcmQtMw_30fe2380-069b-42b8-bffe-b64689325eaf';
const CONV_TITLE = 'Aspect Forging Protocol: Symbols & Daily Tasks';

function firstLine(text, n = 100) {
  const line = (text || '').trim().split('\n', 1)[0];
  return line.slice(0, n);
}

function parseMessages(xml) {
  const messages = [];
  const re = /<message index="(\d+)" role="(user|assistant)">\s*<content>([\s\S]*?)<\/content>\s*<\/message>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    messages.push({
      index: parseInt(m[1], 10),
      role: m[2],
      text: m[3].trim(),
    });
  }
  return messages;
}

function pairTurns(messages) {
  const pairs = [];
  let i = 0;
  while (i < messages.length) {
    const t = messages[i];
    if (t.role === 'user') {
      let assistant = '';
      if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
        assistant = messages[i + 1].text;
        i += 2;
      } else {
        i += 1;
      }
      pairs.push({ user: t.text, assistant, startIndex: t.index });
    } else {
      pairs.push({ user: '', assistant: t.text, startIndex: t.index });
      i += 1;
    }
  }
  return pairs;
}

function extractGoal(blob) {
  const patterns = [
    /Run AFP on (.+?)(?:\n|$)/i,
    /Goal:\s*(.+?)(?:\n|$)/i,
    /Do EOT on (.+?)(?:\n|$)/i,
  ];
  for (const pat of patterns) {
    const m = blob.match(pat);
    if (m) return m[1].trim().slice(0, 200);
  }
  return null;
}

function classifySession(user, assistant) {
  const blob = `${user}\n${assistant}`;
  if (/Anchor Protocol|Five core symbols|small daily task|Aspect Analysis: Fit Check|Sprout Nurture Window|Tornado Sprint|Engine Log/i.test(blob)) {
    return ['daily', 'Five AFP Symbols + Daily Tasks'];
  }
  if (/alchemical formula|Wings of Ambition|Mirror of Truth|Whirlpool/i.test(blob)) {
    return ['codex', 'Alchemical formulas — momentum + reflection'];
  }
  if (/Unwavering Heart/i.test(blob) && /symbol|Mountain Heart|🏔️/i.test(blob)) {
    return ['codex', 'Unwavering Heart symbol — Mountain Heart'];
  }
  if (/DFS|Dynamic Forging System|Save\d|Mirror Export/i.test(blob)) {
    return ['codex', 'DFS / Save integration from symbols thread'];
  }
  if (/physiological|Drill of Penetrative|Kohinoor/i.test(blob)) {
    return ['codex', 'Physiological + drill aspects integration'];
  }
  if (/Run AFP|Aspect Forge Protocol \(AFP\)/i.test(blob)) {
    return ['AFP', extractGoal(blob) || 'Aspect Forge Protocol run'];
  }
  if (/Do EOT|Emotional Ore Transmutation/i.test(blob)) {
    return ['EOT', extractGoal(blob) || 'Emotional Ore Transmutation'];
  }
  if (/Synergistically fuse|Fallen Valkyrie/i.test(user)) {
    return ['origin', 'Symbols thread — fuse with cosmic visual'];
  }
  if (/meta.?analy/i.test(user)) {
    return ['codex', firstLine(user, 90)];
  }
  if (/comprehend these concepts|five interlocking Aspects/i.test(user)) {
    return ['daily', 'AFP symbol comprehension request'];
  }
  return ['other', firstLine(user || assistant, 90)];
}

function main() {
  if (!fs.existsSync(SRC_XML)) {
    console.error(`Missing ${SRC_XML}`);
    console.error('Copy renderchat XML export to data/grok-share-3/conversation.xml');
    process.exit(1);
  }

  const xml = fs.readFileSync(SRC_XML, 'utf-8');
  const messages = parseMessages(xml);
  const pairs = pairTurns(messages);

  const sessions = [];
  pairs.forEach((p, idx) => {
    if (!p.user && !p.assistant) return;
    const total = p.user.length + p.assistant.length;
    const [type, title] = classifySession(p.user, p.assistant);
    const keep = ['daily', 'codex', 'AFP', 'EOT', 'origin'].includes(type) || total >= 400;
    if (!keep) return;
    sessions.push({
      index: p.startIndex ?? idx,
      type,
      title,
      user_preview: p.user.slice(0, 400),
      assistant_preview: p.assistant.slice(0, 600),
      user_chars: p.user.length,
      assistant_chars: p.assistant.length,
      user_text: p.user,
      assistant_text: p.assistant,
    });
  });

  const byType = {};
  sessions.forEach((s) => {
    byType[s.type] = (byType[s.type] || 0) + 1;
  });

  const turnCount = messages.length;
  const charCount = messages.reduce((n, m) => n + m.text.length, 0);

  const index = {
    conversation_id: CONV_ID,
    url: CONV_URL,
    title: CONV_TITLE,
    turn_count: turnCount,
    char_count: charCount,
    session_count: sessions.length,
    counts: byType,
    milestones: [
      { label: 'Synergistically fuse — cosmic sphere visual', type: 'origin' },
      { label: 'Five AFP symbols defined ⚓🔥🌱🌪️🚂', type: 'daily' },
      { label: 'Daily tasks per symbol (Anchor → Engine)', type: 'daily' },
      { label: 'Alchemical formulas 🔥🪽⚓=🌪️', type: 'codex' },
      { label: 'Mirror of Truth + Whirlpool loop', type: 'codex' },
      { label: 'Unwavering Heart → 🏔️🪞 Mountain Heart', type: 'codex' },
      { label: 'DFS / Save integration', type: 'codex' },
    ],
    related_conversation: '37560952-5989-4407-a50e-cfb153c0fdaf',
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'sessions-full.json'), JSON.stringify(sessions, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'sessions-index.json'), JSON.stringify(index, null, 2));

  console.log(`Share-3 extract: ${sessions.length} sessions from ${turnCount} messages`);
  console.log('Counts:', byType);
}

main();