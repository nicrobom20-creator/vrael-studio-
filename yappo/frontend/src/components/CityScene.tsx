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
 * Percent of the full painting, foreground first, landmark last.
 * Sampled across the whole curve so the final node sits by the landmark.
 */
export const PATHS: Record<string, { x: number; y: number }[]> = {
  paris: [
    { x: 52, y: 94 },
    { x: 60, y: 82 },
    { x: 56, y: 70 },
    { x: 55, y: 58 },
    { x: 57, y: 46 },
    { x: 62, y: 34 },
    { x: 72, y: 24 },
  ],
  london: [
    { x: 54, y: 94 },
    { x: 58, y: 82 },
    { x: 62, y: 70 },
    { x: 64, y: 58 },
    { x: 66, y: 46 },
    { x: 65, y: 34 },
    { x: 63, y: 23 },
  ],
  madrid: [
    { x: 49, y: 94 },
    { x: 48, y: 82 },
    { x: 50, y: 70 },
    { x: 51, y: 58 },
    { x: 52, y: 46 },
    { x: 54, y: 34 },
    { x: 66, y: 23 },
  ],
  berlin: [
    { x: 46, y: 94 },
    { x: 52, y: 82 },
    { x: 56, y: 70 },
    { x: 58, y: 58 },
    { x: 60, y: 46 },
    { x: 64, y: 34 },
    { x: 72, y: 24 },
  ],
  beijing: [
    { x: 51, y: 94 },
    { x: 50, y: 82 },
    { x: 52, y: 70 },
    { x: 52, y: 58 },
    { x: 53, y: 46 },
    { x: 54, y: 34 },
    { x: 60, y: 24 },
  ],
};

export function pathSpots(language: string, count: number) {
  const line = PATHS[cityOf(language)] || PATHS.paris;
  if (count <= 1) return [line[0]];
  return Array.from({ length: count }, (_, index) => {
    const pos = (index / (count - 1)) * (line.length - 1);
    const i = Math.min(line.length - 2, Math.floor(pos));
    const f = pos - i;
    const a = line[i];
    const b = line[i + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  });
}

export function CityScene({ language = "fr", eager = true }: { language?: string; eager?: boolean }) {
  const city = cityOf(language);
  const src = `/art/${city}-540.webp`;
  const srcSet = `/art/${city}-360.webp 360w, /art/${city}-540.webp 540w, /art/${city}-720.webp 720w`;
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1c140f]">
      <img
        src={src}
        srcSet={srcSet}
        sizes="100vw"
        alt=""
        decoding="async"
        fetchPriority={eager ? "high" : "low"}
        loading={eager ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover"
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
