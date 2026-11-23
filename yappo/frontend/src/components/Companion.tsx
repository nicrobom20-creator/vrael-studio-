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
}: {
  mascot: MascotId;
  pose?: Pose;
  className?: string;
  rivSrc?: string;
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
      <Suspense fallback={<Painted mascot={mascot} pose={pose} className={className} />}>
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
  return <Painted mascot={mascot} pose={pose} className={className} />;
}

function Painted({ mascot, pose, className }: { mascot: MascotId; pose: Pose; className: string }) {
  const shot = SHOT[pose];
  const celebrate = shot === "celebrate";
  const leading = pose === "point" || pose === "run";
  return (
    <motion.img
      src={`/mascots/${mascot}-${shot}.webp`}
      alt=""
      draggable={false}
      className={`h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.45)] ${className}`}
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
  );
}
