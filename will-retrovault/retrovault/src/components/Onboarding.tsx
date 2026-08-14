"use client";
/**
 * RetroVault Setup Wizard
 *
 * Multi-step "choose your adventure" onboarding that configures feature flags,
 * platform defaults, and collection preferences based on how the user plans to
 * use RetroVault.
 *
 * Modes:
 *   collector    — hobbyist, personal collection tracking
 *   dealer       — buy/sell/flip business tooling
 *   empire       — both (full feature set, power user mode)
 *
 * Can be re-triggered from Settings → "Restart Setup Wizard"
 */

import { useState, useEffect } from "react";
import { unlockAchievement } from "@/lib/achievementUnlocks";
import Link from "next/link";
import { DEMO_AUTOSTART_KEY } from "@/components/DemoMode";

export const ONBOARDING_KEY = "rv-onboarding-done";
export const WIZARD_VERSION  = "2"; // bump to re-show wizard on major updates

// ─── Mode definitions ──────────────────────────────────────────────────────────

type Mode = "collector" | "dealer" | "empire";

type Features = {
  collection: boolean;
  business:   boolean;
  fieldTools: boolean;
  social:     boolean;
  personal:   boolean;
};

const MODE_META: Record<Mode, {
  icon:        string;
  title:       string;
  subtitle:    string;
  description: string;
  features:    Features;
  tagline:     string;
  color:       string;
}> = {
  collector: {
    icon:     "🎮",
    title:    "The Collector",
    subtitle: "I love games. I want to catalog what I own.",
    description:
      "Personal collection tracking, condition grading, play log, wishlists, " +
      "showcase gallery, completion tiers, and the Holy Grail Tracker. " +
      "The business tools stay out of your way.",
    features: { collection: true, business: false, fieldTools: false, social: true, personal: true },
    tagline:  "Your collection, your history.",
    color:    "border-blue-600 hover:border-blue-400",
  },
  dealer: {
    icon:     "💰",
    title:    "The Dealer",
    subtitle: "I buy, sell, and flip. This is a business.",
    description:
      "P&L Ledger, Flip Calculator, Hot List, Sourcing Analytics, Field Mode, " +
      "Negotiation Helper, Lot Calculator, Watchlist, Target Radar, and eBay Listing Checker. " +
      "Built to make money, not memories.",
    features: { collection: true, business: true, fieldTools: true, social: false, personal: false },
    tagline:  "Chase the right price. Every time.",
    color:    "border-yellow-600 hover:border-yellow-400",
  },
  empire: {
    icon:     "🏆",
    title:    "The Empire Builder",
    subtitle: "I collect AND flip. All of the above.",
    description:
      "Every feature unlocked. Personal collection tracking plus the full business suite. " +
      "For the player who's building something serious — from hobbyist to multi-millionaire.",
    features: { collection: true, business: true, fieldTools: true, social: true, personal: true },
    tagline:  "Build the empire.",
    color:    "border-green-500 hover:border-green-300",
  },
};

// ─── Setup questions ──────────────────────────────────────────────────────────

type CollectionSize = "small" | "medium" | "large";
type SellsOnline    = "yes" | "no" | "maybe";
type SharedInstance = "solo" | "shared";

interface Answers {
  mode:           Mode | null;
  collectionSize: CollectionSize | null;
  sellsOnline:    SellsOnline | null;
  sharedInstance: SharedInstance | null;
  ownerName:      string;
  currency:       string;
}

// ─── Wizard step list ─────────────────────────────────────────────────────────

type WizardStep =
  | "welcome"
  | "mode"
  | "collection_size"
  | "online_selling"
  | "instance_type"
  | "identity"
  | "done";

const STEP_ORDER: WizardStep[] = [
  "welcome",
  "mode",
  "collection_size",
  "online_selling",
  "instance_type",
  "identity",
  "done",
];

// ─── Apply answers → config ───────────────────────────────────────────────────

