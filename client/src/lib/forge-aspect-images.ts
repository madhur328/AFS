import baseAspectLore from '../data/base-aspect-lore.json';

/** Lore visualization images — preferred for fullscreen aspect viz */
const LORE_IMAGE_FILES: Record<string, string> = {
  anchor: 'lore-anchor-ship-storm.jpg',
};

/** void_os / photoreal base-layer fallbacks */
const BASE_LAYER_IMAGE_FILES: Record<string, string> = {
  anchor: 'anchor_of_stability.jpg',
  fire: 'fire_of_conviction.jpg',
  clarity: 'key_of_clarity.jpg',
  tornado: 'tornado_of_momentum.jpg',
  chain: 'chain_of_synchronization.jpg',
  helix: 'helix_of_adaptability.jpg',
};

type LoreAspectRow = {
  base_layer_key?: string;
  image_data_url?: string;
};

function loreDataUrl(key: string): string | null {
  const row = (baseAspectLore as LoreAspectRow[]).find((e) => e.base_layer_key === key);
  return row?.image_data_url || null;
}

function isOfflineStatic(): boolean {
  return (
    import.meta.env.VITE_STATIC === 'true' ||
    (typeof window !== 'undefined' &&
      (window.location.protocol === 'file:' ||
        /afs-platform-static/i.test(window.location.pathname || window.location.href)))
  );
}

/** Resolve aspect image for forge viz — lore first, then base-layer photoreal */
export function forgeAspectImageUrl(key: string, preferLore = true): string | null {
  if (preferLore) {
    if (isOfflineStatic()) {
      const dataUrl = loreDataUrl(key);
      if (dataUrl) return dataUrl;
    }
    const loreFile = LORE_IMAGE_FILES[key];
    if (loreFile) return `/forge/lore/${loreFile}`;
  }
  const baseFile = BASE_LAYER_IMAGE_FILES[key];
  return baseFile ? `/forge/base-layer/${baseFile}` : null;
}

export function forgeLoreImageFiles(): Record<string, string> {
  return { ...LORE_IMAGE_FILES };
}