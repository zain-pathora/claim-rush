import { THREE, scene, std, rbox, textSprite, emojiSprite, person } from '../engine/core.js';
import { model } from '../engine/models.js';

export const ROOM_SPACING = 18;
const HALF_W = 8; // inner half width (x)
const HALF_D = 7; // inner half depth (z)
const DOOR_HALF = 1.8;

export const ROOMS = [
  { id: 'office', name: 'Back Office', color: 0x3fb6ff, floor: 0xeef4ff },
  { id: 'lobby', name: 'Lobby · Front Desk', color: 0x2fcf8f, floor: 0xf7f3ec },
  { id: 'mri', name: 'Imaging · MRI Suite', color: 0x6f86ff, floor: 0xeef0ff },
  { id: 'reading', name: 'Reading Room · QC', color: 0xa66bff, floor: 0xf3eeff },
  { id: 'billing', name: 'Billing & Liens', color: 0xffa53d, floor: 0xfff6ea },
  { id: 'lawfirm', name: 'Law Firm', color: 0x8d6e63, floor: 0xf4ece6 },
];
export const roomX = (id) => ROOMS.findIndex((r) => r.id === id) * ROOM_SPACING;

export const colliders = []; // { x, z, r } circles or { x, z, hw, hd } boxes
export const interactables = []; // { pos, radius, label, icon, enabled(), use() }
export const npcs = {};
const animated = [];

function add(mesh, x, y, z, { shadow = true, collide = false } = {}) {
  mesh.position.set(x, y, z);
  mesh.traverse((m) => { if (m.isMesh) { m.castShadow = shadow; m.receiveShadow = true; } });
  scene.add(mesh);
  if (collide) {
    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push({ x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2, hw: (box.max.x - box.min.x) / 2 + 0.35, hd: (box.max.z - box.min.z) / 2 + 0.35 });
  }
  return mesh;
}
const box = (w, h, d, color, r = 0.1, extra) => new THREE.Mesh(rbox(w, h, d, r), std(color, extra));

// place a Kenney model; returns null if models didn't load
function deco(name, x, z, { height, size, rot = 0, collide = true, y = 0 } = {}) {
  const m = model(name, { height, size });
  if (!m) return null;
  m.rotation.y = rot;
  return add(m, x, y, z, { collide });
}

function plant(x, z, s = 1) {
  const k = deco(Math.random() < 0.5 ? 'pottedPlant' : 'plantSmall2', x, z, { height: 1.7 * s });
  if (k) return k;
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 16), std(0xff9f7a));
  pot.position.y = 0.3;
  g.add(pot);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.15, 12, 10), std(i % 2 ? 0x46c07a : 0x5fd690));
    leaf.position.set((Math.random() - 0.5) * 0.5, 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 0.5);
    g.add(leaf);
  }
  g.scale.setScalar(s);
  g.userData.sway = Math.random() * 6;
  animated.push((t) => { g.rotation.z = Math.sin(t * 1.2 + g.userData.sway) * 0.03; });
  return add(g, x, 0, z, { collide: true });
}

function desk(x, z, color, { monitor = true, rot = 0 } = {}) {
  const g = new THREE.Group();
  const base = box(3, 1.05, 1.4, color, 0.18);
  base.position.y = 0.52;
  const top = box(3.2, 0.12, 1.6, 0xffffff, 0.06);
  top.position.y = 1.1;
  g.add(base, top);
  if (monitor) {
    const mon = box(1, 0.68, 0.08, 0x2a3050, 0.04);
    mon.position.set(-0.6, 1.6, -0.3);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.56), std(color, { emissive: color, emissiveIntensity: 0.7 }));
    scr.position.set(-0.6, 1.6, -0.255);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.3), std(0x2a3050));
    stand.position.set(-0.6, 1.25, -0.3);
    g.add(mon, scr, stand);
    animated.push((t) => { scr.material.emissiveIntensity = 2.2 + Math.sin(t * 3 + x) * 0.4; });
  }
  const papers = box(0.55, 0.12, 0.42, 0xffffff, 0.03);
  papers.position.set(0.8, 1.22, 0);
  g.add(papers);
  g.rotation.y = rot;
  const placed = add(g, x, 0, z, { collide: true });
  deco('chairDesk', x + 0.9, z - 1.3, { height: 1.3, rot: Math.PI, collide: false });
  return placed;
}

