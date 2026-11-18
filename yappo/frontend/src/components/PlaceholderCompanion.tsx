import { useId, type ReactElement } from "react";
import type { MascotId } from "../types";

function Eyes({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x - 13} cy={y} rx="8" ry="9" fill="#fffaf4" />
      <ellipse cx={x + 14} cy={y} rx="8" ry="9" fill="#fffaf4" />
      <circle cx={x - 11} cy={y + 1} r="3.3" fill="#24180f" />
      <circle cx={x + 16} cy={y + 1} r="3.3" fill="#24180f" />
      <circle cx={x - 10} cy={y - 1.2} r="1.3" fill="#fff" />
      <circle cx={x + 17} cy={y - 1.2} r="1.3" fill="#fff" />
      <path d={`M${x - 20} ${y - 8}q8-6 16 0`} fill="none" stroke="#3a2a22" strokeWidth="1.2" opacity="0.45" />
      <path d={`M${x + 6} ${y - 8}q8-6 16 0`} fill="none" stroke="#3a2a22" strokeWidth="1.2" opacity="0.45" />
    </g>
  );
}

function Parrot() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 260" aria-hidden>
      <defs>
        <radialGradient id={`${id}b`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#d8f5b0" />
          <stop offset="0.45" stopColor="#3eae62" />
          <stop offset="1" stopColor="#14643a" />
        </radialGradient>
        <radialGradient id={`${id}y`} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff1c2" />
          <stop offset="1" stopColor="#e0a33a" />
        </radialGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6d8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="112" cy="230" rx="46" ry="10" fill="#000" opacity="0.25" />
      <path d="M48 150c-18 24-10 70 18 78 8-28 20-40 34-36" fill="#c44732" />
      <path d="M58 168c-4 22 10 40 28 44" fill="#f0c14e" />
      <path d="M70 176c2 16 16 26 28 22" fill="#3c7fd0" />
      <ellipse cx="118" cy="168" rx="54" ry="48" fill={`url(#${id}b)`} />
      <ellipse cx="124" cy="178" rx="30" ry="28" fill={`url(#${id}y)`} />
      <path d="M150 140c22 8 36 28 24 48" fill="none" stroke={`url(#${id}r)`} strokeWidth="5" strokeLinecap="round" />
      <circle cx="124" cy="104" r="42" fill={`url(#${id}b)`} />
      <path d="M100 70c6-26 22-32 26-6" fill="#2f8a4c" />
      <path d="M122 64c8-28 26-24 20 2" fill="#1f6b3c" />
      <path d="M158 104c18 2 32 12 28 22-16 2-30-4-36-12z" fill={`url(#${id}y)`} />
      <path d="M160 112c12 2 18 8 14 12" fill="#c9842a" />
      <path d="M86 92c-30 6-42 24-26 34" fill="none" stroke="#243028" strokeWidth="6" strokeLinecap="round" />
      <circle cx="62" cy="128" r="9" fill="#1c2420" />
      <circle cx="62" cy="128" r="3.5" fill="#d5e2ea" />
      <Eyes x={122} y={102} />
      <ellipse cx="104" cy="116" rx="5" ry="2.4" fill="#e09090" opacity="0.35" />
      <g className="arm">
        <path d="M156 146c30-10 52 8 44 30-12 8-32 0-42-12z" fill="#d23b32" />
        <path d="M168 154c22 4 32 18 20 30" fill="#f0c14e" />
        <path d="M160 162c18 8 24 22 10 30" fill="#3c7fd0" />
      </g>
      <circle cx="122" cy="164" r="12" fill="#f6e2a8" stroke="#a97832" />
      <text x="122" y="168" textAnchor="middle" fontSize="12" fontFamily="Manrope, sans-serif" fill="#6a4314">Y</text>
    </svg>
  );
}

function Bunny() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 260" aria-hidden>
      <defs>
        <radialGradient id={`${id}f`} cx="40%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#e4d3c4" />
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="230" rx="40" ry="9" fill="#000" opacity="0.2" />
      <ellipse cx="78" cy="78" rx="16" ry="52" fill={`url(#${id}f)`} />
      <ellipse cx="146" cy="78" rx="16" ry="52" fill={`url(#${id}f)`} />
      <ellipse cx="78" cy="86" rx="8" ry="34" fill="#f3b7c4" />
      <ellipse cx="146" cy="86" rx="8" ry="34" fill="#f3b7c4" />
      <path d="M70 70c4-8 14-6 12 6" fill="none" stroke="#fff6d8" strokeWidth="3" opacity="0.8" />
      <ellipse cx="112" cy="176" rx="50" ry="44" fill={`url(#${id}f)`} />
      <circle cx="112" cy="118" r="40" fill={`url(#${id}f)`} />
      <path d="M70 158c18 10 66 12 86-4" fill="none" stroke="#c4473a" strokeWidth="8" strokeLinecap="round" />
      <path d="M74 166c20 6 40 6 58-2" fill="none" stroke="#2f6f9a" strokeWidth="7" strokeLinecap="round" />
      <path d="M86 170c14 4 28 4 40-2" fill="none" stroke="#e2b04a" strokeWidth="5" strokeLinecap="round" />
      <Eyes x={112} y={116} />
      <path d="M104 132c5 5 12 5 17 0" fill="none" stroke="#c47a86" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="92" cy="128" rx="5" ry="2.5" fill="#f3b7c4" opacity="0.7" />
      <ellipse cx="134" cy="128" rx="5" ry="2.5" fill="#f3b7c4" opacity="0.7" />
      <g className="arm">
        <path d="M148 164c22 6 34 22 22 34" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
        <rect x="158" y="186" width="34" height="26" rx="4" fill="#1d4e78" />
        <path d="M164 196h22M164 204h16" stroke="#f6efe2" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

