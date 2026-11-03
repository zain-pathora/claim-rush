// Voice-over with the browser's built-in speech synthesis (free, no audio files).
// Reads dialog lines, answer choices, task instructions and MediFlow cards aloud.
const synth = window.speechSynthesis;
let on = true;
try { on = localStorage.getItem('claimrush-voice') !== '0'; } catch {}

const FEMALE = ['Maya', 'Rosa', 'Wong', 'Lena', 'Ana', 'Narrator'];
const FEMALE_VOICES = /samantha|victoria|karen|moira|tessa|zira|susan|female|aria|jenny|libby|sonia|hazel/i;
const MALE_VOICES = /daniel|alex|fred|david|mark|guy|ryan|male|george|arthur|oliver/i;
// a slightly different pitch per character so they don't all sound alike
const PITCH = { Maya: 1.1, Rosa: 1.0, Dev: 0.9, 'Dr. Wong': 1.05, Ben: 1.0, 'Lena Ortiz': 0.95, Ana: 1.08, You: 1.0, Narrator: 1.0 };

let voices = [];
let last = null;
const load = () => { voices = (synth?.getVoices() || []).filter((v) => /^en/i.test(v.lang)); };
load();
if (synth) synth.onvoiceschanged = load;

function pickVoice(speaker) {
  if (!voices.length) load();
  const female = FEMALE.some((n) => speaker.includes(n));
  const pool = voices.filter((v) => (female ? FEMALE_VOICES : MALE_VOICES).test(v.name));
  return pool.find((v) => v.localService) || pool[0] || voices.find((v) => v.default) || voices[0] || null;
}

const clean = (html) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
};

export function speak(html, speaker = 'Narrator', { queue = false } = {}) {
  if (!on || !synth) return;
  const text = clean(html);
  if (!text) return;
  if (!queue) { synth.cancel(); last = []; }
  last?.push([html, speaker]);
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(speaker);
  if (v) u.voice = v;
  u.rate = 1.02;
  u.pitch = PITCH[speaker] ?? 1;
  synth.speak(u);
}

export const stopSpeech = () => synth?.cancel();
export const voiceOn = () => on && !!synth;
export function toggleVoice() {
  on = !on;
  try { localStorage.setItem('claimrush-voice', on ? '1' : '0'); } catch {}
  if (!on) stopSpeech();
  return on;
}

// replay whatever was said last (dialog line + its choices)
export function repeatSpeech() {
  if (!last?.length) return;
  const items = last;
  items.forEach(([h, s], i) => speak(h, s, { queue: i > 0 }));
  last = items;
}
