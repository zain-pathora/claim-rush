import { THREE, sfx, burst, fx, onKey } from '../engine/core.js';
import { roomX } from '../world/campus.js';
import { setChapter, setObjective, dialog, chapterCard, openModal, mediflowCard, bumpMeter, toast, wait } from '../ui/ui.js';
import { CASE, PRESCREEN, METAL } from '../data/case.js';

const BLUE = '#6f86ff';
const dev = { name: 'Dev', role: 'MRI Technologist', icon: '🧑🏾‍🔬' };
const mayaSpeaker = { name: CASE.patient.name, role: 'Patient', icon: '👩🏽' };

export async function mriSuite(ctx) {
  const { maya, follow, waitFor, magnet, state } = ctx;
  const mx = roomX('mri');

  setObjective('Walk Maya to the imaging wing');
  await waitFor({ pos: new THREE.Vector3(mx - 6, 0, 0), label: 'Enter the imaging wing', radius: 3 });
  await chapterCard(4, 'Prescreen & MRI', 'Safety first. Then a clean scan.');
  setChapter(4, 'Prescreen & MRI');

  // a. prescreen
  setObjective('Review Maya\'s prescreen with Dev');
  await waitFor({ npc: 'dev' });
  await dialog(dev, [
    'Hey! Maya filled in her prescreen on her phone last night. Before anyone goes near the magnet, we review it.',
    'Flag every answer that needs action before the scan.',
  ]);
  const claus = await prescreen();

  // b. machine
  const open = await pickMachine(claus);

  // c. metal sweep
  setObjective('Help Maya change and lock away anything metal');
  await waitFor({ pos: new THREE.Vector3(mx - 7, 0, 2.5), label: 'Open the locker', radius: 2.6 });
  await metalSweep();

  // d. scan
  setObjective('Get Maya on the table and run the scan');
  await waitFor({ pos: new THREE.Vector3(magnet.x, 0, magnet.z + 4.2), label: 'Start the scan', radius: 2.8 });
  follow.on = false;
  maya.position.set(magnet.x, 1.2, magnet.z + 2.4);
  maya.rotation.set(-Math.PI / 2, 0, 0);
  state.camMode = 'focus';
  state.camFocus.set(magnet.x, 1, magnet.z + 1.5);
  magnet.scanning = true;
  sfx.hum();
  await dialog(mayaSpeaker, [open ? 'Oh, this one is open on the sides. I can do this.' : 'It\'s so tight in here… I\'ll try to hold still.']);
  await scanGame(open);
  magnet.scanning = false;
  maya.rotation.set(0, 0, 0);
  maya.position.set(magnet.x - 1.5, 0, magnet.z + 4.5);
  state.camMode = 'follow';
  follow.on = true;

  // e. status + who reads it
  const who = await dialog(dev, [
    'Scan\'s done: exam status moves to <b>Completed</b>. That\'s also the moment the liens get signed.',
    'Now the images go to the radiologist. Where does the diagnostic read happen?',
  ], [`${CASE.radiologist.name} reads it in her own radiology system`, 'I read it here in MediFlow', 'MediFlow\'s AI reads it automatically']);
  if (who === 0) toast('✓ Right: MediFlow is never where a study is read', 'good');
  else bumpMeter('compliance', -10, 'the read happens in the radiologist\'s own system');
  await statusChain();
  burst(new THREE.Vector3(magnet.x, 3, magnet.z), [0x6f86ff, 0xffffff, 0x9b5cff], 60, 7);
  await mediflowCard('Prescreen · Exam statuses · Read Assigned',
    'Prescreen answers drive the safety logic: claustrophobia routes to an open magnet, pregnancy attaches a waiver. The exam moves Scheduled → Arrived → In Progress → Completed → Read Assigned → Signed. One MRI is two pieces of work: the scan (TECH) and the radiologist\'s read (RAD), so two bills and two liens.');
}