async function applyWizardConfig(answers: Answers) {
  if (!answers.mode) return;
  const meta = MODE_META[answers.mode];

  // Check if this is a mode-change re-run (triggers secret achievement)
  let isRerun = false;
  try {
    const cfgRes = await fetch("/api/config");
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (cfg.setupWizardMode && cfg.setupWizardMode !== answers.mode) {
        isRerun = true;
      }
    }
  } catch { /* ignore */ }

  // Build extra config from secondary answers
  const extraConfig: Record<string, unknown> = {
    setupWizardMode:    answers.mode,
    setupWizardVersion: WIZARD_VERSION,
  };

  if (isRerun) {
    // Persist rerun unlock through the canonical achievements API so manual unlocks
    // survive across devices and stay consistent with the server-evaluated payload.
    void unlockAchievement("setup_rerun");
  }

  if (answers.ownerName)      extraConfig.ownerName = answers.ownerName;
  if (answers.currency)       extraConfig.currency  = answers.currency;
  if (answers.sharedInstance === "shared") {
    // Suggest auth — don't force it, just note it
    extraConfig.setupSuggestAuth = true;
  }

  try {
    await fetch("/api/config", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        features: meta.features,
        ...extraConfig,
      }),
    });
  } catch {
    // Non-fatal — wizard still marks as done
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OnboardingProps {
  forceShow?: boolean;
  onDone?:    () => void;
}

export function Onboarding({ forceShow = false, onDone }: OnboardingProps) {
  const [show,    setShow]    = useState(false);
  const [step,    setStep]    = useState<WizardStep>("welcome");
  const [answers, setAnswers] = useState<Answers>({
    mode:           null,
    collectionSize: null,
    sellsOnline:    null,
    sharedInstance: null,
    ownerName:      "",
    currency:       "$",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (forceShow) { setShow(true); return; }
    const done    = localStorage.getItem(ONBOARDING_KEY);
    const version = localStorage.getItem(`${ONBOARDING_KEY}-v`);
    if (!done || version !== WIZARD_VERSION) {
      // Show wizard if: no owned games OR setup wizard has never been run
      Promise.all([
        fetch("/api/inventory").then(r => r.json()).catch(() => []),
        fetch("/api/config").then(r => r.json()).catch(() => ({})),
      ]).then(([inv, cfg]) => {
        const owned = Array.isArray(inv) ? inv.filter((i: { copies?: unknown[] }) => (i.copies||[]).length > 0).length : 0;
        const wizardRan = !!cfg.setupWizardVersion;
        // Show if fresh install (no games) OR wizard has never been completed
        if (owned === 0 || !wizardRan) setShow(true);
      }).catch(() => setShow(true));
    }
  }, [forceShow]);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "done");
    localStorage.setItem(`${ONBOARDING_KEY}-v`, WIZARD_VERSION);
    setShow(false);
    onDone?.();
  };

  const finish = async () => {
    setSaving(true);
    await applyWizardConfig(answers);
    setSaving(false);
    dismiss();
    // Write autostart flag so DemoProvider launches the tour after reload
    // Include feature config so tour filters to only enabled features
    const mode = answers.mode ?? "empire";
    const features = MODE_META[mode].features;
    try {
      localStorage.setItem(DEMO_AUTOSTART_KEY, JSON.stringify({ features }));
    } catch { /* ignore */ }
    // Reload so nav reflects new feature flags, then tour auto-starts
    window.location.reload();
  };

  const stepIdx  = STEP_ORDER.indexOf(step);
  const progress = (stepIdx / (STEP_ORDER.length - 1)) * 100;

  const back = () => setStep(STEP_ORDER[Math.max(0, stepIdx - 1)]);
  const next = () => setStep(STEP_ORDER[Math.min(STEP_ORDER.length - 1, stepIdx + 1)]);

  // Auto-skip online_selling step for collector mode (irrelevant)
  useEffect(() => {
    if (step === "online_selling" && answers.mode === "collector") {
      next();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, answers.mode]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[160] p-4 overflow-y-auto">
      <div className="bg-zinc-950 border-4 border-green-700 w-full max-w-2xl shadow-[0_0_40px_rgba(34,197,94,0.3)] my-4">

        {/* Progress bar */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 pt-4 px-6">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${
              s === step
                ? "bg-green-400 w-6"
                : i < stepIdx
                ? "bg-green-800 w-2"
                : "bg-zinc-700 w-2"
            }`} />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {step === "welcome"  && <StepWelcome  onNext={next} onSkip={dismiss} />}
          {step === "mode"     && <StepMode     answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
          {step === "collection_size" && (
            <StepCollectionSize answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />
          )}
          {step === "online_selling" && answers.mode !== "collector" && (
            <StepOnlineSelling answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />
          )}
          {step === "online_selling" && answers.mode === "collector" && null}
          {step === "instance_type" && (
            <StepInstanceType answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />
          )}
          {step === "identity" && (
            <StepIdentity answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />
          )}
          {step === "done" && (
            <StepDone answers={answers} saving={saving} onFinish={finish} onBack={back} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step: Welcome ────────────────────────────────────────────────────────────

function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="text-center">
      <div className="text-7xl mb-6">👾</div>
      <h2 className="text-green-400 font-terminal text-3xl uppercase tracking-widest mb-4">
        Welcome to RetroVault
      </h2>
      <p className="text-zinc-300 font-terminal text-base leading-relaxed mb-2">
        You&apos;ve got a spreadsheet. You hate your spreadsheet.
      </p>
      <p className="text-zinc-400 font-terminal text-sm leading-relaxed mb-8">
        RetroVault is what that spreadsheet could never be. Let&apos;s spend 60 seconds
        setting it up the way <em>you</em> want to use it — no bloat, no clutter.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onNext}
          className="px-8 py-3 bg-green-700 hover:bg-green-600 text-black font-terminal text-lg font-bold border-2 border-green-500 transition-colors"
        >
          LET&apos;S GO ▶
        </button>
        <button
          onClick={onSkip}
          className="px-6 py-3 font-terminal text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 transition-colors"
        >
          Skip (use defaults)
        </button>
      </div>
    </div>
  );
}

// ─── Step: Mode picker ────────────────────────────────────────────────────────

function StepMode({
  answers, setAnswers, onNext, onBack,
}: {
  answers: Answers;
  setAnswers: (a: Answers) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const select = (mode: Mode) => {
    setAnswers({ ...answers, mode });
    setTimeout(onNext, 180); // brief visual confirm, then advance
  };

  return (
    <div>
      <h2 className="text-green-400 font-terminal text-2xl uppercase tracking-widest mb-2 text-center">
        What kind of collector are you?
      </h2>
      <p className="text-zinc-500 font-terminal text-sm text-center mb-8">
        This configures which features are enabled. You can always change it in Settings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {(["collector", "dealer", "empire"] as Mode[]).map(mode => {
          const meta    = MODE_META[mode];
          const selected = answers.mode === mode;
          return (
            <button
              key={mode}
              onClick={() => select(mode)}
              className={`border-2 p-5 text-left transition-all duration-200 ${meta.color} ${
                selected ? "bg-zinc-900 scale-[1.02]" : "bg-zinc-950 hover:bg-zinc-900"
              }`}
            >
              <div className="text-4xl mb-3">{meta.icon}</div>
              <div className="text-white font-terminal font-bold text-base mb-1">{meta.title}</div>
              <div className="text-zinc-400 font-terminal text-xs mb-3 italic">{meta.subtitle}</div>
              <div className="text-zinc-500 font-terminal text-xs leading-relaxed">{meta.description}</div>
              {selected && (
                <div className="mt-3 text-green-400 font-terminal text-xs">✓ Selected</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-start">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 font-terminal text-sm transition-colors">
          ◀ Back
        </button>
      </div>
    </div>
  );
}

// ─── Step: Collection size ────────────────────────────────────────────────────

function StepCollectionSize({
  answers, setAnswers, onNext, onBack,
}: {
  answers: Answers;
  setAnswers: (a: Answers) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options: { id: CollectionSize; icon: string; label: string; hint: string }[] = [
    { id: "small",  icon: "🌱", label: "Just starting out", hint: "Under 50 games" },
    { id: "medium", icon: "📦", label: "Building it up",    hint: "50 – 500 games" },
    { id: "large",  icon: "🏢", label: "Serious collection",hint: "500+ games" },
  ];

  return (
    <div>
      <h2 className="text-green-400 font-terminal text-2xl uppercase tracking-widest mb-2 text-center">
        How big is your collection?
      </h2>
      <p className="text-zinc-500 font-terminal text-sm text-center mb-8">
        Helps us set smart defaults for pagination, density, and price fetch scheduling.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {options.map(opt => {
          const selected = answers.collectionSize === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => { setAnswers({ ...answers, collectionSize: opt.id }); setTimeout(onNext, 180); }}
              className={`border-2 p-5 text-left transition-all ${
                selected
                  ? "border-green-500 bg-zinc-900"
                  : "border-zinc-700 hover:border-green-800 bg-zinc-950 hover:bg-zinc-900"
              }`}
            >
              <div className="text-3xl mb-2">{opt.icon}</div>
              <div className="text-white font-terminal text-sm font-bold mb-1">{opt.label}</div>
              <div className="text-zinc-500 font-terminal text-xs">{opt.hint}</div>
              {selected && <div className="mt-2 text-green-400 font-terminal text-xs">✓</div>}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 font-terminal text-sm transition-colors">
          ◀ Back
        </button>
        <button onClick={onNext} className="text-zinc-500 hover:text-zinc-300 font-terminal text-sm transition-colors">
          Skip →
        </button>
      </div>
    </div>
  );
}

// ─── Step: Online selling ─────────────────────────────────────────────────────

function StepOnlineSelling({
  answers, setAnswers, onNext, onBack,
}: {
  answers: Answers;
  setAnswers: (a: Answers) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options: { id: SellsOnline; icon: string; label: string; hint: string }[] = [
    { id: "yes",   icon: "🛒", label: "Yes — eBay, Whatnot, etc.", hint: "Enable eBay listing checker and Whatnot tracker" },
    { id: "maybe", icon: "🤔", label: "Maybe someday",             hint: "Enable the tools, you can hide them later" },
    { id: "no",    icon: "🤝", label: "No — I sell locally",       hint: "Focus on in-person negotiation tools" },
  ];

  return (
    <div>
      <h2 className="text-green-400 font-terminal text-2xl uppercase tracking-widest mb-2 text-center">
        Do you sell online?
      </h2>
      <p className="text-zinc-500 font-terminal text-sm text-center mb-8">
        We&apos;ll configure the right selling tools for your workflow.
      </p>

      <div className="space-y-3 mb-8">
        {options.map(opt => {
          const selected = answers.sellsOnline === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => { setAnswers({ ...answers, sellsOnline: opt.id }); setTimeout(onNext, 180); }}
              className={`w-full border-2 p-4 flex items-center gap-4 text-left transition-all ${
                selected
                  ? "border-green-500 bg-zinc-900"
                  : "border-zinc-700 hover:border-green-800 bg-zinc-950 hover:bg-zinc-900"
              }`}
            >
              <span className="text-3xl">{opt.icon}</span>
              <div>
                <div className="text-white font-terminal text-sm font-bold">{opt.label}</div>
                <div className="text-zinc-500 font-terminal text-xs">{opt.hint}</div>
              </div>
              {selected && <span className="ml-auto text-green-400 font-terminal text-xs">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 font-terminal text-sm transition-colors">
          ◀ Back
        </button>
        <button onClick={onNext} className="text-zinc-500 hover:text-zinc-300 font-terminal text-sm transition-colors">
          Skip →
        </button>
      </div>
    </div>
  );
}

// ─── Step: Solo vs shared ─────────────────────────────────────────────────────

function StepInstanceType({
  answers, setAnswers, onNext, onBack,
}: {
  answers: Answers;
  setAnswers: (a: Answers) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const options: { id: SharedInstance; icon: string; label: string; hint: string }[] = [
    { id: "solo",   icon: "🧍", label: "Just me",          hint: "Personal instance — auth optional" },
    { id: "shared", icon: "👥", label: "Me + others",      hint: "We'll suggest enabling password protection" },
  ];

  return (
    <div>
      <h2 className="text-green-400 font-terminal text-2xl uppercase tracking-widest mb-2 text-center">
        Who&apos;s using this instance?
      </h2>
      <p className="text-zinc-500 font-terminal text-sm text-center mb-8">
        Helps us recommend the right security settings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {options.map(opt => {
          const selected = answers.sharedInstance === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => { setAnswers({ ...answers, sharedInstance: opt.id }); setTimeout(onNext, 180); }}
              className={`border-2 p-6 text-center transition-all ${
                selected
                  ? "border-green-500 bg-zinc-900"
                  : "border-zinc-700 hover:border-green-800 bg-zinc-950 hover:bg-zinc-900"
              }`}
            >
              <div className="text-4xl mb-3">{opt.icon}</div>
              <div className="text-white font-terminal text-sm font-bold mb-1">{opt.label}</div>
              <div className="text-zinc-500 font-terminal text-xs">{opt.hint}</div>
              {selected && <div className="mt-2 text-green-400 font-terminal text-xs">✓</div>}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 font-terminal text-sm transition-colors">
          ◀ Back
        </button>
        <button onClick={onNext} className="text-zinc-500 hover:text-zinc-300 font-terminal text-sm transition-colors">
          Skip →
        </button>
      </div>
    </div>
  );
}

// ─── Step: Identity ───────────────────────────────────────────────────────────

function StepIdentity({
  answers, setAnswers, onNext, onBack,
}: {
  answers: Answers;
  setAnswers: (a: Answers) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const CURRENCIES = [
    { code: "$",  label: "USD — US Dollar" },
    { code: "€",  label: "EUR — Euro" },
    { code: "£",  label: "GBP — British Pound" },
    { code: "C$", label: "CAD — Canadian Dollar" },
    { code: "A$", label: "AUD — Australian Dollar" },
    { code: "¥",  label: "JPY — Japanese Yen" },
  ];

  const inputCls = "w-full bg-black border border-green-800 text-green-300 font-terminal px-3 py-2 focus:outline-none focus:border-green-500";

  return (
    <div>
      <h2 className="text-green-400 font-terminal text-2xl uppercase tracking-widest mb-2 text-center">
        Quick identity check
      </h2>
      <p className="text-zinc-500 font-terminal text-sm text-center mb-8">
        Optional — personalizes your dashboard and reports.
      </p>

      <div className="space-y-4 max-w-md mx-auto mb-8">
        <div>
          <label className="text-zinc-400 font-terminal text-xs uppercase tracking-wider block mb-1">
            Your name (optional)
          </label>
          <input
            className={inputCls}
            placeholder="e.g. Alex"
            value={answers.ownerName}
            onChange={e => setAnswers({ ...answers, ownerName: e.target.value })}
            onKeyDown={e => e.key === "Enter" && onNext()}
          />
        </div>

        <div>
          <label className="text-zinc-400 font-terminal text-xs uppercase tracking-wider block mb-1">
            Currency
          </label>
          <select
            className={inputCls}
            value={answers.currency}
            onChange={e => setAnswers({ ...answers, currency: e.target.value })}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 font-terminal text-sm transition-colors">
          ◀ Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-green-700 hover:bg-green-600 text-black font-terminal font-bold border-2 border-green-500 transition-colors"
        >
          Continue ▶
        </button>
      </div>
    </div>
  );
}

// ─── Step: Done ───────────────────────────────────────────────────────────────

function StepDone({
  answers, saving, onFinish, onBack,
}: {
  answers: Answers;
  saving:  boolean;
  onFinish: () => void;
  onBack:   () => void;
}) {
  const mode = answers.mode ?? "empire";
  const meta = MODE_META[mode];
  const features = meta.features;

  const name     = answers.ownerName ? `, ${answers.ownerName}` : "";
  const currency = answers.currency ?? "$";

  const FEATURE_LABELS: Record<keyof typeof features, string> = {
    collection: "📦 Collection Vault",
    business:   "💰 Business Suite (P&L, Flip, Sourcing)",
    fieldTools: "🔍 Field Tools (Field Mode, Negotiation, Lot Calc)",
    social:     "👥 Social (Players, Friends Mode, Tags)",
    personal:   "🎮 Personal (Play Log, Wishlist, Grails)",
  };

  const enabled  = (Object.keys(features) as (keyof typeof features)[]).filter(k => features[k]);
  const disabled = (Object.keys(features) as (keyof typeof features)[]).filter(k => !features[k]);

  return (
    <div className="text-center">
      <div className="text-6xl mb-4">{meta.icon}</div>
      <h2 className="text-green-400 font-terminal text-2xl uppercase tracking-widest mb-2">
        Ready{name}!
      </h2>
      <p className="text-zinc-400 font-terminal text-sm mb-1">{meta.tagline}</p>
      <p className="text-zinc-600 font-terminal text-xs mb-6">Mode: {meta.title} · Currency: {currency}</p>

      {/* Feature summary */}
      <div className="text-left max-w-sm mx-auto mb-8 space-y-1">
        {enabled.map(k => (
          <div key={k} className="flex items-center gap-2 text-green-400 font-terminal text-xs">
            <span>✓</span><span>{FEATURE_LABELS[k]}</span>
          </div>
        ))}
        {disabled.map(k => (
          <div key={k} className="flex items-center gap-2 text-zinc-700 font-terminal text-xs">
            <span>–</span><span>{FEATURE_LABELS[k]}</span>
          </div>
        ))}
      </div>

      {answers.sharedInstance === "shared" && (
        <div className="mb-6 p-3 border border-yellow-800 bg-yellow-950/20 text-yellow-400 font-terminal text-xs text-left">
          💡 Tip: You selected a shared instance. Consider enabling password protection in{" "}
          <Link href="/settings" className="underline hover:text-yellow-300">Settings → Auth</Link>.
        </div>
      )}

      <p className="text-zinc-600 font-terminal text-xs mb-6">
        You can change any of this later in Settings.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onFinish}
          disabled={saving}
          className="px-8 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-black font-terminal text-lg font-bold border-2 border-green-500 transition-colors"
        >
          {saving ? "SAVING..." : "LET'S GO! 👾"}
        </button>
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 font-terminal text-sm transition-colors">
          ◀ Back
        </button>
      </div>
    </div>
  );
}
