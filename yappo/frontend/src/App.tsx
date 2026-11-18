import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { useLocation, useRoutes } from "react-router-dom";
import { CityScene, cityOf } from "./components/CityScene";
import { BottomNav } from "./components/Shell";
import { OPEN_IN_BOT } from "./api";
import { prefersReducedMotion } from "./lib/motion";
import { useApp } from "./state";

const MapScreen = lazy(() => import("./screens/MapScreen").then((m) => ({ default: m.MapScreen })));
const Onboarding = lazy(() => import("./screens/Onboarding").then((m) => ({ default: m.Onboarding })));
const ChatScreen = lazy(() => import("./screens/ChatScreen").then((m) => ({ default: m.ChatScreen })));
const LeaderboardScreen = lazy(() => import("./screens/LeaderboardScreen").then((m) => ({ default: m.LeaderboardScreen })));
const PremiumScreen = lazy(() => import("./screens/PremiumScreen").then((m) => ({ default: m.PremiumScreen })));
const ProfileScreen = lazy(() => import("./screens/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const QuestsScreen = lazy(() => import("./screens/QuestsScreen").then((m) => ({ default: m.QuestsScreen })));
const ReferralsScreen = lazy(() => import("./screens/ReferralsScreen").then((m) => ({ default: m.ReferralsScreen })));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const StoryScreen = lazy(() => import("./screens/StoryScreen").then((m) => ({ default: m.StoryScreen })));
const TrialScreen = lazy(() => import("./screens/TrialScreen").then((m) => ({ default: m.TrialScreen })));
const PrivacyPage = lazy(() => import("./screens/LegalScreen").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./screens/LegalScreen").then((m) => ({ default: m.TermsPage })));
const PricingPage = lazy(() => import("./screens/LegalScreen").then((m) => ({ default: m.PricingPage })));

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

  if (location.pathname === "/support") {
    window.location.replace("https://t.me/vraelstudio");
    return null;
  }
  if (location.pathname === "/privacy" || location.pathname === "/terms" || location.pathname === "/pricing" || location.pathname === "/tariffs") {
    const Page = location.pathname === "/privacy" ? PrivacyPage : location.pathname === "/terms" ? TermsPage : PricingPage;
    return (
      <Suspense fallback={<Splash label="Открываем…" />}>
        <Page />
      </Suspense>
    );
  }

  if (!ready) return <Splash label="Собираем карту…" />;
  if (!user) {
    return (
      <Splash label={error || OPEN_IN_BOT}>
        <button className="gold-btn mt-4 h-11 px-6" onClick={() => void boot()}>Ещё раз</button>
      </Splash>
    );
  }
  if (!user.onboarded) {
    return (
      <Suspense fallback={<Splash label="Собираем карту…" />}>
        <Onboarding />
      </Suspense>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] overflow-x-hidden bg-ink">
      <PreloadArt language={user.language} />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={prefersReducedMotion() ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion() ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: prefersReducedMotion() ? 0 : 0.28, ease: "easeOut" }}
        >
          <Suspense fallback={<Splash label="Открываем…" />}>{element}</Suspense>
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

function PreloadArt({ language }: { language: string }) {
  useEffect(() => {
    const city = cityOf(language);
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = `/art/${city}-540.webp`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [language]);
  return null;
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
