"use client";
import { useState } from "react";
import Link from "next/link";

type Check = { id: string; text: string; why: string; tip: string; critical: boolean };

const LISTING_CHECKS: Check[] = [
  { id: "photos_count", text: "5+ clear photos included", why: "Listings with 5+ photos sell 40% faster and for higher prices.", tip: "Shoot: front label, back, all 4 sides, PCB if cartridge, any flaws.", critical: true },
  { id: "photos_lighting", text: "Photos are well-lit with no shadows or blur", why: "Dark or blurry photos signal careless sellers — buyers discount or skip.", tip: "Natural light near a window, or a white foam board reflector. No flash.", critical: true },
  { id: "photos_flaw", text: "Photos show any flaws honestly", why: "Undisclosed flaws = returns and bad feedback. Transparency = trust.", tip: "Include a close-up of any scratches, label issues, or worn areas.", critical: true },
  { id: "price_sold", text: "Price is based on eBay SOLD listings, not listed prices", why: "Pricing from active listings instead of sold is the most common mistake.", tip: "Filter eBay to Completed/Sold. Average the last 10 comparable sales.", critical: true },
  { id: "condition_accurate", text: "Condition is described accurately in the title and description", why: "Buyers scan titles fast. 'CIB', 'Loose', 'Complete', 'Sealed' in the title helps.", tip: "Title format: [Game Name] [Platform] [Condition] — e.g. 'Chrono Trigger SNES CIB Complete'", critical: true },
  { id: "tested", text: "Item is noted as 'Tested and Working' if applicable", why: "Untested items sell for 20-30% less. If you've tested it, say so.", tip: "For cartridges: boot it up. For discs: reach the main menu. For consoles: test all ports.", critical: false },
  { id: "title_keyword", text: "Title includes platform name, condition, and key searchable terms", why: "eBay search is title-only. Missing keywords = invisible listing.", tip: "Use common abbreviations buyers search: SNES, NES, PS1, CIB, Complete, Lot, Bundle.", critical: false },
  { id: "shipping", text: "Shipping is calculated accurately (or free)", why: "Underpriced shipping eats profit. Overpriced shipping loses sales.", tip: "Weigh the item with packaging. Use eBay's shipping calculator. Bubble mailers for carts, boxes for consoles.", critical: false },
  { id: "description", text: "Description covers: condition, contents, testing, flaws", why: "Thorough descriptions reduce buyer questions and build confidence.", tip: "Include: what's in the box, what you tested, any known issues, your return policy.", critical: false },
  { id: "returns", text: "Return policy is clearly stated", why: "'No returns' can deter buyers. '30-day returns' can increase sale price and speed.", tip: "For valuable items, consider accepting returns — it signals confidence in your description.", critical: false },
  { id: "timing", text: "Listing ends during high-traffic hours (Sunday evening or holiday week)", why: "Auction-style listings that end when buyers are online get more bids and higher prices.", tip: "Sunday 7-9pm ET is historically peak eBay traffic. Holiday weeks amplify demand for gift-worthy items.", critical: false },
  { id: "category", text: "Item is listed in the correct eBay category", why: "Wrong category = less visibility in browse and search.", tip: "Video Games > [Platform] > Games. For hardware: Video Games > [Platform] > Consoles.", critical: false },
];

const SCORE_LEVELS = [
  { min: 90, label: "EXCELLENT LISTING", color: "text-emerald-400", desc: "Your listing is optimized. Expect fast sales at strong prices." },
  { min: 70, label: "SOLID LISTING", color: "text-green-400", desc: "Good fundamentals. One or two improvements could significantly boost results." },
  { min: 50, label: "AVERAGE LISTING", color: "text-yellow-400", desc: "Functional but leaving money on the table. Address the critical issues first." },
  { min: 0, label: "NEEDS WORK", color: "text-red-400", desc: "Missing fundamentals. Fix these before listing for best results." },
];

