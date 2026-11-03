import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const STAGES = ['intake', 'exam', 'claim', 'lien'];
const STATION_INFO = {
  intake: { label: 'INTAKE', icon: '📋', color: 0x3fb6ff, css: '#3fb6ff', pos: [-7, -4] },
  exam: { label: 'EXAM', icon: '🩺', color: 0x2fcf8f, css: '#2fcf8f', pos: [7, -4] },
  claim: { label: 'CLAIM', icon: '💳', color: 0xffa53d, css: '#ffa53d', pos: [7, 3.5] },
  lien: { label: 'LIEN', icon: '⚖️', color: 0xa66bff, css: '#a66bff', pos: [-7, 3.5] },
};
const PATIENT_COLORS = [0xff8fa3, 0xffc46b, 0x7fd3ff, 0x8ee6b8, 0xd59bff, 0xfff07a];
const SKIN = [0xffe0bd, 0xf1c27d, 0xc68642, 0x8d5524, 0xffdbac];

const $ = (id) => document.getElementById(id);
const seed = await fetch(import.meta.env.BASE_URL + 'seed.json').then((r) => r.json());
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const rbox = (w, h, d, r = 0.12) => new RoundedBoxGeometry(w, h, d, 3, r);

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe8ff);
scene.fog = new THREE.Fog(0xdfe8ff, 32, 60);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
const camBase = new THREE.Vector3(0, 21, 17);
const camLook = new THREE.Vector3(0, 0, 1);
camera.position.copy(camBase);

scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa4d6, 1.4));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.position.set(10, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 4;
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
scene.add(sun);

// ---------- room ----------
const floor = new THREE.Mesh(rbox(23, 0.6, 21, 0.25), std(0xf7f3ec));
floor.position.y = -0.3;
floor.receiveShadow = true;
scene.add(floor);

const tileMat = std(0xece4f7);
for (let x = -10; x < 11; x += 2) for (let z = -9; z < 10; z += 2) {
  if (((x + z) / 2) % 2 === 0) continue;
  const t = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.02, 1.96), tileMat);
  t.position.set(x + 1, 0.01, z + 1);
  t.receiveShadow = true;
  scene.add(t);
}

const wallMat = std(0xffffff);
const trimMat = std(0x8f9dff);
for (const [w, d, x, z] of [[23, 0.5, 0, -10.5], [0.5, 21, -11.5, 0], [0.5, 21, 11.5, 0]]) {
  const wall = new THREE.Mesh(rbox(w, 2.6, d, 0.2), wallMat);
  wall.position.set(x, 1.3, z);
  wall.castShadow = wall.receiveShadow = true;
  scene.add(wall);
  const trim = new THREE.Mesh(rbox(w + 0.05, 0.3, d + 0.05, 0.1), trimMat);
  trim.position.set(x, 0.2, z);
  scene.add(trim);
}
// windows on the back wall
const glass = std(0xbfe4ff, { emissive: 0x9fd8ff, emissiveIntensity: 0.5, roughness: 0.1 });
for (const x of [-6, 0, 6]) {
  const win = new THREE.Mesh(rbox(3, 1.4, 0.1, 0.05), glass);
  win.position.set(x, 1.5, -10.2);
  scene.add(win);
}

// rug under the middle
const rug = new THREE.Mesh(new THREE.CircleGeometry(4, 48), std(0xdbe2ff));
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.03, -0.5);
rug.receiveShadow = true;
scene.add(rug);
const logoRing = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.6, 48), std(0xb9c5ff));
logoRing.rotation.x = -Math.PI / 2;
logoRing.position.set(0, 0.04, -0.5);
scene.add(logoRing);

function plant(x, z, s = 1) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 16), std(0xff9f7a));
  pot.position.y = 0.3;
  g.add(pot);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.15, 12, 10), std(i % 2 ? 0x46c07a : 0x5fd690));
    leaf.position.set((Math.random() - 0.5) * 0.5, 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 0.5);
    g.add(leaf);
  }
  g.traverse((m) => { m.castShadow = true; });
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  g.userData.sway = Math.random() * 6;
  scene.add(g);
  return g;
}
const plants = [plant(-10.3, -9.3, 1.2), plant(10.3, -9.3, 1.2), plant(-10.3, 9, 1), plant(10.3, 9, 1), plant(0, -9.4, 0.9)];

