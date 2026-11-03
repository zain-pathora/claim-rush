import { THREE, sfx, burst, fx } from '../engine/core.js';
import { roomX } from '../world/campus.js';
import { setChapter, setObjective, dialog, chapterCard, openModal, mediflowCard, phone, bumpMeter, toast, wait } from '../ui/ui.js';
import { CASE } from '../data/case.js';

const SKY = '#3fb6ff';
const ana = { name: 'Ana', role: 'Intake Coordinator', icon: '🧑🏿‍💼' };
const P = CASE.patient;

// ---------- Chapter 1: Order Intake ----------
const PAGES = [
  { id: 1, tag: 'RX', title: 'Prescription', lines: [`Rx: ${CASE.order.exam}`, `Dx: low back pain after MVA`, `— ${CASE.order.referrer}`], icon: '℞' },
  { id: 2, tag: 'PHOTO_ID', title: 'Driver license (copy)', lines: [P.name, `DOB ${P.dob}`, 'SAMPLE · NOT A REAL ID'], icon: '🪪' },
  { id: 3, tag: 'DEMOGRAPHICS', title: 'Patient information', lines: [P.name, P.phone, P.address], icon: '📇' },
  { id: 4, tag: 'INSURANCE', title: 'Auto policy page', lines: ['Policy: driver', 'Med Pay: none', 'PIP: none'], icon: '🚗' },
  { id: 5, tag: 'OTHER', title: 'Patient information', lines: ['Jordan Pike', 'DOB 09/03/1984', '42 Elm St'], icon: '📇', wrong: true },
];
const TAGS = ['RX', 'PHOTO_ID', 'DEMOGRAPHICS', 'INSURANCE', 'OTHER'];

export async function orderIntake(ctx) {
  const { waitFor } = ctx;
  await chapterCard(1, 'Order Intake', 'A fax lands in the Pulse inbox.');
  setChapter(1, 'Order Intake');
  setObjective('Check the new referral with Ana');
  await waitFor({ npc: 'sam' });
  await dialog(ana, [
    `A 5-page fax just came in from ${CASE.attorney.firm}. MediFlow's AI already split it and guessed which patient each page belongs to.`,
    'The AI only suggests. A person has to accept it. Tag each page, and catch anything that isn\'t Maya\'s.',
  ]);
  await faxSort();
  const seat = await dialog(ana, [
    'Order\'s accepted and the claim is open. One more thing for the claim: where was Maya sitting in the car?',
  ], ['Driver', 'Front passenger', 'Rear passenger']);
  if (seat === 0) toast('✓ Seat: Driver · Med Pay / PIP: none', 'good');
  else bumpMeter('compliance', -6, 'the police report and the license say she was driving');
  burst(ctx.npcs.sam.mesh.position.clone().setY(2.5), [0x3fb6ff, 0xffffff], 40, 6);
  await mediflowCard('Pulse inbox · Orders · Claims',
    'Faxes and texts land in the Pulse inbox. The AI splits a packet into patients and tags pages RX, PHOTO_ID, DEMOGRAPHICS or INSURANCE, but a person must accept it. Accepting creates the order and opens the claim, with the accident details like seat in the vehicle and Med Pay / PIP.');
}

