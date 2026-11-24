import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Atmosphere } from "../components/World";
import { useApp } from "../state";
import type { QuestDaily, QuestStory } from "../types";

export function QuestsScreen() {
  const { notify } = useApp();
  const navigate = useNavigate();
  const [daily, setDaily] = useState<QuestDaily[]>([]);
  const [story, setStory] = useState<QuestStory[]>([]);

  useEffect(() => {
    api<{ daily: QuestDaily[]; story: QuestStory[] }>("/api/quests")
      .then((data) => {
        setDaily(data.daily);
        setStory(data.story);
      })
      .catch((reason: Error) => notify(reason.message));
  }, []);

  return (
    <Atmosphere language="world">
      <div className="px-4 pt-[max(20px,env(safe-area-inset-top))]">
        <div className="text-[11px] uppercase tracking-[0.18em] text-gold2">Сегодня</div>
        <h1 className="font-display text-4xl">Испытания</h1>
        <p className="mt-1 max-w-sm text-sm text-cream/70">Короткие обещания дню и врата, которые открывают следующую главу.</p>
        <div className="mt-4 grid gap-2">
          {daily.map((quest) => (
            <article key={quest.id} className="glass flex items-center gap-3 p-3">
              <div className={`grid h-12 w-12 place-items-center rounded-full border ${quest.done ? "border-gold text-gold2" : "border-white/15 text-cream/50"}`}>
                {quest.done ? "✦" : `${quest.progress}/${quest.target}`}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{quest.title}</div>
                <div className="text-xs text-cream/65">{quest.text}</div>
              </div>
              <div className="text-xs text-gold2">+{quest.reward}</div>
            </article>
          ))}
        </div>
        <h2 className="mt-6 font-display text-3xl">Врата глав</h2>
        <div className="mt-3 grid gap-3 pb-6">
          {story.map((quest) => (
            <button
              key={quest.id}
              onClick={() => navigate("/")}
              className={`glass p-4 text-left ${quest.unlocked ? "" : "opacity-60"}`}
            >
              <div className="text-[11px] uppercase tracking-[0.16em] text-gold2">{quest.chapter}</div>
              <div className="font-display text-2xl">{quest.title}</div>
              <p className="mt-1 text-sm text-cream/70">{quest.text}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#f6e6bf] to-[#b8893e]"
                  style={{ width: `${quest.target ? (quest.progress / quest.target) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-cream/60">
                <span>{quest.progress} / {quest.target}</span>
                <span>{quest.done ? "пройдено" : `+${quest.reward} XP`}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Atmosphere>
  );
}
