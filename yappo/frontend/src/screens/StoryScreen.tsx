import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, haptic } from "../api";
import { CityScene } from "../components/CityScene";
import { Companion } from "../components/Companion";
import { Guide } from "../components/Guide";
import { TopStats } from "../components/Shell";
import { LeadIn, MicButton, StarBurst } from "../components/World";
import { canListen, chime, listenOnce, phraseHit, speakAloud } from "../lib/speech";
import { useApp } from "../state";
import type { MascotId, Pose, Story, User } from "../types";

const POSE: Record<string, Pose> = {
  wave: "wave",
  think: "think",
  cheer: "celebrate",
  point: "point",
  happy: "idle",
};

export function StoryScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user, setUser, notify } = useApp();
  const [story, setStory] = useState<Story | null>(null);
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [burst, setBurst] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Story>(`/api/stories/${id}`).then(setStory).catch((reason: Error) => setError(reason.message));
  }, [id]);

  if (!user) return null;
  const mascot = (user.mascot || "parrot") as MascotId;
  const line = story?.lines[index];
  const gloss = line?.speaker === "npc" ? story?.lines[index + 1] : undefined;
  const pose = POSE[line?.emotion || "happy"] || "idle";

  async function finish() {
    try {
      const result = await api<{ user: User; next: { id: string; kind: string } | null }>(`/api/stories/${id}/complete`, {
        method: "POST",
      });
      setUser(result.user);
      if (result.next) navigate(result.next.kind === "story" ? `/story/${result.next.id}` : `/trial/${result.next.id}`);
      else navigate("/");
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Не сохранилось");
    }
  }

  function next() {
    if (!story || !line) return;
    setHeard("");
    const glossShown = line.speaker === "npc" && story.lines[index + 1]?.speaker === "mascot";
    const nextIndex = index + (glossShown ? 2 : 1);
    haptic("light");
    if (nextIndex >= story.lines.length) finish();
    else setIndex(nextIndex);
  }

  function repeat() {
    if (!line || !user) return;
    const lang = user.language === "zh" ? "zh-CN" : user.language === "en" ? "en-GB" : `${user.language}-${user.language === "es" ? "ES" : user.language.toUpperCase()}`;
    speakAloud(line.text, lang);
    if (!canListen()) return;
    setListening(true);
    listenOnce(
      lang,
      (text) => {
        setHeard(text);
        if (phraseHit(text, line.text)) {
          setBurst((value) => value + 1);
          chime("ok");
          haptic("success");
        }
      },
      () => setListening(false),
    );
  }

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p>{error}</p>
          <button className="mt-4 text-gold2" onClick={() => navigate("/")}>На остров</button>
        </div>
      </div>
    );
  }
  if (!story || !line) return <div className="grid min-h-dvh place-items-center text-cream/70">Сцена собирается…</div>;

  const foreign = line.speaker === "npc";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <CityScene language={user.language} />
      <LeadIn mascot={mascot} />
      <StarBurst token={burst} />
      <TopStats
        title={story.title}
        subtitle={`${user.city} · Уровень ${user.level}`}
        xp={user.xp}
        streak={user.streak}
        onBack={() => navigate("/")}
      />
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={next}
          className="glass mb-4 w-full p-4 text-left"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="h-16 w-16 shrink-0">
              {foreign ? (
                <Guide language={user.language} className="h-full w-full" />
              ) : (
                <Companion mascot={mascot} pose={listening ? "point" : pose} />
              )}
            </div>
            <div className="min-w-0 truncate text-xs uppercase tracking-[0.16em] text-gold2">
              {foreign ? line.name || "Город" : user.mascot_name || "Спутник"}
            </div>
          </div>
          <div className={`font-display text-[28px] leading-tight ${foreign ? "italic" : ""}`}>{line.text}</div>
          {foreign && gloss?.speaker === "mascot" && (
            <div className="mt-2 text-sm text-cream/75">{gloss.text}</div>
          )}
          <div className="mt-3 text-center text-[11px] text-cream/45">нажми, чтобы идти дальше</div>
        </motion.button>
        {foreign && (
          <div className="mb-4 flex flex-col items-center">
            <MicButton live={listening} onClick={repeat} />
            <div className="mt-2 text-xs text-cream/80">Повтори вслух</div>
            {heard && <div className="mt-1 text-xs text-gold2">{heard}</div>}
          </div>
        )}
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-gradient-to-r from-[#f6e6bf] to-[#c6a15a]" style={{ width: `${((index + 1) / story.lines.length) * 100}%` }} />
        </div>
        <div className="text-[11px] text-cream/70">{index + 1} / {story.lines.length}</div>
      </div>
    </div>
  );
}
