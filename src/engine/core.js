import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export { THREE };
export const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
export const rbox = (w, h, d, r = 0.12) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));

// ---------- renderer / scene / camera ----------
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe8ff);
scene.fog = new THREE.Fog(0xdfe8ff, 34, 70);

export const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
// bloom only picks up bright, emissive things: screens, signs, the magnet ring
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.5, 1.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa4d6, 1.4));
export const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 4;
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18 });
scene.add(sun, sun.target);

// ---------- loop ----------
const updaters = new Set();
export const onFrame = (fn) => { updaters.add(fn); return () => updaters.delete(fn); };
const clock = new THREE.Clock();
export function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  for (const fn of updaters) fn(dt, t);
  updateFx(dt);
  composer.render(dt);
}
function loop() { tick(); requestAnimationFrame(loop); }
export const startLoop = () => requestAnimationFrame(loop);

// ---------- input ----------
export const keys = new Set();
const keyHandlers = new Set();
export const onKey = (fn) => { keyHandlers.add(fn); return () => keyHandlers.delete(fn); };
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (e.target instanceof HTMLInputElement) return;
  keys.add(k);
  if (audio.state === 'suspended') audio.resume();
  for (const fn of keyHandlers) fn(k, e);
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// touch joystick: drag anywhere on the canvas
export const touch = { x: 0, z: 0, active: false };
let touchStart = null;
renderer.domElement.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') touchStart = { x: e.clientX, y: e.clientY }; });
addEventListener('pointermove', (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x; const dy = e.clientY - touchStart.y;
  const len = Math.hypot(dx, dy);
  touch.active = len > 12;
  touch.x = len ? dx / Math.max(len, 60) : 0;
  touch.z = len ? dy / Math.max(len, 60) : 0;
});
addEventListener('pointerup', () => { touchStart = null; touch.active = false; touch.x = touch.z = 0; });

export function moveVector() {
  const v = new THREE.Vector3();
  if (keys.has('w') || keys.has('arrowup')) v.z -= 1;
  if (keys.has('s') || keys.has('arrowdown')) v.z += 1;
  if (keys.has('a') || keys.has('arrowleft')) v.x -= 1;
  if (keys.has('d') || keys.has('arrowright')) v.x += 1;
  if (touch.active) { v.x += touch.x; v.z += touch.z; }
  if (v.lengthSq() > 1) v.normalize();
  return v;
}

// ---------- audio (Web Audio synth, no files) ----------
export const audio = new (window.AudioContext || window.webkitAudioContext)();
export function beep(freq, dur = 0.12, type = 'sine', vol = 0.12, slide = 0) {
  const o = audio.createOscillator(); const g = audio.createGain();
  o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, audio.currentTime + dur);
  g.gain.setValueAtTime(vol, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
  o.connect(g).connect(audio.destination);
  o.start(); o.stop(audio.currentTime + dur);
}
const seq = (notes, gap, type = 'triangle', dur = 0.16) => notes.forEach((f, i) => setTimeout(() => beep(f, dur, type), i * gap));
export const sfx = {
  good: () => seq([660, 990], 80),
  great: () => seq([523, 659, 784, 1047, 1319], 70),
  bad: () => beep(220, 0.4, 'sawtooth', 0.1, 0.4),
  click: () => beep(700, 0.05, 'square', 0.04),
  type: () => beep(1200 + Math.random() * 300, 0.02, 'square', 0.015),
  open: () => beep(400, 0.12, 'sine', 0.1, 2),
  chapter: () => seq([392, 523, 659, 784, 1047], 110, 'square', 0.22),
  door: () => beep(180, 0.5, 'triangle', 0.08, 2),
  hum: () => beep(55, 1.2, 'sawtooth', 0.05, 1.5),
};

