import { THREE, sfx, burst, fx } from '../engine/core.js';
import { roomX } from '../world/campus.js';
import { setChapter, setObjective, dialog, chapterCard, openModal, mediflowCard, phone, bumpMeter, toast, el, wait } from '../ui/ui.js';
import { CASE } from '../data/case.js';

const GREEN = '#2fcf8f';
const P = CASE.patient;
const mayaSpeaker = { name: P.name, role: 'Patient', icon: '👩🏽' };

export async function frontDesk(ctx) {
  const { maya, follow, waitFor, walkMaya, npcs } = ctx;
  const lx = roomX('lobby');
  const rosa = { name: 'Rosa', role: 'Front Desk', icon: '👩🏽‍💼' };

  await chapterCard(3, 'Front Desk', `${CASE.clinic} · Check-in`);
  setChapter(3, 'Front Desk');

  // a. greet Maya
  setObjective('Meet Maya at the clinic entrance');
  walkMaya(new THREE.Vector3(lx + 1.5, 0, 8.6), 2.5);
  await waitFor({ pos: maya.position, label: 'Greet Maya', radius: 2.4 });
  await dialog(mayaSpeaker, [
    'Hi… Lena said to come here. My back is killing me.',
    'Do I need to pay anything today?',
  ], ['Nothing today: you\'re treated on a lien, paid from your settlement later.', 'Yes, we need a card on file first.']).then((c) => {
    if (c === 0) bumpMeter('trust', 5, 'clear, honest answer');
    else bumpMeter('trust', -15, 'lien patients pay nothing up front');
  });
  follow.on = true;

  // b. front desk
  setObjective('Bring Maya to Rosa at the front desk');
  await waitFor({ npc: 'rosa' });
  const how = await dialog(rosa, [
    `Welcome! I have Maya's referral from ${CASE.attorney.firm}: ${CASE.order.exam}.`,
    'Her appointment shows SCHEDULED. First, she needs to log in to the patient portal on the kiosk. How do patients log in?',
  ], ['Phone number + a one-time SMS code', 'Email and a password she picks now', 'Her Social Security number']);
  if (how === 0) toast('✓ Right: patients log in with phone + one-time code', 'good');
  else bumpMeter('compliance', -10, 'MediFlow patients log in with phone + OTP');

  // c. OTP at the kiosk
  setObjective('Help Maya log in at the check-in kiosk');
  await waitFor({ pos: new THREE.Vector3(lx + 5, 0, 1), label: 'Use the kiosk', radius: 2.4 });
  await otpGame();

  // d. ID check
  setObjective('Verify Maya\'s photo ID against the referral');
  await waitFor({ npc: 'rosa', label: 'Hand Rosa the ID' });
  await idCheck();

  // e. intake packet
  setObjective('Prepare Maya\'s intake packet');
  await dialog(rosa, ['ID done. Now the intake packet. Which consents does she sign <b>today</b>, at check-in?']);
  await consentPacket();

  // f. signature
  setObjective('Collect Maya\'s signature');
  await signaturePad();

  // g. visit outcome
  const outcome = await dialog(rosa, [
    'Packet\'s filed. Last step: update the appointment on the worklist so the practice knows she\'s here.',
  ], ['Arrived', 'Exam completed', 'No Show', 'Couldn\'t complete the exam']);
  if (outcome === 0) { sfx.good(); toast('Appointment → ARRIVED', 'good'); }
  else bumpMeter('compliance', -10, 'she just arrived, the exam hasn\'t happened yet');
  burst(npcs.rosa.mesh.position.clone().setY(2.5), [0x2fcf8f, 0xffffff, 0xffb833], 40, 6);
  await mediflowCard('Front Desk portal → Worklist → Update appointment',
    'Facility staff mark each visit Arrived, Exam completed, No Show or Couldn\'t complete. That outcome flows back to the practice\'s own appointment. Patients log in with phone + one-time code, and the intake packet is filed straight into their documents.');
  await dialog(rosa, ['All set. Dev will take her through prescreening in the imaging wing. The door\'s open now.']);
}

