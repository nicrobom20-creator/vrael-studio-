import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, haptic } from "../api";
import { cityOf, pathSpots } from "../components/CityScene";
import { Companion } from "../components/Companion";
import { TopStats } from "../components/Shell";
import { prefersReducedMotion, takeUnlock } from "../lib/motion";
import { useApp } from "../state";
import type { Chapter, MascotId, PathData, PathNode } from "../types";

export function MapScreen() {
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const [path, setPath] = useState<PathData | null>(null);
  const [unlock, setUnlock] = useState<{ from: string; to: string; leg: 0 | 1 } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<PathData>("/api/path").then((data) => {
      setPath(data);
      const pending = takeUnlock();
      if (pending) setUnlock({ ...pending, leg: 0 });
    }).catch((error: Error) => notify(error.message));
  }, [user?.language]);

  useEffect(() => {
    if (!path) return;
    const frame = window.requestAnimationFrame(() => settleAboveCta());
    return () => window.cancelAnimationFrame(frame);
  }, [path, unlock?.leg]);

  useEffect(() => {
    if (!unlock) return;
    haptic("success");
    if (prefersReducedMotion()) {
      setUnlock(null);
      return;
    }
    const run = window.setTimeout(() => setUnlock((value) => (value ? { ...value, leg: 1 } : value)), 900);
    const done = window.setTimeout(() => setUnlock(null), 1500);
    return () => {
      window.clearTimeout(run);
      window.clearTimeout(done);
    };
  }, [unlock?.from]);

  if (!user || !path) {
    return <div className="grid min-h-dvh place-items-center text-cream/70">Собираем острова…</div>;
  }
  const mascot = (user.mascot || "parrot") as MascotId;
  const active = path.chapters.find((chapter) => chapter.unlocked && !chapter.complete) || path.chapters[path.chapters.length - 1];

  return (
    <div id="map-scroller" ref={scroller} className="h-dvh overflow-y-auto overflow-x-hidden">
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
          unlock={unlock}
          onOpen={(node) => openNode(node, navigate, notify)}
        />
      ))}
      <div className="h-28" />
    </div>
  );
}

function settleAboveCta() {
  const scroller = document.getElementById("map-scroller");
  const node = document.getElementById("node-current");
  const cta = document.getElementById("map-cta");
  const companion = document.querySelector("[data-companion='current']");
  if (!scroller || !node) return;
  const limit = (cta?.getBoundingClientRect().top ?? window.innerHeight - 160) - 64;
  const bottoms = [node.getBoundingClientRect().bottom];
  if (companion) {
    bottoms.push(companion.getBoundingClientRect().bottom);
    companion.querySelectorAll("img").forEach((img) => bottoms.push(img.getBoundingClientRect().bottom));
  }
  const overflow = Math.max(...bottoms) - limit;
  if (overflow > 4) scroller.scrollTop += overflow;
}

function ChapterBand({
  chapter,
  language,
  mascot,
  line,
  unlock,
  onOpen,
}: {
  chapter: Chapter;
  language: string;
  mascot: MascotId;
  line: string;
  unlock: { from: string; to: string; leg: 0 | 1 } | null;
  onOpen: (node: PathNode) => void;
}) {
  const spots = pathSpots(language, chapter.nodes.length);
  const current = chapter.nodes.find((node) => node.status === "current");
  const currentIndex = current ? chapter.nodes.indexOf(current) : -1;
  const fromIndex = unlock ? chapter.nodes.findIndex((node) => node.id === unlock.from) : -1;
  const toIndex = unlock ? chapter.nodes.findIndex((node) => node.id === unlock.to) : -1;
  const travel = fromIndex >= 0 && toIndex >= 0;
  const companionIndex = travel ? (unlock?.leg === 0 ? fromIndex : toIndex) : currentIndex;
  const companionSpot = companionIndex >= 0 ? spots[companionIndex] : null;
  const d = spots.map((spot, index) => `${index === 0 ? "M" : "L"} ${spot.x} ${spot.y}`).join(" ");
  const city = cityOf(language);
  const art = `/art/${city}-720.webp`;

  return (
    <section id={`chapter-${chapter.id}`} className="relative">
      <div className="relative w-full overflow-hidden" style={{ height: "calc(142vw * 1280 / 720)" }}>
        <div className="absolute left-1/2 top-0 h-full w-[142%] -translate-x-1/2">
        <img
          src={art}
          alt=""
          decoding="async"
          loading={chapter.index === 1 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" />
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d={d} fill="none" stroke="rgba(255, 214, 140, 0.4)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={d} fill="none" stroke="rgba(255, 244, 214, 0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {chapter.nodes.map((node, index) => (
          <Node
            key={node.id}
            node={node}
            spot={spots[index]}
            breaking={unlock?.to === node.id && unlock.leg === 0}
            onOpen={() => onOpen(node)}
          />
        ))}
        {unlock?.to && toIndex >= 0 && unlock.leg === 0 && (
          <span
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 text-gold2"
            style={{ left: `${spots[toIndex].x}%`, top: `${spots[toIndex].y}%` }}
          >
            ✦
          </span>
        )}
        {companionSpot && (
          <motion.div
            data-companion="current"
            className="pointer-events-none absolute z-20 h-32 w-28"
            animate={{
              left: `${Math.max(0, companionSpot.x - 22)}%`,
              top: `${companionSpot.y - 7}%`,
            }}
            transition={prefersReducedMotion() ? { duration: 0 } : { type: "spring", stiffness: travel ? 50 : 70, damping: 16 }}
          >
            <Companion mascot={mascot} pose={travel && unlock?.leg === 1 ? "run" : "point"} />
          </motion.div>
        )}
        </div>
      </div>
      <div className="relative h-[46vh] overflow-hidden">
        <img
          src={art}
          alt=""
          className="absolute bottom-0 left-1/2 h-[155%] w-[142%] max-w-none -translate-x-1/2 object-cover object-bottom"
          style={{ filter: "blur(8px) brightness(0.62) saturate(0.9)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a120e]/20 via-[#120e0b]/28 to-[#0b0907]/75" />
      </div>
      {current && (
        <div id="map-cta" className="fixed inset-x-3 bottom-[96px] z-30 flex items-center gap-2">
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

function Node({ node, spot, breaking, onOpen }: { node: PathNode; spot: { x: number; y: number }; breaking?: boolean; onOpen: () => void }) {
  const live = node.status === "current";
  const done = node.status === "done";
  const labelLeft = spot.x > 62;
  return (
    <button
      onClick={onOpen}
      id={live ? "node-current" : undefined}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 scroll-my-36"
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
      {breaking && (
        <span className="lock-break pointer-events-none absolute inset-0 grid place-items-center text-gold2">
          <Lock />
        </span>
      )}
      {live && (
        <span
          className={`pointer-events-none absolute top-1/2 max-w-[132px] -translate-y-1/2 whitespace-normal text-left leading-tight rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-gold2 backdrop-blur ${
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
