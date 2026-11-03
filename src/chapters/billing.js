import { THREE, sfx, burst, fx } from '../engine/core.js';
import { roomX } from '../world/campus.js';
import { setChapter, setObjective, dialog, chapterCard, openModal, mediflowCard, phone, bumpMeter, toast, wait } from '../ui/ui.js';
import { CASE } from '../data/case.js';

const ORANGE = '#ffa53d';
const ben = { name: 'Ben', role: 'Biller', icon: '🧑🏼‍💻' };
export const money = (c) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export async function billingRoom(ctx) {
  const { waitFor, caseState: cs } = ctx;
  const bx = roomX('billing');
  setObjective('Take the exam to Billing');
  await waitFor({ pos: new THREE.Vector3(bx - 6, 0, 0), label: 'Enter Billing & Liens', radius: 3 });
  await chapterCard(6, 'Billing & Liens', 'One MRI. Two bills. Two liens.');
  setChapter(6, 'Billing & Liens');

  setObjective('Build the bill with Ben');
  await waitFor({ npc: 'ben' });
  await dialog(ben, [
    `QC passed, so Maya's ${CASE.order.exam} can bill. CPT ${CASE.order.cpt}.`,
    `Here's the twist: ${CASE.clinic} did the scan, and ${CASE.radiologist.group} did the read. Each business bills its own part.`,
  ]);
  await splitBill(cs);

  const first = await dialog(ben, ['Both bills are ready. Who sends theirs to the law firm first?'],
    ['The imaging centre (TECH) bills first', 'The radiologist (RAD) bills first', 'Whoever is faster']);
  if (first === 0) toast('✓ Right: the radiologist can\'t bill until the imaging centre has', 'good');
  else bumpMeter('compliance', -8, 'TECH bills first; a stray RAD bill confuses the firm');
  await billChain();

  setObjective('Route the liens to the right signers');
  await dialog(ben, [
    'Each component gets its own lien, signed by the patient (PSL) and by the attorney (ASL).',
    'Remember: signing a lien doesn\'t lock in any amounts. It names no codes and no dollars.',
  ]);
  await lienRouting();
  await esignChannels();

  setObjective('Decide on Dr. Wong\'s lien offer');
  const buy = await dialog({ name: CASE.radiologist.name, role: CASE.radiologist.group, icon: CASE.radiologist.icon }, [
    `Settlement could take three years. We'd rather have cash now. We'll sell you our RAD lien (${money(cs.billed.rad)} billed) for ${money(cs.buyPrice)}.`,
  ], [`Buy it for ${money(cs.buyPrice)}: we'll own both components`, 'Pass: each business keeps its own lien']);
  if (buy === 0) {
    cs.ownsRad = true;
    const notice = await dialog(ben, ['We own the RAD lien now. What does the law firm need to receive?'],
      ['An assignment notice naming the new owner', 'Nothing, they\'ll figure it out', 'A brand-new lien for Maya to sign']);
    if (notice === 0) toast('✓ Assignment notice sent to Birch & Co. Law', 'good');
    else bumpMeter('compliance', -10, 'a sale only works if the firm gets an assignment notice');
  }
  burst(ctx.npcs.ben.mesh.position.clone().setY(2.5), [0xffa53d, 0xffffff, 0xffb833], 40, 6);
  await mediflowCard('Billing · CPT pricing · Liens · Sell liens',
    'CPT prices are set per component: MEDICAL, TECH or RAD. Bills move DRAFT → READY → GENERATED → SENT. Each component has its own PSL (patient) and ASL (attorney) lien. A lien can be sold. Ownership moves, and the firm is told with an assignment notice.');
}

async function splitBill(cs) {
  const lines = [
    { id: 'tech', label: 'Scan: magnet time, technologist, facility', comp: 'TECH', amt: cs.billed.tech },
    { id: 'rad', label: 'Interpretation and signed report', comp: 'RAD', amt: cs.billed.rad },
  ];
  const m = openModal({ badge: '💳 BILL', title: `CPT ${CASE.order.cpt}: who bills what?`, color: ORANGE, wide: true });
  m.body.innerHTML = `<p>Assign each line to the business that did the work.</p>
    <div class="ledger">${lines.map((l) => `<div class="lrow" data-id="${l.id}"><div><b>${l.label}</b><small>${money(l.amt)}</small></div>
      <div class="seg"><span data-v="TECH">🏥 ${CASE.clinic.split(' ')[0]} · TECH</span><span data-v="RAD">🧠 Northside · RAD</span><span data-v="MEDICAL">MEDICAL</span></div></div>`).join('')}</div>
    <div class="actions"><button class="ok" disabled>Create bills</button></div>`;
  const pick = {};
  m.body.querySelectorAll('.lrow').forEach((row) => row.querySelectorAll('.seg span').forEach((s) => s.addEventListener('click', () => {
    row.querySelectorAll('.seg span').forEach((x) => x.classList.remove('on'));
    s.classList.add('on'); pick[row.dataset.id] = s.dataset.v; sfx.click();
    m.body.querySelector('.ok').disabled = Object.keys(pick).length < lines.length;
  })));
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  m.close();
  const wrong = lines.filter((l) => pick[l.id] !== l.comp).length;
  if (!wrong) { sfx.great(); toast(`✓ Two bills: TECH ${money(cs.billed.tech)} + RAD ${money(cs.billed.rad)}`, 'good'); }
  else bumpMeter('compliance', -8 * wrong, 'MEDICAL is for single-provider tenants. An MRI splits into TECH and RAD');
}

