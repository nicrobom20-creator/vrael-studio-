import { sfx } from "./sound";

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

export type MicProblem = "denied" | "unsupported" | "error";

export function openInBrowser() {
  const url = window.location.href;
  const opener = window.Telegram?.WebApp?.openLink;
  if (opener) opener(url);
  else window.open(url, "_blank", "noopener");
}

export async function beginSpeech(
  lang: string,
  onText: (text: string) => void,
  onProblem: (problem: MicProblem) => void,
): Promise<{ stop: () => void }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    onProblem("unsupported");
    return { stop() {} };
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    onProblem("denied");
    return { stop() {} };
  }
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    let recorder: MediaRecorder | null = null;
    try {
      recorder = new MediaRecorder(stream);
      recorder.start();
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      onProblem("unsupported");
      return { stop() {} };
    }
    const stopTracks = () => {
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {
        /* already stopped */
      }
      stream.getTracks().forEach((track) => track.stop());
    };
    const timer = window.setTimeout(() => {
      stopTracks();
      onProblem("unsupported");
    }, 1400);
    return {
      stop() {
        window.clearTimeout(timer);
        stopTracks();
      },
    };
  }
  const rec = new Ctor();
  rec.lang = lang || "en-GB";
  rec.interimResults = false;
  rec.continuous = false;
  let heard = false;
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    stream.getTracks().forEach((track) => track.stop());
  };
  rec.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    if (text) {
      heard = true;
      onText(text);
    }
  };
  const report = (problem: MicProblem) => {
    if (heard || closed) return;
    finish();
    onProblem(problem);
  };
  rec.onerror = () => report("error");
  rec.onend = () => {
    if (!heard) report("error");
    else finish();
  };
  try {
    rec.start();
  } catch {
    finish();
    onProblem("error");
    return { stop() {} };
  }
  return {
    stop() {
      try { rec.stop(); } catch { /* already stopped */ }
      finish();
    },
  };
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
  sfx(kind);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
