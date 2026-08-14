"use client";
import { useState, useEffect, useRef } from "react";
import { getCopyDisplayLabel, getCopyMarketValue } from "@/lib/copyCondition";
import { unlockAchievement } from "@/lib/achievementUnlocks";

type GameItem = {
  id: string; title: string; platform: string; isDigital?: boolean;
  copies: { id: string; condition: string; hasBox: boolean; hasManual: boolean; priceAcquired: string }[];
  marketLoose?: string; marketCib?: string; marketNew?: string;
  purchaseDate?: string; source?: string;
};

function getItemValue(item: GameItem, copy: GameItem["copies"][0]): number {
  return getCopyMarketValue(item, copy);
}

export default function InsurancePage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState("");
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [insuranceAchievementFired, setInsuranceAchievementFired] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/inventory").then(r => r.json()).then((d: GameItem[]) => {
      setItems(d.filter(i => (i.copies || []).length > 0 && !i.isDigital));
      setLoading(false);
    });
    fetch("/api/config").then(r => r.json()).then(c => { if (c?.ownerName) setOwnerName(c.ownerName); });
  }, []);

  const allCopies: { item: GameItem; copy: GameItem["copies"][0]; value: number }[] = [];
  for (const item of items) {
    for (const copy of item.copies || []) {
      const value = getItemValue(item, copy);
      if (value > 0) allCopies.push({ item, copy, value });
    }
  }
  allCopies.sort((a, b) => b.value - a.value);

  const totalValue = allCopies.reduce((s, c) => s + c.value, 0);
  const totalItems = allCopies.length;
  const avgValue = totalItems > 0 ? totalValue / totalItems : 0;
  const top10Value = allCopies.slice(0, 10).reduce((s, c) => s + c.value, 0);

  const byPlatform = items.reduce((acc, item) => {
    const val = (item.copies || []).reduce((s, copy) => s + getItemValue(item, copy), 0);
    if (!acc[item.platform]) acc[item.platform] = 0;
    acc[item.platform] += val;
    return acc;
  }, {} as Record<string, number>);

  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const fmtK = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);

  const generate = () => {
    setGeneratedAt(new Date());
    if (!insuranceAchievementFired) {
      setInsuranceAchievementFired(true);
      void unlockAchievement('a_insurance');
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📋 Insurance Valuation</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">Generate a collection valuation document for insurance purposes</p>
        </div>
        <div className="flex gap-3">
          <button onClick={generate}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-sm font-bold border-2 border-green-400 transition-colors">
            GENERATE REPORT
          </button>
          {generatedAt && (
            <button onClick={handlePrint}
              className="px-4 py-2 text-blue-400 font-terminal text-sm border border-blue-800 hover:bg-blue-900/20 transition-colors">
              🖨️ PRINT / SAVE PDF
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal animate-pulse text-xl text-center py-12">LOADING COLLECTION...</div>
      ) : (
        <>
          {/* Setup */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1">
              <label className="block text-zinc-400 font-terminal text-sm uppercase mb-1">Collection Owner Name</label>
              <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
                placeholder="Your name or entity name"
                className="w-full bg-zinc-950 border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600" />
            </div>
            <div className="text-right">
              <div className="text-zinc-500 font-terminal text-xs uppercase mb-1">Data source</div>
              <div className="text-zinc-400 font-terminal text-sm">PriceCharting market data</div>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Items", val: totalItems.toString(), color: "text-green-400" },
              { label: "Estimated Value", val: fmtK(totalValue), color: "text-blue-400" },
              { label: "Avg per Item", val: fmt(avgValue), color: "text-zinc-300" },
              { label: "Top 10 Value", val: fmtK(top10Value), color: "text-yellow-400" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-zinc-950 border border-zinc-700 p-4 text-center">
                <div className={`font-terminal text-2xl font-bold ${color}`}>{val}</div>
                <div className="text-zinc-600 font-terminal text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Report */}
          {generatedAt && (
            <div ref={printRef} className="border-2 border-zinc-600 p-6 space-y-6">
              <div className="border-b-2 border-zinc-700 pb-4">
                <h3 className="text-zinc-200 font-terminal text-2xl uppercase">Video Game Collection — Insurance Valuation</h3>
                <p className="text-zinc-500 font-terminal text-sm mt-1">
                  Owner: {ownerName || "Not specified"} · Generated: {generatedAt.toLocaleDateString()} · Values from PriceCharting.com
                </p>
                <p className="text-zinc-600 font-terminal text-xs mt-1">
                  Note: Values represent current loose market prices unless CIB/Sealed noted. Consult a certified appraiser for formal insurance documentation.
                </p>
              </div>

              {/* Platform summary */}
              <div>
                <h4 className="text-zinc-400 font-terminal text-sm uppercase mb-3">Value by Platform</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([plat, val]) => (
                    <div key={plat} className="flex justify-between border border-zinc-800 p-2">
                      <span className="text-zinc-400 font-terminal text-xs">{plat}</span>
                      <span className="text-zinc-300 font-terminal text-xs font-bold">{fmtK(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 25 items */}
              <div>
                <h4 className="text-zinc-400 font-terminal text-sm uppercase mb-3">High-Value Items (Top {Math.min(25, allCopies.length)})</h4>
                <table className="w-full font-terminal text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700 text-zinc-600 uppercase">
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Platform</th>
                      <th className="text-left p-2">Condition</th>
                      <th className="text-left p-2">CIB?</th>
                      <th className="text-right p-2">Est. Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCopies.slice(0, 25).map(({ item, copy, value }, i) => (
                      <tr key={`${item.id}-${copy.id}`} className="border-b border-zinc-900">
                        <td className="p-2 text-zinc-600">{i + 1}</td>
                        <td className="p-2 text-zinc-300">{item.title}</td>
                        <td className="p-2 text-zinc-500">{item.platform}</td>
                        <td className="p-2 text-zinc-500">{copy.condition}</td>
                        <td className="p-2 text-zinc-500">{getCopyDisplayLabel(copy)}</td>
                        <td className="p-2 text-right text-green-400 font-bold">{fmt(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-700">
                      <td colSpan={5} className="p-2 text-zinc-400 font-bold text-right">TOTAL ESTIMATED VALUE:</td>
                      <td className="p-2 text-right text-blue-400 font-bold text-base">{fmt(totalValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-zinc-700 font-terminal text-xs border-t border-zinc-800 pt-3">
                This valuation is based on PriceCharting.com market data as of {generatedAt.toLocaleDateString()}. Values represent approximate current market prices for loose copies unless noted. Condition assessment and final valuation for insurance purposes should be performed by a certified appraiser. RetroVault is not responsible for the accuracy of this estimate for legal or insurance claims.
              </p>
            </div>
          )}

          {!generatedAt && (
            <div className="text-center py-10 border-2 border-dashed border-zinc-800">
              <p className="text-zinc-600 font-terminal text-lg mb-3">Set your name above, then click &quot;Generate Report&quot;</p>
              <p className="text-zinc-700 font-terminal text-sm">The report will show your full collection value breakdown, platform summary, and top items for insurance documentation.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