// ---------- mini-games ----------
async function otpGame() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const m = openModal({ badge: '🔐 PATIENT PORTAL', title: 'Enter the 6-digit code', color: GREEN });
  m.body.innerHTML = `<p>Maya typed her phone number. MediFlow texted her a one-time code. Read it off her phone and enter it before it expires.</p>
    <div class="timerbar"><i></i></div><div class="otp">${'<input maxlength="1" inputmode="numeric" />'.repeat(6)}</div><p class="small" style="text-align:center">Tries left: <b class="tries">3</b></p>`;
  const ph = phone(`<div class="sms"><div class="from">MediFlow · now</div>Your ${CASE.clinic} login code is<div class="code">${code}</div>It expires in 20 seconds. Never share it.</div>`);
  const inputs = [...m.body.querySelectorAll('input')];
  inputs[0].focus();
  const bar = m.body.querySelector('.timerbar i');
  let tries = 3; let left = 20;
  const result = await new Promise((resolve) => {
    const iv = setInterval(() => {
      left -= 0.1;
      bar.style.transform = `scaleX(${Math.max(0, left / 20)})`;
      if (left <= 0) { clearInterval(iv); resolve('timeout'); }
    }, 100);
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '');
        sfx.type();
        if (inp.value && i < 5) inputs[i + 1].focus();
        const v = inputs.map((x) => x.value).join('');
        if (v.length === 6) {
          if (v === code) { clearInterval(iv); resolve('ok'); return; }
          tries--;
          m.body.querySelector('.tries').textContent = tries;
          m.body.querySelector('.otp').classList.add('shake');
          sfx.bad();
          setTimeout(() => m.body.querySelector('.otp')?.classList.remove('shake'), 400);
          inputs.forEach((x) => { x.value = ''; });
          inputs[0].focus();
          if (!tries) { clearInterval(iv); resolve('locked'); }
        }
      });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && i) inputs[i - 1].focus(); });
    });
  });
  ph.hide();
  m.close();
  if (result === 'ok') { sfx.great(); bumpMeter('trust', 5, 'logged in fast'); }
  else { bumpMeter('trust', -10, result === 'timeout' ? 'code expired, staff had to re-send it' : 'too many wrong codes'); }
}

async function idCheck() {
  // one field on the referral is off: a transposed DOB
  const orderDob = '04/21/1991';
  const m = openModal({ badge: '🪪 ID CHECK', title: 'Does the referral match her ID?', color: GREEN, wide: true });
  const fields = [
    ['Name', P.name, P.name], ['Date of birth', P.dob, orderDob], ['Phone', P.phone, P.phone], ['Address', P.address, P.address],
  ];
  m.body.innerHTML = `<p>A wrong date of birth follows the patient everywhere: to the images, the bill, and the lien. Click any field on the <b>referral</b> that doesn't match the ID.</p>
    <div class="row">
      <div class="idcard"><div class="st">STATE DRIVER LICENSE · SAMPLE</div><div class="photo">${P.icon}</div>
        ${fields.map(([k, v]) => `<div class="field">${k}<b>${v}</b></div>`).join('')}</div>
      <div class="sheet"><div class="st" style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#c79a1e">REFERRAL · DEMOGRAPHICS PAGE</div>
        ${fields.map(([k, , o], i) => `<div class="field diff" data-i="${i}">${k}<b>${o}</b></div>`).join('')}</div>
    </div>
    <div class="actions"><button class="ok">Accept referral</button></div>`;
  m.body.querySelectorAll('.field.diff').forEach((f) => f.addEventListener('click', () => { f.classList.toggle('flagged'); sfx.click(); }));
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  const flagged = [...m.body.querySelectorAll('.field.flagged')].map((f) => Number(f.dataset.i));
  m.close();
  const caught = flagged.includes(1);
  const false_ = flagged.filter((i) => i !== 1).length;
  if (caught && !false_) { sfx.great(); toast('✓ Caught it: DOB corrected to 04/12/1991', 'good'); }
  else if (caught) bumpMeter('compliance', -5, 'caught the DOB, but flagged a field that matched');
  else { fx.shake = 0.4; bumpMeter('compliance', -20, 'wrong DOB went through and the study won\'t match the patient'); }
}

