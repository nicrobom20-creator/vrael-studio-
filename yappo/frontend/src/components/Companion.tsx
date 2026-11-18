import { lazy, Suspense, useEffect, useState } from "react";
import type { MascotId, Pose } from "../types";
import { PlaceholderCompanion } from "./PlaceholderCompanion";

const RiveCompanion = lazy(() => import("./RiveCompanion").then((module) => ({ default: module.RiveCompanion })));

const cache = new Map<string, boolean>();

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
  const src = rivSrc || `/rive/${mascot}.riv`;
  const [mode, setMode] = useState<"svg" | "rive">(cache.get(src) ? "rive" : "svg");

  useEffect(() => {
    if (cache.has(src)) {
      setMode(cache.get(src) ? "rive" : "svg");
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
      <Suspense fallback={<div className={`companion-stage pose-${pose} ${className}`}><PlaceholderCompanion mascot={mascot} /></div>}>
        <RiveCompanion
          src={src}
          pose={pose}
          className={`companion-stage ${className}`}
          onError={() => {
            cache.set(src, false);
            setMode("svg");
          }}
        />
      </Suspense>
    );
  }
  return (
    <div className={`companion-stage pose-${pose} ${className}`}>
      <PlaceholderCompanion mascot={mascot} />
    </div>
  );
}
