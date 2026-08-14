"use client";

import { useState } from "react";
import { calcFlipMetrics, getFlipVerdict } from "@/lib/flipMath";

const PLATFORMS = [
  "NES", "SNES", "N64", "Gamecube", "Switch",
  "Sega Genesis", "Sega CD", "Dreamcast",
  "PS1", "PS2", "PS3", "PSP",
  "Xbox", "Xbox 360",
];

const VENUES = [
  { id: "ebay", label: "eBay", fee: 0.1325, shipping: 4.50, note: "13.25% final value + ~$4.50 shipping" },
  { id: "mercari", label: "Mercari", fee: 0.10, shipping: 3.00, note: "10% fee + ~$3 shipping" },
  { id: "facebook", label: "Facebook Marketplace", fee: 0.05, shipping: 0, note: "5% local fee, no shipping" },
  { id: "local", label: "Local / Cash", fee: 0, shipping: 0, note: "No fees, no shipping" },
  { id: "convention", label: "Convention / Flea Market", fee: 0.0, shipping: 0, note: "Table fee amortized separately" },
];

const CONDITIONS = ["Loose", "CIB", "New/Sealed", "Graded"];

type Result = {
  grossRevenue: number;
  fees: number;
  shipping: number;
  netRevenue: number;
  profit: number;
  margin: number;
  roi: number;
  verdict: string;
  color: string;
};

function calcFlip(buyPrice: number, sellPrice: number, venueFee: number, shippingCost: number): Result {
  const metrics = calcFlipMetrics(buyPrice, sellPrice, venueFee, shippingCost);
  const { verdict, color } = getFlipVerdict(metrics.roi);
  return { ...metrics, verdict, color };
}

export default function FlipCalculatorPage() {
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [venue, setVenue] = useState("ebay");
  const [condition, setCondition] = useState("Loose");
  const [platform, setPlatform] = useState("");
  const [title, setTitle] = useState("");
  const [customFee, setCustomFee] = useState("");
  const [customShipping, setCustomShipping] = useState("");

  const selectedVenue = VENUES.find(v => v.id === venue) || VENUES[0];
  const feeRate = customFee !== "" ? parseFloat(customFee) / 100 : selectedVenue.fee;
  const shippingCost = customShipping !== "" ? parseFloat(customShipping) : selectedVenue.shipping;

  const buy = parseFloat(buyPrice) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const result = buy > 0 || sell > 0 ? calcFlip(buy, sell, feeRate, shippingCost) : null;

  const fmt = (n: number) => n >= 0 ? `$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">💰 Flip Calculator</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Calculate real profit after fees and shipping</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Game Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Optional..."
                className="w-full bg-black border-2 border-zinc-800 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600" />
            </div>
            <div>
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                className="w-full bg-black border-2 border-zinc-800 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600 cursor-pointer">
                <option value="">Any</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Condition</label>
            <div className="flex gap-2 flex-wrap">
              {CONDITIONS.map(c => (
                <button key={c} onClick={() => setCondition(c)}
                  className={`px-3 py-1 font-terminal text-sm border-2 transition-colors ${condition === c ? "bg-green-700 text-black border-green-500" : "text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">You Paid (Buy Price)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-terminal text-xl">$</span>
                <input type="number" min="0" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
                  className="w-full bg-black border-2 border-green-900 text-green-300 font-terminal text-2xl pl-8 p-3 focus:outline-none focus:border-green-500" />
              </div>
            </div>
            <div>
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Sell Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-terminal text-xl">$</span>
                <input type="number" min="0" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)}
                  className="w-full bg-black border-2 border-blue-900 text-blue-300 font-terminal text-2xl pl-8 p-3 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Venue</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VENUES.map(v => (
                <button key={v.id} onClick={() => setVenue(v.id)}
                  className={`p-3 text-left border-2 transition-colors ${venue === v.id ? "border-green-500 bg-green-900/20" : "border-zinc-800 hover:border-zinc-600"}`}>
                  <div className="font-terminal text-base text-green-400">{v.label}</div>
                  <div className="font-terminal text-xs text-zinc-600">{v.note}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 font-terminal text-xs uppercase mb-1">Override Fee %</label>
              <input type="number" min="0" max="100" step="0.1" value={customFee}
                onChange={e => setCustomFee(e.target.value)} placeholder={`${(selectedVenue.fee * 100).toFixed(1)}`}
                className="w-full bg-black border border-zinc-800 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-zinc-400 font-terminal text-xs uppercase mb-1">Override Shipping $</label>
              <input type="number" min="0" step="0.50" value={customShipping}
                onChange={e => setCustomShipping(e.target.value)} placeholder={`${selectedVenue.shipping.toFixed(2)}`}
                className="w-full bg-black border border-zinc-800 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-zinc-500" />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className={`border-4 p-6 text-center ${
                result.profit >= 0 ? "border-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "border-red-800"
              }`}>
                <div className={`font-terminal text-5xl font-bold mb-2 ${result.color}`}>{result.verdict}</div>
                <div className={`font-terminal text-4xl ${result.profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {fmt(result.profit)}
                </div>
                <div className="text-zinc-500 font-terminal text-sm mt-1">net profit</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Sell Price", val: fmt(result.grossRevenue), color: "text-blue-300" },
                  { label: "Net Revenue", val: fmt(result.netRevenue), color: "text-green-300" },
                  { label: `Fees (${(feeRate * 100).toFixed(1)}%)`, val: `-${fmt(result.fees)}`, color: "text-red-400" },
                  { label: "Shipping", val: `-${fmt(result.shipping)}`, color: "text-red-400" },
                  { label: "Margin", val: `${result.margin.toFixed(1)}%`, color: result.margin >= 20 ? "text-emerald-400" : "text-orange-400" },
                  { label: "ROI", val: `${result.roi.toFixed(1)}%`, color: result.roi >= 25 ? "text-emerald-400" : "text-orange-400" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-zinc-950 border border-zinc-800 p-3">
                    <div className="text-zinc-600 font-terminal text-xs uppercase mb-1">{label}</div>
                    <div className={`font-terminal text-2xl ${color}`}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Break-even info */}
              {buy > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 p-4">
                  <p className="text-zinc-500 font-terminal text-xs uppercase mb-2">Break-Even Analysis</p>
                  <div className="space-y-1">
                    <div className="flex justify-between font-terminal text-sm">
                      <span className="text-zinc-400">Min sell to break even:</span>
                      <span className="text-yellow-400">${((buy + shippingCost) / (1 - feeRate)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-terminal text-sm">
                      <span className="text-zinc-400">For 25% ROI target:</span>
                      <span className="text-green-400">${((buy * 1.25 + shippingCost) / (1 - feeRate)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-terminal text-sm">
                      <span className="text-zinc-400">For 50% ROI target:</span>
                      <span className="text-emerald-400">${((buy * 1.50 + shippingCost) / (1 - feeRate)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-zinc-950 border-2 border-zinc-800 p-12 text-center">
              <div className="text-zinc-700 font-terminal text-2xl">Enter buy + sell prices to calculate</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