// waiting chairs
const chairMat = std(0x6f86ff);
for (let i = 0; i < 6; i++) {
  const c = new THREE.Group();
  const seat = new THREE.Mesh(rbox(1.1, 0.25, 1, 0.08), chairMat);
  seat.position.y = 0.55;
  const back = new THREE.Mesh(rbox(1.1, 0.9, 0.2, 0.08), chairMat);
  back.position.set(0, 1, 0.45);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5), std(0x555b7a));
  leg.position.y = 0.25;
  c.add(seat, back, leg);
  c.traverse((m) => { m.castShadow = true; });
  c.position.set(-4.5 + i * 1.8, 0, 9.4);
  scene.add(c);
}
const waitSign = textSprite('WAITING ROOM', '#ffffff', '#6f86ff', 0.75);
waitSign.position.set(0, 2.6, 9.8);
scene.add(waitSign);

function textSprite(text, color = '#1b2240', bg = '#ffffff', scale = 1) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(30,40,100,0.25)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(12, 10, 488, 100, 50); g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = color;
  g.font = '700 60px Fredoka, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 62);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(4 * scale, 1 * scale, 1);
  s.renderOrder = 10;
  return s;
}

function emojiSprite(emoji, size = 1) {
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
  s.userData.emoji = emoji;
  return s;
}

// ---------- stations ----------
const stations = {};
for (const key of STAGES) {
  const info = STATION_INFO[key];
  const group = new THREE.Group();
  const desk = new THREE.Mesh(rbox(3.4, 1.1, 1.6, 0.2), std(info.color));
  desk.position.y = 0.55;
  const top = new THREE.Mesh(rbox(3.6, 0.14, 1.8, 0.07), std(0xffffff));
  top.position.y = 1.15;
  const monitor = new THREE.Mesh(rbox(1, 0.7, 0.08, 0.05), std(0x2a3050));
  monitor.position.set(-0.7, 1.65, -0.3);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.58), std(info.color, { emissive: info.color, emissiveIntensity: 0.8 }));
  screen.position.set(-0.7, 1.65, -0.25);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.3), std(0x2a3050));
  stand.position.set(-0.7, 1.3, -0.3);
  const papers = new THREE.Mesh(rbox(0.6, 0.15, 0.45, 0.03), std(0xffffff));
  papers.position.set(0.8, 1.29, 0);
  group.add(desk, top, monitor, screen, stand, papers);
  group.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });

  const ring = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.6, 64), new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.35 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  const pad = new THREE.Mesh(new THREE.CircleGeometry(2.3, 64), new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.08 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.035;
  group.add(ring, pad);

  const icon = emojiSprite(info.icon, 1.3);
  icon.position.y = 3.2;
  const label = textSprite(info.label, '#ffffff', info.css, 0.7);
  label.position.y = 2.3;
  group.add(icon, label);

  const glow = new THREE.PointLight(info.color, 0, 6);
  glow.position.y = 1.8;
  group.add(glow);

  group.position.set(info.pos[0], 0, info.pos[1]);
  scene.add(group);
  stations[key] = { group, ring, pad, icon, glow, screen };
}

// ---------- characters ----------
function person(color, skin = 0xffe0bd) {
  const g = new THREE.Group();
  const rig = new THREE.Group();
  g.add(rig);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.6, 6, 16), std(color));
  body.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), std(skin));
  head.position.y = 1.85;
  const eyeMat = std(0x1b2240, { roughness: 0.2 });
  for (const x of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), eyeMat);
    eye.position.set(x, 1.9, 0.38);
    rig.add(eye);
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
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.4, 4, 8), std(color));
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
  rig.add(body, head);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x1b2240, transparent: true, opacity: 0.12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  g.add(shadow);
  g.userData = { rig, arms, feet, head, walk: 0, squash: 0 };
  return g;
}

