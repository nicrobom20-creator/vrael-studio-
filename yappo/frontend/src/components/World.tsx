import { motion } from "framer-motion";
import type { ReactNode } from "react";

const WORDS: Record<string, string[]> = {
  en: ["hello", "listen", "speak", "discover", "please", "wonder"],
  fr: ["apprendre", "rêver", "écouter", "parler", "découvrir", "bonjour"],
  es: ["hola", "soñar", "escuchar", "hablar", "descubrir", "gracias"],
  de: ["hallo", "hören", "sprechen", "träumen", "danke", "bitte"],
  zh: ["你好", "听", "说", "学", "谢谢", "请"],
};

export function wordsFor(language: string) {
  return WORDS[language] || WORDS.en;
}

export function WorldBackdrop({
  src,
  focus = "center",
  scene = false,
  children,
}: {
  src: string;
  focus?: string;
  scene?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: scene ? "center 24%" : focus }}
        initial={{ scale: 1.05 }}
        animate={{ scale: 1.1, x: [0, -8, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: scene
            ? "linear-gradient(180deg, #0c0907 0%, rgba(12,9,7,.94) 8%, rgba(8,6,4,.28) 16%, rgba(8,6,4,.05) 34%, rgba(8,6,4,.2) 52%, rgba(12,9,7,.94) 72%, #0c0907 100%)"
            : undefined,
        }}
      />
      {!scene && <div className="vignette absolute inset-0" />}
      {children}
    </div>
  );
}

export function Fireflies({ language }: { language: string }) {
  const words = wordsFor(language);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {words.map((word, index) => (
        <span
          key={word}
          className="firefly"
          style={{
            left: `${8 + ((index * 17) % 74)}%`,
            top: `${14 + ((index * 13) % 42)}%`,
            fontSize: `${18 + (index % 3) * 6}px`,
            animationDuration: `${8 + index}s`,
            animationDelay: `${index * 0.6}s`,
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

export function StarBurst({ token }: { token: number }) {
  if (!token) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        return (
          <motion.span
            key={`${token}-${index}`}
            className="absolute left-1/2 top-[42%] text-gold2"
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.3 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * (70 + (index % 4) * 22),
              y: Math.sin(angle) * (50 + (index % 3) * 18) - 20,
              scale: 1,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            {index % 2 === 0 ? "✦" : "✧"}
          </motion.span>
        );
      })}
    </div>
  );
}

export function MicButton({ live, onClick }: { live: boolean; onClick: () => void }) {
  return (
    <button className={`mic ${live ? "live" : ""}`} onClick={onClick} aria-label="Сказать вслух">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="3" width="6" height="11" rx="3" stroke="#F6E7C4" strokeWidth="1.6" />
        <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="#F6E7C4" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function Atmosphere({
  children,
  art = "key",
  focus = "center",
  padNav = true,
}: {
  children: ReactNode;
  art?: "key" | "gate";
  focus?: string;
  padNav?: boolean;
}) {
  return (
    <div className={`relative min-h-dvh ${padNav ? "nav-safe" : ""}`}>
      <WorldBackdrop src={art === "gate" ? "/art/trial-gate.jpg" : "/art/key-art.jpg"} focus={focus} scene={art === "gate"} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function GoldButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} className="gold-btn h-12 w-full" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
