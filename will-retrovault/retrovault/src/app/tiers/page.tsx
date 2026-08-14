"use client";

import { useState, useEffect } from "react";

type GameItem = {
  id: string; title: string; platform: string;
  copies: { id: string }[];
};

// Known catalog sizes (approximate) — these power the completion % calc
const CATALOG_SIZES: Record<string, number> = {
  "NES": 716, "SNES": 724, "N64": 388, "Gamecube": 652, "Switch": 5000,
  "Sega Genesis": 915, "Sega CD": 204, "Dreamcast": 236,
  "PS1": 1261, "PS2": 4491, "PS3": 1352, "PSP": 808,
  "Xbox": 998, "Xbox 360": 2140,
};

type Tier = {
  name: string; emoji: string; threshold: number;
  color: string; bgColor: string; borderColor: string; glowColor: string;
};

const TIERS: Tier[] = [
  { name: "Platinum", emoji: "💎", threshold: 75,
    color: "text-cyan-300", bgColor: "bg-cyan-950/30", borderColor: "border-cyan-500", glowColor: "shadow-[0_0_20px_rgba(6,182,212,0.4)]" },
  { name: "Gold", emoji: "🥇", threshold: 50,
    color: "text-yellow-400", bgColor: "bg-yellow-950/20", borderColor: "border-yellow-500", glowColor: "shadow-[0_0_15px_rgba(234,179,8,0.3)]" },
  { name: "Silver", emoji: "🥈", threshold: 25,
    color: "text-zinc-300", bgColor: "bg-zinc-800/30", borderColor: "border-zinc-400", glowColor: "" },
  { name: "Bronze", emoji: "🥉", threshold: 10,
    color: "text-orange-400", bgColor: "bg-orange-950/20", borderColor: "border-orange-600", glowColor: "" },
  { name: "Collector", emoji: "📦", threshold: 1,
    color: "text-green-400", bgColor: "bg-green-950/10", borderColor: "border-green-800", glowColor: "" },
];

function getTier(pct: number): Tier {
  return TIERS.find(t => pct >= t.threshold) || TIERS[TIERS.length - 1];
}

export default function TiersPage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inventory").then(r => r.json()).then((d: GameItem[]) => {
      setItems(d);
      setLoading(false);
    });
  }, []);

  const platforms = Object.entries(CATALOG_SIZES).map(([platform, catalogSize]) => {
    const ownedItems = items.filter(i => i.platform === platform && (i.copies || []).length > 0);
    const owned = ownedItems.length;
    const pct = Math.min((owned / catalogSize) * 100, 100);
    const tier = getTier(pct);
    return { platform, catalogSize, owned, pct, tier, items: ownedItems };
  }).filter(p => p.owned > 0).sort((a, b) => b.pct - a.pct);

  const selectedPlatform = platforms.find(p => p.platform === selected);

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-8">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🏅 Platform Completion Tiers</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">How deep does your collection go per system?</p>
      </div>

      {/* Tier legend */}
      <div className="flex flex-wrap gap-3 mb-8">
        {TIERS.map(t => (
          <div key={t.name} className={`flex items-center gap-2 px-3 py-1 border ${t.borderColor} ${t.bgColor}`}>
            <span>{t.emoji}</span>
            <span className={`font-terminal text-sm ${t.color}`}>{t.name}</span>
            <span className="text-zinc-600 font-terminal text-xs">≥{t.threshold}%</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal text-2xl animate-pulse text-center py-12">COMPUTING TIERS...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map(p => {
            const { tier } = p;
            const isSelected = selected === p.platform;
            return (
              <button key={p.platform} onClick={() => setSelected(isSelected ? null : p.platform)}
                className={`text-left border-2 p-5 transition-all ${tier.borderColor} ${tier.bgColor} ${tier.glowColor} ${isSelected ? 'ring-2 ring-white/20' : 'hover:opacity-90'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-zinc-200 font-terminal text-lg">{p.platform}</div>
                    <div className={`font-terminal text-sm flex items-center gap-1 ${tier.color}`}>
                      <span>{tier.emoji}</span> {tier.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-terminal text-3xl font-bold ${tier.color}`}>{p.pct.toFixed(1)}%</div>
                    <div className="text-zinc-600 font-terminal text-xs">{p.owned} / {p.catalogSize}</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    p.pct >= 75 ? 'bg-cyan-400' :
                    p.pct >= 50 ? 'bg-yellow-400' :
                    p.pct >= 25 ? 'bg-zinc-300' :
                    p.pct >= 10 ? 'bg-orange-400' : 'bg-green-500'
                  }`} style={{ width: `${p.pct}%` }} />
                </div>
                {/* Next tier */}
                {(() => {
                  const nextTier = TIERS.find(t => t.threshold > p.pct);
                  if (!nextTier) return <div className="text-cyan-700 font-terminal text-xs mt-2">MAX TIER ACHIEVED 💎</div>;
                  const needed = Math.ceil((nextTier.threshold / 100) * p.catalogSize) - p.owned;
                  return <div className="text-zinc-700 font-terminal text-xs mt-2">{needed} more for {nextTier.name} {nextTier.emoji}</div>;
                })()}
              </button>
            );
          })}
        </div>
      )}

      {/* Drill-down panel */}
      {selectedPlatform && (
        <div className="mt-8 border-2 border-zinc-700 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-terminal text-xl ${selectedPlatform.tier.color}`}>
              {selectedPlatform.tier.emoji} {selectedPlatform.platform} — {selectedPlatform.owned} games
            </h3>
            <button onClick={() => setSelected(null)} className="text-zinc-600 hover:text-zinc-300 font-terminal text-sm">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {selectedPlatform.items.map(i => (
              <div key={i.id} className="bg-zinc-950 border border-zinc-800 p-2">
                <span className="text-zinc-300 font-terminal text-sm">{i.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
