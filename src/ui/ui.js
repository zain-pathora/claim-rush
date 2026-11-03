import { sfx, onKey } from '../engine/core.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

// ---------- meters ----------
export const meters = { trust: 100, compliance: 100, recovery: 0 };
const METER_INFO = {
  trust: { label: 'Patient Trust', icon: '💙' },
  compliance: { label: 'Compliance', icon: '🛡️' },
  recovery: { label: 'Recovery', icon: '💰' },
};
export function resetMeters() { Object.assign(meters, { trust: 100, compliance: 100, recovery: 0 }); renderMeters(); }
export function bumpMeter(key, delta, note) {
  meters[key] = Math.max(0, Math.min(100, meters[key] + delta));
  renderMeters();
  const m = document.querySelector(`.meter[data-k="${key}"]`);
  if (m) { m.classList.remove('hit', 'gain'); void m.offsetWidth; m.classList.add(delta < 0 ? 'hit' : 'gain'); }
  if (note) toast(`${delta > 0 ? '+' : ''}${delta} ${METER_INFO[key].label} · ${note}`, delta < 0 ? 'bad' : 'good');
}
function renderMeters() {
  const box = $('meters');
  if (!box.children.length) {
    for (const k of Object.keys(METER_INFO)) {
      box.appendChild(el('div', 'meter', `<span class="mi">${METER_INFO[k].icon}</span><div><div class="ml">${METER_INFO[k].label}</div><div class="mb"><i></i></div></div><b></b>`)).dataset.k = k;
    }
  }
  for (const k of Object.keys(METER_INFO)) {
    const m = box.querySelector(`[data-k="${k}"]`);
    m.querySelector('i').style.width = `${meters[k]}%`;
    m.querySelector('b').textContent = meters[k];
  }
}

// ---------- HUD bits ----------
export function showHud(on) { $('story-hud').classList.toggle('hidden', !on); }
export function setChapter(num, title) { $('chapter-label').innerHTML = `<span>Chapter ${num}</span>${title}`; }
export function setObjective(text) {
  const o = $('objective');
  o.innerHTML = `<span class="dot"></span>${text}`;
  o.classList.remove('new'); void o.offsetWidth; o.classList.add('new');
}
export function setHint(text) {
  const h = $('hint');
  if (h.dataset.t === text) return;
  h.dataset.t = text || '';
  h.innerHTML = text ? `<kbd>E</kbd>${text}` : '';
  h.classList.toggle('hidden', !text);
}
export function toast(text, kind = 'info') {
  const box = $('toasts');
  const t = el('div', `toast ${kind}`, text);
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

// ---------- dialog ----------
export const uiState = { busy: false };
export async function dialog(speaker, lines, options) {
  uiState.busy = true;
  const d = $('dialog');
  d.classList.remove('hidden');
  d.querySelector('.portrait').textContent = speaker.icon || '🙂';
  d.querySelector('.who').innerHTML = `${speaker.name}<small>${speaker.role || ''}</small>`;
  const text = d.querySelector('.say');
  const opts = d.querySelector('.opts');
  let choice = null;
  for (let li = 0; li < lines.length; li++) {
    opts.innerHTML = '';
    text.innerHTML = '';
    const line = lines[li];
    let skip = false;
    const off = onKey((k) => { if (k === ' ' || k === 'enter' || k === 'e') skip = true; });
    const clickSkip = () => { skip = true; };
    d.addEventListener('click', clickSkip);
    for (let i = 1; i <= line.length && !skip; i++) {
      text.innerHTML = line.slice(0, i);
      if (i % 3 === 0) sfx.type();
      await wait(14);
    }
    text.innerHTML = line;
    off(); d.removeEventListener('click', clickSkip);
    const last = li === lines.length - 1;
    if (last && options) {
      choice = await new Promise((resolve) => {
        options.forEach((o, i) => {
          const b = el('button', 'opt', `<kbd>${i + 1}</kbd>${o}`);
          b.onclick = () => { offK(); resolve(i); };
          opts.appendChild(b);
        });
        const offK = onKey((k) => { const n = Number(k) - 1; if (n >= 0 && n < options.length) { offK(); resolve(n); } });
      });
      sfx.click();
    } else {
      opts.appendChild(el('div', 'next', 'Continue ▸'));
      await new Promise((resolve) => {
        const done = () => { offK(); d.removeEventListener('click', done); resolve(); };
        const offK = onKey((k) => { if (k === ' ' || k === 'enter' || k === 'e') done(); });
        setTimeout(() => d.addEventListener('click', done), 50);
      });
    }
  }
  d.classList.add('hidden');
  uiState.busy = false;
  return choice;
}

// ---------- modal for mini-games ----------
export function openModal({ badge, title, color = '#4f6bff', wide = false }) {
  uiState.busy = true;
  const wrap = $('modal-wrap');
  const m = $('modal');
  m.className = wide ? 'wide' : '';
  m.style.setProperty('--st', color);
  m.innerHTML = `<div class="mhead"><span class="badge">${badge}</span><h2>${title}</h2></div><div class="mbody"></div>`;
  wrap.classList.remove('hidden');
  sfx.open();
  return {
    body: m.querySelector('.mbody'),
    close() { wrap.classList.add('hidden'); uiState.busy = false; },
  };
}

// "In MediFlow this is..." teaching card
export function mediflowCard(screen, text) {
  return new Promise((resolve) => {
    uiState.busy = true;
    const c = $('mfcard');
    c.innerHTML = `<div class="mf-logo">MediFlow 360</div><div class="mf-k">In MediFlow, this is</div><h3>${screen}</h3><p>${text}</p><button class="go">Got it <kbd>Enter</kbd></button>`;
    c.classList.remove('hidden');
    sfx.good();
    const done = () => { off(); c.classList.add('hidden'); uiState.busy = false; resolve(); };
    c.querySelector('.go').onclick = done;
    const off = onKey((k) => { if (k === 'enter' || k === ' ') done(); });
  });
}

// phone overlay showing the patient's side
export function phone(html) {
  const p = $('phone');
  p.querySelector('.pscreen').innerHTML = html;
  p.classList.remove('hidden', 'away');
  sfx.open();
  return { hide() { p.classList.add('away'); setTimeout(() => p.classList.add('hidden'), 400); }, screen: p.querySelector('.pscreen') };
}

// big chapter title card
export async function chapterCard(num, title, sub) {
  const c = $('chapter-card');
  c.innerHTML = `<div class="cn">Chapter ${num}</div><h1>${title}</h1><p>${sub}</p>`;
  c.classList.remove('hidden', 'out');
  sfx.chapter();
  await wait(2600);
  c.classList.add('out');
  await wait(500);
  c.classList.add('hidden');
}

export { wait };
