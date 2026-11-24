import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Atmosphere, GoldButton } from "../components/World";
import { useApp } from "../state";
import type { User } from "../types";

interface Round {
  id: string;
  prompt: string;
  options: string[];
}

export function DuelScreen() {
  const { setUser, notify } = useApp();
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [code, setCode] = useState("");
  const [join, setJoin] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    api<{ questions: Round[] }>("/api/duels/questions").then((data) => setRounds(data.questions)).catch((error: Error) => notify(error.message));
  }, []);

  async function openCode() {
    const data = await api<{ code: string }>("/api/duels", { method: "POST" });
    setCode(data.code);
  }

  async function enter() {
    const data = await api<{ code: string }>("/api/duels/join", { method: "POST", body: JSON.stringify({ code: join.trim() }) });
    setCode(data.code);
  }

  async function finish(path: string) {
    const data = await api<{ your_score: number; shadow?: number; prize: number; user?: User }>(path, {
      method: "POST",
      body: JSON.stringify({ answers: picks }),
    });
    if (data.user) setUser(data.user);
    const foe = data.shadow != null ? `Тень: ${data.shadow}. ` : "";
    setResult(`${foe}Ты: ${data.your_score} из 5. Монет: ${data.prize}.`);
  }

  return (
    <Atmosphere padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" className="text-sm text-cream/70" onClick={() => navigate("/profile")}>← профиль</button>
        <h1 className="mt-2 font-display text-4xl">Дуэль</h1>
        <p className="text-sm text-cream/70">Пять вопросов. Тень набирает 2. Друг входит по коду, победителю 15 монет.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="choice-btn px-3 py-2 text-xs" onClick={() => void openCode().catch((error: Error) => notify(error.message))}>Код для друга</button>
          {code && <span className="text-gold2">{code}</span>}
        </div>
        <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); void enter().catch((error: Error) => notify(error.message)); }}>
          <input id="duel-code" name="code" className="field" placeholder="Код друга" value={join} autoCapitalize="none" onChange={(event) => setJoin(event.target.value)} />
          <button className="choice-btn px-3" type="submit">Войти</button>
        </form>
        <div className="mt-4 grid gap-3">
          {rounds.map((round) => (
            <div key={round.id}>
              <div className="text-sm">{round.prompt}</div>
              <div className="mt-1 grid gap-1">
                {round.options.map((option) => (
                  <button key={option} type="button" className={`choice-btn px-3 py-2 text-left text-sm ${picks[round.id] === option ? "choice-on" : ""}`} onClick={() => setPicks((value) => ({ ...value, [round.id]: option }))}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {result && <p className="mt-4 text-gold2">{result}</p>}
        <div className="mt-4 grid gap-2">
          <GoldButton onClick={() => void finish("/api/duels/shadow").catch((error: Error) => notify(error.message))}>Сразиться с тенью</GoldButton>
          {code && <button type="button" className="choice-btn py-3" onClick={() => void finish(`/api/duels/${code}/answers`).catch((error: Error) => notify(error.message))}>Отправить другу</button>}
        </div>
      </div>
    </Atmosphere>
  );
}
