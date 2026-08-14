"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ALL_PLATFORMS } from "@/data/platformGroups";
import { readFieldCache } from "@/lib/fieldCache";
import {
  buildAcquisitionEntry,
  buildFieldCopy,
  findInventoryMatch,
  getMatchConfidence,
  type CopyCondition,
} from "@/lib/fieldMode";
import { addPurchaseToActiveConventionSession } from "@/lib/conventionSession";

type WishlistItem = {
  id: string;
  title: string;
  platform: string;
  gameId?: string | null;
  playerId?: string | null;
  player?: { id: string; name: string; color?: string | null } | null;
  priority: 1 | 2 | 3;
  notes?: string | null;
  marketLoose?: number | null;
  marketCib?: number | null;
  marketNew?: number | null;
  marketGraded?: number | null;
  lastFetched?: string | null;
  addedAt: string;
  foundAt?: string | null;
  hasVariants?: boolean;
};

type PlayerOption = { id: string; name: string; color?: string | null };

type InventoryItem = {
  id: string;
  title: string;
  platform: string;
  marketLoose?: string | number | null;
  marketCib?: string | number | null;
  marketNew?: string | number | null;
  copies?: {
    id: string;
    condition?: string;
    hasBox?: boolean;
    hasManual?: boolean;
    priceAcquired?: string | number;
  }[];
};

type SuggestionItem = {
  title: string;
  platform: string;
  source: "owned" | "not-owned" | "wishlist";
};

