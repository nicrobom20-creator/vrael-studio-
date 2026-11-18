import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { followCheckout } from "../api";
import { ConsentLine, openLegal } from "./LegalScreen";
import { Atmosphere, GoldButton } from "../components/World";
import { useApp } from "../state";

export function PremiumScreen() {
  const { config, user, notify } = useApp();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);
  const month = rub(config?.prices.month);
  const year = rub(config?.prices.year);

  async function pay() {
    setBusy(true);
    try {
      const message = await followCheckout(plan, navigate);
      if (message) notify(message);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Платёж не создан");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Atmosphere language={user?.language || "world"} padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(18px,env(safe-area-inset-top))]">
        <button className="text-sm text-cream/75" onClick={() => navigate(-1)}>← назад</button>
        <div className="mt-6 text-[11px] uppercase tracking-[0.2em] text-gold2">Yappo Premium</div>
        <h1 className="max-w-sm font-display text-5xl leading-none">Путь без дневных врат.</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream/75">
          Свободный путь — {config?.limits.lessons ?? 3} испытания в день и {config?.limits.chat ?? 5} сообщений собеседнику. Premium снимает оба предела. Оплата в рублях, доступ открывается только после подтверждённого платежа.
        </p>
        {user?.premium && (
          <div className="mt-4 glass p-3 text-sm text-gold2">
            Подписка активна{user.premium_until ? ` до ${user.premium_until.slice(0, 10)}` : ""}.
          </div>
        )}
        <div className="mt-5 grid gap-3">
          <Plan
            active={plan === "month"}
            title="Месяц"
            price={`${month} ₽`}
            note="30 дней"
            onClick={() => setPlan("month")}
          />
          <Plan
            active={plan === "year"}
            title="Год"
            price={`${year} ₽`}
            note="365 дней · спокойнее, чем двенадцать месяцев"
            onClick={() => setPlan("year")}
          />
        </div>
        <ul className="mt-5 space-y-2 text-sm text-cream/80">
          <li>Все испытания текущих глав, без счётчика на день.</li>
          <li>Живой разговор в кафе, аэропорту и на собеседовании.</li>
          <li>Спутник, серия и сюжет остаются с тобой.</li>
        </ul>
        <div className="mt-6">
          <GoldButton onClick={pay} disabled={busy}>{busy ? "Создаём счёт…" : "Оплатить"}</GoldButton>
        </div>
        <ConsentLine />
        <p className="mt-3 text-center text-[11px] text-cream/55">
          <button type="button" className="underline" onClick={() => openLegal("/support")}>Поддержка</button>
        </p>
      </div>
    </Atmosphere>
  );
}

function rub(value?: string) {
  if (!value) return "—";
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : value;
}

function Plan({
  active,
  title,
  price,
  note,
  onClick,
}: {
  active: boolean;
  title: string;
  price: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`glass p-4 text-left ${active ? "border-gold" : "opacity-80"}`}>
      <div className="flex items-end justify-between">
        <div className="font-display text-3xl">{title}</div>
        <div className="font-display text-3xl text-gold2">{price}</div>
      </div>
      <div className="mt-1 text-xs text-cream/65">{note}</div>
    </button>
  );
}
