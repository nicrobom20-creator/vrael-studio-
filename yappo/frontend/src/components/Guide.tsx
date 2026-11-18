import { useId } from "react";

const LOOK: Record<string, { hair: string; cloth: string; skin: string }> = {
  en: { hair: "#6a4332", cloth: "#2c4a6a", skin: "#f0c2a4" },
  fr: { hair: "#2c211c", cloth: "#f3e6d4", skin: "#e8b89a" },
  es: { hair: "#3a241c", cloth: "#8d3040", skin: "#e7b08a" },
  de: { hair: "#e2c27a", cloth: "#4a5568", skin: "#f3d0b4" },
  zh: { hair: "#1c1614", cloth: "#1f6f6a", skin: "#f0c8a8" },
};

export function Guide({ language, className = "" }: { language: string; className?: string }) {
  const raw = useId().replace(/:/g, "");
  const look = LOOK[language] || LOOK.fr;
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${raw}-skin`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffe0c4" />
          <stop offset="1" stopColor={look.skin} />
        </radialGradient>
        <linearGradient id={`${raw}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1d0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff1d0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="118" rx="34" ry="16" fill={look.cloth} />
      <path d="M28 92c6 28 52 34 66 4 4-10-6-18-18-18H46c-12 0-20 6-18 14z" fill={look.cloth} />
      <path d="M78 96c10 2 16 10 12 18" fill="none" stroke="#f6e2b0" strokeWidth="2" opacity="0.7" />
      <circle cx="60" cy="58" r="28" fill={`url(#${raw}-skin)`} />
      <path d="M34 50c4-24 18-34 28-32 14-4 28 8 30 26-8-10-20-14-32-10-10 2-20 8-26 16z" fill={look.hair} />
      <path d="M36 46c8 8 20 6 28-2" fill="none" stroke={`url(#${raw}-rim)`} strokeWidth="3" />
      <ellipse cx="50" cy="60" rx="5" ry="5.5" fill="#fffaf3" />
      <ellipse cx="72" cy="60" rx="5" ry="5.5" fill="#fffaf3" />
      <circle cx="51" cy="61" r="2.2" fill="#2a2118" />
      <circle cx="73" cy="61" r="2.2" fill="#2a2118" />
      <circle cx="52" cy="60" r="0.8" fill="#fff" />
      <circle cx="74" cy="60" r="0.8" fill="#fff" />
      <path d="M56 72c3 3 8 3 11 0" fill="none" stroke="#c47a6a" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="44" cy="68" rx="4" ry="2" fill="#e7a090" opacity="0.45" />
      <ellipse cx="78" cy="68" rx="4" ry="2" fill="#e7a090" opacity="0.45" />
    </svg>
  );
}
