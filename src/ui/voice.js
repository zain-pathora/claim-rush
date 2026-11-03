// Voice-over with the browser's built-in speech synthesis (free, no audio files, no AI service).
// Each character gets their own voice, and each line is delivered with an emotion that shapes
// speed, pitch and pauses. Lines can carry an explicit tag like "[worried] ..."; otherwise the
// emotion is guessed from the words and punctuation.
const synth = window.speechSynthesis;
let on = true;
try { on = localStorage.getItem('claimrush-voice') !== '0'; } catch {}

// Casting: preferred voices per character, best first. Covers macOS/iOS, Windows/Edge and Chrome.
const CAST = {
  Maya: { voices: ['Samantha', 'Ava', 'Aria', 'Jenny', 'Google US English', 'Zira'], female: true, pitch: 1.12, rate: 1.0 },
  Rosa: { voices: ['Karen', 'Jenny', 'Michelle', 'Google US English', 'Zira'], female: true, pitch: 1.05, rate: 1.06 },
  Ana: { voices: ['Tessa', 'Ana', 'Zira', 'Emma', 'Google UK English Female'], female: true, pitch: 1.0, rate: 1.04 },
  'Dr. Wong': { voices: ['Moira', 'Sonia', 'Libby', 'Google UK English Female', 'Hazel'], female: true, pitch: 0.95, rate: 0.95 },
  'Lena Ortiz': { voices: ['Victoria', 'Fiona', 'Natasha', 'Libby', 'Hazel', 'Google UK English Female'], female: true, pitch: 0.92, rate: 0.98 },
  Dev: { voices: ['Daniel', 'Rishi', 'Guy', 'Ryan', 'Google UK English Male', 'David'], female: false, pitch: 1.0, rate: 1.05 },
  Ben: { voices: ['Alex', 'Tom', 'Christopher', 'Eric', 'David', 'Google US English'], female: false, pitch: 1.05, rate: 1.02 },
  You: { voices: ['Fred', 'Aaron', 'Andrew', 'Mark', 'David'], female: false, pitch: 1.0, rate: 1.0 },
  Narrator: { voices: ['Samantha', 'Aria', 'Jenny', 'Google US English', 'Zira'], female: true, pitch: 1.0, rate: 0.98 },
};
const FEMALE_HINT = /female|samantha|victoria|karen|moira|tessa|zira|susan|aria|jenny|libby|sonia|hazel|ava|emma|michelle|fiona|natasha|allison|nicky/i;

// how each emotion changes delivery (multipliers on the character's base rate/pitch)
const EMOTION = {
  neutral: { rate: 1, pitch: 1, pause: 220 },
  pain: { rate: 0.82, pitch: 0.92, pause: 420 },
  worried: { rate: 0.9, pitch: 1.04, pause: 340 },
  anxious: { rate: 1.08, pitch: 1.1, pause: 180 },
  cheerful: { rate: 1.08, pitch: 1.1, pause: 180 },
  excited: { rate: 1.14, pitch: 1.16, pause: 150 },
  calm: { rate: 0.92, pitch: 0.97, pause: 320 },
  reassuring: { rate: 0.9, pitch: 1.0, pause: 340 },
  firm: { rate: 0.94, pitch: 0.9, pause: 300 },
  annoyed: { rate: 1.05, pitch: 0.86, pause: 200 },
  pleased: { rate: 1.02, pitch: 1.08, pause: 220 },
  serious: { rate: 0.9, pitch: 0.92, pause: 320 },
  question: { rate: 1, pitch: 1.08, pause: 260 },
};

export function parseEmotion(line) {
  const m = /^\s*\[(\w+)\]\s*/.exec(line);
  if (m && EMOTION[m[1]]) return { emotion: m[1], text: line.slice(m[0].length) };
  return { emotion: null, text: line };
}

