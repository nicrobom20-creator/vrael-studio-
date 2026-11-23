import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, haptic } from "../api";
import { cityOf, pathSpots } from "../components/CityScene";
import { Companion } from "../components/Companion";
import { TopStats } from "../components/Shell";
import { prefersReducedMotion, takeUnlock } from "../lib/motion";
import { sfx, startAmbient } from "../lib/sound";
import { useApp } from "../state";
import type { Chapter, MascotId, PathData, PathNode } from "../types";

const JOURNEY = ["london", "newyork", "sydney"];
const CITY_NAME: Record<string, string> = {
  london: "Лондон",
  newyork: "Нью-Йорк",
  sydney: "Сидней",
  paris: "Париж",
  madrid: "Мадрид",
  berlin: "Берлин",
  beijing: "Пекин",
};

function cityFor(language: string, index: number) {
  if (language === "en") return JOURNEY[Math.min(index, JOURNEY.length - 1)];
  return cityOf(language);
}

export function MapScreen() {
  const { user, notify } = useApp();
  const navigate = useNavigate();
  const [path, setPath] = useState<PathData | null>(null);
  const [unlock, setUnlock] = useState<{ from: string; to: string; leg: 0 | 1 | 2 } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<PathData>("/api/path").then((data) => {
      setPath(data);
      const pending = takeUnlock();
      if (pending) setUnlock({ ...pending, leg: 0 });
    }).catch((error: Error) => notify(error.message));
  }, [user?.language]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const glow = light.current;
        const veil = sky.current;
        if (!glow) return;
        const max = el.scrollHeight - el.clientHeight || 1;
        const progress = el.scrollTop / max;
        glow.style.transform = `translate3d(${(progress - 0.5) * 80}px, ${progress * 28}vh, 0)`;
        if (veil && !prefersReducedMotion()) {
          veil.style.transform = `translate3d(0, ${progress * -48}px, 0)`;
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [path]);

  useEffect(() => {
    if (!path) return;
    const frame = window.requestAnimationFrame(() => followCurrent(scroller.current));
    return () => window.cancelAnimationFrame(frame);
  }, [path, unlock?.leg]);

  useEffect(() => {
    if (!unlock) return;
    haptic("success");
    sfx("win");
    if (prefersReducedMotion()) {
      setUnlock(null);
      return;
    }
    const run = window.setTimeout(() => setUnlock((value) => (value ? { ...value, leg: 1 } : value)), 480);
    const wave = window.setTimeout(() => {
      haptic("medium");
      setUnlock((value) => (value ? { ...value, leg: 2 } : value));
    }, 1500);
    const done = window.setTimeout(() => setUnlock(null), 2400);
    return () => {
      window.clearTimeout(run);
      window.clearTimeout(wave);
      window.clearTimeout(done);
    };
  }, [unlock?.from]);

  if (!user || !path) {
    return <div className="grid min-h-dvh place-items-center text-cream/70">Собираем карту…</div>;
  }
  const mascot = (user.mascot || "parrot") as MascotId;
  const active = path.chapters.find((chapter) => chapter.unlocked && !chapter.complete) || path.chapters[path.chapters.length - 1];

  return (
    <div
      id="map-scroller"
      ref={scroller}
      className="world-scroll h-dvh overflow-y-auto overflow-x-hidden"
      onPointerDown={() => startAmbient()}
    >
      <div ref={light} className="hero-light" />
      <div ref={sky} className="hero-sky" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="mote" style={{ left: "18%" }} />
        <span className="mote mote-b" style={{ left: "70%" }} />
      </div>
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#120e0b]/80 to-transparent pb-2">
        <TopStats
          title={active.title}
          subtitle={`${CITY_NAME[cityFor(user.language, active.index - 1)] || path.language.city} · Уровень ${user.level}`}
          xp={user.xp}
          streak={user.streak}
          studied={user.usage.studied_minutes}
          goal={user.daily_goal}
        />
      </div>
      {path.chapters.map((chapter, index) => (
        <ChapterBand
          key={chapter.id}
          chapter={chapter}
          city={cityFor(user.language, index)}
          joined={index > 0}
          mascot={mascot}
          pet={user.pet?.code}
          line={chapter.id === active.id ? path.mascot_line : chapter.subtitle}
          unlock={unlock}
          onOpen={(node) => openNode(node, navigate, notify)}
        />
      ))}
      <div className="h-28" />
    </div>
  );
}