async function prescreen() {
  const m = openModal({ badge: '🧲 PRESCREEN', title: 'Flag what needs action', color: BLUE });
  m.body.innerHTML = `<div class="pq">${PRESCREEN.map((p, i) => `<div class="q" data-i="${i}"><span>${p.q}</span><span class="a">${p.a}</span></div>`).join('')}</div>
    <div class="actions"><button class="ok">Done reviewing</button></div>`;
  m.body.querySelectorAll('.q').forEach((q) => q.addEventListener('click', () => { q.classList.toggle('flag'); sfx.click(); }));
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  const flagged = new Set([...m.body.querySelectorAll('.q.flag')].map((q) => Number(q.dataset.i)));
  let missed = 0; let extra = 0;
  m.body.querySelectorAll('.q').forEach((q) => {
    const p = PRESCREEN[Number(q.dataset.i)];
    const isF = flagged.has(Number(q.dataset.i));
    if (p.flag && !isF) missed++;
    if (!p.flag && isF) extra++;
    q.style.borderColor = p.flag === isF ? '#1fc98a' : '#ff4d6d';
    if (p.why) q.querySelector('span').innerHTML += `<br><small style="color:#6b7394">${p.why}</small>`;
  });
  m.body.querySelector('.actions').innerHTML = '<button class="ok">Continue</button>';
  if (!missed && !extra) { sfx.great(); toast('✓ Prescreen reviewed perfectly', 'good'); }
  else { if (missed) bumpMeter('compliance', -12 * missed, `missed ${missed} red flag${missed > 1 ? 's' : ''}`); if (extra) bumpMeter('trust', -3 * extra, 'flagged answers that were fine'); }
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  m.close();
  return true;
}

async function pickMachine() {
  const m = openModal({ badge: '🗓️ SCANNER', title: 'Which scanner for Maya?', color: BLUE });
  m.body.innerHTML = `<p>Remember her prescreen. Pick the scanner slot.</p>
    <div class="machines">
      <div class="machine" data-v="closed"><div class="mi">⭕</div><b>1.5T Closed bore</b><br><small>Sharper images · next slot 10:30</small></div>
      <div class="machine" data-v="open"><div class="mi">🌀</div><b>Open MRI</b><br><small>Open on the sides · next slot 10:45</small></div>
    </div>`;
  const v = await new Promise((r) => m.body.querySelectorAll('.machine').forEach((x) => { x.onclick = () => r(x.dataset.v); }));
  m.close();
  if (v === 'open') { sfx.good(); bumpMeter('trust', 5, 'open magnet for a claustrophobic patient'); }
  else bumpMeter('trust', -12, 'claustrophobic patient in a closed bore');
  return v === 'open';
}

async function metalSweep() {
  const m = openModal({ badge: '⚠️ ZONE IV', title: 'Clear the metal: 12 seconds', color: '#ff4d6d', wide: true });
  m.body.innerHTML = `<p>Tap everything metal or magnetic to put it in the locker. Anything left behind <b>flies into the magnet</b>.</p>
    <div class="timerbar"><i></i></div><div class="sweep"><div class="body">🧍🏽‍♀️</div><div class="magnet-edge"></div></div>`;
  const area = m.body.querySelector('.sweep');
  const items = [...METAL].sort(() => Math.random() - 0.5).slice(0, 9);
  if (!items.some((i) => !i.metal)) items[0] = METAL.find((i) => !i.metal);
  items.forEach((it, k) => {
    const d = document.createElement('div');
    d.className = 'item';
    d.textContent = it.i;
    d.title = it.n;
    const ang = (k / items.length) * Math.PI * 2;
    d.style.left = `${46 + Math.cos(ang) * 30}%`;
    d.style.top = `${42 + Math.sin(ang) * 32}%`;
    d.style.animationDelay = `${k * 0.15}s`;
    d.onclick = () => {
      if (it.metal) { d.classList.add('got'); it.got = true; sfx.good(); }
      else { d.classList.add('shake'); sfx.bad(); bumpMeter('trust', -2, `${it.n.toLowerCase()} are safe`); it.wrong = true; }
    };
    it.el = d;
    area.appendChild(d);
  });
  const bar = m.body.querySelector('.timerbar i');
  let left = 12;
  await new Promise((r) => {
    const iv = setInterval(() => {
      left -= 0.1;
      bar.style.transform = `scaleX(${Math.max(0, left / 12)})`;
      if (left <= 0 || items.filter((i) => i.metal).every((i) => i.got)) { clearInterval(iv); r(); }
    }, 100);
  });
  const left_ = items.filter((i) => i.metal && !i.got);
  for (const it of left_) { it.el.classList.add('pulled'); }
  if (left_.length) { sfx.bad(); fx.shake = 0.6; document.getElementById('flash').classList.remove('on'); void document.body.offsetWidth; document.getElementById('flash').classList.add('on'); }
  await wait(900);
  m.close();
  if (left_.length) bumpMeter('compliance', -8 * left_.length, `${left_.map((i) => i.n.toLowerCase()).join(', ')} hit the magnet`);
  else { sfx.great(); toast('✓ Zone IV clear', 'good'); }
}

