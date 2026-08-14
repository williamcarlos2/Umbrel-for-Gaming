"use client";
import { useState, useEffect } from "react";

type GameItem = {
  id: string; title: string; platform: string; isDigital?: boolean;
  copies: { priceAcquired: string }[];
  marketLoose?: string; marketCib?: string;
  priceHistory?: Record<string, { loose?: string | null }>;
};

const PLATFORM_ERA: Record<string, number> = {
  "NES": 1985, "Sega Genesis": 1989, "SNES": 1991, "Sega CD": 1992,
  "PS1": 1995, "N64": 1996, "Dreamcast": 1999, "PS2": 2000,
  "Xbox": 2001, "Gamecube": 2001, "PSP": 2005, "Xbox 360": 2005, "PS3": 2006, "Switch": 2017,
};

function getPlatformTrend(items: GameItem[], platform: string): number | null {
  const platItems = items.filter(i => i.platform === platform && i.priceHistory);
  if (platItems.length < 3) return null;
  const trends: number[] = [];
  for (const item of platItems) {
    const h = item.priceHistory!;
    const dates = Object.keys(h).sort();
    if (dates.length < 2) continue;
    const latest = parseFloat(h[dates[dates.length - 1]]?.loose || "0");
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const past = dates.filter(d => new Date(d) <= cutoff);
    if (!past.length) continue;
    const pastVal = parseFloat(h[past[past.length - 1]]?.loose || "0");
    if (pastVal > 0 && latest > 0) trends.push(((latest - pastVal) / pastVal) * 100);
  }
  if (!trends.length) return null;
  return trends.reduce((a, b) => a + b, 0) / trends.length;
}

export default function MarketPage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"trend" | "value" | "era">("trend");

  useEffect(() => {
    fetch("/api/inventory").then(r => r.json()).then((d: GameItem[]) => {
      setItems(d.filter(i => !i.isDigital));
      setLoading(false);
    });
  }, []);

  const platforms = Array.from(new Set(items.map(i => i.platform)));
  const platformData = platforms.map(plat => {
    const platItems = items.filter(i => i.platform === plat);
    const ownedItems = platItems.filter(i => (i.copies || []).length > 0);
    const totalValue = ownedItems.reduce((s, i) => s + (parseFloat(i.marketLoose || "0") || 0), 0);
    const avgPrice = platItems.filter(i => parseFloat(i.marketLoose || "0") > 0).reduce((s, i, _, a) => s + parseFloat(i.marketLoose!) / a.length, 0);
    const trend = getPlatformTrend(platItems, plat);
    const catalogSize = platItems.length;
    const era = PLATFORM_ERA[plat] || 2000;
    return { plat, catalogSize, ownedCount: ownedItems.length, totalValue, avgPrice, trend, era };
  }).filter(p => p.catalogSize > 5);

  const sorted = [...platformData].sort((a, b) => {
    if (sortBy === "trend") return (b.trend ?? -999) - (a.trend ?? -999);
    if (sortBy === "value") return b.totalValue - a.totalValue;
    return a.era - b.era;
  });

  const maxValue = Math.max(...sorted.map(p => p.totalValue), 1);
  const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📈 Platform Market Report</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">Which platforms are heating up or cooling down?</p>
        </div>
        <div className="flex gap-2">
          {[["trend","🔥 By Trend"],["value","💰 By Value"],["era","📅 By Era"]].map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v as 'trend' | 'value' | 'era')}
              className={`px-3 py-1.5 font-terminal text-xs border-2 transition-colors ${sortBy === v ? "bg-green-700 text-black border-green-500" : "text-zinc-500 border-zinc-700 hover:border-zinc-500"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal animate-pulse text-xl text-center py-12">LOADING MARKET DATA...</div>
      ) : (
        <>
          {/* Hot/Cold signals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              { label: "🔥 Trending UP", items: sorted.filter(p => (p.trend ?? 0) > 5).slice(0, 3), color: "border-green-700 bg-green-950/10", tc: "text-green-400" },
              { label: "🧊 Trending DOWN", items: sorted.filter(p => (p.trend ?? 0) < -2).slice(0, 3), color: "border-blue-900 bg-blue-950/10", tc: "text-blue-400" },
            ].map(({ label, items: pItems, color, tc }) => (
              <div key={label} className={`border-2 p-4 ${color}`}>
                <h3 className={`font-terminal text-base uppercase mb-3 ${tc}`}>{label}</h3>
                {pItems.length === 0 ? (
                  <p className="text-zinc-700 font-terminal text-sm">Not enough price history data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {pItems.map(p => (
                      <div key={p.plat} className="flex justify-between items-center">
                        <span className="text-zinc-300 font-terminal text-sm">{p.plat}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 font-terminal text-xs">avg ${p.avgPrice.toFixed(0)}</span>
                          <span className={`font-terminal text-sm font-bold ${(p.trend ?? 0) > 0 ? "text-green-400" : "text-blue-400"}`}>
                            {(p.trend ?? 0) > 0 ? "+" : ""}{(p.trend ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Full platform table */}
          <div className="space-y-3">
            {sorted.map(p => {
              const trend = p.trend;
              const barWidth = (p.totalValue / maxValue) * 100;
              return (
                <div key={p.plat} className="border border-zinc-800 p-4 hover:border-zinc-600 transition-colors">
                  <div className="flex flex-wrap items-center gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-zinc-200 font-terminal text-lg">{p.plat}</span>
                        <span className="text-zinc-600 font-terminal text-xs">{p.era}</span>
                        {trend !== null && (
                          <span className={`font-terminal text-sm px-2 py-0.5 border ${
                            trend > 10 ? "text-emerald-400 border-emerald-700" :
                            trend > 3 ? "text-green-400 border-green-800" :
                            trend > -3 ? "text-zinc-400 border-zinc-700" :
                            "text-blue-400 border-blue-900"
                          }`}>
                            {trend > 0 ? "+" : ""}{trend.toFixed(1)}% (30d)
                          </span>
                        )}
                        {trend === null && <span className="text-zinc-700 font-terminal text-xs">insufficient data</span>}
                      </div>
                    </div>
                    <div className="flex gap-4 shrink-0 text-right">
                      <div>
                        <div className="text-zinc-400 font-terminal text-base">{fmt(p.avgPrice)}</div>
                        <div className="text-zinc-700 font-terminal text-xs">avg price</div>
                      </div>
                      <div>
                        <div className="text-blue-400 font-terminal text-base font-bold">{fmt(p.totalValue)}</div>
                        <div className="text-zinc-700 font-terminal text-xs">your holdings</div>
                      </div>
                      <div>
                        <div className="text-zinc-400 font-terminal text-base">{p.ownedCount}/{p.catalogSize}</div>
                        <div className="text-zinc-700 font-terminal text-xs">owned/catalog</div>
                      </div>
                    </div>
                  </div>
                  {/* Value bar */}
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      trend !== null && trend > 5 ? "bg-green-500" : trend !== null && trend < -2 ? "bg-blue-500" : "bg-zinc-600"
                    }`} style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-zinc-700 font-terminal text-xs mt-4">
            Trend data requires 30+ days of price history. Run the price scraper regularly to build trend accuracy.
          </p>
        </>
      )}
    </div>
  );
}
