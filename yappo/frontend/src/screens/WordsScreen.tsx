import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Atmosphere, GoldButton } from "../components/World";
import { useApp } from "../state";

interface Card {
  id: number;
  front: string;
  back: string;
  box: number;
}

export function WordsScreen() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [open, setOpen] = useState(false);

  function load() {
    api<{ words: Card[] }>("/api/words").then((data) => {
      setCards(data.words);
      setOpen(false);
    }).catch((error: Error) => notify(error.message));
  }

  useEffect(() => {
    load();
  }, []);

  const card = cards?.[0];

  async function grade(ok: boolean) {
    if (!card) return;
    await api(`/api/words/${card.id}/grade`, { method: "POST", body: JSON.stringify({ ok }) });
    setCards((items) => (items ? items.slice(1) : items));
    setOpen(false);
  }

  return (
    <Atmosphere padNav={false}>
      <div className="min-h-dvh px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" className="text-sm text-cream/70" onClick={() => navigate("/profile")}>← профиль</button>
        <h1 className="mt-2 font-display text-4xl">Мои слова</h1>
        <p className="text-sm text-cream/70">Сюда падают промахи. Верный ответ отодвигает слово дальше.</p>
        {!card && cards && <p className="mt-6 text-sm text-gold2">На сегодня всё повторено.</p>}
        {card && (
          <div className="glass mt-4 p-4">
            <div className="text-[11px] text-cream/50">коробочка {card.box}</div>
            <div className="mt-2 font-display text-3xl leading-tight">{card.front}</div>
            {open && <div className="mt-3 text-lg text-gold2">{card.back}</div>}
            <div className="mt-4 grid gap-2">
              {!open && <GoldButton onClick={() => setOpen(true)}>Показать</GoldButton>}
              {open && (
                <>
                  <GoldButton onClick={() => void grade(true).catch((error: Error) => notify(error.message))}>Знаю</GoldButton>
                  <button type="button" className="choice-btn py-3" onClick={() => void grade(false).catch((error: Error) => notify(error.message))}>Ещё раз</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Atmosphere>
  );
}
