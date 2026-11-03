import { THREE, scene, camera, sun, onFrame, startLoop, tick, onKey, moveVector, person, animatePerson, burst, fx, sfx, std, rbox, textSprite, audio } from './engine/core.js';
import { buildCampus, updateCampus, resolveCollisions, interactables, npcs, addNpc, openGate, roomX, magnet } from './world/campus.js';
import { showHud, setChapter, setObjective, setHint, dialog, chapterCard, resetMeters, meters, uiState, toast, wait } from './ui/ui.js';
import { CASE } from './data/case.js';
import { orderIntake, scheduling } from './chapters/office.js';
import { frontDesk } from './chapters/frontDesk.js';
import { mriSuite } from './chapters/mri.js';
import { readingRoom } from './chapters/reading.js';
import { billingRoom, money } from './chapters/billing.js';
import { lawFirm } from './chapters/lawfirm.js';

buildCampus();

// ---------- cast ----------
const lobby = roomX('lobby');
const mri = roomX('mri');
addNpc('rosa', { name: 'Rosa', role: 'Front Desk', x: lobby - 0.5, z: -3.4, color: 0x2fcf8f, skin: 0xf1c27d, hair: 0x3e2723, icon: '👩🏽‍💼' });
addNpc('dev', { name: 'Dev', role: 'MRI Technologist', x: mri - 5, z: -5, color: 0x6f86ff, skin: 0xc68642, hair: 0x1b1b1b, coat: true, icon: '🧑🏾‍🔬' });
addNpc('iris', { name: 'Dr. Wong', role: 'Radiologist', x: roomX('reading') - 4, z: -4.8, color: 0xa66bff, skin: 0xffdbac, hair: 0x212121, coat: true, icon: '👩🏻‍⚕️' });
addNpc('ben', { name: 'Ben', role: 'Biller', x: roomX('billing') - 4, z: -4.8, color: 0xffa53d, skin: 0xffe0bd, hair: 0xa1887f, icon: '🧑🏼‍💻' });
addNpc('lena', { name: 'Lena Ortiz', role: 'Attorney', x: roomX('lawfirm'), z: -4.8, color: 0x37474f, skin: 0xffe0bd, hair: 0x5d4037, icon: '👩🏻‍💼' });
addNpc('sam', { name: 'Ana', role: 'Intake Coordinator', x: roomX('office') - 4, z: -4.8, color: 0x3fb6ff, skin: 0x8d5524, hair: 0x1b1b1b, icon: '🧑🏿‍💼' });
for (const n of Object.values(npcs)) n.mesh.rotation.y = 0;

// the patient, who follows the player once checked in
const maya = person({ color: 0xff8fa3, skin: 0xc68642, hair: 0x2d1b14 });
maya.position.set(lobby + 3, 0, 12);
scene.add(maya);
const mayaTag = textSprite('Maya', '#1b2240', '#ffffff', 0.5);
mayaTag.position.y = 2.75;
maya.add(mayaTag);
const follow = { on: false, prev: new THREE.Vector3() };

// the player: care coordinator
const player = person({ color: 0x4f6bff, skin: 0xffe0bd, hair: 0x4e342e });
const lanyard = new THREE.Mesh(rbox(0.3, 0.38, 0.05, 0.04), std(0xffffff));
lanyard.position.set(0, 1.05, 0.45);
player.userData.rig.add(lanyard);
player.position.set(lobby, 0, 9);
scene.add(player);

// beacon over the current target
const beacon = new THREE.Group();
const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 4), std(0xffb833, { emissive: 0xffb833, emissiveIntensity: 0.6 }));
cone.rotation.x = Math.PI;
beacon.add(cone);
const halo = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 40), new THREE.MeshBasicMaterial({ color: 0xffb833, transparent: true, opacity: 0.6 }));
halo.rotation.x = -Math.PI / 2;
scene.add(beacon, halo);
beacon.visible = halo.visible = false;

// ---------- interaction ----------
let target = null;
export function waitFor(spot) {
  // spot: { npc } or { pos: Vector3, label, icon }
  return new Promise((resolve) => {
    const pos = spot.npc ? npcs[spot.npc].mesh.position : spot.pos;
    const label = spot.label || `Talk to ${npcs[spot.npc].name}`;
    target = { pos, label, radius: spot.radius || 2.6, resolve, npc: spot.npc };
    if (spot.npc) npcs[spot.npc].marker.visible = true;
  });
}
function tryUse() {
  if (!target || uiState.busy || state.cutscene) return;
  if (target.pos.distanceTo(player.position) > target.radius) return;
  const t = target;
  target = null;
  if (t.npc) { npcs[t.npc].marker.visible = false; npcs[t.npc].mesh.userData.wave = 0.8; facePlayer(npcs[t.npc].mesh); }
  sfx.click();
  t.resolve();
}
function facePlayer(m) { m.lookAt(player.position.x, 0, player.position.z); }
onKey((k) => { if (k === 'e' || k === ' ') tryUse(); });
addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse' && target && !uiState.busy) tryUse(); });

