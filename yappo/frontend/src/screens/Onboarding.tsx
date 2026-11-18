import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "../api";
import { Companion } from "../components/Companion";
import { CityScene } from "../components/CityScene";
import { GoldButton } from "../components/World";
import { useApp } from "../state";
import type { MascotId, User } from "../types";

const ZONES = [
  "Europe/Kaliningrad",
  "Europe/Moscow",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Novosibirsk",
  "Asia/Irkutsk",
  "Asia/Yakutsk",
  "Asia/Vladivostok",
  "Asia/Kamchatka",
];

export function Onboarding() {
  const { config, setUser, notify } = useApp();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState("fr");
  const [mascot, setMascot] = useState<MascotId>("parrot");
  const [goal, setGoal] = useState(15);
  const [time, setTime] = useState("19:30");
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow";
  const [zone, setZone] = useState(ZONES.includes(detected) ? detected : "Europe/Moscow");
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      const user = await api<User>("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          language,
          mascot,
          daily_goal: goal,
          reminder_time: time,
          timezone: zone,
        }),
      });
      setUser(user);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <CityScene language={step === 0 ? "world" : language} />
      <div className="relative z-10 flex min-h-dvh flex-col px-4 pb-6 pt-[max(18px,env(safe-area-inset-top))]">
        <div className="glass inline-flex w-fit items-baseline gap-3 rounded-full px-4 py-2">
          <span className="font-display text-3xl leading-none">Yappo</span>
          <span className="text-xs italic text-gold2">Говори. Знакомься. Будь своим.</span>
        </div>
        <div className="flex-1" />
        <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass p-4">
          {step === 0 && (
            <div>
              <h1 className="font-display text-3xl">Пять городов. Один спутник.</h1>
              <p className="mt-2 text-sm leading-relaxed text-cream/80">
                Лондон, Мадрид, Берлин, Париж и Пекин. Выбери язык — и спутник проведёт тебя через врата испытаний.
              </p>
              <div className="mt-4">
                <GoldButton onClick={() => setStep(1)}>Войти в мир</GoldButton>
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl">Куда летим?</h2>
              <div className="mt-3 grid gap-2">
                {config?.languages.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => setLanguage(item.code)}
                    className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left ${
                      language === item.code ? "border-gold bg-black/50" : "border-white/10 bg-black/35"
                    }`}
                  >
                    <span>
                      <span className="block font-medium">{item.name}</span>
                      <span className="text-xs text-cream/60">{item.city} · {item.native}</span>
                    </span>
                    <span className="text-gold2">{language === item.code ? "✦" : ""}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <GoldButton onClick={() => setStep(2)}>Дальше</GoldButton>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl">Кто поведёт?</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {config?.mascots.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setMascot(item.id)}
                    className={`rounded-2xl border p-2 text-left ${mascot === item.id ? "border-gold bg-black/50" : "border-white/10 bg-black/35"}`}
                  >
                    <div className="mx-auto h-32 w-full">
                      <Companion mascot={item.id} pose={mascot === item.id ? "wave" : "idle"} className="h-full w-full" />
                    </div>
                    <div className="mt-1 text-sm font-semibold">{item.name}</div>
                    <div className="text-[11px] text-gold2">{item.trait}</div>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-cream/70">{config?.mascots.find((item) => item.id === mascot)?.blurb}</p>
              <div className="mt-4">
                <GoldButton onClick={() => setStep(3)}>Этот со мной</GoldButton>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="font-display text-2xl">Ритм дня</h2>
              <p className="mt-1 text-sm text-cream/70">Если за день не было испытания, спутник напомнит.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[15, 20, 30].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => setGoal(minutes)}
                    className={`rounded-2xl border py-3 ${goal === minutes ? "border-gold bg-white/10" : "border-white/10"}`}
                  >
                    {minutes} мин
                  </button>
                ))}
              </div>
              <label className="mt-3 block text-xs text-cream/60">
                Время напоминания
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-cream"
                />
              </label>
              <label className="mt-3 block text-xs text-cream/60">
                Часовой пояс
                <select
                  value={zone}
                  onChange={(event) => setZone(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-cream"
                >
                  {ZONES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <div className="mt-4">
                <GoldButton onClick={finish} disabled={busy}>{busy ? "Открываем врата…" : "Начать путь"}</GoldButton>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
