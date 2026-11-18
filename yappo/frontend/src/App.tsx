import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useLocation, useRoutes } from "react-router-dom";
import { BottomNav } from "./components/Shell";
import { CityScene } from "./components/CityScene";
import { ChatScreen } from "./screens/ChatScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { MapScreen } from "./screens/MapScreen";
import { Onboarding } from "./screens/Onboarding";
import { PremiumScreen } from "./screens/PremiumScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { QuestsScreen } from "./screens/QuestsScreen";
import { ReferralsScreen } from "./screens/ReferralsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { StoryScreen } from "./screens/StoryScreen";
import { TrialScreen } from "./screens/TrialScreen";
import { useApp } from "./state";

export function App() {
  const { ready, error, user, boot, toast } = useApp();
  const location = useLocation();
  const hideNav = /^\/(trial|story|premium|friends|settings|board)/.test(location.pathname);

  const element = useRoutes([
    { path: "/", element: <MapScreen /> },
    { path: "/quests", element: <QuestsScreen /> },
    { path: "/chat", element: <ChatScreen /> },
    { path: "/profile", element: <ProfileScreen /> },
    { path: "/trial/:id", element: <TrialScreen /> },
    { path: "/story/:id", element: <StoryScreen /> },
    { path: "/premium", element: <PremiumScreen /> },
    { path: "/friends", element: <ReferralsScreen /> },
    { path: "/settings", element: <SettingsScreen /> },
    { path: "/board", element: <LeaderboardScreen /> },
  ]);

  if (!ready) return <Splash label="Собираем острова…" />;
  if (error && !user) {
    return (
      <Splash label={error}>
        <button className="gold-btn mt-4 h-11 px-6" onClick={() => boot()}>Ещё раз</button>
      </Splash>
    );
  }
  if (!user?.onboarded) return <Onboarding />;

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-ink">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {element}
        </motion.div>
      </AnimatePresence>
      {!hideNav && <BottomNav />}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass fixed inset-x-6 bottom-24 z-50 px-4 py-3 text-center text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Splash({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center px-6 text-center">
      <CityScene language="world" />
      <div className="relative z-10">
        <div className="font-display text-6xl text-cream">Yappo</div>
        <p className="mt-2 font-display text-xl italic text-gold2">{label}</p>
        {children}
      </div>
    </div>
  );
}
