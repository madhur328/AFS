import * as THREE from 'three';

const LABEL_FONT =
  '56px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export function labelOffsetForGeometry(type: string) {
  switch (type) {
    case 'cone':
      return 0.88;
    case 'torusKnot':
      return 0.78;
    case 'box':
      return 0.82;
    case 'torus':
      return 0.72;
    case 'octahedron':
      return 0.8;
    default:
      return 0.82;
  }
}

/** Billboard sprite — emoji symbol floating above an aspect mesh */
export function createAspectSymbolSprite(symbol: string, scale = 0.36): THREE.Sprite {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x00ff88 }));
    fallback.scale.setScalar(scale);
    return fallback;
  }

  const glow = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  glow.addColorStop(0, 'rgba(0, 255, 136, 0.42)');
  glow.addColorStop(0.55, 'rgba(0, 255, 136, 0.12)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, size / 2, size / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  );
  sprite.scale.set(scale, scale, 1);
  sprite.renderOrder = 20;
  sprite.raycast = () => {};
  sprite.userData.isAspectLabel = true;
  return sprite;
}