"use client";

import { useState, useEffect } from "react";

type GameItem = {
  id: string; title: string; platform: string;
  copies: { priceAcquired: string }[];
  marketLoose?: string; marketCib?: string;
  purchaseDate?: string; isDigital?: boolean;
};

type Sale = { salePrice: string; };

type Milestone = {
  id: string; emoji: string; title: string; description: string;
  achieved: boolean; achievedValue?: string | number; category: "collection" | "business" | "platform" | "discovery";
};

export default function MilestonesPage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory").then(r => r.json()),
      fetch("/api/sales").then(r => r.json()).catch(() => ({ sales: [], acquisitions: [] })),
    ]).then(([inv, sData]) => {
      setItems(inv);
      setSales(sData.sales || []);
      setLoading(false);
    });
  }, []);

  const owned = items.filter(i => (i.copies || []).length > 0);
  const totalOwned = owned.length;
  const totalSpent = owned.reduce((s, i) => s + (i.copies || []).reduce((cs, c) => cs + (parseFloat(c.priceAcquired) || 0), 0), 0);
  const totalMarketValue = owned.reduce((s, i) => s + (parseFloat(i.marketLoose || "0") || 0), 0);
  const totalSaleRevenue = sales.reduce((s, sale) => s + (parseFloat(sale.salePrice) || 0), 0);
  const platforms = Array.from(new Set(owned.map(i => i.platform)));
  const platformCounts = platforms.map(p => ({ platform: p, count: owned.filter(i => i.platform === p).length }));
  const topPlatform = platformCounts.sort((a, b) => b.count - a.count)[0];

  const milestones: Milestone[] = [
    // Collection size
    { id: "first_game", emoji: "🌱", title: "First Game", description: "Add your first game to the vault", category: "collection", achieved: totalOwned >= 1, achievedValue: totalOwned >= 1 ? "Done!" : undefined },
    { id: "ten_games", emoji: "🎮", title: "Getting Started", description: "Own 10 games", category: "collection", achieved: totalOwned >= 10, achievedValue: `${totalOwned}/10` },
    { id: "fifty_games", emoji: "📚", title: "Collector", description: "Own 50 games", category: "collection", achieved: totalOwned >= 50, achievedValue: `${totalOwned}/50` },
    { id: "hundred_games", emoji: "💯", title: "Century Club", description: "Own 100 games", category: "collection", achieved: totalOwned >= 100, achievedValue: `${totalOwned}/100` },
    { id: "fivehundred_games", emoji: "🏛️", title: "The Library", description: "Own 500 games", category: "collection", achieved: totalOwned >= 500, achievedValue: `${totalOwned}/500` },
    { id: "thousand_games", emoji: "👑", title: "Legend", description: "Own 1,000 games", category: "collection", achieved: totalOwned >= 1000, achievedValue: `${totalOwned}/1,000` },

    // Platforms
    { id: "first_platform", emoji: "🕹️", title: "One System Wonder", description: "Own games on 1 platform", category: "platform", achieved: platforms.length >= 1, achievedValue: `${platforms.length}/1` },
    { id: "five_platforms", emoji: "🎪", title: "Multi-System Collector", description: "Own games on 5 platforms", category: "platform", achieved: platforms.length >= 5, achievedValue: `${platforms.length}/5` },
    { id: "ten_platforms", emoji: "🌍", title: "Platform Agnostic", description: "Own games on 10 platforms", category: "platform", achieved: platforms.length >= 10, achievedValue: `${platforms.length}/10` },
    { id: "all_platforms", emoji: "🗺️", title: "The Completionist", description: "Own games on all 14 supported platforms", category: "platform", achieved: platforms.length >= 14, achievedValue: `${platforms.length}/14` },

    // Value milestones
    { id: "spent_100", emoji: "💵", title: "First Benjamin", description: "Spend $100 on your collection", category: "business", achieved: totalSpent >= 100, achievedValue: `$${totalSpent.toFixed(0)}/$100` },
    { id: "spent_500", emoji: "💴", title: "Invested", description: "Spend $500 on your collection", category: "business", achieved: totalSpent >= 500, achievedValue: `$${totalSpent.toFixed(0)}/$500` },
    { id: "spent_1000", emoji: "💰", title: "Serious Collector", description: "Spend $1,000 on your collection", category: "business", achieved: totalSpent >= 1000, achievedValue: `$${totalSpent.toFixed(0)}/$1,000` },
    { id: "spent_5000", emoji: "🏦", title: "High Roller", description: "Spend $5,000 on your collection", category: "business", achieved: totalSpent >= 5000, achievedValue: `$${totalSpent.toFixed(0)}/$5,000` },

    // Market value
    { id: "value_500", emoji: "📈", title: "Worth Something", description: "Collection market value hits $500", category: "business", achieved: totalMarketValue >= 500, achievedValue: `$${totalMarketValue.toFixed(0)}/$500` },
    { id: "value_1000", emoji: "💎", title: "Four Figures", description: "Collection market value hits $1,000", category: "business", achieved: totalMarketValue >= 1000, achievedValue: `$${totalMarketValue.toFixed(0)}/$1,000` },
    { id: "value_5000", emoji: "🏆", title: "Five Grand Stash", description: "Collection market value hits $5,000", category: "business", achieved: totalMarketValue >= 5000, achievedValue: `$${totalMarketValue.toFixed(0)}/$5,000` },

    // Sales
    { id: "first_sale", emoji: "🤝", title: "First Deal", description: "Complete your first sale", category: "business", achieved: sales.length >= 1, achievedValue: sales.length >= 1 ? `${sales.length} sales` : undefined },
    { id: "ten_sales", emoji: "💹", title: "Active Flipper", description: "Complete 10 sales", category: "business", achieved: sales.length >= 10, achievedValue: `${sales.length}/10` },
    { id: "revenue_500", emoji: "🎰", title: "Half Grand Hustler", description: "Generate $500 in sales revenue", category: "business", achieved: totalSaleRevenue >= 500, achievedValue: `$${totalSaleRevenue.toFixed(0)}/$500` },
    { id: "revenue_1000", emoji: "💸", title: "Grand Grinder", description: "Generate $1,000 in sales revenue", category: "business", achieved: totalSaleRevenue >= 1000, achievedValue: `$${totalSaleRevenue.toFixed(0)}/$1,000` },

    // Platform depth
    ...(topPlatform ? [
      { id: "platform_25", emoji: "🎯", title: `${topPlatform.platform} Enthusiast`, description: `Own 25 ${topPlatform.platform} games`, category: "platform" as const, achieved: topPlatform.count >= 25, achievedValue: `${topPlatform.count}/25` },
      { id: "platform_50", emoji: "🔥", title: `${topPlatform.platform} Expert`, description: `Own 50 ${topPlatform.platform} games`, category: "platform" as const, achieved: topPlatform.count >= 50, achievedValue: `${topPlatform.count}/50` },
    ] : []),
  ];

  const achieved = milestones.filter(m => m.achieved);
  const pending = milestones.filter(m => !m.achieved);

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🏆 Collection Milestones</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">Track your collecting journey</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-emerald-400 font-terminal text-3xl font-bold">{achieved.length}</div>
            <div className="text-zinc-600 font-terminal text-xs">achieved</div>
          </div>
          <div className="text-center">
            <div className="text-zinc-600 font-terminal text-3xl font-bold">{pending.length}</div>
            <div className="text-zinc-600 font-terminal text-xs">remaining</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal text-2xl animate-pulse text-center py-12">COMPUTING MILESTONES...</div>
      ) : (
        <>
          {/* Achieved */}
          {achieved.length > 0 && (
            <div className="mb-8">
              <h3 className="text-emerald-400 font-terminal text-xl uppercase mb-4">✅ Achieved ({achieved.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {achieved.map(m => (
                  <div key={m.id} className={`border-2 p-4 bg-emerald-950/10 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]`}>
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-emerald-300 font-terminal text-base">{m.title}</div>
                        <div className="text-zinc-500 font-terminal text-xs">{m.description}</div>
                        {m.achievedValue && <div className="text-emerald-500 font-terminal text-xs mt-1">{m.achievedValue}</div>}
                      </div>
                      <span className="text-emerald-500 text-xl shrink-0">✓</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-zinc-500 font-terminal text-xl uppercase mb-4">⏳ Locked ({pending.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pending.map(m => (
                  <div key={m.id} className="border-2 border-zinc-800 p-4 opacity-50">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl grayscale">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-400 font-terminal text-base">{m.title}</div>
                        <div className="text-zinc-600 font-terminal text-xs">{m.description}</div>
                        {m.achievedValue && <div className="text-zinc-600 font-terminal text-xs mt-1">{m.achievedValue}</div>}
                      </div>
                      <span className="text-zinc-700 text-xl shrink-0">🔒</span>
                    </div>
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
