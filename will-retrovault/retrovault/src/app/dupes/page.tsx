"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getCopyDisplayLabel } from "@/lib/copyCondition";

type GameItem = {
  id: string; title: string; platform: string; isDigital?: boolean;
  copies: { id: string; condition: string; hasBox: boolean; hasManual: boolean; priceAcquired: string }[];
  marketLoose?: string;
};

export default function DupesPage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory").then(r => r.json()).then((d: GameItem[]) => {
      setItems(d.filter(i => (i.copies || []).length > 1 && !i.isDigital));
      setLoading(false);
    });
  }, []);

  const totalDupes = items.reduce((s, i) => s + (i.copies || []).length - 1, 0);
  const marketDupeValue = items.reduce((s, i) => {
    return s + (parseFloat(i.marketLoose || "0") || 0) * ((i.copies || []).length - 1);
  }, 0);

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🔎 Duplicate Detector</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">Games you own multiple copies of — sell the extras!</p>
        </div>
        <Link href="/inventory" className="text-blue-400 font-terminal text-sm border border-blue-800 px-4 py-2 hover:bg-blue-900/20 transition-colors">
          View in Vault →
        </Link>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal animate-pulse text-xl text-center py-12">SCANNING VAULT...</div>
      ) : (
        <>
          {/* Summary */}
          {items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-950 border-2 border-orange-800 p-4 text-center">
                <div className="text-orange-400 font-terminal text-3xl font-bold">{items.length}</div>
                <div className="text-zinc-500 font-terminal text-xs uppercase mt-1">Games with dupes</div>
              </div>
              <div className="bg-zinc-950 border-2 border-yellow-800 p-4 text-center">
                <div className="text-yellow-400 font-terminal text-3xl font-bold">{totalDupes}</div>
                <div className="text-zinc-500 font-terminal text-xs uppercase mt-1">Extra copies</div>
              </div>
              <div className="bg-zinc-950 border-2 border-green-800 p-4 text-center">
                <div className="text-green-400 font-terminal text-3xl font-bold">${marketDupeValue.toFixed(0)}</div>
                <div className="text-zinc-500 font-terminal text-xs uppercase mt-1">Sellable market value</div>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-zinc-800">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-zinc-400 font-terminal text-xl mb-2">No duplicates found!</p>
              <p className="text-zinc-600 font-terminal text-sm">Every game in your vault has exactly one copy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-zinc-500 font-terminal text-sm mb-4">
                💡 Consider selling extra copies — these are potential flips sitting on your shelf.
              </p>
              {items
                .sort((a, b) => (parseFloat(b.marketLoose || "0") - parseFloat(a.marketLoose || "0")))
                .map(item => {
                  const extraCopies = (item.copies || []).slice(1);
                  const market = parseFloat(item.marketLoose || "0");
                  const EBAY_FEE = 0.1325; const SHIP = 4.5;
                  const netEach = market > 0 ? (market - market * EBAY_FEE - SHIP) : 0;
                  return (
                    <div key={item.id} className="border-2 border-orange-900 bg-orange-950/10 p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="text-orange-300 font-terminal text-lg">{item.title}</h3>
                          <p className="text-zinc-500 font-terminal text-sm">{item.platform}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-orange-400 font-terminal text-xl font-bold">{(item.copies || []).length}x</div>
                          <div className="text-zinc-600 font-terminal text-xs">copies owned</div>
                          {market > 0 && netEach > 0 && (
                            <div className="text-emerald-400 font-terminal text-sm mt-1">~${netEach.toFixed(0)}/ea net</div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-zinc-600 font-terminal text-xs uppercase mb-1">Extra copies to consider selling:</p>
                        {extraCopies.map((copy, i) => (
                          <div key={copy.id} className="flex items-center gap-3 bg-zinc-950/50 px-3 py-1.5 border border-zinc-800">
                            <span className="text-zinc-500 font-terminal text-xs">Copy {i + 2}:</span>
                            <span className="text-zinc-400 font-terminal text-xs">{copy.condition}</span>
                            <span className={`font-terminal text-xs ${getCopyDisplayLabel(copy) === 'CIB' ? 'text-green-600' : getCopyDisplayLabel(copy) === 'Loose' ? 'text-zinc-500' : 'text-yellow-600'}`}>{getCopyDisplayLabel(copy)}</span>
                            {parseFloat(copy.priceAcquired) > 0 && (
                              <span className="text-zinc-500 font-terminal text-xs ml-auto">paid ${parseFloat(copy.priceAcquired).toFixed(2)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link href="/flip" className="px-3 py-1 font-terminal text-xs text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors">
                          Calculate flip →
                        </Link>
                        <a href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(item.title + " " + item.platform)}&LH_Sold=1&LH_Complete=1`}
                          target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1 font-terminal text-xs text-yellow-500 border border-yellow-800 hover:bg-yellow-900/20 transition-colors">
                          eBay sold ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