type VariantMatch = {
  title: string;
  platform: string;
  loose: string | null;
  cib: string | null;
  new: string | null;
  graded: string | null;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type PriceLookup = {
  title: string;
  platform: string;
  loose: string | null;
  cib: string | null;
  new: string | null;
  graded: string | null;
  confidence?: number;
  matchedTitle?: string | null;
  hasVariants?: boolean;
  variantMatches?: VariantMatch[];
};

type FoundPromptState = {
  open: boolean;
  item: WishlistItem | null;
  pricePaid: string;
  condition: CopyCondition;
  notes: string;
  saving: boolean;
  error: string;
};

const PRIORITY_META = {
  1: { label: "⭐ Must-Have", color: "border-yellow-600 bg-yellow-950/20 text-yellow-300", badge: "bg-yellow-900 text-yellow-300" },
  2: { label: "🎮 Want",      color: "border-green-700  bg-green-950/20  text-green-400",  badge: "bg-green-900  text-green-300"  },
  3: { label: "📦 Someday",   color: "border-zinc-700   bg-zinc-900/20   text-zinc-400",   badge: "bg-zinc-800   text-zinc-300"   },
};

const PLATFORMS = [...ALL_PLATFORMS, "Other"];
const MAX_SUGGESTIONS = 8;
const SUGGEST_DEBOUNCE_MS = 150;
const WISHLIST_PLAYER_STORAGE_KEY = "retrovault-wishlist-player";

type Filter = "all" | "active" | "found";

type PlayerFilter = "all" | string;

const PLAYER_BADGE_STYLES = [
  "border-pink-700 bg-pink-950/20 text-pink-300",
  "border-cyan-700 bg-cyan-950/20 text-cyan-300",
  "border-orange-700 bg-orange-950/20 text-orange-300",
  "border-violet-700 bg-violet-950/20 text-violet-300",
  "border-emerald-700 bg-emerald-950/20 text-emerald-300",
];

function getPlayerBadgeStyle(playerId?: string | null, playerColor?: string | null) {
  if (playerColor) return "text-black border-transparent";
  if (!playerId) return "border-zinc-700 bg-zinc-900/40 text-zinc-300";
  const total = playerId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PLAYER_BADGE_STYLES[total % PLAYER_BADGE_STYLES.length];
}

export default function WishlistPage() {
  const [items,   setItems]   = useState<WishlistItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<Filter>("active");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("all");
  const [search,  setSearch]  = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareQrSvg, setShareQrSvg] = useState("");
  const [copyMsg,  setCopyMsg]  = useState("");
  const [form, setForm] = useState({
    title: "", platform: PLATFORMS[0], priority: 2 as 1 | 2 | 3, notes: "", playerId: "",
  });
  const [titleSearch, setTitleSearch] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [priceLookup, setPriceLookup] = useState<PriceLookup | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [bulkFetchLoading, setBulkFetchLoading] = useState(false);
  const [fetchingWishlistIds, setFetchingWishlistIds] = useState<string[]>([]);
  const [foundPrompt, setFoundPrompt] = useState<FoundPromptState>({
    open: false,
    item: null,
    pricePaid: "",
    condition: "Loose",
    notes: "",
    saving: false,
    error: "",
  });
  const catalogRef = useRef<SuggestionItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/wishlist")
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/inventory")
      .then(r => r.json())
      .then((d: InventoryItem[]) => setInventory(Array.isArray(d) ? d : []))
      .catch(() => setInventory([]));
  }, []);

  useEffect(() => {
    fetch("/api/favorites")
      .then(r => r.json())
      .then((d) => {
        const nextPlayers = Array.isArray(d?.people) ? d.people.filter((person: PlayerOption) => person?.id && person?.name) : [];
        setPlayers(nextPlayers);
        const storedPlayerId = typeof window !== "undefined" ? localStorage.getItem(WISHLIST_PLAYER_STORAGE_KEY) || "" : "";
        const preferredPlayerId = nextPlayers.some((player: PlayerOption) => player.id === storedPlayerId)
          ? storedPlayerId
          : nextPlayers[0]?.id || "";
        setForm((current) => ({ ...current, playerId: current.playerId || preferredPlayerId }));
      })
      .catch(() => setPlayers([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      const merged = new Map<string, SuggestionItem>();
      for (const item of inventory) {
        merged.set(`${item.title}::${item.platform}`.toLowerCase(), {
          title: item.title,
          platform: item.platform,
          source: Array.isArray(item.copies) && item.copies.length > 0 ? "owned" : "not-owned",
        });
      }
      for (const item of items) {
        const key = `${item.title}::${item.platform}`.toLowerCase();
        if (!merged.has(key)) {
          merged.set(key, {
            title: item.title,
            platform: item.platform,
            source: "wishlist",
          });
        }
      }

      const cache = await readFieldCache().catch(() => null);
      if (cache?.games?.length) {
        for (const game of cache.games) {
          const key = `${game.title}::${game.platform}`.toLowerCase();
          if (!merged.has(key)) {
            merged.set(key, {
              title: game.title,
              platform: game.platform,
              source: "not-owned",
            });
          }
        }
      }

      if (!cancelled) {
        catalogRef.current = Array.from(merged.values());
      }
    };

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [inventory, items]);

  const existingInventoryMatch = useMemo(
    () => findInventoryMatch(
      inventory.filter((item) => Array.isArray(item.copies) && item.copies.length > 0),
      form.title,
      form.platform
    ),
    [inventory, form.title, form.platform]
  );

  const resetAddForm = () => {
    const storedPlayerId = typeof window !== "undefined" ? localStorage.getItem(WISHLIST_PLAYER_STORAGE_KEY) || "" : "";
    setForm({ title: "", platform: PLATFORMS[0], priority: 2, notes: "", playerId: storedPlayerId || players[0]?.id || "" });
    setTitleSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    setPriceLookup(null);
    setPriceError("");
    setPriceLoading(false);
    setSaveStatus("");
  };

  const updateSuggestions = (q: string, platform: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const lower = q.toLowerCase();
      const startsWith = catalogRef.current.filter((item) =>
        item.title.toLowerCase().startsWith(lower) && item.platform === platform
      );
      const contains = catalogRef.current.filter((item) =>
        !item.title.toLowerCase().startsWith(lower) &&
        item.title.toLowerCase().includes(lower) &&
        item.platform === platform
      );
      const fallbackStarts = platform === "Other"
        ? []
        : catalogRef.current.filter((item) =>
            item.title.toLowerCase().startsWith(lower) && item.platform !== platform
          );
      const merged = [...startsWith, ...contains, ...fallbackStarts]
        .filter((item, index, arr) => arr.findIndex((candidate) => candidate.title === item.title && candidate.platform === item.platform) === index)
        .slice(0, MAX_SUGGESTIONS);
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
      setActiveSuggestion(-1);
    }, SUGGEST_DEBOUNCE_MS);
  };

  const fetchPrice = async (title = form.title, platform = form.platform, wishlistId?: string) => {
    if (!title.trim() || !platform.trim()) return false;
    if (wishlistId) {
      setFetchingWishlistIds((current) => current.includes(wishlistId) ? current : [...current, wishlistId]);
    } else {
      setPriceLoading(true);
    }
    setPriceError("");
    try {
      const res = await fetch(`/api/pricecharting?title=${encodeURIComponent(title)}&platform=${encodeURIComponent(platform)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || data.error || "Price lookup failed");
      }
      const lookup = {
        title,
        platform,
        loose: data.loose ?? null,
        cib: data.cib ?? null,
        new: data.new ?? null,
        graded: data.graded ?? null,
        confidence: data.confidence,
        matchedTitle: data.matchedTitle ?? null,
        hasVariants: !!data.hasVariants,
        variantMatches: Array.isArray(data.variantMatches) ? data.variantMatches : [],
      };
      setPriceLookup(lookup);

      const existingWishlist = wishlistId
        ? items.find((item) => item.id === wishlistId)
        : items.find((item) => item.title === title && item.platform === platform && !item.foundAt);

      if (showAdd || existingWishlist) {
        const payload = {
          marketLoose: lookup.loose,
          marketCib: lookup.cib,
          marketNew: lookup.new,
          marketGraded: lookup.graded,
          lastFetched: new Date().toISOString(),
          hasVariants: !!lookup.hasVariants,
        };

        if (existingWishlist) {
          await fetch(`/api/wishlist/${existingWishlist.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        setItems((current) => current.map((item) => (
          item.title === title && item.platform === platform && !item.foundAt
            ? {
                ...item,
                marketLoose: lookup.loose != null ? Number(lookup.loose) : null,
                marketCib: lookup.cib != null ? Number(lookup.cib) : null,
                marketNew: lookup.new != null ? Number(lookup.new) : null,
                marketGraded: lookup.graded != null ? Number(lookup.graded) : null,
                lastFetched: payload.lastFetched,
                hasVariants: !!lookup.hasVariants,
              }
            : item
        )));
      }
      return true;
    } catch (error: unknown) {
      setPriceLookup(null);
      setPriceError(errorMessage(error, "Price lookup failed"));
      return false;
    } finally {
      if (wishlistId) {
        setFetchingWishlistIds((current) => current.filter((id) => id !== wishlistId));
      } else {
        setPriceLoading(false);
      }
    }
  };

  const fetchAllPrices = async () => {
    const activeItems = items.filter((item) => !item.foundAt);
    if (activeItems.length === 0) return;

    setBulkFetchLoading(true);
    setSaveStatus(`⏳ Fetching prices for ${activeItems.length} wishlist game${activeItems.length === 1 ? '' : 's'}...`);
    setPriceError('');

    let updated = 0;
    let failed = 0;

    for (const item of activeItems) {
      const ok = await fetchPrice(item.title, item.platform, item.id);
      if (ok) updated += 1;
      else failed += 1;
    }

    setBulkFetchLoading(false);
    setSaveStatus(
      failed > 0
        ? `✅ Updated ${updated} wishlist price${updated === 1 ? '' : 's'}, ${failed} failed.`
        : `✅ Updated ${updated} wishlist price${updated === 1 ? '' : 's'}.`
    );
  };

  const pickSuggestion = (suggestion: SuggestionItem) => {
    setForm((current) => ({
      ...current,
      title: suggestion.title,
      platform: suggestion.platform && suggestion.platform !== 'Unknown' ? suggestion.platform : current.platform,
    }));
    setTitleSearch(suggestion.title);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  };

  const add = async () => {
    if (!form.title.trim()) return;
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        playerId: form.playerId || null,
        marketLoose: priceLookup?.title === form.title && priceLookup?.platform === form.platform ? priceLookup.loose : null,
        marketCib: priceLookup?.title === form.title && priceLookup?.platform === form.platform ? priceLookup.cib : null,
        marketNew: priceLookup?.title === form.title && priceLookup?.platform === form.platform ? priceLookup.new : null,
        marketGraded: priceLookup?.title === form.title && priceLookup?.platform === form.platform ? priceLookup.graded : null,
        lastFetched: priceLookup?.title === form.title && priceLookup?.platform === form.platform ? new Date().toISOString() : null,
        hasVariants: priceLookup?.title === form.title && priceLookup?.platform === form.platform ? !!priceLookup.hasVariants : false,
      }),
    });
    setShowAdd(false);
    resetAddForm();
    load();
  };

  const openFoundPrompt = (item: WishlistItem) => {
    setFoundPrompt({
      open: true,
      item,
      pricePaid: "",
      condition: "Loose",
      notes: item.notes || "",
      saving: false,
      error: "",
    });
  };

  const closeFoundPrompt = () => {
    setFoundPrompt({
      open: false,
      item: null,
      pricePaid: "",
      condition: "Loose",
      notes: "",
      saving: false,
      error: "",
    });
  };

  const confirmFound = async () => {
    if (!foundPrompt.item) return;
    setFoundPrompt((current) => ({ ...current, saving: true, error: "" }));

    const item = foundPrompt.item;
    const existing = findInventoryMatch(inventory, item.title, item.platform);
    const loose = priceLookup?.title === item.title && priceLookup?.platform === item.platform ? priceLookup.loose : null;
    const cib = priceLookup?.title === item.title && priceLookup?.platform === item.platform ? priceLookup.cib : null;
    const nextCopy = buildFieldCopy(foundPrompt.condition, foundPrompt.pricePaid || "0.00");

    try {
      if (existing) {
        const updatedCopies = [...(existing.copies || []), nextCopy];
        await fetch("/api/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...existing,
            copies: updatedCopies,
            marketLoose: loose ?? existing.marketLoose ?? null,
            marketCib: cib ?? existing.marketCib ?? null,
            marketNew: priceLookup?.new ?? existing.marketNew ?? null,
          }),
        });
      } else {
        await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title,
            platform: item.platform,
            status: "owned",
            notes: foundPrompt.notes || item.notes || "Added from Wishlist",
            marketLoose: loose,
            marketCib: cib,
            marketNew: priceLookup?.new ?? null,
            copies: [nextCopy],
          }),
        });
      }

      await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "acquisitions",
          ...buildAcquisitionEntry({
            title: item.title,
            platform: item.platform,
            priceAcquired: foundPrompt.pricePaid || "0.00",
            notes: foundPrompt.notes || "Found from Wishlist",
            source: "Wishlist",
          }),
        }),
      }).catch(() => {});

      addPurchaseToActiveConventionSession({
        title: item.title,
        platform: item.platform,
        price: parseFloat(foundPrompt.pricePaid || "0") || 0,
        condition: foundPrompt.condition,
        notes: foundPrompt.notes || item.notes || "Found from Wishlist",
        at: "Wishlist",
        source: "Convention",
      });

      await fetch(`/api/wishlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foundAt: new Date().toISOString() }),
      });

      closeFoundPrompt();
      setSaveStatus(`✅ ${item.title} added to your collection.`);
      await Promise.all([load(), fetch("/api/inventory").then(r => r.json()).then((d: InventoryItem[]) => setInventory(Array.isArray(d) ? d : [])).catch(() => {})]);
    } catch (error: unknown) {
      setFoundPrompt((current) => ({
        ...current,
        saving: false,
        error: errorMessage(error, "Failed to add this wishlist item to your collection."),
      }));
    }
  };

  const unmarkFound = async (id: string) => {
    await fetch(`/api/wishlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foundAt: null }),
    });
    load();
  };

  const updateWishlistPlayer = async (id: string, playerId: string) => {
    const selectedPlayer = players.find((player) => player.id === playerId) || null;

    setItems((current) => current.map((item) => (
      item.id === id
        ? { ...item, playerId: playerId || null, player: selectedPlayer }
        : item
    )));

    await fetch(`/api/wishlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: playerId || null }),
    });

    load();
  };

  const del = async (id: string) => {
    if (!confirm("Remove from wishlist?")) return;
    await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
    load();
  };

  const buildPriceChartingUrl = (title: string, platform: string) => {
    const params = new URLSearchParams({
      type: "prices",
      q: `${title} ${platform}`,
    });
    return `https://www.pricecharting.com/search-products?${params.toString()}`;
  };

  const generateShareQr = async (url: string) => {
    const QRCode = (await import("qrcode")).default;
    const svg = await QRCode.toString(url, {
      type: "svg",
      width: 256,
      margin: 2,
      color: { dark: "#4ade80", light: "#09090b" },
    });
    setShareQrSvg(svg);
  };

  const downloadShareQr = () => {
    if (!shareQrSvg) return;
    const blob = new Blob([shareQrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retrovault-wishlist-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getShareLink = async () => {
    setCopyMsg("");
    try {
      const r = await fetch("/api/wishlist/share");
      const d = await r.json();
      if (!r.ok || !d?.token) {
        throw new Error(d?.error || "Could not generate wishlist share link");
      }
      const url = `${window.location.origin}/wishlist/public/${d.token}`;
      setShareUrl(url);
      await generateShareQr(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopyMsg("Copied!");
        setTimeout(() => setCopyMsg(""), 2000);
      } catch {
        setCopyMsg("Copy the link above");
      }
    } catch (error: unknown) {
      setShareUrl(null);
      setShareQrSvg("");
      setCopyMsg(errorMessage(error, "Share link failed"));
    }
  };

  const active = items.filter(i => !i.foundAt).length;
  const found  = items.filter(i => !!i.foundAt).length;

  const filtered = items.filter(i => {
    if (filter === "active" && i.foundAt) return false;
    if (filter === "found"  && !i.foundAt) return false;
    if (playerFilter !== "all" && (i.playerId || "") !== playerFilter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const compareWishlistItems = (a: WishlistItem, b: WishlistItem) => {
    const platformCompare = a.platform.localeCompare(b.platform, undefined, { sensitivity: "base" });
    if (platformCompare !== 0) return platformCompare;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  };

  const sortedFiltered = [...filtered].sort(compareWishlistItems);

  const wishlistTotals = items.reduce((totals, item) => {
    if (item.foundAt) return totals;
    if (item.marketLoose != null) totals.loose += Number(item.marketLoose);
    if (item.marketCib != null) totals.cib += Number(item.marketCib);
    if (item.marketNew != null) totals.new += Number(item.marketNew);
    if (item.marketGraded != null) totals.graded += Number(item.marketGraded);
    return totals;
  }, { loose: 0, cib: 0, new: 0, graded: 0 });

  const hasWishlistTotals = Object.values(wishlistTotals).some((value) => value > 0);

  // Group by priority for active view
  const grouped = [1, 2, 3].map(p => ({
    priority: p as 1 | 2 | 3,
    items: filtered.filter(i => i.priority === p && !i.foundAt).sort(compareWishlistItems),
  }));

  const inputCls = "bg-black border border-green-800 text-green-300 font-terminal px-3 py-2 focus:outline-none focus:border-green-500 w-full";
  const btnCls   = "px-4 py-2 font-terminal text-sm border transition-colors";

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">

      {/* Header */}
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">
            🎁 Wishlist
          </h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">
            {active} wanted · {found} found
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={getShareLink}
            className={`${btnCls} border-green-700 text-green-400 hover:bg-green-950`}
          >
            🔗 Share
          </button>
          <button
            onClick={fetchAllPrices}
            disabled={bulkFetchLoading || active === 0}
            className={`${btnCls} border-blue-700 text-blue-300 hover:bg-blue-950 disabled:opacity-50`}
          >
            {bulkFetchLoading ? '… Fetching All' : '💰 Fetch All'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className={`${btnCls} border-green-500 bg-green-900 hover:bg-green-800 text-green-200`}
          >
            + ADD
          </button>
        </div>
      </div>

      {/* Share URL banner */}
      {shareUrl && (
        <div className="mb-6 p-4 border border-green-700 bg-green-950/30 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-green-400 font-terminal text-sm flex-1 break-all">{shareUrl}</span>
            <span className="text-green-300 font-terminal text-xs">{copyMsg}</span>
            <button onClick={() => { setShareUrl(null); setShareQrSvg(""); setCopyMsg(""); }} className="text-zinc-500 hover:text-red-400 font-terminal text-xs">dismiss</button>
          </div>
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {shareQrSvg ? (
              <>
                <div className="border-4 border-green-700 p-3 bg-zinc-950" dangerouslySetInnerHTML={{ __html: shareQrSvg }} />
                <div className="space-y-3">
                  <button
                    onClick={downloadShareQr}
                    className={`${btnCls} border-blue-700 text-blue-300 hover:bg-blue-950`}
                  >
                    ⬇️ Download QR
                  </button>
                  <p className="text-zinc-500 font-terminal text-xs max-w-sm">
                    Scan this QR code to open the public wishlist link fast at conventions, trades, or local pickups.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-zinc-500 font-terminal text-xs">Generating QR...</p>
            )}
          </div>
        </div>
      )}

      {!shareUrl && copyMsg && (
        <div className="mb-6 p-3 border border-red-800 bg-red-950/20 text-red-300 font-terminal text-xs">
          {copyMsg}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="mb-6 p-4 border-2 border-green-700 bg-green-950/20">
          <h3 className="text-green-400 font-terminal mb-4">{"// ADD TO WISHLIST"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              className={inputCls}
              placeholder="Game title *"
              value={titleSearch}
              onChange={e => {
                const value = e.target.value;
                setTitleSearch(value);
                setForm(f => ({ ...f, title: value }));
                updateSuggestions(value, form.platform);
              }}
              onKeyDown={e => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveSuggestion((current) => Math.max(current - 1, 0));
                } else if (e.key === "Enter" && showSuggestions && activeSuggestion >= 0) {
                  e.preventDefault();
                  pickSuggestion(suggestions[activeSuggestion]);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              autoFocus
            />
            <select
              className={inputCls}
              value={form.platform}
              onChange={e => {
                const value = e.target.value;
                setForm(f => ({ ...f, platform: value }));
                updateSuggestions(titleSearch, value);
              }}
            >
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="mb-3 border border-green-900 bg-black/80">
              {suggestions.map((suggestion, index) => {
                const sourceLabel = suggestion.source === "owned"
                  ? "owned"
                  : suggestion.source === "not-owned"
                    ? "not owned"
                    : "already wishlisted";

                return (
                  <button
                    key={`${suggestion.title}-${suggestion.platform}`}
                    type="button"
                    onClick={() => pickSuggestion(suggestion)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left font-terminal text-sm border-b border-green-950 last:border-b-0 ${
                      activeSuggestion === index ? "bg-green-950/40 text-green-200" : "text-green-400 hover:bg-green-950/20"
                    }`}
                  >
                    <span>{suggestion.title}</span>
                    <span className="text-xs text-zinc-500">
                      {suggestion.platform && suggestion.platform !== 'Unknown'
                        ? `${suggestion.platform} · ${sourceLabel}`
                        : `Platform unknown · ${sourceLabel}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <select
              className={inputCls}
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) as 1|2|3 }))}
            >
              <option value={1}>⭐ Must-Have</option>
              <option value={2}>🎮 Want</option>
              <option value={3}>📦 Someday</option>
            </select>
            <select
              className={inputCls}
              value={form.playerId}
              onChange={e => {
                const value = e.target.value;
                setForm(f => ({ ...f, playerId: value }));
                if (typeof window !== "undefined") localStorage.setItem(WISHLIST_PLAYER_STORAGE_KEY, value);
              }}
            >
              <option value="">No player</option>
              {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
            </select>
            <input
              className={inputCls}
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {(existingInventoryMatch || priceLookup || priceLoading || priceError || saveStatus) && (
            <div className="mb-3 space-y-2">
              {existingInventoryMatch && (
                <div className="border border-yellow-700 bg-yellow-950/20 px-3 py-2 text-yellow-300 font-terminal text-xs">
                  Already in your collection on {existingInventoryMatch.platform}. A found action will add another copy, not a duplicate game row.
                </div>
              )}
              {priceLookup && (
                <div className="border border-blue-800 bg-blue-950/20 px-3 py-2 text-blue-300 font-terminal text-xs space-y-1">
                  <div>
                    💰 Loose ${priceLookup.loose ?? "N/A"} · CIB ${priceLookup.cib ?? "N/A"} · New ${priceLookup.new ?? "N/A"}
                    {getMatchConfidence(priceLookup.confidence) ? ` · ${getMatchConfidence(priceLookup.confidence)}` : ""}
                  </div>
                  {priceLookup.hasVariants && (
                    <div className="inline-block text-amber-300 border border-amber-700 bg-amber-950/40 px-2 py-0.5">
                      ⚠ Variant-sensitive pricing
                    </div>
                  )}
                </div>
              )}
              {priceError && (
                <div className="border border-red-800 bg-red-950/20 px-3 py-2 text-red-300 font-terminal text-xs">
                  {priceError}
                </div>
              )}
              {saveStatus && (
                <div className="border border-green-800 bg-green-950/20 px-3 py-2 text-green-300 font-terminal text-xs">
                  {saveStatus}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => fetchPrice()}
              disabled={priceLoading || !form.title.trim()}
              className={`${btnCls} border-blue-700 text-blue-300 hover:bg-blue-950 disabled:opacity-50`}
            >
              {priceLoading ? "… Fetching Price" : "💰 Fetch Price"}
            </button>
            <button
              onClick={add}
              className={`${btnCls} border-green-500 bg-green-900 hover:bg-green-800 text-green-200`}
            >
              ✓ Add to Wishlist
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className={`${btnCls} border-zinc-700 text-zinc-400 hover:text-red-400`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {hasWishlistTotals && (
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-blue-900 bg-blue-950/20 px-4 py-3">
            <p className="text-zinc-500 font-terminal text-sm uppercase">Wishlist Loose Total</p>
            <p className="text-blue-300 font-terminal text-lg">${wishlistTotals.loose.toFixed(2)}</p>
          </div>
          <div className="border border-blue-900 bg-blue-950/20 px-4 py-3">
            <p className="text-zinc-500 font-terminal text-sm uppercase">Wishlist CIB Total</p>
            <p className="text-blue-300 font-terminal text-lg">${wishlistTotals.cib.toFixed(2)}</p>
          </div>
          <div className="border border-blue-900 bg-blue-950/20 px-4 py-3">
            <p className="text-zinc-500 font-terminal text-sm uppercase">Wishlist New Total</p>
            <p className="text-blue-300 font-terminal text-lg">${wishlistTotals.new.toFixed(2)}</p>
          </div>
          <div className="border border-blue-900 bg-blue-950/20 px-4 py-3">
            <p className="text-zinc-500 font-terminal text-sm uppercase">Wishlist Graded Total</p>
            <p className="text-blue-300 font-terminal text-lg">${wishlistTotals.graded.toFixed(2)}</p>
          </div>
        </div>
      )}

      {players.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <button
            onClick={() => setPlayerFilter("all")}
            className={`px-3 py-1 font-terminal text-sm border transition-colors ${playerFilter === "all" ? "border-green-500 text-green-300 bg-green-950" : "border-zinc-800 text-zinc-500 hover:text-green-400"}`}
          >
            All Players
          </button>
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => setPlayerFilter(player.id)}
              className={`px-3 py-1 font-terminal text-sm border transition-colors ${playerFilter === player.id ? "text-black border-transparent" : getPlayerBadgeStyle(player.id, player.color)}`}
              style={player.color ? { backgroundColor: player.color } : undefined}
            >
              {player.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        {([
          { id: "active", label: `🔍 Wanted (${active})` },
          { id: "found",  label: `✅ Found (${found})` },
          { id: "all",    label: `📋 All (${items.length})` },
        ] as { id: Filter; label: string }[]).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1 font-terminal text-sm border transition-colors ${
              filter === f.id
                ? "border-green-500 text-green-300 bg-green-950"
                : "border-green-900 text-zinc-500 hover:text-green-400"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          className="ml-auto bg-black border border-green-900 text-green-300 font-terminal text-sm px-3 py-1 focus:outline-none focus:border-green-600 w-48"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-green-700 font-terminal animate-pulse">LOADING...</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-600 font-terminal text-center py-16">
          {filter === "active" ? "Wishlist empty — add some games to hunt!" : "Nothing here yet."}
        </div>
      ) : filter === "active" ? (
        // Grouped by priority when showing active
        <div className="space-y-8">
          {grouped.filter(g => g.items.length > 0).map(({ priority, items: groupItems }) => {
            const meta = PRIORITY_META[priority];
            return (
              <div key={priority}>
                <h3 className={`font-terminal text-sm uppercase tracking-wider mb-3 ${meta.color.split(" ")[2]}`}>
                  {meta.label} ({groupItems.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onFound={openFoundPrompt}
                      onFetchPrice={(wishlistItem) => fetchPrice(wishlistItem.title, wishlistItem.platform, wishlistItem.id)}
                      isFetchingPrice={fetchingWishlistIds.includes(item.id)}
                      onUnfound={unmarkFound}
                      onDelete={del}
                      getPriceChartingUrl={buildPriceChartingUrl}
                      getPlayerBadgeStyle={getPlayerBadgeStyle}
                      players={players}
                      onPlayerChange={updateWishlistPlayer}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Flat list for found / all
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedFiltered.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onFound={openFoundPrompt}
              onFetchPrice={(wishlistItem) => fetchPrice(wishlistItem.title, wishlistItem.platform, wishlistItem.id)}
              isFetchingPrice={fetchingWishlistIds.includes(item.id)}
              onUnfound={unmarkFound}
              onDelete={del}
              getPriceChartingUrl={buildPriceChartingUrl}
              getPlayerBadgeStyle={getPlayerBadgeStyle}
              players={players}
              onPlayerChange={updateWishlistPlayer}
            />
          ))}
        </div>
      )}

      {foundPrompt.open && foundPrompt.item && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="w-full max-w-lg border-2 border-green-700 bg-black p-5 shadow-[0_0_20px_rgba(34,197,94,0.25)]">
            <h3 className="text-green-400 font-terminal text-lg mb-2">FOUND IT?</h3>
            <p className="text-zinc-400 font-terminal text-sm mb-4">
              {foundPrompt.item.title} on {foundPrompt.item.platform} will be marked found and added to your collection.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                className={inputCls}
                placeholder="Price paid"
                value={foundPrompt.pricePaid}
                onChange={e => setFoundPrompt(current => ({ ...current, pricePaid: e.target.value }))}
              />
              <select
                className={inputCls}
                value={foundPrompt.condition}
                onChange={e => setFoundPrompt(current => ({ ...current, condition: e.target.value as CopyCondition }))}
              >
                <option value="Loose">Loose</option>
                <option value="CIB">CIB</option>
                <option value="New/Sealed">New/Sealed</option>
                <option value="Good">Good</option>
              </select>
            </div>
            <input
              className={`${inputCls} mb-3`}
              placeholder="Notes (optional)"
              value={foundPrompt.notes}
              onChange={e => setFoundPrompt(current => ({ ...current, notes: e.target.value }))}
            />
            {foundPrompt.error && (
              <div className="mb-3 border border-red-800 bg-red-950/20 px-3 py-2 text-red-300 font-terminal text-xs">
                {foundPrompt.error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={confirmFound}
                disabled={foundPrompt.saving}
                className={`${btnCls} border-green-500 bg-green-900 hover:bg-green-800 text-green-200 disabled:opacity-50`}
              >
                {foundPrompt.saving ? "Saving..." : "✓ Add to Collection"}
              </button>
              <button
                onClick={closeFoundPrompt}
                className={`${btnCls} border-zinc-700 text-zinc-400 hover:text-red-400`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  onFound,
  onFetchPrice,
  isFetchingPrice,
  onUnfound,
  onDelete,
  getPriceChartingUrl,
  getPlayerBadgeStyle,
  players,
  onPlayerChange,
}: {
  item: WishlistItem;
  onFound: (item: WishlistItem) => void;
  onFetchPrice: (item: WishlistItem) => void;
  isFetchingPrice: boolean;
  onUnfound: (id: string) => void;
  onDelete: (id: string) => void;
  getPriceChartingUrl: (title: string, platform: string) => string;
  getPlayerBadgeStyle: (playerId?: string | null, playerColor?: string | null) => string;
  players: PlayerOption[];
  onPlayerChange: (id: string, playerId: string) => void;
}) {
  const meta  = PRIORITY_META[item.priority];
  const found = !!item.foundAt;
  const playerAccent = item.player?.color || null;

  return (
    <div
      className={`border p-3 relative group overflow-hidden ${found ? "opacity-60" : meta.color}`}
      style={{
        borderColor: playerAccent || undefined,
        boxShadow: playerAccent ? `0 0 0 1px ${playerAccent}, inset 0 0 0 1px ${playerAccent}22` : undefined,
      }}
    >
      {playerAccent && (
        <div
          className="absolute inset-y-0 left-0 w-1 pointer-events-none"
          style={{ backgroundColor: playerAccent }}
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-terminal text-base font-bold truncate ${found ? "line-through text-zinc-500" : ""}`}>
            {item.title}
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className={`inline-block text-sm px-2 py-0.5 font-terminal ${meta.badge}`}>
              {item.platform}
            </span>
            {item.player && (
              <span
                className={`inline-block text-sm px-2 py-0.5 font-terminal border ${getPlayerBadgeStyle(item.playerId, item.player.color)}`}
                style={item.player.color ? { backgroundColor: item.player.color } : undefined}
              >
                👤 {item.player.name}
              </span>
            )}
          </div>
          {item.notes && (
            <p className="text-zinc-500 font-terminal text-sm mt-1 truncate">{item.notes}</p>
          )}
          {(item.marketLoose != null || item.marketCib != null || item.marketNew != null) && (
            <div className="mt-2 text-xs font-terminal text-blue-300 space-y-1">
              <p>💰 Loose ${item.marketLoose != null ? Number(item.marketLoose).toFixed(2) : 'N/A'}</p>
              <p>📦 CIB ${item.marketCib != null ? Number(item.marketCib).toFixed(2) : 'N/A'} · New ${item.marketNew != null ? Number(item.marketNew).toFixed(2) : 'N/A'}</p>
              {item.lastFetched && <p className="text-zinc-500">Updated {new Date(item.lastFetched).toLocaleString()}</p>}
            </div>
          )}
          {item.hasVariants && (
            <div className="mt-1 inline-block text-xs font-terminal border border-amber-700 bg-amber-950/40 text-amber-300 px-2 py-0.5">
              ⚠ Variants affect price
            </div>
          )}
          {found && item.foundAt && (
            <p className="text-green-600 font-terminal text-sm mt-1">
              ✅ Found {new Date(item.foundAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="text-zinc-700 hover:text-red-500 font-terminal text-sm opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
          title="Remove"
        >✕</button>
      </div>
      <div className="mt-2 flex gap-2 flex-wrap items-center">
        <button
          onClick={() => onFetchPrice(item)}
          disabled={isFetchingPrice}
          className="text-blue-400 hover:text-blue-200 font-terminal text-sm border border-blue-900 hover:border-blue-500 px-2 py-0.5 transition-colors disabled:opacity-50"
        >
          {isFetchingPrice ? '… Fetching' : '💰 Fetch Price'}
        </button>
        <Link
          href={getPriceChartingUrl(item.title, item.platform)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-200 font-terminal text-sm border border-purple-900 hover:border-purple-500 px-2 py-0.5 transition-colors"
        >
          ↗ PriceCharting
        </Link>
        <select
          value={item.playerId || ""}
          onChange={(e) => onPlayerChange(item.id, e.target.value)}
          className="bg-black border border-purple-900 text-purple-300 font-terminal text-sm px-2 py-0.5 focus:outline-none focus:border-purple-500"
          title="Choose which player wants this game"
        >
          <option value="">No player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>
        {found ? (
          <button
            onClick={() => onUnfound(item.id)}
            className="text-zinc-500 hover:text-yellow-400 font-terminal text-sm border border-zinc-800 hover:border-yellow-700 px-2 py-0.5 transition-colors"
          >
            ↩ Unmark
          </button>
        ) : (
          <button
            onClick={() => onFound(item)}
            className="text-green-500 hover:text-green-300 font-terminal text-sm border border-green-800 hover:border-green-500 px-2 py-0.5 transition-colors"
          >
            ✓ Found It!
          </button>
        )}
      </div>
    </div>
  );
}