function chairRow(x, z, n, color = 0x6f86ff, rot = 0) {
  const row = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const seat = box(1.1, 0.25, 1, color, 0.08);
    seat.position.set(i * 1.3, 0.55, 0);
    const back = box(1.1, 0.9, 0.2, color, 0.08);
    back.position.set(i * 1.3, 1, 0.45);
    row.add(seat, back);
  }
  row.rotation.y = rot;
  return add(row, x, 0, z, { collide: true });
}

function sign(text, x, z, color, y = 3.2) {
  const s = textSprite(text, '#ffffff', '#' + color.toString(16).padStart(6, '0'), 0.85);
  s.position.set(x, y, z);
  scene.add(s);
  return s;
}

export function addNpc(id, { name, role, x, z, color, skin, hair, coat, face = 0, icon, model: modelName }) {
  const m = person({ color, skin, hair, coat, model: modelName });
  m.rotation.y = face;
  add(m, x, 0, z);
  const tag = textSprite(name, '#1b2240', '#ffffff', 0.5);
  tag.position.y = 2.75;
  m.add(tag);
  const marker = emojiSprite(icon || '❗', 0.8);
  marker.position.y = 3.5;
  marker.visible = false;
  m.add(marker);
  colliders.push({ x, z, r: 0.8 });
  npcs[id] = { id, name, role, mesh: m, marker, icon };
  return npcs[id];
}

// gates between rooms: index i sits between room i and i+1
export const gates = [];
function gate(i) {
  const x = i * ROOM_SPACING + ROOM_SPACING / 2;
  const door = box(0.3, 2.6, DOOR_HALF * 2, 0xffffff, 0.1, { transparent: true, opacity: 0.85 });
  add(door, x, 1.3, 0);
  const stripe = box(0.34, 0.3, DOOR_HALF * 2 + 0.05, 0xff4d6d, 0.05);
  door.add(stripe);
  stripe.position.y = 0.2;
  const lock = emojiSprite('🔒', 0.9);
  lock.position.set(x, 3, 0);
  scene.add(lock);
  const g = { i, x, open: false, door, lock, lift: 0 };
  gates.push(g);
  animated.push((t, dt) => {
    g.lift += ((g.open ? 1 : 0) - g.lift) * Math.min(1, dt * 3);
    door.position.y = 1.3 + g.lift * 2.8;
    door.material.opacity = 0.85 * (1 - g.lift * 0.6);
    lock.visible = !g.open;
    lock.position.y = 3 + Math.sin(t * 2) * 0.1;
  });
  return g;
}
export const openGate = (i) => { if (gates[i]) gates[i].open = true; };

