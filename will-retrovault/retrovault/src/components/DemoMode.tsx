"use client";
/**
 * DemoMode — Guided feature tour
 *
 * Provides a step-by-step tour of RetroVault features. Navigates to the relevant
 * page for each step automatically. Tour state survives page navigation via sessionStorage.
 *
 * Two entry points:
 * 1. Manual: "▶ DEMO" button in the nav calls start()
 * 2. Automatic: After Setup Wizard completes, DEMO_AUTOSTART_KEY is written to
 *    localStorage. DemoProvider reads it on mount, builds a filtered step list
 *    based on the user's enabled features, and auto-starts.
 *
 * Mode-aware filtering:
 *   buildDemoSteps(features) returns only steps whose requires[] groups are enabled.
 *   The Collector sees personal/collection steps; the Dealer sees business steps; etc.
 *
 * Export DEMO_AUTOSTART_KEY so Onboarding.tsx can write it without importing all of DemoMode.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

// ─── Key exported so Onboarding can write it before reload ───────────────────
export const DEMO_AUTOSTART_KEY = "rv-demo-autostart";

export type DemoStep = {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  navigateTo?: string;
  /** Feature groups this step requires. If any are disabled, step is skipped. */
  requires?: Array<"collection" | "business" | "fieldTools" | "social" | "personal">;
};

// ─── All available demo steps ─────────────────────────────────────────────────
// Steps are filtered at runtime based on the user's enabled features.

const ALL_DEMO_STEPS: DemoStep[] = [
  {
    id: "welcome",
    title: "Welcome to RetroVault 👾",
    description: "You just set up your vault your way. This quick tour highlights what's in your toolkit — we'll only show you features you actually have enabled. Hit NEXT whenever you're ready.",
    position: "center",
    navigateTo: "/",
  },
  {
    id: "vault",
    title: "🕹️ The Vault",
    description: "Your game database — 26,000+ titles across 35 platforms. Filter to OWNED to see your collection, TARGETS for games on your radar, or SELL for flip candidates. Prices pull automatically from PriceCharting.",
    position: "center",
    navigateTo: "/inventory",
    requires: ["collection"],
  },
  {
    id: "add-game",
    title: "➕ Adding Games",
    description: "Click '+ ADD ASSET' to add a game to your collection. Set condition, cost, source, and how many copies. Or use the CSV Import to bulk-import from a spreadsheet — it auto-matches to the catalog.",
    position: "center",
    navigateTo: "/inventory",
    requires: ["collection"],
  },
  {
    id: "buy-sell-scores",
    title: "📊 Buy & Sell Scores",
    description: "Every game gets a Buy Score and Sell Score from 1–100 based on current price position AND 30-day trends. Green means opportunity. Click a column header to rank your best moves.",
    position: "center",
    navigateTo: "/inventory",
    requires: ["business"],
  },
  {
    id: "field-mode",
    title: "🔦 Field Mode",
    description: "Your garage sale weapon. Type any game title and instantly see the market price, whether you already own it (dupe alert!), and a BUY / PASS / NEGOTIATE verdict. Works offline-ish — perfect for shows and flea markets.",
    position: "center",
    navigateTo: "/field",
    requires: ["fieldTools"],
  },
  {
    id: "hotlist",
    title: "🔥 Hot List",
    description: "Auto-ranked flip opportunities right now. Scored by ROI × 30-day price trend × copy count. Filter by minimum ROI and platform. Your top flips are always front and center.",
    position: "center",
    navigateTo: "/hotlist",
    requires: ["business"],
  },
  {
    id: "pl-ledger",
    title: "💰 P&L Ledger",
    description: "Track every buy and sell. The ledger calculates realized profit, COGS, average margin, and net cash position. Log a sale here and it flows back to your collection stats automatically.",
    position: "center",
    navigateTo: "/sales",
    requires: ["business"],
  },
  {
    id: "flip-calculator",
    title: "🧮 Flip Calculator",
    description: "Run the math on any deal before you commit. Enter your buy price, target sell price, fees, and shipping — instantly see your net profit and ROI. No more eyeballing at the register.",
    position: "center",
    navigateTo: "/flip",
    requires: ["business"],
  },
  {
    id: "negotiation",
    title: "🤝 Negotiation Helper",
    description: "Enter a game's market value and the asking price. The tool generates a negotiation script with opening offer, counteroffer, and walkaway point. Closes more deals at better prices.",
    position: "center",
    navigateTo: "/negotiate",
    requires: ["fieldTools"],
  },
  {
    id: "watchlist",
    title: "👀 Watchlist",
    description: "Set a price ceiling on games you want to buy. When the market dips below your target, you get an alert. Dealer-focused price intelligence — stop overpaying.",
    position: "center",
    navigateTo: "/watchlist",
    requires: ["business"],
  },
  {
    id: "wishlist",
    title: "🎁 Wishlist",
    description: "A personal want-list with three tiers: Must-Have, Want, and Someday. Mark items as Found when you score them. Generate a shareable public link — great for birthdays and holidays.",
    position: "center",
    navigateTo: "/wishlist",
    requires: ["personal"],
  },
  {
    id: "grails",
    title: "🏴‍☠️ Holy Grail Tracker",
    description: "Your bucket list of unicorn games. Priority-ranked, with a Found status when you finally score one. The Grail Tracker separates casual collecting from the real hunt.",
    position: "center",
    navigateTo: "/grails",
    requires: ["personal"],
  },
  {
    id: "play-log",
    title: "🎮 Play Log",
    description: "Track what you're playing, what you've beaten, and the backlog pile you'll 'definitely get to someday.' Rate games, log start/finish dates, and keep your personal history intact.",
    position: "center",
    navigateTo: "/playlog",
    requires: ["personal"],
  },
  {
    id: "analytics",
    title: "📈 Analytics Dashboard",
    description: "KPI cards, platform distribution, top 10 most valuable, and best ROI tables. The full picture of your collection's health and business performance in one place.",
    position: "center",
    navigateTo: "/analytics",
    requires: ["collection"],
  },
  {
    id: "value-history",
    title: "📅 Value History",
    description: "Daily snapshots of your collection's total value — graphed over time. Watch your empire grow. The snapshot runs automatically every night.",
    position: "center",
    navigateTo: "/value-history",
    requires: ["collection"],
  },
  {
    id: "players",
    title: "⭐ Players & Friends Mode",
    description: "Add people to your Players list and track which games they love or regret. Friends Mode shows what your crew recommends. Great for trading recommendations and party game picks.",
    position: "center",
    navigateTo: "/friends",
    requires: ["social"],
  },
  {
    id: "achievements",
    title: "🏆 Achievement Codex",
    description: "130+ achievements across 9 categories — from Collection milestones to Secret easter eggs. They unlock automatically as you use the app. Common → Uncommon → Rare → Epic → Legendary.",
    position: "center",
    navigateTo: "/achievements",
  },
  {
    id: "field-guide",
    title: "📖 Field Guide",
    description: "8 chapters, 60+ principles for buying, selling, and negotiating retro games. Written from real collecting experience. From spotting underpriced finds to building your network.",
    position: "center",
    navigateTo: "/guide",
  },
  {
    id: "settings",
    title: "⚙️ Settings & Customization",
    description: "8 color palettes, 5 style themes, platform picker, feature toggles, auth, and more. Make it yours. You can also re-run the Setup Wizard here anytime — Settings → Features → Restart Setup Wizard.",
    position: "center",
    navigateTo: "/settings",
  },
  {
    id: "done",
    title: "🚀 You're in!",
    description: "That's the tour. Your vault is ready — add your first game, set up price fetching in the Scrapers panel, and let RetroVault do the rest. Go build that empire.",
    position: "center",
    navigateTo: "/",
  },
];

