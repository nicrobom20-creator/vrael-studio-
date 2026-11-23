import { motion } from "framer-motion";
import { useState } from "react";
import { ApiError, api, deviceId, readStartParam } from "../api";
import { Companion } from "../components/Companion";
import { CityScene } from "../components/CityScene";
import { GoldButton } from "../components/World";
import { LEVEL_COPY } from "../lib/plans";
import { useApp } from "../state";
import type { MascotId, User } from "../types";

const LEVELS = [
  ["start", "Только начинаю"],
  ["words", "Знаю пару слов"],
  ["base", "Знаю базу"],
  ["talk", "Могу поддержать разговор"],
  ["confident", "Уверенный уровень"],
] as const;

const GOALS = [
  ["people", "Общение с людьми"],
  ["fun", "Просто так"],
  ["growth", "Для саморазвития"],
  ["travel", "Подготовка к путешествию"],
  ["family", "Учёба с родными"],
  ["career", "Карьерный рост"],
  ["other", "Другое"],
] as const;

const MINUTES = [5, 10, 15, 20, 30, 45, 60];

type Phase = "langs" | "level" | "goal" | "time" | "ask" | "quiz" | "results" | "account" | "trial";

interface Question {
  id: string;
  prompt: string;
  options: string[];
}

export function Onboarding() {
  const { config, user, setUser, notify } = useApp();
  const [phase, setPhase] = useState<Phase>("langs");
  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [level, setLevel] = useState("start");
  const [goal, setGoal] = useState("people");
  const [minutes, setMinutes] = useState(15);
  const [mascot, setMascot] = useState<MascotId>("parrot");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizAt, setQuizAt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [planLevel, setPlanLevel] = useState("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loginMode, setLoginMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const mascotNow = (user?.mascot || mascot) as MascotId;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow";

  function toggleLanguage(code: string, available: boolean) {
    if (!available && !languages.includes(code) && languages.length >= 3) return;
    setLanguages((current) => {
      if (current.includes(code)) {
        if (code === "en") return current;
        return current.filter((item) => item !== code);
      }
      if (current.length >= 3) return current;
      return [...current, code];
    });
  }

  async function startQuiz() {
    setBusy(true);
    try {
      const data = await api<{ questions: Question[] }>("/api/placement");
      setQuestions(data.questions);
      setQuizAt(0);
      setPhase("quiz");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Тест не открылся");
    } finally {
      setBusy(false);
    }
  }

  async function answerQuiz(option: string) {
    const question = questions[quizAt];
    if (!question) return;
    const next = { ...answers, [question.id]: option };
    setAnswers(next);
    if (quizAt + 1 < questions.length) {
      setQuizAt((value) => value + 1);
      return;
    }
    setBusy(true);
    try {
      if (localStorage.getItem("yappo_token")) {
        const graded = await api<{ level: string }>("/api/placement", {
          method: "POST",
          body: JSON.stringify({ answers: next }),
        });
        setPlanLevel(graded.level);
      } else {
        setPlanLevel(level);
      }
      setPhase("results");
    } catch {
      setPlanLevel(level);
      setPhase("results");
    } finally {
      setBusy(false);
    }
  }

  async function ensureAccount() {
    if (user) {
      if (!user.email && email && password) {
        const linked = await api<User>("/api/auth/link", {
          method: "POST",
          body: JSON.stringify({ email, password, name }),
        });
        setUser(linked);
      }
      setPhase("trial");
      return;
    }
    const path = loginMode ? "/api/auth/login" : "/api/auth/register";
    const auth = await api<{ token: string; user: User }>(path, {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    localStorage.setItem("yappo_token", auth.token);
    setUser(auth.user);
    if (Object.keys(answers).length) {
      try {
        const graded = await api<{ level: string }>("/api/placement", {
          method: "POST",
          body: JSON.stringify({ answers }),
        });
        setPlanLevel(graded.level);
      } catch {
        /* the self-assessed level still stands */
      }
    }
    setPhase("trial");
  }

  async function demo() {
    const auth = await api<{ token: string; user: User }>("/api/auth/demo", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId(), start_param: readStartParam() }),
    });
    localStorage.setItem("yappo_token", auth.token);
    setUser(auth.user);
    setPhase("trial");
  }

  async function finish(trial: boolean) {
    setBusy(true);
    try {
      if (trial) {
        try {
          await api("/api/trial", { method: "POST" });
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 409) throw error;
        }
      }
      const saved = await api<User>("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          language: "en",
          mascot,
          daily_goal: minutes,
          reminder_time: "19:00",
          timezone: zone,
          english_level: level,
          study_goal: goal,
          languages,
          placement_level: planLevel,
        }),
      });
      setUser(saved);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  const prompt = {
    langs: "Какие языки хочешь учить? Можно до трёх. Сейчас открыт английский.",
    level: "Насколько хорошо вы знаете английский?",
    goal: "Зачем тебе английский?",
    time: "Сколько минут в день отдадим языку?",
    ask: "Короткий тест покажет, с чего начать. Можно пропустить.",
    quiz: questions[quizAt]?.prompt || "",
    results: "Вот твой план. Я пойду рядом.",
    account: user ? "Аккаунт уже есть. Почту можно добавить сейчас или позже." : "Сохрани прогресс: почта и пароль.",
    trial: "Три дня Premium без карты. Потом сам вернёшься на бесплатный тариф, списаний не будет.",
  }[phase];
  const plan = LEVEL_COPY[planLevel] || LEVEL_COPY.start;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <CityScene language="en" />
      <div className="relative z-10 flex min-h-dvh flex-col px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-end gap-3">
          <div className="h-28 w-24 shrink-0">
            <Companion mascot={mascotNow} pose={phase === "results" ? "celebrate" : "wave"} />
          </div>
          <motion.div key={phase + quizAt} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass flex-1 p-3 text-sm leading-relaxed">
            {prompt}
          </motion.div>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto">
          {phase === "langs" && (
            <div className="grid gap-2">
              {(config?.languages || [{ code: "en", name: "Английский", native: "English", city: "Лондон", country: "", tts: "en-GB", available: true }]).map((item) => {
                const available = item.available !== false && item.code === "en" ? true : Boolean(item.available);
                const on = languages.includes(item.code);
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => toggleLanguage(item.code, available)}
                    className={`choice-btn flex items-center justify-between px-3 py-3 text-left ${on ? "choice-on" : ""}`}
                  >
                    <span>
                      <span className="block font-medium">{item.name}</span>
                      <span className="text-xs text-cream/60">{item.city}</span>
                    </span>
                    <span className="text-xs text-gold2">{available ? (on ? "выбран" : "") : "скоро"}</span>
                  </button>
                );
              })}
            </div>
          )}
          {phase === "level" && (
            <div className="grid gap-2">
              {LEVELS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setLevel(id)} className={`choice-btn px-3 py-3 text-left ${level === id ? "choice-on" : ""}`}>{label}</button>
              ))}
            </div>
          )}
          {phase === "goal" && (
            <div className="grid gap-2">
              {GOALS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setGoal(id)} className={`choice-btn px-3 py-3 text-left ${goal === id ? "choice-on" : ""}`}>{label}</button>
              ))}
            </div>
          )}
          {phase === "time" && (
            <div className="grid grid-cols-2 gap-2">
              {MINUTES.map((value) => (
                <button key={value} type="button" onClick={() => setMinutes(value)} className={`choice-btn px-3 py-3 ${minutes === value ? "choice-on" : ""}`}>
                  {value === 60 ? "1 час и более" : `${value} мин`}
                </button>
              ))}
            </div>
          )}
          {phase === "quiz" && questions[quizAt] && (
            <div className="grid gap-2">
              {questions[quizAt].options.map((option) => (
                <button key={option} type="button" className="choice-btn px-3 py-3 text-left" onClick={() => void answerQuiz(option)}>{option}</button>
              ))}
            </div>
          )}
          {phase === "results" && (
            <div className="glass p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-gold2">{plan.title}</div>
              <p className="mt-2 text-sm leading-relaxed">{plan.can}</p>
              <p className="mt-2 text-sm text-cream/70">Ориентир: {plan.when}. В день — {minutes === 60 ? "час и больше" : `${minutes} минут`}.</p>
              <div className="mt-4 grid grid-cols-5 gap-1">
                {config?.mascots.map((item) => (
                  <button key={item.id} type="button" onClick={() => setMascot(item.id)} className={`rounded-2xl border p-1 ${mascot === item.id ? "border-gold" : "border-white/10"}`}>
                    <Companion mascot={item.id} pose="idle" className="h-16 w-full" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === "account" && (
            <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); void ensureAccount().catch((error: Error) => notify(error.message)); }}>
              {user && <p className="text-sm text-cream/70">Номер аккаунта {user.public_id || "появится после сохранения"}</p>}
              <input className="field" type="email" autoComplete="email" placeholder="Почта" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input className="field" type="password" autoComplete={loginMode ? "current-password" : "new-password"} placeholder="Пароль" value={password} onChange={(event) => setPassword(event.target.value)} />
              {!loginMode && !user && (
                <input className="field" placeholder="Как к тебе обращаться" value={name} onChange={(event) => setName(event.target.value)} />
              )}
              <GoldButton type="submit" disabled={busy || (!user && (!email || password.length < 8))}>{loginMode ? "Войти" : user ? "Дальше" : "Создать аккаунт"}</GoldButton>
              {!user && (
                <button type="button" className="text-sm text-gold2" onClick={() => setLoginMode((value) => !value)}>
                  {loginMode ? "Нет аккаунта — зарегистрироваться" : "Уже есть аккаунт — войти"}
                </button>
              )}
              {!user && config?.demo && (
                <button type="button" className="text-sm text-cream/60" onClick={() => void demo().catch((error: Error) => notify(error.message))}>Демо без почты</button>
              )}
            </form>
          )}
          {phase === "trial" && (
            <div className="glass p-4 text-sm leading-relaxed">
              <p>Безлимитные уроки и собеседник на 3 дня. Карта не нужна, продления нет.</p>
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-2">
          {phase === "langs" && <GoldButton onClick={() => setPhase("level")}>Дальше</GoldButton>}
          {phase === "level" && <GoldButton onClick={() => setPhase("goal")}>Дальше</GoldButton>}
          {phase === "goal" && <GoldButton onClick={() => setPhase("time")}>Дальше</GoldButton>}
          {phase === "time" && <GoldButton onClick={() => setPhase("ask")}>Дальше</GoldButton>}
          {phase === "ask" && (
            <>
              <GoldButton disabled={busy} onClick={() => void startQuiz()}>Пройти тест</GoldButton>
              <button type="button" className="text-sm text-gold2" onClick={() => { setPlanLevel(level); setPhase("results"); }}>Пропустить</button>
            </>
          )}
          {phase === "results" && <GoldButton onClick={() => setPhase("account")}>К аккаунту</GoldButton>}
          {phase === "account" && user && <button type="button" className="text-sm text-cream/70" onClick={() => setPhase("trial")}>Продолжить без почты</button>}
          {phase === "trial" && (
            <>
              <GoldButton disabled={busy} onClick={() => void finish(true)}>Открыть 3 дня</GoldButton>
              <button type="button" className="text-sm text-gold2" disabled={busy} onClick={() => void finish(false)}>Позже</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