export function buildCampus() {
  // outdoor ground and street in front of the lobby
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 90), std(0x9fdc9a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(45, -0.32, 0);
  ground.receiveShadow = true;
  scene.add(ground);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(260, 8), std(0x5b6178));
  street.rotation.x = -Math.PI / 2;
  street.position.set(45, -0.3, 16);
  street.receiveShadow = true;
  scene.add(street);
  for (let x = -60; x < 160; x += 6) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), std(0xffffff));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, -0.29, 16);
    scene.add(dash);
  }
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(260, 3.4), std(0xd9dce8));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(45, -0.29, 10.5);
  scene.add(walk);

  const wallMat = std(0xffffff);
  ROOMS.forEach((room, i) => {
    const cx = i * ROOM_SPACING;
    const floor = new THREE.Mesh(rbox(ROOM_SPACING, 0.6, HALF_D * 2 + 1, 0.2), std(room.floor));
    floor.position.set(cx, -0.3, 0);
    floor.receiveShadow = true;
    scene.add(floor);
    const tileMat = std(new THREE.Color(room.floor).offsetHSL(0, 0, -0.04));
    for (let x = -HALF_W; x < HALF_W; x += 2) for (let z = -HALF_D; z < HALF_D; z += 2) {
      if (((x + z) / 2) % 2 === 0) continue;
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.02, 1.96), tileMat);
      t.position.set(cx + x + 1, 0.01, z + 1);
      t.receiveShadow = true;
      scene.add(t);
    }
    // back wall + windows, front wall is low so the camera sees in
    add(new THREE.Mesh(rbox(ROOM_SPACING, 2.8, 0.5, 0.2), wallMat), cx, 1.4, -HALF_D - 0.25);
    for (const wx of [-5, 0, 5]) {
      const win = box(3, 1.3, 0.1, 0xbfe4ff, 0.05, { emissive: 0x9fd8ff, emissiveIntensity: 0.5, roughness: 0.1 });
      add(win, cx + wx, 1.6, -HALF_D + 0.02, { shadow: false });
    }
    const trim = box(ROOM_SPACING, 0.35, 0.55, room.color, 0.1);
    add(trim, cx, 0.18, -HALF_D - 0.25);
    const front = new THREE.Mesh(rbox(ROOM_SPACING, 0.7, 0.4, 0.15), std(room.color));
    if (room.id !== 'lobby') add(front, cx, 0.35, HALF_D + 0.2);
    sign(room.name, cx, -HALF_D + 0.4, room.color, 3.6);
  });
  // side walls and dividers with door gaps
  for (let i = 0; i <= ROOMS.length; i++) {
    const x = i * ROOM_SPACING - ROOM_SPACING / 2;
    const seg = HALF_D - DOOR_HALF;
    for (const sz of [-1, 1]) {
      const full = i === 0 || i === ROOMS.length;
      const len = full ? HALF_D * 2 + 0.5 : seg;
      const z = full ? 0 : sz * (DOOR_HALF + seg / 2);
      if (full && sz === 1) continue;
      add(new THREE.Mesh(rbox(0.5, 2.8, len, 0.15), wallMat), x, 1.4, z);
    }
  }
  for (let i = 0; i < ROOMS.length - 1; i++) gate(i);
  // lobby entrance (front wall with a gap)
  const lx = roomX('lobby');
  for (const sx of [-1, 1]) add(new THREE.Mesh(rbox(6.5, 0.7, 0.4, 0.15), std(0x2fcf8f)), lx + sx * 5.75, 0.35, HALF_D + 0.2);
  sign('MEDIFLOW CLINIC', lx, HALF_D + 4.4, 0x2fcf8f, 1.6);

  buildOutdoors();
  buildProps();
  buildOffice(roomX('office'));
  buildLobby(lx);
  buildMri(roomX('mri'));
  buildReading(roomX('reading'));
  buildBilling(roomX('billing'));
  buildLawFirm(roomX('lawfirm'));
}

