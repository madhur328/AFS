import * as THREE from 'three';

const TALISMAN_TEXTURE = '/forge/coin-safe-talisman.jpg';
const ANVIL_TEXTURE = '/forge/forge-anvil-chamber.jpg';

function stdMat(
  opts: THREE.MeshStandardMaterialParameters & { wireframe?: boolean },
  yarnMode: boolean
) {
  return new THREE.MeshStandardMaterial({
    ...opts,
    wireframe: yarnMode,
  });
}

/** Procedural coin-safe talisman + anvil + hammer — center Forge hub */
export function buildCoinSafeTalisman(
  loader: THREE.TextureLoader,
  yarnMode: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { key: 'forge', isForgeCenter: true };

  const anvilMat = stdMat(
    { color: 0x1a1a28, metalness: 0.88, roughness: yarnMode ? 0.95 : 0.32 },
    yarnMode
  );
  if (!yarnMode) {
    loader.load(ANVIL_TEXTURE, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      anvilMat.map = tex;
      anvilMat.color.setHex(0xcccccc);
      anvilMat.needsUpdate = true;
    });
  }

  const anvilBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.88), anvilMat);
  anvilBody.position.y = -0.44;
  group.add(anvilBody);

  const anvilWaist = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.42), anvilMat.clone());
  anvilWaist.position.y = -0.26;
  group.add(anvilWaist);

  const anvilHorns = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.52), anvilMat.clone());
  anvilHorns.position.y = -0.16;
  group.add(anvilHorns);

  const baseBlob = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 20, 16),
    stdMat({ color: 0x050505, metalness: 0.75, roughness: 0.22 }, yarnMode)
  );
  baseBlob.scale.set(1.25, 0.7, 1.05);
  baseBlob.position.set(0, -0.02, 0.02);
  group.add(baseBlob);

  const vaultMat = stdMat(
    { color: yarnMode ? 0xcc2222 : 0xffffff, metalness: 0.25, roughness: yarnMode ? 0.95 : 0.52 },
    yarnMode
  );
  if (!yarnMode) {
    loader.load(TALISMAN_TEXTURE, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      vaultMat.map = tex;
      vaultMat.needsUpdate = true;
    });
  }
  const vault = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.6, 0.4), vaultMat);
  vault.position.set(0, 0.2, 0.06);
  group.add(vault);

  const slotTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.07, 0.36),
    stdMat({ color: 0x1a9a5a, metalness: 0.35, roughness: 0.45 }, yarnMode)
  );
  slotTop.position.set(0, 0.53, 0.06);
  group.add(slotTop);

  const slit = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.09, 0.38),
    stdMat({ color: 0x0a0a0a, metalness: 0.9, roughness: 0.15 }, yarnMode)
  );
  slit.position.set(0, 0.55, 0.06);
  group.add(slit);

  const emblem = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 24),
    stdMat({ color: 0xffd700, metalness: 0.6, roughness: 0.35, emissive: 0x332200, emissiveIntensity: 0.25 }, yarnMode)
  );
  emblem.position.set(0, 0.2, 0.27);
  group.add(emblem);

  const handleMat = stdMat({ color: 0xb8b8c8, metalness: 0.92, roughness: 0.28 }, yarnMode);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.58, 12), handleMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.5, 0.24, 0.12);
  group.add(handle);

  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 12),
    stdMat({ color: 0x111111, metalness: 0.55, roughness: 0.38 }, yarnMode)
  );
  knob.position.set(0.78, 0.24, 0.12);
  group.add(knob);

  const hammerHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.3, 0.15),
    stdMat({ color: 0x5a4a32, metalness: 0.88, roughness: 0.32 }, yarnMode)
  );
  hammerHead.position.set(-0.78, -0.06, 0.18);
  hammerHead.rotation.set(0.15, 0.25, 0.4);
  group.add(hammerHead);

  const hammerPeen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.04, 0.18, 10),
    stdMat({ color: 0x6a5a42, metalness: 0.9, roughness: 0.28 }, yarnMode)
  );
  hammerPeen.rotation.z = Math.PI / 2;
  hammerPeen.position.set(-0.95, 0.02, 0.18);
  group.add(hammerPeen);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.17, 0),
    stdMat({
      color: 0xff5500,
      emissive: 0xff3300,
      emissiveIntensity: yarnMode ? 0.15 : 0.7,
      metalness: 0.45,
      roughness: 0.12,
      transparent: true,
      opacity: 0.9,
    }, yarnMode)
  );
  crystal.position.set(0, 0.64, 0);
  crystal.scale.set(1, 1.35, 1);
  group.add(crystal);

  const tree = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.38, 10),
    stdMat({ color: 0x2a9a44, roughness: 0.65, metalness: 0.1 }, yarnMode)
  );
  tree.position.set(0, 0.88, 0);
  group.add(tree);

  for (let i = 0; i < 5; i++) {
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.006, 14),
      stdMat({ color: 0xffd700, metalness: 0.95, roughness: 0.18 }, yarnMode)
    );
    coin.rotation.x = Math.PI / 2;
    const angle = (i / 5) * Math.PI * 2;
    coin.position.set(Math.cos(angle) * 0.12, 0.72 + (i % 2) * 0.08, Math.sin(angle) * 0.08);
    group.add(coin);
  }

  const fern = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.28),
    stdMat({ color: 0x22dd55, side: THREE.DoubleSide, roughness: 0.8 }, yarnMode)
  );
  fern.position.set(-0.34, 0.38, 0.24);
  fern.rotation.y = 0.5;
  group.add(fern);

  for (let i = 0; i < 4; i++) {
    const scatterCoin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.005, 12),
      stdMat({ color: 0xddaa22, metalness: 0.9, roughness: 0.25 }, yarnMode)
    );
    scatterCoin.rotation.x = Math.PI / 2;
    scatterCoin.position.set(-0.45 + i * 0.22, -0.3, 0.32 + (i % 2) * 0.08);
    group.add(scatterCoin);
  }

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.userData.forgeCenter = true;
    }
  });

  centerGroupGeometry(group);

  return group;
}

/** Shift child positions so group origin sits at visual centroid */
export function centerGroupGeometry(group: THREE.Group) {
  const box = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  box.getCenter(center);
  group.children.forEach((child) => {
    child.position.sub(center);
  });
}

export function applyForgeCenterHighlight(
  group: THREE.Object3D,
  selected: boolean,
  yarnMode: boolean
) {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mat = child.material;
    if (!(mat instanceof THREE.MeshStandardMaterial)) return;
    mat.wireframe = yarnMode;
    if (child.geometry.type === 'OctahedronGeometry') {
      mat.emissive.setHex(selected ? 0xff6600 : 0xff3300);
      mat.emissiveIntensity = selected ? 1.0 : 0.65;
      return;
    }
    if (selected) {
      mat.emissive.setHex(0x553300);
      mat.emissiveIntensity = 0.35;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  });
}

export function forgeCenterFromHit(object: THREE.Object3D | null): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData?.isForgeCenter || node.userData?.key === 'forge') return true;
    node = node.parent;
  }
  return false;
}