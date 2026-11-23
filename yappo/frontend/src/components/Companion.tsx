import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { MascotId, Pose } from "../types";

const RiveCompanion = lazy(() => import("./RiveCompanion").then((module) => ({ default: module.RiveCompanion })));

const cache = new Map<string, boolean>();

const SHOT: Record<Pose, "idle" | "point" | "celebrate"> = {
  idle: "idle",
  wave: "idle",
  think: "idle",
  point: "point",
  run: "point",
  jump: "celebrate",
  celebrate: "celebrate",
};

export function Companion({
  mascot,
  pose = "idle",
  className = "",
  rivSrc,
  outfit = "",
  pet = "sprout",
  tint = "",
}: {
  mascot: MascotId;
  pose?: Pose;
  className?: string;
  rivSrc?: string;
  outfit?: string;
  pet?: string;
  tint?: string;
}) {
  const src = rivSrc || "";
  const [mode, setMode] = useState<"art" | "rive">(src && cache.get(src) ? "rive" : "art");

  useEffect(() => {
    if (!src) {
      setMode("art");
      return;
    }
    if (cache.has(src)) {
      setMode(cache.get(src) ? "rive" : "art");
      return;
    }
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((response) => {
        const type = response.headers.get("content-type") || "";
        const ok = response.ok && !type.includes("text/html");
        cache.set(src, ok);
        if (!cancelled && ok) setMode("rive");
      })
      .catch(() => {
        cache.set(src, false);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (mode === "rive") {
    return (
      <Suspense fallback={<Painted mascot={mascot} pose={pose} className={className} outfit={outfit} />}>
        <RiveCompanion
          src={src}
          pose={pose}
          className={className}
          onError={() => {
            cache.set(src, false);
            setMode("art");
          }}
        />
      </Suspense>
    );
  }
  return <Painted mascot={mascot} pose={pose} className={className} outfit={outfit} pet={pet} tint={tint} />;
}

const PET_SCALE: Record<string, number> = { sprout: 0.82, cub: 0.92, grown: 1, elder: 1.08 };

const TINT: Record<string, string> = {
  gold: "sepia(0.45) saturate(1.5)",
  rose: "hue-rotate(-25deg) saturate(1.25)",
  sea: "hue-rotate(150deg) saturate(0.85)",
};

function Painted({ mascot, pose, className, outfit = "", pet = "sprout", tint = "" }: { mascot: MascotId; pose: Pose; className: string; outfit?: string; pet?: string; tint?: string }) {
  const shot = SHOT[pose];
  const celebrate = shot === "celebrate";
  const leading = pose === "point" || pose === "run";
  return (
    <div className={`relative h-full w-full ${className}`} style={{ transform: `scale(${PET_SCALE[pet] || 1})`, transformOrigin: "center bottom" }}>
    <motion.img
      src={`/mascots/${mascot}-${shot}.webp`}
      alt=""
      draggable={false}
      className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.45)]"
      style={tint && TINT[tint] ? { filter: TINT[tint] } : undefined}
      initial={leading ? { x: 28, opacity: 0 } : celebrate ? { y: 16, scale: 0.92 } : { y: 0 }}
      animate={
        celebrate
          ? { y: [12, -26, 0], scale: [0.96, 1.06, 1], opacity: 1 }
          : leading
            ? { x: 0, opacity: 1, y: [0, -5, 0] }
            : { y: [0, -8, 0], scale: [1, 1.025, 1] }
      }
      transition={
        celebrate
          ? { duration: 0.7, ease: "easeOut" }
          : leading
            ? { x: { duration: 0.45 }, y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }
            : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
      }
    />
    <Outfit id={outfit} />
    </div>
  );
}

function Outfit({ id }: { id: string }) {
  if (id === "ribbon") {
    return <span className="pointer-events-none absolute bottom-[18%] left-[28%] right-[28%] h-[10%] rounded-full bg-[#c45b6a]" />;
  }
  if (id === "scarf") {
    return <span className="pointer-events-none absolute bottom-[16%] left-[22%] right-[22%] h-[16%] rounded-[40%] bg-[#3d6b8a]" />;
  }
  if (id === "star") {
    return <span className="pointer-events-none absolute right-[18%] top-[22%] text-lg text-gold2">✦</span>;
  }
  if (id === "cape") {
    return <span className="pointer-events-none absolute bottom-[8%] left-[12%] right-[12%] top-[34%] rounded-b-[40%] bg-[#7a2d3b]/80" />;
  }
  if (id === "crown") {
    return <span className="pointer-events-none absolute left-[30%] right-[30%] top-[6%] h-[12%] rounded-t-full border-2 border-[#e7c98a] bg-[#f6e6bf]/80" />;
  }
  if (id === "lantern") {
    return <span className="pointer-events-none absolute bottom-[28%] right-[8%] h-4 w-3 rounded-full bg-[#f6e6bf] shadow-[0_0_12px_#e7c98a]" />;
  }
  return null;
}
