import type { ReactElement } from "react";
import type { MascotId } from "../types";

function Eyes({ x, y, look = 0 }: { x: number; y: number; look?: number }) {
  return (
    <g>
      <ellipse cx={x - 14} cy={y} rx="8" ry="9" fill="#fffaf3" />
      <ellipse cx={x + 14} cy={y} rx="8" ry="9" fill="#fffaf3" />
      <circle cx={x - 12 + look} cy={y + 1} r="3.4" fill="#2a2118" />
      <circle cx={x + 16 + look} cy={y + 1} r="3.4" fill="#2a2118" />
      <circle cx={x - 10.5 + look} cy={y - 1.5} r="1.2" fill="#fff" />
      <circle cx={x + 17.5 + look} cy={y - 1.5} r="1.2" fill="#fff" />
    </g>
  );
}

function Parrot() {
  return (
    <svg viewBox="0 0 240 280" aria-hidden>
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8ed98a" />
          <stop offset="1" stopColor="#1f7a45" />
        </linearGradient>
        <linearGradient id="py" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe7a3" />
          <stop offset="1" stopColor="#e2b04a" />
        </linearGradient>
      </defs>
      <path d="M70 150c-20 10-36 40-20 70 18-18 40-22 58-16" fill="#e15b3a" />
      <path d="M78 168c-8 18 2 40 22 48" fill="#f2c14d" />
      <ellipse cx="122" cy="176" rx="52" ry="46" fill="url(#pg)" />
      <ellipse cx="126" cy="186" rx="30" ry="28" fill="url(#py)" />
      <circle cx="126" cy="112" r="40" fill="url(#pg)" />
      <path d="M108 78c2-22 18-30 22-8" fill="#3e9a55" />
      <path d="M124 74c6-24 22-22 18-2" fill="#2f7d45" />
      <path d="M158 112l34 8-32 16z" fill="#f0b429" />
      <path d="M160 118l22 4-20 8z" fill="#c9842a" />
      <path d="M96 96c-28 8-40 28-24 36" fill="none" stroke="#243028" strokeWidth="6" strokeLinecap="round" />
      <circle cx="74" cy="132" r="8" fill="#243028" />
      <circle cx="74" cy="132" r="3" fill="#d7dee6" />
      <Eyes x={124} y={108} />
      <g className="arm">
        <path d="M168 150c28-6 48 8 42 28-10 6-28 2-40-8" fill="#e23b32" />
        <path d="M176 156c22 2 34 16 24 28" fill="#f2c14d" />
        <path d="M170 164c16 10 22 22 10 30" fill="#3d7fd6" />
      </g>
      <circle cx="128" cy="168" r="11" fill="#f4d78a" stroke="#a97832" />
      <text x="128" y="172" textAnchor="middle" fontSize="12" fontFamily="Manrope" fill="#6a4314">Y</text>
      <path d="M100 214c8 10 18 12 26 4" fill="none" stroke="#e2b04a" strokeWidth="4" strokeLinecap="round" />
      <path d="M132 214c8 10 18 12 24 2" fill="none" stroke="#e2b04a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Bunny() {
  return (
    <svg viewBox="0 0 240 280" aria-hidden>
      <defs>
        <linearGradient id="bf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf4" />
          <stop offset="1" stopColor="#eadac8" />
        </linearGradient>
      </defs>
      <ellipse cx="92" cy="78" rx="16" ry="48" fill="url(#bf)" />
      <ellipse cx="150" cy="78" rx="16" ry="48" fill="url(#bf)" />
      <ellipse cx="92" cy="84" rx="8" ry="32" fill="#f3b7c4" />
      <ellipse cx="150" cy="84" rx="8" ry="32" fill="#f3b7c4" />
      <ellipse cx="120" cy="186" rx="48" ry="42" fill="url(#bf)" />
      <circle cx="120" cy="124" r="40" fill="url(#bf)" />
      <path d="M78 168c20 8 64 8 86-2" fill="none" stroke="#d24b43" strokeWidth="8" />
      <path d="M78 168c18 6 40 8 58 2" fill="none" stroke="#3a7ca5" strokeWidth="8" />
      <path d="M90 170c16 6 30 6 44 0" fill="none" stroke="#e2b04a" strokeWidth="6" />
      <Eyes x={120} y={122} />
      <path d="M112 136c6 6 12 6 18 0" fill="none" stroke="#c47a86" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="100" cy="134" rx="5" ry="3" fill="#f3b7c4" opacity="0.8" />
      <ellipse cx="142" cy="134" rx="5" ry="3" fill="#f3b7c4" opacity="0.8" />
      <g className="arm">
        <path d="M156 170c22 4 36 20 28 32" fill="none" stroke="#fffaf4" strokeWidth="10" strokeLinecap="round" />
        <rect x="168" y="188" width="36" height="28" rx="4" fill="#1e4d73" />
        <path d="M172 196h28M172 204h20" stroke="#f6efe2" strokeWidth="1.4" />
      </g>
      <path d="M96 214c10 12 28 14 36 2" fill="none" stroke="#cbb59a" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function Bear() {
  return (
    <svg viewBox="0 0 240 280" aria-hidden>
      <defs>
        <linearGradient id="br" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4844a" />
          <stop offset="1" stopColor="#7a4a28" />
        </linearGradient>
      </defs>
      <circle cx="86" cy="92" r="16" fill="url(#br)" />
      <circle cx="158" cy="92" r="16" fill="url(#br)" />
      <ellipse cx="122" cy="186" rx="52" ry="46" fill="#2f5f86" />
      <path d="M78 168h90l-8 40H90z" fill="#214866" />
      <circle cx="122" cy="122" r="40" fill="url(#br)" />
      <ellipse cx="122" cy="136" rx="18" ry="12" fill="#e6c39a" />
      <path d="M96 150c18 10 36 10 54 0" fill="none" stroke="#9a3030" strokeWidth="8" strokeLinecap="round" />
      <Eyes x={122} y={118} />
      <ellipse cx="122" cy="134" rx="5" ry="3.5" fill="#5c3a28" />
      <g className="arm">
        <path d="M164 168c24-2 40 16 30 34" fill="none" stroke="#c4844a" strokeWidth="12" strokeLinecap="round" />
        <rect x="176" y="186" width="34" height="44" rx="4" fill="#163e66" stroke="#e7c98a" />
        <circle cx="193" cy="206" r="6" fill="none" stroke="#e7c98a" />
      </g>
      <path d="M70 176c-16 8-18 28-4 36 12-10 16-22 12-34" fill="#d7a15a" />
    </svg>
  );
}

function Fox() {
  return (
    <svg viewBox="0 0 240 280" aria-hidden>
      <defs>
        <linearGradient id="fx" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb067" />
          <stop offset="1" stopColor="#d0652a" />
        </linearGradient>
      </defs>
      <path d="M150 200c40 10 62 28 70 8-22-6-40-4-58 6" fill="#f4efe6" />
      <path d="M158 196c36 4 58 18 62-2-20-2-38 0-52 10" fill="url(#fx)" />
      <ellipse cx="118" cy="184" rx="46" ry="42" fill="url(#fx)" />
      <ellipse cx="118" cy="196" rx="24" ry="22" fill="#f7f1e8" />
      <path d="M86 96l18 28-28 6z" fill="url(#fx)" />
      <path d="M150 96l-16 28 28 4z" fill="url(#fx)" />
      <circle cx="118" cy="124" r="38" fill="url(#fx)" />
      <path d="M96 132c8 18 36 22 48 4" fill="#f7f1e8" />
      <path d="M78 150c16 4 28 2 36-6" fill="none" stroke="#2f7f86" strokeWidth="8" strokeLinecap="round" />
      <Eyes x={116} y={118} look={2} />
      <path d="M112 138l6 4 6-4" fill="#3a2418" />
      <g className="arm">
        <path d="M150 160c30-8 48 6 40 26" fill="none" stroke="#e8833a" strokeWidth="11" strokeLinecap="round" />
        <path d="M184 176l22-8 4 10-20 10z" fill="#efe6d4" stroke="#c4b48a" />
      </g>
      <rect x="78" y="176" width="22" height="16" rx="4" fill="#6b442c" />
    </svg>
  );
}

function Cat() {
  return (
    <svg viewBox="0 0 240 280" aria-hidden>
      <defs>
        <linearGradient id="ct" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9c4cc" />
          <stop offset="1" stopColor="#6e6a78" />
        </linearGradient>
      </defs>
      <path d="M156 210c28 20 50 8 58-8-24 2-40-2-52 8" fill="url(#ct)" />
      <ellipse cx="118" cy="186" rx="48" ry="42" fill="url(#ct)" />
      <path d="M92 78l16 26-24 2z" fill="#4e4a58" />
      <path d="M146 78l-14 26 24 2z" fill="#4e4a58" />
      <ellipse cx="118" cy="70" rx="28" ry="10" fill="#2c2a33" />
      <circle cx="118" cy="124" r="38" fill="url(#ct)" />
      <path d="M86 148c20 6 48 6 66-2" fill="none" stroke="#7a5ea8" strokeWidth="8" strokeLinecap="round" />
      <Eyes x={118} y={122} />
      <path d="M114 136l4 3 4-3" fill="#d98998" />
      <path d="M96 136h-16M140 136h16" stroke="#4e4a58" strokeWidth="1.2" />
      <g className="arm">
        <path d="M150 168c22 6 30 22 18 32" fill="none" stroke="#b7b2bc" strokeWidth="11" strokeLinecap="round" />
        <ellipse cx="176" cy="198" rx="14" ry="10" fill="#efe6dc" />
        <ellipse cx="176" cy="196" rx="8" ry="5" fill="#6b3e32" />
      </g>
    </svg>
  );
}

const ART: Record<MascotId, () => ReactElement> = {
  parrot: Parrot,
  bunny: Bunny,
  bear: Bear,
  fox: Fox,
  cat: Cat,
};

export function PlaceholderCompanion({ mascot }: { mascot: MascotId }) {
  const Art = ART[mascot] || Parrot;
  return <Art />;
}
