import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, deviceId, readStartParam } from "./api";
import type { PublicConfig, User } from "./types";

interface AppState {
  ready: boolean;
  error: string;
  config: PublicConfig | null;
  user: User | null;
  toast: string;
  setUser: (user: User) => void;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
  boot: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState("");

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function boot() {
    setError("");
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
    webApp?.setHeaderColor?.("#120E0B");
    webApp?.setBackgroundColor?.("#120E0B");
    const pub = await api<PublicConfig>("/api/public");
    setConfig(pub);
    const initData = webApp?.initData;
    const start = readStartParam();
    const auth = initData
      ? await api<{ token: string; user: User }>("/api/auth/telegram", {
          method: "POST",
          body: JSON.stringify({ init_data: initData }),
        })
      : await api<{ token: string; user: User }>("/api/auth/demo", {
          method: "POST",
          body: JSON.stringify({ device_id: deviceId(), start_param: start }),
        });
    localStorage.setItem("yappo_token", auth.token);
    setUser(auth.user);
    setReady(true);
  }

  async function refresh() {
    const next = await api<User>("/api/me");
    setUser(next);
  }

  useEffect(() => {
    boot().catch((reason: Error) => {
      setError(reason.message || "Нет связи с сервером");
      setReady(true);
    });
  }, []);

  const value = useMemo(
    () => ({ ready, error, config, user, toast, setUser, notify, refresh, boot }),
    [ready, error, config, user, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error("app state");
  return value;
}