// ---------- loop ----------
const state = { playing: false, cutscene: false, camMode: 'orbit', camFocus: new THREE.Vector3(lobby, 0, 2) };
const camOffset = new THREE.Vector3(0, 15, 13);
const camLook = new THREE.Vector3(lobby, 0, 0);
const up = new THREE.Vector3(0, 1, 0);

onFrame((dt, t) => {
  updateCampus(dt, t);
  let speed = 0;
  if (state.playing && !uiState.busy && !state.cutscene) {
    const v = moveVector();
    if (v.lengthSq() > 0.01) {
      speed = 7 * v.length();
      const prev = player.position.clone();
      player.position.addScaledVector(v, 7 * dt);
      resolveCollisions(player.position, prev);
      let d = Math.atan2(v.x, v.z) - player.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      player.rotation.y += d * Math.min(1, dt * 14);
    }
  }
  animatePerson(player, speed, dt);

  // Maya follows
  if (follow.on) {
    const behind = new THREE.Vector3(0, 0, -1.4).applyAxisAngle(up, player.rotation.y);
    const goal = player.position.clone().add(behind);
    follow.prev.copy(maya.position);
    maya.position.lerp(goal, 1 - Math.exp(-5 * dt));
    const prev = follow.prev;
    resolveCollisions(maya.position, prev);
    maya.lookAt(player.position.x, 0, player.position.z);
    animatePerson(maya, maya.position.distanceTo(prev) / Math.max(dt, 1e-4), dt);
  } else animatePerson(maya, mayaWalk.speed, dt);
  for (const n of Object.values(npcs)) {
    animatePerson(n.mesh, 0, dt);
    n.marker.position.y = 3.5 + Math.sin(t * 4) * 0.12;
  }

  // beacon + hint
  if (target && state.playing) {
    beacon.visible = halo.visible = true;
    beacon.position.set(target.pos.x, (target.npc ? 4.3 : 2.6) + Math.sin(t * 4) * 0.2, target.pos.z);
    beacon.rotation.y = t * 2;
    halo.position.set(target.pos.x, 0.05, target.pos.z);
    halo.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    const near = target.pos.distanceTo(player.position) < target.radius;
    setHint(near && !uiState.busy ? target.label : '');
  } else { beacon.visible = halo.visible = false; setHint(''); }

  // camera
  if (state.camMode === 'orbit') {
    const r = 26;
    camera.position.set(lobby + Math.sin(t * 0.08) * r, 16, 6 + Math.cos(t * 0.08) * r * 0.7);
    camLook.lerp(new THREE.Vector3(lobby + 8, 0, 0), 0.05);
  } else if (state.camMode === 'focus') {
    camera.position.lerp(state.camFocus.clone().add(new THREE.Vector3(0, 9, 11)), 1 - Math.exp(-2.5 * dt));
    camLook.lerp(state.camFocus, 1 - Math.exp(-2.5 * dt));
  } else {
    const focus = player.position.clone().setY(0);
    camera.position.lerp(focus.clone().add(camOffset), 1 - Math.exp(-4 * dt));
    camLook.lerp(focus.add(new THREE.Vector3(0, 0, -1.5)), 1 - Math.exp(-4 * dt));
  }
  camera.lookAt(camLook);
  if (fx.shake > 0) {
    fx.shake = Math.max(0, fx.shake - dt);
    camera.position.x += (Math.random() - 0.5) * fx.shake;
    camera.position.y += (Math.random() - 0.5) * fx.shake;
  }
  sun.position.set(camLook.x + 10, 18, camLook.z + 8);
  sun.target.position.copy(camLook);
});

// simple scripted walk for Maya before she follows
const mayaWalk = { speed: 0 };
async function walkMaya(to, speed = 3) {
  const from = maya.position.clone();
  const dist = from.distanceTo(to);
  const steps = Math.max(1, dist / speed);
  const start = performance.now();
  maya.lookAt(to.x, 0, to.z);
  mayaWalk.speed = speed;
  await new Promise((resolve) => {
    const off = onFrame(() => {
      const k = Math.min(1, (performance.now() - start) / 1000 / steps);
      maya.position.lerpVectors(from, to, k);
      if (k >= 1) { off(); resolve(); }
    });
  });
  mayaWalk.speed = 0;
}

// ---------- intro: the accident ----------
function car(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(rbox(3.4, 0.9, 1.7, 0.3), std(color));
  body.position.y = 0.6;
  const cab = new THREE.Mesh(rbox(1.9, 0.7, 1.5, 0.25), std(0xdff3ff, { roughness: 0.1 }));
  cab.position.set(-0.2, 1.3, 0);
  g.add(body, cab);
  for (const [x, z] of [[-1.1, 0.85], [1.1, 0.85], [-1.1, -0.85], [1.1, -0.85]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16), std(0x222533));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.35, z);
    g.add(w);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  scene.add(g);
  return g;
}

