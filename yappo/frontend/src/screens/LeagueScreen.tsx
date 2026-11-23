import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Atmosphere } from "../components/World";
import { useApp } from "../state";

interface Row {
  id: number;
  name: string;
  mascot_name: string;
  weekly_xp: number;
  you: boolean;
}

interface League {
  code: string;
  title: string;
  weekly_xp: number;
  floor: number;
  next: number | null;
  board: Row[];
}

export function LeagueScreen() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);

  useEffect(() => {
    api<League>("/api/league").then(setLeague).catch((error: Error) => notify(error.message));
  }, []);

  return (
    <Atmosphere padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" className="text-sm text-cream/70" onClick={() => navigate("/profile")}>← профиль</button>
        <h1 className="mt-2 font-display text-4xl">{league?.title || "Лига"}</h1>
        <p className="text-sm text-cream/70">
          {league ? `${league.weekly_xp} XP за 7 дней` : "Считаем неделю…"}
          {league?.next != null ? `. До следующей лиги ${Math.max(0, league.next - league.weekly_xp)} XP.` : ". Это верхняя лига."}
        </p>
        <ol className="mt-4 grid gap-2">
          {league?.board.map((row, index) => (
            <li key={row.id} className={`glass flex items-center justify-between px-3 py-2 ${row.you ? "border-gold" : ""}`}>
              <span>{index + 1}. {row.name} · {row.mascot_name}</span>
              <span className="text-gold2">{row.weekly_xp}</span>
            </li>
          ))}
        </ol>
      </div>
    </Atmosphere>
  );
}
