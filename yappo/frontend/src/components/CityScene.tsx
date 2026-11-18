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

/** Hand-traced on the painted cobbles, bottom (start) to top (later trials). */
export const PATHS: Record<string, { x: number; y: number }[]> = {
  paris: [
    { x: 49, y: 78 },
    { x: 58, y: 69 },
    { x: 44, y: 61 },
    { x: 60, y: 53 },
    { x: 50, y: 45 },
    { x: 57, y: 37 },
    { x: 49, y: 29 },
    { x: 54, y: 22 },
  ],
  london: [
    { x: 50, y: 78 },
    { x: 60, y: 70 },
    { x: 70, y: 62 },
    { x: 64, y: 54 },
    { x: 72, y: 46 },
    { x: 66, y: 38 },
    { x: 58, y: 30 },
    { x: 52, y: 23 },
  ],
  madrid: [
    { x: 47, y: 80 },
    { x: 40, y: 70 },
    { x: 48, y: 62 },
    { x: 56, y: 54 },
    { x: 50, y: 46 },
    { x: 47, y: 38 },
    { x: 51, y: 30 },
    { x: 49, y: 23 },
  ],
  berlin: [
    { x: 40, y: 80 },
    { x: 50, y: 71 },
    { x: 58, y: 63 },
    { x: 54, y: 55 },
    { x: 46, y: 47 },
    { x: 52, y: 39 },
    { x: 57, y: 31 },
    { x: 60, y: 24 },
  ],
  beijing: [
    { x: 50, y: 80 },
    { x: 46, y: 70 },
    { x: 54, y: 62 },
    { x: 48, y: 54 },
    { x: 52, y: 46 },
    { x: 47, y: 38 },
    { x: 51, y: 30 },
    { x: 49, y: 23 },
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

export function CityScene({ language = "fr" }: { language?: string }) {
  const city = cityOf(language);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1c140f]">
      <motion.img
        src={`/art/${city}-720.webp`}
        srcSet={`/art/${city}-360.webp 360w, /art/${city}-540.webp 540w, /art/${city}-720.webp 720w`}
        sizes="100vw"
        alt=""
        className="absolute inset-0 h-[108%] w-full max-w-none object-cover"
        initial={{ scale: 1.04, y: 0 }}
        animate={{ scale: 1.08, y: [0, -10, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/50" />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent"
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#120e0b]/80 to-transparent" />
    </div>
  );
}
