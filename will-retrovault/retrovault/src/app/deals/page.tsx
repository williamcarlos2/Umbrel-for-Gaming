"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Deal = {
  id: string; title: string; price: number | null; location: string;
  url: string; citySlug?: string; scrapedAt: string; createdAt?: string;
  matchTarget?: string; matchSource?: string; matchScore?: number;
  alertPrice?: number | null; isWatchlistMatch?: boolean;
  postTitle?: string; postUrl?: string; author?: string; subreddit?: string; flair?: string;
  targetTitle?: string; targetSource?: string;
  dismissed: boolean;
};

type DealsData = { craigslist: Deal[]; reddit: Deal[] };

export default function DealsPage() {
  const [data, setData] = useState<DealsData>({ craigslist: [], reddit: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"craigslist" | "reddit">("craigslist");
  const [showDismissed, setShowDismissed] = useState(false);
  const [city, setCity] = useState("portland");

  const load = () => {
    fetch("/api/deals").then(r => r.json()).then((d: DealsData) => {
      setData(d);
      setLoading(false);
    });
    fetch("/api/config").then(r => r.json()).then(c => {
      if (c?.scrapers?.craigslistCity) setCity(c.scrapers.craigslistCity);
    });
  };
  useEffect(() => { load(); }, []);

  const dismiss = async (id: string, source: string) => {
    await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", id, source }) });
    load();
  };

  const clearDismissed = async (source: string) => {
    await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_dismissed", source }) });
    load();
  };

  const clDeals = data.craigslist.filter(d => showDismissed || !d.dismissed);
  const redditAlerts = data.reddit.filter(d => showDismissed || !d.dismissed);
  const clWatchlist = clDeals.filter(d => d.isWatchlistMatch);
  const clRetro = clDeals.filter(d => !d.isWatchlistMatch);

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🏠 Local Deals</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">
            Craigslist · Reddit r/gameswap · Your neighborhood, your prices
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/scrapers" className="px-4 py-2 font-terminal text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors">
            ⚙️ Scrapers
          </Link>
          <button onClick={() => setShowDismissed(!showDismissed)}
            className={`px-4 py-2 font-terminal text-sm border transition-colors ${showDismissed ? "text-yellow-400 border-yellow-700" : "text-zinc-600 border-zinc-800 hover:border-zinc-600"}`}>
            {showDismissed ? "HIDE DISMISSED" : "SHOW DISMISSED"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "craigslist", label: `🏠 Craigslist (${clDeals.length})` },
          { id: "reddit", label: `🔴 r/gameswap (${redditAlerts.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as 'craigslist' | 'reddit')}
            className={`px-4 py-2 font-terminal text-sm border-2 transition-colors ${tab === t.id ? "bg-green-700 text-black border-green-500" : "text-zinc-500 border-zinc-700 hover:border-zinc-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal text-xl animate-pulse text-center py-12">LOADING DEALS...</div>
      ) : (
        <>
          {/* Craigslist tab */}
          {tab === "craigslist" && (
            <div className="space-y-6">
              {/* City info */}
              <div className="flex items-center gap-3 text-zinc-600 font-terminal text-sm border border-zinc-800 p-3">
                <span>📍</span>
                <span>Scanning <span className="text-green-500">{city}.craigslist.org</span> — run the scraper to refresh</span>
                <Link href="/scrapers" className="ml-auto text-blue-600 hover:text-blue-400 transition-colors">Configure →</Link>
              </div>

              {/* Watchlist matches */}
              {clWatchlist.length > 0 && (
                <div>
                  <h3 className="text-yellow-400 font-terminal text-lg uppercase mb-3">
                    ⭐ Watchlist Matches ({clWatchlist.length})
                  </h3>
                  <div className="space-y-2">
                    {clWatchlist.map(d => <DealCard key={d.id} deal={d} source="craigslist" onDismiss={dismiss} />)}
                  </div>
                </div>
              )}

              {/* Other retro deals */}
              {clRetro.length > 0 && (
                <div>
                  <h3 className="text-zinc-400 font-terminal text-lg uppercase mb-3">
                    🕹️ Retro Gaming Listings ({clRetro.length})
                  </h3>
                  <div className="space-y-2">
                    {clRetro.map(d => <DealCard key={d.id} deal={d} source="craigslist" onDismiss={dismiss} />)}
                  </div>
                </div>
              )}

              {clDeals.length === 0 && (
                <EmptyState
                  icon="🏠"
                  message="No Craigslist deals yet."
                  sub="Enable and run the Craigslist scraper to find local deals."
                  action={{ label: "Go to Scrapers", href: "/scrapers" }}
                />
              )}

              {data.craigslist.some(d => d.dismissed) && (
                <button onClick={() => clearDismissed("craigslist")}
                  className="text-zinc-700 hover:text-red-600 font-terminal text-xs transition-colors">
                  🗑 Clear all dismissed
                </button>
              )}
            </div>
          )}

          {/* Reddit tab */}
          {tab === "reddit" && (
            <div className="space-y-4">
              {redditAlerts.length === 0 ? (
                <EmptyState
                  icon="🔴"
                  message="No Reddit alerts yet."
                  sub="Enable and run the Reddit scraper to find r/gameswap posts matching your watchlist."
                  action={{ label: "Go to Scrapers", href: "/scrapers" }}
                />
              ) : (
                redditAlerts.map(alert => (
                  <div key={alert.id} className={`border-2 p-4 ${alert.dismissed ? "border-zinc-800 opacity-40" : "border-red-900 bg-red-950/10"}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-red-400 font-terminal text-xs px-1.5 border border-red-900">r/{alert.subreddit}</span>
                          {alert.flair && <span className="text-zinc-500 font-terminal text-xs">[{alert.flair}]</span>}
                          <span className="text-yellow-500 font-terminal text-xs">→ matches: {alert.targetTitle}</span>
                        </div>
                        <p className="text-zinc-200 font-terminal text-base truncate">{alert.postTitle}</p>
                        <p className="text-zinc-600 font-terminal text-xs mt-1">by u/{alert.author} · {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : ''}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a href={alert.postUrl} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1 font-terminal text-xs text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors">
                          VIEW ↗
                        </a>
                        <button onClick={() => dismiss(alert.id, "reddit")}
                          className="text-zinc-700 hover:text-red-400 font-terminal text-xs transition-colors px-2">✕</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {data.reddit.some(d => d.dismissed) && (
                <button onClick={() => clearDismissed("reddit")}
                  className="text-zinc-700 hover:text-red-600 font-terminal text-xs transition-colors">
                  🗑 Clear all dismissed
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DealCard({ deal, source, onDismiss }: { deal: Deal; source: string; onDismiss: (id: string, source: string) => void }) {
  return (
    <div className={`border p-3 flex items-center gap-4 transition-colors ${
      deal.dismissed ? "border-zinc-800 opacity-40" :
      deal.isWatchlistMatch ? "border-yellow-800 bg-yellow-950/10 hover:border-yellow-700" :
      "border-zinc-800 hover:border-zinc-600"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {deal.isWatchlistMatch && <span className="text-yellow-500 font-terminal text-xs">⭐ MATCH</span>}
          <span className="text-zinc-200 font-terminal text-base truncate">{deal.title}</span>
        </div>
        <div className="flex gap-3 mt-0.5">
          {deal.location && <span className="text-zinc-600 font-terminal text-xs">📍 {deal.location}</span>}
          {deal.matchTarget && <span className="text-zinc-600 font-terminal text-xs">→ {deal.matchTarget}</span>}
          <span className="text-zinc-700 font-terminal text-xs">{new Date(deal.scrapedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {deal.price !== null && (
          <div className="text-right">
            <div className="text-green-400 font-terminal text-xl font-bold">${deal.price}</div>
            {deal.alertPrice && deal.price <= deal.alertPrice && (
              <div className="text-emerald-500 font-terminal text-xs">✓ BELOW TARGET</div>
            )}
          </div>
        )}
        <a href={deal.url} target="_blank" rel="noopener noreferrer"
          className="px-3 py-1 font-terminal text-xs text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors">
          VIEW ↗
        </a>
        <button onClick={() => onDismiss(deal.id, source)}
          className="text-zinc-700 hover:text-red-400 font-terminal text-xs px-2 transition-colors">✕</button>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, sub, action }: { icon: string; message: string; sub: string; action: { label: string; href: string } }) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-zinc-800">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-zinc-500 font-terminal text-xl mb-2">{message}</p>
      <p className="text-zinc-700 font-terminal text-sm mb-4">{sub}</p>
      <Link href={action.href} className="px-6 py-2 font-terminal text-sm text-green-400 border border-green-700 hover:bg-green-900/20 transition-colors">
        {action.label}
      </Link>
    </div>
  );
}
