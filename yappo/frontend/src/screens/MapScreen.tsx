import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, haptic } from "../api";
import { CityScene } from "../components/CityScene";
import { Companion } from "../components/Companion";
import { TopStats } from "../components/Shell";
import { Fireflies } from "../components/World";
import { useApp } from "../state";
import type { MascotId, PathData, PathNode } from "../types";

export function MapScreen() {
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const [path, setPath] = useState<PathData | null>(null);

  useEffect(() => {
    api<PathData>("/api/path").then(setPath).catch((error: Error) => notify(error.message));
  }, [user?.language]);

  if (!user || !path) {
    return <div className="grid min-h-dvh place-items-center text-cream/70">Собираем острова…</div>;
  }
  const chapter = path.chapters.find((item) => item.unlocked && !item.complete) || path.chapters[path.chapters.length - 1];
  const current = chapter.nodes.find((node) => node.status === "current");
  const mascot = (user.mascot || "parrot") as MascotId;
  const spots = routeSpots(chapter.nodes.length);
  const currentIndex = Math.max(0, chapter.nodes.findIndex((node) => node.status === "current"));

  return (
    <div className="relative min-h-dvh nav-safe overflow-hidden">
      <CityScene language={user.language} />
      <Fireflies language={user.language} />
      <TopStats
        title={chapter.title}
        subtitle={`${path.language.city} · Уровень ${user.level}`}
        xp={user.xp}
        streak={user.streak}
      />
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={pathD(spots)} fill="none" stroke="rgba(246,226,176,0.55)" strokeWidth="0.7" strokeDasharray="1.4 1.1" vectorEffect="non-scaling-stroke">
          <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="2.8s" repeatCount="indefinite" />
        </path>
      </svg>
      {chapter.nodes.map((node, index) => (
        <Node
          key={node.id}
          node={node}
          spot={spots[index]}
          onOpen={() => openNode(node, navigate, notify)}
        />
      ))}
      <motion.div
        className="pointer-events-none absolute z-20 h-20 w-20"
        animate={{ left: `${spots[currentIndex].x - 8}%`, top: `${spots[currentIndex].y - 12}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 16 }}
      >
        <Companion mascot={mascot} pose={current ? "run" : "celebrate"} />
      </motion.div>
      <div className="absolute inset-x-3 bottom-[92px] z-30">
        <div className="glass flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] uppercase tracking-[0.16em] text-gold2">Глава {chapter.index} · {chapter.lessons_done}/{chapter.lessons_total}</div>
            <div className="truncate text-sm text-cream/80">{path.mascot_line}</div>
          </div>
          {current && (
            <button
              className="gold-btn h-10 shrink-0 px-4 text-sm"
              onClick={() => openNode(current, navigate, notify)}
            >
              {current.kind === "story" ? "К сцене" : "К вратам"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function routeSpots(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0.5 : index / (count - 1);
    const x = 50 + Math.sin(t * Math.PI * 1.35) * 30;
    const y = 64 - t * 36;
    return { x, y };
  });
}

function pathD(spots: { x: number; y: number }[]) {
  if (!spots.length) return "";
  return spots.map((spot, index) => `${index === 0 ? "M" : "L"} ${spot.x} ${spot.y}`).join(" ");
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

const ICONS: Record<string, string> = {
  story: "⌂",
  vocabulary: "文",
  choice: "?",
  match: "⚭",
  build: "≡",
  listen: "♪",
  speak: "◉",
};

function Node({ node, spot, onOpen }: { node: PathNode; spot: { x: number; y: number }; onOpen: () => void }) {
  const live = node.status === "current";
  const locked = node.status === "locked";
  return (
    <button
      onClick={onOpen}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      aria-label={node.title}
    >
      <span className={`grid h-12 w-12 place-items-center rounded-full border text-sm ${
        node.status === "done"
          ? "border-gold bg-gradient-to-b from-[#f6e6bf] to-[#b8893e] text-[#2a1c0a]"
          : live
            ? "orb-live border-gold bg-[#2a2118] text-gold2"
            : "border-white/20 bg-black/55 text-cream/45"
      }`}>
        {node.status === "done" ? "✓" : locked ? "🔒" : ICONS[node.skill] || "✦"}
      </span>
      {live && <span className="mt-1 block max-w-[76px] truncate text-[10px] text-gold2">{node.title}</span>}
    </button>
  );
}
