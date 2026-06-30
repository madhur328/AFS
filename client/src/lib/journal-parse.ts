export type ParsedJournal = {
  title: string;
  date?: string;
  aspect?: string;
  ritual?: string;
  reflection?: string;
  tags: string[];
  body: string;
};

const FIELD_RE = /^(Date|Aspect\/symbol|Aspect|Symbol|Ritual|Reflection|Tags):\s*(.+)$/i;

export function parseJournalContent(content: string, fallbackTitle?: string): ParsedJournal {
  const lines = (content || '').split('\n');
  const fields: Record<string, string> = {};
  const bodyLines: string[] = [];
  const tagSet = new Set<string>();

  for (const line of lines) {
    const m = line.match(FIELD_RE);
    if (m) {
      const key = m[1].toLowerCase().replace(/\/symbol/, '');
      fields[key] = m[2].trim();
      if (key === 'tags') {
        m[2].split(/[\s,]+/).forEach((t) => {
          const clean = t.replace(/^#/, '').trim().toLowerCase();
          if (clean) tagSet.add(clean);
        });
      }
      continue;
    }
    const hashTags = line.match(/#([\w-]+)/g);
    hashTags?.forEach((t) => tagSet.add(t.slice(1).toLowerCase()));
    bodyLines.push(line);
  }

  const body = bodyLines.join('\n').trim();
  const firstLine = lines.map((l) => l.trim()).find(Boolean) || '';
  const title =
    fields.reflection?.slice(0, 80) ||
    fields.aspect?.slice(0, 80) ||
    firstLine.replace(FIELD_RE, '$2').slice(0, 120) ||
    fallbackTitle ||
    'Journal entry';

  return {
    title,
    date: fields.date,
    aspect: fields.aspect || fields.symbol,
    ritual: fields.ritual,
    reflection: fields.reflection || (body && !fields.date ? body : undefined),
    tags: [...tagSet],
    body: fields.reflection ? body : body || content,
  };
}

export function journalPreview(
  content: string,
  max = 100,
  attachmentCount = 0
): string {
  const parsed = parseJournalContent(content);
  const text = (parsed.reflection || parsed.body || parsed.title).replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, max);
  if (attachmentCount > 0) {
    return `📷 ${attachmentCount} image${attachmentCount === 1 ? '' : 's'}`.slice(0, max);
  }
  return 'Journal entry';
}