const STORAGE_KEY = "rv-demo-state";

type DemoContextType = {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: DemoStep | null;
  start: (steps?: DemoStep[]) => void;
  exit: () => void;
  next: () => void;
  prev: () => void;
};

const DemoContext = createContext<DemoContextType>({
  isActive: false, currentStep: 0, totalSteps: ALL_DEMO_STEPS.length,
  step: null, start: () => {}, exit: () => {}, next: () => {}, prev: () => {},
});

export const useDemoMode = () => useContext(DemoContext);

/** Build a filtered step list based on enabled feature groups */
export function buildDemoSteps(features?: {
  collection?: boolean;
  business?: boolean;
  fieldTools?: boolean;
  social?: boolean;
  personal?: boolean;
}): DemoStep[] {
  if (!features) return ALL_DEMO_STEPS;
  return ALL_DEMO_STEPS.filter(step => {
    if (!step.requires || step.requires.length === 0) return true;
    return step.requires.every(req => features[req] !== false);
  });
}

type DemoInitialState = { isActive: boolean; currentStep: number; activeSteps: DemoStep[] };

function getInitialDemoState(): DemoInitialState {
  if (typeof window === "undefined") return { isActive: false, currentStep: 0, activeSteps: ALL_DEMO_STEPS };
  try {
    const raw = localStorage.getItem(DEMO_AUTOSTART_KEY);
    if (raw) {
      localStorage.removeItem(DEMO_AUTOSTART_KEY);
      const { features } = JSON.parse(raw) as { features?: Record<string, boolean> };
      const filtered = buildDemoSteps(features ?? {});
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ active: true, stepIndex: 0, steps: filtered }));
      return { isActive: true, currentStep: 0, activeSteps: filtered };
    }
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { active, stepIndex, steps } = JSON.parse(saved) as { active?: boolean; stepIndex?: number; steps?: DemoStep[] };
      const restoredSteps = steps ?? ALL_DEMO_STEPS;
      if (active && typeof stepIndex === "number" && stepIndex < restoredSteps.length) {
        return { isActive: true, currentStep: stepIndex, activeSteps: restoredSteps };
      }
    }
  } catch { /* ignore */ }
  return { isActive: false, currentStep: 0, activeSteps: ALL_DEMO_STEPS };
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [initialDemoState] = useState(getInitialDemoState);
  const [isActive,     setIsActive]     = useState(initialDemoState.isActive);
  const [currentStep,  setCurrentStep]  = useState(initialDemoState.currentStep);
  const [activeSteps,  setActiveSteps]  = useState<DemoStep[]>(initialDemoState.activeSteps);
  const router      = useRouter();
  const pathname    = usePathname();
  const navigating  = useRef(false);

  const step = isActive && currentStep < activeSteps.length ? activeSteps[currentStep] : null;


  // Persist demo state whenever it changes
  useEffect(() => {
    try {
      if (isActive) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ active: true, stepIndex: currentStep, steps: activeSteps }));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }
  }, [isActive, currentStep, activeSteps]);

  const exit = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    navigating.current = false;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const start = useCallback((steps?: DemoStep[]) => {
    const stepsToUse = steps ?? ALL_DEMO_STEPS;
    setActiveSteps(stepsToUse);
    setCurrentStep(0);
    setIsActive(true);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ active: true, stepIndex: 0, steps: stepsToUse })); } catch { /* ignore */ }
  }, []);

  // Navigate when step changes
  useEffect(() => {
    if (!isActive || !step?.navigateTo) return;
    if (pathname === step.navigateTo) { navigating.current = false; return; }
    if (navigating.current) return;
    navigating.current = true;
    router.push(step.navigateTo);
  }, [isActive, step, pathname, router]);

  useEffect(() => {
    if (step?.navigateTo && pathname === step.navigateTo) navigating.current = false;
  }, [pathname, step]);

  const next = useCallback(() => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      exit();
    }
  }, [currentStep, activeSteps.length, exit]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  // ESC to exit
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") exit(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, exit]);

  const pct = Math.round((currentStep / activeSteps.length) * 100);

  return (
    <DemoContext.Provider value={{ isActive, currentStep, totalSteps: activeSteps.length, step, start, exit, next, prev }}>
      {children}
      {isActive && step && (
        <>
          {/* Dark overlay */}
          <div className="fixed inset-0 bg-black/70 z-[100] pointer-events-none" />

          {/* Progress bar */}
          <div className="fixed top-0 left-0 right-0 z-[110] h-1 bg-zinc-800">
            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          {/* Exit button */}
          <button onClick={exit}
            className="fixed top-4 right-4 z-[120] bg-red-700 hover:bg-red-600 text-white font-terminal text-lg px-4 py-2 border-2 border-red-500 shadow-lg transition-colors">
            ✕ EXIT DEMO
          </button>

          {/* Step counter */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] bg-black border-2 border-green-700 font-terminal text-green-400 text-lg px-4 py-1">
            TOUR — STEP {currentStep + 1} / {activeSteps.length}
          </div>

          {/* Tour popup */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[120] w-full max-w-2xl px-4">
            <div className="bg-zinc-950 border-4 border-green-500 p-6 rounded-sm shadow-[0_0_40px_rgba(34,197,94,0.4)]">
              <h3 className="text-2xl text-green-400 font-terminal uppercase mb-3 tracking-widest">{step.title}</h3>
              <p className="text-zinc-300 text-base leading-relaxed mb-6">{step.description}</p>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-4 flex-wrap">
                {activeSteps.map((_, i) => (
                  <div key={i} className={`h-2 rounded-full transition-all ${
                    i === currentStep ? "bg-green-400 w-4" :
                    i < currentStep   ? "bg-green-800 w-2" :
                                        "bg-zinc-700 w-2"
                  }`} />
                ))}
              </div>

              <div className="flex justify-between items-center">
                <button onClick={prev} disabled={currentStep === 0}
                  className="px-4 py-2 font-terminal text-xl text-zinc-400 hover:text-white disabled:opacity-30 transition-colors">
                  ◀ PREV
                </button>
                <div className="text-zinc-600 font-terminal text-sm">Press ESC to exit</div>
                <button onClick={next}
                  className="px-6 py-2 font-terminal text-xl bg-green-600 hover:bg-green-500 text-black font-bold transition-colors shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                  {currentStep === activeSteps.length - 1 ? "FINISH ✓" : "NEXT ▶"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </DemoContext.Provider>
  );
}