function followCurrent(scroller: HTMLDivElement | null) {
  const node = document.getElementById("node-current");
  if (!scroller || !node) return;
  const top = node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - scroller.clientHeight * 0.42;
  if (prefersReducedMotion()) {
    scroller.scrollTop = top;
    return;
  }
  const start = scroller.scrollTop;
  const delta = top - start;
  const began = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - began) / 700);
    const eased = 1 - (1 - progress) ** 3;
    scroller.scrollTop = start + delta * eased;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function ChapterBand({
  chapter,
  city,
  joined,
  mascot,
  pet,
  line,
  unlock,
  onOpen,
}: {
  chapter: Chapter;
  city: string;
  joined: boolean;
  mascot: MascotId;
  pet?: string;
  line: string;
  unlock: { from: string; to: string; leg: 0 | 1 | 2 } | null;
  onOpen: (node: PathNode) => void;
}) {
  const spots = pathSpots(city === "newyork" || city === "sydney" ? "london" : city, chapter.nodes.length);
  const current = chapter.nodes.find((node) => node.status === "current");
  const currentIndex = current ? chapter.nodes.indexOf(current) : -1;
  const fromIndex = unlock ? chapter.nodes.findIndex((node) => node.id === unlock.from) : -1;
  const toIndex = unlock ? chapter.nodes.findIndex((node) => node.id === unlock.to) : -1;
  const incoming = Boolean(unlock && toIndex >= 0 && fromIndex < 0);
  const travel = (fromIndex >= 0 && toIndex >= 0) || incoming;
  const companionIndex = travel ? (unlock?.leg === 0 && fromIndex >= 0 ? fromIndex : toIndex) : currentIndex;
  const baseSpot = companionIndex >= 0 ? spots[companionIndex] : null;
  const companionSpot = incoming && unlock?.leg === 0 && baseSpot
    ? { x: baseSpot.x, y: Math.max(6, baseSpot.y - 16) }
    : baseSpot;
  const d = spots.map((spot, index) => `${index === 0 ? "M" : "L"} ${spot.x} ${spot.y}`).join(" ");
  const pose = unlock?.leg === 0 && travel ? "jump" : unlock?.leg === 1 && travel ? "run" : unlock?.leg === 2 ? "wave" : "point";

  return (
    <section id={`chapter-${chapter.id}`} className={`relative ${joined ? "city-join" : ""}`}>
      <div className="relative aspect-[9/16] w-full overflow-hidden">
        <img
          src={`/art/${city}-540.webp`}
          srcSet={`/art/${city}-360.webp 360w, /art/${city}-540.webp 540w, /art/${city}-720.webp 720w`}
          sizes="100vw"
          alt=""
          decoding="async"
          loading={chapter.index === 1 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-black/45 px-3 py-1 text-[11px] text-gold2 backdrop-blur">
          {CITY_NAME[city] || city}
        </div>
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
        {companionSpot && (
          <motion.div
            data-companion="current"
            className="pointer-events-none absolute z-20 h-32 w-28"
            animate={{ left: `${Math.max(0, companionSpot.x - 22)}%`, top: `${companionSpot.y - 7}%` }}
            transition={prefersReducedMotion() ? { duration: 0 } : { type: "spring", stiffness: travel ? 46 : 70, damping: 16 }}
          >
            <Companion mascot={mascot} pose={pose} pet={pet} />
          </motion.div>
        )}
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
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 active:scale-95"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      aria-label={node.title}
    >
      <span
        className={`grid place-items-center rounded-full border backdrop-blur-md ${
          done
            ? "h-9 w-9 border-gold bg-gradient-to-b from-[#f6e6bf] to-[#b8893e] text-[#2a1c0a]"
            : live
              ? "orb-live h-12 w-12 border-2 border-gold bg-black/35 text-gold2 shadow-[0_0_22px_rgba(231,201,138,0.85)]"
              : "h-9 w-9 border border-gold/55 bg-white/10 text-gold2/80"
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
        <span className={`pointer-events-none absolute top-1/2 max-w-[132px] -translate-y-1/2 rounded-full bg-black/55 px-2 py-0.5 text-left text-[10px] leading-tight text-gold2 backdrop-blur ${labelLeft ? "right-[118%]" : "left-[118%]"}`}>
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
