import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Companion } from "../components/Companion";
import { Atmosphere, GoldButton } from "../components/World";
import { useApp } from "../state";
import type { MascotId, User } from "../types";

const TINTS = [
  ["", "Как есть"],
  ["gold", "Золото"],
  ["rose", "Роза"],
  ["sea", "Море"],
] as const;

export function CreatorScreen() {
  const { user, config, setUser, notify } = useApp();
  const navigate = useNavigate();
  const [mascot, setMascot] = useState<MascotId>((user?.mascot || "parrot") as MascotId);
  const [tint, setTint] = useState(user?.look?.tint || "");
  const [name, setName] = useState(user?.look?.name || "");
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function save() {
    setBusy(true);
    try {
      const next = await api<User>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ mascot, look_tint: tint, look_name: name }),
      });
      setUser(next);
      navigate("/profile");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не сохранилось");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Atmosphere language={user.language} padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" className="text-sm text-cream/70" onClick={() => navigate("/profile")}>← профиль</button>
        <h1 className="mt-2 font-display text-4xl">Образ</h1>
        <p className="text-sm text-cream/70">Пять спутников остаются. Оттенок и имя делают твоего единственным.</p>
        <div className="mx-auto mt-3 h-40 w-32">
          <Companion mascot={mascot} pose="wave" outfit={user.outfit} pet={user.pet?.code} tint={tint} />
        </div>
        {name && <p className="text-center text-gold2">{name}</p>}
        <div className="mt-3 grid grid-cols-5 gap-2">
          {config?.mascots.map((item) => (
            <button key={item.id} type="button" className={`rounded-2xl border p-1 ${mascot === item.id ? "border-gold" : "border-white/10"}`} onClick={() => setMascot(item.id)}>
              <Companion mascot={item.id} pose="idle" tint={tint} className="h-14 w-full" />
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {TINTS.map(([id, label]) => (
            <button key={id || "plain"} type="button" className={`choice-btn py-3 ${tint === id ? "choice-on" : ""}`} onClick={() => setTint(id)}>{label}</button>
          ))}
        </div>
        <label className="mt-3 block text-xs text-cream/60" htmlFor="look-name">Имя спутника</label>
        <input id="look-name" name="look-name" className="field mt-1" maxLength={32} value={name} autoComplete="nickname" onChange={(event) => setName(event.target.value)} />
        <div className="mt-4">
          <GoldButton disabled={busy} onClick={() => void save()}>{busy ? "Сохраняем…" : "Сохранить образ"}</GoldButton>
        </div>
      </div>
    </Atmosphere>
  );
}
