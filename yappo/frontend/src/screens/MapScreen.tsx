import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, haptic } from "../api";
import { CityScene, pathSpots } from "../components/CityScene";
import { Companion } from "../components/Companion";
import { TopStats } from "../components/Shell";
import { useApp } from "../state";
import type { Chapter, MascotId, PathData, PathNode } from "../types";

export function MapScreen() {
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const [path, setPath] = useState<PathData | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<PathData>("/api/path").then(setPath).catch((error: Error) => notify(error.message));
  }, [user?.language]);

  useEffect(() => {
    if (!path) return;
    const current = path.chapters.find((chapter) => chapter.unlocked && !chapter.complete) || path.chapters[0];
    document.getElementById(`chapter-${current.id}`)?.scrollIntoView({ block: "end" });
  }, [path?.language]);

  if (!user || !path) {
    return <div className="grid min-h-dvh place-items-center text-cream/70">Собираем острова…</div>;
  }
  const mascot = (user.mascot || "parrot") as MascotId;
  const active = path.chapters.find((chapter) => chapter.unlocked && !chapter.complete) || path.chapters[path.chapters.length - 1];

  return (
    <div ref={scroller} className="h-dvh overflow-y-auto overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#120e0b]/80 to-transparent pb-2">
        <TopStats
          title={active.title}
          subtitle={`${path.language.city} · Уровень ${user.level}`}
          xp={user.xp}
          streak={user.streak}
        />
      </div>
      {path.chapters.map((chapter) => (
        <ChapterBand
          key={chapter.id}
          chapter={chapter}
          language={user.language}
          mascot={mascot}
          line={chapter.id === active.id ? path.mascot_line : chapter.subtitle}
          onOpen={(node) => openNode(node, navigate, notify)}
        />
      ))}
      <div className="h-28" />
    </div>
  );
}

function ChapterBand({
  chapter,
  language,
  mascot,
  line,
  onOpen,
}: {
  chapter: Chapter;
  language: string;
  mascot: MascotId;
  line: string;
  onOpen: (node: PathNode) => void;
}) {
  const spots = pathSpots(language, chapter.nodes.length);
  const currentIndex = Math.max(0, chapter.nodes.findIndex((node) => node.status === "current"));
  const current = chapter.nodes[currentIndex];
  const d = spots.map((spot, index) => `${index === 0 ? "M" : "L"} ${spot.x} ${spot.y}`).join(" ");

  return (
    <section id={`chapter-${chapter.id}`} className="relative h-[132vh] overflow-hidden">
      <CityScene language={language} pathFrame />
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={d} fill="none" stroke="rgba(255, 220, 150, 0.35)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke="rgba(255, 244, 214, 0.9)" strokeWidth="0.55" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {chapter.nodes.map((node, index) => (
        <Node key={node.id} node={node} spot={spots[index]} onOpen={() => onOpen(node)} />
      ))}
      {chapter.unlocked && current && (
        <motion.div
          className="pointer-events-none absolute z-20 h-32 w-28"
          animate={{
            left: `${Math.max(0, spots[currentIndex].x - 22)}%`,
            top: `${spots[currentIndex].y - 8}%`,
          }}
          transition={{ type: "spring", stiffness: 70, damping: 16 }}
        >
          <Companion mascot={mascot} pose="point" />
        </motion.div>
      )}
      {current && current.status !== "locked" && (
        <div className="absolute inset-x-3 bottom-[100px] z-30 flex items-center gap-2">
          <div className="glass min-w-0 flex-1 truncate px-3 py-2 text-xs text-cream/80">{line}</div>
          <button className="gold-btn h-10 shrink-0 px-4 text-sm" onClick={() => onOpen(current)}>
            {current.kind === "story" ? "К сцене" : "К вратам"}
          </button>
        </div>
      )}
    </section>
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

function Node({ node, spot, onOpen }: { node: PathNode; spot: { x: number; y: number }; onOpen: () => void }) {
  const live = node.status === "current";
  const done = node.status === "done";
  const labelLeft = spot.x > 62;
  return (
    <button
      onClick={onOpen}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      aria-label={node.title}
    >
      <span
        className={`grid place-items-center rounded-full border backdrop-blur-md ${
          done
            ? "h-9 w-9 border-gold bg-gradient-to-b from-[#f6e6bf] to-[#b8893e] text-[#2a1c0a]"
            : live
              ? "orb-live h-12 w-12 border-2 border-gold bg-black/35 text-gold2 shadow-[0_0_22px_rgba(231,201,138,0.85)]"
              : "h-9 w-9 border border-gold/55 bg-white/10 text-gold2/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
        }`}
      >
        {done ? "✓" : live ? "✦" : <Lock />}
      </span>
      {live && (
        <span
          className={`pointer-events-none absolute top-1/2 max-w-[92px] -translate-y-1/2 truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-gold2 backdrop-blur ${
            labelLeft ? "right-[118%]" : "left-[118%]"
          }`}
        >
          {node.title}
        </span>
      )}
    </button>
  );
}

function Lock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="2.2" y="5.2" width="7.6" height="5.2" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3.8 5.1V3.7a2.2 2.2 0 0 1 4.4 0v1.4" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
