export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    const message = typeof detail === "string"
      ? detail
      : detail && typeof detail === "object" && "message" in detail
        ? String((detail as { message: string }).message)
        : "Что-то пошло не так";
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

const base = import.meta.env.VITE_API_URL || "";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("yappo_token");
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(base + path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.detail ?? data);
  return data as T;
}

export function deviceId(): string {
  const key = "yappo_device";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    localStorage.setItem(key, value);
  }
  return value;
}

export function readStartParam(): string {
  const fromTelegram = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (fromTelegram) return fromTelegram;
  const query = new URLSearchParams(window.location.search);
  return query.get("startapp") || query.get("tgWebAppStartParam") || "";
}

export function haptic(kind: "light" | "success" | "error") {
  const hapticFeedback = window.Telegram?.WebApp?.HapticFeedback;
  if (!hapticFeedback) return;
  if (kind === "light") hapticFeedback.impactOccurred("light");
  else hapticFeedback.notificationOccurred(kind);
}
