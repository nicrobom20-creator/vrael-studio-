const PUNCT = /[^\p{L}\p{N}\s]/gu;

export function normalizePhrase(value: string): string {
  return (value || "").toLowerCase().replace(PUNCT, " ").replace(/\s+/g, " ").trim();
}

export function phraseHit(heard: string, target: string): boolean {
  const a = normalizePhrase(heard);
  const b = normalizePhrase(target);
  if (!a || !b) return false;
  const compact = (s: string) => s.replace(/\s/g, "");
  if (a.includes(b) || b.includes(a) || compact(a).includes(compact(b))) return true;
  const heardTokens = new Set(a.split(" ").filter(Boolean));
  const need = b.split(" ").filter(Boolean);
  if (!need.length) return false;
  const hits = need.filter((token) => heardTokens.has(token)).length;
  return hits / need.length >= 0.6;
}

function voiceFor(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const wanted = (lang || "en-GB").toLowerCase();
  const exact = voices.find((voice) => voice.lang.toLowerCase() === wanted);
  if (exact) return exact;
  const prefix = wanted.slice(0, 2);
  return voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) || null;
}

export function speakAloud(text: string, lang: string) {
  if (!("speechSynthesis" in window) || !text) return;
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || "en-GB";
    utterance.rate = 0.92;
    const voice = voiceFor(utterance.lang);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  if (window.speechSynthesis.getVoices().length) {
    speak();
    return;
  }
  const ready = () => {
    window.speechSynthesis.removeEventListener("voiceschanged", ready);
    speak();
  };
  window.speechSynthesis.addEventListener("voiceschanged", ready);
  window.speechSynthesis.getVoices();
}

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export function canListen(): boolean {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

declare global {
  interface Window {
    SpeechRecognition?: new () => Rec;
    webkitSpeechRecognition?: new () => Rec;
  }
}

export function listenOnce(lang: string, onText: (text: string) => void, onEnd: () => void) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    onEnd();
    return { stop() {} };
  }
  const rec = new Ctor();
  rec.lang = lang || "en-GB";
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    if (text) onText(text);
  };
  rec.onerror = () => onEnd();
  rec.onend = () => onEnd();
  rec.start();
  return { stop: () => rec.stop() };
}

export function chime(kind: "ok" | "bad" | "win") {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const notes = kind === "win" ? [523, 659, 784] : kind === "ok" ? [660, 880] : [220];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime + index * 0.08;
    osc.start(start);
    osc.stop(start + 0.16);
  });
  window.setTimeout(() => ctx.close(), 800);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
