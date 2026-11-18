import { motion } from "framer-motion";

const CITY: Record<string, string> = {
  en: "london",
  fr: "paris",
  es: "madrid",
  de: "berlin",
  zh: "beijing",
  world: "paris",
};

export function cityOf(language: string) {
  return CITY[language] || "paris";
}

/**
 * Percent positions inside a chapter band whose background is the painting
 * anchored to the bottom and 158% tall, so only the cobbled path is in frame.
 * First point is the start of the path (foreground), last is farther up the stones.
 */
export const PATHS: Record<string, { x: number; y: number }[]> = {
  paris: [
    { x: 48, y: 70 },
    { x: 56, y: 65 },
    { x: 46, y: 60 },
    { x: 57, y: 55 },
    { x: 50, y: 50 },
    { x: 56, y: 45 },
    { x: 49, y: 40 },
  ],
  london: [
    { x: 54, y: 70 },
    { x: 62, y: 65 },
    { x: 70, y: 60 },
    { x: 64, y: 55 },
    { x: 72, y: 50 },
    { x: 66, y: 45 },
    { x: 58, y: 40 },
  ],
  madrid: [
    { x: 46, y: 70 },
    { x: 42, y: 65 },
    { x: 48, y: 60 },
    { x: 55, y: 55 },
    { x: 50, y: 50 },
    { x: 46, y: 45 },
    { x: 51, y: 40 },
  ],
  berlin: [
    { x: 44, y: 70 },
    { x: 50, y: 65 },
    { x: 57, y: 60 },
    { x: 53, y: 55 },
    { x: 48, y: 50 },
    { x: 55, y: 45 },
    { x: 60, y: 40 },
  ],
  beijing: [
    { x: 50, y: 70 },
    { x: 46, y: 65 },
    { x: 54, y: 60 },
    { x: 48, y: 55 },
    { x: 52, y: 50 },
    { x: 47, y: 45 },
    { x: 51, y: 40 },
  ],
};

export function pathSpots(language: string, count: number) {
  const city = cityOf(language);
  const line = PATHS[city] || PATHS.paris;
  if (count <= line.length) return line.slice(0, count);
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    const pos = t * (line.length - 1);
    const i = Math.floor(pos);
    const f = pos - i;
    const a = line[i];
    const b = line[Math.min(line.length - 1, i + 1)];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  });
}

export function CityScene({ language = "fr", pathFrame = false }: { language?: string; pathFrame?: boolean }) {
  const city = cityOf(language);
  const src = `/art/${city}-720.webp`;
  const srcSet = `/art/${city}-360.webp 360w, /art/${city}-540.webp 540w, /art/${city}-720.webp 720w`;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1c140f]">
      <img
        src={src}
        srcSet={srcSet}
        sizes="100vw"
        alt=""
        className={
          pathFrame
            ? "absolute bottom-0 left-1/2 h-[162%] w-auto max-w-none -translate-x-1/2"
            : "absolute inset-0 h-full w-full object-cover"
        }
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/35" />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-[18%] h-24 bg-gradient-to-b from-white/10 to-transparent"
        animate={{ opacity: [0.12, 0.28, 0.12], y: [0, 12, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#120e0b]/70 to-transparent" />
    </div>
  );
}
