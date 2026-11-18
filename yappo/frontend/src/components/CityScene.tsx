import { motion } from "framer-motion";

const CITY: Record<string, "london" | "paris" | "madrid" | "berlin" | "beijing" | "world"> = {
  en: "london",
  fr: "paris",
  es: "madrid",
  de: "berlin",
  zh: "beijing",
  world: "world",
};

export function cityOf(language: string) {
  return CITY[language] || "world";
}

export function CityScene({ language = "world" }: { language?: string }) {
  const city = cityOf(language);
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#140e0b]">
      <Sky city={city} />
      <motion.div
        className="absolute inset-0"
        animate={{ x: [0, -18, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 390 844" className="h-full w-[112%] max-w-none" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <Far city={city} />
        </svg>
      </motion.div>
      <motion.div
        className="absolute inset-0"
        animate={{ x: [0, -8, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 390 844" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <Mid city={city} />
        </svg>
      </motion.div>
      <svg viewBox="0 0 390 844" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <Near city={city} />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[#0c0907]/80" />
    </div>
  );
}

function Sky({ city }: { city: string }) {
  const stops: Record<string, [string, string, string]> = {
    london: ["#f0c48a", "#e7a0a8", "#6d87b8"],
    paris: ["#f6d7a2", "#e8a48a", "#7f6ea8"],
    madrid: ["#ffe0a3", "#f0a36a", "#c46b62"],
    berlin: ["#f3d2a4", "#d9a0b4", "#5e7194"],
    beijing: ["#f8d7ae", "#e7a98a", "#8a6a78"],
    world: ["#f6dcb4", "#e7b08a", "#6f86b0"],
  };
  const [a, b, c] = stops[city] || stops.world;
  return (
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(180deg, ${a} 0%, ${b} 38%, ${c} 100%)` }}
    />
  );
}

function Far({ city }: { city: string }) {
  if (city === "london") {
    return (
      <g>
        <path d="M0 430h390v80H0z" fill="#c9846a" opacity="0.35" />
        <path d="M40 250h28v180h-28z" fill="#8d5a55" />
        <path d="M46 230h16v22h-16z" fill="#a86a58" />
        <circle cx="54" cy="248" r="7" fill="#f6e2b0" opacity="0.85" />
        <path d="M120 300h90v130h-90z" fill="#7d4e52" />
        <path d="M250 270h70v160h-70z" fill="#6d4a58" />
        <path d="M0 420c40-20 80-8 120-24s90-10 140 8 90 6 130-16v40H0z" fill="#c47a62" opacity="0.55" />
      </g>
    );
  }
  if (city === "paris") {
    return (
      <g>
        <path d="M30 320h40v110h-40z" fill="#8a5a62" />
        <path d="M36 300h28l14 22H22z" fill="#a46a68" />
        <path d="M168 180l28 150h-56z" fill="#6e4a58" />
        <path d="M148 250h68M156 290h52M164 330h36" stroke="#e7c9a0" strokeWidth="2" opacity="0.45" />
        <path d="M250 300h50v130h-50z" fill="#7a4e58" />
        <path d="M255 286h40l8 16h-56z" fill="#c48474" />
      </g>
    );
  }
  if (city === "madrid") {
    return (
      <g>
        <circle cx="300" cy="150" r="46" fill="#ffe0a0" opacity="0.9" />
        <path d="M20 300h70v130H20z" fill="#c46a48" />
        <path d="M100 270h90v160h-90z" fill="#a85440" />
        <path d="M210 310h60v120h-60z" fill="#b85e42" />
        <path d="M110 250h70l10 22H100z" fill="#e08a58" />
      </g>
    );
  }
  if (city === "berlin") {
    return (
      <g>
        <path d="M40 310h80v120H40z" fill="#6a5360" />
        <path d="M150 280h100v150H150z" fill="#5c4a58" />
        <path d="M300 200h8v210h-8z" fill="#4a4254" />
        <circle cx="304" cy="188" r="22" fill="#d7c2b0" />
        <circle cx="304" cy="188" r="8" fill="#6a5a62" />
        <path d="M20 360h50v70H20zM90 340h40v90H90z" fill="#7a5c62" />
      </g>
    );
  }
  if (city === "beijing") {
    return (
      <g>
        <path d="M40 280c40-30 80-20 120 0s90 20 140-10v40H40z" fill="#c48a78" opacity="0.45" />
        <path d="M70 250c30 18 70 18 100 0v70H70z" fill="#8a4038" />
        <path d="M60 248c20-16 40-22 60-18 20-8 50-6 70 16" fill="none" stroke="#e8c49a" strokeWidth="6" />
        <path d="M220 270c40 10 70 6 100-12v80H220z" fill="#7a3834" />
        <circle cx="300" cy="160" r="28" fill="#f6e2c0" opacity="0.7" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="70" cy="360" rx="54" ry="18" fill="#6a5348" opacity="0.35" />
      <ellipse cx="200" cy="300" rx="70" ry="20" fill="#6a5348" opacity="0.3" />
      <ellipse cx="320" cy="380" rx="48" ry="16" fill="#6a5348" opacity="0.3" />
      <path d="M40 330h36v28H40z" fill="#8a5a52" />
      <path d="M170 270h50v36h-50z" fill="#7a4e58" />
      <path d="M176 252h38l6 18h-50z" fill="#c4846a" />
      <path d="M290 350h28v22h-28z" fill="#a86a58" />
    </g>
  );
}

function Mid({ city }: { city: string }) {
  const water = city === "madrid" ? "#e0a06a" : city === "beijing" ? "#d7b08a" : "#7f9cbc";
  return (
    <g>
      <path d="M0 520c60-30 120-10 180-28s120-8 210 20v80H0z" fill={water} opacity="0.55" />
      <path d="M0 548c80 16 140-8 210 6s120 10 180-12v40H0z" fill="#f6e2c4" opacity="0.18" />
      {city === "london" && <path d="M80 500v40M150 490v50M230 500v40" stroke="#5a403c" strokeWidth="6" />}
      {city === "paris" && <path d="M120 490c20 20 40 20 60 0v50h-60z" fill="#5c403c" opacity="0.7" />}
      {city === "berlin" && <path d="M60 470h180v20H60z" fill="#4a3c44" />}
      {city === "beijing" && <path d="M150 470c30 20 70 20 100 0v30H150z" fill="#6a3030" opacity="0.8" />}
      {Array.from({ length: 7 }).map((_, index) => (
        <circle key={index} cx={40 + index * 52} cy={430 + (index % 3) * 18} r="2.2" fill="#fff4d2" opacity="0.75" />
      ))}
    </g>
  );
}

function Near({ city }: { city: string }) {
  return (
    <g>
      <path d="M0 640c50-40 90-20 140-46s110-10 160 20 70 16 90-8v240H0z" fill="#3a2a28" />
      <path d="M0 690c80-24 120 10 190-8s110 20 200-16v180H0z" fill="#241816" />
      <path d="M24 700c10-30 26-40 36-18 8 18 4 40-10 48-18-6-28-12-26-30z" fill="#1c3a2c" />
      <path d="M300 680c16-36 34-28 28 8-8 20-24 24-34 8z" fill="#1c3a2c" />
      {city !== "world" && (
        <g>
          <path d="M48 760h8v40h-8z" fill="#2a211c" />
          <circle cx="52" cy="752" r="7" fill="#f6d48a" opacity="0.9" />
          <path d="M330 740h8v50h-8z" fill="#2a211c" />
          <circle cx="334" cy="732" r="7" fill="#f6d48a" opacity="0.75" />
        </g>
      )}
    </g>
  );
}
