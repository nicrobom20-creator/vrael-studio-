const KEY = "yappo_muted";

let ambient: AudioContext | null = null;
let pad: OscillatorNode | null = null;

export function isMuted() {
  return localStorage.getItem(KEY) !== "0";
}

export function setMuted(muted: boolean) {
  localStorage.setItem(KEY, muted ? "1" : "0");
  if (muted) stopAmbient();
  window.dispatchEvent(new Event("yappo-sound"));
}

export function startAmbient() {
  if (isMuted() || ambient) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 196;
  gain.gain.value = 0.012;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  ambient = ctx;
  pad = osc;
}

export function stopAmbient() {
  try {
    pad?.stop();
  } catch {
    /* already stopped */
  }
  pad = null;
  const ctx = ambient;
  ambient = null;
  if (ctx) void ctx.close();
}

export function sfx(kind: "ok" | "bad" | "win") {
  if (isMuted()) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const notes = kind === "win" ? [523, 659, 784] : kind === "ok" ? [660, 880] : [196, 164];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === "bad" ? "triangle" : "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.045;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime + index * 0.08;
    osc.start(start);
    osc.stop(start + 0.16);
  });
  window.setTimeout(() => void ctx.close(), 900);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
