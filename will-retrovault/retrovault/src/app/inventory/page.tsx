"use client";
/**
 * Vault Inventory Page
 *
 * @todo This file is large (~1400 lines) and is a known refactoring target.
 *       The following sub-components should be extracted in future PRs:
 *
 *       - VaultTable         — the game table with sort/filter/pagination
 *       - VaultFilters       — search bar, platform/filter dropdowns
 *       - PlayersManager     — players people manager modal
 *       - CrudModal          — edit/add copy modal
 *       - VaultCodex         — the Codex help modal
 *
 *       Custom hooks to extract:
 *       - useInventory()     — data fetching (see src/hooks/useInventory.ts)
 *       - useCritics()       — player/social data (see src/hooks/useCritics.ts)
 *       - useVaultScores()   — buy/sell score computation
 *
 *       See CONTRIBUTING.md for coding conventions.
 */

import { useEffect, useState } from "react";
import { PriceDetailModal } from "@/components/PriceDetailModal";
import { ConsoleModal, PlatformButton } from "@/components/ConsoleModal";
import { AddAssetModal, type AssetFormData } from "@/components/AddAssetModal";
import { PlayerProfileModal } from "@/components/PlayerProfileModal";
import { useAppConfig } from "@/components/AppConfig";
import { Tip } from "@/components/Tooltip";
import { getCopyMarketValue } from "@/lib/copyCondition";
import { addPurchaseToActiveConventionSession } from "@/lib/conventionSession";
import { getPriceTrend, getTotalMarketValue, getTotalPaid } from "@/lib/marketUtils";

type GameCopy = {
  id: string;
  hasBox: boolean;
  hasManual: boolean;
  priceAcquired: string;
  condition: string;
};

type PriceHistoryEntry = {
  loose: string | null;
  cib: string | null;
  new: string | null;
  graded: string | null;
  fetchedAt?: string;
};

const PLAYER_COLOR_OPTIONS = [
  "#f472b6",
  "#22d3ee",
  "#fb923c",
  "#a78bfa",
  "#34d399",
  "#facc15",
  "#60a5fa",
];

type GameItem = {
  id: string;
  title: string;
  platform: string;
  status: string;
  notes: string;
  lastFetched?: string;
  marketLoose?: string;
  marketCib?: string;
  marketNew?: string;
  marketGraded?: string;
  priceHistory?: Record<string, PriceHistoryEntry>;
  purchaseDate?: string;
  isDigital?: boolean;
  personalRating?: number;
  copies: GameCopy[];
  hasVariants?: boolean;
  variantMatches?: { title: string; platform: string; loose: string | null; cib: string | null; new: string | null; graded: string | null }[];
};

type Person = { id: string; name: string; color?: string | null };
type Mention = { entityId?: string; message: string; fromPerson: string };
type TagsData = { gameTags: Record<string, string[]>; mentions: Record<string, Mention[]> };
type WishlistRestorePayload = {
  title: string;
  platform: string;
  playerId: string | null;
  priority: number;
  notes: string | null;
  marketLoose: string | null;
  marketCib: string | null;
  marketNew: string | null;
  marketGraded: string | null;
  lastFetched: string | null;
};
type WishlistItem = Partial<WishlistRestorePayload> & { id?: string };
type PriceChartingResponse = { error?: string; loose?: string; cib?: string; new?: string; graded?: string; hasVariants?: boolean };
type SortValue = string | number;

// Hoisted to module scope — prevents focus loss on re-render
function SortHeader({
  field, label, className = "", sortField, sortOrder, onSort,
}: {
  field: string; label: string; className?: string;
  sortField: string; sortOrder: string;
  onSort: (field: string) => void;
}) {
  return (
    <th
      className={`p-3 cursor-pointer hover:bg-zinc-800 select-none ${className}`}
      onClick={() => onSort(field)}
    >
      {label} {sortField === field && (sortOrder === "asc" ? "▲" : "▼")}
    </th>
  );
}

