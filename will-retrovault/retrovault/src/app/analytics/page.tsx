"use client";
/**
 * Analytics Dashboard
 *
 * @todo Extract sub-components:
 *       - PlatformChart      — pie/bar chart sections
 *       - TopGamesTable      — top 10 most valuable / best ROI tables
 *       - CriticBreakdown    — favorites/regrets by brand section
 *       - AchievementsPanel  — recent achievements widget (candidate for shared component)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ACHIEVEMENTS, getTotalPoints } from "@/data/achievements";
import { AchievementCard } from "@/components/AchievementCard";
import { PriceDetailModal } from "@/components/PriceDetailModal";
import { ConsoleModal, PlatformButton } from "@/components/ConsoleModal";
import { getCopyBucket, getCopyMarketValue, hasAnyCopyBucket } from "@/lib/copyCondition";

type GameCopy = {
  id: string;
  hasBox: boolean;
  hasManual: boolean;
  priceAcquired: string;
  condition?: string;
};

type GameItem = {
  id: string;
  title: string;
  platform: string;
  status: string;
  notes: string;
  marketLoose?: string;
  marketCib?: string;
  copies: GameCopy[];
};

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#06b6d4'];

const getManufacturer = (platform: string) => {
  const p = platform.toLowerCase();
  if (p.includes("sega") || p.includes("genesis") || p.includes("dreamcast") || p.includes("saturn") || p.includes("sega cd")) return "Sega";
  if (p.includes("nintendo") || p.includes("nes") || p.includes("gamecube") || p.includes("switch") || p.includes("game boy") || p.includes("wii") || p.includes("n64") || p.includes("snes")) return "Nintendo";
  if (p.includes("playstation") || p.includes("sony") || p.includes("psp")) return "Sony";
  if (p.includes("xbox") || p.includes("microsoft")) return "Microsoft";
  if (p.includes("atari")) return "Atari";
  if (p.includes("neo geo") || p.includes("snk")) return "SNK";
  return "Other";
};
type KpiProps = { label: string; value: string; color: string };

function Kpi({ label, value, color }: KpiProps) {
  return (
    <div className="bg-zinc-950 border-2 border-green-800 p-6 rounded-sm text-center shadow-inner overflow-hidden flex flex-col items-center">
      <h3 className="text-green-600 font-terminal text-lg mb-3">{label}</h3>
      <p
        className={`font-bold w-full text-center overflow-hidden ${color} drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]`}
        style={{ fontSize: 'clamp(1.2rem, 4vw, 3rem)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
      >
        {value}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [achievementData, setAchievementData] = useState<{ unlockedIds: string[] } | null>(null);
  const [detailItem, setDetailItem] = useState<GameItem | null>(null);
  const [consolePlatform, setConsolePlatform] = useState<string | null>(null);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [favData, setFavData] = useState<Record<string, string[]>>({});
  const [regretData, setRegretData] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));

    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => { setPeople(d.people || []); setFavData(d.favorites || {}); setRegretData(d.regrets || {}); })
      .catch((e) => console.error(e));

    fetch("/api/achievements")
      .then(r => r.json())
      .then(d => setAchievementData(d))
      .catch(() => {});
  }, []);

  if (loading) {
    return <div className="p-6 text-green-500 font-terminal text-2xl animate-pulse">CRUNCHING DATA...</div>;
  }

  // Only owned items
  const owned = items.filter(i => (i.copies || []).length > 0);

  const totalGames = owned.length;
  const totalSpent = owned.reduce((sum, item) => {
    return sum + (item.copies || []).reduce((s, c) => s + (parseFloat(c.priceAcquired) || 0), 0);
  }, 0);
  const totalValue = owned.reduce((sum, item) => {
    const copies = item.copies || [];
    return sum + copies.reduce((s, c) => s + getCopyMarketValue(item, c), 0);
  }, 0);
  const profitDelta = totalValue - totalSpent;

  // Platform distribution
  const platformCounts = owned.reduce((acc, item) => {
    acc[item.platform] = (acc[item.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const platformData = Object.entries(platformCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Completeness
  const cibCount = owned.filter(i => hasAnyCopyBucket(i.copies || [], 'cib')).length;
  const partialCount = owned.filter(i => hasAnyCopyBucket(i.copies || [], 'partial')).length;
  const looseCount = owned.filter(i => (i.copies || []).length > 0 && (i.copies || []).every(c => getCopyBucket(c) === 'loose')).length;
  const completenessData = [
    { name: 'CIB', value: cibCount },
    { name: 'Partial', value: partialCount },
    { name: 'Loose', value: looseCount }
  ];

  // Manufacturer breakdown
  const totalsByMfg: Record<string, Record<string, { total: number; cib: number; loose: number; other: number; paid: number; value: number }>> = {};
  for (const item of owned) {
    const mfg = getManufacturer(item.platform);
    if (!totalsByMfg[mfg]) totalsByMfg[mfg] = {};
    if (!totalsByMfg[mfg][item.platform]) {
      totalsByMfg[mfg][item.platform] = { total: 0, cib: 0, loose: 0, other: 0, paid: 0, value: 0 };
    }
    const p = totalsByMfg[mfg][item.platform];
    p.total += 1;
    for (const c of (item.copies || [])) {
      const bucket = getCopyBucket(c);
      if (bucket === 'cib') p.cib += 1; else if (bucket === 'loose') p.loose += 1; else p.other += 1;
      p.paid += parseFloat(c.priceAcquired) || 0;
      p.value += getCopyMarketValue(item, c);
    }
  }

  // Top 10 by value
  const topValue = [...owned]
    .map(item => {
      const val = (item.copies || []).reduce((s, c) => s + getCopyMarketValue(item, c), 0);
      return { id: item.id, title: item.title, platform: item.platform, value: val };
    })
    .filter(i => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Top 10 best ROI
  const topRoi = [...owned]
    .map(item => {
      const paid = (item.copies || []).reduce((s, c) => s + (parseFloat(c.priceAcquired) || 0), 0);
      const val = (item.copies || []).reduce((s, c) => s + getCopyMarketValue(item, c), 0);
      const roi = paid > 0 && val > 0 ? ((val - paid) / paid * 100) : null;
      return { id: item.id, title: item.title, platform: item.platform, paid, value: val, roi };
    })
    .filter(i => i.roi !== null)
    .sort((a, b) => (b.roi as number) - (a.roi as number))
    .slice(0, 10);

  // ── Regrets analytics ──────────────────────────────────────────────────
  const allRegretGameIds = new Set(Object.values(regretData).flat());

  const regretGameMap = new Map<string, { item: GameItem; regretters: string[] }>();
  for (const [personId, gameIds] of Object.entries(regretData)) {
    for (const gid of gameIds) {
      const item = items.find(i => i.id === gid);
      if (!item) continue;
      const person = people.find(p => p.id === personId);
      if (!regretGameMap.has(gid)) regretGameMap.set(gid, { item, regretters: [] });
      if (person) regretGameMap.get(gid)!.regretters.push(person.name);
    }
  }
  const regretGames = Array.from(regretGameMap.values())
    .sort((a, b) => b.regretters.length - a.regretters.length);

  const regretsByPlatform = items
    .filter(i => allRegretGameIds.has(i.id))
    .reduce((acc, item) => {
      const cnt = regretGameMap.get(item.id)?.regretters.length ?? 0;
      if (!acc[item.platform]) acc[item.platform] = 0;
      acc[item.platform] += cnt;
      return acc;
    }, {} as Record<string, number>);
  const topRegretPlatforms = Object.entries(regretsByPlatform)
    .map(([name, count]) => ({ name, count, mfg: getManufacturer(name) }))
    .sort((a, b) => b.count - a.count);

  // ── Favorites analytics ──────────────────────────────────────────────────
  // All game IDs that have at least one favorite
  const allFavGameIds = new Set(Object.values(favData).flat());

  // Map gameId -> {item, fanCount, fans}
  const favGameMap = new Map<string, { item: GameItem; fans: string[] }>();
  for (const [personId, gameIds] of Object.entries(favData)) {
    for (const gid of gameIds) {
      const item = items.find(i => i.id === gid);
      if (!item) continue;
      const person = people.find(p => p.id === personId);
      if (!favGameMap.has(gid)) favGameMap.set(gid, { item, fans: [] });
      if (person) favGameMap.get(gid)!.fans.push(person.name);
    }
  }
  const favGames = Array.from(favGameMap.values())
    .sort((a, b) => b.fans.length - a.fans.length);

  // Most favorited by platform
  const favsByPlatform = items
    .filter(i => allFavGameIds.has(i.id))
    .reduce((acc, item) => {
      const fanCount = favGameMap.get(item.id)?.fans.length ?? 0;
      if (!acc[item.platform]) acc[item.platform] = 0;
      acc[item.platform] += fanCount;
      return acc;
    }, {} as Record<string, number>);
  const topFavPlatforms = Object.entries(favsByPlatform)
    .map(([name, count]) => ({ name, count, mfg: getManufacturer(name) }))
    .sort((a, b) => b.count - a.count);

  // Most favorited by manufacturer
  const favsByMfg = topFavPlatforms.reduce((acc, p) => {
    acc[p.mfg] = (acc[p.mfg] || 0) + p.count;
    return acc;
  }, {} as Record<string, number>);
  const topFavMfgs = Object.entries(favsByMfg)
    .sort((a, b) => b[1] - a[1]);

  // Top platform per manufacturer
  const topPlatformPerMfg: Record<string, { platform: string; count: number }> = {};
  for (const { name, count, mfg } of topFavPlatforms) {
    if (!topPlatformPerMfg[mfg] || count > topPlatformPerMfg[mfg].count) {
      topPlatformPerMfg[mfg] = { platform: name, count };
    }
  }

  return (
    <>
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] flex flex-col space-y-8">
      <header className="border-b-4 border-green-900 pb-6 flex items-center gap-4">
        <span className="text-3xl">📊</span>
        <h2 className="text-3xl text-green-400 tracking-widest uppercase">Vault Analytics</h2>
        <span className="text-green-700 font-terminal text-lg ml-auto">{totalGames} OWNED TITLES</span>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Kpi label="Total Games Owned" value={totalGames.toString()} color="text-green-400" />
        <Kpi label="Capital Deployed" value={`$${totalSpent.toFixed(0)}`} color="text-blue-400" />
        <Kpi label="Market Value" value={totalValue > 0 ? `$${totalValue.toFixed(0)}` : "Fetching..."} color="text-yellow-400" />
        <Kpi label="Net Delta" value={totalValue > 0 ? `${profitDelta >= 0 ? "+" : ""}$${Math.abs(profitDelta).toFixed(0)}` : "--"} color={profitDelta >= 0 ? "text-emerald-400" : "text-red-400"} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Platform pie */}
        <div className="bg-zinc-950 border-2 border-green-800 p-6 rounded-sm">
          <h3 className="text-green-500 font-terminal text-2xl mb-6 text-center">Ecosystem Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platformData.slice(0, 10)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                  {platformData.slice(0, 10).map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#22c55e', color: '#4ade80', fontFamily: 'monospace', fontSize: '1rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {platformData.slice(0, 8).map((p, i) => (
              <button key={p.name} onClick={() => setConsolePlatform(p.name)} className="flex items-center gap-1 font-terminal text-sm text-zinc-300 hover:text-white transition-colors" title={`Click for ${p.name} info`}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                {p.name} ({p.value})
              </button>
            ))}
          </div>
        </div>

        {/* Completeness bar */}
        <div className="bg-zinc-950 border-2 border-green-800 p-6 rounded-sm">
          <h3 className="text-green-500 font-terminal text-2xl mb-6 text-center">Asset Completeness</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completenessData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#166534" vertical={false} />
                <XAxis dataKey="name" stroke="#22c55e" tick={{ fontFamily: 'monospace', fontSize: '1rem' }} />
                <YAxis stroke="#22c55e" tick={{ fontFamily: 'monospace', fontSize: '1rem' }} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#22c55e', color: '#4ade80', fontFamily: 'monospace' }} cursor={{ fill: '#14532d', opacity: 0.4 }} />
                <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 by value */}
      <div className="bg-zinc-950 border-2 border-green-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-green-900 bg-zinc-900/50 flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <h3 className="text-green-400 font-terminal text-2xl uppercase">Top 10 Most Valuable</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-terminal text-lg text-left">
            <thead className="text-green-600 border-b border-green-800">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Title</th>
                <th className="p-3">Platform</th>
                <th className="p-3 text-right">Market Value</th>
              </tr>
            </thead>
            <tbody>
              {topValue.map((item, i) => (
                <tr key={i} className="border-b border-green-900/20 hover:bg-green-900/10">
                  <td className="p-3 text-zinc-600">{i + 1}</td>
                  <td className="p-3 text-green-300 font-bold">
                    <button onClick={() => setDetailItem(owned.find(o => o.id === item.id) || null)} className="hover:text-green-100 hover:underline text-left">{item.title}</button>
                  </td>
                  <td className="p-3 text-sm"><PlatformButton platform={item.platform} onClick={setConsolePlatform} className="text-green-500 hover:text-green-300" /></td>
                  <td className="p-3 text-yellow-400 font-bold text-right">${item.value.toFixed(2)}</td>
                </tr>
              ))}
              {topValue.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-zinc-600">Fetch market prices to see rankings.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 ROI */}
      <div className="bg-zinc-950 border-2 border-green-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-green-900 bg-zinc-900/50 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <h3 className="text-green-400 font-terminal text-2xl uppercase">Top 10 Best ROI (Flip Candidates)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-terminal text-lg text-left">
            <thead className="text-green-600 border-b border-green-800">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Title</th>
                <th className="p-3">Platform</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Market</th>
                <th className="p-3 text-right">ROI</th>
              </tr>
            </thead>
            <tbody>
              {topRoi.map((item, i) => (
                <tr key={i} className="border-b border-green-900/20 hover:bg-green-900/10">
                  <td className="p-3 text-zinc-600">{i + 1}</td>
                  <td className="p-3 text-green-300 font-bold">
                    <button onClick={() => setDetailItem(owned.find(o => o.id === item.id) || null)} className="hover:text-green-100 hover:underline text-left">{item.title}</button>
                  </td>
                  <td className="p-3 text-sm"><PlatformButton platform={item.platform} onClick={setConsolePlatform} className="text-green-500 hover:text-green-300" /></td>
                  <td className="p-3 text-zinc-400 text-right">${item.paid.toFixed(2)}</td>
                  <td className="p-3 text-blue-400 text-right">${item.value.toFixed(2)}</td>
                  <td className="p-3 font-bold text-right">
                    <span className={item.roi! >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {item.roi! >= 0 ? "+" : ""}{item.roi!.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {topRoi.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-zinc-600">Fetch prices + enter costs to see ROI rankings.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manufacturer / Platform Breakdown */}
      <div className="bg-zinc-950 border-2 border-green-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-green-900 bg-zinc-900/50">
          <h3 className="text-green-400 font-terminal text-2xl uppercase">Manufacturer / Platform Totals</h3>
        </div>
        <div className="overflow-x-auto p-4 space-y-8">
          {Object.entries(totalsByMfg).map(([mfg, platforms]) => {
            const sub = Object.values(platforms).reduce((acc, s) => {
              acc.total += s.total; acc.cib += s.cib; acc.loose += s.loose;
              acc.other += s.other; acc.paid += s.paid; acc.value += s.value;
              return acc;
            }, { total: 0, cib: 0, loose: 0, other: 0, paid: 0, value: 0 });
            return (
              <div key={mfg}>
                <h4 className="text-xl text-green-300 font-bold mb-3 border-b border-green-900/50 pb-1 uppercase tracking-widest">{mfg} Ecosystem</h4>
                <table className="w-full text-left font-terminal text-lg min-w-[700px]">
                  <thead className="text-green-600 border-b border-green-800">
                    <tr>
                      <th className="pb-2 w-1/4">Platform</th>
                      <th className="pb-2 text-center">Total</th>
                      <th className="pb-2 text-center text-green-500">CIB</th>
                      <th className="pb-2 text-center text-zinc-500">Loose</th>
                      <th className="pb-2 text-center text-yellow-600">Partial</th>
                      <th className="pb-2 text-right">Paid</th>
                      <th className="pb-2 text-right">Value</th>
                      <th className="pb-2 text-right">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(platforms).map(([plat, s]) => (
                      <tr key={plat} className="border-b border-green-900/20 hover:bg-green-900/10">
                        <td className="py-2">
                          <button onClick={() => setConsolePlatform(plat)} className="text-green-400 hover:text-green-200 hover:underline transition-colors" title={`Click for ${plat} info`}>{plat}</button>
                        </td>
                        <td className="py-2 text-center text-green-200">{s.total}</td>
                        <td className="py-2 text-center text-green-500">{s.cib}</td>
                        <td className="py-2 text-center text-zinc-500">{s.loose}</td>
                        <td className="py-2 text-center text-yellow-600">{s.other}</td>
                        <td className="py-2 text-right text-blue-400">{s.paid > 0 ? `$${s.paid.toFixed(2)}` : "--"}</td>
                        <td className="py-2 text-right text-yellow-400">{s.value > 0 ? `$${s.value.toFixed(2)}` : "--"}</td>
                        <td className="py-2 text-right text-emerald-500">{s.total > 0 && s.paid > 0 ? `$${(s.paid / s.total).toFixed(2)}` : "--"}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-900/20 font-bold border-t-2 border-green-800">
                      <td className="py-2 pl-2 text-green-300 uppercase">{mfg} TOTALS</td>
                      <td className="py-2 text-center text-green-200">{sub.total}</td>
                      <td className="py-2 text-center text-green-500">{sub.cib}</td>
                      <td className="py-2 text-center text-zinc-400">{sub.loose}</td>
                      <td className="py-2 text-center text-yellow-500">{sub.other}</td>
                      <td className="py-2 text-right text-blue-400">{sub.paid > 0 ? `$${sub.paid.toFixed(2)}` : "--"}</td>
                      <td className="py-2 text-right text-yellow-400">{sub.value > 0 ? `$${sub.value.toFixed(2)}` : "--"}</td>
                      <td className="py-2 text-right text-emerald-500">{sub.total > 0 && sub.paid > 0 ? `$${(sub.paid / sub.total).toFixed(2)}` : "--"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

    </div>

    {/* Favorites Analytics Section */}
    {people.length > 0 && (
      <div className="space-y-8">

        {/* Favorites KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-zinc-950 border-2 border-yellow-700 p-6 rounded-sm text-center overflow-hidden">
            <h3 className="text-yellow-500 font-terminal text-lg mb-2">Total Favorites</h3>
            <p className="text-4xl font-bold text-yellow-400">{allFavGameIds.size}</p>
          </div>
          <div className="bg-zinc-950 border-2 border-yellow-700 p-6 rounded-sm text-center overflow-hidden">
            <h3 className="text-yellow-500 font-terminal text-lg mb-2">People Tracking</h3>
            <p className="text-4xl font-bold text-yellow-400">{people.length}</p>
          </div>
          <div className="bg-zinc-950 border-2 border-yellow-700 p-6 rounded-sm text-center overflow-hidden">
            <h3 className="text-yellow-500 font-terminal text-lg mb-2">Most Loved Brand</h3>
            <p className="font-bold text-yellow-300" style={{ fontSize: 'clamp(1.2rem, 3vw, 2rem)' }}>
              {topFavMfgs[0]?.[0] ?? "--"}
            </p>
          </div>
        </div>

        {/* Most Favorited by Manufacturer & Platform */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-zinc-950 border-2 border-yellow-700 rounded-sm overflow-hidden">
            <div className="p-4 border-b border-yellow-800 bg-zinc-900/50 flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <h3 className="text-yellow-400 font-terminal text-2xl uppercase">Most Loved Brands</h3>
            </div>
            <div className="p-4 space-y-3">
              {topFavMfgs.map(([mfg, count], i) => {
                const best = topPlatformPerMfg[mfg];
                const maxCount = topFavMfgs[0]?.[1] || 1;
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={mfg}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-terminal text-lg text-yellow-300 flex items-center gap-2">
                        {i === 0 && <span className="text-yellow-500">🥇</span>}
                        {mfg}
                        {best && <span className="text-zinc-500 text-sm">— {best.platform}</span>}
                      </span>
                      <span className="font-terminal text-lg text-yellow-500 font-bold">{count} ⭐</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500/70 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {topFavMfgs.length === 0 && (
                <p className="text-zinc-600 font-terminal text-lg text-center py-4">No favorites yet.</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-950 border-2 border-yellow-700 rounded-sm overflow-hidden">
            <div className="p-4 border-b border-yellow-800 bg-zinc-900/50 flex items-center gap-3">
              <span className="text-2xl">🎮</span>
              <h3 className="text-yellow-400 font-terminal text-2xl uppercase">Most Loved Platforms</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-lg text-left">
                <thead className="text-yellow-600 border-b border-yellow-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Platform</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3 text-right">Favs</th>
                  </tr>
                </thead>
                <tbody>
                  {topFavPlatforms.slice(0, 10).map(({ name, count, mfg }, i) => (
                    <tr key={name} className="border-b border-yellow-900/20 hover:bg-yellow-900/10">
                      <td className="p-3 text-zinc-600">{i + 1}</td>
                      <td className="p-3 font-bold"><button onClick={() => setConsolePlatform(name)} className="text-yellow-300 hover:text-yellow-100 hover:underline">{name}</button></td>
                      <td className="p-3 text-zinc-400 text-sm">{mfg}</td>
                      <td className="p-3 text-yellow-400 font-bold text-right">{count} ⭐</td>
                    </tr>
                  ))}
                  {topFavPlatforms.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-zinc-600">No favorites yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Most Favorited Games */}
        <div className="bg-zinc-950 border-2 border-yellow-700 rounded-sm overflow-hidden">
          <div className="p-4 border-b border-yellow-800 bg-zinc-900/50 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <h3 className="text-yellow-400 font-terminal text-2xl uppercase">Most Favorited Games</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-terminal text-lg text-left">
              <thead className="text-yellow-600 border-b border-yellow-800">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Platform</th>
                  <th className="p-3">Favs</th>
                  <th className="p-3">Fans</th>
                </tr>
              </thead>
              <tbody>
                {favGames.slice(0, 15).map(({ item, fans }, i) => (
                  <tr key={item.id} className="border-b border-yellow-900/20 hover:bg-yellow-900/10">
                    <td className="p-3 text-zinc-600">{i + 1}</td>
                    <td className="p-3 text-yellow-300 font-bold">
                      <button onClick={() => setDetailItem(item)} className="hover:text-yellow-100 hover:underline text-left">{item.title}</button>
                    </td>
                    <td className="p-3 text-sm"><PlatformButton platform={item.platform} onClick={setConsolePlatform} className="text-zinc-400 hover:text-white" /></td>
                    <td className="p-3 text-yellow-400 font-bold">{fans.length} ⭐</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {fans.map((name, fi) => (
                          <span key={fi} className="text-xs bg-yellow-900/40 border border-yellow-700/50 text-yellow-300 px-2 py-0.5 rounded-full">{name}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {favGames.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-zinc-600">No favorites yet. Use the ⭐ FAVORITES button on the Vault page.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    )}

    {/* Regrets Analytics Section */}
    {people.length > 0 && allRegretGameIds.size > 0 && (
      <div className="space-y-8">

        <div className="border-b-4 border-red-900 pb-6 flex items-center gap-4">
          <span className="text-3xl">👎</span>
          <h2 className="text-3xl text-red-400 tracking-widest uppercase">Regrets Intelligence</h2>
          <span className="text-red-700 font-terminal text-lg ml-auto">{allRegretGameIds.size} TOTAL REGRETS</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Regretted Platforms */}
          <div className="bg-zinc-950 border-2 border-red-800 rounded-sm overflow-hidden">
            <div className="p-4 border-b border-red-900 bg-zinc-900/50 flex items-center gap-3">
              <span className="text-2xl">🔴</span>
              <h3 className="text-red-400 font-terminal text-2xl uppercase">Most Regretted Platforms</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-lg text-left">
                <thead className="text-red-600 border-b border-red-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Platform</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3 text-right">Regrets</th>
                  </tr>
                </thead>
                <tbody>
                  {topRegretPlatforms.slice(0, 10).map(({ name, count, mfg }, i) => (
                    <tr key={name} className="border-b border-red-900/20 hover:bg-red-900/10">
                      <td className="p-3 text-zinc-600">{i + 1}</td>
                      <td className="p-3 font-bold"><button onClick={() => setConsolePlatform(name)} className="text-red-300 hover:text-red-100 hover:underline">{name}</button></td>
                      <td className="p-3 text-zinc-400 text-sm">{mfg}</td>
                      <td className="p-3 text-red-400 font-bold text-right">{count} 👎</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Most Regretted Games */}
          <div className="bg-zinc-950 border-2 border-red-800 rounded-sm overflow-hidden">
            <div className="p-4 border-b border-red-900 bg-zinc-900/50 flex items-center gap-3">
              <span className="text-2xl">💀</span>
              <h3 className="text-red-400 font-terminal text-2xl uppercase">Most Regretted Games</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-terminal text-lg text-left">
                <thead className="text-red-600 border-b border-red-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Platform</th>
                    <th className="p-3">Count</th>
                    <th className="p-3">Who</th>
                  </tr>
                </thead>
                <tbody>
                  {regretGames.slice(0, 10).map(({ item, regretters }, i) => (
                    <tr key={item.id} className="border-b border-red-900/20 hover:bg-red-900/10">
                      <td className="p-3 text-zinc-600">{i + 1}</td>
                      <td className="p-3 text-red-300 font-bold">
                        <button onClick={() => setDetailItem(item)} className="hover:text-red-100 hover:underline text-left">{item.title}</button>
                      </td>
                      <td className="p-3 text-sm"><PlatformButton platform={item.platform} onClick={setConsolePlatform} className="text-zinc-400 hover:text-white" /></td>
                      <td className="p-3 text-red-400 font-bold">{regretters.length} 👎</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {regretters.map((name, ri) => (
                            <span key={ri} className="text-xs bg-red-900/40 border border-red-700/50 text-red-300 px-2 py-0.5 rounded-full">{name}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Achievements Panel */}
    {achievementData && (() => {
      const { unlockedIds } = achievementData;
      const pts = getTotalPoints(unlockedIds);
      const recentUnlocked = ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).slice(0, 6);
      return (
        <div className="mt-8 bg-zinc-950 border-2 border-yellow-800 p-5 rounded-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className="text-yellow-400 font-terminal text-xl uppercase">Achievements</h3>
                <p className="text-zinc-600 font-terminal text-xs">{unlockedIds.length} unlocked · {pts.toLocaleString()} pts</p>
              </div>
            </div>
            <Link href="/achievements" className="text-yellow-600 hover:text-yellow-400 font-terminal text-sm transition-colors">View All →</Link>
          </div>
          {recentUnlocked.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {recentUnlocked.map(a => (
                <AchievementCard
                  key={a.id}
                  achievement={a}
                  unlocked={true}
                  compact
                />
              ))}
            </div>
          ) : (
            <p className="text-zinc-700 font-terminal text-sm">No achievements unlocked yet. Start collecting!</p>
          )}
        </div>
      );
    })()}

    {detailItem && <PriceDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
    {consolePlatform && (
      <ConsoleModal
        platform={consolePlatform}
        totalInCatalog={items.filter(i => i.platform === consolePlatform).length}
        owned={items.filter(i => i.platform === consolePlatform && (i.copies || []).length > 0).length}
        onClose={() => setConsolePlatform(null)}
      />
    )}
    </>
  );
}
