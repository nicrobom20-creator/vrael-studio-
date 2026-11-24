import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, haptic } from "../api";
import { CityScene } from "../components/CityScene";
import { Companion } from "../components/Companion";
import { TopStats } from "../components/Shell";
import { SpeakGate } from "../components/SpeakGate";
import { StarBurst } from "../components/World";
import { markUnlock } from "../lib/motion";
import { chime, speakAloud } from "../lib/speech";
import { useApp } from "../state";
import type { MascotId, Story, User } from "../types";

export function StoryScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user, setUser, notify } = useApp();
  const [story, setStory] = useState<Story | null>(null);
  const [index, setIndex] = useState(0);
  const [heardReady, setHeardReady] = useState(false);
  const [burst, setBurst] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ xp: number; next: { id: string; kind: string } | null } | null>(null);

  useEffect(() => {
    api<Story>(`/api/stories/${id}`).then(setStory).catch((reason: Error) => setError(reason.message));
  }, [id]);

  const line = story?.lines[index];
  useEffect(() => {
    if (!line || line.speaker === "npc") return;
    setHeardReady(false);
    void speakAloud(line.text, "ru-RU").then(() => setHeardReady(true));
    return () => window.speechSynthesis?.cancel();
  }, [index, line?.text, line?.speaker]);

  if (!user) return null;
  const mascot = (user.mascot || "parrot") as MascotId;
  const gloss = line?.speaker === "npc" ? story?.lines[index + 1] : undefined;

  async function finish() {
    try {
      const result = await api<{ user: User; xp_gained: number; next: { id: string; kind: string } | null }>(`/api/stories/${id}/complete`, {
        method: "POST",
      });
      setUser(result.user);
      markUnlock(id, result.next?.id);
      haptic("success");
      chime("win");
      setDone({ xp: result.xp_gained, next: result.next });
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Не сохранилось");
    }
  }

  function next() {
    if (!story || !line) return;
    const glossShown = line.speaker === "npc" && story.lines[index + 1]?.speaker === "mascot";
    const nextIndex = index + (glossShown ? 2 : 1);
    haptic("light");
    if (nextIndex >= story.lines.length) finish();
    else setIndex(nextIndex);
  }

  function deferLine() {
    if (!line) return;
    void api("/api/words", { method: "POST", body: JSON.stringify({ front: line.text, back: gloss?.text || line.text }) }).catch(() => undefined);
    notify("Фраза ушла в повтор. Это не засчитано как верный ответ.");
    next();
  }

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p>{error}</p>
          <button className="mt-4 text-gold2" onClick={() => navigate("/")}>На карту</button>
        </div>
      </div>
    );
  }
  if (!story || !line) return <div className="grid min-h-dvh place-items-center text-cream/70">Сцена собирается…</div>;

  const foreign = line.speaker === "npc";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <CityScene language={user.language} />
      <StarBurst token={burst} />
      <div className="pointer-events-none absolute bottom-[34%] left-1 z-20 h-44 w-36">
        <Companion mascot={mascot} pose="point" />
      </div>
      <TopStats
        title={story.title}
        subtitle={`${user.city} · Уровень ${user.level}`}
        xp={user.xp}
        streak={user.streak}
        onBack={() => navigate("/")}
      />
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="story-card mb-4 w-full text-left"
        >
          <div className="mb-2">
            <div className="text-xs uppercase tracking-[0.16em] text-gold2">{foreign ? line.name || "Собеседник" : user.mascot_name || "Спутник"}</div>
          </div>
          <div className={`break-words font-display text-[28px] leading-tight ${foreign ? "italic" : ""}`}>{line.text}</div>
          {foreign && gloss?.speaker === "mascot" && (
            <div className="mt-2 text-sm text-cream/75">{gloss.text}</div>
          )}
        </motion.div>
        {foreign ? (
          <SpeakGate
            phrase={line.text}
            lang="en-GB"
            onPass={() => {
              setBurst((value) => value + 1);
              chime("ok");
              haptic("success");
              next();
            }}
            onDefer={deferLine}
          />
        ) : (
          <button type="button" className="gold-btn mb-4 h-12 w-full" disabled={!heardReady} onClick={next}>
            {heardReady ? "Дальше" : "Слушай…"}
          </button>
        )}
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-gradient-to-r from-[#f6e6bf] to-[#c6a15a]" style={{ width: `${((index + 1) / story.lines.length) * 100}%` }} />
        </div>
        <div className="text-[11px] text-cream/70">{index + 1} / {story.lines.length}</div>
      </div>
      {done && (
        <div className="absolute inset-0 z-40 flex items-end bg-[#120e0b]/70 px-4 pb-8">
          <div className="glass w-full p-5 text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] text-gold2">Сцена пройдена</div>
            <div className="font-display text-5xl">+{done.xp} XP</div>
            <button
              className="gold-btn mt-4 h-12 w-full"
              onClick={() => {
                haptic("light");
                if (!done.next) navigate("/");
                else navigate(done.next.kind === "story" ? `/story/${done.next.id}` : `/trial/${done.next.id}`);
              }}
            >
              {done.next ? "Дальше по тропе" : "На карту"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
