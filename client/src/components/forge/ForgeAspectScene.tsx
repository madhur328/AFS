import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ForgeBaseAspect } from '../../lib/api';
import {
  createAspectSymbolSprite,
  labelOffsetForGeometry,
} from './aspect-symbol-sprite';
import {
  applyForgeCenterHighlight,
  buildCoinSafeTalisman,
  forgeCenterFromHit,
} from './coin-safe-talisman-model';

/** Center hub — coin-safe talisman on anvil */
export const FORGE_CENTER_KEY = 'forge';

const ASPECT_RING_RADIUS = 2.1;
const WORLD_FOCUS = new THREE.Vector3(0, 0, 0);

const DEFAULT_ORBIT = {
  theta: Math.PI / 2,
  phi: 0.55,
  radius: 5.4,
};

/** Shift content group so its bounding-box center sits at world origin */
function recenterContentGroup(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  box.getCenter(center);
  group.position.sub(center);
}

function fitOrbitRadius(camera: THREE.PerspectiveCamera, group: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
  const fovRad = (camera.fov * Math.PI) / 180;
  return Math.max(4.8, (maxDim / 2 / Math.tan(fovRad / 2)) * 1.45);
}

function meshForGeometry(type: string) {
  switch (type) {
    case 'cone':
      return new THREE.ConeGeometry(0.55, 1.1, 32);
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.65, 0);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(0.42, 0.12, 96, 12);
    case 'box':
      return new THREE.BoxGeometry(0.85, 0.85, 0.85);
    case 'torus':
      return new THREE.TorusGeometry(0.55, 0.18, 24, 48);
    default:
      return new THREE.SphereGeometry(0.62, 32, 32);
  }
}