export default function ListingPage() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const answered = Object.keys(checks);
  const passed = Object.entries(checks).filter(([, v]) => v).length;
  const criticalFails = LISTING_CHECKS.filter(c => c.critical && checks[c.id] === false);
  const score = answered.length > 0 ? Math.round((passed / LISTING_CHECKS.length) * 100) : 0;
  const progress = (answered.length / LISTING_CHECKS.length) * 100;
  const level = SCORE_LEVELS.find(l => score >= l.min) || SCORE_LEVELS[SCORE_LEVELS.length - 1];

  const toggle = (id: string, val: boolean) => setChecks(c => ({ ...c, [id]: val }));
  const reset = () => setChecks({});

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📝 Listing Quality Checker</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Run through this before every eBay or Mercari listing. Better listings = faster sales at higher prices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 font-terminal text-sm">{answered.length}/{LISTING_CHECKS.length} checked</span>
            <button onClick={reset} className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs transition-colors">RESET</button>
          </div>

          {/* Critical checks first */}
          <div className="space-y-2">
            <p className="text-red-500 font-terminal text-xs uppercase">Critical (do these first)</p>
            {LISTING_CHECKS.filter(c => c.critical).map(check => (
              <CheckRow key={check.id} check={check} value={checks[check.id]} onToggle={toggle} />
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <p className="text-zinc-500 font-terminal text-xs uppercase">Good to have</p>
            {LISTING_CHECKS.filter(c => !c.critical).map(check => (
              <CheckRow key={check.id} check={check} value={checks[check.id]} onToggle={toggle} />
            ))}
          </div>
        </div>

        {/* Score panel */}
        <div className="space-y-4">
          <div className="border-2 border-green-800 p-5 sticky top-4 space-y-4">
            <h3 className="text-green-400 font-terminal text-lg uppercase">Listing Score</h3>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="text-center py-3 border border-zinc-800">
              <div className={`font-terminal text-6xl font-bold ${level.color}`}>{score}</div>
              <div className={`font-terminal text-sm mt-1 ${level.color}`}>{level.label}</div>
              <p className="text-zinc-600 font-terminal text-xs mt-2">{level.desc}</p>
            </div>

            {criticalFails.length > 0 && (
              <div className="space-y-2">
                <p className="text-red-500 font-terminal text-xs uppercase">Fix these first:</p>
                {criticalFails.map(c => (
                  <div key={c.id} className="border border-red-900 bg-red-950/20 p-2">
                    <p className="text-zinc-400 font-terminal text-xs">{c.text}</p>
                    <p className="text-zinc-600 font-terminal text-xs mt-1">{c.tip}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <p className="text-zinc-600 font-terminal text-xs uppercase">Quick links</p>
              <Link href="/flip" className="block text-blue-500 hover:text-blue-400 font-terminal text-xs transition-colors">💸 Calculate flip profit →</Link>
              <Link href="/inventory" className="block text-green-500 hover:text-green-400 font-terminal text-xs transition-colors">📦 View your inventory →</Link>
              <a href="https://www.ebay.com/sch/i.html?LH_Sold=1&LH_Complete=1" target="_blank" rel="noopener noreferrer"
                className="block text-yellow-500 hover:text-yellow-400 font-terminal text-xs transition-colors">↗ eBay sold listings</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ check, value, onToggle }: { check: Check; value: boolean | undefined; onToggle: (id: string, val: boolean) => void }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div className={`border p-3 transition-colors ${
      value === true ? "border-green-800 bg-green-950/20" :
      value === false ? "border-red-900 bg-red-950/10" :
      "border-zinc-800"
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex gap-2 shrink-0 pt-0.5">
          <button onClick={() => onToggle(check.id, true)}
            className={`w-7 h-7 font-terminal text-sm border transition-colors ${value === true ? "bg-green-600 text-black border-green-400" : "text-zinc-600 border-zinc-700 hover:border-green-700"}`}>✓</button>
          <button onClick={() => onToggle(check.id, false)}
            className={`w-7 h-7 font-terminal text-sm border transition-colors ${value === false ? "bg-red-700 text-white border-red-500" : "text-zinc-600 border-zinc-700 hover:border-red-800"}`}>✕</button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-zinc-200 font-terminal text-sm flex-1">{check.text}</p>
            <button onClick={() => setShowTip(!showTip)} className="text-zinc-700 hover:text-zinc-500 font-terminal text-xs shrink-0">?</button>
          </div>
          {showTip && (
            <div className="mt-2 space-y-1">
              <p className="text-zinc-500 font-terminal text-xs">{check.why}</p>
              <p className="text-green-700 font-terminal text-xs">💡 {check.tip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
