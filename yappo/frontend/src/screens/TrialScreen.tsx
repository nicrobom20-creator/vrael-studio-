import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, api, followCheckout, haptic } from "../api";
import { CityScene } from "../components/CityScene";
import { Companion } from "../components/Companion";
import { TopStats } from "../components/Shell";
import { SentenceGame } from "../components/SentenceGame";
import { SpeakGate } from "../components/SpeakGate";
import { GoldButton, StarBurst } from "../components/World";
import { ConsentLine, openLegal } from "./LegalScreen";
import { markUnlock } from "../lib/motion";
import { gentleLine, praiseLine } from "../lib/praise";
import { chime, phraseHit, speakAloud } from "../lib/speech";
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
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [hintText, setHintText] = useState("");
  const [hintStage, setHintStage] = useState(0);
  const [hintsLeft, setHintsLeft] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [praise, setPraise] = useState("");
  const [clock, setClock] = useState(0);
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
        setLesson(shuffleChoices(data));
        setBlocked("");
        setCombo(0);
        setHearts(5);
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
    setTyped("");
    setNote("");
    setHintText("");
    setHintStage(0);
    if (step?.type === "build") {
      setPool(shuffle([...(step.answer as string[]), ...(step.extra || [])]));
    }
    if (step?.type === "vocab" || step?.type === "listen" || step?.type === "dictate") {
      speakAloud(step.tts || step.word || step.phrase || "", lesson?.tts || "en-GB");
    }
    if (step?.type === "speed") {
      const total = step.seconds || 8;
      setClock(total);
      const timer = window.setInterval(() => {
        setClock((value) => {
          if (value <= 1) {
            window.clearInterval(timer);
            setChecked(true);
            setMistakes((count) => count + 1);
            setCombo(0);
            setPraise("Время вышло");
            return 0;
          }
          return value - 1;
        });
      }, 1000);
      return () => window.clearInterval(timer);
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
        body: JSON.stringify({ mistakes, combo }),
      });
      setUser(result.user);
      markUnlock(id, result.next?.id);
      if (result.unlocked_achievements?.length) notify(result.unlocked_achievements[0].title);
      setBurst((value) => value + 1);
      chime("win");
      haptic("success");
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

  function wrong(line = gentleLine()) {
    setMistakes((value) => value + 1);
    setCombo(0);
    setPraise(line);
    chime("bad");
    haptic("error");
    if (step && ["choice", "gap", "speed"].includes(step.type) && typeof step.answer === "number") {
      const back = step.options?.[step.answer];
      if (step.prompt && back) {
        void api("/api/words", { method: "POST", body: JSON.stringify({ front: step.prompt, back }) }).catch(() => undefined);
      }
    }
  }

  function right(line?: string) {
    setCombo((value) => {
      const next = value + 1;
      setPraise(line || praiseLine(next));
      return next;
    });
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

  function deferPhrase(front: string, back: string) {
    void api("/api/words", { method: "POST", body: JSON.stringify({ front, back }) }).catch(() => undefined);
    wrong("Фраза ушла в повтор. Это не засчитано как верный ответ.");
    window.setTimeout(advance, 700);
  }

  function checkTyped() {
    if (!step?.phrase) return;
    setChecked(true);
    if (phraseHit(typed, step.phrase)) right();
    else {
      setNote(step.translation || "Послушай ещё раз и напиши ближе к фразе.");
      wrong();
    }
  }

  function pickTalk(beatIndex: number) {
    const beat = step?.beats?.[beatIndex];
    if (!beat) return;
    setChecked(true);
    setNote(beat.note);
    if (beat.best) right();
    else wrong(beat.note);
  }

  async function askHint() {
    if (!lesson) return;
    try {
      const result = await api<{ text: string; remaining: number; slow?: boolean; phrase?: string }>("/api/hints", {
        method: "POST",
        body: JSON.stringify({ lesson_id: lesson.id, step_index: index, stage: Math.min(3, hintStage + 1) }),
      });
      setHintStage((value) => Math.min(3, value + 1));
      setHintText(result.text);
      setHintsLeft(result.remaining);
      if (result.slow && result.phrase) void speakAloud(result.phrase, lesson.tts, 0.62);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setHintText("Подсказки на сегодня закончились.");
        setHintsLeft(0);
        notify("В Premium — 10 подсказок в день.");
      } else notify(error instanceof Error ? error.message : "Подсказка не открылась");
    }
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

  const pose = done || (praise && combo > 0) ? "celebrate" : praise && combo === 0 ? "think" : step.type === "speak" ? "wave" : "idle";
  const hintsRemain = hintsLeft ?? Math.max(0, (user.usage.hints_limit ?? 5) - (user.usage.hints ?? 0));

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <CityScene language={user.language} />
      <StarBurst token={burst} />
      <TopStats
        title={done ? "Врата открыты" : lesson.title}
        subtitle={`${user.city || "Путь"} · Уровень ${user.level}`}
        xp={user.xp}
        streak={user.streak}
        onBack={() => navigate("/")}
      />
      {done && (
        <motion.div
          className="absolute inset-0 z-40 flex flex-col items-center justify-end bg-[#120e0b]/72 px-4 pb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="mb-3 h-48 w-48"
            initial={{ x: -160, y: 30 }}
            animate={{ x: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 70, damping: 14 }}
          >
            <Companion mascot={mascot} pose="celebrate" />
          </motion.div>
          <div className="glass w-full p-5 text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] text-gold2">Врата открыты</div>
            <div className="font-display text-5xl">+{done.xp} XP</div>
            <p className="mt-2 text-sm text-cream/75">Спутник уже смотрит дальше по тропе.</p>
            <div className="mt-4">
              <GoldButton
                onClick={() => {
                  haptic("light");
                  if (!done.next) navigate("/");
                  else navigate(done.next.kind === "story" ? `/story/${done.next.id}` : `/trial/${done.next.id}`);
                }}
              >
                {done.next ? "Дальше по тропе" : "На карту"}
              </GoldButton>
            </div>
          </div>
        </motion.div>
      )}
      <div className={done ? "hidden" : "absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-3 pb-[max(16px,env(safe-area-inset-bottom))]"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={done ? "done" : index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="play-card mb-3 w-full"
          >
            {lesson.boss && !done && (
              <div className="mb-2 text-center text-[11px] uppercase tracking-[0.16em] text-gold2">Финал города</div>
            )}
            {combo > 1 && !done && (
              <div className="combo-pop mb-2 text-center text-sm text-gold2">Серия {combo}</div>
            )}
            {praise && !done && <div className={combo > 0 ? "result-ok" : "result-bad"}>{praise}</div>}
            <div className="mb-3 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0">
                <Companion mascot={mascot} pose={pose} className="h-full w-full" />
              </div>
              <div className="text-xs leading-snug text-cream/70">
                {praise || (done ? "Врата позади. Тропа открыта." : "Спутник ждёт твою фразу.")}
              </div>
            </div>
            {done ? (
              <div className="text-center">
                <div className="font-display text-3xl">+{done.xp} XP</div>
                <p className="mt-1 text-sm text-cream/75">Спутник уже смотрит на следующие врата.</p>
              </div>
            ) : step.type === "speed" ? (
              <div>
                <div className="mb-2 text-center text-sm text-gold2">{clock} с</div>
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
              </div>
            ) : step.type === "dictate" ? (
              <div>
                <div className="font-display text-2xl leading-tight">{step.prompt}</div>
                <button type="button" className="mt-2 text-xs text-gold2" onClick={() => void speakAloud(step.phrase || "", lesson.tts)}>
                  ▶ ещё раз
                </button>
                <input
                  className="field mt-3"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  placeholder="Напиши, что слышишь"
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                {note && <p className="mt-2 text-sm text-cream/75">{note}</p>}
              </div>
            ) : step.type === "talk" ? (
              <div>
                <div className="font-display text-2xl leading-tight">{step.prompt}</div>
                <div className="mt-3 grid gap-2">
                  {step.beats?.map((beat, beatIndex) => (
                    <button
                      key={beat.text}
                      type="button"
                      disabled={checked}
                      onClick={() => pickTalk(beatIndex)}
                      className={`choice-btn px-3 py-3 text-left ${checked && beat.best ? "choice-good" : ""}`}
                    >
                      {beat.text}
                    </button>
                  ))}
                </div>
                {note && <p className="mt-3 text-sm text-cream/75">{note}</p>}
              </div>
            ) : step.type === "build" ? (
              <SentenceGame
                step={step}
                tts={lesson.tts}
                mascot={mascot}
                combo={combo}
                hearts={hearts}
                onPass={(line) => right(line)}
                onMiss={(line) => {
                  wrong(line);
                  setHearts((value) => {
                    const next = value - 1;
                    if (next <= 0) window.setTimeout(() => void finish(), 600);
                    return Math.max(0, next);
                  });
                }}
                onNext={advance}
              />
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
              {done.next ? "Дальше по тропе" : "На карту"}
            </GoldButton>
          </div>
        ) : step.type === "speak" ? (
          <SpeakGate
            phrase={step.phrase || ""}
            lang={lesson.tts}
            onPass={() => {
              right();
              window.setTimeout(advance, 450);
            }}
            onDefer={() => deferPhrase(step.phrase || "phrase", step.translation || "")}
          />
        ) : step.type === "build" ? null : (
          <div className="mb-3 w-full">
            {(step.type === "choice" || step.type === "gap" || step.type === "speed") && !checked && (
              <GoldButton disabled={picked == null} onClick={checkChoice}>Проверить</GoldButton>
            )}
            {(step.type === "choice" || step.type === "gap" || step.type === "speed") && checked && <GoldButton onClick={advance}>Дальше</GoldButton>}
            {step.type === "vocab" && <GoldButton onClick={advance}>Запомнил</GoldButton>}
            {step.type === "listen" && !checked && (
              <GoldButton disabled={picked == null} onClick={checkChoice}>Проверить</GoldButton>
            )}
            {step.type === "listen" && checked && <GoldButton onClick={advance}>Дальше</GoldButton>}
            {step.type === "dictate" && !checked && (
              <GoldButton disabled={!typed.trim()} onClick={checkTyped}>Проверить</GoldButton>
            )}
            {step.type === "dictate" && checked && <GoldButton onClick={advance}>Дальше</GoldButton>}
            {step.type === "talk" && checked && <GoldButton onClick={advance}>Дальше</GoldButton>}
            {!checked && (
              <button type="button" className="mt-2 w-full text-center text-xs text-gold2" onClick={() => void askHint()}>
                Подсказка · осталось {hintsRemain}
              </button>
            )}
            {hintText && <p className="mt-2 text-center text-sm text-cream/80">{hintText}</p>}
            {hintsRemain === 0 && <p className="mt-1 text-center text-[11px] text-cream/50">В Premium — 10 подсказок в день.</p>}
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
        <div className="break-words px-1 font-display text-4xl leading-tight">{step.word}</div>
        {step.reading && <div className="text-gold2">{step.reading}</div>}
        <div className="mt-1 text-cream/80">{step.translation}</div>
        {step.example && <div className="mt-2 text-sm italic text-cream/70">{step.example}</div>}
      </div>
    );
  }
  if (step.type === "choice" || step.type === "listen" || step.type === "gap" || step.type === "speed") {
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
                className={`choice-btn break-words px-3 py-3 text-left ${
                  good ? "choice-good" : bad ? "choice-bad" : chosen ? "choice-on" : ""
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
            {props.built.map((token, tokenIndex) => (
              <button key={`${token}-${tokenIndex}`} onClick={() => props.onDrop(token)} className="max-w-full break-words rounded-full bg-gold px-3 py-1 text-sm text-ink">
                {token}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {props.pool.map((token, tokenIndex) => (
            <button key={`${token}-${tokenIndex}`} onClick={() => props.onTake(token)} className="max-w-full break-words rounded-full border border-white/15 px-3 py-1 text-sm">
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
      <div className="mt-1 break-words px-1 font-display text-4xl leading-tight">{step.phrase}</div>
      <div className="text-cream/75">{step.translation}</div>
      {step.hint && <div className="mt-2 text-sm text-cream/60">{step.hint}</div>}
      {props.heard && <div className="mt-2 text-sm text-gold2">Слышу: {props.heard}</div>}
    </div>
  );
}

function LimitNote({ text, onBack, onPremium }: { text: string; onBack: () => void; onPremium?: () => void }) {
  const { user, config, notify } = useApp();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(() => formatReset(user?.timezone || "Europe/Moscow"));
  const month = price(config?.prices.month, "199");
  const year = price(config?.prices.year, "1999");
  const save = yearSaving(month, year);

  useEffect(() => {
    const tick = () => setLeft(formatReset(user?.timezone || "Europe/Moscow"));
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, [user?.timezone]);

  async function pay() {
    setBusy(true);
    try {
      const message = await followCheckout(plan, navigate);
      if (message) notify(message);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Платёж не создан");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-end px-4 pb-8">
      <CityScene language={user?.language || "world"} />
      <div className="relative z-10 w-full max-w-sm">
        <div className="pointer-events-none absolute -top-28 left-1 h-36 w-32 -rotate-6">
          <Companion mascot={(user?.mascot || "parrot") as MascotId} pose="idle" className="h-full w-full" />
        </div>
        <div className="glass p-5 text-center">
          <h1 className="font-display text-3xl leading-tight">Врата закрыты до завтра</h1>
          <p className="mt-2 text-sm text-cream/75">{text}</p>
          <p className="mt-2 text-xs text-gold2">сброс лимита через {left}</p>
          <div className="mt-4 grid gap-2 text-left">
            <PayPlan
              active={plan === "month"}
              title="Месяц"
              price={`${month} ₽/мес`}
              onClick={() => setPlan("month")}
            />
            <PayPlan
              active={plan === "year"}
              title="Год"
              price={`${year} ₽/год`}
              badge={save > 0 ? `выгода ${save}%` : undefined}
              onClick={() => setPlan("year")}
            />
          </div>
          <div className="mt-4 grid gap-2">
            <GoldButton onClick={onPremium ? pay : onBack} disabled={busy}>
              {busy ? "Создаём счёт…" : "Оплатить"}
            </GoldButton>
            <ConsentLine />
            <button type="button" className="text-[11px] text-cream/55 underline" onClick={() => openLegal("/pricing")}>Тарифы</button>
            <button onClick={onBack} className="text-sm text-gold2">Вернуться на карту</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PayPlan({ active, title, price, badge, onClick }: { active: boolean; title: string; price: string; badge?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative rounded-2xl border px-3 py-3 ${active ? "border-gold bg-gold/10" : "border-white/10"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-xl">{title}</span>
        <span className="text-sm text-gold2">{price}</span>
      </div>
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-gradient-to-b from-[#f6e6bf] to-[#b8893e] px-2 py-0.5 text-[10px] font-semibold text-[#2a1c0a]">
          {badge}
        </span>
      )}
    </button>
  );
}

function price(value: string | undefined, fallback: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(Math.round(number)) : fallback;
}

function yearSaving(month: string, year: string) {
  const full = Number(month) * 12;
  const yearly = Number(year);
  if (!full || !yearly) return 0;
  return Math.max(0, Math.round((1 - yearly / full) * 100));
}

function formatReset(timeZone: string) {
  const now = new Date();
  let hour = 0;
  let minute = 0;
  let second = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
    hour = read("hour") % 24;
    minute = read("minute");
    second = read("second");
  } catch {
    hour = now.getHours();
    minute = now.getMinutes();
    second = now.getSeconds();
  }
  const left = 24 * 3600 - (hour * 3600 + minute * 60 + second);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function shuffleChoices(lesson: Lesson): Lesson {
  return {
    ...lesson,
    steps: lesson.steps.map((step) => {
      if (!["choice", "listen", "gap", "speed"].includes(step.type) || !step.options || typeof step.answer !== "number") {
        return step;
      }
      const options = [...step.options];
      const correct = options[step.answer] ?? options[0];
      const mixed = shuffle(options);
      return { ...step, options: mixed, answer: mixed.indexOf(correct) };
    }),
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}
