"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: string; title: string; subtitle: string; href: string; icon: string; category: string;
};

type InventoryItem = { id: string; title?: string; platform?: string; copies?: unknown[] };
type GrailItem = { id: string; title?: string; platform?: string; acquiredAt?: string | null };
type WatchlistItem = { id: string; title?: string; alertPrice?: string | number | null };
type EventItem = { id: string; title?: string; location?: string | null };

const STATIC_PAGES: SearchResult[] = [
  { id: "p-inventory", title: "Vault", subtitle: "Your game collection", href: "/inventory", icon: "🕹️", category: "page" },
  { id: "p-field", title: "Field Mode", subtitle: "Quick price check & dupe alert", href: "/field", icon: "🔦", category: "page" },
  { id: "p-analytics", title: "Analytics", subtitle: "Collection analytics dashboard", href: "/analytics", icon: "📊", category: "page" },
  { id: "p-sales", title: "P&L Ledger", subtitle: "Sales and profit tracking", href: "/sales", icon: "💰", category: "page" },
  { id: "p-watchlist", title: "Target Radar", subtitle: "Price alert watchlist", href: "/watchlist", icon: "🎯", category: "page" },
  { id: "p-hotlist", title: "Hot List", subtitle: "Best flip opportunities", href: "/hotlist", icon: "🔥", category: "page" },
  { id: "p-flip", title: "Flip Calculator", subtitle: "Net profit after fees", href: "/flip", icon: "💸", category: "page" },
  { id: "p-negotiate", title: "Negotiate", subtitle: "Deal negotiation helper", href: "/negotiate", icon: "🤝", category: "page" },
  { id: "p-convention", title: "Convention Tracker", subtitle: "Event budget tracking", href: "/convention", icon: "🎪", category: "page" },
  { id: "p-lot", title: "Lot Calculator", subtitle: "Bulk purchase cost allocation", href: "/lot", icon: "📦", category: "page" },
  { id: "p-playlog", title: "Play Log", subtitle: "Games played, beaten, backlog", href: "/playlog", icon: "🎮", category: "page" },
  { id: "p-grails", title: "Grail List", subtitle: "Holy grail wish list", href: "/grails", icon: "🏴‍☠️", category: "page" },
  { id: "p-showcase", title: "Showcase", subtitle: "Visual collection gallery", href: "/showcase", icon: "🎮", category: "page" },
  { id: "p-goals", title: "Goals", subtitle: "Platform collection goals", href: "/goals", icon: "🏆", category: "page" },
  { id: "p-tiers", title: "Completion Tiers", subtitle: "Bronze to Platinum badges", href: "/tiers", icon: "🏅", category: "page" },
  { id: "p-achievements", title: "Achievements", subtitle: "Achievement codex", href: "/achievements", icon: "🏆", category: "page" },
  { id: "p-seasonal", title: "Seasonal Calendar", subtitle: "Best buy/sell months", href: "/seasonal", icon: "📆", category: "page" },
  { id: "p-condition", title: "Condition Grader", subtitle: "Rate item condition", href: "/condition", icon: "🔍", category: "page" },
  { id: "p-insurance", title: "Insurance Report", subtitle: "Collection valuation", href: "/insurance", icon: "📋", category: "page" },
  { id: "p-listing", title: "Listing Checker", subtitle: "eBay listing quality score", href: "/listing", icon: "📝", category: "page" },
  { id: "p-sourcing", title: "Sourcing Analytics", subtitle: "Best deal sources", href: "/sourcing", icon: "📍", category: "page" },
  { id: "p-market", title: "Market Report", subtitle: "Platform price trends", href: "/market", icon: "📈", category: "page" },
  { id: "p-deals", title: "Local Deals", subtitle: "Craigslist & Reddit alerts", href: "/deals", icon: "🏠", category: "page" },
  { id: "p-events", title: "Events", subtitle: "Gaming conventions & expos", href: "/events", icon: "🎪", category: "page" },
  { id: "p-whatnot", title: "Whatnot Tracker", subtitle: "Seller stream schedule", href: "/whatnot", icon: "📺", category: "page" },
  { id: "p-guide", title: "Field Guide", subtitle: "Hunter tips & principles", href: "/guide", icon: "📖", category: "page" },
  { id: "p-scrapers", title: "Scrapers", subtitle: "Data scraper control center", href: "/scrapers", icon: "⚙️", category: "page" },
  { id: "p-steam", title: "Steam Connector", subtitle: "PC library import groundwork", href: "/steam", icon: "♨️", category: "page" },
  { id: "p-settings", title: "Settings", subtitle: "App configuration", href: "/settings", icon: "⚙️", category: "page" },
  { id: "p-timeline", title: "Timeline", subtitle: "Collection by decade", href: "/timeline", icon: "📅", category: "page" },
  { id: "p-friends", title: "Friends Mode", subtitle: "Critic profiles", href: "/friends", icon: "👥", category: "page" },
  { id: "p-milestones", title: "Milestones", subtitle: "Collection achievements", href: "/milestones", icon: "🎯", category: "page" },
];

