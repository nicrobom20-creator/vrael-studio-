import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Companion } from "../components/Companion";
import { TopStats } from "../components/Shell";
import { Fireflies, GoldButton, WorldBackdrop } from "../components/World";
import { useApp } from "../state";
import type { Chapter, MascotId, PathData, PathNode } from "../types";

const FOCUS: Record<string, string> = {
  en: "16% 30%",
  es: "40% 46%",
  de: "18% 74%",
  fr: "68% 36%",
  zh: "86% 30%",
};

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

  return (
    <div className="relative min-h-dvh nav-safe">
      <WorldBackdrop src="/art/key-art.jpg" focus={FOCUS[user.language] || "center"}>
        <Fireflies language={user.language} />
      </WorldBackdrop>
      <TopStats
        title={chapter.title}
        subtitle={`${path.language.city} · Уровень ${user.level}`}
        xp={user.xp}
        streak={user.streak}
      />
      <div className="absolute inset-x-0 bottom-[92px] z-20 px-3">
        <div className="glass p-4">
          <div className="flex items-center gap-3">
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} className="h-16 w-16 shrink-0">
              <Companion mascot={mascot} pose={current ? "run" : "celebrate"} />
            </motion.div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gold2">Глава {chapter.index}</div>
              <div className="font-display text-2xl leading-none">{chapter.title}</div>
              <p className="mt-1 text-sm text-cream/75">{path.mascot_line}</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-cream/60">
            {chapter.lessons_done} / {chapter.lessons_total} испытаний
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f6e6bf] to-[#b8893e]"
              style={{ width: `${chapter.lessons_total ? (chapter.lessons_done / chapter.lessons_total) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {chapter.nodes.map((node) => (
              <Node key={node.id} node={node} onOpen={() => openNode(node, navigate, notify)} />
            ))}
          </div>
          {current && (
            <div className="mt-3">
              <GoldButton onClick={() => openNode(current, navigate, notify)}>
                {current.kind === "story" ? "К сцене" : "К вратам"}
              </GoldButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function openNode(node: PathNode, navigate: (path: string) => void, notify: (message: string) => void) {
  if (node.status === "locked") {
    notify("Сначала предыдущие врата.");
    return;
  }
  navigate(node.kind === "story" ? `/story/${node.id}` : `/trial/${node.id}`);
}

function Node({ node, onOpen }: { node: PathNode; onOpen: () => void }) {
  const live = node.status === "current";
  return (
    <button onClick={onOpen} className="w-[72px] shrink-0 text-center">
      <div className={`orb mx-auto ${live ? "orb-live" : ""} ${node.status === "locked" ? "opacity-45" : ""}`}>
        <span className="text-sm text-[#2a1c0a]">{node.status === "done" ? "✓" : node.status === "locked" ? "•" : "✦"}</span>
      </div>
      <div className="mt-1 line-clamp-2 text-[10px] leading-tight text-cream/80">{node.title}</div>
    </button>
  );
}

export function chapterOf(path: PathData | null, id: string): Chapter | undefined {
  return path?.chapters.find((chapter) => chapter.nodes.some((node) => node.id === id));
}
