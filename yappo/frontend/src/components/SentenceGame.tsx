import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Companion } from "./Companion";
import { GoldButton } from "./World";
import { gentleLine, praiseLine } from "../lib/praise";
import { prefersReducedMotion } from "../lib/motion";
import { speakAloud } from "../lib/speech";
import type { MascotId, Step } from "../types";

interface Tile {
  id: string;
  text: string;
}

function deal(step: Step): Tile[] {
  const pieces = [...(step.answer as string[]), ...(step.extra || [])];
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [pieces[index], pieces[swap]] = [pieces[swap], pieces[index]];
  }
  return pieces.map((text, index) => ({ id: `${index}-${text}`, text }));
}

export function SentenceGame({
  step,
  tts,
  mascot,
  combo,
  hearts,
  onPass,
  onMiss,
  onNext,
}: {
  step: Step;
  tts: string;
  mascot: MascotId;
  combo: number;
  hearts: number;
  onPass: (line: string) => void;
  onMiss: (line: string) => void;
  onNext: () => void;
}) {
  const bank0 = useMemo(() => deal(step), [step]);
  const [bank, setBank] = useState<Tile[]>(bank0);
  const [built, setBuilt] = useState<Tile[]>([]);
  const [sheet, setSheet] = useState<{ ok: boolean; line: string } | null>(null);
  const phrase = ((step.answer as string[]) || []).join(" ");
  const motionOff = prefersReducedMotion();

  function take(tile: Tile) {
    if (sheet) return;
    setBank((items) => items.filter((item) => item.id !== tile.id));
    setBuilt((items) => [...items, tile]);
  }

  function drop(tile: Tile) {
    if (sheet) return;
    setBuilt((items) => items.filter((item) => item.id !== tile.id));
    setBank((items) => [...items, tile]);
  }

  function check() {
    const answer = (step.answer as string[]) || [];
    const ok = built.map((tile) => tile.text).join("|") === answer.join("|");
    const line = ok ? praiseLine(combo + 1) : gentleLine();
    setSheet({ ok, line });
    if (ok) onPass(line);
    else onMiss(line);
  }

  function retry() {
    setSheet(null);
    setBuilt([]);
    setBank(deal(step));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-rose-200">{"♥".repeat(hearts)}{"♡".repeat(Math.max(0, 5 - hearts))}</span>
        <span className="text-gold2">{combo > 0 ? `${combo} верных ответов подряд` : "Собери фразу"}</span>
      </div>
      <div className="flex items-start gap-2">
        <div className="h-16 w-14 shrink-0">
          <Companion mascot={mascot} pose={sheet?.ok ? "celebrate" : "point"} className="h-full w-full" />
        </div>
        <button type="button" className="choice-btn flex-1 px-3 py-2 text-left" onClick={() => speakAloud(phrase, tts)}>
          <div className="text-[11px] text-gold2">▶ {step.ru}</div>
          <div className="mt-1 text-sm leading-snug">{phrase}</div>
        </button>
      </div>
      <div className="mt-3 min-h-16 rounded-2xl border border-dashed border-gold/40 p-2">
        <div className="flex flex-wrap gap-2">
          {built.map((tile) => (
            <motion.button
              key={tile.id}
              layout={motionOff ? undefined : true}
              type="button"
              onClick={() => drop(tile)}
              className="tile-token tile-token-lit"
            >
              {tile.text}
            </motion.button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex min-h-12 flex-wrap gap-2">
        <AnimatePresence>
          {bank.map((tile) => (
            <motion.button
              key={tile.id}
              layout={motionOff ? undefined : true}
              type="button"
              onClick={() => take(tile)}
              className="tile-token"
            >
              {tile.text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {!sheet && (
        <div className="mt-4">
          <GoldButton disabled={!built.length} onClick={check}>Проверить</GoldButton>
        </div>
      )}
      {sheet && (
        <div className={`sheet ${sheet.ok ? "sheet-ok" : "sheet-bad"}`}>
          <div className="font-display text-3xl">{sheet.ok ? "Верно" : "Почти"}</div>
          <p className="mt-1 text-sm">{sheet.line}</p>
          <div className="mt-3">
            <GoldButton onClick={sheet.ok ? onNext : retry}>{sheet.ok ? "Дальше" : "Ещё раз"}</GoldButton>
          </div>
        </div>
      )}
    </div>
  );
}