type Props = { open: boolean; onClose: () => void };

export function GlobalSearch({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [grails, setGrails] = useState<GrailItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setQuery("");
      setSelected(0);
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (inventory.length > 0) return; // already loaded
    Promise.all([
      fetch("/api/inventory").then(r => r.json() as Promise<InventoryItem[]>).catch(() => []),
      fetch("/api/grails").then(r => r.json() as Promise<GrailItem[]>).catch(() => []),
      fetch("/api/watchlist").then(r => r.json() as Promise<WatchlistItem[]>).catch(() => []),
      fetch("/api/events").then(r => r.json() as Promise<EventItem[]>).catch(() => []),
    ]).then(([inv, gr, wl, ev]) => {
      setInventory(inv);
      setGrails(gr);
      setWatchlist(wl);
      setEvents(ev);
    });
  }, [inventory.length]);

  const q = query.toLowerCase().trim();

  const results: SearchResult[] = q.length < 2 ? STATIC_PAGES.slice(0, 8) : [
    // Pages
    ...STATIC_PAGES.filter(p => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)),
    // Games
    ...inventory
      .filter((i) => i.title?.toLowerCase().includes(q) && (i.copies || []).length > 0)
      .slice(0, 5)
      .map((i) => ({ id: `game-${i.id}`, title: i.title || "Untitled", subtitle: `${i.platform || "Unknown"} · ${(i.copies||[]).length} cop${(i.copies||[]).length === 1 ? 'y' : 'ies'}`, href: "/inventory", icon: "🕹️", category: "game" })),
    // Grails
    ...grails
      .filter((g) => g.title?.toLowerCase().includes(q) && !g.acquiredAt)
      .slice(0, 3)
      .map((g) => ({ id: `grail-${g.id}`, title: g.title || "Untitled", subtitle: `Grail · ${g.platform || "Any"}`, href: "/grails", icon: "🏴‍☠️", category: "grail" })),
    // Watchlist
    ...watchlist
      .filter((w) => w.title?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((w) => ({ id: `wl-${w.id}`, title: w.title || "Untitled", subtitle: `Watchlist · target $${w.alertPrice ?? ""}`, href: "/watchlist", icon: "🎯", category: "watchlist" })),
    // Events
    ...events
      .filter((e) => e.title?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((e) => ({ id: `ev-${e.id}`, title: e.title || "Untitled", subtitle: `Event · ${e.location || ""}`, href: "/events", icon: "🎪", category: "event" })),
  ].slice(0, 12);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { navigate(results[selected].href); }
      if (e.key === "Escape") { onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, results, selected, navigate, onClose]);

  useEffect(() => { queueMicrotask(() => setSelected(0)); }, [query]);

  if (!open) return null;

  const CATEGORY_COLORS: Record<string, string> = {
    page: "text-zinc-500", game: "text-green-600", grail: "text-red-600",
    watchlist: "text-yellow-600", event: "text-purple-600",
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-[100] pt-[15vh] px-4" onClick={onClose}>
      <div className="bg-zinc-950 border-4 border-green-700 w-full max-w-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)]" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
          <span className="text-green-500 font-terminal text-xl">🔍</span>
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, games, grails, events..."
            className="flex-1 bg-transparent text-green-300 font-terminal text-xl focus:outline-none placeholder-zinc-700" />
          <kbd className="text-zinc-700 font-mono text-xs bg-zinc-900 px-2 py-1 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center text-zinc-700 font-terminal">No results for &quot;{query}&quot;</div>
          ) : (
            results.map((r, i) => (
              <button key={r.id} onClick={() => navigate(r.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-zinc-900 last:border-0 transition-colors ${
                  i === selected ? "bg-green-900/30" : "hover:bg-zinc-900/50"
                }`}>
                <span className="text-xl shrink-0">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-200 font-terminal text-base truncate">{r.title}</div>
                  <div className="text-zinc-600 font-terminal text-xs">{r.subtitle}</div>
                </div>
                <span className={`font-terminal text-xs shrink-0 ${CATEGORY_COLORS[r.category] || "text-zinc-600"}`}>
                  {r.category}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="p-2 border-t border-zinc-900 flex gap-4 text-zinc-700 font-terminal text-xs px-4">
          <span>↑↓ navigate</span><span>↵ go</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