function buildOutdoors() {
  // gradient sky dome
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x7fa8ff) }, mid: { value: new THREE.Color(0xdfe8ff) }, bottom: { value: new THREE.Color(0xffe7d6) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bottom, smoothstep(0.0, -0.3, h)); gl_FragColor = vec4(c, 1.0); }',
  }));
  sky.position.set(45, 0, 0);
  scene.add(sky);

  // clouds drifting overhead
  const cloudMat = std(0xffffff, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.15 });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 1.2, 12, 10), cloudMat);
      s.position.set(k * 1.8 - 2.7, Math.random() * 0.6, Math.random() * 1.2);
      s.scale.y = 0.6;
      c.add(s);
    }
    c.position.set(-40 + i * 22, 16 + Math.random() * 6, -30 + Math.random() * 20);
    scene.add(c);
    const speed = 0.6 + Math.random() * 0.6;
    animated.push((t, dt) => { c.position.x += speed * dt; if (c.position.x > 150) c.position.x = -60; });
  }

  // skyline behind the building, windows glow
  const winMat = std(0xffe9a8, { emissive: 0xffd27a, emissiveIntensity: 1.4 });
  for (let i = 0; i < 22; i++) {
    const h = 8 + Math.random() * 14;
    const w = 5 + Math.random() * 4;
    const b = new THREE.Mesh(rbox(w, h, 5, 0.3), std([0xb9c5ff, 0xc9b9ff, 0xa9c9f5, 0xd6dcf0][i % 4]));
    b.position.set(-40 + i * 8.5, h / 2 - 0.3, -26 - Math.random() * 6);
    scene.add(b);
    for (let y = 2; y < h - 1; y += 2.2) for (let x = -w / 2 + 1; x < w / 2 - 0.5; x += 1.6) {
      if (Math.random() < 0.45) continue;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1), winMat);
      win.position.set(b.position.x + x, y, b.position.z + 2.52);
      scene.add(win);
    }
  }

  // trees along the back and the street
  const trunkMat = std(0x8d6e63);
  const leafMats = [std(0x5fd690), std(0x46c07a), std(0x7be0a4)];
  const TREES = ['tree_oak', 'tree_default', 'tree_detailed', 'tree_pineRoundA', 'tree_fat'];
  const tree = (x, z, s = 1) => {
    const k = deco(TREES[Math.floor(Math.random() * TREES.length)], x, z, { height: 4.2 * s, rot: Math.random() * 6, collide: false, y: -0.3 });
    if (k) { const sway = Math.random() * 6; animated.push((t) => { k.rotation.z = Math.sin(t * 0.9 + sway) * 0.02; }); return; }
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.6, 8), trunkMat);
    trunk.position.y = 0.8;
    g.add(trunk);
    for (let k = 0; k < 3; k++) {
      const l = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 - k * 0.2, 0), leafMats[k % 3]);
      l.position.y = 2 + k * 0.8;
      l.rotation.y = k;
      g.add(l);
    }
    g.scale.setScalar(s);
    const sway = Math.random() * 6;
    animated.push((t) => { g.rotation.z = Math.sin(t * 0.9 + sway) * 0.025; });
    add(g, x, -0.3, z);
  };
  for (let x = -14; x < 110; x += 7 + Math.random() * 3) tree(x, -11 - Math.random() * 3, 1 + Math.random() * 0.5);
  for (let x = -16; x < 112; x += 12) if (Math.abs(x - roomX('lobby')) > 5) tree(x, 21, 1.2);

  // street lamps on the sidewalk, bulbs bloom
  const bulbMat = std(0xfff3c4, { emissive: 0xffe28a, emissiveIntensity: 4 });
  for (let x = -12; x < 112; x += 14) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8), std(0x3a4066));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bulbMat);
    bulb.position.y = 1.9;
    pole.add(bulb);
    add(pole, x, 1.5, 12.4);
  }

  // parked cars across the street
  const carColors = [0x7fd3ff, 0xffc46b, 0xb39ddb, 0x8ee6b8, 0xff8fa3];
  const CARS = ['sedan', 'suv', 'taxi', 'van', 'hatchback-sports', 'delivery', 'police'];
  for (let i = 0; i < 7; i++) {
    if (deco(CARS[i], 4 + i * 15 + Math.random() * 4, 18.6, { size: 4, rot: Math.PI / 2, collide: false, y: -0.3 })) continue;
    const g = new THREE.Group();
    const body = new THREE.Mesh(rbox(3.2, 0.85, 1.6, 0.3), std(carColors[i % carColors.length]));
    body.position.y = 0.55;
    const cab = new THREE.Mesh(rbox(1.8, 0.65, 1.4, 0.25), std(0xdff3ff, { roughness: 0.1 }));
    cab.position.set(-0.2, 1.2, 0);
    g.add(body, cab);
    for (const [wx, wz] of [[-1, 0.8], [1, 0.8], [-1, -0.8], [1, -0.8]]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 14), std(0x222533));
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.32, wz);
      g.add(wh);
    }
    add(g, 4 + i * 15 + Math.random() * 4, -0.3, 18.6);
  }
}

function buildProps() {
  const lx = roomX('lobby');
  // ambulance out front, flowers and bushes by the entrance
  deco('ambulance', lx - 7, 13.6, { size: 4.6, rot: Math.PI / 2, collide: false, y: -0.3 });
  for (const [dx, n] of [[-3.2, 'plant_bushLarge'], [3.2, 'plant_bushLarge'], [-4.4, 'flower_redA'], [4.4, 'flower_yellowA'], [-5.4, 'plant_bush'], [5.4, 'plant_bush']]) {
    deco(n, lx + dx, 8.4, { height: n.startsWith('flower') ? 0.7 : 1.1, collide: false });
  }
  // lobby lounge
  if (deco('loungeSofa', lx - 5.2, 5.2, { size: 3, rot: Math.PI, collide: true })) {
    deco('loungeSofa', lx - 7.3, 2.4, { size: 3, rot: Math.PI / 2, collide: true });
    deco('tableCoffee', lx - 5, 2.6, { size: 1.6 });
    deco('lampSquareFloor', lx - 7.3, 5.6, { height: 2.2, collide: false });
  }
  deco('trashcan', lx + 6.6, -0.6, { height: 0.8 });
  // back office
  const ox = roomX('office');
  deco('sideTable', ox + 6.8, 2.5, { height: 1 });
  deco('kitchenCoffeeMachine', ox + 6.8, 2.5, { height: 0.7, y: 1, collide: false });
  deco('trashcan', ox - 1.5, -4.6, { height: 0.8 });
  // billing + law firm
  deco('coatRackStanding', roomX('billing') + 7, -6, { height: 2.2 });
  deco('bench', roomX('reading') + 5, 4.5, { size: 2.6, rot: 0 });
  const fx = roomX('lawfirm');
  deco('loungeChair', fx - 1.5, -0.2, { size: 1.4, rot: Math.PI });
  deco('loungeChair', fx + 1.5, -0.2, { size: 1.4, rot: Math.PI });
  deco('lampSquareFloor', fx + 5, -6, { height: 2.2 });
}

