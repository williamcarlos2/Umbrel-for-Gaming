"use client";
import { useState, useEffect } from "react";
import { PriceDetailModal } from "@/components/PriceDetailModal";

type GameItem = {
  id: string; title: string; platform: string;
  copies: { id: string; condition: string; hasBox: boolean; hasManual: boolean; priceAcquired: string }[];
  marketLoose?: string; isDigital?: boolean;
};

type PlayStatus = { [gameId: string]: string };

export default function RandomizerPage() {
  const [inventory, setInventory] = useState<GameItem[]>([]);
  const [playlog, setPlaylog] = useState<PlayStatus>({});
  const [platformFilter, setPlatformFilter] = useState("all");
  const [excludePlayed, setExcludePlayed] = useState(true);
  const [excludeBeaten, setExcludeBeaten] = useState(true);
  const [picked, setPicked] = useState<GameItem | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [detailItem, setDetailItem] = useState<GameItem | null>(null);

  useEffect(() => {
    fetch("/api/inventory").then(r => r.json()).then((d: GameItem[]) => setInventory(d.filter(i => (i.copies||[]).length > 0 && !i.isDigital)));
    fetch("/api/playlog").then(r => r.json()).then((pl: { id: string; status: string }[]) => {
      const map: PlayStatus = {};
      pl.forEach(p => { map[p.id] = p.status; });
      setPlaylog(map);
    }).catch(() => {});
  }, []);

  const ownedPlatforms = [...new Set(inventory.map(i => i.platform))].sort();

  const pool = inventory.filter(i => {
    if (platformFilter !== "all" && i.platform !== platformFilter) return false;
    const status = playlog[i.id];
    if (excludePlayed && (status === "playing" || status === "want_to_play")) return false;
    if (excludeBeaten && status === "beat") return false;
    return true;
  });

  const roll = () => {
    if (pool.length === 0) return;
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setPicked(pool[Math.floor(Math.random() * pool.length)]);
      count++;
      if (count >= 12) {
        clearInterval(interval);
        setRolling(false);
        setRollCount(c => c + 1);
      }
    }, 80);
  };

  const addToPlaylog = async (item: GameItem) => {
    await fetch("/api/playlog", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", title: item.title, platform: item.platform, status: "playing" })
    });
    alert(`Added "${item.title}" to Play Log as Currently Playing!`);
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh] flex flex-col">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🎲 What Should I Play?</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Let fate decide — random game picker from your vault</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Platform</label>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
            className="bg-zinc-950 border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none cursor-pointer">
            <option value="all">All Platforms</option>
            {ownedPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={excludePlayed} onChange={e => setExcludePlayed(e.target.checked)} className="w-4 h-4" />
            <span className="text-zinc-400 font-terminal text-sm">Exclude currently playing / want to play</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={excludeBeaten} onChange={e => setExcludeBeaten(e.target.checked)} className="w-4 h-4" />
            <span className="text-zinc-400 font-terminal text-sm">Exclude already beaten</span>
          </label>
        </div>
        <div className="text-zinc-600 font-terminal text-sm">
          {pool.length} eligible games
        </div>
      </div>

      {/* Main picker */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* Result display */}
        <div className={`w-full max-w-lg border-4 p-8 text-center transition-all duration-300 ${
          picked ? (rolling ? "border-yellow-700 bg-yellow-950/10" : "border-green-600 bg-green-950/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]") : "border-zinc-800"
        }`}>
          {picked ? (
            <>
              <div className="text-zinc-500 font-terminal text-xs uppercase mb-2">
                {rolling ? "Rolling..." : "Tonight you should play:"}
              </div>
              <button
                onClick={() => !rolling && setDetailItem(picked)}
                disabled={rolling}
                className={`font-terminal text-3xl sm:text-4xl uppercase mb-2 leading-tight block w-full text-center transition-colors ${
                  rolling ? 'text-yellow-400 cursor-default' : 'text-green-300 hover:text-green-100 cursor-pointer'
                }`}
                title={rolling ? undefined : 'Click to view game details'}
              >
                {picked.title}
              </button>
              <div className="text-zinc-400 font-terminal text-xl mb-1">{picked.platform}</div>
              {!rolling && <p className="text-zinc-700 font-terminal text-xs mb-3">click title to view details</p>}
              <div className="flex justify-center gap-2 flex-wrap font-terminal text-sm text-zinc-600 mb-4">
                <span>{picked.copies?.[0]?.condition || "Loose"}</span>
                {picked.copies?.[0]?.hasBox && <span>📦 Box</span>}
                {picked.copies?.[0]?.hasManual && <span>📄 Manual</span>}
                {picked.marketLoose && <span className="text-blue-400">${parseFloat(picked.marketLoose).toFixed(2)}</span>}
              </div>
              {!rolling && (
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={() => addToPlaylog(picked)}
                    className="px-4 py-2 bg-green-700 hover:bg-green-600 text-black font-terminal text-sm font-bold border-2 border-green-500 transition-colors">
                    🎮 ADD TO PLAY LOG
                  </button>
                  <button onClick={roll}
                    className="px-4 py-2 text-zinc-400 font-terminal text-sm border border-zinc-700 hover:border-zinc-500 transition-colors">
                    🎲 Reroll
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-zinc-700 font-terminal text-xl">Press ROLL to pick a game</div>
          )}
        </div>

        {/* Roll button */}
        <button onClick={roll} disabled={pool.length === 0 || rolling}
          className={`px-12 py-5 font-terminal text-3xl font-bold border-4 transition-all ${
            rolling ? "bg-yellow-700 text-black border-yellow-500 animate-pulse" :
            pool.length === 0 ? "text-zinc-700 border-zinc-800 cursor-not-allowed" :
            "bg-green-600 hover:bg-green-500 text-black border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)]"
          }`}>
          {rolling ? "ROLLING..." : "🎲 ROLL"}
        </button>

        {rollCount > 0 && !rolling && (
          <p className="text-zinc-700 font-terminal text-sm">{rollCount} roll{rollCount !== 1 ? "s" : ""} this session</p>
        )}

        {pool.length === 0 && (
          <p className="text-zinc-600 font-terminal text-sm text-center">
            No games match your filters. Try loosening the restrictions above.
          </p>
        )}
      </div>

      {detailItem && (
        <PriceDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          allPeople={[]}
        />
      )}
    </div>
  );
}
