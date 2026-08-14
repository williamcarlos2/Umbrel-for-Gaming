"use client";
import { useEffect, useState } from "react";
import { getCopyMarketValue } from "@/lib/copyCondition";

type GameCopy = { hasBox: boolean; hasManual: boolean; priceAcquired: string; condition?: string; };
type GameItem = {
  id: string; title: string; platform: string; copies: GameCopy[];
  marketLoose?: string; marketCib?: string; personalRating?: number;
  personalReview?: string; completionStatus?: string; rarity?: string;
};

const RARITY_COLORS: Record<string, string> = {
  Common: "text-zinc-400 border-zinc-600",
  Uncommon: "text-green-400 border-green-600",
  Rare: "text-blue-400 border-blue-600",
  "Ultra Rare": "text-purple-400 border-purple-600",
};

const COMPLETION_ICONS: Record<string, string> = {
  "Never Played": "⬜", "Started": "🟨", "Beaten": "🟩", "100%": "🏆"
};

export default function ShowcasePage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"title" | "platform" | "rating" | "value">("platform");
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<GameItem>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json())
      .then(d => setItems(d.filter((i: GameItem) => (i.copies || []).length > 0)))
      .finally(() => setLoading(false));
  }, []);

  const platforms = Array.from(new Set(items.map(i => i.platform))).sort();

  const filtered = [...items]
    .filter(i => {
      if (platformFilter !== "all" && i.platform !== platformFilter) return false;
      if (rarityFilter !== "all" && (i.rarity || "Common") !== rarityFilter) return false;
      if (completionFilter !== "all" && (i.completionStatus || "Never Played") !== completionFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "platform") return a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title);
      if (sortBy === "rating") return (b.personalRating || 0) - (a.personalRating || 0);
      if (sortBy === "value") {
        const aVal = (a.copies || []).reduce((s, c) => s + getCopyMarketValue(a, c), 0);
        const bVal = (b.copies || []).reduce((s, c) => s + getCopyMarketValue(b, c), 0);
        return bVal - aVal;
      }
      return 0;
    });

  const saveEdit = async () => {
    if (!selectedGame) return;
    setSaving(true);
    await fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selectedGame, ...editForm })
    });
    setItems(prev => prev.map(i => i.id === selectedGame.id ? { ...i, ...editForm } : i));
    setSelectedGame(null);
    setSaving(false);
  };

  const rarityBadge = (rarity?: string) => {
    const r = rarity || "Common";
    return <span className={`text-xs border px-2 py-0.5 rounded-full ${RARITY_COLORS[r] || "text-zinc-400 border-zinc-600"}`}>{r}</span>;
  };

  const stars = (rating?: number) => {
    if (!rating) return <span className="text-zinc-700">Not Rated</span>;
    return (
      <span className="text-yellow-400">
        {"★".repeat(rating)}{"☆".repeat(5 - rating)}
      </span>
    );
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh] flex flex-col space-y-6">
      <header className="border-b-4 border-green-900 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-3xl">🎮</span>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase">Collection Showcase</h2>
          <span className="text-green-700 font-terminal text-lg ml-auto">{filtered.length} / {items.length} TITLES</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="bg-zinc-950 border-2 border-green-800 text-green-400 p-2 font-terminal text-lg uppercase focus:outline-none cursor-pointer">
            <option value="all">ALL SYSTEMS</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)} className="bg-zinc-950 border-2 border-purple-800 text-purple-400 p-2 font-terminal text-lg uppercase focus:outline-none cursor-pointer">
            <option value="all">ALL RARITIES</option>
            {["Common","Uncommon","Rare","Ultra Rare"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={completionFilter} onChange={e => setCompletionFilter(e.target.value)} className="bg-zinc-950 border-2 border-blue-800 text-blue-400 p-2 font-terminal text-lg uppercase focus:outline-none cursor-pointer">
            <option value="all">ALL STATUS</option>
            {["Never Played","Started","Beaten","100%"].map(s => <option key={s} value={s}>{COMPLETION_ICONS[s]} {s}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'platform' | 'title' | 'rating' | 'value')} className="bg-zinc-950 border-2 border-zinc-700 text-zinc-400 p-2 font-terminal text-lg uppercase focus:outline-none cursor-pointer">
            <option value="platform">SORT: PLATFORM</option>
            <option value="title">SORT: TITLE</option>
            <option value="rating">SORT: MY RATING</option>
            <option value="value">SORT: VALUE</option>
          </select>
        </div>
      </header>

      {loading ? (
        <div className="text-green-500 font-terminal text-2xl animate-pulse">LOADING COLLECTION...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => {
            const qty = (item.copies || []).length;
            const val = (item.copies || []).reduce((s, c) => s + getCopyMarketValue(item, c), 0);
            return (
              <div key={item.id} onClick={() => { setSelectedGame(item); setEditForm(item); }}
                className="bg-zinc-950 border-2 border-green-900 hover:border-green-600 rounded-sm p-4 cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.2)] flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-green-300 font-bold font-terminal leading-tight flex-1" style={{fontSize:'clamp(0.75rem,2vw,1rem)'}}>{item.title}</h3>
                  {item.completionStatus && item.completionStatus !== "Never Played" && (
                    <span className="text-lg shrink-0" title={item.completionStatus}>{COMPLETION_ICONS[item.completionStatus] || "⬜"}</span>
                  )}
                </div>
                <p className="text-green-600 font-terminal text-xs">{item.platform}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {rarityBadge(item.rarity)}
                  {qty > 1 && <span className="text-emerald-400 text-xs border border-emerald-700 px-2 py-0.5 rounded-full">x{qty}</span>}
                </div>
                <div className="mt-auto pt-2 border-t border-green-900/30 flex justify-between items-center">
                  {stars(item.personalRating)}
                  {val > 0 && <span className="text-blue-400 font-terminal text-sm">${val.toFixed(2)}</span>}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center text-zinc-600 font-terminal py-12">No games match your filters.</div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setSelectedGame(null)}>
          <div className="bg-zinc-950 border-4 border-green-500 p-6 rounded-sm w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl text-green-400 font-terminal uppercase mb-1 tracking-widest">{selectedGame.title}</h3>
            <p className="text-green-600 font-terminal text-sm mb-6">{selectedGame.platform}</p>

            <div className="space-y-4 font-terminal text-xl text-green-500">
              <div>
                <label className="block text-sm text-zinc-400 mb-1 uppercase">My Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setEditForm({...editForm, personalRating: n})}
                      className={`text-3xl transition-colors ${(editForm.personalRating || 0) >= n ? 'text-yellow-400' : 'text-zinc-700'}`}>★</button>
                  ))}
                  <button onClick={() => setEditForm({...editForm, personalRating: 0})} className="text-zinc-600 text-sm ml-2">[Clear]</button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1 uppercase">Completion</label>
                <div className="flex flex-wrap gap-2">
                  {["Never Played","Started","Beaten","100%"].map(s => (
                    <button key={s} onClick={() => setEditForm({...editForm, completionStatus: s})}
                      className={`px-3 py-1 text-lg border transition-colors ${editForm.completionStatus === s ? 'bg-green-600 text-black border-green-400' : 'text-zinc-400 border-zinc-700 hover:border-green-700'}`}>
                      {COMPLETION_ICONS[s]} {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1 uppercase">Rarity</label>
                <div className="flex flex-wrap gap-2">
                  {["Common","Uncommon","Rare","Ultra Rare"].map(r => (
                    <button key={r} onClick={() => setEditForm({...editForm, rarity: r})}
                      className={`px-3 py-1 text-lg border transition-colors ${editForm.rarity === r ? 'bg-purple-600 text-white border-purple-400' : 'text-zinc-400 border-zinc-700 hover:border-purple-700'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1 uppercase">Personal Review</label>
                <textarea className="w-full bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-base focus:outline-none focus:border-green-400 h-24 resize-none"
                  placeholder="Your thoughts on this game..."
                  value={editForm.personalReview || ''}
                  onChange={e => setEditForm({...editForm, personalReview: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button onClick={() => setSelectedGame(null)} className="px-4 py-2 font-terminal text-xl text-zinc-400 hover:text-white">CANCEL</button>
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 font-terminal text-xl bg-green-600 text-black font-bold hover:bg-green-500 disabled:opacity-50">
                {saving ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
