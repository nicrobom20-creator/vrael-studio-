const GOOD = [
  "Да!",
  "Именно так",
  "Красиво",
  "Так держать",
  "Верно",
  "Звучит живо",
  "Отличный ход",
  "Ты в потоке",
];

const GENTLE = [
  "Почти",
  "Ещё раз, спокойно",
  "Я рядом",
  "Ничего, так учатся",
  "Давай мягче",
  "Чуть-чуть мимо",
];

const COMBO: Record<number, string> = {
  3: "Три подряд — город слушает",
  5: "Пять подряд. Это уже музыка",
  8: "Восемь. Ты ведёшь этот разговор",
};

function pick(list: string[]) {
  return list[Math.floor(Math.random() * list.length)] || list[0];
}

export function praiseLine(combo: number) {
  return COMBO[combo] || pick(GOOD);
}

export function gentleLine() {
  return pick(GENTLE);
}
