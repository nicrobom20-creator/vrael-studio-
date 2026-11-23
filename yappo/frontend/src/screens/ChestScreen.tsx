import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Atmosphere, GoldButton } from "../components/World";
import { useApp } from "../state";
import type { User } from "../types";

export function ChestScreen() {
  const { setUser, notify } = useApp();
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    api<{ opened: boolean }>("/api/chest").then((data) => setOpened(data.opened)).catch((error: Error) => notify(error.message));
  }, []);

  async function open() {
    const data = await api<{ coins: number; user: User }>("/api/chest", { method: "POST" });
    setUser(data.user);
    setPrize(data.coins);
    setOpened(true);
    setBurst(true);
  }

  return (
    <Atmosphere padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" className="text-sm text-cream/70" onClick={() => navigate("/profile")}>← профиль</button>
        <h1 className="mt-2 font-display text-4xl">Сундук</h1>
        <p className="text-sm text-cream/70">Один раз в день. Внутри монеты для гардероба.</p>
        <div className={`mx-auto mt-8 grid h-40 w-40 place-items-center rounded-3xl border border-gold/50 bg-[#3a2a16] text-6xl ${burst ? "chest-pop" : ""}`}>▣</div>
        {prize != null && <p className="mt-4 text-center text-gold2">+{prize} монет</p>}
        <div className="mt-6">
          <GoldButton disabled={opened} onClick={() => void open().catch((error: Error) => notify(error.message))}>
            {opened ? "Уже открыт сегодня" : "Открыть"}
          </GoldButton>
        </div>
      </div>
    </Atmosphere>
  );
}
