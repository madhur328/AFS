import { JournalAttachment } from './api';

export type DraftJournalAttachment = JournalAttachment & {
  data?: string;
  preview?: string;
};

export function resolveJournalAttachmentUrl(
  url?: string,
  att?: Pick<JournalAttachment, 'data_url'>
): string {
  if (att?.data_url) return att.data_url;
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('blob:')) return url;
  if (url.startsWith('/api/')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.endsWith('discordapp.com') || host.endsWith('discordapp.net')) {
        return `/api/discord/journal/proxy?url=${encodeURIComponent(url)}`;
      }
    } catch {
      /* fall through */
    }
    return url;
  }
  return `/api${url.startsWith('/') ? '' : '/'}${url}`;
}

export function isImageJournalAttachment(att: JournalAttachment): boolean {
  const type = (att.content_type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(att.name || att.url || '');
}

export async function fileToDraftAttachment(file: File): Promise<DraftJournalAttachment> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return {
    name: file.name,
    content_type: file.type || 'image/jpeg',
    data,
    preview: URL.createObjectURL(file),
  };
}

export function draftToPayload(attachments: DraftJournalAttachment[]): JournalAttachment[] {
  return attachments.map((att) => {
    if (att.data) {
      return {
        name: att.name,
        content_type: att.content_type,
        data: att.data,
      };
    }
    return {
      url: att.url,
      name: att.name,
      content_type: att.content_type,
      width: att.width,
      height: att.height,
      local: att.local,
    };
  });
}

export function entryToDraftAttachments(entry?: { attachments?: JournalAttachment[] }): DraftJournalAttachment[] {
  return (entry?.attachments || []).map((att) => ({ ...att }));
}

export function revokeDraftPreviews(attachments: DraftJournalAttachment[]) {
  for (const att of attachments) {
    if (att.preview?.startsWith('blob:')) URL.revokeObjectURL(att.preview);
  }
}