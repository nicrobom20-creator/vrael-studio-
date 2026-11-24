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

export function speakAloud(text: string, lang: string, rate = 0.92): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || !text) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang || "en-GB";
      utterance.rate = rate;
      const voice = voiceFor(utterance.lang);
      if (voice) utterance.voice = voice;
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      window.setTimeout(finish, Math.min(12000, 900 + text.length * 90));
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
    window.setTimeout(speak, 400);
  });
}

function pickMime(): string {
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/aac"];
  return types.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

export function recordPhrase(ms = 3200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      reject(new Error("В этом окне Telegram нет записи с микрофона."));
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      rec.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        reject(new Error("Запись оборвалась. Попробуй ещё раз."));
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        resolve(new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" }));
      };
      rec.start();
      window.setTimeout(() => {
        if (rec.state !== "inactive") rec.stop();
      }, ms);
    }).catch(() => reject(new Error("Нет доступа к микрофону. Разреши его в Telegram.")));
  });
}

async function recognizeOnce(lang: string): Promise<string> {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return "";
  return new Promise((resolve, reject) => {
    const rec = new Recognition();
    rec.lang = lang || "en-GB";
    rec.interimResults = false;
    rec.continuous = false;
    let text = "";
    const timer = window.setTimeout(() => {
      try { rec.stop(); } catch { /* already stopped */ }
      resolve(text);
    }, 4000);
    rec.onresult = (event) => {
      text = event.results?.[0]?.[0]?.transcript || "";
    };
    rec.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("listen"));
    };
    rec.onend = () => {
      window.clearTimeout(timer);
      resolve(text);
    };
    try {
      rec.start();
    } catch {
      window.clearTimeout(timer);
      reject(new Error("listen"));
    }
  });
}

export async function capturePhrase(lang: string): Promise<string> {
  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    try {
      const text = await recognizeOnce(lang);
      if (text.trim()) return text.trim();
    } catch {
      /* iOS Telegram has no SpeechRecognition. Record and send the audio. */
    }
  }
  const blob = await recordPhrase();
  const type = blob.type || "audio/webm";
  const ext = type.includes("mp4") || type.includes("m4a") ? "m4a" : type.includes("aac") ? "aac" : "webm";
  const body = new FormData();
  body.append("audio", blob, `phrase.${ext}`);
  const token = localStorage.getItem("yappo_token");
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const response = await fetch(`${base}/api/speech`, { method: "POST", headers, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(typeof detail === "string" ? detail : "Не получилось распознать фразу.");
  }
  return String(data.text || "").trim();
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
