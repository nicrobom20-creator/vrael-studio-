import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Companion } from "../components/Companion";
import { GoldButton, MicButton } from "../components/World";
import { beginSpeech, openInBrowser, phraseHit, speakAloud } from "../lib/speech";
import { gentleLine, praiseLine } from "../lib/praise";
import { useApp } from "../state";
import type { MascotId } from "../types";

const TURNS = [
  { npc: "Hello! What can I get you?", expect: "A tea, please.", hint: "Скажи: A tea, please." },
  { npc: "Anything else?", expect: "No, thank you.", hint: "Если больше ничего: No, thank you." },
  { npc: "Where are you from?", expect: "I'm from Russia.", hint: "Ответ: I'm from Russia." },
  { npc: "Nice to meet you.", expect: "Nice to meet you too.", hint: "Можно ответить: Nice to meet you too." },
];

export function CallScreen() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [listening, setListening] = useState(false);
  const [done, setDone] = useState(false);
  if (!user) return null;
  const mascot = (user.mascot || "parrot") as MascotId;
  const turn = TURNS[index];

  function accept(text: string) {
    if (!turn) return;
    if (phraseHit(text, turn.expect)) {
      const next = index + 1;
      setNote(praiseLine(next));
      setDraft("");
      if (next >= TURNS.length) setDone(true);
      else setIndex(next);
      return;
    }
    setNote(gentleLine());
  }

  async function talk() {
    if (!turn) return;
    setListening(true);
    setNote("");
    await beginSpeech("en-GB", (text) => {
      setListening(false);
      setDraft(text);
      accept(text);
    }, () => setListening(false));
  }

  return (
    <div className="relative min-h-dvh bg-ink px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
      <button type="button" className="text-sm text-cream/70" onClick={() => navigate("/chat")}>← разговор</button>
      <h1 className="mt-2 font-display text-4xl">Звонок</h1>
      <p className="text-sm text-cream/70">Короткий разговор вслух. Если микрофон молчит, напиши фразу.</p>
      <div className="mx-auto mt-4 h-44 w-36">
        <Companion mascot={mascot} pose={done ? "celebrate" : listening ? "point" : "wave"} outfit={user.outfit} />
      </div>
      {done ? (
        <div className="glass mt-4 p-4 text-center">
          <div className="font-display text-3xl">Разговор состоялся</div>
          <div className="mt-4">
            <GoldButton onClick={() => navigate("/chat")}>Вернуться</GoldButton>
          </div>
        </div>
      ) : turn && (
        <div className="mt-4 grid gap-3">
          <button type="button" className="glass p-4 text-left" onClick={() => speakAloud(turn.npc, "en-GB")}>
            <div className="text-[11px] text-gold2">▶ собеседник</div>
            <div className="mt-1 font-display text-2xl leading-tight">{turn.npc}</div>
            <div className="mt-2 text-sm text-cream/70">{turn.hint}</div>
          </button>
          {note && <p className="text-center text-sm text-gold2">{note}</p>}
          <div className="flex flex-col items-center">
            <MicButton live={listening} onClick={() => void talk()} />
            <button type="button" className="mt-2 text-xs text-gold2 underline" onClick={openInBrowser}>Открыть в браузере</button>
          </div>
          <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); accept(draft); }}>
            <label className="text-xs text-cream/60" htmlFor="call-line">Или напиши</label>
            <input
              id="call-line"
              name="reply"
              className="field"
              value={draft}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              onChange={(event) => setDraft(event.target.value)}
            />
            <GoldButton type="submit" disabled={!draft.trim()}>Ответить</GoldButton>
          </form>
        </div>
      )}
    </div>
  );
}
