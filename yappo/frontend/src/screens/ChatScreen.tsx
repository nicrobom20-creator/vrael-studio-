import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../api";
import { Companion } from "../components/Companion";
import { Atmosphere } from "../components/World";
import { useApp } from "../state";
import type { ChatResult, Scene, User } from "../types";

interface Bubble {
  role: "user" | "assistant";
  text: string;
}

export function ChatScreen() {
  const { user, notify, setUser } = useApp();
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sceneId, setSceneId] = useState("cafe");
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [correction, setCorrection] = useState<ChatResult["correction"]>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const mascot = user?.mascot || "parrot";
  const outfit = user?.outfit || "";
  const scene = scenes.find((item) => item.id === sceneId);

  useEffect(() => {
    api<{ scenes: Scene[] }>("/api/scenes")
      .then((data) => {
        setScenes(data.scenes);
        const first = data.scenes[0];
        if (first) {
          setSceneId(first.id);
          setMessages([{ role: "assistant", text: first.opening }]);
        }
      })
      .catch((reason: Error) => notify(reason.message));
  }, [user?.language]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, hint]);

  function switchScene(next: Scene) {
    setSceneId(next.id);
    setMessages([{ role: "assistant", text: next.opening }]);
    setHint("");
    setCorrection(null);
    setSource("");
  }

  async function send(hintOnly = false) {
    const line = text.trim();
    if (!hintOnly && !line) return;
    const prior = messages.map((item) => ({ role: item.role, text: item.text }));
    if (!hintOnly) setMessages((items) => [...items, { role: "user", text: line }]);
    setText("");
    setBusy(true);
    try {
      const result = await api<ChatResult & { user?: User }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ scene: sceneId, text: hintOnly ? "" : line, history: prior, hint_only: hintOnly }),
      });
      if (result.reply) setMessages((items) => [...items, { role: "assistant", text: result.reply }]);
      setHint(result.hint_ru || "");
      setCorrection(result.correction);
      setSource(result.source || "");
      if (result.user) setUser(result.user);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 429) {
        notify(reason.message);
        navigate("/premium");
      } else notify(reason instanceof Error ? reason.message : "Разговор прервался");
    } finally {
      setBusy(false);
    }
  }

  const left = user?.usage.chat_limit == null ? null : Math.max(0, user.usage.chat_limit - user.usage.chat);

  return (
    <Atmosphere language={user?.language || "fr"}>
      <div className="flex h-dvh flex-col px-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="glass flex items-center gap-3 p-3">
          <div className="h-12 w-12">
            <Companion mascot={mascot} pose="wave" outfit={outfit} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl leading-none">{scene?.title || "Разговор"}</div>
            <div className="truncate text-xs text-cream/65">{scene?.blurb}</div>
            <button type="button" className="mt-1 text-xs text-gold2 underline" onClick={() => navigate("/call")}>Позвонить</button>
          </div>
          <div className="text-right text-[11px] text-gold2">
            {left == null ? "без лимита" : `${left} сообщ.`}
            <div className="text-cream/50">{source === "llm" ? "живой голос" : source ? "учебный режим" : "сцена"}</div>
          </div>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {scenes.map((item) => (
            <button
              key={item.id}
              onClick={() => switchScene(item)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${item.id === sceneId ? "border-gold text-gold2" : "border-white/15 text-cream/70"}`}
            >
              {item.group}
            </button>
          ))}
        </div>
        <div ref={scroller} className="mt-2 flex-1 space-y-2 overflow-y-auto pb-3">
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-3xl px-3 py-2 text-sm leading-relaxed ${item.role === "user" ? "bg-gold text-ink" : "glass rounded-bl-md"}`}>
                {item.text}
              </div>
            </div>
          ))}
          {correction && (
            <div className="glass border-l-2 border-l-gold p-3 text-sm">
              <div className="text-[11px] uppercase tracking-[0.14em] text-gold2">Поправка</div>
              <div className="mt-1 text-cream/50 line-through">{correction.was}</div>
              <div>{correction.fixed}</div>
              <div className="mt-1 text-cream/75">{correction.note_ru}</div>
            </div>
          )}
          {hint && (
            <div className="glass p-3 text-sm">
              <div className="text-[11px] uppercase tracking-[0.14em] text-gold2">Подсказка по-русски</div>
              <div className="mt-1">{hint}</div>
            </div>
          )}
        </div>
        <div className="pb-[96px]">
          <div className="mb-2 flex justify-end">
            <button className="text-xs text-gold2" onClick={() => send(true)} disabled={busy}>Подсказка</button>
          </div>
          <form
            className="glass flex items-center gap-2 p-2"
            onSubmit={(event) => {
              event.preventDefault();
              send(false);
            }}
          >
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Напиши фразу…"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-cream/40"
            />
            <button className="gold-btn h-10 px-4 text-sm" disabled={busy} type="submit">
              {busy ? "…" : "→"}
            </button>
          </form>
        </div>
      </div>
    </Atmosphere>
  );
}
