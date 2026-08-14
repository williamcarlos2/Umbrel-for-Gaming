"use client";

import { useState, useEffect } from "react";
import { calcFlipMetrics, DEFAULT_EBAY_FEE, DEFAULT_SHIPPING } from "@/lib/flipMath";
import { getPriceTrend, getTotalPaid } from "@/lib/marketUtils";

type GameItem = {
  id: string; title: string; platform: string;
  copies: { priceAcquired: string }[];
  marketLoose?: string; marketCib?: string; marketNew?: string;
  priceHistory?: Record<string, {
    loose?: string | null;
    cib?: string | null;
    new?: string | null;
    graded?: string | null;
    fetchedAt?: string;
  }>;
  isDigital?: boolean;
};

type FlipOpp = {
  id: string; title: string; platform: string;
  avgPaid: number; marketLoose: number;
  profit: number; roi: number; margin: number;
  trend: number | null; // % 30d change
  score: number; // 0-100 composite
  copies: number;
};

const EBAY_FEE = DEFAULT_EBAY_FEE;
const SHIPPING = DEFAULT_SHIPPING;

export default function HotListPage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [minRoi, setMinRoi] = useState(20);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [minCopies, setMinCopies] = useState(1);

  useEffect(() => {
    fetch("/api/inventory").then(r => r.json()).then((d: GameItem[]) => {
      setItems(d);
      setLoading(false);
    });
  }, []);

  const opps: FlipOpp[] = [];
  for (const item of items) {
    if (item.isDigital) continue;
    const copies = item.copies || [];
    if (copies.length < minCopies) continue;
    if (platformFilter !== "all" && item.platform !== platformFilter) continue;

    const market = parseFloat(item.marketLoose || "0");
    if (!market) continue;

    const totalPaid = getTotalPaid(copies);
    const avgPaid = totalPaid / copies.length;
    if (!avgPaid) continue;

    const { profit, roi, margin } = calcFlipMetrics(avgPaid, market, EBAY_FEE, SHIPPING);
    if (roi < minRoi) continue;

    const trend = getPriceTrend(item, 30, 'loose');
    const trendBonus = trend ? Math.min(trend * 1.5, 30) : 0;
    const copyBonus = Math.min((copies.length - 1) * 5, 20);
    const score = Math.min(Math.max((roi / 2) * 0.5 + trendBonus + copyBonus, 0), 100);

    opps.push({
      id: item.id, title: item.title, platform: item.platform,
      avgPaid, marketLoose: market, profit, roi, margin,
      trend, score, copies: copies.length,
    });
  }
  opps.sort((a, b) => b.score - a.score);
  opps.splice(50);

  const platforms = Array.from(new Set(items.map(i => i.platform))).sort();
  const fmt = (n: number) => n >= 0 ? `$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🔥 Hot List</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">Best flip opportunities in your collection right now</p>
        </div>
        <div className="text-right">
          <div className="text-yellow-400 font-terminal text-3xl font-bold">{opps.length}</div>
          <div className="text-zinc-600 font-terminal text-xs">opportunities found</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Min ROI %</label>
          <input type="number" value={minRoi} onChange={e => setMinRoi(Number(e.target.value))} min={0} max={200}
            className="w-24 bg-zinc-950 border-2 border-zinc-700 text-green-300 font-terminal text-xl p-2 text-center focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Min Copies Owned</label>
          <input type="number" value={minCopies} onChange={e => setMinCopies(Number(e.target.value))} min={1} max={10}
            className="w-24 bg-zinc-950 border-2 border-zinc-700 text-green-300 font-terminal text-xl p-2 text-center focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Platform</label>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
            className="bg-zinc-950 border-2 border-zinc-700 text-green-400 font-terminal text-base p-2 focus:outline-none cursor-pointer">
            <option value="all">ALL</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal text-2xl animate-pulse text-center py-12">SCANNING VAULT...</div>
      ) : opps.length === 0 ? (
        <div className="text-zinc-700 font-terminal text-xl text-center py-12">
          No flip opportunities at current thresholds. Try lowering Min ROI.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-terminal text-sm">
            <thead>
              <tr className="border-b-2 border-green-900 text-zinc-500 uppercase text-xs">
                <th className="text-left p-2">Score</th>
                <th className="text-left p-2">Game</th>
                <th className="text-left p-2 hidden md:table-cell">Platform</th>
                <th className="text-right p-2">Paid</th>
                <th className="text-right p-2">Market</th>
                <th className="text-right p-2">Net Profit</th>
                <th className="text-right p-2">ROI</th>
                <th className="text-right p-2 hidden lg:table-cell">30d Trend</th>
                <th className="text-right p-2 hidden md:table-cell">Copies</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((o, i) => (
                <tr key={o.id} className={`border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors ${i < 3 ? 'bg-emerald-950/10' : ''}`}>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(o.score, 100)}%` }} />
                      </div>
                      <span className={`text-xs ${o.score >= 70 ? 'text-emerald-400' : o.score >= 40 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                        {o.score.toFixed(0)}
                      </span>
                    </div>
                  </td>
                  <td className="p-2">
                    <span className="text-green-300">{o.title}</span>
                    {i < 3 && <span className="ml-2 text-yellow-500 text-xs">🔥</span>}
                  </td>
                  <td className="p-2 text-zinc-500 hidden md:table-cell">{o.platform}</td>
                  <td className="p-2 text-right text-zinc-400">{fmt(o.avgPaid)}</td>
                  <td className="p-2 text-right text-blue-400">{fmt(o.marketLoose)}</td>
                  <td className={`p-2 text-right font-bold ${o.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(o.profit)}</td>
                  <td className={`p-2 text-right ${o.roi >= 50 ? 'text-emerald-400' : o.roi >= 25 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {o.roi.toFixed(0)}%
                  </td>
                  <td className={`p-2 text-right hidden lg:table-cell ${!o.trend ? 'text-zinc-700' : o.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {o.trend ? `${o.trend > 0 ? '+' : ''}${o.trend.toFixed(1)}%` : '—'}
                  </td>
                  <td className="p-2 text-right text-zinc-500 hidden md:table-cell">{o.copies}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
