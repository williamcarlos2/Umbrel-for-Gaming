"use client";

import { useState, useEffect } from "react";
import { unlockAchievement } from "@/lib/achievementUnlocks";

const SCENARIOS = [
  { id: "fb", label: "Facebook Marketplace", icon: "📱", note: "Know their price before arriving. Cash is king." },
  { id: "convention", label: "Gaming Convention", icon: "🎪", note: "Dealers expect to negotiate. Bundle deals are common." },
  { id: "thrift", label: "Thrift Store", icon: "🏪", note: "Prices are usually firm. Ask for 'as-is' discount on untested items." },
  { id: "garage", label: "Garage Sale", icon: "🏠", note: "Sellers want it gone. Bundles and cash work best." },
  { id: "individual", label: "1:1 Private Deal", icon: "🤝", note: "Research both sides. Be fair, not aggressive." },
];

const TACTICS = [
  { label: "Bundle offer", desc: "Offer to buy multiple items together for a lower unit price." },
  { label: "Cash advantage", desc: "Emphasize cash in hand, no apps, no fees, no waiting." },
  { label: "Condition discount", desc: "Point out missing manual, worn label, or untested status." },
  { label: "Comp pricing", desc: "Show eBay sold listings on your phone to anchor fair value." },
  { label: "Walk-away power", desc: "Be genuinely prepared to leave. It's your strongest card." },
  { label: "Split the difference", desc: "Meet in the middle — feels fair to both parties." },
  { label: "Add-on ask", desc: "Accept their price but ask them to throw in a related item." },
];

