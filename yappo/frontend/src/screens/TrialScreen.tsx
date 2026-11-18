import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, api, haptic } from "../api";
import { Companion } from "../components/Companion";
import { TopStats } from "../components/Shell";
import { GoldButton, MicButton, StarBurst, WorldBackdrop } from "../components/World";
import { canListen, chime, listenOnce, phraseHit, speakAloud } from "../lib/speech";
import { useApp } from "../state";
import type { Lesson, MascotId, Step, User } from "../types";

export function TrialScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user, setUser, notify } = useApp();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocked, setBlocked] = useState("");
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [matched, setMatched] = useState<number[]>([]);
  const [leftPick, setLeftPick] = useState<number | null>(null);
  const [built, setBuilt] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState<{ xp: number; next?: { id: string; kind: string; title: string } | null } | null>(null);

  useEffect(() => {
    setLesson(null);
    setIndex(0);
    setMistakes(0);
    setDone(null);
    if (user?.usage.lessons_limit != null && user.usage.lessons >= user.usage.lessons_limit) {
      setBlocked("limit");
      return;
    }
    api<Lesson>(`/api/lessons/${id}`)
      .then((data) => {
        setLesson(data);
        setBlocked("");
      })
      .catch((error: ApiError) => setBlocked(error.message));
  }, [id]);

  const step = lesson?.steps[index];
  const rightOrder = useMemo(() => (step?.type === "match" ? shuffle(step.pairs?.map((_, i) => i) || []) : []), [step]);

  useEffect(() => {
    setPicked(null);
    setChecked(false);
    setMatched([]);
    setLeftPick(null);
    setBuilt([]);
    setHeard("");
    if (step?.type === "build") {
      setPool(shuffle([...(step.answer as string[]), ...(step.extra || [])]));
    }
    if (step?.type === "vocab" || step?.type === "listen") {
      speakAloud(step.tts || step.word || "", lesson?.tts || "en-GB");
    }
  }, [index, lesson?.id]);

  if (!user) return null;
  const mascot = (user.mascot || "parrot") as MascotId;

  async function finish() {
    try {
      const result = await api<{
        xp_gained: number;
        user: User;
        next: { id: string; kind: string; title: string } | null;
        unlocked_achievements: { title: string }[];
      }>(`/api/lessons/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ mistakes }),
      });
      setUser(result.user);
      if (result.unlocked_achievements?.length) notify(result.unlocked_achievements[0].title);
      setBurst((value) => value + 1);
      chime("win");
      setDone({ xp: result.xp_gained, next: result.next });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) setBlocked("limit");
      else notify(error instanceof Error ? error.message : "Не сохранилось");
    }
  }

  function advance() {
    if (!lesson) return;
    if (index + 1 >= lesson.steps.length) finish();
    else setIndex((value) => value + 1);
  }

  function wrong() {
    setMistakes((value) => value + 1);
    chime("bad");
    haptic("error");
  }

  function right() {
    setBurst((value) => value + 1);
    chime("ok");
    haptic("success");
  }

  function checkChoice() {
    if (!step || picked == null) return;
    setChecked(true);
    if (picked === step.answer) right();
    else wrong();
  }

  function onMatchRight(rightIndex: number) {
    if (leftPick == null || !step?.pairs) return;
    if (leftPick === rightIndex) {
      setMatched((value) => [...value, leftPick]);
      right();
      if (matched.length + 1 >= step.pairs.length) window.setTimeout(advance, 450);
    } else wrong();
    setLeftPick(null);
  }

  function checkBuild() {
    if (!step) return;
    const answer = (step.answer as string[]) || [];
    if (built.join("|") === answer.join("|")) {
      right();
      window.setTimeout(advance, 400);
    } else {
      wrong();
      setBuilt([]);
      setPool(shuffle([...answer, ...(step.extra || [])]));
    }
  }

  function onVoice(target: string) {
    if (!canListen()) {
      setHeard("");
      right();
      window.setTimeout(advance, 350);
      return;
    }
    setListening(true);
    listenOnce(lesson?.tts || "en-GB", (text) => {
      setHeard(text);
      if (phraseHit(text, target)) {
        right();
        window.setTimeout(advance, 500);
      } else wrong();
    }, () => setListening(false));
  }

  if (blocked === "limit") {
    return (
      <LimitNote
        text="На сегодня бесплатные испытания закончились. Premium открывает путь без лимита."
        onPremium={() => navigate("/premium")}
        onBack={() => navigate("/")}
      />
    );
  }
  if (blocked) {
    return <LimitNote text={blocked} onBack={() => navigate("/")} />;
  }
  if (!lesson || !step) {
    return <div className="grid min-h-dvh place-items-center text-cream/70">Открываем врата…</div>;
  }

  const pose = done ? "celebrate" : listening ? "point" : step.type === "speak" ? "wave" : "idle";

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <WorldBackdrop src="/art/trial-gate.jpg" scene />
      <StarBurst token={burst} />
      <TopStats
        title={done ? "Врата открыты" : lesson.title}
        subtitle={`${user.city || "Путь"} · Уровень ${user.level}`}
        xp={user.xp}
        streak={user.streak}
        onBack={() => navigate("/")}
      />
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait">
          <motion.div
            key={done ? "done" : index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass mb-3 w-full p-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0">
                <Companion mascot={mascot} pose={pose} className="h-full w-full" />
              </div>
              <div className="text-xs leading-snug text-cream/70">
                {done ? "Врата позади. Тропа открыта." : "Спутник ждёт твою фразу."}
              </div>
            </div>
            {done ? (
              <div className="text-center">
                <div className="font-display text-3xl">+{done.xp} XP</div>
                <p className="mt-1 text-sm text-cream/75">Спутник уже смотрит на следующие врата.</p>
              </div>
            ) : (
              <StepBody
                step={step}
                picked={picked}
                checked={checked}
                onPick={setPicked}
                matched={matched}
                leftPick={leftPick}
                onLeft={setLeftPick}
                rightOrder={rightOrder}
                onRight={onMatchRight}
                built={built}
                pool={pool}
                onTake={(token) => {
                  setPool((items) => items.filter((item) => item !== token));
                  setBuilt((items) => [...items, token]);
                }}
                onDrop={(token) => {
                  setBuilt((items) => items.filter((item) => item !== token));
                  setPool((items) => [...items, token]);
                }}
                heard={heard}
                onPlay={() => speakAloud(step.tts || step.word || step.phrase || "", lesson.tts)}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {done ? (
          <div className="mb-3 w-full">
            <GoldButton
              onClick={() => {
                if (!done.next) navigate("/");
                else navigate(done.next.kind === "story" ? `/story/${done.next.id}` : `/trial/${done.next.id}`);
              }}
            >
              {done.next ? "Дальше по тропе" : "На остров"}
            </GoldButton>
          </div>
        ) : step.type === "speak" ? (
          <div className="mb-2 flex flex-col items-center">
            <MicButton live={listening} onClick={() => onVoice(step.phrase || "")} />
            <div className="mt-2 text-xs text-cream/80">Скажи вслух</div>
            {heard && !phraseHit(heard, step.phrase || "") && (
              <button className="mt-2 text-xs text-gold2 underline" onClick={advance}>
                Засчитать повтор
              </button>
            )}
          </div>
        ) : (
          <div className="mb-3 w-full">
            {step.type === "choice" && !checked && (
              <GoldButton disabled={picked == null} onClick={checkChoice}>Проверить</GoldButton>
            )}
            {step.type === "choice" && checked && <GoldButton onClick={advance}>Дальше</GoldButton>}
            {step.type === "vocab" && <GoldButton onClick={advance}>Запомнил</GoldButton>}
            {step.type === "build" && <GoldButton onClick={checkBuild}>Проверить фразу</GoldButton>}
            {step.type === "listen" && !checked && (
              <GoldButton disabled={picked == null} onClick={checkChoice}>Проверить</GoldButton>
            )}
            {step.type === "listen" && checked && <GoldButton onClick={advance}>Дальше</GoldButton>}
          </div>
        )}
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full bg-gradient-to-r from-[#f6e6bf] to-[#c6a15a]"
            style={{ width: `${((done ? lesson.steps.length : index) / lesson.steps.length) * 100}%` }}
          />
        </div>
        <div className="mb-1 text-[11px] text-cream/70">
          {done ? lesson.steps.length : index + 1} / {lesson.steps.length}
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <div className="glass rounded-full px-3 py-2 text-center text-[11px]">
            Сегодня {user.usage.studied_minutes}/{user.daily_goal} мин
          </div>
          <div className="glass rounded-full px-3 py-2 text-center text-[11px]">Серия {user.streak} дн.</div>
        </div>
      </div>
    </div>
  );
}

function StepBody(props: {
  step: Step;
  picked: number | null;
  checked: boolean;
  onPick: (index: number) => void;
  matched: number[];
  leftPick: number | null;
  onLeft: (index: number) => void;
  rightOrder: number[];
  onRight: (index: number) => void;
  built: string[];
  pool: string[];
  onTake: (token: string) => void;
  onDrop: (token: string) => void;
  heard: string;
  onPlay: () => void;
}) {
  const { step } = props;
  if (step.type === "vocab") {
    return (
      <div className="text-center">
        <button onClick={props.onPlay} className="text-xs text-gold2">▶ послушать</button>
        <div className="font-display text-4xl">{step.word}</div>
        {step.reading && <div className="text-gold2">{step.reading}</div>}
        <div className="mt-1 text-cream/80">{step.translation}</div>
        {step.example && <div className="mt-2 text-sm italic text-cream/70">{step.example}</div>}
      </div>
    );
  }
  if (step.type === "choice" || step.type === "listen") {
    return (
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-2xl leading-tight">{step.prompt}</div>
            <div className="text-xs text-cream/60">{step.sub || (step.type === "listen" ? "Сначала послушай" : "")}</div>
          </div>
          {step.type === "listen" && (
            <button onClick={props.onPlay} className="glass rounded-full px-3 py-2 text-xs text-gold2">▶</button>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          {step.options?.map((option, optionIndex) => {
            const chosen = props.picked === optionIndex;
            const good = props.checked && optionIndex === step.answer;
            const bad = props.checked && chosen && optionIndex !== step.answer;
            return (
              <button
                key={option}
                disabled={props.checked}
                onClick={() => props.onPick(optionIndex)}
                className={`rounded-2xl border px-3 py-3 text-left ${
                  good ? "border-gold bg-gold/20" : bad ? "border-rose-300/70 bg-rose-900/30" : chosen ? "border-gold" : "border-white/10"
                }`}
              >
                <span className="mr-2 text-gold2">{String.fromCharCode(65 + optionIndex)}</span>
                {option}
              </button>
            );
          })}
        </div>
        {props.checked && step.explain && <p className="mt-3 text-sm text-cream/75">{step.explain}</p>}
      </div>
    );
  }
  if (step.type === "match" && step.pairs) {
    return (
      <div>
        <div className="font-display text-2xl">{step.prompt}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            {step.pairs.map((pair, pairIndex) => (
              <button
                key={pair.left}
                disabled={props.matched.includes(pairIndex)}
                onClick={() => props.onLeft(pairIndex)}
                className={`rounded-2xl border px-2 py-3 text-sm ${
                  props.matched.includes(pairIndex) ? "border-gold/40 opacity-40" : props.leftPick === pairIndex ? "border-gold" : "border-white/10"
                }`}
              >
                {pair.left}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            {props.rightOrder.map((pairIndex) => (
              <button
                key={step.pairs?.[pairIndex].right}
                disabled={props.matched.includes(pairIndex)}
                onClick={() => props.onRight(pairIndex)}
                className={`rounded-2xl border px-2 py-3 text-sm ${props.matched.includes(pairIndex) ? "border-gold/40 opacity-40" : "border-white/10"}`}
              >
                {step.pairs?.[pairIndex].right}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (step.type === "build") {
    return (
      <div>
        <div className="font-display text-2xl">{step.prompt}</div>
        <div className="text-sm text-cream/70">{step.ru}</div>
        <div className="mt-3 min-h-14 rounded-2xl border border-dashed border-gold/40 p-2">
          <div className="flex flex-wrap gap-2">
            {props.built.map((token) => (
              <button key={token} onClick={() => props.onDrop(token)} className="rounded-full bg-gold px-3 py-1 text-sm text-ink">
                {token}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {props.pool.map((token) => (
            <button key={token} onClick={() => props.onTake(token)} className="rounded-full border border-white/15 px-3 py-1 text-sm">
              {token}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-[0.16em] text-gold2">Скажи вслух</div>
      <div className="mt-1 font-display text-4xl">{step.phrase}</div>
      <div className="text-cream/75">{step.translation}</div>
      {step.hint && <div className="mt-2 text-sm text-cream/60">{step.hint}</div>}
      {props.heard && <div className="mt-2 text-sm text-gold2">Слышу: {props.heard}</div>}
    </div>
  );
}

function LimitNote({ text, onBack, onPremium }: { text: string; onBack: () => void; onPremium?: () => void }) {
  return (
    <div className="relative grid min-h-dvh place-items-center px-6">
      <WorldBackdrop src="/art/key-art.jpg" />
      <div className="glass relative z-10 max-w-sm p-5 text-center">
        <h1 className="font-display text-3xl">Врата закрыты до завтра</h1>
        <p className="mt-2 text-sm text-cream/75">{text}</p>
        <div className="mt-4 grid gap-2">
          {onPremium && <GoldButton onClick={onPremium}>Открыть Premium</GoldButton>}
          <button onClick={onBack} className="text-sm text-gold2">Вернуться на остров</button>
        </div>
      </div>
    </div>
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}
