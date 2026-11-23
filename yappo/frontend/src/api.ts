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

// VITE_API_URL is inlined at build time. Empty means same origin (one service).
const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = localStorage.getItem("yappo_token");
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(base + path, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && retry && !path.startsWith("/api/auth/")) {
    if (await reauthenticate()) return api<T>(path, init, false);
  }
  if (!response.ok) throw new ApiError(response.status, data.detail ?? data);
  return data as T;
}

let reauth: Promise<boolean> | null = null;

async function reauthenticate(): Promise<boolean> {
  if (reauth) return reauth;
  reauth = (async () => {
    const initData = readInitData();
    if (!initData) return false;
    const response = await fetch(base + "/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData }),
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => ({}));
    if (!data?.token) return false;
    localStorage.setItem("yappo_token", data.token);
    return true;
  })().finally(() => {
    reauth = null;
  });
  return reauth;
}

export async function followCheckout(
  plan: "month" | "year",
  navigate: (path: string) => void,
): Promise<string | null> {
  const result = await api<{
    pay_url?: string;
    test?: boolean;
    available?: boolean;
    message?: string;
  }>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  if (result.available === false || !result.pay_url) {
    return result.message || "Оплата скоро заработает";
  }
  if (result.pay_url.startsWith("/")) {
    navigate(result.pay_url);
    return result.test ? "Тестовый счёт создан. Доступ откроется после подтверждения оплаты." : null;
  }
  if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(result.pay_url);
  else window.location.href = result.pay_url;
  return null;
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

export const OPEN_IN_BOT = "Открой Yappo через кнопку в боте @YappoLang_Bot";

export function readInitData(): string {
  const fromSdk = window.Telegram?.WebApp?.initData?.trim();
  if (fromSdk) return fromSdk;
  const hash = window.location.hash.replace(/^#/, "");
  const fromHash = new URLSearchParams(hash).get("tgWebAppData");
  if (fromHash) return fromHash;
  return new URLSearchParams(window.location.search).get("tgWebAppData") || "";
}

export function readStartParam(): string {
  const fromTelegram = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (fromTelegram) return fromTelegram;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return hash.get("tgWebAppStartParam") || query.get("startapp") || query.get("tgWebAppStartParam") || "";
}

export function haptic(kind: "light" | "medium" | "success" | "error") {
  const hapticFeedback = window.Telegram?.WebApp?.HapticFeedback;
  if (!hapticFeedback) return;
  if (kind === "light" || kind === "medium") hapticFeedback.impactOccurred(kind);
  else hapticFeedback.notificationOccurred(kind);
}
