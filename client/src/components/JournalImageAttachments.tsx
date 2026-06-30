import { ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import {
  DraftJournalAttachment,
  fileToDraftAttachment,
  isImageJournalAttachment,
  resolveJournalAttachmentUrl,
} from '../lib/journal-attachments';

type Props = {
  attachments: DraftJournalAttachment[];
  onChange: (next: DraftJournalAttachment[]) => void;
  disabled?: boolean;
};

export default function JournalImageAttachments({ attachments, onChange, disabled }: Props) {
  async function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;

    const added = await Promise.all(files.map((file) => fileToDraftAttachment(file)));
    onChange([...attachments, ...added]);
  }

  function removeAt(index: number) {
    const next = [...attachments];
    const [removed] = next.splice(index, 1);
    if (removed?.preview?.startsWith('blob:')) URL.revokeObjectURL(removed.preview);
    onChange(next);
  }

  const images = attachments.filter(isImageJournalAttachment);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-forge-border px-3 py-2 text-xs text-forge-muted transition hover:border-forge-cyan/40 hover:text-white">
          <ImagePlus size={14} />
          Add images
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled}
            className="hidden"
            onChange={handlePick}
          />
        </label>
        {images.length > 0 && (
          <span className="font-mono text-[10px] text-forge-muted">{images.length} attached</span>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attachments.map((att, index) => {
            if (!isImageJournalAttachment(att)) return null;
            const src = att.preview || resolveJournalAttachmentUrl(att.url, att) || '';
            return (
              <div
                key={`${att.url || att.name}-${index}`}
                className="group relative overflow-hidden rounded-xl border border-forge-border bg-black/30"
              >
                <img src={src} alt={att.name} className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label={`Remove ${att.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function JournalAttachmentGallery({
  attachments = [],
}: {
  attachments?: DraftJournalAttachment[];
}) {
  const images = attachments.filter(isImageJournalAttachment);
  if (!images.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {images.map((att, index) => (
        <a
          key={`${att.url}-${index}`}
          href={resolveJournalAttachmentUrl(att.url, att) || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="overflow-hidden rounded-xl border border-forge-border bg-black/30"
        >
          <img
            src={att.preview || resolveJournalAttachmentUrl(att.url, att)}
            alt={att.name}
            className="max-h-96 w-full object-contain"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}