function drawSlice(cv, quality, k) {
  const g = cv.getContext('2d');
  const w = cv.width;
  g.fillStyle = '#05070f'; g.fillRect(0, 0, w, w);
  g.filter = quality < 1 ? `blur(${(1 - quality) * 6}px)` : 'none';
  // body outline
  g.fillStyle = '#2a3150';
  g.beginPath(); g.ellipse(w / 2, w / 2, w * 0.36, w * 0.44, 0, 0, Math.PI * 2); g.fill();
  // vertebrae
  for (let i = 0; i < 5; i++) {
    g.fillStyle = `rgba(220,230,255,${0.75 - i * 0.05})`;
    g.beginPath(); g.roundRect(w / 2 - w * 0.09 + (k - 1) * 4, w * 0.14 + i * w * 0.15, w * 0.18, w * 0.1, 6); g.fill();
    g.fillStyle = '#6f86ff';
    g.fillRect(w / 2 - w * 0.07, w * 0.245 + i * w * 0.15, w * 0.14, w * 0.03);
  }
  g.filter = 'none';
  g.fillStyle = '#9fb0ff'; g.font = '700 12px Fredoka';
  g.fillText(['T1 SAG', 'T2 SAG', 'T2 AX'][k], 8, 18);
}

async function scanGame(open) {
  const m = openModal({ badge: '🧲 SCANNING', title: 'Capture 3 clean sequences', color: BLUE, wide: true });
  m.body.innerHTML = `<p>Press <kbd>Space</kbd> (or tap) when the cursor is in the green window. Miss it and the image blurs.${open ? '' : ' <b>Closed bore:</b> Maya is nervous, so the window is smaller.'}</p>
    <div class="scanner"><div class="zone"></div><div class="cursor"></div></div>
    <div class="slices">${[0, 1, 2].map(() => '<div class="slice"><canvas width="200" height="200"></canvas></div>').join('')}</div>`;
  const zone = m.body.querySelector('.zone');
  const cursor = m.body.querySelector('.cursor');
  const canvases = [...m.body.querySelectorAll('canvas')];
  let clean = 0;
  for (let k = 0; k < 3; k++) {
    const width = (open ? 22 : 13) - k * 2;
    const start = 15 + Math.random() * (70 - width);
    zone.style.left = `${start}%`; zone.style.width = `${width}%`;
    const speed = 70 + k * 25;
    const hit = await new Promise((resolve) => {
      let x = 0; let dir = 1; let last = performance.now();
      let raf;
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        x += dir * speed * dt;
        if (x > 99) { x = 99; dir = -1; } if (x < 0) { x = 0; dir = 1; }
        cursor.style.left = `${x}%`;
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      const fire = () => { cancelAnimationFrame(raf); off(); m.body.removeEventListener('pointerdown', fire); resolve(x >= start && x <= start + width); };
      const off = onKey((key) => { if (key === ' ' || key === 'enter') fire(); });
      setTimeout(() => m.body.addEventListener('pointerdown', fire), 200);
    });
    drawSlice(canvases[k], hit ? 1 : 0.2, k);
    if (hit) { clean++; sfx.good(); } else { sfx.bad(); fx.shake = 0.25; }
    await wait(450);
  }
  await wait(500);
  m.close();
  if (clean === 3) { sfx.great(); toast('✓ Three clean sequences', 'good'); }
  else bumpMeter('trust', -6 * (3 - clean), `${3 - clean} sequence${3 - clean > 1 ? 's' : ''} had to be re-run`);
}

async function statusChain() {
  const chain = ['Ordered', 'Scheduled', 'Confirmed', 'Arrived', 'In Progress', 'Completed', 'Read Assigned', 'Signed'];
  const m = openModal({ badge: '📈 EXAM STATUS', title: 'Move the exam forward', color: BLUE });
  m.body.innerHTML = `<div class="status-chain">${chain.map((s, i) => `<span class="${i < 6 ? 'done' : i === 6 ? 'now' : ''}">${s}</span>`).join('')}</div>
    <p>The exam is <b>Completed</b>. Assigning ${CASE.radiologist.name} (${CASE.radiologist.group}) as reading physician moves it to <b>Read Assigned</b>. That also triggers the <b>RAD</b> lien for the radiologist, which waits on Maya's signature.</p>
    <div class="actions"><button class="ok">Assign Dr. Wong</button></div>`;
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  const spans = m.body.querySelectorAll('.status-chain span');
  spans[6].className = 'done';
  spans[7].className = 'now';
  sfx.great();
  await wait(900);
  m.close();
}