async function faxSort() {
  const m = openModal({ badge: '📠 PULSE INBOX', title: 'Tag the fax pages: 35 seconds', color: SKY, wide: true });
  const pick = {};
  m.body.innerHTML = `<p>Tap a page, then its tag. A page from a different patient goes to <b>OTHER</b>, or it gets filed in Maya's chart.</p>
    <div class="timerbar"><i></i></div>
    <div class="fax">${PAGES.map((p) => `<div class="page" data-id="${p.id}"><div class="pi">${p.icon}</div><b>${p.title}</b>${p.lines.map((l) => `<small>${l}</small>`).join('')}<div class="ptag">AI: ${p.wrong ? 'DEMOGRAPHICS · Maya' : p.tag}</div></div>`).join('')}</div>
    <div class="seg tags">${TAGS.map((t) => `<span data-v="${t}">${t}</span>`).join('')}</div>
    <div class="actions"><button class="ok" disabled>Accept order</button></div>`;
  let sel = null;
  const pages = m.body.querySelectorAll('.page');
  pages.forEach((pg) => pg.addEventListener('click', () => { pages.forEach((x) => x.classList.remove('sel')); pg.classList.add('sel'); sel = pg.dataset.id; sfx.click(); }));
  m.body.querySelectorAll('.tags span').forEach((s) => s.addEventListener('click', () => {
    if (!sel) return toast('Pick a page first', 'info');
    pick[sel] = s.dataset.v;
    const pg = m.body.querySelector(`.page[data-id="${sel}"]`);
    pg.querySelector('.ptag').textContent = `You: ${s.dataset.v}`;
    pg.classList.add('tagged'); pg.classList.remove('sel');
    sfx.good();
    const next = [...pages].find((x) => !pick[x.dataset.id]);
    sel = next ? next.dataset.id : null;
    if (next) next.classList.add('sel');
    m.body.querySelector('.ok').disabled = Object.keys(pick).length < PAGES.length;
  }));
  pages[0].click();
  const bar = m.body.querySelector('.timerbar i');
  let left = 35;
  const timedOut = await new Promise((r) => {
    const iv = setInterval(() => { left -= 0.1; bar.style.transform = `scaleX(${Math.max(0, left / 35)})`; if (left <= 0) { clearInterval(iv); r(true); } }, 100);
    m.body.querySelector('.ok').onclick = () => { clearInterval(iv); r(false); };
  });
  let wrong = 0;
  for (const p of PAGES) if (pick[p.id] !== p.tag) wrong++;
  pages.forEach((pg) => {
    const p = PAGES.find((x) => String(x.id) === pg.dataset.id);
    pg.style.borderColor = pick[p.id] === p.tag ? '#1fc98a' : '#ff4d6d';
    pg.querySelector('.ptag').textContent = `Correct: ${p.tag}${p.wrong ? ' (not Maya!)' : ''}`;
  });
  m.body.querySelector('.actions').innerHTML = '<button class="ok">Continue</button>';
  if (timedOut) bumpMeter('trust', -6, 'the referral sat in the inbox too long');
  if (!wrong) { sfx.great(); toast('✓ Every page tagged right', 'good'); }
  else {
    sfx.bad();
    const missedWrong = pick[5] !== 'OTHER';
    bumpMeter('compliance', -5 * wrong - (missedWrong ? 10 : 0), missedWrong ? 'another patient\'s page landed in Maya\'s chart' : `${wrong} page${wrong > 1 ? 's' : ''} mis-tagged`);
  }
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  m.close();
}

