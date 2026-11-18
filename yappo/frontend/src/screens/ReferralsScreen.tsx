import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Atmosphere } from "../components/World";
import { useApp } from "../state";
import type { ReferralInfo } from "../types";

export function ReferralsScreen() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [info, setInfo] = useState<ReferralInfo | null>(null);

  useEffect(() => {
    api<ReferralInfo>("/api/referrals").then(setInfo).catch((reason: Error) => notify(reason.message));
  }, []);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify("Ссылка скопирована");
    } catch {
      notify(value);
    }
  }

  return (
    <Atmosphere language="world" padNav={false}>
      <div className="min-h-dvh px-4 pb-10 pt-[max(18px,env(safe-area-inset-top))]">
        <button className="text-sm text-cream/75" onClick={() => navigate(-1)}>← профиль</button>
        <h1 className="mt-4 font-display text-5xl leading-none">Позови в город.</h1>
        <p className="mt-3 text-sm leading-relaxed text-cream/75">
          Когда друг заходит по твоей ссылке, ты и друг получаете по {info?.join_xp ?? 50} XP.
          Если друг оплачивает Premium, тебе добавляется {info?.premium_days ?? 7} дней — один раз за каждого.
        </p>
        {info && (
          <>
            <button onClick={() => copy(info.link)} className="glass mt-5 w-full p-4 text-left">
              <div className="text-[11px] uppercase tracking-[0.16em] text-gold2">Личная ссылка</div>
              <div className="mt-1 overflow-x-auto whitespace-nowrap text-sm">{info.link}</div>
              <div className="mt-2 overflow-x-auto whitespace-nowrap text-xs text-cream/55">Нажми, чтобы скопировать. Mini App: {info.app_link}</div>
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <Cell label="Пришли" value={String(info.invited)} />
              <Cell label="Оплатили" value={String(info.paid)} />
              <Cell label="XP тебе" value={String(info.xp_earned)} />
              <Cell label="Дней Premium" value={String(info.days_earned)} />
            </div>
            <h2 className="mt-6 font-display text-3xl">Кто пришёл</h2>
            <div className="mt-2 grid gap-2">
              {info.friends.length === 0 && <p className="text-sm text-cream/60">Пока тихо. Ссылка уже ждёт.</p>}
              {info.friends.map((friend) => (
                <div key={friend.name} className="glass flex items-center justify-between p-3 text-sm">
                  <span>{friend.name}</span>
                  <span className="text-gold2">{friend.paid ? "Premium" : friend.onboarded ? "в пути" : "зашёл"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Atmosphere>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass py-3">
      <div className="font-sans text-3xl font-semibold text-gold2">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-cream/55">{label}</div>
    </div>
  );
}
