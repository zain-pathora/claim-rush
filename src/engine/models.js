import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Kenney CC0 models (www.kenney.nl), served from public/models
const LIST = {
  chars: ['character-female-a', 'character-female-b', 'character-female-c', 'character-female-d', 'character-female-e', 'character-female-f',
    'character-male-a', 'character-male-b', 'character-male-c', 'character-male-d', 'character-male-e', 'character-male-f'],
  cars: ['sedan', 'suv', 'taxi', 'van', 'ambulance', 'hatchback-sports', 'police', 'delivery'],
  furniture: ['pottedPlant', 'plantSmall1', 'plantSmall2', 'chairDesk', 'loungeSofa', 'loungeChair', 'tableCoffee', 'bookcaseClosedWide', 'books',
    'lampSquareFloor', 'trashcan', 'sideTable', 'kitchenCoffeeMachine', 'coatRackStanding', 'laptop', 'rugRound', 'bench'],
  nature: ['tree_oak', 'tree_default', 'tree_detailed', 'tree_pineRoundA', 'tree_fat', 'flower_redA', 'flower_yellowA', 'plant_bush', 'plant_bushLarge'],
};
const cache = new Map();
export const hasModels = () => cache.size > 0;

export async function preloadModels(onProgress) {
  const loader = new GLTFLoader();
  const base = import.meta.env.BASE_URL + 'models/';
  const jobs = Object.entries(LIST).flatMap(([dir, names]) => names.map((n) => [n, `${base}${dir}/${n}.glb`]));
  let done = 0;
  await Promise.all(jobs.map(([name, url]) => loader.loadAsync(url).then((g) => {
    g.scene.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    cache.set(name, g);
  }).catch(() => {}).finally(() => onProgress?.(++done / jobs.length))));
}

// a clone scaled so its bounding box is `height` tall (or `size` across), feet on y=0
export function model(name, { height, size } = {}) {
  const g = cache.get(name);
  if (!g) return null;
  const obj = g.animations.length ? SkeletonUtils.clone(g.scene) : g.scene.clone(true);
  const box = new THREE.Box3().setFromObject(obj);
  const dim = box.getSize(new THREE.Vector3());
  const s = height ? height / dim.y : size ? size / Math.max(dim.x, dim.z) : 1;
  obj.scale.multiplyScalar(s);
  obj.position.y = -box.min.y * s;
  const wrap = new THREE.Group();
  wrap.add(obj);
  wrap.userData.animations = g.animations;
  wrap.userData.inner = obj;
  return wrap;
}