export default function NegotiatePage() {
  const [scenario, setScenario] = useState("fb");

  useEffect(() => {
    void unlockAchievement('a_negotiator');
  }, []);
  const [askPrice, setAskPrice] = useState("");
  const [marketPrice, setMarketPrice] = useState("");
  const [budget, setBudget] = useState("");
  const [condition, setCondition] = useState("Good");

  const ask = parseFloat(askPrice) || 0;
  const market = parseFloat(marketPrice) || 0;
  const bud = parseFloat(budget) || 0;

  const selectedScenario = SCENARIOS.find(s => s.id === scenario)!;

  // Anchor: what PriceCharting says
  const anchorRatio = market > 0 && ask > 0 ? ask / market : null;
  const isOverpriced = anchorRatio ? anchorRatio > 1.1 : false;
  const isUnderpriced = anchorRatio ? anchorRatio < 0.85 : false;

  // Condition discount %
  const conditionDiscount: Record<string, number> = {
    "Mint/CIB": 0, "Good/Loose": 0.05, "Worn Label": 0.15, "Untested": 0.25, "Missing Manual": 0.10,
  };
  const discountPct = conditionDiscount[condition] || 0;
  const adjustedMarket = market * (1 - discountPct);

  // Suggested offers
  const aggressiveOffer = Math.round(Math.min(adjustedMarket * 0.60, bud || Infinity) * 2) / 2;
  const fairOffer = Math.round(Math.min(adjustedMarket * 0.78, bud || Infinity) * 2) / 2;
  const maxOffer = Math.round(Math.min(adjustedMarket * 0.90, bud || Infinity) * 2) / 2;
  const walkAway = bud || maxOffer;

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🤝 Negotiation Helper</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Know your numbers. Make smarter offers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          {/* Scenario */}
          <div>
            <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Scenario</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCENARIOS.map(s => (
                <button key={s.id} onClick={() => setScenario(s.id)}
                  className={`p-3 text-left border-2 transition-colors ${scenario === s.id ? 'border-green-500 bg-green-900/20' : 'border-zinc-800 hover:border-zinc-600'}`}>
                  <div className="font-terminal text-base">{s.icon} {s.label}</div>
                </button>
              ))}
            </div>
            <p className="text-zinc-600 font-terminal text-xs mt-2 italic">{selectedScenario.note}</p>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Their Ask</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 font-terminal text-xl">$</span>
                <input type="number" min="0" step="0.50" value={askPrice} onChange={e => setAskPrice(e.target.value)}
                  className="w-full bg-black border-2 border-red-900 text-red-300 font-terminal text-2xl pl-8 p-3 focus:outline-none focus:border-red-600" />
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Market Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-terminal text-xl">$</span>
                <input type="number" min="0" step="0.50" value={marketPrice} onChange={e => setMarketPrice(e.target.value)}
                  className="w-full bg-black border-2 border-blue-900 text-blue-300 font-terminal text-2xl pl-8 p-3 focus:outline-none focus:border-blue-600" />
              </div>
              <p className="text-zinc-700 font-terminal text-xs mt-1">PriceCharting loose value</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Your Budget Ceiling</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600 font-terminal text-xl">$</span>
                <input type="number" min="0" step="1" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="optional"
                  className="w-full bg-black border-2 border-yellow-900 text-yellow-300 font-terminal text-2xl pl-8 p-3 focus:outline-none focus:border-yellow-600" />
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value)}
                className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-3 focus:outline-none cursor-pointer">
                {Object.keys(conditionDiscount).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {(ask > 0 || market > 0) ? (
            <>
              {/* Price assessment */}
              {market > 0 && ask > 0 && (
                <div className={`border-2 p-4 font-terminal ${
                  isOverpriced ? 'border-red-700 bg-red-950/20' :
                  isUnderpriced ? 'border-emerald-700 bg-emerald-950/20' :
                  'border-yellow-700 bg-yellow-950/10'
                }`}>
                  <div className={`text-2xl font-bold mb-1 ${isOverpriced ? 'text-red-400' : isUnderpriced ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {isOverpriced ? '⚠️ OVERPRICED' : isUnderpriced ? '✅ UNDERPRICED' : '🟡 FAIR PRICE'}
                  </div>
                  <div className="text-zinc-400 text-sm">
                    Their ask is <span className="font-bold">{anchorRatio ? `${((anchorRatio - 1) * 100 > 0 ? '+' : '')}${((anchorRatio - 1) * 100).toFixed(0)}%` : '—'}</span> vs market value
                    {discountPct > 0 && <span className="text-zinc-600"> (adjusted {(discountPct * 100).toFixed(0)}% for condition)</span>}
                  </div>
                </div>
              )}

              {/* Offer ladder */}
              {market > 0 && (
                <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                  <p className="text-zinc-500 font-terminal text-xs uppercase">Offer Strategy</p>
                  {[
                    { label: "Opening Offer (aggressive)", val: aggressiveOffer, color: "text-orange-400", tip: "Start here. Expect a counter." },
                    { label: "Target Offer (fair)", val: fairOffer, color: "text-green-400", tip: "This is your real goal." },
                    { label: "Max Offer (walk away after)", val: maxOffer, color: "text-blue-400", tip: "Don't go above this." },
                    { label: "Walk-Away Point", val: walkAway, color: "text-red-400", tip: bud ? "Your hard budget limit." : "Based on market value." },
                  ].map(({ label, val, color, tip }) => (
                    <div key={label} className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                      <div>
                        <div className={`font-terminal text-base ${color}`}>{label}</div>
                        <div className="text-zinc-700 font-terminal text-xs">{tip}</div>
                      </div>
                      <div className={`font-terminal text-2xl font-bold shrink-0 ${color}`}>{fmt(val)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Script */}
              {market > 0 && ask > 0 && (
                <div className="border border-purple-900/40 bg-purple-950/10 p-4">
                  <p className="text-purple-500 font-terminal text-xs uppercase mb-2">💬 Suggested Opening Line</p>
                  <p className="text-zinc-300 font-terminal text-sm italic">
                    {isOverpriced
                      ? `"I'm seeing these go for around ${fmt(adjustedMarket)} on eBay — would you do ${fmt(aggressiveOffer)} for cash right now?"`
                      : isUnderpriced
                      ? `"I'll take it at ${fmt(ask)} — do you have anything else you're looking to move?"`
                      : `"Would you do ${fmt(aggressiveOffer)}? I've got cash on me."`
                    }
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-zinc-950 border-2 border-zinc-800 p-12 text-center">
              <div className="text-zinc-700 font-terminal text-xl">Enter their ask price and market value to get a strategy</div>
            </div>
          )}

          {/* Tactic cards */}
          <div>
            <p className="text-zinc-500 font-terminal text-xs uppercase mb-3">Negotiation Tactics</p>
            <div className="grid grid-cols-1 gap-2">
              {TACTICS.map(t => (
                <div key={t.label} className="border border-zinc-800 bg-zinc-950 p-3 flex gap-3">
                  <div className="text-green-700 font-terminal text-lg shrink-0">▶</div>
                  <div>
                    <div className="text-green-400 font-terminal text-sm">{t.label}</div>
                    <div className="text-zinc-600 font-terminal text-xs">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