function guessEmotion(text) {
  const t = text.toLowerCase();
  if (/\b(ow|ouch|killing me|hurts|pain)\b/.test(t)) return 'pain';
  if (/panick|scared|nervous|tight spaces|afraid/.test(t)) return 'anxious';
  if (/don't worry|no rush|you're fine|it's okay/.test(t)) return 'reassuring';
  if (/sorry|how am i supposed|i can't/.test(t)) return 'worried';
  if (/welcome|hi[, !]|hey|great|perfect|thank/.test(t)) return 'cheerful';
  if (/!/.test(t)) return 'excited';
  if (/\?\s*$/.test(t)) return 'question';
  return 'neutral';
}

// "Maya Reyes" -> Maya, "Dr. Iris Wong" -> Dr. Wong
const castKey = (speaker) => Object.keys(CAST).find((k) => speaker === k || speaker.includes(k.replace('Dr. ', ''))) || 'Narrator';

let voices = [];
const assigned = new Map();
const load = () => { voices = (synth?.getVoices() || []).filter((v) => /^en/i.test(v.lang)); assigned.clear(); };
load();
if (synth) synth.onvoiceschanged = load;

// natural/enhanced voices sound far better, so prefer them when the system has them
const quality = (v) => (/natural|neural|premium|enhanced|online/i.test(v.name) ? 2 : 0) + (v.localService ? 0.5 : 0);

function voiceFor(who) {
  const speaker = castKey(who);
  if (assigned.has(speaker)) return assigned.get(speaker);
  if (!voices.length) load();
  const cast = CAST[speaker] || CAST.Narrator;
  const used = new Set([...assigned.entries()].filter(([s]) => s !== 'Narrator').map(([, v]) => v?.name));
  let pick = null;
  for (const want of cast.voices) {
    const matches = voices.filter((v) => v.name.toLowerCase().includes(want.toLowerCase())).sort((a, b) => quality(b) - quality(a));
    pick = matches.find((v) => !used.has(v.name)) || null;
    if (pick) break;
  }
  if (!pick) {
    // no named match: any unused voice of the right gender, then anything English
    const pool = voices.filter((v) => FEMALE_HINT.test(v.name) === cast.female).sort((a, b) => quality(b) - quality(a));
    pick = pool.find((v) => !used.has(v.name)) || pool[0] || voices[0] || null;
  }
  assigned.set(speaker, pick);
  return pick;
}

const clean = (html) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\bDOB\b/g, 'date of birth').replace(/\bMRI\b/g, 'M R I').replace(/\bw\/o\b/g, 'without')
    .replace(/\bCPT\b/g, 'C P T').replace(/\bQC\b/g, 'Q C').replace(/\bLOP\b/g, 'L O P').replace(/\bDr\./g, 'Doctor')
    .replace(/\b(TECH|RAD|PSL|ASL)_/g, '$1 ').replace(/_/g, ' ')
    .replace(/\s+/g, ' ').trim();
};

let last = [];
let token = 0;

// Speak a line. Sentences are queued one by one with short pauses, which sounds more natural
// and avoids Chrome cutting off long utterances.
export function speak(html, speaker = 'Narrator', { queue = false, emotion } = {}) {
  if (!on || !synth) return;
  const parsed = parseEmotion(html);
  const text = clean(parsed.text);
  if (!text) return;
  const mood = EMOTION[emotion || parsed.emotion || guessEmotion(text)] || EMOTION.neutral;
  if (!queue) { synth.cancel(); last = []; token++; }
  last.push([html, speaker, emotion]);
  const cast = CAST[castKey(speaker)];
  const voice = voiceFor(speaker);
  const parts = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text];
  parts.forEach((part) => {
    const u = new SpeechSynthesisUtterance(part.trim());
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    // questions rise at the end; "…" means hesitation
    const q = /\?\s*$/.test(part) ? 1.06 : 1;
    const hesitate = /…|\.\.\./.test(part);
    u.rate = Math.min(1.6, cast.rate * mood.rate * (hesitate ? 0.9 : 1));
    u.pitch = Math.min(2, cast.pitch * mood.pitch * q);
    u.volume = 1;
    synth.speak(u);
  });
}

// read multiple-choice options slowly and clearly, one by one
export function speakOptions(options) {
  if (!on || !synth) return;
  const words = ['one', 'two', 'three', 'four'];
  options.forEach((o, i) => speak(`Option ${words[i] || i + 1}: ${o}.`, 'Narrator', { queue: true, emotion: 'calm' }));
}

export const stopSpeech = () => { token++; synth?.cancel(); };
export const voiceOn = () => on && !!synth;
export function toggleVoice() {
  on = !on;
  try { localStorage.setItem('claimrush-voice', on ? '1' : '0'); } catch {}
  if (!on) stopSpeech();
  return on;
}

// replay whatever was said last (dialog line + its choices)
export function repeatSpeech() {
  if (!last.length) return;
  const items = last;
  items.forEach(([h, s, e], i) => speak(h, s, { queue: i > 0, emotion: e }));
  last = items;
}