function animatePerson(m, speed, dt) {
  const u = m.userData;
  u.walk += dt * (speed > 0.1 ? 12 : 2);
  const amp = Math.min(1, speed / 5);
  u.rig.position.y = Math.abs(Math.sin(u.walk)) * 0.18 * amp;
  u.rig.rotation.z = Math.sin(u.walk) * 0.08 * amp;
  u.arms[0].rotation.x = Math.sin(u.walk) * 0.9 * amp;
  u.arms[1].rotation.x = -Math.sin(u.walk) * 0.9 * amp;
  u.feet[0].position.z = 0.05 + Math.sin(u.walk) * 0.2 * amp;
  u.feet[1].position.z = 0.05 - Math.sin(u.walk) * 0.2 * amp;
  // idle breathing + squash recovery
  u.squash = Math.max(0, u.squash - dt * 4);
  const s = 1 + Math.sin(u.walk * 0.5) * 0.02 * (1 - amp) - u.squash * 0.25;
  u.rig.scale.set(1 + u.squash * 0.2, s, 1 + u.squash * 0.2);
}

const player = person(0x4f6bff);
const cap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), std(0x37c5b0));
cap.position.y = 1.95;
player.userData.rig.add(cap);
const steth = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 24, Math.PI), std(0xdde3ff, { metalness: 0.6, roughness: 0.3 }));
steth.position.set(0, 1.35, 0.25);
steth.rotation.set(Math.PI / 2.3, 0, Math.PI);
player.userData.rig.add(steth);
scene.add(player);

// ---------- particles ----------
const confettiGeo = new THREE.PlaneGeometry(0.18, 0.1);
const particles = [];
function burst(pos, colors, n = 40, power = 7) {
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
const floaters = [];
function floatText(text, pos, color) {
  const s = textSprite(text, '#ffffff', color, 0.6);
  s.position.copy(pos).add(new THREE.Vector3(0, 3, 0));
  s.userData.life = 1.3;
  scene.add(s);
  floaters.push(s);
}
function updateFx(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const u = p.userData;
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

let shake = 0;
function flash() {
  const f = $('flash');
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}

// ---------- game state ----------
const state = {
  running: false, paused: false, score: 0, level: 1, timeLeft: 60,
  denials: 0, done: 0, quota: 3, patients: [], carrying: null, spawnIn: 0, combo: 0,
};
const keys = new Set();
addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); onKey(e.key.toLowerCase()); });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const first = (p) => p.name.split(' ')[0];

function makePatient() {
  const inRoom = new Set(state.patients.map((x) => x.name));
  const p = pick(seed.patients.filter((x) => !inRoom.has(x.name)));
  const missing = pick(seed.documents);
  const exam = pick(seed.exams);
  const mesh = person(pick(PATIENT_COLORS), pick(SKIN));
  const tag = textSprite(first(p), '#1b2240', '#ffffff', 0.5);
  tag.position.y = 2.75;
  const mood = emojiSprite('😊', 0.7);
  mood.position.set(0.75, 2.75, 0);
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.14), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x1fc98a, depthTest: false }));
  barBg.renderOrder = 11; bar.renderOrder = 12;
  const barGroup = new THREE.Group();
  barGroup.add(barBg, bar);
  bar.position.z = 0.001;
  barGroup.position.y = 2.38;
  mesh.add(tag, mood, barGroup);
  mesh.position.set(0, 0, 11.5);
  mesh.scale.setScalar(0.01);
  scene.add(mesh);
  const patience = Math.max(25, 55 - state.level * 5);
  return {
    ...p, missing, exam, attorney: pick(seed.attorneys), stage: 0,
    mesh, bar, barGroup, mood, patience, maxPatience: patience, target: mesh.position.clone(), grow: 0,
  };
}

function toast(text, color) {
  const t = $('toast');
  t.textContent = text;
  t.style.color = color;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
}