function buildOffice(cx) {
  desk(cx - 4, -3, 0x3fb6ff);
  desk(cx + 3, -3, 0x3fb6ff);
  const fax = box(1, 0.6, 0.8, 0xdde3ff, 0.1);
  add(fax, cx - 6.5, 1.3, 2);
  add(box(1.4, 1, 1, 0x9aa4d6, 0.1), cx - 6.5, 0.5, 2, { collide: true });
  plant(cx + 7, -6);
  plant(cx - 7, -6);
}

function buildLobby(cx) {
  // curved-ish front desk counter
  const counter = new THREE.Group();
  const base = box(6, 1.2, 1.4, 0x2fcf8f, 0.3);
  base.position.y = 0.6;
  const top = box(6.3, 0.14, 1.7, 0xffffff, 0.07);
  top.position.y = 1.25;
  counter.add(base, top);
  add(counter, cx, 0, -2.2, { collide: true });
  for (const dx of [-1.8, 1.4]) {
    const mon = box(1, 0.68, 0.08, 0x2a3050, 0.04);
    add(mon, cx + dx, 1.75, -2.6);
  }
  const kiosk = new THREE.Group();
  const post = box(0.5, 1.3, 0.5, 0xdde3ff, 0.1);
  post.position.y = 0.65;
  const screen = box(0.9, 0.6, 0.12, 0x2a3050, 0.05);
  screen.position.set(0, 1.5, 0);
  screen.rotation.x = -0.4;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.48), std(0x2fcf8f, { emissive: 0x2fcf8f, emissiveIntensity: 1 }));
  glow.position.set(0, 1.53, 0.07);
  glow.rotation.x = -0.4;
  kiosk.add(post, screen, glow);
  add(kiosk, cx + 5, 0, 1, { collide: true });
  if (!model('loungeSofa')) chairRow(cx - 6.5, 3.5, 4, 0x6f86ff); else chairRow(cx + 2.4, 5.6, 3, 0x6f86ff);
  if (!model('loungeSofa')) chairRow(cx - 6.5, 5.6, 4, 0x6f86ff);
  plant(cx + 7, -6, 1.2);
  plant(cx - 7.2, -6, 1.2);
  plant(cx + 7.2, 6, 1);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), std(0xd6f5e6));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(cx, 0.03, 2.6);
  scene.add(rug);
}

export const magnet = {};
function buildMri(cx) {
  // prescreen nook (left)
  desk(cx - 5, -3.5, 0x6f86ff);
  // the magnet (right)
  const g = new THREE.Group();
  const shell = box(3.6, 3.4, 2.2, 0xf4f6ff, 0.6);
  shell.position.y = 1.8;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.18, 16, 48), std(0x6f86ff, { emissive: 0x6f86ff, emissiveIntensity: 0.6 }));
  ring.position.set(0, 1.8, 1.12);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.3, 32, 1, true), std(0x2a3050, { side: THREE.DoubleSide }));
  bore.rotation.x = Math.PI / 2;
  bore.position.y = 1.8;
  const bed = box(1, 0.25, 3.4, 0xffffff, 0.1);
  bed.position.set(0, 1.05, 2.4);
  const bedBase = box(0.8, 1, 2, 0xdde3ff, 0.1);
  bedBase.position.set(0, 0.5, 2.8);
  g.add(shell, ring, bore, bed, bedBase);
  add(g, cx + 4, 0, -3.5, { collide: true });
  Object.assign(magnet, { group: g, ring, bed, x: cx + 4, z: -3.5 });
  animated.push((t) => { ring.material.emissiveIntensity = 2 + Math.sin(t * 4) * (magnet.scanning ? 1.5 : 0.4); });
  // warning floor stripe
  const zone = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.7, 48), new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.5 }));
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(cx + 4, 0.04, -2.5);
  scene.add(zone);
  sign('⚠ STRONG MAGNET', cx + 4, 1, 0xff4d6d, 4.2);
  // locker for metal items
  add(box(1.2, 2.2, 0.8, 0xb0bec5, 0.1), cx - 7, 1.1, 2.5, { collide: true });
  plant(cx - 7, -6);
}

