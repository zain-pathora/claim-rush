import { THREE, sfx, burst, fx } from '../engine/core.js';
import { roomX } from '../world/campus.js';
import { setChapter, setObjective, dialog, chapterCard, openModal, mediflowCard, bumpMeter, meters, toast, wait } from '../ui/ui.js';
import { CASE } from '../data/case.js';
import { money } from './billing.js';
import { speak } from '../ui/voice.js';

const BROWN = '#8d6e63';
const lena = { name: CASE.attorney.name, role: CASE.attorney.firm, icon: CASE.attorney.icon };

export async function lawFirm(ctx) {
  const { waitFor, caseState: cs } = ctx;
  const lx = roomX('lawfirm');
  setObjective('Visit the law firm');
  await waitFor({ pos: new THREE.Vector3(lx - 6, 0, 0), label: `Enter ${CASE.attorney.firm}`, radius: 3 });
  await chapterCard(7, 'The Negotiation', `${CASE.attorney.firm} · two-way bill offer`);
  setChapter(7, 'The Negotiation');

  setObjective('Negotiate the bill with Lena');
  await waitFor({ npc: 'lena' });
  cs.owned = cs.billed.tech + (cs.ownsRad ? cs.billed.rad : 0);
  await dialog(lena, [
    cs.ownsRad ? 'I got your assignment notice, so you own both the TECH and RAD liens now. I\'ll negotiate both with you.' : 'Let\'s talk about the TECH bill. I\'ll handle Northside\'s RAD bill with them directly.',
    `[firm] Maya's settlement is tight and four providers want paying. I can't do ${money(cs.owned)}. Let's find a number.`,
  ]);
  cs.agreedPct = await negotiate(cs);
  cs.agreed = Math.round(cs.owned * cs.agreedPct / 100);
  await mediflowCard('Bill offers (two-way negotiation)',
    'The firm and the provider trade offers: SENT → COUNTERED → APPROVED. There\'s no round limit. The provider ends it by approving or marking an offer final. The agreed reduction shows on the bill under Adjustments.');

  // ---------- settlement ----------
  await chapterCard(8, 'Settlement', 'The case settles. Time to get paid and let go.');
  setChapter(8, 'Settlement');
  setObjective('Collect the settlement payment from Lena');
  await waitFor({ npc: 'lena', label: 'Collect the cheque' });
  await dialog(lena, [`[pleased] Maya's case settled. Here's a cheque from our trust account for ${money(cs.agreed)}.`]);
  if (cs.ownsRad) await allocate(cs);
  else {
    const c = await dialog(lena, ['[question] Actually, can I just send you one cheque that covers Northside\'s RAD bill too?'],
      ['No. While the liens have different owners, each owner gets its own payment', 'Sure, we\'ll pass their share on']);
    if (c === 0) toast('✓ Right: one cheque for two owners is sent back as an exception', 'good');
    else bumpMeter('compliance', -10, 'one cheque for two owners is an exception while ownership is split');
  }
  setObjective('Close the case so the firm can pay out Maya');
  const rel = await dialog(lena, ['[serious] I can\'t release Maya\'s money while your lien is still on the case. What do you send me?'],
    ['A Release of Lien', 'The approval confirmation from our negotiation', 'Another copy of the bill']);
  if (rel === 0) toast('✓ Release of Lien issued. Claim → PAID', 'good');
  else { bumpMeter('compliance', -12, 'only a Release of Lien lets the firm disburse'); toast('Sent the Release of Lien after all. Claim → PAID', 'info'); }
  sfx.great();
  burst(ctx.npcs.lena.mesh.position.clone().setY(2.5), [0xff5ca8, 0xffb833, 0x4f6bff, 0x1fc98a, 0x9b5cff], 90, 9);
  await mediflowCard('Receive payments · Allocation · Release of Lien',
    'A payment is RECORDED, then ALLOCATED to bills. When one owner holds both components, the money splits in proportion to what each billed. The Release of Lien is what lets the firm close the file and pay the patient.');
}

