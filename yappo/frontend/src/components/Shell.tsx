import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/", label: "Мир", icon: WorldIcon },
  { to: "/quests", label: "Испытания", icon: GateIcon },
  { to: "/chat", label: "Разговор", icon: ChatIcon },
  { to: "/profile", label: "Профиль", icon: UserIcon },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="glass flex items-stretch justify-between px-2 py-2">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] ${
                isActive ? "text-gold2" : "text-cream/55"
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
}: {
  title: string;
  subtitle: string;
  xp: number;
  streak: number;
  onBack?: () => void;
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
          <span className="glass whitespace-nowrap rounded-full px-2.5 py-1 text-xs text-gold2">✦ {xp}</span>
          <span className="glass whitespace-nowrap rounded-full px-2.5 py-1 text-xs">🔥 {streak}</span>
        </div>
      </div>
      <div className="mt-2 min-w-0 text-center">
        <div className="truncate font-display text-xl leading-tight text-cream">{title}</div>
        <div className="truncate text-xs text-cream/70">{subtitle}</div>
      </div>
    </header>
  );
}