// ---------- sprites ----------
export function textSprite(text, color = '#1b2240', bg = '#ffffff', scale = 1) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(30,40,100,0.25)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(12, 10, 488, 100, 50); g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = color;
  let size = 60;
  g.font = `700 ${size}px Fredoka, sans-serif`;
  while (g.measureText(text).width > 440 && size > 28) { size -= 4; g.font = `700 ${size}px Fredoka, sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 62);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(4 * scale, scale, 1);
  s.renderOrder = 10;
  return s;
}

export function emojiSprite(emoji, size = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = '96px serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, 64, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.setScalar(size);
  s.renderOrder = 12;
  return s;
}

// ---------- characters ----------
export function person({ color = 0x4f6bff, skin = 0xffe0bd, hair = null, coat = false } = {}) {
  const g = new THREE.Group();
  const rig = new THREE.Group();
  g.add(rig);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.6, 6, 16), std(coat ? 0xffffff : color));
  body.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), std(skin));
  head.position.y = 1.85;
  rig.add(body, head);
  if (coat) {
    const shirt = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.3, 4, 12), std(color));
    shirt.position.set(0, 1.15, 0.2);
    shirt.scale.z = 0.6;
    rig.add(shirt);
  }
  if (hair !== null) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(hair));
    h.position.y = 1.9;
    h.rotation.x = -0.25;
    rig.add(h);
  }
  const eyeMat = std(0x1b2240, { roughness: 0.2 });
  const eyes = [];
  for (const x of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), eyeMat);
    eye.position.set(x, 1.9, 0.38);
    rig.add(eye);
    eyes.push(eye);
  }
  const blushMat = std(0xff9aa8);
  for (const x of [-0.25, 0.25]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), blushMat);
    b.scale.set(1.3, 0.6, 0.4);
    b.position.set(x, 1.78, 0.35);
    rig.add(b);
  }
  const arms = [];
  for (const x of [-0.55, 0.55]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.25, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.4, 4, 8), std(coat ? 0xffffff : color));
    arm.position.y = -0.3;
    pivot.add(arm);
    rig.add(pivot);
    arms.push(pivot);
  }
  const feet = [];
  for (const x of [-0.2, 0.2]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), std(0x3a4066));
    f.scale.set(1, 0.6, 1.4);
    f.position.set(x, 0.1, 0.05);
    rig.add(f);
    feet.push(f);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x1b2240, transparent: true, opacity: 0.12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  g.add(shadow);
  g.userData = { rig, arms, feet, eyes, walk: Math.random() * 6, squash: 0, wave: 0, blink: 1 + Math.random() * 3, dust: 0 };
  return g;
}

export function animatePerson(m, speed, dt) {
  const u = m.userData;
  u.walk += dt * (speed > 0.1 ? 12 : 2);
  const amp = Math.min(1, speed / 5);
  u.rig.position.y = Math.abs(Math.sin(u.walk)) * 0.18 * amp;
  u.rig.rotation.z = Math.sin(u.walk) * 0.08 * amp;
  u.arms[0].rotation.x = Math.sin(u.walk) * 0.9 * amp;
  u.arms[1].rotation.x = -Math.sin(u.walk) * 0.9 * amp;
  u.feet[0].position.z = 0.05 + Math.sin(u.walk) * 0.2 * amp;
  u.feet[1].position.z = 0.05 - Math.sin(u.walk) * 0.2 * amp;
  if (u.wave > 0) {
    u.wave = Math.max(0, u.wave - dt);
    u.arms[1].rotation.z = -2.6 + Math.sin(u.wave * 20) * 0.4;
  } else u.arms[1].rotation.z = 0;
  // blink every few seconds
  u.blink -= dt;
  const shut = u.blink < 0.12;
  for (const e of u.eyes) e.scale.y = shut ? 0.15 : 1;
  if (u.blink < 0) u.blink = 2 + Math.random() * 3;
  // footstep dust
  if (speed > 3) {
    u.dust -= dt;
    if (u.dust <= 0) { u.dust = 0.18; puff(m.getWorldPosition(new THREE.Vector3())); }
  }
  u.squash = Math.max(0, u.squash - dt * 4);
  const s = 1 + Math.sin(u.walk * 0.5) * 0.02 * (1 - amp) - u.squash * 0.25;
  u.rig.scale.set(1 + u.squash * 0.2, s, 1 + u.squash * 0.2);
}

// ---------- particles / floating text / shake ----------
const confettiGeo = new THREE.PlaneGeometry(0.18, 0.1);
const particles = [];
const floaters = [];
export function burst(pos, colors, n = 40, power = 7) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(confettiGeo, new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, transparent: true }));
    m.position.copy(pos);
    const a = Math.random() * Math.PI * 2;
    const v = new THREE.Vector3(Math.cos(a) * Math.random() * power * 0.6, 4 + Math.random() * power, Math.sin(a) * Math.random() * power * 0.6);
    m.userData = { v, spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10), life: 1.4 + Math.random() * 0.6 };
    scene.add(m);
    particles.push(m);
  }
}
export function floatText(text, pos, color) {
  const s = textSprite(text, '#ffffff', color, 0.6);
  s.position.copy(pos).add(new THREE.Vector3(0, 3, 0));
  s.userData.life = 1.3;
  scene.add(s);
  floaters.push(s);
}
const puffGeo = new THREE.SphereGeometry(0.16, 8, 6);
const puffs = [];
export function puff(pos) {
  const m = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  m.position.set(pos.x + (Math.random() - 0.5) * 0.3, 0.12, pos.z + (Math.random() - 0.5) * 0.3);
  m.userData.life = 0.6;
  scene.add(m);
  puffs.push(m);
}
function updateFx(dt) {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.userData.life -= dt;
    p.scale.setScalar(1 + (0.6 - p.userData.life) * 2.5);
    p.position.y += dt * 0.4;
    p.material.opacity = Math.max(0, p.userData.life) * 0.9;
    if (p.userData.life <= 0) { scene.remove(p); p.material.dispose(); puffs.splice(i, 1); }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; const u = p.userData;
    u.v.y -= 14 * dt;
    u.v.multiplyScalar(0.985);
    p.position.addScaledVector(u.v, dt);
    if (p.position.y < 0.05) { p.position.y = 0.05; u.v.set(0, 0, 0); }
    p.rotation.x += u.spin.x * dt; p.rotation.y += u.spin.y * dt; p.rotation.z += u.spin.z * dt;
    u.life -= dt;
    p.material.opacity = Math.min(1, u.life * 2);
    if (u.life <= 0) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); }
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.userData.life -= dt;
    f.position.y += dt * 1.6;
    f.material.opacity = Math.min(1, f.userData.life * 2);
    if (f.userData.life <= 0) { scene.remove(f); floaters.splice(i, 1); }
  }
}
export const fx = { shake: 0 };
