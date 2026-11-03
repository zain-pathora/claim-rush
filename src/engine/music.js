import { audio } from './core.js';

// A soft generated loop: pad chords, a bass note and a gentle arpeggio. No audio files.
const CHORDS = [
  [261.6, 329.6, 392.0, 493.9], // Cmaj7
  [220.0, 261.6, 329.6, 392.0], // Am7
  [174.6, 220.0, 261.6, 329.6], // Fmaj7
  [196.0, 246.9, 293.7, 349.2], // G7
];
const BEAT = 0.42;
let master = null;
let timer = null;
let step = 0;
let muted = false;
try { muted = localStorage.getItem('claimrush-muted') === '1'; } catch {}

function note(freq, start, dur, type, vol) {
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.08, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function schedule() {
  const now = audio.currentTime + 0.05;
  const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
  const beat = step % 8;
  if (beat === 0) {
    for (const f of chord) note(f / 2, now, BEAT * 8, 'sine', 0.035);
    note(chord[0] / 4, now, BEAT * 3, 'triangle', 0.08);
  }
  if (beat === 4) note(chord[0] / 4, now, BEAT * 3, 'triangle', 0.06);
  const arp = [0, 2, 1, 3, 2, 1, 3, 2][beat];
  if (beat % 2 === 0 || Math.random() < 0.4) note(chord[arp] * 2, now, BEAT * 0.9, 'triangle', 0.025);
  step++;
}

export function startMusic() {
  if (timer) return;
  master = audio.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(audio.destination);
  timer = setInterval(schedule, BEAT * 1000);
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('claimrush-muted', muted ? '1' : '0'); } catch {}
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, audio.currentTime, 0.1);
  return muted;
}
export const isMuted = () => muted;