async function billChain() {
  const chain = ['DRAFT', 'READY', 'GENERATED', 'SENT'];
  const m = openModal({ badge: '📤 TECH BILL', title: 'Send the bill', color: ORANGE });
  m.body.innerHTML = `<div class="status-chain">${chain.map((s, i) => `<span class="${i === 0 ? 'now' : ''}">${s}</span>`).join('')}</div>
    <p>Tap through the statuses to generate the statement and send it to ${CASE.attorney.firm}.</p><div class="actions"><button class="ok">Next ▸</button></div>`;
  const spans = m.body.querySelectorAll('.status-chain span');
  for (let i = 0; i < chain.length - 1; i++) {
    await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
    spans[i].className = 'done'; spans[i + 1].className = 'now'; sfx.good();
  }
  spans[chain.length - 1].className = 'done';
  m.body.querySelector('.actions').innerHTML = '<span style="color:#1fc98a;font-weight:700">Sent. Claim → BILLED</span>';
  sfx.great();
  await wait(1000);
  m.close();
}

async function lienRouting() {
  const docs = [
    { code: 'TECH_PSL', who: 'PATIENT' }, { code: 'TECH_ASL', who: 'ATTORNEY' },
    { code: 'RAD_PSL', who: 'PATIENT' }, { code: 'RAD_ASL', who: 'ATTORNEY' },
  ];
  const m = openModal({ badge: '📜 LIENS', title: 'Who signs each lien?', color: ORANGE, wide: true });
  m.body.innerHTML = `<p><b>PSL</b> = patient-signed lien · <b>ASL</b> = attorney-signed lien.</p>
    <div class="ledger">${docs.map((d) => `<div class="lrow" data-c="${d.code}"><div><b>${d.code}</b><small>${d.code.startsWith('TECH') ? CASE.clinic : CASE.radiologist.group}</small></div>
      <div class="seg"><span data-v="PATIENT">👩🏽 Maya</span><span data-v="ATTORNEY">👩🏻‍💼 Lena</span></div></div>`).join('')}</div>
    <div class="actions"><button class="ok" disabled>Send for signature</button></div>`;
  const pick = {};
  m.body.querySelectorAll('.lrow').forEach((row) => row.querySelectorAll('.seg span').forEach((s) => s.addEventListener('click', () => {
    row.querySelectorAll('.seg span').forEach((x) => x.classList.remove('on'));
    s.classList.add('on'); pick[row.dataset.c] = s.dataset.v; sfx.click();
    m.body.querySelector('.ok').disabled = Object.keys(pick).length < docs.length;
  })));
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  m.close();
  const wrong = docs.filter((d) => pick[d.code] !== d.who).length;
  if (!wrong) { sfx.great(); toast('✓ All four liens routed', 'good'); }
  else bumpMeter('compliance', -6 * wrong, 'PSL goes to the patient, ASL to the attorney');
}

async function esignChannels() {
  const how = await dialog(ben, ['Maya gets her sign link by text. How do we reach Lena at the firm?'],
    ['Email or fax', 'Text message, same as Maya', 'A phone call']);
  if (how === 0) toast('✓ Attorneys get email or fax, never SMS', 'good');
  else bumpMeter('compliance', -6, 'attorneys are reached by email or fax only');
  const ph = phone(`<div class="sms"><div class="from">MediFlow · now</div>${CASE.clinic}: please review and sign your lien.<br><u>p.mediflow.app/l/••••</u></div>
    <div class="sms"><div class="from">Signed ✓</div>TECH_PSL and RAD_PSL signed. Thank you, Maya!</div>`);
  sfx.good();
  await wait(2600);
  ph.hide();
  toast('Liens → SIGNED', 'good');
}