async function intro() {
  state.cutscene = true;
  state.camMode = 'focus';
  const ax = lobby - 14;
  state.camFocus.set(ax, 0, 15);
  const mayaCar = car(0xff8fa3);
  const other = car(0x37474f);
  mayaCar.position.set(ax, -0.3, 15);
  other.position.set(ax - 22, -0.3, 15);
  await chapterCard(0, 'The Accident', `${CASE.accident.date} · ${CASE.accident.kind}`);
  await new Promise((resolve) => {
    const off = onFrame((dt) => {
      other.position.x += dt * 14;
      if (other.position.x > ax - 3.4) {
        other.position.x = ax - 3.4;
        off();
        fx.shake = 0.7;
        sfx.bad();
        burst(new THREE.Vector3(ax - 1.7, 1, 15), [0xffb833, 0xff4d6d, 0xffffff], 50, 6);
        mayaCar.position.x += 0.8;
        resolve();
      }
    });
  });
  await wait(700);
  await dialog({ name: CASE.patient.name, role: 'Driver', icon: '😣' }, [
    'Ow… my lower back. I didn\'t even see them coming.',
    'I don\'t have health insurance that covers this. How am I supposed to pay for an MRI?',
  ]);
  await dialog({ name: CASE.attorney.name, role: CASE.attorney.firm, icon: CASE.attorney.icon }, [
    'Maya, this is Lena Ortiz, your attorney. Don\'t worry about paying up front.',
    `I've sent a referral to ${CASE.clinic}. They'll treat you on a lien: they get paid from your settlement when the case closes.`,
  ]);
  scene.remove(mayaCar, other);
  state.cutscene = false;
}

// ---------- story flow ----------
async function story() {
  document.getElementById('screen').classList.add('hidden');
  if (audio.state === 'suspended') audio.resume();
  resetMeters();
  await intro();
  state.playing = true;
  state.camMode = 'follow';
  showHud(true);

  // amounts in cents, all made up
  const caseState = { billed: { tech: 180000, rad: 45000 }, buyPrice: 30000, ownsRad: false };
  const ctx = { player, maya, follow, npcs, waitFor, walkMaya, state, magnet, openGate, caseState };
  const unlock = (i, text) => { openGate(i); sfx.door(); toast(`🔓 ${text} unlocked`, 'good'); };
  player.position.set(roomX('office') + 2, 0, 2);
  await orderIntake(ctx);
  await scheduling(ctx);
  unlock(0, 'Lobby');
  await frontDesk(ctx);
  unlock(1, 'Imaging wing');
  await mriSuite(ctx);
  // Maya heads home; the rest of the case happens without her
  follow.on = false;
  walkMaya(new THREE.Vector3(roomX('lobby'), 0, 12), 3);
  toast('👋 Maya heads home. The case keeps moving without her.', 'info');
  unlock(2, 'Reading Room');
  await readingRoom(ctx);
  unlock(3, 'Billing');
  await billingRoom(ctx);
  unlock(4, 'Law Firm');
  await lawFirm(ctx);
  finale(caseState);
}

function grade() {
  const s = meters.trust * 0.3 + meters.compliance * 0.4 + meters.recovery * 0.3;
  return s >= 88 ? 'S' : s >= 78 ? 'A' : s >= 65 ? 'B' : s >= 50 ? 'C' : 'D';
}

function finale(cs) {
  state.playing = false;
  showHud(false);
  const reduction = cs.owned - cs.agreed;
  const radNet = cs.ownsRad ? Math.round(cs.agreed * cs.billed.rad / (cs.billed.tech + cs.billed.rad)) - cs.buyPrice : 0;
  const scr = document.getElementById('screen');
  scr.innerHTML = `<div class="card"><div class="kicker">Settlement statement · Claim PAID</div><div class="grade">${grade()}</div>
    <p class="tag">Maya got her MRI without paying a cent up front. The firm closed her case, and your lien is released.</p>
    <div class="recap">
      <div><span>Billed (${cs.ownsRad ? 'TECH + RAD' : 'TECH'})</span><b>${money(cs.owned)}</b></div>
      <div><span>Reduction (adjustment)</span><b>−${money(reduction)}</b></div>
      <div><span>Collected from the firm</span><b>${money(cs.agreed)}</b></div>
      ${cs.ownsRad ? `<div><span>RAD lien: bought for ${money(cs.buyPrice)}, net</span><b>${radNet >= 0 ? '+' : '−'}${money(Math.abs(radNet))}</b></div>` : ''}
      <div><span>Lien status</span><b>Released ✓</b></div>
    </div>
    <div class="recap">
      <div><span>💙 Patient Trust</span><b>${meters.trust}</b></div>
      <div><span>🛡️ Compliance</span><b>${meters.compliance}</b></div>
      <div><span>💰 Recovery</span><b>${meters.recovery}%</b></div>
    </div>
    <div class="modes"><button class="big" onclick="location.reload()">Play again</button><a class="mode-alt" href="./rush.html">⚡ Rush mode</a></div></div>`;
  scr.classList.remove('hidden');
  burst(player.position.clone().setY(2), [0xff5ca8, 0xffb833, 0x4f6bff, 0x1fc98a, 0x9b5cff], 90, 9);
  sfx.great();
}

document.getElementById('play-story').onclick = story;
startLoop();
if (import.meta.env.DEV) window.__story = { state, player, maya, npcs, tick, tryUse, target: () => target };