export default function InventoryPage() {
  useAppConfig();
  const [items, setItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("dateAdded");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<number | "all">(100);
  const [filterAction, setFilterAction] = useState<string>("owned");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [vaultWishlistUndo, setVaultWishlistUndo] = useState<Record<string, WishlistRestorePayload>>({});

  // Modal state
  const [priceDetailItem, setPriceDetailItem] = useState<GameItem | null>(null);
  const [consoleModalPlatform, setConsoleModalPlatform] = useState<string | null>(null);
  const [showCodex, setShowCodex] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [codexTab, setCodexTab] = useState<'player' | 'tech'>('player');

  // Favorites state
  const [people, setPeople] = useState<Person[]>([]);
  const [favData, setFavData] = useState<Record<string, string[]>>({});
  const [regretData, setRegretData] = useState<Record<string, string[]>>({});
  const [showPeopleManager, setShowPeopleManager] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonColor, setNewPersonColor] = useState("");
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonName, setEditingPersonName] = useState("");
  const [editingPersonColor, setEditingPersonColor] = useState("");
  const [favPersonFilter, setFavPersonFilter] = useState<string | null>(null);
  const [playerProfile, setPlayerProfile] = useState<Person | null>(null);
  const [tagsData, setTagsData] = useState<TagsData>({ gameTags: {}, mentions: {} });
  const [tagSearch, setTagSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GameItem | null>(null);
  const [formData, setFormData] = useState<Partial<GameItem>>({});
  const [formCopies, setFormCopies] = useState<GameCopy[]>([]);
  const [isPriceFetching, setIsPriceFetching] = useState(false);
  const [fetchingRows, setFetchingRows] = useState<Set<string>>(new Set());
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
  const [lastFetchAllTime, setLastFetchAllTime] = useState<string | null>(null);

  useEffect(() => {
    setLastFetchAllTime(localStorage.getItem("lastFetchAll"));
  }, []);

  const fetchInventory = () => {
    setLoading(true);
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((d) => setItems(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const mergeItemIntoInventory = (item: GameItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((entry) => entry.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
  };

  useEffect(() => { fetchInventory(); }, []);

  const fetchFavorites = () => {
    fetch("/api/favorites")
      .then(r => r.json())
      .then(d => {
        const nextPeople = Array.isArray(d.people) ? d.people.filter((person: Person) => person?.id && person?.name) : [];
        setPeople(nextPeople);
        setFavData(d.favorites || {});
        setRegretData(d.regrets || {});
      })
      .catch(e => console.error(e));
  };

  useEffect(() => { fetchFavorites(); }, []);

  const fetchTags = () => {
    fetch("/api/tags").then(r => r.json()).then(d => setTagsData(d)).catch(() => {});
  };
  useEffect(() => { fetchTags(); }, []);

  // Helper: get all people who favorited a game
  const whoFavorited = (gameId: string): Person[] =>
    people.filter(p => (favData[p.id] || []).includes(gameId));

  const isGameFavoritedBy = (gameId: string, personId: string) =>
    (favData[personId] || []).includes(gameId);
  const isGameRegrettedBy = (gameId: string, personId: string) =>
    (regretData[personId] || []).includes(gameId);
  const whoRegreted = (gameId: string): Person[] =>
    people.filter(p => (regretData[p.id] || []).includes(gameId));

  const toggleFavorite = async (personId: string, gameId: string) => {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_favorite", personId, gameId })
    });
    fetchFavorites();
  };

  const toggleRegret = async (personId: string, gameId: string) => {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_regret", personId, gameId })
    });
    fetchFavorites();
  };

  const addPerson = async () => {
    if (!newPersonName.trim()) return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_person", name: newPersonName, color: newPersonColor || null })
    });
    setNewPersonName("");
    setNewPersonColor("");
    fetchFavorites();
  };

  const renamePerson = async (id: string) => {
    if (!editingPersonName.trim()) return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename_person", id, name: editingPersonName, color: editingPersonColor || null })
    });
    setEditingPersonId(null);
    setEditingPersonName("");
    setEditingPersonColor("");
    fetchFavorites();
  };

  const removePerson = async (id: string) => {
    if (!confirm("Remove this person and all their favorites?")) return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_person", id })
    });
    if (favPersonFilter === id) setFavPersonFilter(null);
    fetchFavorites();
  };

  // Close overflow menu when clicking outside — using mousedown to avoid firing on the same click that opened it
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]')) {
        setOpenMenuId(null);
      }
    };
    // Use setTimeout so this listener is added AFTER the current click event cycle
    const timer = setTimeout(() => {
      document.addEventListener('click', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [openMenuId]);

  const totalPaid = (copies: GameCopy[]) => getTotalPaid(copies);

  // The Vault should show the full inventory/catalog truth, not just currently enabled platform subsets.
  // Platform enablement is a settings/input convenience, not a hidden global vault filter.
  const filteredByPlatform = items;

  // Get unique platforms for the filter dropdown
  const platforms = Array.from(new Set(filteredByPlatform.map(i => i.platform))).sort();

  // Score computation (run over items after filtering)
  const computeScores = (allItems: GameItem[]) => {
    const sellDeltas: number[] = [];
    const buyPrices: number[] = [];

    for (const item of allItems) {
      const copies = item.copies || [];
      const qty = copies.length;
      const market = totalMarket(item);
      const paid = totalPaid(copies);

      if (qty > 0 && paid > 0 && market > 0 && !item.isDigital) {
        sellDeltas.push((market - paid) / paid * 100);
      }
      // Buy score: include ALL items (owned or not) where we have a market price
      if (market > 0 && !item.isDigital) {
        buyPrices.push(market);
      }
    }

    const minSell = Math.min(...sellDeltas);
    const maxSell = Math.max(...sellDeltas);
    const minBuy = Math.min(...buyPrices);
    const maxBuy = Math.max(...buyPrices);

    return { minSell, maxSell, minBuy, maxBuy };
  };

  const getSellScore = (item: GameItem, minSell: number, maxSell: number): number | null => {
    const copies = item.copies || [];
    if (copies.length === 0) return null;
    const market = totalMarket(item);
    const paid = totalPaid(copies);
    if (paid === 0 || market === 0) return null;

    // Base score: ROI relative to collection
    const delta = (market - paid) / paid * 100;
    const baseScore = maxSell === minSell ? 50 : ((delta - minSell) / (maxSell - minSell)) * 100;

    // Trend bonus: if price is rising over last 30 days, it's a better time to sell soon
    const priceKey = (copies[0]?.hasBox && copies[0]?.hasManual) ? "cib" : "loose";
    const trend30 = getPriceTrend(item, 30, priceKey);
    let trendBonus = 0;
    if (trend30 !== null) {
      // Price rising = higher sell score (good time to sell before it corrects)
      trendBonus = Math.min(Math.max(trend30 / 2, -20), 20); // cap at ±20
    }

    return Math.min(100, Math.max(1, Math.round((baseScore * 0.7) + (50 + trendBonus) * 0.3)));
  };

  const getBuyScore = (item: GameItem, minBuy: number, maxBuy: number): number | null => {
    const price = (item.copies || []).length > 0
      ? getCorrectPrice(item, item.copies[0])
      : totalMarket(item);
    if (price === 0) return null;

    // Base: lower relative price = better buy
    const baseScore = maxBuy === minBuy ? 50 : 100 - ((price - minBuy) / (maxBuy - minBuy)) * 100;

    // Trend bonus: if price is falling over last 30 days, it might be a good time to buy
    // But if it's rising fast, maybe wait (or it's trending up and a good hold)
    const priceKey = (item.copies[0]?.hasBox && item.copies[0]?.hasManual) ? "cib" : "loose";
    const trend30 = getPriceTrend(item, 30, priceKey);
    let trendBonus = 0;
    if (trend30 !== null) {
      // Price falling = better time to buy (score boost)
      trendBonus = Math.min(Math.max(-trend30 / 2, -20), 20);
    }

    return Math.min(100, Math.max(1, Math.round((baseScore * 0.7) + (50 + trendBonus) * 0.3)));
  };

  // Nostalgia Score: a sentimental value metric combining multiple signals
  const getNostalgiaScore = (item: GameItem): number | null => {
    const copies = item.copies || [];
    if (copies.length === 0) return null; // only for owned games
    let score = 0;
    let factors = 0;

    // Factor 1: Has favorites (people love it)
    const fanCount = people.filter(p => (favData[p.id] || []).includes(item.id)).length;
    if (people.length > 0) { score += (fanCount / people.length) * 100; factors++; }

    // Factor 2: Multiple copies owned (you keep coming back to it)
    if (copies.length > 1) { score += Math.min(copies.length * 20, 80); factors++; }
    else { score += 20; factors++; } // owning at least one copy = baseline

    // Factor 3: High personal rating (from Showcase)
    const rating = item.personalRating;
    if (rating) { score += (rating / 5) * 100; factors++; }

    // Factor 4: Longevity (older purchase date = held it longer = more sentimental)
    const pd = item.purchaseDate;
    if (pd) {
      const daysSince = Math.floor((Date.now() - new Date(pd).getTime()) / 86400000);
      score += Math.min(daysSince / 3, 100); // max 100 at ~300 days
      factors++;
    }

    // Factor 5: Not for sale (no flip targets / only one copy)
    if (copies.length === 1) { score += 30; factors++; }

    return factors > 0 ? Math.min(100, Math.round(score / factors)) : null;
  };

  const nostalgiaEmoji = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return { icon: '💖', label: 'BELOVED', color: 'text-pink-400' };
    if (score >= 60) return { icon: '❤️', label: 'CHERISHED', color: 'text-red-400' };
    if (score >= 40) return { icon: '🎮', label: 'FONDLY REMEMBERED', color: 'text-yellow-400' };
    return { icon: '💬', label: 'NOTED', color: 'text-zinc-400' };
  };

  const scoreColor = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return { dot: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]", label: "text-green-400", text: "STRONG" };
    if (score >= 50) return { dot: "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]", label: "text-yellow-400", text: "MODERATE" };
    return { dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]", label: "text-red-400", text: "WEAK" };
  };

  const getCorrectPrice = (item: GameItem, copy?: GameCopy) => {
    // NES: default to loose. Everything else: use actual copy condition.
    return getCopyMarketValue(item, copy);
  };

  const totalMarket = (item: GameItem) => {
    return getTotalMarketValue(item);
  };

  const { minSell, maxSell, minBuy, maxBuy } = computeScores(filteredByPlatform);

  // Tag & mention search helpers
  const getTagsForItem = (id: string) => tagsData.gameTags?.[id] || [];
  const getMentionsForItem = (id: string) => {
    const allMentions: string[] = [];
    Object.entries(tagsData.mentions || {}).forEach(([personId, personMentions]) => {
      personMentions.forEach(m => {
        if (m.entityId === id) {
          allMentions.push(m.message, m.fromPerson);
          const toPerson = people.find(p => p.id === personId);
          if (toPerson) allMentions.push(toPerson.name);
        }
      });
    });
    return allMentions.join(" ").toLowerCase();
  };

  const sortedItems = [...filteredByPlatform]
    .filter((m) => {
      const q = search.toLowerCase();
      const match = m.title.toLowerCase().includes(q) || m.platform.toLowerCase().includes(q);
      if (!match) return false;
      // Tag search filter
      if (tagSearch.trim()) {
        const ts = tagSearch.trim().toLowerCase();
        const itemTags = getTagsForItem(m.id).join(" ");
        const itemMentions = getMentionsForItem(m.id);
        const tagMatch = itemTags.includes(ts) || itemMentions.includes(ts) ||
          people.some(p => ts.startsWith("@") ? p.name.toLowerCase().includes(ts.slice(1)) && getMentionsForItem(m.id).includes(p.name.toLowerCase()) : false);
        if (!tagMatch) return false;
      }
      if (platformFilter !== "all" && m.platform !== platformFilter) return false;
      const qty = (m.copies || []).length;
      if (filterAction === "owned") return qty > 0;
      if (filterAction === "unowned") return qty === 0;
      if (filterAction === "sell") return qty > 1;
      if (filterAction === "hold") return qty === 1;
      if (filterAction.startsWith("fav_")) {
        const personId = filterAction.slice(4);
        return isGameFavoritedBy(m.id, personId);
      }
      if (filterAction.startsWith("reg_")) {
        const personId = filterAction.slice(4);
        return isGameRegrettedBy(m.id, personId);
      }
      return true;
    })
    .sort((a, b) => {
      let av: SortValue, bv: SortValue;
      if (sortField === "qty") { av = (a.copies||[]).length; bv = (b.copies||[]).length; }
      else if (sortField === "totalPaid") { av = totalPaid(a.copies||[]); bv = totalPaid(b.copies||[]); }
      else if (sortField === "totalMarket") { av = totalMarket(a); bv = totalMarket(b); }
      else if (sortField === "sellScore") { av = getSellScore(a, minSell, maxSell) ?? -1; bv = getSellScore(b, minSell, maxSell) ?? -1; }
      else if (sortField === "buyScore") { av = getBuyScore(a, minBuy, maxBuy) ?? -1; bv = getBuyScore(b, minBuy, maxBuy) ?? -1; }
      else if (sortField === "dateAdded") {
        av = new Date(a.purchaseDate || 0).getTime();
        bv = new Date(b.purchaseDate || 0).getTime();
      }
      else if (sortField === "gameAge") {
        const currentYear = new Date().getFullYear();
        const getReleaseYear = (item: GameItem) => {
          const match = item.notes?.match(/releaseYear:(\d{4})/i);
          return match ? Number(match[1]) : null;
        };
        av = getReleaseYear(a) ? currentYear - getReleaseYear(a)! : -1;
        bv = getReleaseYear(b) ? currentYear - getReleaseYear(b)! : -1;
      }
      else { av = String(a[sortField as keyof GameItem] ?? ""); bv = String(b[sortField as keyof GameItem] ?? ""); }
      if (typeof av === "string" || typeof bv === "string") {
        const avs = String(av);
        const bvs = String(bv);
        return sortOrder === "asc" ? avs.localeCompare(bvs) : bvs.localeCompare(avs);
      }
      return sortOrder === "asc" ? av - bv : bv - av;
    });

  const displayed = pageSize === "all" ? sortedItems : sortedItems.slice(0, pageSize);

  const ebay = (title: string, platform: string) =>
    `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${title} ${platform}`)}`;
  const pc = (title: string, platform: string) =>
    `https://www.pricecharting.com/search-products?q=${encodeURIComponent(`${title} ${platform}`)}&type=videogames`;

  const fetchRow = async (item: GameItem) => {
    setFetchingRows((p) => new Set(p).add(item.id));
    try {
      const res = await fetch(`/api/pricecharting?q=${encodeURIComponent(`${item.title} ${item.platform}`)}`);
      const data = await res.json() as PriceChartingResponse;
      if (!data.error && (data.loose !== "N/A" || data.cib !== "N/A")) {
        await fetch("/api/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, marketLoose: data.loose, marketCib: data.cib, marketNew: data.new, marketGraded: data.graded, lastFetched: new Date().toISOString(), hasVariants: !!data.hasVariants }),
        });
        fetchInventory();
      }
    } catch (e) { console.error(e); }
    finally {
      setFetchingRows((p) => { const n = new Set(p); n.delete(item.id); return n; });
    }
  };

  const fetchAll = async () => {
    if (!confirm(`Fetch prices for ${sortedItems.length} filtered items? This may take a while.`)) return;
    setIsFetchingAll(true);

    // Acquire lock to pause background fetcher
    await fetch('/api/fetchlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acquire' })
    });
    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      setFetchProgress({ current: i + 1, total: sortedItems.length });
      try {
        const res = await fetch(`/api/pricecharting?q=${encodeURIComponent(`${item.title} ${item.platform}`)}`);
        const data = await res.json() as PriceChartingResponse;
        if (!data.error && (data.loose !== "N/A" || data.cib !== "N/A")) {
          await fetch("/api/inventory", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...item, marketLoose: data.loose, marketCib: data.cib, marketNew: data.new, marketGraded: data.graded, lastFetched: new Date().toISOString() }),
          });
        }
      } catch (e) { console.error(e); }
      await new Promise((r) => setTimeout(r, 2000));
    }
    // Release lock so background fetcher can resume
    await fetch('/api/fetchlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release' })
    });

    fetchInventory();
    setIsFetchingAll(false);
    setFetchProgress({ current: 0, total: 0 });
    const now = new Date().toLocaleString();
    localStorage.setItem("lastFetchAll", now);
    setLastFetchAllTime(now);
  };

  const saveItem = async () => {
    const method = editingItem ? "PUT" : "POST";
    try {
      await fetch("/api/inventory", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, copies: formCopies }),
      });
      setIsModalOpen(false);
      fetchInventory();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Failed to save asset"); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    await fetch(`/api/inventory?id=${id}`, { method: "DELETE" });
    fetchInventory();
  };

  const handleUndoVaultWishlist = async (gameId: string) => {
    const entry = vaultWishlistUndo[gameId];
    if (!entry) return;
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      setVaultWishlistUndo((prev) => {
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAsset = async (data: AssetFormData) => {
    const newItem = {
      id: Math.random().toString(36).slice(2, 10),
      title: data.title,
      platform: data.platform,
      status: "Yes",
      notes: data.notes || "",
      purchaseDate: data.purchaseDate,
      isDigital: data.isDigital,
      marketLoose: "0",
      marketCib: "0",
      copies: [{
        id: Math.random().toString(36).slice(2, 10),
        hasBox: data.hasBox,
        hasManual: data.hasManual,
        priceAcquired: data.priceAcquired,
        condition: data.condition,
      }]
    };
    const created = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    }).then((r) => r.json());

    let removedWishlistEntry: WishlistRestorePayload | null = null;
    const config = await fetch("/api/config").then((r) => r.json()).catch(() => ({}));
    const autoSatisfyWishlistOnVaultAdd = config?.autoSatisfyWishlistOnVaultAdd !== false;
    if (autoSatisfyWishlistOnVaultAdd) {
      const wishlistPayload = await fetch('/api/wishlist').then((r) => r.json()).catch(() => ({}));
      const match = Array.isArray(wishlistPayload?.items)
        ? (wishlistPayload.items as WishlistItem[]).find((item) =>
            String(item?.title || '').trim().toLowerCase() === data.title.trim().toLowerCase() &&
            String(item?.platform || '').trim().toLowerCase() === data.platform.trim().toLowerCase()
          )
        : null;
      if (match?.id) {
        removedWishlistEntry = {
          title: match.title || data.title,
          platform: match.platform || data.platform,
          playerId: match.playerId || null,
          priority: match.priority ?? 2,
          notes: match.notes ?? null,
          marketLoose: match.marketLoose ?? null,
          marketCib: match.marketCib ?? null,
          marketNew: match.marketNew ?? null,
          marketGraded: match.marketGraded ?? null,
          lastFetched: match.lastFetched ?? null,
        };
        await fetch(`/api/wishlist/${match.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }

    addPurchaseToActiveConventionSession({
      title: data.title,
      platform: data.platform,
      price: parseFloat(data.priceAcquired || '0') || 0,
      condition: data.condition,
      notes: data.notes || '',
      at: data.source || 'Vault',
      source: data.source || 'Vault',
    });

    // Auto-enable platform if it's not currently enabled in config.
    if (data.platform) {
      const enabledPlatforms = Array.isArray(config?.platforms) ? config.platforms : [];
      if (!enabledPlatforms.includes(data.platform)) {
        const syncRes = await fetch("/api/platforms/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: data.platform, enabled: true, autoPopulate: true })
        }).then(r => r.json()).catch(() => ({}));
        const added = syncRes?.sync?.populated?.added || 0;
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[500] bg-yellow-950 border-2 border-yellow-600 px-6 py-3 font-terminal text-yellow-300 text-sm shadow-lg';
        toast.textContent = added > 0
          ? `📺 Platform enabled: ${data.platform} — added ${added.toLocaleString()} catalog games for this system.`
          : `📺 Platform enabled: ${data.platform} — catalog sync ${syncRes?.sync?.catalogFound === false ? 'is not available for this system yet' : 'found no new games to add'}.`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
      }
    }

    mergeItemIntoInventory(created);
    if (removedWishlistEntry?.title) {
      setVaultWishlistUndo((prev) => ({ ...prev, [created.id]: removedWishlistEntry }));
    }
    setSearch("");
    setPlatformFilter(data.platform || "all");
    setFilterAction("owned");
    setShowAddModal(false);
    fetchInventory();
  };

  const openNew = () => {
    setShowAddModal(true);
  };

  const openEdit = (item: GameItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setFormCopies(item.copies || []);
    setIsModalOpen(true);
  };

  const fetchModalPrice = async () => {
    if (!formData.title || !formData.platform) return;
    setIsPriceFetching(true);
    try {
      const res = await fetch(`/api/pricecharting?q=${encodeURIComponent(`${formData.title} ${formData.platform}`)}`);
      const data = await res.json() as PriceChartingResponse;
      if (!data.error) setFormData((p) => ({ ...p, marketLoose: data.loose, marketCib: data.cib }));
    } catch (e) { console.error(e); }
    finally { setIsPriceFetching(false); }
  };

  const addCopy = () => setFormCopies((p) => [...p, { id: Math.random().toString(36).slice(2, 10), hasBox: false, hasManual: false, priceAcquired: "0", condition: "Good" }]);
  const updateCopy = (id: string, u: Partial<GameCopy>) => setFormCopies((p) => p.map((c) => c.id === id ? { ...c, ...u } : c));
  const removeCopy = (id: string) => setFormCopies((p) => p.filter((c) => c.id !== id));

  // SortHeader hoisted to module scope above
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    if (field === 'dateAdded' || field === 'gameAge' || field === 'qty' || field === 'totalPaid' || field === 'totalMarket' || field === 'sellScore' || field === 'buyScore') {
      setSortOrder('desc');
    } else {
      setSortOrder('asc');
    }
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh] flex flex-col">

      {/* Header */}
      <header className="mb-6 border-b-4 border-green-900 pb-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl">🕹️</span>
          <h2 className="text-xl sm:text-3xl text-green-400 tracking-widest uppercase leading-tight">Vault Inventory</h2>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={fetchAll}
            disabled={isFetchingAll}
            title={lastFetchAllTime ? `Last Fetch: ${lastFetchAllTime}` : "Never fetched"}
            className="bg-blue-900/50 hover:bg-blue-600 text-blue-300 font-terminal font-bold text-sm sm:text-xl px-3 sm:px-4 py-2 rounded-sm border-2 border-blue-500 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isFetchingAll ? `FETCHING ${fetchProgress.current}/${fetchProgress.total}...` : "FETCH FILTERED"}
          </button>
          <button onClick={() => setShowCodex(true)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-terminal font-bold text-sm sm:text-xl px-3 sm:px-4 py-2 rounded-sm border-2 border-zinc-600 transition-all whitespace-nowrap" title="Vault Codex — How to use this app">
            📜 CODEX
          </button>
          <button onClick={() => setShowPeopleManager(true)} className="bg-purple-900/60 hover:bg-purple-700 text-purple-300 font-terminal font-bold text-sm sm:text-xl px-3 sm:px-4 py-2 rounded-sm border-2 border-purple-600 transition-all whitespace-nowrap" title="Manage Players — people who track favorites and regrets">
            🎮 PLAYERS
          </button>
          <button onClick={openNew} className="bg-green-600 hover:bg-green-500 text-black font-terminal font-bold text-sm sm:text-xl px-3 sm:px-4 py-2 rounded-sm border-2 border-green-400 transition-all whitespace-nowrap ml-auto">
            + ADD ASSET
          </button>
        </div>
      </header>

      {error && <div className="text-red-500 font-terminal text-2xl mb-4">[ERROR] {error}</div>}

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:max-w-2xl">
          <input
            type="text"
            placeholder="SEARCH VAULT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-950 border-2 border-green-800 text-green-400 p-2 font-terminal text-xl uppercase w-full focus:outline-none focus:border-green-400 focus:bg-green-950/20 focus:shadow-[0_0_12px_rgba(34,197,94,0.25)] transition-all"
          />
          <input
            type="text"
            placeholder="#tag or @player..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="bg-zinc-950 border-2 border-purple-900 text-purple-300 p-2 font-terminal text-xl w-full sm:max-w-xs focus:outline-none focus:border-purple-400 focus:bg-purple-950/20 focus:shadow-[0_0_12px_rgba(168,85,247,0.25)] transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-end w-full sm:w-auto">
          <div className="flex border-2 border-green-800 rounded-sm overflow-hidden">
            <button onClick={() => setViewMode("table")} className={`px-3 py-1 font-terminal text-sm uppercase transition-colors ${viewMode === "table" ? "bg-green-600 text-black" : "text-green-500 hover:bg-green-900/30"}`}>Table</button>
            <button onClick={() => setViewMode("cards")} className={`px-3 py-1 font-terminal text-sm uppercase transition-colors border-l-2 border-green-800 ${viewMode === "cards" ? "bg-green-600 text-black" : "text-green-500 hover:bg-green-900/30"}`}>Cards</button>
          </div>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="bg-zinc-950 border-2 border-purple-800 text-purple-400 p-2 font-terminal text-xl uppercase focus:outline-none cursor-pointer">
            <option value="all">SYSTEM: ALL</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="bg-zinc-950 border-2 border-emerald-800 text-emerald-400 p-2 font-terminal text-xl uppercase focus:outline-none cursor-pointer">
            <option value="owned">FILTER: OWNED</option>
            <option value="unowned">FILTER: TARGETS (UNOWNED)</option>
            <option value="all">FILTER: ALL</option>
            <option value="sell">ACTION: SELL (DUPS)</option>
            <option value="hold">ACTION: HOLD</option>
            {people.length > 0 && <option disabled>── FAVORITES ──</option>}
            {[...people].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
              <option key={p.id} value={`fav_${p.id}`}>
                ⭐ {p.name.toUpperCase()}&apos;S FAVORITES
              </option>
            ))}
            {people.length > 0 && <option disabled>── REGRETS ──</option>}
            {[...people].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
              <option key={p.id} value={`reg_${p.id}`}>
                👎 {p.name.toUpperCase()}&apos;S REGRETS
              </option>
            ))}
          </select>
          <select value={`${sortField}:${sortOrder}`} onChange={(e) => {
            const [field, order] = e.target.value.split(':');
            setSortField(field);
            setSortOrder(order as 'asc' | 'desc');
          }} className="bg-zinc-950 border-2 border-cyan-800 text-cyan-300 p-2 font-terminal text-xl uppercase focus:outline-none cursor-pointer">
            <option value="dateAdded:desc">SORT: DATE ADDED (NEWEST)</option>
            <option value="dateAdded:asc">SORT: DATE ADDED (OLDEST)</option>
            <option value="gameAge:desc">SORT: GAME AGE (OLDEST)</option>
            <option value="gameAge:asc">SORT: GAME AGE (NEWEST)</option>
            <option value="title:asc">SORT: TITLE (A-Z)</option>
            <option value="platform:asc">SORT: SYSTEM (A-Z)</option>
            <option value="qty:desc">SORT: QUANTITY (HIGH-LOW)</option>
            <option value="totalPaid:desc">SORT: MONEY IN (HIGH-LOW)</option>
            <option value="totalMarket:desc">SORT: MARKET VALUE (HIGH-LOW)</option>
            <option value="sellScore:desc">SORT: SELL SCORE (BEST)</option>
            <option value="buyScore:desc">SORT: BUY SCORE (BEST)</option>
          </select>
          <select value={pageSize} onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-zinc-950 border-2 border-green-800 text-green-400 p-2 font-terminal text-xl uppercase focus:outline-none cursor-pointer">
            <option value={100}>SHOW: 100</option>
            <option value={1000}>SHOW: 1000</option>
            <option value="all">SHOW: ALL</option>
          </select>
          <div className="font-terminal text-green-700 text-xl whitespace-nowrap">{displayed.length} / {sortedItems.length}</div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-green-500 font-terminal text-2xl animate-pulse">ACCESSING ARCHIVES...</div>
      ) : viewMode === "table" ? (
        <div className="flex-1 overflow-auto border-2 border-green-900 rounded bg-zinc-950">
          <table className="w-full text-left font-terminal text-lg whitespace-nowrap min-w-[1100px]">
            <thead className="sticky top-0 bg-zinc-900 border-b-2 border-green-800 text-green-500 uppercase z-10">
              <tr>
                <SortHeader field="platform" label="System" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                <SortHeader field="title" label="Title" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                <SortHeader field="qty" label="QTY" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                <SortHeader field="totalPaid" label="Paid" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                <SortHeader field="totalMarket" label="Market" className="text-blue-400" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                <SortHeader field="sellScore" label="Sell" className="text-emerald-400" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                <SortHeader field="buyScore" label="Buy" className="text-yellow-400" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                <th className="p-3 text-center text-purple-400">VIBE</th>
                <th className="p-3 text-center text-pink-400" title="Nostalgia Score">💖</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((item, idx) => {
                const qty = (item.copies || []).length;
                const paid = totalPaid(item.copies || []);
                const market = totalMarket(item);
                const delta = market - paid;
                const dc = delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-zinc-500";
                return (
                  <tr key={item.id} className={`border-b border-green-900/30 hover:bg-green-900/20 transition-colors ${idx % 2 === 0 ? "bg-black/20" : ""}`}>
                    <td className="p-3">
                      <PlatformButton platform={item.platform} onClick={setConsoleModalPlatform} className="text-green-500 hover:text-green-300" />
                    </td>
                    <td className="p-3 text-green-300 font-bold max-w-xs" title={item.title}>
                      <button onClick={() => setPriceDetailItem(item)} className="hover:text-green-100 hover:underline text-left truncate w-full">{item.title}</button>
                      {item.hasVariants && (
                        <span className="inline-block ml-1 text-xs font-terminal border border-amber-700 bg-amber-950/40 text-amber-300 px-1.5 py-0.5">⚠</span>
                      )}
                      {vaultWishlistUndo[item.id] && (
                        <button
                          onClick={() => handleUndoVaultWishlist(item.id)}
                          className="mt-1 block text-xs font-terminal text-pink-300 border border-pink-800 px-2 py-1 hover:bg-pink-950/30"
                        >
                          ↩ PUT BACK ON WISHLIST
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {qty === 0 ? <span className="text-zinc-600">-</span> : (
                        <span className={`px-2 py-1 rounded-full ${qty > 1 ? "bg-emerald-600/30 text-emerald-400 border border-emerald-600 font-bold" : ""}`}>
                          {qty} {qty > 1 && "🔥"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-zinc-400 text-right">{qty === 0 ? "--" : paid > 0 ? `$${paid.toFixed(2)}` : "--"}</td>
                    <td className="p-3 text-right font-bold">
                      {market > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-blue-400">${market.toFixed(2)}</span>
                          {qty > 0 && paid > 0 && <span className={`text-sm ${dc}`}>({delta > 0 ? "+" : ""}{delta.toFixed(2)})</span>}
                        </div>
                      ) : "--"}
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const score = getSellScore(item, minSell, maxSell);
                        const style = scoreColor(score);
                        return score !== null ? (
                          <div className="flex flex-col items-center gap-1" title={`Sell Score: ${score}/100`}>
                            <div className={`w-3 h-3 rounded-full ${style!.dot}`}></div>
                            <span className={`text-sm font-terminal ${style!.label}`}>{score}</span>
                          </div>
                        ) : <span className="text-zinc-700">--</span>;
                      })()}
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const score = getBuyScore(item, minBuy, maxBuy);
                        const style = scoreColor(score);
                        return score !== null ? (
                          <div className="flex flex-col items-center gap-1" title={`Buy Score: ${score}/100`}>
                            <div className={`w-3 h-3 rounded-full ${style!.dot}`}></div>
                            <span className={`text-sm font-terminal ${style!.label}`}>{score}</span>
                          </div>
                        ) : <span className="text-zinc-700">--</span>;
                      })()}
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const fans = whoFavorited(item.id);
                        const regretters = whoRegreted(item.id);
                        const hasFavs = fans.length > 0;
                        const hasRegrets = regretters.length > 0;
                        if (!hasFavs && !hasRegrets) return <span className="text-zinc-800">-</span>;
                        const allNames = [
                          ...fans.map(p => `⭐ ${p.name}`),
                          ...regretters.map(p => `👎 ${p.name}`)
                        ].join(", ");
                        // Mixed: both favs and regrets
                        if (hasFavs && hasRegrets) {
                          return <span className="text-2xl" title={allNames}>⚖️</span>;
                        }
                        // Only regrets
                        if (hasRegrets) {
                          return <span className="text-2xl" title={allNames}>👎</span>;
                        }
                        // All favorites — show count of stars if multiple people
                        return (
                          <div className="flex justify-center" title={allNames}>
                            <span className="text-xl">⭐</span>
                            {fans.length > 1 && <span className="text-yellow-400 font-terminal text-sm ml-1">{fans.length}</span>}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const ns = getNostalgiaScore(item);
                        const ne = nostalgiaEmoji(ns);
                        return ne ? (
                          <span title={`Nostalgia Score: ${ns}/100 — ${ne.label}`} className={`text-xl ${ne.color}`}>{ne.icon}</span>
                        ) : <span className="text-zinc-800">-</span>;
                      })()}
                    </td>
                    <td className="p-3 text-center relative" data-menu>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        className="text-zinc-400 hover:text-green-400 font-terminal text-2xl leading-none px-3 py-1 rounded hover:bg-green-900/30 transition-colors"
                        title="Actions"
                        data-menu
                      >
                        ⋯
                      </button>
                      {openMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border-2 border-green-800 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] w-64 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto overflow-x-hidden text-left" data-menu>
                          <Tip text="Pull a fresh live market lookup for this title and save the latest PriceCharting data into the vault.">
                            <button
                              onClick={() => { fetchRow(item); setOpenMenuId(null); }}
                              disabled={fetchingRows.has(item.id)}
                              className="w-full px-4 py-2 text-emerald-400 hover:bg-green-900/40 font-terminal text-lg disabled:opacity-50 text-left"
                              title={item.lastFetched ? `Last: ${new Date(item.lastFetched).toLocaleString()}` : "Fetch price"}
                            >
                              {fetchingRows.has(item.id) ? "FETCHING..." : "📡 FETCH PRICE"}
                            </button>
                          </Tip>
                          <Tip text="Edit copies, condition, cost, notes, and other stored details for this entry.">
                            <button onClick={() => { openEdit(item); setOpenMenuId(null); }} className="w-full px-4 py-2 text-yellow-400 hover:bg-green-900/40 font-terminal text-lg text-left">
                              ✏️ EDIT
                            </button>
                          </Tip>
                          <Tip text="Open a pre-filled eBay search for this title and platform to compare current listings.">
                            <a href={ebay(item.title, item.platform)} target="_blank" rel="noopener noreferrer" onClick={() => setOpenMenuId(null)} className="block px-4 py-2 text-blue-400 hover:bg-green-900/40 font-terminal text-lg">
                              🛒 EBAY
                            </a>
                          </Tip>
                          <Tip text="Open the full PriceCharting page for this game if you want to inspect comps and source data directly.">
                            <a href={pc(item.title, item.platform)} target="_blank" rel="noopener noreferrer" onClick={() => setOpenMenuId(null)} className="block px-4 py-2 text-yellow-400 hover:bg-green-900/40 font-terminal text-lg">
                              📊 PRICECHARTING
                            </a>
                          </Tip>
                            <div className="border-t border-green-900/50 mt-1 pt-1">
                              {people.length > 0 ? (
                                <>
                                  <div className="px-4 py-1 text-yellow-500 font-terminal text-sm">⭐ FAVORITES:</div>
                              {[...people].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => { toggleFavorite(p.id, item.id); }}
                                  className={`w-full px-4 py-2 font-terminal text-lg text-left transition-colors ${
                                    isGameFavoritedBy(item.id, p.id)
                                      ? "text-yellow-400 hover:bg-yellow-900/30"
                                      : "text-zinc-400 hover:bg-green-900/30"
                                  }`}
                                >
                                  {isGameFavoritedBy(item.id, p.id) ? "⭐" : "☆"} {p.name}
                                </button>
                              ))}
                                  <div className="px-4 py-1 text-red-400 font-terminal text-sm mt-1">👎 REGRETS:</div>
                                  {[...people].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => { toggleRegret(p.id, item.id); }}
                                      className={`w-full px-4 py-2 font-terminal text-lg text-left transition-colors ${
                                        isGameRegrettedBy(item.id, p.id)
                                          ? "text-red-400 hover:bg-red-900/30"
                                          : "text-zinc-400 hover:bg-green-900/30"
                                      }`}
                                    >
                                      {isGameRegrettedBy(item.id, p.id) ? "👎" : "○"} {p.name}
                                    </button>
                                  ))}
                                </>
                              ) : (
                                <p className="px-4 py-2 text-zinc-600 font-terminal text-sm">Add people via ⭐ FAVORITES button to track.</p>
                              )}
                            </div>
                          <Tip text="Delete this vault entry. Use with caution, this removes the stored record after confirmation.">
                            <button onClick={() => { deleteItem(item.id); setOpenMenuId(null); }} className="w-full px-4 py-2 text-red-500 hover:bg-red-900/30 font-terminal text-lg text-left border-t border-green-900/50 mt-1">
                              🗑️ DELETE
                            </button>
                          </Tip>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayed.map((item) => {
            const qty = (item.copies || []).length;
            const paid = totalPaid(item.copies || []);
            const market = totalMarket(item);
            const delta = market - paid;
            const dc = delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-zinc-500";
            return (
              <div key={item.id} className="bg-black border-2 border-green-800 rounded-sm p-4 flex flex-col shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                <button onClick={() => setPriceDetailItem(item)} className="text-xl text-green-300 font-bold mb-1 truncate hover:text-green-100 hover:underline text-left w-full" title={item.title}>{item.title}</button>
                {vaultWishlistUndo[item.id] && (
                  <button
                    onClick={() => handleUndoVaultWishlist(item.id)}
                    className="mb-2 text-xs font-terminal text-pink-300 border border-pink-800 px-2 py-1 hover:bg-pink-950/30 self-start"
                  >
                    ↩ PUT BACK ON WISHLIST
                  </button>
                )}
                <p className="text-green-500 text-sm mb-4">{item.platform}</p>
                <div className="flex justify-between font-terminal text-lg mb-2">
                  <span className="text-zinc-400">QTY:</span>
                  <span className={qty > 1 ? "text-emerald-400 font-bold" : ""}>{qty} {qty > 1 && "🔥"}</span>
                </div>
                <div className="flex justify-between font-terminal text-lg mb-2">
                  <span className="text-zinc-400">PAID:</span>
                  <span className="text-zinc-400">{paid > 0 ? `$${paid.toFixed(2)}` : "--"}</span>
                </div>
                <div className="flex justify-between font-terminal text-lg mb-3">
                  <span className="text-zinc-400">MARKET:</span>
                  <span className="text-blue-400">{market > 0 ? `$${market.toFixed(2)}` : "--"}</span>
                </div>
                {qty > 0 && paid > 0 && market > 0 && (
                  <div className={`text-center text-xl font-bold mb-3 ${dc}`}>DELTA: {delta > 0 ? "+" : ""}{delta.toFixed(2)}</div>
                )}
                <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-green-900/40 justify-center">
                  <button onClick={() => fetchRow(item)} disabled={fetchingRows.has(item.id)} className="text-emerald-400 hover:text-emerald-300 text-sm disabled:opacity-50" title={item.lastFetched ? `Last: ${new Date(item.lastFetched).toLocaleString()}` : "Fetch price"}>
                    {fetchingRows.has(item.id) ? "[...]" : "[FETCH]"}
                  </button>
                  <button onClick={() => openEdit(item)} className="text-yellow-500 hover:text-yellow-300 text-sm">[EDIT]</button>
                  <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:text-red-300 text-sm">[DEL]</button>
                  <a href={ebay(item.title, item.platform)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm">[EBAY]</a>
                  <a href={pc(item.title, item.platform)} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 text-sm">[PC]</a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Price Detail Modal - using shared component */}
      {priceDetailItem && <PriceDetailModal item={priceDetailItem} onClose={() => setPriceDetailItem(null)} favoritedBy={whoFavorited(priceDetailItem.id)} regrettedBy={whoRegreted(priceDetailItem.id)} allPeople={people} />}

      {playerProfile && (
        <PlayerProfileModal
          critic={playerProfile}
          people={people}
          items={items}
          favData={favData}
          regretData={regretData}
          onClose={() => setPlayerProfile(null)}
        />
      )}

      {/* Codex Modal */}
      {showCodex && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowCodex(false)}>
          <div className="bg-zinc-950 border-4 border-zinc-600 p-6 rounded-sm w-full max-w-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] mx-4 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="border-b-2 border-zinc-700 pb-4 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl text-zinc-200 font-terminal uppercase tracking-widest">📜 VAULT CODEX</h2>
                <p className="text-zinc-500 font-terminal text-xs mt-1">Mission Control field manual</p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex mb-6 border-b-2 border-zinc-700">
              <button onClick={() => setCodexTab('player')}
                className={`px-4 py-2 font-terminal text-lg uppercase transition-colors ${
                  codexTab === 'player' ? 'bg-green-600 text-black' : 'text-zinc-400 hover:text-white'
                }`}>
                🕹️ Player&apos;s Guide
              </button>
              <button onClick={() => setCodexTab('tech')}
                className={`px-4 py-2 font-terminal text-lg uppercase transition-colors ${
                  codexTab === 'tech' ? 'bg-blue-600 text-black' : 'text-zinc-400 hover:text-white'
                }`}>
                ⚙️ Technical Manual
              </button>
            </div>
            
            {codexTab === 'player' ? (
              <div className="space-y-4">
                {[{
                  icon: "🔍", title: "VAULT INVENTORY",
                  content: [
                    "The Vault shows your entire game catalog (owned + unowned). Defaults to OWNED view.",
                    "FILTER: OWNED — only games in your collection.",
                    "FILTER: TARGETS (UNOWNED) — games in the catalog you don&apos;t have yet.",
                    "FILTER: ALL — the full 26,000+ title database.",
                    "ACTION: SELL (DUPS) — games where you own multiple copies 🔥.",
                    "FAVORITES / REGRETS — filter by a specific person's picks.",
                    "SYSTEM filter (purple) — narrow to a single platform.",
                  ]
                }, {
                  icon: "📊", title: "BUY & SELL SCORES",
                  content: [
                    "Every game gets a Buy Score and Sell Score from 1-100.",
                    "100 = the single best opportunity in your current filtered view.",
                    "Scores weight: 70% current price relative to catalog + 30% 30-day price trend.",
                    "Green dot = strong (80+). Yellow = moderate (50-79). Red = weak (1-49).",
                    "Rising prices boost Sell Score. Falling prices boost Buy Score.",
                    "Click column headers to sort your best flip or buy opportunities to the top.",
                  ]
                }, {
                  icon: "💰", title: "MARKET PRICES",
                  content: [
                    "Click [FETCH] on any row to pull live Loose, CIB, New, and Graded prices from PriceCharting.",
                    "FETCH FILTERED button bulk-fetches prices for all currently visible rows (respects lock).",
                    "Hover [FETCH] to see when that game's price was last updated.",
                    "The system picks the correct price for your copy's condition: CIB if you have box+manual, Loose otherwise.",
                    "The market value delta (±$X.XX) reflects true profit/loss for your specific copies.",
                  ]
                }, {
                  icon: "🗣️", title: "GAME TITLE MODAL",
                  content: [
                    "Click any game title to open its full Price Detail Modal.",
                    "Shows Loose, CIB, New/Sealed, and Graded prices — the version you own is highlighted.",
                    "Lists each physical copy you own with its condition and cost paid.",
                    "If no purchase date is set, a date picker appears to log it directly in the modal.",
                    "Once set, the acquisition date shows as 'Acquired: Month Day, Year' (read-only).",
                    "Shows 7-day and 30-day price trends once history accumulates.",
                    "Displays who has Favorited or Regretted this game (with pill badges).",
                  ]
                }, {
                  icon: "🕹️", title: "SYSTEM (PLATFORM) MODAL",
                  content: [
                    "Click any platform name to open the Console Codex.",
                    "Shows CPU, RAM, release/discontinuation year, library size.",
                    "Displays your collection coverage % vs the full tracked catalog and full library %.",
                    "3 daily-rotating trivia facts (changes every 24 hours).",
                    "Available everywhere a platform name appears: Vault, Analytics, Goals, Showcase.",
                  ]
                }, {
                  icon: "🎬", title: "THE CRITICS",
                  content: [
                    "Click 🎬 THE CRITICS to add people (yourself, friends, family).",
                    "Use ⋯ menu on any row to toggle ⭐ Favorite or 👎 Regret per person.",
                    "Favorites and Regrets are mutually exclusive per person per game.",
                    "VIBE column: ⭐ = loved by all, 👎 = regretted, ⚖️ = mixed.",
                    "Filter the Vault by a person's Favorites or Regrets via the filter dropdown.",
                    "Click a player's name to open their Profile: total counts, top platforms, full game lists.",
                  ]
                }, {
                  icon: "⋯", title: "ROW ACTIONS MENU",
                  content: [
                    "Click ⋯ on any row to open actions. Automatically closes on outside click.",
                    "FETCH PRICE — pulls live PriceCharting data for this game.",
                    "EDIT — manage individual copies: condition, cost, box/manual status.",
                    "EBAY — pre-filled eBay search for this game + platform.",
                    "PRICECHARTING — opens the game's full PriceCharting page.",
                    "DELETE — removes the game (confirmation required).",
                    "THE CRITICS toggles — ⭐/👎 per person directly from the menu.",
                  ]
                }, {
                  icon: "🎮", title: "COLLECTION TOOLS",
                  content: [
                    "ANALYTICS (/analytics) — KPI cards, platform charts, top 10 tables, achievement panel.",
                    "SHOWCASE (/showcase) — visual gallery with 1-5 stars, rarity, and completion tracking.",
                    "GOALS (/goals) — per-platform progress bars for catalog coverage.",
                    "COMPLETION TIERS (/tiers) — Bronze/Silver/Gold/Platinum badges per platform.",
                    "MILESTONES (/milestones) — 25+ auto-computed collection achievements.",
                    "ACHIEVEMENT CODEX (/achievements) — 100+ achievements across 9 categories and 5 rarity tiers.",
                    "DECADE TIMELINE (/timeline) — visual history of your collection by release year.",
                    "COLLECTION RANDOMIZER (/random) — animated game picker for 'what should I play tonight?'.",
                    "DUPLICATE DETECTOR (/dupes) — finds multi-copy games and their sellable market value.",
                    "VALUE HISTORY (/value-history) — daily collection value graph over time.",
                  ]
                }, {
                  icon: "💰", title: "BUSINESS TOOLS",
                  content: [
                    "P&L LEDGER (/sales) — log every buy and sell; tracks realized profit and margins.",
                    "HOT LIST (/hotlist) — auto-ranked flip opportunities by ROI × trend × copy count.",
                    "FLIP CALCULATOR (/flip) — net profit after eBay/Mercari fees, with break-even targets.",
                    "TARGET RADAR (/watchlist) — buy-below price alerts; 🟢 BUY NOW when market drops below your target.",
                    "SOURCING ANALYTICS (/sourcing) — ROI breakdown by where you buy (garage sale vs eBay etc.).",
                    "PLATFORM MARKET REPORT (/market) — which platforms are trending up or down this month.",
                    "SEASONAL CALENDAR (/seasonal) — historically best months to buy and sell by platform.",
                    "LISTING CHECKER (/listing) — 12-point eBay listing quality checklist with tips.",
                  ]
                }, {
                  icon: "🔦", title: "FIELD & HUNTING TOOLS",
                  content: [
                    "FIELD MODE (/field) — price check + dupe alert + Should I Buy? decision engine.",
                    "NEGOTIATION HELPER (/negotiate) — offer ladder with scenario presets and suggested opening lines.",
                    "LOT CALCULATOR (/lot) — proportional cost allocation for bulk lot purchases.",
                    "CONVENTION TRACKER (/convention) — real-time budget meter with purchase log per event.",
                    "CONDITION GRADER (/condition) — step-by-step condition checklist for NES/SNES/GBA/disc/console.",
                    "INSURANCE REPORT (/insurance) — printable collection valuation document.",
                  ]
                }, {
                  icon: "🌐", title: "DISCOVERY & SOCIAL",
                  content: [
                    "PLAY LOG (/playlog) — Currently Playing/Beaten/Backlog/Want/Gave Up with 1-5 star ratings.",
                    "GRAIL LIST (/grails) — priority-ranked wish list; mark items as FOUND when you score them.",
                    "EVENTS (/events) — gaming convention calendar with Eventbrite scraper and attending tracking.",
                    "LOCAL DEALS (/deals) — Craigslist and Reddit r/gameswap alerts matched to your watchlist.",
                    "WHATNOT (/whatnot) — follow sellers and log their scheduled streams.",
                    "FIELD GUIDE (/guide) — 8 chapters, 60+ hunter principles and resource links.",
                    "FRIENDS MODE (/friends) — per-player profiles with mentions, favorites, and regrets.",
                    "SCRAPER CENTER (/scrapers) — manage all data scrapers (run, schedule, view logs).",
                  ]
                }, {
                  icon: "⚙️", title: "PLATFORM & SETTINGS",
                  content: [
                    "SETTINGS (/settings) — theme, color, app name, auth, feature flags, city config.",
                    "STEAM CONNECTOR (/steam) — first-pass PC library import groundwork with profile targeting and privacy guidance.",
                    "FEATURE FLAGS — enable/disable entire feature groups; nav updates instantly.",
                    "THEME SYSTEM — 8 color palettes × 5 style themes (Terminal, CRT Scanline, Arcade, Cartridge, Galaxy).",
                    "GLOBAL SEARCH — press / or click 🔍 to search pages, games, grails, watchlist, events.",
                    "KEYBOARD SHORTCUTS — press ? for full list; g+v for Vault, g+f for Field Mode, etc.",
                    "PWA SUPPORT — installable on iPhone/Android from the browser; Field Mode works as a native app.",
                    "CSV IMPORT (/import) — import game lists from spreadsheets or CLZ Games.",
                    "SHARE COLLECTION (/share) — generate a read-only public URL + QR code for conventions.",
                    "CHANGELOG (/changelog) — full version history since v1.0.0.",
                  ]
                }].map(section => (
                  <div key={section.title} className="bg-zinc-900 border border-zinc-700 rounded-sm p-4">
                    <h3 className="text-lg text-green-400 font-terminal font-bold mb-3">{section.icon} {section.title}</h3>
                    <ul className="space-y-1">
                      {section.content.map((line, i) => (
                        <li key={i} className="text-zinc-400 text-sm flex gap-2">
                          <span className="text-zinc-600 shrink-0">‣</span>{line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[{
                  icon: "🗃️", title: "DATA STORAGE",
                  content: [
                    "All data lives on disk in the server's data/ directory, not in a cloud database.",
                    "inventory.json — the full 26,000+ game catalog with prices, copies, and history.",
                    "favorites.json — people, their favorites, and regrets.",
                    "sales.json — your sales log.",
                    "acquisitions.json — your purchase log.",
                    "watchlist.json — your target buy-price alerts.",
                    "fetch.lock — a temporary lock file created during UI-triggered fetches.",
                  ]
                }, {
                  icon: "💹", title: "PRICECHARTING SCRAPER",
                  content: [
                    "Uses a two-strategy system: Direct URL first, then search fallback.",
                    "Strategy 1: Constructs a predictable direct URL (/game/sega-genesis/game-slug) for instant, precise lookups.",
                    "Strategy 2: Searches results page, scores all rows by title similarity using token overlap scoring.",
                    "Sequel guard: if a result title contains '2', 'II', 'Deluxe', 'Turbo' etc. not in your query, its score is halved.",
                    "Minimum 60% token overlap required to accept any fuzzy match result.",
                    "Captures Loose, CIB, New/Sealed, and Graded prices per fetch.",
                    "Stores all 4 price tiers per day in priceHistory (one entry per date).",
                  ]
                }, {
                  icon: "⏰", title: "BACKGROUND FETCHER",
                  content: [
                    "A Node.js script (scripts/bg-fetch.mjs) runs automatically every night at midnight via cron.",
                    "Skips items already fetched today — safe to run multiple times per day.",
                    "Throttled to 2.5 seconds per request to avoid rate limiting PriceCharting.",
                    "Saves progress to disk every 25 fetches so interruptions don&apos;t lose work.",
                    "Respects the UI fetch lock: if FETCH FILTERED is running, the cron pauses and waits.",
                    "Full run across 26,000 items takes ~18 hours (overnight run is ideal).",
                    "Logs to logs/bg-fetch.log for auditing.",
                  ]
                }, {
                  icon: "🔐", title: "FETCH LOCK SYSTEM",
                  content: [
                    "When FETCH FILTERED starts, it calls /api/fetchlock to acquire a lock file.",
                    "The background cron script polls for the lock file between each item.",
                    "If the lock is present, the cron pauses and waits 5 seconds before checking again.",
                    "When the UI fetch completes, it releases the lock so the cron resumes.",
                    "This prevents parallel PriceCharting requests and potential IP rate-limiting.",
                  ]
                }, {
                  icon: "📊", title: "SCORING ALGORITHM",
                  content: [
                    "Sell Score: (current ROI % - min collection ROI) / (max - min) × 100, then blended 70/30 with trend.",
                    "Buy Score: Inverted price relative to catalog range, blended 70/30 with trend.",
                    "Trend data: 30-day % change in price from priceHistory.",
                    "Rising prices: +up to 20 points on Sell Score, -20 on Buy Score.",
                    "Falling prices: +up to 20 points on Buy Score, -20 on Sell Score.",
                    "Scores normalize across the full item set on each page load — always current.",
                  ]
                }, {
                  icon: "🎙️", title: "API ROUTES",
                  content: [
                    "/api/inventory — CRUD for the game database.",
                    "/api/favorites — CRUD for people, favorites, and regrets.",
                    "/api/pricecharting — PriceCharting scraper proxy (all 4 price tiers).",
                    "/api/fetchlock — Acquire/release the UI fetch lock.",
                    "/api/sales — Sales log, acquisitions, and watchlist.",
                    "/api/tags — Game/platform tags + @mention CRUD.",
                    "/api/config — App configuration read/write.",
                    "/api/auth — Session login, logout, and status check.",
                    "/api/achievements — Context builder + auto-evaluation of all achievements.",
                    "/api/alerts — Real-time watchlist price alerts + hot flip notifications.",
                    "/api/events — Gaming events CRUD (attending, interested, notes).",
                    "/api/deals — Craigslist and Reddit deal management (dismiss, restore).",
                    "/api/scrapers — Scraper status, run, schedule, log viewer.",
                    "/api/value-history — Daily collection value snapshots.",
                  ]
                }, {
                  icon: "🏠", title: "INFRASTRUCTURE",
                  content: [
                    "Next.js 16 app in /workspace/retrovault. Production managed by pm2 with env-specific apps.",
                    "Dev: npm run dev. Managed runtimes: pm2 start ecosystem.config.js (prod 3000, dev 3001, nightly 3002).",
                    "nginx reverse proxy config at nginx.conf.example — copy to sites-available and enable.",
                    "Runtime data lives in data/<env>/ for prod, dev, and nightly.",
                    "8 scraper scripts in scripts/. Cron schedules managed via Scraper Control Center (/scrapers).",
                    "Auto-commit to GitHub via scripts/git-sync.mjs (cron: every 6 hours).",
                    "PWA manifest at public/manifest.json. SSH key at ~/.ssh/id_github_retrovault.",
                    "GitHub repo: github.com/theretrovault/retrovault (private). Deploy: bash scripts/deploy.sh [prod|dev|nightly].",
                  ]
                }].map(section => (
                  <div key={section.title} className="bg-zinc-900 border border-zinc-700 rounded-sm p-4">
                    <h3 className="text-lg text-blue-400 font-terminal font-bold mb-3">{section.icon} {section.title}</h3>
                    <ul className="space-y-1">
                      {section.content.map((line, i) => (
                        <li key={i} className="text-zinc-400 text-sm flex gap-2">
                          <span className="text-zinc-600 shrink-0">‣</span>{line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowCodex(false)} className="px-6 py-2 font-terminal text-xl text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-400 transition-colors">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddAssetModal
          title="+ ADD ASSET TO VAULT"
          onClose={() => setShowAddModal(false)}
          onSave={handleAddAsset}
        />
      )}

      {consoleModalPlatform && (
        <ConsoleModal
          platform={consoleModalPlatform}
          totalInCatalog={items.filter(i => i.platform === consoleModalPlatform).length}
          owned={items.filter(i => i.platform === consoleModalPlatform && (i.copies || []).length > 0).length}
          onClose={() => setConsoleModalPlatform(null)}
          people={people}
        />
      )}


      {showPeopleManager && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowPeopleManager(false)}>
          <div className="bg-zinc-950 border-4 border-purple-600 p-6 rounded-sm w-full max-w-lg shadow-[0_0_30px_rgba(168,85,247,0.4)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl text-purple-400 font-terminal uppercase mb-6 tracking-widest border-b-2 border-purple-900 pb-2">
              🎮 PLAYERS
            </h3>

            {/* Add new person */}
            <div className="space-y-3 mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="ENTER PLAYER NAME..."
                  value={newPersonName}
                  onChange={e => setNewPersonName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPerson()}
                  className="flex-1 bg-black border-2 border-purple-800 text-purple-300 p-2 font-terminal text-xl uppercase focus:outline-none focus:border-purple-400"
                />
                <button onClick={addPerson} className="bg-purple-700 hover:bg-purple-600 text-white font-terminal text-xl px-4 py-2 transition-colors">
                  + ADD
                </button>
              </div>
              <div>
                <p className="text-zinc-500 font-terminal text-sm mb-2 uppercase">Player Color</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setNewPersonColor("")}
                    className={`px-3 py-1 font-terminal text-sm border ${!newPersonColor ? 'border-white text-white' : 'border-zinc-700 text-zinc-500'}`}
                  >
                    Auto
                  </button>
                  {PLAYER_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewPersonColor(color)}
                      className={`h-8 w-8 border-2 ${newPersonColor === color ? 'border-white' : 'border-zinc-700'}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* People list */}
            {people.length === 0 ? (
              <p className="text-zinc-600 font-terminal text-xl text-center py-4">No people added yet.</p>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {people.map(p => (
                  <div key={p.id} className="bg-zinc-900 border border-purple-900/50 p-4 rounded-sm">
                    {editingPersonId === p.id ? (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <input
                            autoFocus
                            type="text"
                            value={editingPersonName}
                            onChange={e => setEditingPersonName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && renamePerson(p.id)}
                            className="flex-1 bg-black border-2 border-purple-800 text-purple-300 p-2 font-terminal text-xl uppercase focus:outline-none"
                          />
                          <button onClick={() => renamePerson(p.id)} className="text-green-400 hover:text-green-200 font-terminal text-xl px-3">SAVE</button>
                          <button onClick={() => { setEditingPersonId(null); setEditingPersonColor(""); }} className="text-zinc-400 hover:text-white font-terminal text-xl px-3">CANCEL</button>
                        </div>
                        <div>
                          <p className="text-zinc-500 font-terminal text-sm mb-2 uppercase">Player Color</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setEditingPersonColor("")}
                              className={`px-3 py-1 font-terminal text-sm border ${!editingPersonColor ? 'border-white text-white' : 'border-zinc-700 text-zinc-500'}`}
                            >
                              Auto
                            </button>
                            {PLAYER_COLOR_OPTIONS.map((color) => (
                              <button
                                key={color}
                                onClick={() => setEditingPersonColor(color)}
                                className={`h-8 w-8 border-2 ${editingPersonColor === color ? 'border-white' : 'border-zinc-700'}`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <button onClick={() => setPlayerProfile(p)} className="text-purple-300 hover:text-purple-100 hover:underline font-terminal text-xl font-bold">{p.name}</button>
                          <span className="inline-block h-3 w-3 rounded-full ml-3 border border-zinc-700" style={{ backgroundColor: p.color || undefined }} />
                          <span className="text-yellow-500 font-terminal text-sm ml-3">
                            {(favData[p.id] || []).length} ⭐
                          </span>
                          <span className="text-red-400 font-terminal text-sm ml-2">
                            {(regretData[p.id] || []).length} 👎
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setEditingPersonId(p.id); setEditingPersonName(p.name); setEditingPersonColor(p.color || ''); }}
                            className="text-yellow-400 hover:text-yellow-200 font-terminal text-sm px-2 py-1 border border-yellow-900/50 hover:border-yellow-500"
                          >
                            RENAME
                          </button>
                          <button
                            onClick={() => removePerson(p.id)}
                            className="text-red-500 hover:text-red-300 font-terminal text-sm px-2 py-1 border border-red-900/50 hover:border-red-500"
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-between items-center">
              <p className="text-zinc-600 font-terminal text-sm">Toggle ⭐ / 👎 opinions via the ⋯ menu on each game row. Player colors carry into shared wishlist views.</p>
              <button onClick={() => setShowPeopleManager(false)} className="px-4 py-2 font-terminal text-xl text-zinc-400 hover:text-white">
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-zinc-950 border-4 border-green-500 p-6 rounded-sm w-full max-w-3xl shadow-[0_0_30px_rgba(34,197,94,0.4)] my-auto">
            <h3 className="text-2xl text-green-400 font-terminal uppercase mb-6 tracking-widest border-b-2 border-green-900 pb-2">
              {editingItem ? "MANAGE ASSET & COPIES" : "NEW ASSET CATALOG ENTRY"}
            </h3>

            <div className="space-y-6 font-terminal text-xl text-green-500">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">TITLE</label>
                  <input type="text" className="w-full bg-black border-2 border-green-800 p-2 focus:outline-none focus:border-green-400 text-green-300" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div>
                  <label className="block mb-1">PLATFORM</label>
                  <input type="text" className="w-full bg-black border-2 border-green-800 p-2 focus:outline-none focus:border-green-400 text-green-300" value={formData.platform || ""} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm text-zinc-400">PURCHASE DATE</label>
                <input type="date" className="w-full bg-black border-2 border-green-800 p-2 focus:outline-none focus:border-green-400 text-green-300 font-terminal text-xl" value={formData.purchaseDate || ""} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} />
              </div>

              <div className="bg-green-900/10 p-4 border border-green-900/50 rounded-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-green-400">MARKET PRICES</h4>
                  <button onClick={fetchModalPrice} disabled={isPriceFetching} className="bg-blue-900/50 hover:bg-blue-600 text-blue-300 border border-blue-500 px-3 py-1 disabled:opacity-50">
                    {isPriceFetching ? "FETCHING..." : "FETCH FROM MARKET"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-zinc-400">LOOSE ($)</label>
                    <input type="number" step="0.01" className="w-full bg-black border-2 border-green-800 p-2 focus:outline-none focus:border-blue-400 text-blue-400" value={formData.marketLoose || ""} onChange={(e) => setFormData({ ...formData, marketLoose: e.target.value })} />
                  </div>
                  <div>
                    <label className="block mb-1 text-zinc-400">CIB ($)</label>
                    <input type="number" step="0.01" className="w-full bg-black border-2 border-green-800 p-2 focus:outline-none focus:border-blue-400 text-blue-400" value={formData.marketCib || ""} onChange={(e) => setFormData({ ...formData, marketCib: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-green-900 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-2xl text-green-300 uppercase">Copies ({formCopies.length})</h4>
                  <button onClick={addCopy} className="bg-green-900/50 hover:bg-green-600 text-green-300 border border-green-500 px-3 py-1">+ ADD COPY</button>
                </div>
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {formCopies.map((copy, idx) => (
                    <div key={copy.id} className="bg-black border border-green-800 p-4 flex flex-col md:flex-row gap-4 items-end relative">
                      <span className="absolute top-2 right-2 text-zinc-500 text-sm">#{idx + 1}</span>
                      <div className="flex gap-4 items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-5 h-5 accent-green-600" checked={copy.hasBox} onChange={(e) => updateCopy(copy.id, { hasBox: e.target.checked })} /> BOX
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-5 h-5 accent-green-600" checked={copy.hasManual} onChange={(e) => updateCopy(copy.id, { hasManual: e.target.checked })} /> MANUAL
                        </label>
                      </div>
                      <div className="w-[100px]">
                        <label className="block mb-1 text-sm text-zinc-400">COST ($)</label>
                        <input type="number" step="0.01" className="w-full bg-black border-2 border-green-800 p-2 text-green-300 focus:outline-none" value={copy.priceAcquired} onChange={(e) => updateCopy(copy.id, { priceAcquired: e.target.value })} />
                      </div>
                      <div className="w-[150px]">
                        <label className="block mb-1 text-sm text-zinc-400">CONDITION</label>
                        <select className="w-full bg-black border-2 border-green-800 p-2 text-green-300 uppercase" value={copy.condition} onChange={(e) => updateCopy(copy.id, { condition: e.target.value })}>
                          <option value="Mint">MINT</option>
                          <option value="Good">GOOD</option>
                          <option value="Fair">FAIR</option>
                          <option value="Poor">POOR</option>
                        </select>
                      </div>
                      <button onClick={() => removeCopy(copy.id)} className="text-red-500 hover:text-red-300 p-2 border border-red-900/50 bg-red-900/20">[DEL]</button>
                    </div>
                  ))}
                  {formCopies.length === 0 && (
                    <div className="text-zinc-500 text-center py-4 italic border border-dashed border-zinc-800">No copies. Click + ADD COPY.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-green-900 flex justify-between items-center">
              <span className="text-zinc-500 font-terminal">Total Paid: ${totalPaid(formCopies).toFixed(2)}</span>
              <div className="flex gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-terminal text-xl text-zinc-400 hover:text-white">CANCEL</button>
                <button onClick={saveItem} className="px-4 py-2 font-terminal text-xl bg-green-600 text-black font-bold hover:bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]">COMMIT RECORD</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