const CONSENTS = [
  { id: 'HIPAA_AUTH', icon: '🔒', name: 'HIPAA Authorization', need: true, why: 'Lets the clinic share records with her attorney.' },
  { id: 'TREATMENT_CONSENT', icon: '🩺', name: 'Treatment Consent', need: true, why: 'Consent to the exam itself.' },
  { id: 'RECORDS_RELEASE', icon: '📤', name: 'Records Release', need: true, why: 'Releases the report and bills to the law firm.' },
  { id: 'PREGNANCY_WAIVER', icon: '🤰', name: 'Pregnancy Waiver', need: false, why: 'Only when the prescreen says she could be pregnant.' },
  { id: 'AOB', icon: '🏦', name: 'Insurance Assignment of Benefits', need: false, why: 'There is no payer here. This is a lien case.' },
  { id: 'PSL', icon: '📜', name: 'Patient Lien (PSL)', need: false, why: 'Liens are signed when the exam completes, not at check-in.' },
];

async function consentPacket() {
  const m = openModal({ badge: '📋 INTAKE PACKET', title: 'Pick the consents for check-in', color: GREEN, wide: true });
  m.body.innerHTML = `<p>Tap the documents Maya signs <b>now</b>. Watch out: some belong to a later step, or to a different kind of case.</p>
    <div class="docs">${CONSENTS.map((c) => `<div class="doc" data-id="${c.id}"><div class="di">${c.icon}</div><b>${c.name}</b><small>${c.id}</small></div>`).join('')}</div>
    <div class="actions"><button class="ok">File packet</button></div>`;
  m.body.querySelectorAll('.doc').forEach((d) => d.addEventListener('click', () => { d.classList.toggle('on'); sfx.click(); }));
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  const picked = new Set([...m.body.querySelectorAll('.doc.on')].map((d) => d.dataset.id));
  let mistakes = 0;
  m.body.querySelectorAll('.doc').forEach((d) => {
    const c = CONSENTS.find((x) => x.id === d.dataset.id);
    const right = picked.has(c.id) === c.need;
    if (!right) mistakes++;
    d.classList.remove('on');
    d.style.borderColor = right ? '#1fc98a' : '#ff4d6d';
    d.style.background = right ? '#e9fbf3' : '#fff0f3';
    d.querySelector('small').textContent = `${c.need ? 'Needed' : 'Not now'}: ${c.why}`;
  });
  m.body.querySelector('.actions').innerHTML = '<button class="ok">Continue</button>';
  if (!mistakes) { sfx.great(); toast('✓ Perfect packet', 'good'); } else { sfx.bad(); bumpMeter('compliance', -6 * mistakes, `${mistakes} packet mistake${mistakes > 1 ? 's' : ''}`); }
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  m.close();
}

async function signaturePad() {
  const m = openModal({ badge: '✍️ E-SIGN', title: `Sign as ${P.name}`, color: GREEN });
  m.body.innerHTML = `<div class="methods"><span class="on">DRAWN</span><span>TYPED</span><span>UPLOAD</span></div>
    <canvas class="sigpad" width="900" height="340"></canvas><div class="sigline"><span>✕ ${P.name}</span><span class="ink">Draw your signature</span></div>
    <div class="actions"><button class="ghost clear">Clear</button><button class="ok" disabled>Sign</button></div>`;
  const cv = m.body.querySelector('canvas');
  const g = cv.getContext('2d');
  g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1b2240';
  let drawing = false; let ink = 0; let last = null;
  const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) }; };
  cv.addEventListener('pointerdown', (e) => { drawing = true; last = pt(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pt(e);
    g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
    ink += Math.hypot(p.x - last.x, p.y - last.y);
    last = p;
    if (ink > 400) { m.body.querySelector('.ok').disabled = false; m.body.querySelector('.ink').textContent = 'Looks good'; }
  });
  addEventListener('pointerup', () => { drawing = false; }, { once: false });
  m.body.querySelector('.clear').onclick = () => { g.clearRect(0, 0, cv.width, cv.height); ink = 0; m.body.querySelector('.ok').disabled = true; };
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  m.close();
  sfx.great();
  toast('✓ Signed (DRAWN) · documents FILED', 'good');
  await wait(200);
}
