import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { isMuted, setMuted, startAmbient } from "../lib/sound";

const ITEMS = [
  { to: "/", label: "Мир", icon: WorldIcon },
  { to: "/quests", label: "Испытания", icon: GateIcon },
  { to: "/chat", label: "Разговор", icon: ChatIcon },
  { to: "/profile", label: "Профиль", icon: UserIcon },
];

export function MuteButton() {
  const [muted, setState] = useState(isMuted);
  useEffect(() => {
    const sync = () => setState(isMuted());
    window.addEventListener("yappo-sound", sync);
    return () => window.removeEventListener("yappo-sound", sync);
  }, []);
  return (
    <button
      type="button"
      className="tactile glass grid h-8 w-8 place-items-center rounded-full text-xs"
      aria-label={muted ? "Включить звук" : "Выключить звук"}
      onClick={() => {
        const next = !muted;
        setMuted(next);
        if (!next) startAmbient();
      }}
    >
      {muted ? "✕" : "♪"}
    </button>
  );
}

export function GoalRing({ value, goal }: { value: number; goal: number }) {
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  const radius = 14;
  const length = 2 * Math.PI * radius;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-label={`Цель дня ${value} из ${goal} минут`}>
      <circle cx="18" cy="18" r={radius} stroke="rgba(255,255,255,0.16)" strokeWidth="3" fill="none" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        stroke="#e7c98a"
        strokeWidth="3"
        fill="none"
        strokeDasharray={`${length * ratio} ${length}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="glass flex items-stretch justify-between px-1.5 py-1.5">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] transition ${
                isActive ? "bg-white/8 text-gold2 shadow-[inset_0_1px_0_rgba(255,236,206,0.25)]" : "text-cream/55"
              }`
            }
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function WorldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 12h16M12 4c2.5 2.4 2.5 13.6 0 16M12 4c-2.5 2.4-2.5 13.6 0 16" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function GateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 20V9l7-4 7 4v11" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 16.5V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H9l-4 3z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 19c1.2-2.4 3.1-3.5 5.5-3.5S16.3 16.6 17.5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function TopStats({
  title,
  subtitle,
  xp,
  streak,
  onBack,
  studied,
  goal,
}: {
  title: string;
  subtitle: string;
  xp: number;
  streak: number;
  onBack?: () => void;
  studied?: number;
  goal?: number;
}) {
  return (
    <header className="relative z-20 px-3 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-2">
        {onBack ? (
          <button onClick={onBack} className="glass shrink-0 rounded-full px-3 py-1.5 text-sm" aria-label="Назад">
            ←
          </button>
        ) : (
          <div className="glass shrink-0 rounded-full px-3 py-1 text-sm">
            <span className="font-display text-lg leading-none text-gold2">Yappo</span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1.5">
          {typeof goal === "number" && <GoalRing value={studied || 0} goal={goal} />}
          <span className="glass whitespace-nowrap rounded-full px-2.5 py-1 text-xs text-gold2">✦ {xp}</span>
          <span className="glass whitespace-nowrap rounded-full px-2.5 py-1 text-xs">🔥 {streak}</span>
          <MuteButton />
        </div>
      </div>
      <div className="mt-3 min-w-0 px-2 text-center">
        <div className="truncate font-display text-[28px] leading-none tracking-[-0.03em] text-cream">{title}</div>
        <div className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-cream/55">{subtitle}</div>
      </div>
    </header>
  );
}