// tiny web-audio synth; no asset files needed
const audio = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq, dur = 0.12, type = 'sine', vol = 0.12, slide = 0) {
  const o = audio.createOscillator(); const g = audio.createGain();
  o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, audio.currentTime + dur);
  g.gain.setValueAtTime(vol, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
  o.connect(g).connect(audio.destination);
  o.start(); o.stop(audio.currentTime + dur);
}
const sfx = {
  good: () => { beep(660, 0.1, 'triangle'); setTimeout(() => beep(990, 0.14, 'triangle'), 80); },
  paid: () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle'), i * 70)),
  bad: () => { beep(220, 0.4, 'sawtooth', 0.1, 0.4); },
  pick: () => beep(400, 0.12, 'sine', 0.12, 2),
  open: () => beep(700, 0.06, 'square', 0.04),
  level: () => [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'square', 0.06), i * 110)),
};

function removePatient(p) {
  scene.remove(p.mesh);
  state.patients = state.patients.filter((x) => x !== p);
  if (state.carrying === p) state.carrying = null;
}

function deny(p, reason) {
  state.denials++;
  state.combo = 0;
  sfx.bad();
  shake = 0.5;
  flash();
  burst(p.mesh.position.clone().setY(1.5), [0xff4d6d, 0x3a4066, 0xff8a5c], 25, 5);
  floatText('DENIED', p.mesh.position, '#ff4d6d');
  toast(`✖ Denied: ${reason}`, '#ff4d6d');
  bump('denials');
  removePatient(p);
  if (state.denials >= 3) setTimeout(() => gameOver('Three denials. The payer audits your clinic.'), 600);
}

function nearest(list, maxDist) {
  let best = null; let d = maxDist;
  for (const item of list) {
    const dist = item.pos.distanceTo(player.position);
    if (dist < d) { d = dist; best = item; }
  }
  return best;
}
const stationNear = () => nearest(STAGES.map((k) => ({ key: k, pos: stations[k].group.position })), 3.2)?.key;

function interact() {
  if (!state.running || state.paused) return;
  if (!state.carrying) {
    const p = nearest(state.patients.map((x) => ({ p: x, pos: x.mesh.position })), 2.4)?.p;
    if (p) { state.carrying = p; p.mesh.userData.squash = 1; player.userData.squash = 0.6; sfx.pick(); }
    return;
  }
  const key = stationNear();
  if (!key) return;
  const p = state.carrying;
  const need = STAGES[p.stage];
  if (key !== need) {
    toast(`${first(p)} needs ${STATION_INFO[need].icon} ${need.toUpperCase()} next`, '#ff4d6d');
    sfx.bad();
    shake = 0.2;
    return;
  }
  openPrompt(p, key);
}

const chips = (list) => `<div class="chips">${list.map((x) => `<span>${x}</span>`).join('')}</div>`;

