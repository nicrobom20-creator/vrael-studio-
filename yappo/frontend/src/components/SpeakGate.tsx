import { useEffect, useState } from "react";
import { capturePhrase, phraseHit, speakAloud } from "../lib/speech";
import { MicButton } from "./World";

export function SpeakGate({
  phrase,
  lang,
  onPass,
  onDefer,
}: {
  phrase: string;
  lang: string;
  onPass: (heard: string) => void;
  onDefer: () => void;
}) {
  const [phase, setPhase] = useState<"hear" | "ready" | "listen" | "miss">("hear");
  const [heard, setHeard] = useState("");
  const [tries, setTries] = useState(0);
  const [note, setNote] = useState("Слушай фразу до конца");

  useEffect(() => {
    let live = true;
    setPhase("hear");
    setHeard("");
    setTries(0);
    setNote("Слушай фразу до конца");
    void speakAloud(phrase, lang).then(() => {
      if (!live) return;
      setPhase("ready");
      setNote("Теперь скажи её вслух");
    });
    return () => {
      live = false;
      window.speechSynthesis?.cancel();
    };
  }, [phrase, lang]);

  async function go() {
    if (phase === "hear" || phase === "listen") return;
    setPhase("listen");
    setNote("Слушаю…");
    try {
      const text = await capturePhrase(lang);
      setHeard(text);
      if (text && phraseHit(text, phrase)) {
        setNote("Совпало");
        onPass(text);
        return;
      }
      const next = tries + 1;
      setTries(next);
      setPhase("miss");
      setNote(text ? `Слышу: «${text}». Ещё раз.` : "Не разобрал. Ещё раз.");
    } catch (error) {
      setTries((value) => value + 1);
      setPhase("miss");
      setNote(error instanceof Error ? error.message : "Микрофон не ответил");
    }
  }

  return (
    <div className="mb-2 flex flex-col items-center">
      <MicButton live={phase === "listen"} onClick={() => void go()} />
      <div className="mt-2 max-w-xs text-center text-xs text-cream/80">{note}</div>
      {heard && phase === "miss" && <div className="mt-1 max-w-xs text-center text-xs text-gold2">{heard}</div>}
      {tries >= 3 && (
        <button type="button" className="mt-3 text-xs text-gold2 underline" onClick={onDefer}>
          Повторить позже
        </button>
      )}
    </div>
  );
}
