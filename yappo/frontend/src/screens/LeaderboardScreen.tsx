import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Companion } from "../components/Companion";
import { Atmosphere } from "../components/World";
import { useApp } from "../state";
import type { BoardEntry, MascotId } from "../types";

export function LeaderboardScreen() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [scope, setScope] = useState<"friends" | "all">("friends");
  const [entries, setEntries] = useState<BoardEntry[]>([]);

  useEffect(() => {
    api<{ entries: BoardEntry[] }>(`/api/leaderboard?scope=${scope}`)
      .then((data) => setEntries(data.entries))
      .catch((reason: Error) => notify(reason.message));
  }, [scope]);

  return (
    <Atmosphere language="world" padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(18px,env(safe-area-inset-top))]">
        <button className="text-sm text-cream/75" onClick={() => navigate(-1)}>← профиль</button>
        <h1 className="mt-4 font-display text-5xl leading-none">Кто шёл на этой неделе</h1>
        <div className="mt-4 flex gap-2">
          {(["friends", "all"] as const).map((item) => (
            <button key={item} onClick={() => setScope(item)} className={`rounded-full border px-4 py-2 text-sm ${scope === item ? "border-gold text-gold2" : "border-white/15"}`}>
              {item === "friends" ? "Друзья" : "Все"}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          {entries.map((entry) => (
            <article key={entry.id} className={`glass flex items-center gap-3 p-3 ${entry.you ? "border-gold" : ""}`}>
              <div className="w-6 text-center font-sans text-lg font-semibold text-gold2">{entry.rank}</div>
              <div className="h-12 w-12">
                <Companion mascot={(entry.mascot || "parrot") as MascotId} pose="idle" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate">{entry.name}{entry.you ? " · ты" : ""}</div>
                <div className="text-xs text-cream/55">{entry.mascot_name} · серия {entry.streak}</div>
              </div>
              <div className="text-right">
                <div className="text-gold2">{entry.weekly_xp}</div>
                <div className="text-[10px] uppercase tracking-wider text-cream/45">за 7 дней</div>
              </div>
            </article>
          ))}
          {entries.length === 0 && <p className="text-sm text-cream/60">Пока нет шагов на этой неделе.</p>}
        </div>
      </div>
    </Atmosphere>
  );
}