function openPrompt(p, key) {
  let title; let body; let options; let correct;
  if (key === 'intake') {
    const present = seed.documents.filter((d) => d !== p.missing);
    title = `${p.name}`;
    body = `<i>${p.complaint}</i><br>Already on file:${chips(present)}Which document is still <b>missing</b>?`;
    correct = p.missing;
    options = shuffle([p.missing, ...shuffle(present).slice(0, 2)]);
  } else if (key === 'exam') {
    title = 'Chart the visit';
    body = `The doctor just performed <b>${p.exam.name}</b>. Pick the matching chart note.`;
    correct = p.exam.name;
    options = shuffle([p.exam.name, ...shuffle(seed.exams.filter((e) => e !== p.exam)).slice(0, 2).map((e) => e.name)]);
  } else if (key === 'claim') {
    title = 'Code the claim';
    body = `Service on the chart: <b>${p.exam.name}</b>. Which CPT code?`;
    correct = p.exam.cpt;
    options = shuffle([p.exam.cpt, ...shuffle(seed.exams.filter((e) => e !== p.exam)).slice(0, 2).map((e) => e.cpt)]);
  } else {
    title = 'File the lien';
    body = `${first(p)} signed a Letter of Protection with <b>${p.attorney}</b>. File with:`;
    correct = p.attorney;
    options = shuffle([p.attorney, ...shuffle(seed.attorneys.filter((a) => a !== p.attorney)).slice(0, 2)]);
  }
  state.paused = true;
  sfx.open();
  const info = STATION_INFO[key];
  $('prompt').style.setProperty('--st', info.css);
  $('prompt-badge').textContent = `${info.icon} ${info.label}`;
  $('prompt-title').textContent = title;
  $('prompt-body').innerHTML = body;
  const box = $('prompt-options');
  box.innerHTML = '';
  options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<kbd>${i + 1}</kbd><span>${opt}</span>`;
    b.onclick = () => answer(p, key, opt === correct);
    box.appendChild(b);
  });
  state.answer = (i) => options[i] !== undefined && answer(p, key, options[i] === correct);
  $('prompt-wrap').classList.remove('hidden');
}

function answer(p, key, ok) {
  $('prompt-wrap').classList.add('hidden');
  state.paused = false;
  state.answer = null;
  if (!ok) {
    const reasons = { intake: 'missing document', exam: 'chart mismatch', claim: 'wrong CPT code', lien: 'wrong attorney' };
    return deny(p, reasons[key]);
  }
  p.stage++;
  p.patience = Math.min(p.maxPatience, p.patience + 8);
  p.mesh.userData.squash = 1;
  const st = stations[key];
  st.icon.userData.pop = 1;
  burst(st.group.position.clone().setY(2), [STATION_INFO[key].color, 0xffffff], 18, 4);
  if (p.stage === STAGES.length) {
    state.combo++;
    const pts = 100 * state.level + Math.round(p.patience) * 5 + (state.combo - 1) * 50;
    state.score += pts;
    state.done++;
    sfx.paid();
    burst(p.mesh.position.clone().setY(2), [0xff5ca8, 0xffb833, 0x4f6bff, 0x1fc98a, 0x9b5cff], 70, 8);
    floatText(`+${pts}`, p.mesh.position, '#1fc98a');
    toast(`💸 Paid!${state.combo > 1 ? ` x${state.combo} combo` : ''}`, '#1fc98a');
    bump('score');
    removePatient(p);
    if (state.done >= state.quota) nextLevel();
  } else {
    sfx.good();
    floatText(`${STATION_INFO[key].label} ✓`, p.mesh.position, STATION_INFO[key].css);
  }
}

function bump(id) {
  const el = $(id);
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

function onKey(k) {
  if (audio.state === 'suspended') audio.resume();
  if (state.paused && state.answer && ['1', '2', '3'].includes(k)) return state.answer(Number(k) - 1);
  if (k === 'e' || k === ' ') interact();
}

function nextLevel() {
  state.level++;
  state.done = 0;
  state.quota = 2 + state.level;
  state.timeLeft = 50 + state.level * 10;
  setTimeout(sfx.level, 400);
  setTimeout(() => toast(`⭐ Level ${state.level}!`, '#4f6bff'), 900);
  bump('level');
  for (const k of STAGES) burst(stations[k].group.position.clone().setY(2), [0xffb833, 0xffffff], 20, 5);
}

function startGame() {
  for (const p of [...state.patients]) removePatient(p);
  Object.assign(state, { running: true, paused: false, score: 0, level: 1, timeLeft: 60, denials: 0, done: 0, quota: 3, spawnIn: 0, combo: 0 });
  player.position.set(0, 0, 3);
  $('screen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (audio.state === 'suspended') audio.resume();
}

function gameOver(reason) {
  if (!state.running) return;
  state.running = false;
  state.paused = false;
  for (const id of ['prompt-wrap', 'hud', 'carry', 'hint']) $(id).classList.add('hidden');
  let best = state.score;
  try { best = Math.max(best, Number(localStorage.getItem('claimrush-best') || 0)); localStorage.setItem('claimrush-best', best); } catch {}
  $('screen').innerHTML = `<div class="card"><h1>Shift over</h1><p class="tag">${reason}</p>
    <div class="stats"><div><b>${state.score}</b>Score</div><div><b>${state.level}</b>Level</div><div><b>${best}</b>Best</div></div>
    <button id="start" class="big">Play again</button></div>`;
  $('screen').classList.remove('hidden');
  $('start').onclick = startGame;
}

$('start').onclick = startGame;

// ---------- loop ----------
const clock = new THREE.Clock();
const move = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const camTarget = new THREE.Vector3();
const lastPos = new WeakMap();
let lastHud = '';

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const live = state.running && !state.paused;
  const nextKey = state.carrying ? STAGES[state.carrying.stage] : null;

  // stations idle animation
  for (const key of STAGES) {
    const s = stations[key];
    const active = key === nextKey;
    s.icon.userData.pop = Math.max(0, (s.icon.userData.pop || 0) - dt * 3);
    s.icon.position.y = 3.2 + Math.sin(t * 2 + s.group.position.x) * 0.15 + s.icon.userData.pop * 0.6;
    s.icon.scale.setScalar(1.3 * (1 + s.icon.userData.pop * 0.5 + (active ? Math.sin(t * 8) * 0.08 : 0)));
    s.ring.material.opacity = active ? 0.55 + Math.sin(t * 6) * 0.35 : 0.3;
    s.ring.scale.setScalar(active ? 1 + Math.sin(t * 6) * 0.04 : 1);
    s.pad.material.opacity = active ? 0.2 : 0.07;
    s.glow.intensity = THREE.MathUtils.lerp(s.glow.intensity, active ? 6 : 0, dt * 6);
    s.screen.material.emissiveIntensity = 0.6 + Math.sin(t * 3 + s.group.position.z) * 0.2;
  }
  for (const pl of plants) pl.rotation.z = Math.sin(t * 1.2 + pl.userData.sway) * 0.03;

  let speed = 0;
  if (live) {
    move.set(0, 0, 0);
    if (keys.has('w') || keys.has('arrowup')) move.z -= 1;
    if (keys.has('s') || keys.has('arrowdown')) move.z += 1;
    if (keys.has('a') || keys.has('arrowleft')) move.x -= 1;
    if (keys.has('d') || keys.has('arrowright')) move.x += 1;
    if (move.lengthSq()) {
      speed = 8;
      move.normalize();
      player.position.addScaledVector(move, speed * dt);
      player.position.x = THREE.MathUtils.clamp(player.position.x, -10.5, 10.5);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -9.5, 8.6);
      const targetRot = Math.atan2(move.x, move.z);
      let d = targetRot - player.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      player.rotation.y += d * Math.min(1, dt * 14);
    }

    state.timeLeft -= dt;
    if (state.timeLeft <= 0) gameOver(`Time's up on level ${state.level}.`);

    state.spawnIn -= dt;
    if (state.spawnIn <= 0 && state.patients.length < 2 + Math.min(state.level, 4)) {
      state.patients.push(makePatient());
      state.spawnIn = Math.max(3, 9 - state.level);
    }

    let waitIdx = 0;
    for (const p of [...state.patients]) {
      p.patience -= dt;
      const f = Math.max(0, p.patience / p.maxPatience);
      p.bar.scale.x = Math.max(0.001, f);
      p.bar.position.x = -0.6 * (1 - f);
      p.bar.material.color.setHSL(f * 0.36, 0.75, 0.5);
      p.barGroup.quaternion.copy(camera.quaternion);
      const face = f > 0.6 ? '😊' : f > 0.3 ? '😐' : '😠';
      if (p.mood.userData.emoji !== face) {
        p.mesh.remove(p.mood);
        p.mood = emojiSprite(face, 0.7);
        p.mood.position.set(0.75, 2.75, 0);
        p.mesh.add(p.mood);
      }
      if (f < 0.3) p.mood.position.x = 0.75 + Math.sin(t * 40) * 0.04;
      if (p.patience <= 0) { deny(p, `${first(p)} walked out`); continue; }

      if (state.carrying === p) {
        const behind = new THREE.Vector3(0, 0, -1.3).applyAxisAngle(up, player.rotation.y);
        p.target.copy(player.position).add(behind).setY(0);
      } else {
        p.target.set(-4.5 + (waitIdx % 6) * 1.8, 0, 8.4);
        waitIdx++;
      }
      p.grow = Math.min(1, p.grow + dt * 3);
      const e = 1 + Math.sin(p.grow * Math.PI) * 0.25;
      p.mesh.scale.setScalar(p.grow * e);
      const prev = lastPos.get(p) || p.mesh.position.clone();
      p.mesh.position.lerp(p.target, 1 - Math.exp(-7 * dt));
      const v = p.mesh.position.distanceTo(prev) / Math.max(dt, 1e-4);
      lastPos.set(p, p.mesh.position.clone());
      const look = state.carrying === p ? player.position : new THREE.Vector3(p.mesh.position.x, 0, 0);
      p.mesh.lookAt(look.x, 0, look.z);
      animatePerson(p.mesh, v, dt);
    }
    if (state.running) updateHud(t);
  } else if (state.paused) {
    for (const p of state.patients) animatePerson(p.mesh, 0, dt);
  }
  animatePerson(player, speed, dt);
  updateFx(dt);

  // camera: idle orbit on menus, soft follow in play
  if (state.running) {
    camTarget.set(player.position.x * 0.25, 0, player.position.z * 0.2 + 1);
    camera.position.lerp(camTarget.clone().add(camBase).sub(camLook), 1 - Math.exp(-3 * dt));
    camLook.lerp(camTarget, 1 - Math.exp(-3 * dt));
  } else {
    camera.position.set(Math.sin(t * 0.15) * 18, 18, Math.cos(t * 0.15) * 18);
    camLook.set(0, 0, 0);
  }
  camera.lookAt(camLook);
  if (shake > 0) {
    shake = Math.max(0, shake - dt);
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function updateHud(t) {
  const sig = `${state.score}|${state.level}|${state.done}|${Math.ceil(state.timeLeft)}|${state.denials}`;
  if (sig !== lastHud) {
    lastHud = sig;
    $('score').querySelector('.v').textContent = state.score.toLocaleString();
    $('level').querySelector('.v').textContent = `Lv ${state.level}`;
    $('level').querySelector('.quota i').style.width = `${(state.done / state.quota) * 100}%`;
    $('level').querySelector('.q').textContent = `${state.done}/${state.quota}`;
    $('timer').querySelector('.v').textContent = `${Math.ceil(state.timeLeft)}s`;
    $('timer').classList.toggle('low', state.timeLeft < 10);
    $('denials').querySelector('.hearts').textContent = '❤'.repeat(3 - state.denials) + '🤍'.repeat(state.denials);
  }

  const c = state.carrying;
  $('carry').classList.toggle('hidden', !c);
  if (c) {
    const f = Math.max(0, c.patience / c.maxPatience);
    const key = `${c.name}|${c.stage}`;
    if ($('carry').dataset.key !== key) {
      $('carry').dataset.key = key;
      $('carry').innerHTML = `<div class="name">${c.name}</div><div class="cc">${c.complaint}</div>
        <div class="steps">${STAGES.map((s, i) => `<span class="${i < c.stage ? 'done' : i === c.stage ? 'now' : ''}">${STATION_INFO[s].icon} ${STATION_INFO[s].label}</span>`).join('')}</div>
        <div class="mood"><i></i></div>`;
    }
    const bar = $('carry').querySelector('.mood i');
    bar.style.width = `${f * 100}%`;
    bar.style.background = `hsl(${f * 130}, 70%, 50%)`;
  } else delete $('carry').dataset.key;

  const st = stationNear();
  const nearP = !c && nearest(state.patients.map((x) => ({ pos: x.mesh.position })), 2.4);
  const hint = c && st ? `${STATION_INFO[st].icon} ${st === STAGES[c.stage] ? 'Check in at' : 'Wrong desk:'} ${STATION_INFO[st].label}` : nearP ? 'Pick up patient' : '';
  if ($('hint').dataset.h !== hint) {
    $('hint').dataset.h = hint;
    $('hint').innerHTML = `<kbd>E</kbd>${hint}`;
  }
  $('hint').classList.toggle('hidden', !hint);
}

tick();
if (import.meta.env.DEV) window.__game = { state, player, stations, interact, tick };

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