export default function ForgeAspectScene({
  aspects,
  selectedKey,
  forgeKeys,
  yarnMode,
  onSelect,
}: {
  aspects: ForgeBaseAspect[];
  selectedKey: string | null;
  forgeKeys: Set<string>;
  yarnMode: boolean;
  onSelect: (key: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    contentGroup: THREE.Group;
    camera: THREE.PerspectiveCamera;
    meshes: Map<string, THREE.Object3D>;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    drag: {
      active: boolean;
      mode: 'orbit' | 'pan' | null;
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
    };
    target: THREE.Vector3;
    orbit: { theta: number; phi: number; radius: number };
    frame: number;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !aspects.length) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
    });
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const contentGroup = new THREE.Group();
    scene.add(contentGroup);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const keyLight = new THREE.DirectionalLight(0x00ff88, 1.0);
    keyLight.position.set(0, 4, 5);
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.35);
    fillLight.position.set(-4, 2, 2);
    const rim = new THREE.DirectionalLight(0xffd700, 0.45);
    rim.position.set(3, 1, -4);
    scene.add(ambient, keyLight, fillLight, rim);

    const loader = new THREE.TextureLoader();
    const meshes = new Map<string, THREE.Object3D>();
    const count = aspects.length;

    aspects.forEach((aspect, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const geom = meshForGeometry(aspect.geometry || 'sphere');
      const mat = new THREE.MeshStandardMaterial({
        color: 0x223322,
        metalness: 0.35,
        roughness: yarnMode ? 0.95 : 0.42,
        wireframe: yarnMode,
      });

      if (aspect.imageUrl && !yarnMode) {
        loader.load(aspect.imageUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.color.setHex(0xffffff);
          mat.needsUpdate = true;
        });
      }

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        Math.cos(angle) * ASPECT_RING_RADIUS,
        0,
        Math.sin(angle) * ASPECT_RING_RADIUS
      );
      mesh.userData = { key: aspect.key };

      const label = createAspectSymbolSprite(aspect.symbol);
      label.position.y = labelOffsetForGeometry(aspect.geometry || 'sphere');
      mesh.add(label);
      mesh.userData.labelSprite = label;

      contentGroup.add(mesh);
      meshes.set(aspect.key, mesh);
    });

    const forgeCenter = buildCoinSafeTalisman(loader, yarnMode);
    const forgeLabel = createAspectSymbolSprite('⚒️', 0.34);
    forgeLabel.position.y = 1.05;
    forgeCenter.add(forgeLabel);
    forgeCenter.userData.labelSprite = forgeLabel;
    contentGroup.add(forgeCenter);
    meshes.set(FORGE_CENTER_KEY, forgeCenter);

    const forgeGlow = new THREE.PointLight(0xff4400, 1.2, 4);
    forgeGlow.position.set(0, 0.35, 0);
    contentGroup.add(forgeGlow);

    recenterContentGroup(contentGroup);

    const state = {
      renderer,
      scene,
      contentGroup,
      camera,
      meshes,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      drag: { active: false, mode: null as 'orbit' | 'pan' | null, startX: 0, startY: 0, lastX: 0, lastY: 0 },
      target: WORLD_FOCUS.clone(),
      orbit: { ...DEFAULT_ORBIT, radius: fitOrbitRadius(camera, contentGroup) },
      frame: 0,
    };
    stateRef.current = state;

    const panRight = new THREE.Vector3();
    const panUp = new THREE.Vector3();

    const resize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const updateCamera = () => {
      const { orbit, target } = state;
      const sinPhi = Math.sin(orbit.phi);
      camera.position.set(
        target.x + orbit.radius * sinPhi * Math.cos(orbit.theta),
        target.y + orbit.radius * Math.cos(orbit.phi),
        target.z + orbit.radius * sinPhi * Math.sin(orbit.theta)
      );
      camera.lookAt(target);
    };

    const resetView = () => {
      state.target.copy(WORLD_FOCUS);
      state.orbit = { ...DEFAULT_ORBIT, radius: fitOrbitRadius(camera, contentGroup) };
      updateCamera();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      if (e.button === 2) e.preventDefault();
      state.drag.active = true;
      state.drag.mode = e.button === 2 ? 'pan' : 'orbit';
      state.drag.startX = e.clientX;
      state.drag.startY = e.clientY;
      state.drag.lastX = e.clientX;
      state.drag.lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!state.drag.active) return;
      const releasedOrbit = e.button === 0 && state.drag.mode === 'orbit';
      const releasedPan = e.button === 2 && state.drag.mode === 'pan';
      if (!releasedOrbit && !releasedPan) return;

      if (releasedOrbit) {
        const dx = Math.abs(e.clientX - state.drag.startX);
        const dy = Math.abs(e.clientY - state.drag.startY);
        if (dx < 4 && dy < 4) {
          const rect = renderer.domElement.getBoundingClientRect();
          state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          state.raycaster.setFromCamera(state.pointer, camera);
          const hits = state.raycaster.intersectObjects(contentGroup.children, true);
          for (const hit of hits) {
            if (forgeCenterFromHit(hit.object)) {
              onSelect(FORGE_CENTER_KEY);
              break;
            }
            const key = hit.object.userData?.key;
            if (key && key !== FORGE_CENTER_KEY) {
              onSelect(key);
              break;
            }
          }
        }
      }
      state.drag.active = false;
      state.drag.mode = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!state.drag.active) return;
      const dx = e.clientX - state.drag.lastX;
      const dy = e.clientY - state.drag.lastY;
      state.drag.lastX = e.clientX;
      state.drag.lastY = e.clientY;

      if (state.drag.mode === 'pan') {
        const panScale = 0.0022 * state.orbit.radius;
        camera.updateMatrixWorld();
        panRight.setFromMatrixColumn(camera.matrix, 0);
        panUp.setFromMatrixColumn(camera.matrix, 1);
        state.target.addScaledVector(panRight, -dx * panScale);
        state.target.addScaledVector(panUp, dy * panScale);
        updateCamera();
        return;
      }

      state.orbit.theta += dx * 0.005;
      state.orbit.phi = Math.max(0.2, Math.min(1.15, state.orbit.phi + dy * 0.005));
      updateCamera();
    };

    const onDblClick = () => resetView();
    const onContextMenu = (e: Event) => e.preventDefault();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.orbit.radius = Math.max(3.5, Math.min(9, state.orbit.radius + e.deltaY * 0.004));
      updateCamera();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('dblclick', onDblClick);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(mount);
    resize();
    updateCamera();

    const animate = () => {
      state.frame = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      meshes.forEach((obj, key) => {
        if (key === FORGE_CENTER_KEY && obj instanceof THREE.Group) {
          const pulse = 1 + Math.sin(t * 1.2) * 0.015;
          obj.scale.setScalar(pulse);
          obj.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry.type === 'OctahedronGeometry') {
              child.rotation.y += 0.012;
              const mat = child.material as THREE.MeshStandardMaterial;
              mat.emissiveIntensity = 0.55 + Math.sin(t * 2) * 0.2;
            }
          });
        } else if (obj instanceof THREE.Mesh) {
          obj.rotation.y += 0.003;
          obj.rotation.x = Math.sin(t + key.length) * 0.08;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(state.frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('dblclick', onDblClick);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, [aspects, yarnMode, onSelect]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.meshes.forEach((obj, key) => {
      const selected = key === selectedKey;
      const label = obj.userData.labelSprite as THREE.Sprite | undefined;
      if (label) {
        const base = key === FORGE_CENTER_KEY ? 0.34 : 0.36;
        label.scale.setScalar(selected ? base * 1.18 : base);
      }

      if (key === FORGE_CENTER_KEY) {
        applyForgeCenterHighlight(obj, selected, yarnMode);
        return;
      }
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material as THREE.MeshStandardMaterial;
      const forged = forgeKeys.has(key);
      mat.emissive.setHex(selected ? 0x004433 : forged ? 0x332200 : 0x000000);
      mat.emissiveIntensity = selected ? 0.55 : forged ? 0.35 : 0;
      mat.wireframe = yarnMode;
      mat.roughness = yarnMode ? 0.95 : 0.42;
      mat.needsUpdate = true;
      obj.scale.setScalar(selected ? 1.15 : 1);
    });
  }, [selectedKey, forgeKeys, yarnMode]);

  return (
    <div
      ref={mountRef}
      className="relative h-[min(52vh,420px)] min-h-[300px] w-full cursor-grab overflow-hidden border border-[rgba(0,255,136,0.12)] bg-black active:cursor-grabbing"
    />
  );
}