async function negotiate(cs) {
  const max = 64 + Math.floor(Math.random() * 10); // Lena's hidden ceiling, in %
  let offer = 45; let ask = 100; let patience = 3; let round = 0;
  const m = openModal({ badge: '🤝 BILL OFFER', title: `Negotiate ${money(cs.owned)}`, color: BROWN, wide: true });
  const render = (status, note = '') => {
    if (note) speak(note, status === 'SENT' ? 'Narrator' : 'Lena Ortiz', { emotion: { APPROVED: 'pleased', REJECTED: 'annoyed', COUNTERED: 'firm' }[status] || 'calm' });
    m.body.innerHTML = `<div class="neg">
        <div class="track"><div class="fill lena" style="width:${offer}%"><span>Lena ${offer}% · ${money(cs.owned * offer / 100)}</span></div></div>
        <div class="track"><div class="fill you" style="width:${ask}%"><span>You ${ask}% · ${money(cs.owned * ask / 100)}</span></div></div>
        <div class="negmeta"><span class="pill2">Offer ${status}</span><span>Lena's patience ${'⏳'.repeat(patience)}${'·'.repeat(3 - patience)}</span><span>Round ${round + 1}</span></div>
        ${note ? `<p class="negnote">${note}</p>` : ''}
      </div><div class="actions acts"></div>`;
  };
  render('SENT', `Lena opens at <b>${offer}%</b>. Push too hard and she stalls. Give in too fast and you lose money.`);
  while (true) {
    const mid = Math.round((ask + offer) / 2);
    const opts = [
      [`Hold at ${ask}%`, ask],
      [`Counter at ${Math.max(offer, ask - 10)}%`, Math.max(offer, ask - 10)],
      [`Meet halfway: ${mid}%`, mid],
      [`Approve her ${offer}%`, 'accept'],
    ];
    const acts = m.body.querySelector('.acts');
    const choice = await new Promise((r) => opts.forEach(([label, v]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = v === 'accept' ? 'ok' : 'ghost';
      b.onclick = () => r(v);
      acts.appendChild(b);
    }));
    sfx.click();
    round++;
    if (choice === 'accept') { ask = offer; break; }
    ask = choice;
    if (ask <= max) { sfx.great(); render('APPROVED', `Lena: "${ask}%? Fine, approved."`); await wait(1400); break; }
    patience -= ask - max > 15 ? 2 : 1;
    if (patience <= 0) {
      sfx.bad(); fx.shake = 0.4;
      ask = Math.max(40, offer - 5);
      render('REJECTED', `Lena: "We're going in circles. Settlement's coming, I'll pay what's left: ${ask}%."`);
      bumpMeter('trust', -8, 'the firm walked away from the table');
      await wait(2200);
      break;
    }
    offer = Math.min(max, Math.round(offer + (max - offer) * 0.55));
    sfx.open();
    render('COUNTERED', `Lena counters at <b>${offer}%</b>.`);
  }
  m.close();
  const pct = ask;
  bumpMeter('recovery', pct, `agreed at ${pct}% of the bill`);
  return pct;
}

async function allocate(cs) {
  const techShare = Math.round(cs.billed.tech / (cs.billed.tech + cs.billed.rad) * 100);
  const m = openModal({ badge: '🧾 ALLOCATE', title: `Split ${money(cs.agreed)} across the two components`, color: BROWN });
  m.body.innerHTML = `<p>You own both liens. Split the cheque in proportion to what each component billed: TECH ${money(cs.billed.tech)}, RAD ${money(cs.billed.rad)}.</p>
    <input type="range" min="0" max="100" value="50" class="alloc" />
    <div class="row" style="justify-content:space-between"><b class="t">TECH</b><b class="r">RAD</b></div>
    <div class="actions"><button class="ok">Allocate</button></div>`;
  const slider = m.body.querySelector('.alloc');
  const upd = () => {
    const v = Number(slider.value);
    m.body.querySelector('.t').textContent = `TECH ${v}% · ${money(cs.agreed * v / 100)}`;
    m.body.querySelector('.r').textContent = `RAD ${100 - v}% · ${money(cs.agreed * (100 - v) / 100)}`;
  };
  slider.oninput = upd; upd();
  await new Promise((r) => { m.body.querySelector('.ok').onclick = r; });
  m.close();
  const off = Math.abs(Number(slider.value) - techShare);
  if (off <= 3) { sfx.great(); toast(`✓ Allocated ${techShare}/${100 - techShare}: payment → ALLOCATED`, 'good'); }
  else bumpMeter('compliance', -8, `the split should follow the billed amounts: ${techShare}/${100 - techShare}`);
}
