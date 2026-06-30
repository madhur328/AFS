import { isStaticMode } from './staticApi';

declare global {
  interface Window {
    __AFS_SPIRAL_HTML__?: string;
  }
}

export type SpiralBootParams = Record<string, string>;

/** Inject offline boot params — blob/srcdoc iframes cannot use ?query on location.search. */
export function injectSpiralBootParams(html: string, params: SpiralBootParams): string {
  const boot = `<script>window.__AFS_SPIRAL_BOOT__=${JSON.stringify(params)};</script>`;
  if (html.includes('<body>')) return html.replace('<body>', `<body>${boot}`);
  if (html.includes('<body ')) return html.replace(/<body([^>]*)>/, `<body$1>${boot}`);
  return boot + html;
}

export function buildSpiralSrcdoc(params: SpiralBootParams): string | null {
  const base = window.__AFS_SPIRAL_HTML__;
  if (!base) return null;
  return injectSpiralBootParams(base, params);
}

export function spiralIframeSrc(params: SpiralBootParams): string {
  const qs = new URLSearchParams(params);
  return `/afs-recursive-spiral-engine.html?${qs}`;
}

export function useSpiralSrcdoc(): boolean {
  return isStaticMode() || import.meta.env.VITE_STATIC === 'true';
}

export function openStandaloneSpiral(params: SpiralBootParams) {
  if (useSpiralSrcdoc()) {
    const html = buildSpiralSrcdoc({ ...params, embed: '0' });
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
    return;
  }
  const qs = new URLSearchParams(params);
  window.open(`/afs-recursive-spiral-engine.html?${qs}`, '_blank', 'noopener,noreferrer');
}