// ---------- Chapter 2: Scheduling ----------
export async function scheduling(ctx) {
  const { waitFor } = ctx;
  const ox = roomX('office');
  await chapterCard(2, 'Scheduling', 'Get Maya on a scanner.');
  setChapter(2, 'Scheduling');
  setObjective('Call Maya from the scheduling desk');
  await waitFor({ pos: new THREE.Vector3(ox + 3, 0, -1.4), label: 'Pick up the phone', radius: 2.4 });

  // call 1: voicemail
  let ph = phone('<div class="call"><div class="avatar">👩🏽</div><b>Maya Reyes</b><small>Calling…</small><div class="ring">📞</div></div>');
  sfx.open();
  await wait(1600);
  ph.screen.innerHTML = '<div class="call"><div class="avatar">📼</div><b>Voicemail</b><small>"Hi, it\'s Maya, leave a message!" · beep</small></div>';
  await wait(1200);
  const o1 = await dialog({ name: 'You', role: 'Care Coordinator', icon: '🧑🏻‍💼' }, ['It went to voicemail. You left a short message. Log the call outcome:'],
    ['LEFT_VM', 'COULDNT_REACH', 'WILL_CALL_BACK']);
  if (o1 === 0) toast('✓ Logged: left a voicemail', 'good'); else bumpMeter('compliance', -4, 'you did reach voicemail and left a message');
  ph.hide();
  await wait(500);

  // call 2: she picks up
  ph = phone('<div class="call"><div class="avatar">👩🏽</div><b>Maya Reyes</b><small>Incoming call</small><div class="ring">📲</div></div>');
  await wait(1200);
  ph.screen.innerHTML = '<div class="call"><div class="avatar">👩🏽</div><b>Maya Reyes</b><small>00:12 · connected</small></div>';
  await dialog({ name: P.name, role: 'Patient', icon: '👩🏽' }, [
    'Hi, sorry I missed you! I work mornings, so <b>afternoons only</b>, please.',
    'Oh, and… I get really panicky in <b>tight spaces</b>.',
  ]);
  ph.hide();
  await leaseCalendar();
  const smsPh = phone(`<div class="sms"><div class="from">MediFlow · now</div>${CASE.clinic}: your MRI is booked. Reply C to confirm.</div><div class="sms"><div class="from">Maya</div>C 👍</div>`);
  await wait(2400);
  smsPh.hide();
  toast('Appointment → SCHEDULED → CONFIRMED', 'good');
  await mediflowCard('Scheduler · Block lease · Booking calls',
    'Every booking call gets an outcome: Left voicemail, Couldn\'t reach, Will call back. Imaging centres often rent scanner time from another facility as a block lease, so they can only book inside their leased blocks. Appointments move SCHEDULED → CONFIRMED → ARRIVED.');
}

async function leaseCalendar() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  // cells: machine x day x half. lease: open MRI leased Tue + Thu PM only
  const machines = [
    { id: 'closed', name: '⭕ 1.5T Closed · our scanner', lease: () => true },
    { id: 'open', name: '🌀 Open MRI · Oakview (leased)', lease: (d, h) => (d === 1 || d === 3) && h === 'PM' },
  ];
  const booked = new Set(['open-1-PM', 'closed-2-PM', 'closed-0-AM']);
  const m = openModal({ badge: '🗓️ SCHEDULER', title: 'Book Maya\'s MRI', color: SKY, wide: true });
  m.body.innerHTML = `<p>Find a slot that fits what Maya told you. Grey slots are outside your lease block at Oakview, so you can't book them.</p>
    <div class="cal"><div></div>${days.map((d) => `<div class="ch">${d}</div>`).join('')}
    ${machines.map((mc) => `<div class="cm">${mc.name}</div>${days.map((_, d) => `<div class="cday">${['AM', 'PM'].map((h) => {
      const k = `${mc.id}-${d}-${h}`;
      const cls = !mc.lease(d, h) ? 'nolease' : booked.has(k) ? 'busy' : 'free';
      return `<div class="slot ${cls}" data-k="${k}">${cls === 'busy' ? 'Booked' : cls === 'nolease' ? '·' : h}</div>`;
    }).join('')}</div>`).join('')}`).join('')}</div>`;
  const k = await new Promise((r) => m.body.querySelectorAll('.slot.free').forEach((s) => s.addEventListener('click', () => { s.classList.add('pick'); r(s.dataset.k); })));
  sfx.click();
  await wait(400);
  m.close();
  const [mc, , h] = k.split('-');
  if (mc === 'open' && h === 'PM') { sfx.great(); toast('✓ Open MRI, Thursday afternoon, inside the lease block', 'good'); bumpMeter('trust', 5, 'a slot that fits her life'); }
  else {
    if (h !== 'PM') bumpMeter('trust', -10, 'she works mornings');
    if (mc !== 'open') bumpMeter('trust', -10, 'a closed bore for a claustrophobic patient');
  }
}