function Bear() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 260" aria-hidden>
      <defs>
        <radialGradient id={`${id}f`} cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#e7b07a" />
          <stop offset="1" stopColor="#7a4524" />
        </radialGradient>
      </defs>
      <ellipse cx="112" cy="230" rx="46" ry="10" fill="#000" opacity="0.22" />
      <circle cx="74" cy="92" r="16" fill={`url(#${id}f)`} />
      <circle cx="150" cy="92" r="16" fill={`url(#${id}f)`} />
      <ellipse cx="112" cy="178" rx="54" ry="48" fill="#24567e" />
      <path d="M68 160h90l-6 46H78z" fill="#1a3f5e" />
      <path d="M150 150c16 8 22 28 10 40" fill="none" stroke="#f6e2b0" strokeWidth="3" opacity="0.55" />
      <circle cx="112" cy="116" r="40" fill={`url(#${id}f)`} />
      <ellipse cx="112" cy="132" rx="18" ry="13" fill="#f0d2b0" />
      <path d="M86 150c16 8 36 8 52-2" fill="none" stroke="#9a3030" strokeWidth="8" strokeLinecap="round" />
      <Eyes x={112} y={112} />
      <ellipse cx="112" cy="130" rx="5" ry="3.4" fill="#5c3a28" />
      <g className="arm">
        <path d="M154 160c26 0 40 20 28 36" fill="none" stroke="#c4844a" strokeWidth="13" strokeLinecap="round" />
        <rect x="166" y="184" width="32" height="42" rx="4" fill="#163e66" stroke="#e7c98a" />
        <circle cx="182" cy="204" r="6" fill="none" stroke="#e7c98a" />
      </g>
      <path d="M58 168c-16 10-16 32 0 40 12-12 16-24 10-38" fill="#d7a15a" />
    </svg>
  );
}

function Fox() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 260" aria-hidden>
      <defs>
        <radialGradient id={`${id}f`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffd0a0" />
          <stop offset="0.5" stopColor="#f08a3c" />
          <stop offset="1" stopColor="#b44a1c" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="228" rx="50" ry="12" fill="#000" opacity="0.2" />
      <path d="M150 176c36 16 62 18 74-4-26-2-48 2-64 16z" fill="#f7f1e8" />
      <path d="M156 168c34 8 58 10 66-8-22 0-42 4-58 14z" fill={`url(#${id}f)`} />
      <ellipse cx="112" cy="176" rx="48" ry="44" fill={`url(#${id}f)`} />
      <ellipse cx="112" cy="190" rx="24" ry="22" fill="#f7f1e8" />
      <path d="M78 96l20 30-30 8z" fill={`url(#${id}f)`} />
      <path d="M148 96l-18 30 30 6z" fill={`url(#${id}f)`} />
      <path d="M86 100l12 18" stroke="#fff6d8" strokeWidth="2" opacity="0.6" />
      <circle cx="112" cy="120" r="38" fill={`url(#${id}f)`} />
      <path d="M90 130c8 20 38 22 48 2" fill="#f7f1e8" />
      <path d="M70 146c18 6 30 2 38-8" fill="none" stroke="#2f7f86" strokeWidth="8" strokeLinecap="round" />
      <Eyes x={110} y={114} />
      <path d="M106 136l6 4 6-4" fill="#3a2418" />
      <g className="arm">
        <path d="M146 150c32-12 50 6 40 28" fill="none" stroke="#e8833a" strokeWidth="12" strokeLinecap="round" />
        <path d="M176 168l24-8 4 12-22 10z" fill="#efe6d4" stroke="#c4b48a" />
      </g>
      <rect x="70" y="168" width="22" height="16" rx="4" fill="#6b442c" />
    </svg>
  );
}

function Cat() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 260" aria-hidden>
      <defs>
        <radialGradient id={`${id}f`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#f2eef4" />
          <stop offset="1" stopColor="#6e6878" />
        </radialGradient>
      </defs>
      <ellipse cx="112" cy="230" rx="42" ry="9" fill="#000" opacity="0.22" />
      <path d="M150 200c30 18 52 6 58-10-22 4-40-2-52 10z" fill={`url(#${id}f)`} />
      <ellipse cx="110" cy="178" rx="50" ry="44" fill={`url(#${id}f)`} />
      <path d="M78 86l18 28-26 4z" fill="#3a3644" />
      <path d="M144 86l-16 28 26 4z" fill="#3a3644" />
      <ellipse cx="110" cy="78" rx="30" ry="11" fill="#2a2730" />
      <circle cx="110" cy="118" r="38" fill={`url(#${id}f)`} />
      <path d="M78 150c18 8 48 8 66-2" fill="none" stroke="#7a5ea8" strokeWidth="8" strokeLinecap="round" />
      <path d="M150 140c14 6 20 18 8 26" fill="none" stroke="#fff1d0" strokeWidth="2.4" opacity="0.7" />
      <Eyes x={110} y={116} />
      <path d="M104 134l5 3 5-3" fill="#d98998" />
      <path d="M88 132h-14M132 132h14" stroke="#4e4a58" strokeWidth="1.2" />
      <g className="arm">
        <path d="M146 162c22 8 30 24 16 34" fill="none" stroke="#b7b2bc" strokeWidth="12" strokeLinecap="round" />
        <ellipse cx="168" cy="196" rx="14" ry="10" fill="#efe6dc" />
        <ellipse cx="168" cy="194" rx="8" ry="5" fill="#6b3e32" />
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
