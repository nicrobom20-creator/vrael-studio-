import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Companion } from "../components/Companion";
import { GoldButton, MicButton } from "../components/World";
import { beginSpeech, openInBrowser, phraseHit, speakAloud } from "../lib/speech";
import { gentleLine, praiseLine } from "../lib/praise";
import { useApp } from "../state";
import type { MascotId, Pose } from "../types";

const SCENES = [
  {
    id: "cafe",
    title: "Кафе",
    turns: [
      { npc: "Hello! What can I get you?", expect: "A tea, please.", hint: "Скажи: A tea, please." },
      { npc: "Anything else?", expect: "No, thank you.", hint: "Если больше ничего: No, thank you." },
      { npc: "Here you go.", expect: "Thank you.", hint: "Поблагодари: Thank you." },
    ],
  },
  {
    id: "street",
    title: "Улица",
    turns: [
      { npc: "Excuse me, where is the station?", expect: "It's over there.", hint: "Можно: It's over there." },
      { npc: "Thank you so much.", expect: "You're welcome.", hint: "Ответ: You're welcome." },
    ],
  },
  {
    id: "harbour",
    title: "Гавань",
    turns: [
      { npc: "Hi! Where are you from?", expect: "I'm from Russia.", hint: "Ответ: I'm from Russia." },
      { npc: "Nice to meet you.", expect: "Nice to meet you too.", hint: "Можно: Nice to meet you too." },
      { npc: "See you later!", expect: "See you later.", hint: "Повтори: See you later." },
    ],
  },
];

export function CallScreen() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [scene, setScene] = useState(0);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [listening, setListening] = useState(false);
  const [done, setDone] = useState(false);
  const [mood, setMood] = useState<Pose>("wave");
  if (!user) return null;
  const mascot = (user.mascot || "parrot") as MascotId;
  const place = SCENES[scene];
  const turn = place.turns[index];
  const pose: Pose = done ? "celebrate" : listening ? "point" : mood;

  function reset(nextScene: number) {
    setScene(nextScene);
    setIndex(0);
    setDone(false);
    setNote("");
    setDraft("");
    setMood("wave");
  }

  function accept(text: string) {
    if (!turn || done) return;
    if (phraseHit(text, turn.expect)) {
      const next = index + 1;
      setNote(praiseLine(next));
      setMood("celebrate");
      setDraft("");
      if (next >= place.turns.length) setDone(true);
      else setIndex(next);
      return;
    }
    setMood("think");
    setNote(gentleLine());
  }

  async function talk() {
    if (!turn) return;
    setListening(true);
    setMood("point");
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
      <div className="mt-2 flex gap-2">
        {SCENES.map((item, itemIndex) => (
          <button key={item.id} type="button" className={`choice-btn px-3 py-2 text-xs ${scene === itemIndex ? "choice-on" : ""}`} onClick={() => reset(itemIndex)}>
            {item.title}
          </button>
        ))}
      </div>
      <div className="relative mx-auto mt-4 h-48 w-40">
        <Companion mascot={mascot} pose={pose} outfit={user.outfit} />
        {listening && (
          <div className="pointer-events-none absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-1">
            <span className="call-bar" />
            <span className="call-bar call-bar-b" />
            <span className="call-bar call-bar-c" />
          </div>
        )}
      </div>
      {done ? (
        <div className="glass mt-4 p-4 text-center">
          <div className="font-display text-3xl">{place.title}: разговор состоялся</div>
          <p className="mt-2 text-sm text-cream/70">Спутник доволен. Можно выбрать другую сцену.</p>
        </div>
      ) : turn && (
        <div className="mt-4 grid gap-3">
          <button type="button" className="glass p-4 text-left" onClick={() => speakAloud(turn.npc, "en-GB")}>
            <div className="text-[11px] text-gold2">▶ {place.title}</div>
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
