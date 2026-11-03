import { THREE, sfx, burst, fx } from '../engine/core.js';
import { roomX } from '../world/campus.js';
import { setChapter, setObjective, dialog, chapterCard, openModal, mediflowCard, bumpMeter, toast, wait } from '../ui/ui.js';
import { CASE } from '../data/case.js';

const PURPLE = '#a66bff';
const iris = { name: CASE.radiologist.name, role: CASE.radiologist.group, icon: CASE.radiologist.icon };

// the QC queue: one is Maya's (good), two have a problem
const QUEUE = [
  { name: 'Maya Reyes', dob: '04/12/1991', part: 'Lumbar spine', order: 'Lumbar spine', orderDob: '04/12/1991', ok: true },
  { name: 'Jordan Pike', dob: '09/03/1984', part: 'Cervical spine', order: 'Lumbar spine', orderDob: '09/03/1984', ok: false, why: 'Body part doesn\'t match the order' },
  { name: 'Priya Nair', dob: '11/30/1977', part: 'Right knee', order: 'Right knee', orderDob: '11/03/1977', ok: false, why: 'Date of birth doesn\'t match the order' },
];

export async function readingRoom(ctx) {
  const { waitFor } = ctx;
  const rx = roomX('reading');
  setObjective('Head to the Reading Room');
  await waitFor({ pos: new THREE.Vector3(rx - 6, 0, 0), label: 'Enter the Reading Room', radius: 3 });
  await chapterCard(3, 'Reading Room & QC', 'Right patient. Right body part. Then it can bill.');
  setChapter(3, 'Reading Room & QC');

  setObjective('Check in with Dr. Wong');
  await waitFor({ npc: 'iris' });
  const order = await dialog(iris, [
    'I read Maya\'s study in my own reading system and signed the report. Signing is what pushed the images over to you.',
    'Quick check: which arrives in MediFlow first?',
  ], ['The signed report. Images follow after it', 'The images. The report comes later', 'Both at exactly the same time']);
  if (order === 0) toast('✓ Right: the report exists before the images arrive', 'good');
  else bumpMeter('compliance', -6, 'images arrive after the report is signed');

  setObjective('Clear the QC queue');
  await dialog(iris, ['Before anything bills, someone has to look at the images and confirm they\'re the right ones. Here\'s today\'s QC queue.']);
  await qcQueue();
  burst(ctx.npcs.iris.mesh.position.clone().setY(2.5), [0xa66bff, 0xffffff], 40, 6);
  await mediflowCard('QC Exams queue · Image viewer',
    'An exam that reaches a QC status lands in the QC queue. Staff use the viewer only to verify the study: name, date of birth, body part. They never read it there. An exam that fails QC is blocked from billing until it\'s fixed.');
}

function fakeScan(cv, part) {
  const g = cv.getContext('2d');
  const w = cv.width;
  g.fillStyle = '#05070f'; g.fillRect(0, 0, w, w);
  g.fillStyle = '#2a3150';
  g.beginPath(); g.ellipse(w / 2, w / 2, w * 0.34, w * 0.44, 0, 0, Math.PI * 2); g.fill();
  if (part.includes('knee')) {
    g.fillStyle = 'rgba(220,230,255,.8)';
    g.beginPath(); g.roundRect(w * 0.4, w * 0.1, w * 0.2, w * 0.36, 20); g.fill();
    g.beginPath(); g.roundRect(w * 0.42, w * 0.54, w * 0.16, w * 0.36, 20); g.fill();
  } else {
    const n = part.includes('Cervical') ? 7 : 5;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(220,230,255,${0.75 - i * 0.04})`;
      g.beginPath(); g.roundRect(w / 2 - w * 0.08, w * 0.1 + i * (w * 0.78 / n), w * 0.16, w * 0.5 / n, 5); g.fill();
    }
  }
  g.fillStyle = '#9fb0ff'; g.font = '700 11px Fredoka';
  g.fillText('VERIFY ONLY · NOT FOR READING', 6, w - 8);
}

async function qcQueue() {
  const m = openModal({ badge: '🔍 QC EXAMS', title: 'Pass or hold each study', color: PURPLE, wide: true });
  let idx = 0; let mistakes = 0;
  while (idx < QUEUE.length) {
    const s = QUEUE[idx];
    m.body.innerHTML = `<p>Study ${idx + 1} of ${QUEUE.length}. Compare the study header with the order.</p>
      <div class="row">
        <div class="slice" style="flex:0 0 200px"><canvas width="200" height="200"></canvas></div>
        <div class="sheet" style="flex:1">
          <div class="row">
            <div style="flex:1"><div class="st" style="font-size:11px;font-weight:700;color:#a66bff;letter-spacing:.1em">STUDY HEADER</div>
              <div class="field">Name<b>${s.name}</b></div><div class="field">DOB<b>${s.dob}</b></div><div class="field">Body part<b>${s.part}</b></div></div>
            <div style="flex:1"><div class="st" style="font-size:11px;font-weight:700;color:#c79a1e;letter-spacing:.1em">ORDER</div>
              <div class="field">Name<b>${s.name}</b></div><div class="field">DOB<b>${s.orderDob}</b></div><div class="field">Body part<b>${s.order}</b></div></div>
          </div>
        </div>
      </div>
      <div class="actions"><button class="danger hold">Hold (QC fail)</button><button class="ok pass">Pass</button></div>`;
    fakeScan(m.body.querySelector('canvas'), s.part);
    const pass = await new Promise((r) => { m.body.querySelector('.pass').onclick = () => r(true); m.body.querySelector('.hold').onclick = () => r(false); });
    const right = pass === s.ok;
    if (right) { sfx.good(); toast(s.ok ? `✓ ${s.name}: passed, ready to bill` : `✓ Held: ${s.why}`, 'good'); }
    else {
      mistakes++;
      sfx.bad(); fx.shake = 0.3;
      bumpMeter('compliance', -10, s.ok ? 'held a good study, billing delayed' : `passed a bad study: ${s.why.toLowerCase()}`);
    }
    idx++;
    await wait(500);
  }
  m.close();
  if (!mistakes) sfx.great();
}
