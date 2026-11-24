import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, haptic } from "../api";
import { MapDiorama } from "../components/MapDiorama";
import { MuteButton } from "../components/Shell";
import { prefersReducedMotion, takeUnlock } from "../lib/motion";
import { sfx, startAmbient } from "../lib/sound";
import { useApp } from "../state";
import type { MascotId, PathData, PathNode } from "../types";

const JOURNEY = ["london", "newyork", "sydney", "rome"];
const CITY_NAME: Record<string, string> = {
  london: "Лондон",
  newyork: "Нью-Йорк",
  sydney: "Сидней",
  rome: "Рим",
  paris: "Париж",
  madrid: "Мадрид",
  berlin: "Берлин",
  beijing: "Пекин",
};

function cityFor(language: string, index: number) {
  if (language === "en") return JOURNEY[Math.min(index, JOURNEY.length - 1)];
  return language === "fr" ? "paris" : language === "es" ? "madrid" : language === "de" ? "berlin" : language === "zh" ? "beijing" : "london";
}

export function MapScreen() {
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const [path, setPath] = useState<PathData | null>(null);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    api<PathData>("/api/path").then((data) => {
      setPath(data);
      if (takeUnlock()) {
        haptic("success");
        sfx("win");
      }
    }).catch((error: Error) => notify(error.message));
  }, [user?.language]);

  if (!user || !path) {
    return <div className="grid min-h-dvh place-items-center text-cream/70">Собираем город…</div>;
  }
  const active = path.chapters.find((chapter) => chapter.unlocked && !chapter.complete) || path.chapters[path.chapters.length - 1];
  const activeIndex = Math.max(0, path.chapters.findIndex((chapter) => chapter.id === active.id));
  const forced = new URLSearchParams(window.location.search).get("city") || "";
  const city = CITY_NAME[forced] ? forced : cityFor(user.language, activeIndex);
  const current = active.nodes.find((node) => node.status === "current");
  const mascot = (user.mascot || "parrot") as MascotId;

  return (
    <div id="map-scroller" data-map="webgl" className="relative h-dvh overflow-hidden bg-[#1a120e]" onPointerDown={() => startAmbient()}>
      <div className="absolute inset-0 bottom-[72px]">
        {lost ? (
          <p className="grid h-full place-items-center px-6 text-center text-sm text-cream/70">3D-карта не открылась на этом экране.</p>
        ) : (
          <MapDiorama
            city={city}
            mascot={mascot}
            nodes={active.nodes}
            reduced={prefersReducedMotion()}
            onLost={() => setLost(true)}
            onOpen={(node) => openNode(node, navigate, notify)}
          />
        )}
      </div>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-3 pt-[max(12px,env(safe-area-inset-top))]">
        <span className="pointer-events-auto glass rounded-full px-3 py-1 font-display text-lg leading-none text-gold2">Yappo</span>
        <span
          className="pointer-events-none absolute left-1/2 top-[max(48px,calc(env(safe-area-inset-top)+36px))] -translate-x-1/2 font-display text-4xl text-[#3a2416]"
          style={{ textShadow: "0 1px 0 rgba(255,236,200,0.9), 0 6px 16px rgba(70,32,8,0.35)" }}
        >
          {CITY_NAME[city]}
        </span>
        <span className="pointer-events-auto flex items-center gap-1.5 text-xs">
          <span className="glass rounded-full px-2.5 py-1 text-gold2">✦ {user.xp}</span>
          <span className="glass rounded-full px-2.5 py-1">🔥 {user.streak}</span>
          <MuteButton />
        </span>
      </header>
      {current && (
        <button
          className="gold-btn absolute inset-x-4 bottom-[max(92px,calc(env(safe-area-inset-bottom)+80px))] z-20 h-14 text-base"
          onClick={() => openNode(current, navigate, notify)}
        >
          Начать урок
        </button>
      )}
    </div>
  );
}

function openNode(node: PathNode, navigate: (path: string) => void, notify: (message: string) => void) {
  if (node.status === "locked") {
    haptic("error");
    notify("Сначала предыдущие врата.");
    return;
  }
  haptic("light");
  navigate(node.kind === "story" ? `/story/${node.id}` : `/trial/${node.id}`);
}
