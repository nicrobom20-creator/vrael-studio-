import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Companion } from "../components/Companion";
import { Atmosphere } from "../components/World";
import { useApp } from "../state";
import type { MascotId, User } from "../types";

interface ShopItem {
  id: string;
  name: string;
  price: number;
  premium: boolean;
  blurb: string;
  owned: boolean;
  equipped: boolean;
  locked: boolean;
}

interface Boost {
  id: string;
  name: string;
  price: number;
  blurb: string;
  owned: number;
}

interface Shop {
  coins: number;
  equipped: string;
  premium: boolean;
  items: ShopItem[];
  boosts?: Boost[];
  user?: User;
}

export function ShopScreen() {
  const { user, setUser, notify } = useApp();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);

  useEffect(() => {
    api<Shop>("/api/shop").then(setShop).catch((error: Error) => notify(error.message));
  }, []);

  if (!user) return null;
  const mascot = (user.mascot || "parrot") as MascotId;
  const outfit = shop?.equipped || user.outfit;

  async function act(path: string, itemId: string) {
    const next = await api<Shop>(path, { method: "POST", body: JSON.stringify({ item_id: itemId }) });
    setShop(next);
    if (next.user) setUser(next.user);
  }

  return (
    <Atmosphere language={user.language} padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" className="text-sm text-cream/70" onClick={() => navigate("/profile")}>← профиль</button>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-gold2">Коллекция</div>
            <h1 className="font-display text-4xl leading-none">Гардероб</h1>
          </div>
          <div className="text-sm text-gold2">{shop?.coins ?? user.coins} монет</div>
        </div>
        <div className="play-card mx-auto mt-4 h-44 w-36">
          <Companion mascot={mascot} pose="idle" outfit={outfit} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {shop?.items.map((item) => (
            <article key={item.id} className="glass flex flex-col gap-2 p-3">
              <div className="mx-auto h-16 w-14">
                <Companion mascot={mascot} pose="idle" outfit={item.id} />
              </div>
              <div className="min-w-0 text-center">
                <div className="font-medium">{item.name}</div>
                <div className="text-[11px] leading-snug text-cream/65">{item.blurb}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-gold2">{item.premium ? "Premium · " : ""}{item.price}</div>
              </div>
              {item.equipped ? (
                <button type="button" className="choice-btn px-3 py-2 text-xs" onClick={() => void act("/api/shop/equip", "").catch((error: Error) => notify(error.message))}>Снять</button>
              ) : item.owned ? (
                <button type="button" className="choice-btn px-3 py-2 text-xs" onClick={() => void act("/api/shop/equip", item.id).catch((error: Error) => notify(error.message))}>Надеть</button>
              ) : (
                <button type="button" className="choice-btn shrink-0 px-3 py-2 text-xs" disabled={item.locked} onClick={() => void act("/api/shop/buy", item.id).catch((error: Error) => notify(error.message))}>
                  {item.locked ? "Premium" : "Купить"}
                </button>
              )}
            </article>
          ))}
        </div>
        <h2 className="mt-6 font-display text-3xl">Усиления</h2>
        <div className="mt-2 grid gap-2">
          {shop?.boosts?.map((item) => (
            <article key={item.id} className="glass flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-cream/65">{item.blurb}</div>
                <div className="mt-1 text-xs text-gold2">есть {item.owned} · {item.price} монет</div>
              </div>
              <button type="button" className="choice-btn shrink-0 px-3 py-2 text-xs" onClick={() => void act("/api/shop/boost", item.id).catch((error: Error) => notify(error.message))}>Купить</button>
            </article>
          ))}
        </div>
      </div>
    </Atmosphere>
  );
}
