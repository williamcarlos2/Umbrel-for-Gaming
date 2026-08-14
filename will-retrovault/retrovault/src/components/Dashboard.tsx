"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ACHIEVEMENTS, getTotalPoints, type AchievementContext } from "@/data/achievements";
import { AchievementCard } from "@/components/AchievementCard";
import { AlertsBanner } from "@/components/AlertsBanner";
import { calcFlipMetrics, DEFAULT_EBAY_FEE, DEFAULT_SHIPPING } from "@/lib/flipMath";
import { getTotalPaid } from "@/lib/marketUtils";

type GameItem = {
  id: string; title: string; platform: string; isDigital?: boolean;
  copies: { priceAcquired: string }[];
  marketLoose?: string; marketCib?: string;
  priceHistory?: Record<string, { loose?: string | null }>;
};

type SalesData = { sales: { salePrice: string; gameTitle: string }[]; acquisitions: unknown[] };
type WatchlistItem = { id: string; title: string; platform: string; alertPrice: string; marketLoose?: string };
type GrailEntry = { id: string; title: string; platform: string; acquiredAt?: string };
type EventItem = { id: string; title: string; date?: string; location: string; attending: boolean };
type PlayLogEntry = { id: string; title: string; status: string; platform: string };

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function StatCard({ label, value, sub, color, href }: { label: string; value: string | number; sub?: string; color: string; href?: string }) {
  const inner = (
    <div className={`bg-zinc-950 border-2 p-4 hover:border-opacity-80 transition-all ${color}`}>
      <div className={`font-terminal text-3xl font-bold ${color.replace('border-', 'text-')}`}>{value}</div>
      <div className="text-zinc-300 font-terminal text-sm uppercase mt-1">{label}</div>
      {sub && <div className="text-zinc-600 font-terminal text-xs mt-0.5">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function Dashboard() {
  const [inventory, setInventory] = useState<GameItem[]>([]);
  const [sales, setSales] = useState<SalesData>({ sales: [], acquisitions: [] });
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [grails, setGrails] = useState<GrailEntry[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [playlog, setPlaylog] = useState<PlayLogEntry[]>([]);
  const [achievements, setAchievements] = useState<{ unlockedIds: string[]; context?: AchievementContext } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory").then(r => r.json()),
      fetch("/api/sales").then(r => r.json()).catch(() => ({ sales: [], acquisitions: [] })),
      fetch("/api/watchlist").then(r => r.json()).catch(() => []),
      fetch("/api/grails").then(r => r.json()).catch(() => []),
      fetch("/api/events").then(r => r.json()).catch(() => []),
      fetch("/api/playlog").then(r => r.json()).catch(() => []),
      fetch("/api/achievements").then(r => r.json()).catch(() => null),
    ]).then(([inv, sal, wl, gr, ev, pl, ach]) => {
      setInventory(inv);
      setSales(sal);
      setWatchlist(Array.isArray(wl) ? wl : []);
      setGrails(Array.isArray(gr) ? gr : []);
      setEvents(Array.isArray(ev) ? ev : []);
      setPlaylog(Array.isArray(pl) ? pl : []);
      setAchievements(ach);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-green-500 font-terminal text-2xl animate-pulse text-center py-16">BOOTING COMMAND CENTER...</div>;

  // Computed stats
  const owned = inventory.filter(i => (i.copies || []).length > 0 && !i.isDigital);
  const totalOwned = owned.length;
  const totalValue = owned.reduce((s, i) => s + (parseFloat(i.marketLoose || "0") || 0), 0);
  const totalPaid = owned.reduce((s, i) => s + getTotalPaid(i.copies || []), 0);
  const totalSaleRevenue = (sales.sales || []).reduce((s, sl) => s + (parseFloat(sl.salePrice) || 0), 0);
  const totalProfit = totalSaleRevenue - totalPaid;

  // Hot flips — owned items with best margin
  const EBAY_FEE = DEFAULT_EBAY_FEE; const SHIP = DEFAULT_SHIPPING;
  const hotFlips = owned
    .filter(i => parseFloat(i.marketLoose || "0") > 0)
    .map(i => {
      const avgPaid = getTotalPaid(i.copies || []) / Math.max(i.copies.length, 1);
      const market = parseFloat(i.marketLoose || "0");
      const { profit: net, roi } = calcFlipMetrics(avgPaid, market, EBAY_FEE, SHIP);
      return { ...i, net, roi, market, avgPaid };
    })
    .filter(i => i.roi > 20)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 4);

  // Watchlist alerts — items at/below target
  const watchlistAlerts = watchlist.filter(w => {
    const market = parseFloat(w.marketLoose || "0");
    const target = parseFloat(w.alertPrice || "999");
    return market > 0 && market <= target;
  }).slice(0, 3);

  // Upcoming events
  const upcomingEvents = events
    .filter(e => e.attending && (daysUntil(e.date || "") ?? 999) >= 0)
    .sort((a, b) => daysUntil(a.date || "") - daysUntil(b.date || ""))
    .slice(0, 2);

  // Currently playing
  const nowPlaying = playlog.filter(p => p.status === "playing").slice(0, 3);

  // Recent achievements
  const recentAch = achievements
    ? ACHIEVEMENTS.filter(a => achievements.unlockedIds.includes(a.id)).slice(-4).reverse()
    : [];
  const achPoints = achievements ? getTotalPoints(achievements.unlockedIds) : 0;
  const achCount = achievements?.unlockedIds.length || 0;

  // Active grails
  const activeGrails = grails.filter(g => !g.acquiredAt).slice(0, 3);

  const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <div className="space-y-6">
      <AlertsBanner />

      {/* Header */}
      <div className="border-b-4 border-green-900 pb-4">
        <h1 className="text-2xl sm:text-3xl text-green-400 font-terminal uppercase tracking-widest">⚡ Command Center</h1>
        <p className="text-zinc-600 font-terminal text-sm mt-1">RetroVault — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Games Owned" value={totalOwned.toLocaleString()} color="border-green-800" href="/inventory" />
        <StatCard label="Collection Value" value={fmt(totalValue)} sub={`paid ${fmt(totalPaid)}`} color="border-blue-800" href="/analytics" />
        <StatCard label="Total Profit" value={fmt(totalProfit)} sub={`${sales.sales?.length || 0} sales`} color={totalProfit >= 0 ? "border-emerald-800" : "border-red-800"} href="/sales" />
        <StatCard label="Achievements" value={achCount} sub={`${achPoints.toLocaleString()} pts`} color="border-yellow-800" href="/achievements" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — business */}
        <div className="lg:col-span-2 space-y-5">

          {/* Hot Flips */}
          <section className="bg-zinc-950 border-2 border-orange-800 rounded-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-orange-400 font-terminal text-base uppercase flex items-center gap-2">🔥 Top Flip Opportunities</h2>
              <Link href="/hotlist" className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs">Full list →</Link>
            </div>
            {hotFlips.length === 0 ? (
              <p className="text-zinc-700 font-terminal text-sm">No flip opportunities found. Add cost data to your inventory.</p>
            ) : (
              <div className="space-y-2">
                {hotFlips.map(item => (
                  <div key={item.id} className="flex items-center gap-3 border border-zinc-800 p-2 hover:border-zinc-600 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-200 font-terminal text-sm truncate">{item.title}</div>
                      <div className="text-zinc-600 font-terminal text-xs">{item.platform} · paid ${item.avgPaid.toFixed(0)} · market ${item.market.toFixed(0)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-emerald-400 font-terminal text-base font-bold">+{item.roi.toFixed(0)}%</div>
                      <div className="text-zinc-600 font-terminal text-xs">${item.net.toFixed(0)} net</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Watchlist Alerts */}
          {watchlistAlerts.length > 0 && (
            <section className="bg-zinc-950 border-2 border-yellow-800 rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-yellow-400 font-terminal text-base uppercase flex items-center gap-2">🎯 Price Alerts</h2>
                <Link href="/watchlist" className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs">Watchlist →</Link>
              </div>
              <div className="space-y-2">
                {watchlistAlerts.map(w => (
                  <div key={w.id} className="flex items-center gap-3 border border-yellow-900 bg-yellow-950/10 p-3">
                    <span className="text-yellow-400 text-xl shrink-0">⚡</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-yellow-200 font-terminal text-sm">{w.title}</div>
                      <div className="text-zinc-500 font-terminal text-xs">{w.platform} · target: ${w.alertPrice}</div>
                    </div>
                    <div className="text-emerald-400 font-terminal text-base font-bold shrink-0">${parseFloat(w.marketLoose || "0").toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Currently Playing */}
          {nowPlaying.length > 0 && (
            <section className="bg-zinc-950 border-2 border-purple-800 rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-purple-400 font-terminal text-base uppercase">🎮 Currently Playing</h2>
                <Link href="/playlog" className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs">Play Log →</Link>
              </div>
              <div className="flex gap-3 flex-wrap">
                {nowPlaying.map(p => (
                  <div key={p.id} className="border border-purple-900 bg-purple-950/10 px-4 py-2">
                    <div className="text-purple-200 font-terminal text-sm">{p.title}</div>
                    <div className="text-zinc-600 font-terminal text-xs">{p.platform}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Achievements */}
          {recentAch.length > 0 && (
            <section className="bg-zinc-950 border-2 border-yellow-900 rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-yellow-500 font-terminal text-base uppercase">🏆 Recent Achievements</h2>
                <Link href="/achievements" className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs">All {achCount} →</Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recentAch.map(a => (
                  <AchievementCard
                    key={a.id}
                    achievement={a}
                    unlocked={true}
                    context={achievements?.context}
                    compact
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <section className="bg-zinc-950 border-2 border-yellow-800 rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-yellow-400 font-terminal text-sm uppercase">🎪 Upcoming Events</h2>
                <Link href="/events" className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs">All →</Link>
              </div>
              {upcomingEvents.map(ev => {
                const days = daysUntil(ev.date || "");
                return (
                  <div key={ev.id} className="border border-yellow-900/40 p-3 mb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-zinc-200 font-terminal text-sm">{ev.title}</div>
                        <div className="text-zinc-600 font-terminal text-xs">{ev.location}</div>
                      </div>
                      <div className={`font-terminal text-sm font-bold shrink-0 ml-2 ${days <= 7 ? "text-red-400" : "text-yellow-400"}`}>
                        {days === 0 ? "TODAY" : `${days}d`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Active Grails */}
          {activeGrails.length > 0 && (
            <section className="bg-zinc-950 border-2 border-red-900 rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-red-400 font-terminal text-sm uppercase">🏴‍☠️ Active Grails</h2>
                <Link href="/grails" className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs">All →</Link>
              </div>
              <div className="space-y-2">
                {activeGrails.map(g => (
                  <div key={g.id} className="border border-red-900/30 p-2">
                    <div className="text-zinc-200 font-terminal text-sm truncate">{g.title}</div>
                    <div className="text-zinc-600 font-terminal text-xs">{g.platform}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick links */}
          <section className="bg-zinc-950 border-2 border-zinc-800 rounded-sm p-4">
            <h2 className="text-zinc-400 font-terminal text-sm uppercase mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/field", icon: "🔦", label: "Field Mode" },
                { href: "/flip", icon: "💸", label: "Flip Calc" },
                { href: "/negotiate", icon: "🤝", label: "Negotiate" },
                { href: "/condition", icon: "🔍", label: "Grade Item" },
                { href: "/guide", icon: "📖", label: "Field Guide" },
                { href: "/listing", icon: "📝", label: "List Checker" },
              ].map(({ href, icon, label }) => (
                <Link key={href} href={href}
                  className="border border-zinc-800 hover:border-green-800 p-3 text-center font-terminal text-xs text-zinc-500 hover:text-green-400 transition-colors">
                  <div className="text-xl mb-1">{icon}</div>
                  {label}
                </Link>
              ))}
            </div>
          </section>

          {/* Collection snapshot */}
          <section className="bg-zinc-950 border-2 border-zinc-800 rounded-sm p-4">
            <h2 className="text-zinc-400 font-terminal text-sm uppercase mb-3">Collection Snapshot</h2>
            <div className="space-y-2">
              {[
                { label: "Platforms", val: new Set(owned.map(i => i.platform)).size },
                { label: "Grails hunting", val: activeGrails.length },
                { label: "On watchlist", val: watchlist.length },
                { label: "Games beaten", val: playlog.filter(p => p.status === "beat").length },
                { label: "In backlog", val: playlog.filter(p => p.status === "backlog").length },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center border-b border-zinc-900 pb-1 last:border-0">
                  <span className="text-zinc-500 font-terminal text-xs">{label}</span>
                  <span className="text-zinc-300 font-terminal text-sm">{val}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
