import { DiscordJournalEntry } from '../lib/api';
import { parseJournalContent, journalPreview } from '../lib/journal-parse';
import { JournalAttachmentGallery } from './JournalImageAttachments';
import JournalMarkdown from './JournalMarkdown';
import EmojiText from './EmojiText';

function isForgeOutput(content: string) {
  return /Master\s+(?:Fusion|Aspect)|Symbol Chain:|RDTQ|Radiant Faces|\*\*Response/i.test(content);
}

type Props = {
  entry: DiscordJournalEntry;
  showMeta?: boolean;
};

export default function JournalEntryReader({ entry, showMeta = true }: Props) {
  const parsed = parseJournalContent(entry.content, entry.channel_name);
  const forge = isForgeOutput(entry.content);

  if (forge) {
    const titleMatch = entry.content.match(/\*\*([A-Z][^*\n]{4,80})\*\*/);
    const title = titleMatch?.[1]?.trim() || parsed.title;
    return (
      <article className="space-y-4">
        {showMeta && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-forge-muted">
            <span className="rounded-full border border-forge-cyan/30 bg-forge-cyan/10 px-2 py-0.5 font-mono text-forge-cyan">
              #{entry.channel_name}
            </span>
            <span>{entry.author_name}</span>
            <span>·</span>
            <time dateTime={entry.posted_at}>{new Date(entry.posted_at).toLocaleString()}</time>
          </div>
        )}
        <h2 className="font-display text-2xl font-bold leading-snug text-white">{title}</h2>
        <JournalAttachmentGallery attachments={entry.attachments} />
        <JournalMarkdown content={entry.content} />
        {(parsed.tags.length > 0 || entry.tags?.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {[...new Set([...(entry.tags || []), ...parsed.tags])].map((t) => (
              <span key={t} className="rounded-full bg-forge-cyan/10 px-2 py-0.5 text-xs text-forge-cyan">
                #{t}
              </span>
            ))}
          </div>
        )}
      </article>
    );
  }

  return (
    <article className="space-y-4">
      {showMeta && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-forge-muted">
          <span className="rounded-full border border-forge-cyan/30 bg-forge-cyan/10 px-2 py-0.5 font-mono text-forge-cyan">
            #{entry.channel_name}
          </span>
          <span>{entry.author_name}</span>
          <span>·</span>
          <time dateTime={entry.posted_at}>{new Date(entry.posted_at).toLocaleString()}</time>
          {entry.id.startsWith('local-') && (
            <span className="rounded-full bg-forge-gold/10 px-2 py-0.5 text-forge-gold">in-app</span>
          )}
        </div>
      )}

      <h2 className="font-display text-2xl font-bold leading-snug text-white">{parsed.title}</h2>
      <JournalAttachmentGallery attachments={entry.attachments} />

      {(parsed.date || parsed.aspect || parsed.ritual) && (
        <div className="grid gap-3 rounded-xl border border-forge-border bg-white/[0.03] p-4 sm:grid-cols-2">
          {parsed.date && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-forge-muted">Date</p>
              <p className="mt-1 text-sm">{parsed.date}</p>
            </div>
          )}
          {parsed.aspect && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-forge-muted">Aspect / Symbol</p>
              <p className="mt-1 text-sm">
                <EmojiText text={parsed.aspect} size="sm" />
              </p>
            </div>
          )}
          {parsed.ritual && (
            <div className="sm:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-forge-muted">Ritual</p>
              <p className="mt-1 text-sm leading-relaxed">
                <EmojiText text={parsed.ritual} mixed size="sm" />
              </p>
            </div>
          )}
        </div>
      )}

      {(parsed.reflection || parsed.body) && (
        <div className="rounded-xl border border-forge-leaf/20 bg-forge-leaf/5 p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-forge-leaf">Reflection</p>
          <JournalMarkdown content={parsed.reflection || parsed.body} />
        </div>
      )}

      {(parsed.tags.length > 0 || entry.tags?.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {[...new Set([...(entry.tags || []), ...parsed.tags])].map((t) => (
            <span key={t} className="rounded-full bg-forge-cyan/10 px-2 py-0.5 text-xs text-forge-cyan">
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

export function JournalEntryPreview({ entry }: { entry: DiscordJournalEntry }) {
  const parsed = parseJournalContent(entry.content);
  return (
    <div>
      <p className="text-sm font-medium leading-snug">{parsed.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-forge-muted">
        {journalPreview(entry.content, 120, entry.attachments?.length || 0)}
      </p>
    </div>
  );
}