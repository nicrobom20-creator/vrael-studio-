export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function markUnlock(fromId: string, toId: string | undefined) {
  sessionStorage.setItem("yappo_unlock", JSON.stringify({ from: fromId, to: toId || "" }));
}

export function takeUnlock(): { from: string; to: string } | null {
  const raw = sessionStorage.getItem("yappo_unlock");
  if (!raw) return null;
  sessionStorage.removeItem("yappo_unlock");
  try {
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    if (!parsed.from) return null;
    return { from: parsed.from, to: parsed.to || "" };
  } catch {
    return null;
  }
}
