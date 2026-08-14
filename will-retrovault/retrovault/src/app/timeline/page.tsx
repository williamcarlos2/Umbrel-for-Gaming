"use client";

import { useState, useEffect } from "react";

type GameItem = {
  id: string; title: string; platform: string;
  copies: { id: string }[];
  releaseYear?: number;
};

// Approximate release years for known platforms (for sorting/display)
const PLATFORM_ERA: Record<string, number> = {
  "NES": 1985, "Sega Genesis": 1989, "SNES": 1991, "Sega CD": 1992,
  "PS1": 1995, "N64": 1996, "Dreamcast": 1999, "PS2": 2000,
  "Xbox": 2001, "Gamecube": 2001, "PSP": 2005, "Xbox 360": 2005, "PS3": 2006,
  "Switch": 2017,
};

const PLATFORM_COLORS: Record<string, string> = {
  "NES": "bg-red-800", "SNES": "bg-purple-800", "N64": "bg-blue-800",
  "Gamecube": "bg-indigo-700", "Switch": "bg-red-600",
  "Sega Genesis": "bg-blue-900", "Sega CD": "bg-blue-950", "Dreamcast": "bg-orange-700",
  "PS1": "bg-gray-700", "PS2": "bg-zinc-700", "PS3": "bg-slate-700",
  "PSP": "bg-slate-600", "Xbox": "bg-green-900", "Xbox 360": "bg-green-800",
};

export default function TimelinePage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDecade, setHoveredDecade] = useState<number | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inventory").then(r => r.json()).then((d: GameItem[]) => {
      setItems(d.filter(i => (i.copies || []).length > 0));
      setLoading(false);
    });
  }, []);

  // Group by platform era decade
  const byDecade: Record<number, { platform: string; count: number; items: GameItem[] }[]> = {};

  const ownedByPlatform: Record<string, GameItem[]> = {};
  for (const item of items) {
    if (!ownedByPlatform[item.platform]) ownedByPlatform[item.platform] = [];
    ownedByPlatform[item.platform].push(item);
  }

  const decades = [1980, 1990, 2000, 2010, 2020];
  for (const decade of decades) {
    byDecade[decade] = [];
    for (const [platform, platformItems] of Object.entries(ownedByPlatform)) {
      const era = PLATFORM_ERA[platform] || 2000;
      if (era >= decade && era < decade + 10) {
        byDecade[decade].push({ platform, count: platformItems.length, items: platformItems });
      }
    }
    byDecade[decade].sort((a, b) => (PLATFORM_ERA[a.platform] || 0) - (PLATFORM_ERA[b.platform] || 0));
  }

  const totalOwned = items.length;
  const platforms = Object.keys(ownedByPlatform).sort((a, b) => (PLATFORM_ERA[a] || 0) - (PLATFORM_ERA[b] || 0));
  const maxCount = Math.max(...Object.values(ownedByPlatform).map(v => v.length), 1);

  const selectedItems = selectedPlatform ? ownedByPlatform[selectedPlatform] || [] : [];

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-8">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📅 Decade Timeline</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">{totalOwned} owned games across gaming history</p>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal text-2xl animate-pulse text-center py-12">LOADING TIMELINE...</div>
      ) : (
        <>
          {/* Bar chart by platform */}
          <div className="mb-10">
            <h3 className="text-zinc-400 font-terminal text-lg uppercase mb-4">Collection by Platform</h3>
            <div className="space-y-2">
              {platforms.map(plat => {
                const count = ownedByPlatform[plat]?.length || 0;
                const width = (count / maxCount) * 100;
                const color = PLATFORM_COLORS[plat] || "bg-zinc-700";
                const era = PLATFORM_ERA[plat];
                return (
                  <button key={plat} onClick={() => setSelectedPlatform(selectedPlatform === plat ? null : plat)}
                    className={`w-full flex items-center gap-3 text-left group transition-all ${selectedPlatform === plat ? 'opacity-100' : selectedPlatform ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="w-28 shrink-0 text-right">
                      <span className="text-zinc-400 font-terminal text-sm">{plat}</span>
                    </div>
                    <div className="flex-1 bg-zinc-900 h-6 relative overflow-hidden">
                      <div className={`h-full ${color} transition-all duration-500 flex items-center`}
                        style={{ width: `${Math.max(width, 1)}%` }}>
                        <span className="text-white font-terminal text-xs px-2 whitespace-nowrap">{count}</span>
                      </div>
                    </div>
                    <div className="w-16 shrink-0">
                      <span className="text-zinc-600 font-terminal text-xs">{era}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Decade breakdown */}
          <div className="mb-10">
            <h3 className="text-zinc-400 font-terminal text-lg uppercase mb-4">By Era</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {decades.map(decade => {
                const decadeItems = byDecade[decade] || [];
                const total = decadeItems.reduce((s, p) => s + p.count, 0);
                return (
                  <div key={decade}
                    className={`border-2 p-4 text-center cursor-pointer transition-all ${
                      hoveredDecade === decade ? 'border-green-500 bg-green-900/10' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                    onMouseEnter={() => setHoveredDecade(decade)}
                    onMouseLeave={() => setHoveredDecade(null)}>
                    <div className="text-green-400 font-terminal text-2xl font-bold mb-1">{decade}s</div>
                    <div className="text-zinc-300 font-terminal text-3xl font-bold">{total}</div>
                    <div className="text-zinc-600 font-terminal text-xs mt-1">games</div>
                    <div className="mt-2 space-y-1">
                      {decadeItems.map(p => (
                        <div key={p.platform} className="flex justify-between text-xs font-terminal">
                          <span className="text-zinc-500 truncate">{p.platform}</span>
                          <span className="text-zinc-400 ml-1">{p.count}</span>
                        </div>
                      ))}
                      {decadeItems.length === 0 && <div className="text-zinc-700 text-xs font-terminal">—</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected platform drill-down */}
          {selectedPlatform && selectedItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-green-400 font-terminal text-xl uppercase">{selectedPlatform} — {selectedItems.length} games</h3>
                <button onClick={() => setSelectedPlatform(null)} className="text-zinc-600 hover:text-zinc-300 font-terminal text-sm">✕ Close</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                {selectedItems.map(i => (
                  <div key={i.id} className="bg-zinc-950 border border-zinc-800 p-2">
                    <span className="text-zinc-300 font-terminal text-sm">{i.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
