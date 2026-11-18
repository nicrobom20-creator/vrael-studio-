import { Link } from "react-router-dom";
import { openLegal } from "./LegalScreen";
import { Companion } from "../components/Companion";
import { Atmosphere } from "../components/World";
import { useApp } from "../state";
import type { MascotId } from "../types";

export function ProfileScreen() {
  const { user } = useApp();
  if (!user) return null;
  const mascot = (user.mascot || "parrot") as MascotId;
  const ratio = user.level_goal ? Math.min(100, (user.level_xp / user.level_goal) * 100) : 0;
  return (
    <Atmosphere language={user.language}>
      <div className="px-4 pt-[max(18px,env(safe-area-inset-top))]">
        <div className="glass flex items-center gap-3 p-4">
          <div className="h-24 w-24">
            <Companion mascot={mascot} pose="celebrate" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl leading-none">{user.name}</div>
            <div className="mt-1 text-sm text-gold2">{user.mascot_name} · {user.language_name}</div>
            <div className="mt-2 text-xs text-cream/70">Уровень {user.level}</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-[#f6e6bf] to-[#b8893e]" style={{ width: `${ratio}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-cream/55">{user.level_xp} / {user.level_goal} XP</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Серия" value={`${user.streak}`} />
          <Stat label="Опыт" value={`${user.xp}`} />
          <Stat label="Минуты" value={`${user.usage.studied_minutes}`} />
        </div>
        <div className="mt-3 glass p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-2xl">{user.premium ? "Premium" : "Свободный путь"}</div>
              <div className="text-xs text-cream/65">
                {user.premium
                  ? "Испытания и разговоры без дневного лимита."
                  : `Сегодня ${user.usage.lessons}/${user.usage.lessons_limit ?? "∞"} испытаний · ${user.usage.chat}/${user.usage.chat_limit ?? "∞"} сообщений`}
              </div>
            </div>
            <Link to="/premium" className="gold-btn grid h-10 place-items-center px-4 text-sm">
              {user.premium ? "Продлить" : "Открыть"}
            </Link>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link className="glass p-3" to="/friends">Друзья и ссылка</Link>
          <Link className="glass p-3" to="/board">Рейтинг</Link>
          <Link className="glass p-3" to="/settings">Напоминания</Link>
          <Link className="glass p-3" to="/quests">Квесты дня</Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream/60">
          <button type="button" className="underline" onClick={() => openLegal("/privacy")}>Политика</button>
          <button type="button" className="underline" onClick={() => openLegal("/terms")}>Соглашение</button>
          <button type="button" className="underline" onClick={() => openLegal("/support")}>Поддержка</button>
        </div>
        <h2 className="mt-6 font-display text-3xl">Знаки пути</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 pb-4">
          {user.achievements.map((item) => (
            <article key={item.code} className={`glass p-3 ${item.unlocked ? "" : "opacity-45"}`}>
              <div className="text-gold2">{item.unlocked ? "✦" : "·"}</div>
              <div className="mt-1 font-medium">{item.title}</div>
              <div className="text-xs text-cream/65">{item.text}</div>
            </article>
          ))}
        </div>
      </div>
    </Atmosphere>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass py-3">
      <div className="font-sans text-2xl font-semibold text-gold2">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-cream/55">{label}</div>
    </div>
  );
}
