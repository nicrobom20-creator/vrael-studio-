import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Companion } from "../components/Companion";
import { Atmosphere, GoldButton } from "../components/World";
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

export function SettingsScreen() {
  const { user, config, setUser, notify } = useApp();
  const navigate = useNavigate();
  const [goal, setGoal] = useState(user?.daily_goal || 15);
  const [time, setTime] = useState(user?.reminder_time || "19:30");
  const [zone, setZone] = useState(user?.timezone || "Europe/Moscow");
  const [language, setLanguage] = useState(user?.language || "fr");
  const [mascot, setMascot] = useState<MascotId>((user?.mascot || "parrot") as MascotId);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const next = await api<User>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          daily_goal: goal,
          reminder_time: time,
          timezone: zone,
          language,
          mascot,
        }),
      });
      setUser(next);
      notify("Сохранено");
      navigate("/profile");
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Не сохранилось");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Atmosphere language={language} padNav={false}>
      <div className="min-h-dvh px-4 pb-10 pt-[max(18px,env(safe-area-inset-top))]">
        <button className="text-sm text-cream/75" onClick={() => navigate(-1)}>← профиль</button>
        <h1 className="mt-4 font-display text-5xl leading-none">Ритм и спутник</h1>
        <p className="mt-2 text-sm text-cream/70">Напоминание придёт в голосе спутника, если в этот день ещё не было испытания. Часовой пояс по умолчанию — Москва.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[15, 20, 30].map((minutes) => (
            <button key={minutes} onClick={() => setGoal(minutes)} className={`glass py-3 ${goal === minutes ? "border-gold text-gold2" : ""}`}>
              {minutes} мин
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs text-cream/60">
          Время
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="glass mt-1 w-full bg-transparent px-3 py-3 text-base text-cream" />
        </label>
        <label className="mt-3 block text-xs text-cream/60">
          Часовой пояс
          <select value={zone} onChange={(event) => setZone(event.target.value)} className="glass mt-1 w-full bg-black/40 px-3 py-3 text-cream">
            {ZONES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <h2 className="mt-6 font-display text-3xl">Язык</h2>
        <div className="mt-2 grid gap-2">
          {config?.languages.map((item) => (
            <button key={item.code} onClick={() => setLanguage(item.code)} className={`glass px-3 py-3 text-left ${language === item.code ? "border-gold" : ""}`}>
              {item.name} · {item.city}
            </button>
          ))}
        </div>
        <h2 className="mt-6 font-display text-3xl">Спутник</h2>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {config?.mascots.map((item) => (
            <button key={item.id} onClick={() => setMascot(item.id)} className={`rounded-2xl border p-1 ${mascot === item.id ? "border-gold" : "border-transparent"}`}>
              <Companion mascot={item.id} pose={mascot === item.id ? "wave" : "idle"} className="h-16 w-full" />
              <div className="text-[10px]">{item.name}</div>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <GoldButton onClick={save} disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</GoldButton>
        </div>
      </div>
    </Atmosphere>
  );
}
