import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Atmosphere, GoldButton } from "../components/World";
import { useApp } from "../state";

interface Stats {
  users: number;
  new_today: number;
  new_7d: number;
  dau: number;
  premium: number;
  revenue_rub: number;
}

interface Card {
  id: number;
  public_id: string;
  name: string;
  email: string;
  username: string;
  telegram_id: number | null;
  level: number;
  streak: number;
  premium: boolean;
  premium_until: string | null;
  payments: { amount: string; status: string; plan: string }[];
}

interface StaffRow {
  telegram_id: number;
  username: string;
  role: string;
  can_invite: boolean;
}

export function AdminScreen() {
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [picked, setPicked] = useState<Card | null>(null);
  const [days, setDays] = useState(30);
  const [payments, setPayments] = useState<{ amount: string; status: string; email: string; plan: string }[]>([]);
  const [subs, setSubs] = useState<{ id: number; email: string; username: string; premium: boolean; premium_until: string | null }[]>([]);
  const [admins, setAdmins] = useState<StaffRow[]>([]);
  const [inviteId, setInviteId] = useState("");
  const access = user?.access;

  useEffect(() => {
    if (!access) return;
    api<Stats>("/api/admin/stats").then(setStats).catch((error: Error) => notify(error.message));
    api<{ payments: typeof payments }>("/api/admin/payments").then((data) => setPayments(data.payments)).catch(() => undefined);
    api<{ subscriptions: typeof subs }>("/api/admin/subscriptions").then((data) => setSubs(data.subscriptions)).catch(() => undefined);
    api<{ admins: StaffRow[] }>("/api/admin/admins").then((data) => setAdmins(data.admins)).catch(() => undefined);
  }, [access?.role]);

  if (!user) return null;
  if (!access) {
    return (
      <Atmosphere language={user.language} padNav={false}>
        <div className="px-4 pt-16 text-center">
          <h1 className="font-display text-4xl">Нет доступа</h1>
          <button className="mt-4 text-gold2" onClick={() => navigate("/profile")}>В профиль</button>
        </div>
      </Atmosphere>
    );
  }

  async function search() {
    const data = await api<{ users: Card[] }>(`/api/admin/users?q=${encodeURIComponent(query)}`);
    setCards(data.users);
    setPicked(data.users[0] || null);
  }

  async function grant() {
    if (!picked) return;
    const card = await api<Card>(`/api/admin/users/${picked.id}/premium`, {
      method: "POST",
      body: JSON.stringify({ days }),
    });
    setPicked(card);
    notify(`Premium до ${card.premium_until || ""}`);
  }

  async function removeUser() {
    if (!picked) return;
    await api(`/api/admin/users/${picked.id}`, { method: "DELETE" });
    setPicked(null);
    setCards((items) => items.filter((item) => item.id !== picked.id));
    notify("Аккаунт удалён");
  }

  async function addAdmin(canInvite: boolean) {
    const telegramId = Number(inviteId);
    if (!telegramId) return;
    await api("/api/admin/admins", {
      method: "POST",
      body: JSON.stringify({ telegram_id: telegramId, can_invite: canInvite }),
    });
    if (canInvite) await api(`/api/admin/admins/${telegramId}/invite`, { method: "POST" });
    const data = await api<{ admins: StaffRow[] }>("/api/admin/admins");
    setAdmins(data.admins);
    setInviteId("");
  }

  return (
    <Atmosphere language="en" padNav={false}>
      <div className="min-h-dvh px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
        <button className="text-sm text-cream/70" onClick={() => navigate("/profile")}>← профиль</button>
        <h1 className="mt-2 font-display text-4xl">Админ</h1>
        <p className="text-xs text-cream/60">{access.role === "owner" ? "Владелец" : "Администратор"}</p>
        {stats && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Пользователи" value={stats.users} />
            <Stat label="Новые сегодня" value={stats.new_today} />
            <Stat label="За 7 дней" value={stats.new_7d} />
            <Stat label="Активны за сутки" value={stats.dau} />
            <Stat label="Premium" value={stats.premium} />
            <Stat label="Выручка ₽" value={stats.revenue_rub} />
          </div>
        )}
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void search().catch((error: Error) => notify(error.message)); }}>
          <input className="field flex-1" placeholder="ID, почта, @username, YP-" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="gold-btn h-12 px-4" type="submit">Найти</button>
        </form>
        <div className="mt-2 grid gap-2">
          {cards.map((card) => (
            <button key={card.id} type="button" className={`choice-btn px-3 py-2 text-left ${picked?.id === card.id ? "choice-on" : ""}`} onClick={() => setPicked(card)}>
              {card.public_id || card.id} · {card.email || card.username || card.name}
            </button>
          ))}
        </div>
        {picked && (
          <article className="glass mt-3 p-4 text-sm">
            <div className="font-display text-2xl">{picked.name || "Без имени"}</div>
            <p>ID {picked.id} · {picked.public_id}</p>
            <p>Почта: {picked.email || "—"}</p>
            <p>Telegram: {picked.username ? `@${picked.username}` : "—"} {picked.telegram_id || ""}</p>
            <p>Уровень {picked.level} · серия {picked.streak}</p>
            <p>Premium: {picked.premium ? picked.premium_until : "нет"}</p>
            {!!picked.payments.length && <p>Платёж: {picked.payments[0].amount} ₽ · {picked.payments[0].status}</p>}
            <div className="mt-3 flex gap-2">
              <input className="field w-24" type="number" min={1} value={days} onChange={(event) => setDays(Number(event.target.value))} />
              <button className="gold-btn h-12 flex-1" type="button" onClick={() => void grant().catch((error: Error) => notify(error.message))}>Выдать дни</button>
            </div>
            {access.role === "owner" && (
              <button type="button" className="mt-3 text-sm text-rose-200" onClick={() => void removeUser().catch((error: Error) => notify(error.message))}>Удалить аккаунт</button>
            )}
          </article>
        )}
        <h2 className="mt-6 font-display text-2xl">Подписки</h2>
        <ul className="mt-2 space-y-1 text-xs text-cream/75">
          {subs.slice(0, 8).map((row) => (
            <li key={row.id}>{row.email || row.username || row.id} · {row.premium ? "активна" : "истекла"}</li>
          ))}
        </ul>
        <h2 className="mt-5 font-display text-2xl">Платежи</h2>
        <ul className="mt-2 space-y-1 text-xs text-cream/75">
          {payments.slice(0, 8).map((row, index) => (
            <li key={`${row.email}-${index}`}>{row.amount} ₽ · {row.plan} · {row.status} · {row.email || "—"}</li>
          ))}
        </ul>
        <h2 className="mt-5 font-display text-2xl">Доступ</h2>
        <ul className="mt-2 space-y-1 text-xs text-cream/75">
          {admins.map((row) => (
            <li key={row.telegram_id}>{row.role} · {row.telegram_id} {row.can_invite ? "· приглашает" : ""}</li>
          ))}
        </ul>
        {(access.role === "owner" || access.can_invite) && (
          <div className="mt-3 grid gap-2">
            <input className="field" placeholder="Telegram id" value={inviteId} onChange={(event) => setInviteId(event.target.value)} />
            <GoldButton onClick={() => void addAdmin(false).catch((error: Error) => notify(error.message))}>Добавить администратора</GoldButton>
            {access.role === "owner" && (
              <button type="button" className="text-sm text-gold2" onClick={() => void addAdmin(true).catch((error: Error) => notify(error.message))}>Добавить с правом приглашать</button>
            )}
          </div>
        )}
      </div>
    </Atmosphere>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass p-3">
      <div className="text-[11px] text-cream/60">{label}</div>
      <div className="font-display text-2xl">{value}</div>
    </div>
  );
}
