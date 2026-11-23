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

interface Shop {
  coins: number;
  equipped: string;
  premium: boolean;
  items: ShopItem[];
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
        <div className="mt-3 flex items-end justify-between">
          <h1 className="font-display text-4xl">Гардероб</h1>
          <div className="text-sm text-gold2">{shop?.coins ?? user.coins} монет</div>
        </div>
        <div className="mx-auto mt-2 h-40 w-32">
          <Companion mascot={mascot} pose="idle" outfit={outfit} />
        </div>
        <div className="mt-3 grid gap-2">
          {shop?.items.map((item) => (
            <article key={item.id} className="glass flex items-center gap-3 p-3">
              <div className="h-16 w-14 shrink-0">
                <Companion mascot={mascot} pose="idle" outfit={item.id} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-cream/65">{item.blurb}</div>
                <div className="mt-1 text-xs text-gold2">{item.premium ? "Premium · " : ""}{item.price} монет</div>
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
      </div>
    </Atmosphere>
  );
}