function buildReading(cx) {
  for (const [dx, dz] of [[-4, -3], [3, -3]]) {
    desk(cx + dx, dz, 0xa66bff);
  }
  // light box with a fake scan
  const lb = box(3, 2, 0.15, 0x1b2240, 0.05);
  add(lb, cx, 2.2, -6.6, { shadow: false });
  const scanTex = document.createElement('canvas');
  scanTex.width = scanTex.height = 128;
  const g2 = scanTex.getContext('2d');
  g2.fillStyle = '#0b0f1e'; g2.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 5; i++) {
    g2.fillStyle = `rgba(220,230,255,${0.5 - i * 0.07})`;
    g2.beginPath(); g2.ellipse(64, 28 + i * 20, 18 - i, 8, 0, 0, Math.PI * 2); g2.fill();
  }
  const tex = new THREE.CanvasTexture(scanTex);
  const img = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: tex }));
  add(img, cx, 2.2, -6.5, { shadow: false });
  plant(cx + 7, -6);
}

function buildBilling(cx) {
  desk(cx - 4, -3, 0xffa53d);
  desk(cx + 3, -3, 0xffa53d);
  add(box(1.6, 1.1, 1, 0xdde3ff, 0.12), cx + 6.5, 0.55, 3, { collide: true });
  plant(cx - 7, -6);
  plant(cx + 7, 6);
}

function buildLawFirm(cx) {
  const wood = 0x8d6e63;
  desk(cx, -3, wood, { monitor: false });
  for (const dx of [-6, -3.8]) {
    const shelf = box(2, 2.6, 0.6, 0x6d4c41, 0.08);
    add(shelf, cx + dx, 1.3, -6.4, { collide: true });
    for (let r = 0; r < 3; r++) for (let b = 0; b < 5; b++) {
      const book = box(0.25, 0.55, 0.4, [0xc62828, 0x1565c0, 0x2e7d32, 0xf9a825][(r + b) % 4], 0.03);
      add(book, cx + dx - 0.7 + b * 0.35, 0.55 + r * 0.8, -6.1, { shadow: false });
    }
  }
  if (!model('loungeChair')) chairRow(cx - 1, -0.5, 2, 0x5d4037);
  plant(cx + 7, -6, 1.3);
}

export function updateCampus(dt, t) {
  for (const fn of animated) fn(t, dt);
}

// keep a point out of walls, furniture and closed doors
export function resolveCollisions(pos, prev) {
  pos.z = THREE.MathUtils.clamp(pos.z, -HALF_D + 0.5, HALF_D + 3.5);
  // only the lobby has a front opening
  const lobbyX = roomX('lobby');
  if (pos.z > HALF_D - 0.4 && Math.abs(pos.x - lobbyX) > 2.2) pos.z = Math.min(pos.z, HALF_D - 0.4);
  pos.x = THREE.MathUtils.clamp(pos.x, -HALF_W - 0.5, (ROOMS.length - 1) * ROOM_SPACING + HALF_W + 0.5);
  for (let i = 0; i < ROOMS.length - 1; i++) {
    const bx = i * ROOM_SPACING + ROOM_SPACING / 2;
    const crossed = Math.sign(prev.x - bx) !== Math.sign(pos.x - bx) || Math.abs(pos.x - bx) < 0.45;
    if (!crossed) continue;
    const blocked = Math.abs(pos.z) > DOOR_HALF - 0.4 || !gates[i].open;
    if (blocked) pos.x = prev.x < bx ? Math.min(pos.x, bx - 0.45) : Math.max(pos.x, bx + 0.45);
  }
  for (const c of colliders) {
    if (c.r) {
      const dx = pos.x - c.x; const dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < c.r + 0.4 && d > 0) { pos.x = c.x + (dx / d) * (c.r + 0.4); pos.z = c.z + (dz / d) * (c.r + 0.4); }
    } else {
      const dx = pos.x - c.x; const dz = pos.z - c.z;
      if (Math.abs(dx) < c.hw && Math.abs(dz) < c.hd) {
        const px = c.hw - Math.abs(dx); const pz = c.hd - Math.abs(dz);
        if (px < pz) pos.x = c.x + Math.sign(dx || 1) * c.hw; else pos.z = c.z + Math.sign(dz || 1) * c.hd;
      }
    }
  }
}
