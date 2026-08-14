"use client";
import { useState, useEffect } from "react";
import { ACHIEVEMENTS, RARITIES, CATEGORY_LABELS, getTotalPoints, type AchievementCategory, type AchievementContext } from "@/data/achievements";
import { AchievementCard } from "@/components/AchievementCard";

type AchievementData = { unlockedIds: string[]; context: AchievementContext; autoCount: number };

type CategoryFilter = AchievementCategory | "all";
const RARITY_ORDER: string[] = ["legendary","epic","rare","uncommon","common"];

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<AchievementCategory | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [showLocked, setShowLocked] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/achievements").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) return <div className="text-green-500 font-terminal text-2xl animate-pulse text-center py-16">COMPUTING ACHIEVEMENTS...</div>;

  const { unlockedIds } = data;
  const totalPoints = getTotalPoints(unlockedIds);
  const unlockedCount = unlockedIds.length;
  const visibleAchievements = ACHIEVEMENTS.filter(a => !a.secret || unlockedIds.includes(a.id));
  const totalVisible = visibleAchievements.length;

  const filtered = visibleAchievements.filter(a => {
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (rarityFilter !== "all" && a.rarity !== rarityFilter) return false;
    if (!showLocked && !unlockedIds.includes(a.id)) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !(a.description?.toLowerCase() || '').includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const aUnlocked = unlockedIds.includes(a.id);
    const bUnlocked = unlockedIds.includes(b.id);
    if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
    return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
  });

  const byRarity = RARITY_ORDER.reduce((acc, r) => {
    acc[r] = { total: visibleAchievements.filter(a => a.rarity === r).length, unlocked: unlockedIds.filter(id => visibleAchievements.find(a => a.id === id && a.rarity === r)).length };
    return acc;
  }, {} as Record<string, { total: number; unlocked: number }>);

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🏆 Achievement Codex</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">
            {unlockedCount}/{totalVisible} unlocked · {totalPoints.toLocaleString()} points
          </p>
        </div>
        <div className="flex gap-4 flex-wrap">
          {RARITY_ORDER.map(r => {
            const cfg = RARITIES[r as keyof typeof RARITIES];
            const cnt = byRarity[r];
            return (
              <div key={r} className="text-center">
                <div className={`font-terminal text-base font-bold ${cfg.color}`}>{cnt.unlocked}/{cnt.total}</div>
                <div className="text-zinc-700 font-terminal text-xs">{cfg.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-zinc-600 font-terminal text-xs mb-1">
          <span>{unlockedCount} unlocked</span>
          <span>{Math.round((unlockedCount / totalVisible) * 100)}% complete</span>
        </div>
        <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden flex">
          {RARITY_ORDER.map(r => {
            const cfg = RARITIES[r as keyof typeof RARITIES];
            const pct = (byRarity[r].unlocked / totalVisible) * 100;
            return <div key={r} className={`h-full transition-all ${cfg.bg}`} style={{ width: `${pct}%` }} />;
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search achievements..."
          className="bg-zinc-950 border-2 border-zinc-800 text-zinc-300 font-terminal text-sm p-2 focus:outline-none focus:border-green-600 w-48" />

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
          className="bg-zinc-950 border-2 border-zinc-800 text-zinc-300 font-terminal text-sm p-2 focus:outline-none cursor-pointer">
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>

        <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}
          className="bg-zinc-950 border-2 border-zinc-800 text-zinc-300 font-terminal text-sm p-2 focus:outline-none cursor-pointer">
          <option value="all">All Rarities</option>
          {RARITY_ORDER.map(r => <option key={r} value={r}>{RARITIES[r as keyof typeof RARITIES].label}</option>)}
        </select>

        <button onClick={() => setShowLocked(!showLocked)}
          className={`px-3 py-2 font-terminal text-xs border-2 transition-colors ${showLocked ? "text-zinc-400 border-zinc-700" : "bg-zinc-800 text-white border-zinc-600"}`}>
          {showLocked ? "HIDE LOCKED" : "SHOW LOCKED"}
        </button>
      </div>

      <p className="text-zinc-600 font-terminal text-xs mb-4">{filtered.length} achievements shown</p>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(achievement => {
          const unlocked = unlockedIds.includes(achievement.id);
          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              unlocked={unlocked}
              context={data?.context}
            />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-700 font-terminal text-xl">No achievements match your filters.</div>
      )}
    </div>
  );
}
