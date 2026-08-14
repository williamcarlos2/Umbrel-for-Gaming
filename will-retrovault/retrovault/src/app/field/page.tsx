"use client";

import { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from 'react';
import { unlockAchievement } from "@/lib/achievementUnlocks";
import { ALL_PLATFORMS, RETRO_DEFAULTS } from "@/data/platformGroups";
import {
  buildFieldCache, readFieldCache, clearFieldCache, searchFieldCache,
  type FieldCacheData, type CachedGame,
} from "@/lib/fieldCache";
import {
  CONDITION_OPTIONS,
  type CopyCondition,
  findInventoryMatch,
  buildFieldCopy,
  buildAcquisitionEntry,
  getWatchlistTargetPresets,
  getFieldEmptyState,
  getMatchConfidence,
} from "@/lib/fieldMode";
import { addPurchaseToActiveConventionSession } from "@/lib/conventionSession";

type PriceVariantMatch = {
  title: string;
  platform: string;
  loose: string | null;
  cib: string | null;
  new: string | null;
  graded: string | null;
};

type PriceResult = {
  title: string;
  platform: string;
  loose: string | null;
  cib: string | null;
  newPrice: string | null;
  source: "inventory" | "pricecharting";
  owned: number;
  paidTotal: number;   // sum of priceAcquired across all copies
  paidEach: number[];  // per-copy cost for multi-copy display
  conditions: string[]; // condition label per copy (Loose, CIB, etc.)
  watchlisted: boolean;
  watchlistPrice?: string;
  id?: string;
  // Stale/cached price info
  stale?: boolean;       // true if price is from cached inventory data, not a live scrape
  lastFetched?: string;  // ISO date of last successful scrape
  // Wishlist metadata (from offline cache)
  wishlistPriority?: number | null;
  wishlistNotes?: string | null;
  wishlistPlayers?: { id: string; name: string; color?: string | null }[];
  // Variant pricing
  hasVariants?: boolean;
  variantMatches?: PriceVariantMatch[];
};

type OwnedItem = {
  id: string;
  title: string;
  platform: string;
  copies: { id: string; priceAcquired?: number | string; condition?: string }[];
  marketLoose?: string;
  marketCib?: string;
  marketNew?: string;
  lastFetched?: string;
};

type WatchlistItem = {
  id: string;
  title: string;
  platform: string;
  alertPrice: string;
};

type PlayerOption = {
  id: string;
  name: string;
  color?: string | null;
};

type WishlistItem = {
  id: string;
  title: string;
  platform: string;
  playerId?: string | null;
  player?: { id: string; name: string; color?: string | null } | null;
  notes?: string | null;
  priority?: number | null;
};


type PlatformSyncPayload = {
  config?: { platforms?: string[] };
  sync?: {
    populated?: { added?: number };
    catalogFound?: boolean;
  } | null;
};

type PlatformEnableResult = {
  changed: boolean;
  sync: PlatformSyncPayload['sync'];
};

const getErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);


const getPopulatedAdded = (sync: PlatformSyncPayload['sync']): number => sync?.populated?.added || 0;

const getPlatformMessage = (syncResult: PlatformEnableResult, platformName: string, prefix: string): string => {
  if (!syncResult.changed) return '';
  const added = getPopulatedAdded(syncResult.sync);
  if (added > 0) {
    return `${prefix} enabled ${platformName}, ${prefix.trim() === 'and' ? 'adding' : 'and added'} ${added.toLocaleString()} catalog game${added === 1 ? '' : 's'}`;
  }
  return `${prefix}${prefix ? ' ' : ''}enabled ${platformName}${syncResult.sync?.catalogFound === false ? ' (catalog sync unavailable for this system yet)' : ''}`;
};

const MARGIN_THRESHOLD = 30; // % profit margin to recommend BUY

function getDecision(askPrice: number, loosePrice: number | null, ownedCount: number, watchlisted: boolean): {
  verdict: "BUY" | "PASS" | "NEGOTIATE" | "ALREADY OWNED";
  color: string;
  reason: string;
} {
  if (ownedCount >= 2) return { verdict: "ALREADY OWNED", color: "text-orange-400", reason: `You own ${ownedCount} copies. Sell one first.` };
  if (!loosePrice) return { verdict: "NEGOTIATE", color: "text-yellow-400", reason: "No price data. Trust your gut." };

  const margin = ((loosePrice - askPrice) / askPrice) * 100;

  if (watchlisted) return { verdict: "BUY", color: "text-emerald-400", reason: `On your watchlist! Market: $${loosePrice.toFixed(2)}` };
  if (margin >= MARGIN_THRESHOLD) return { verdict: "BUY", color: "text-emerald-400", reason: `${margin.toFixed(0)}% margin. Good deal.` };
  if (margin >= 10) return { verdict: "NEGOTIATE", color: "text-yellow-400", reason: `Thin margin (${margin.toFixed(0)}%). Try to haggle.` };
  if (margin >= 0) return { verdict: "PASS", color: "text-red-400", reason: `Only ${margin.toFixed(0)}% margin. Not worth it.` };
  return { verdict: "PASS", color: "text-red-400", reason: `Overpriced by ${Math.abs(margin).toFixed(0)}%.` };
}

const MAX_SUGGESTIONS = 8;
const SUGGEST_DEBOUNCE_MS = 150;

const normalizeFieldKey = (title: string, platform: string) => `${title.trim().toLowerCase()}::${platform.trim().toLowerCase()}`;

export default function FieldPage() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [askPrice, setAskPrice] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PriceResult[]>([]);
  const [refreshingPrices, setRefreshingPrices] = useState<string[]>([]);
  const [inventory, setInventory] = useState<OwnedItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  // Pre-seeded with all known platforms so the select works before inventory loads
  const [platforms, setPlatforms] = useState<string[]>(ALL_PLATFORMS);
  // Offline cache state
  const [fieldCache,    setFieldCache]    = useState<FieldCacheData | null>(null);
  const [cacheMeta,     setCacheMeta]     = useState<{ cachedAt: string; count: number } | null>(null);
  const [caching,       setCaching]       = useState(false);
  const [cacheProgress, setCacheProgress] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>(RETRO_DEFAULTS);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [wishlistPlayerId, setWishlistPlayerId] = useState('');
  const [fieldCondition, setFieldCondition] = useState<CopyCondition>("Loose");
  const [purchaseQuantity, setPurchaseQuantity] = useState("1");
  const [lastSearchIssue, setLastSearchIssue] = useState<{ isOffline: boolean; hadTimeout: boolean } | null>(null);
  const [needsCacheRefresh, setNeedsCacheRefresh] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; platform: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [fieldAchievementFired, setFieldAchievementFired] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrCandidates, setOcrCandidates] = useState<{ title: string; platform: string; confidence: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep catalog in a ref — filtering never triggers re-renders
  const catalogRef = useRef<{ title: string; platform: string }[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
    // Load inventory and watchlist for dupe detection + watchlist check
    fetch("/api/inventory").then(r => r.json()).then((d: OwnedItem[]) => {
      setInventory(d);
      // Owned platforms first, then the rest of the known catalog
      const owned = Array.from(new Set(d.map((i: OwnedItem) => i.platform))).sort() as string[];
      const rest = ALL_PLATFORMS.filter(p => !owned.includes(p));
      setPlatforms([...owned, ...rest]);
      // Store lightweight catalog copy in ref for suggestion filtering
      catalogRef.current = d.map(i => ({ title: i.title, platform: i.platform }));
    }).catch(() => {});
    fetch("/api/sales?type=watchlist").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setWatchlist(d);
    }).catch(() => {});
    fetch('/api/config').then(r => r.json()).then(cfg => {
      if (Array.isArray(cfg?.platforms) && cfg.platforms.length > 0) setEnabledPlatforms(cfg.platforms);
    }).catch(() => {});
    fetch('/api/favorites').then(r => r.json()).then(data => {
      const nextPlayers = Array.isArray(data?.people) ? data.people : [];
      setPlayers(nextPlayers);
      setWishlistPlayerId((current) => current || nextPlayers[0]?.id || '');
    }).catch(() => {});
    fetch('/api/wishlist').then(r => r.json()).then(data => {
      const nextWishlist = Array.isArray(data?.items) ? data.items : [];
      setWishlistItems(nextWishlist);
      const merged = new Map(catalogRef.current.map((item) => [normalizeFieldKey(item.title, item.platform), item]));
      nextWishlist.forEach((item: WishlistItem) => {
        merged.set(normalizeFieldKey(item.title, item.platform), { title: item.title, platform: item.platform });
      });
      catalogRef.current = Array.from(merged.values());
    }).catch(() => {});
    // Load offline cache metadata on mount
    readFieldCache().then(cache => {
      if (cache) {
        setFieldCache(cache);
        setCacheMeta({ cachedAt: cache.cachedAt, count: cache.games.length });
        // Also populate catalog from cache so autocomplete works offline
        if (catalogRef.current.length === 0) {
          catalogRef.current = cache.games.map(g => ({ title: g.title, platform: g.platform }));
        }
      }
    }).catch(() => {});
  }, []);

  // Debounced suggestion filtering — pure client-side, no network
  // Convert a cached game to PriceResult for display
  const cachedToResult = (g: CachedGame, offline: boolean): PriceResult => ({
    title:        g.title,
    platform:     g.platform,
    loose:        g.marketLoose  != null ? String(g.marketLoose)  : null,
    cib:          g.marketCib    != null ? String(g.marketCib)    : null,
    newPrice:     g.marketNew    != null ? String(g.marketNew)    : null,
    source:       'inventory',
    owned:        g.owned,
    paidTotal:    g.paidTotal,
    paidEach:     g.paidEach,
    conditions:   g.conditions,
    watchlisted:  g.onWatchlist,
    watchlistPrice: g.watchlistPrice != null ? String(g.watchlistPrice) : undefined,
    stale:        offline,
    lastFetched:  g.lastFetched ?? undefined,
    // Wishlist info passed via notes field for display
    ...(g.onWishlist ? { wishlistPriority: g.wishlistPriority, wishlistNotes: g.wishlistNotes } : {}),
  });

  // Build the offline cache — triggered by the Cache button
  const handleBuildCache = async () => {
    setCaching(true);
    setCacheProgress('Starting...');
    try {
      const { count, sizeKb } = await buildFieldCache((step) => setCacheProgress(step));
      const cache = await readFieldCache();
      setFieldCache(cache);
      setCacheMeta(cache ? { cachedAt: cache.cachedAt, count } : null);
      setCacheProgress(`✓ ${count} games cached (${sizeKb}KB)`);
      if (cache) catalogRef.current = cache.games.map(g => ({ title: g.title, platform: g.platform }));
    } catch (e: unknown) {
      setCacheProgress(`Error: ${getErrorMessage(e, 'Could not build field cache')}`);
    } finally {
      setCaching(false);
    }
  };

  const handleClearCache = async () => {
    await clearFieldCache();
    setFieldCache(null);
    setCacheMeta(null);
    setCacheProgress('');
  };

  const updateSuggestions = (q: string, plat: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(() => {
      const lower = q.toLowerCase();
      const catalog = catalogRef.current;
      const platFilter = plat !== 'all';
      // Prefer: starts-with matches first, then contains
      const startsWith = catalog.filter(i =>
        i.title.toLowerCase().startsWith(lower) &&
        (!platFilter || i.platform === plat)
      );
      const contains = catalog.filter(i =>
        !i.title.toLowerCase().startsWith(lower) &&
        i.title.toLowerCase().includes(lower) &&
        (!platFilter || i.platform === plat)
      );
      const merged = [...startsWith, ...contains].slice(0, MAX_SUGGESTIONS);
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
      setActiveSuggestion(-1);
    }, SUGGEST_DEBOUNCE_MS);
  };

  const pickSuggestion = (s: { title: string; platform: string }) => {
    setQuery(s.title);
    if (s.platform) setPlatform(s.platform);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    // Call with explicit values to avoid stale closure on query/platform state
    doSearch(s.title, s.platform || platform);
  };

  // Main search — accepts explicit title+platform so pickSuggestion can pass values
  // without depending on possibly-stale state closures
  const doSearch = async (titleQ: string, plat: string, preserveResults = false) => {
    if (!titleQ.trim()) return;
    setShowSuggestions(false);
    setSuggestions([]);
    setSearching(true);
    if (!preserveResults) setResults([]);
    setLastSearchIssue(null);

    const q = titleQ.toLowerCase();
    const platFilter = plat !== "all";

    // ── Offline-first: if we have a field cache and appear to be offline, use it immediately ──
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline && fieldCache) {
      const cached = searchFieldCache(fieldCache, titleQ, plat);
      if (cached.length > 0) {
        setResults(cached.map(g => cachedToResult(g, true)));
      } else {
        setLastSearchIssue({ isOffline: true, hadTimeout: false });
      }
      setSearching(false);
      return;
    }

    // Check own inventory first (instant, no network)
    const owned = inventory.filter(i =>
      i.title.toLowerCase().includes(q) &&
      (!platFilter || i.platform === plat)
    );

    if (owned.length > 0) {
      const fromInventory: PriceResult[] = owned.slice(0, 5).map(i => {
        const copies = i.copies || [];
        const paidEach = copies.map(c => parseFloat(String(c.priceAcquired || 0)) || 0);
        const paidTotal = paidEach.reduce((s, v) => s + v, 0);
        const conditions = copies.map(c => c.condition || 'Loose');
        return {
          title: i.title, platform: i.platform,
          loose: i.marketLoose || null, cib: i.marketCib || null, newPrice: i.marketNew || null,
          source: "inventory" as const,
          owned: copies.length, paidTotal, paidEach, conditions,
          watchlisted: watchlist.some(w => w.id === i.id),
          watchlistPrice: watchlist.find(w => w.id === i.id)?.alertPrice,
        };
      });
      setResults(fromInventory);
      setSearching(false);
      void Promise.all(fromInventory.map((item) => refreshResultPrice(item.title, item.platform)));
      return;
    }

    // Fall back to PriceCharting with 9s client-side timeout (server adds its own 8s)
    try {
      const platParam = platFilter ? plat : "";
      const controller = new AbortController();
      const clientTimeout = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(
        `/api/pricecharting?title=${encodeURIComponent(titleQ)}&platform=${encodeURIComponent(platParam)}`,
        { signal: controller.signal }
      );
      clearTimeout(clientTimeout);

      // Handle timeout (408) or network error
      if (res.status === 408 || !res.ok) {
        // Try to show cached price from inventory catalog for this title
        const cached = inventory.find(i =>
          i.title.toLowerCase().includes(q) && (!platFilter || i.platform === plat)
        );
        if (cached && (cached.marketLoose || cached.marketCib)) {
          setResults([{
            title: cached.title,
            platform: cached.platform,
            loose: cached.marketLoose || null,
            cib: cached.marketCib || null,
            newPrice: cached.marketNew || null,
            source: "inventory",
            owned: (cached.copies || []).length,
            paidTotal: 0, paidEach: [], conditions: [],
            watchlisted: watchlist.some(w => w.id === cached.id),
            stale: true,
            lastFetched: cached.lastFetched,
          }]);
        }
        // else: no result, leave results empty
        setLastSearchIssue({ isOffline: false, hadTimeout: res.status === 408 });
        setSearching(false);
        return;
      }

      const d = await res.json();
      if (d && d.title) {
        setResults([{
          title: d.title,
          platform: d.platform || (plat !== 'all' ? plat : '') || "Unknown",
          loose: d.loose || null, cib: d.cib || null, newPrice: d.new || null,
          source: "pricecharting",
          owned: 0, paidTotal: 0, paidEach: [], conditions: [],
          watchlisted: false,
          wishlistNotes: getMatchConfidence(d.confidence) || undefined,
          hasVariants: !!d.hasVariants,
          variantMatches: Array.isArray(d.variantMatches) ? d.variantMatches : [],
        }]);
        void refreshResultPrice(d.title, d.platform || (plat !== 'all' ? plat : '') || "");
        if (!fieldAchievementFired) {
          setFieldAchievementFired(true);
          void unlockAchievement('a_field');
        }
      } else {
        setLastSearchIssue({ isOffline: false, hadTimeout: false });
      }
    } catch (e: unknown) {
      // AbortError = client-side timeout — try field cache first, then inventory
      if (e instanceof Error && e.name === 'AbortError') {
        if (fieldCache) {
          const cachedResults = searchFieldCache(fieldCache, titleQ, plat);
          if (cachedResults.length > 0) {
            setResults(cachedResults.map(g => cachedToResult(g, true)));
            setSearching(false);
            return;
          }
        }
        // Fallback: inventory state
        const cached = inventory.find(i =>
          i.title.toLowerCase().includes(q) && (!platFilter || i.platform === plat)
        );
        if (cached && (cached.marketLoose || cached.marketCib)) {
          setResults([{
            title: cached.title, platform: cached.platform,
            loose: cached.marketLoose || null, cib: cached.marketCib || null,
            newPrice: cached.marketNew || null,
            source: 'inventory',
            owned: (cached.copies || []).length,
            paidTotal: 0, paidEach: [], conditions: [],
            watchlisted: watchlist.some(w => w.id === cached.id),
            stale: true, lastFetched: cached.lastFetched,
          }]);
        } else {
          setLastSearchIssue({ isOffline: false, hadTimeout: true });
        }
      }
    }
    setSearching(false);
  };

  const search = () => doSearch(query, platform);

  const refreshResultPrice = async (titleQ: string, plat: string) => {
    const key = `${titleQ}::${plat || 'all'}`;
    setRefreshingPrices((current) => current.includes(key) ? current : [...current, key]);
    try {
      const platParam = plat !== 'all' ? plat : '';
      const res = await fetch(`/api/pricecharting?title=${encodeURIComponent(titleQ)}&platform=${encodeURIComponent(platParam)}`);
      const d = await res.json();
      if (!res.ok || !d || !d.title) return;
      setResults((current) => current.map((item) => {
        const sameTitle = item.title.toLowerCase() === titleQ.toLowerCase();
        const samePlatform = (platParam ? item.platform === platParam : true) || item.platform === (d.platform || item.platform);
        if (!sameTitle || !samePlatform) return item;
        return {
          ...item,
          title: d.title,
          platform: d.platform || item.platform,
          loose: d.loose || null,
          cib: d.cib || null,
          newPrice: d.new || null,
          source: 'pricecharting',
          stale: false,
          hasVariants: !!d.hasVariants,
          variantMatches: Array.isArray(d.variantMatches) ? d.variantMatches : [],
        };
      }));
    } catch {}
    finally {
      setRefreshingPrices((current) => current.filter((entry) => entry !== key));
    }
  };

  const normalizeMoney = (val: string | null) => {
    if (!val || val === 'N/A') return '';
    const num = parseFloat(val);
    return Number.isFinite(num) ? num.toFixed(2) : '';
  };

  const refreshFieldData = async () => {
    try {
      const [invRes, watchRes, wishlistRes, configRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/sales?type=watchlist'),
        fetch('/api/wishlist'),
        fetch('/api/config').catch(() => null),
      ]);
      const inv = await invRes.json();
      const watch = await watchRes.json();
      const wishlist = await wishlistRes.json().catch(() => ({}));
      const config = configRes ? await configRes.json() : null;
      if (Array.isArray(inv)) {
        setInventory(inv);
        const owned = Array.from(new Set(inv.map((i: OwnedItem) => i.platform))).sort() as string[];
        const rest = ALL_PLATFORMS.filter(p => !owned.includes(p));
        setPlatforms([...owned, ...rest]);
        catalogRef.current = inv.map(i => ({ title: i.title, platform: i.platform }));
      }
      if (Array.isArray(watch)) setWatchlist(watch);
      if (Array.isArray(wishlist?.items)) setWishlistItems(wishlist.items);
      if (Array.isArray(config?.platforms) && config.platforms.length > 0) setEnabledPlatforms(config.platforms);
    } catch {}
  };

  const ensurePlatformEnabled = async (platformName: string) => {
    const cfgRes = await fetch('/api/config');
    const cfg = await cfgRes.json().catch(() => ({}));
    const currentPlatforms: string[] = Array.isArray(cfg?.platforms) && cfg.platforms.length > 0
      ? cfg.platforms
      : enabledPlatforms;

    if (currentPlatforms.includes(platformName)) return { changed: false, sync: null } satisfies PlatformEnableResult;

    const saveRes = await fetch('/api/platforms/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: platformName, enabled: true, autoPopulate: true })
    });
    if (!saveRes.ok) throw new Error(`Could not enable ${platformName}`);
    const payload = await saveRes.json().catch(() => ({})) as PlatformSyncPayload;
    setEnabledPlatforms(payload?.config?.platforms || [...new Set([...currentPlatforms, platformName])]);
    return { changed: true, sync: payload?.sync || null } satisfies PlatformEnableResult;
  };

  const saveToInventory = async (r: PriceResult, copyDetails?: { condition: CopyCondition; priceAcquired: string; quantity?: number }) => {
    const mode = copyDetails ? 'purchase' : 'inventory';
    const key = `${mode}:${r.title}:${r.platform}`;
    setSavingKey(key);
    setSaveStatus('');
    try {
      const platformSync = await ensurePlatformEnabled(r.platform);
      const condition = copyDetails?.condition || fieldCondition;
      const quantity = Math.max(1, Math.floor(copyDetails?.quantity || 1));
      const newCopies = copyDetails
        ? Array.from({ length: quantity }, () => buildFieldCopy(condition, copyDetails.priceAcquired || '0.00'))
        : [];
      const existing = findInventoryMatch(inventory, r.title, r.platform);

      let res: Response;
      let copyAwareMessage = '';

      if (existing) {
        const updatedCopies = newCopies.length > 0 ? [...(existing.copies || []), ...newCopies] : (existing.copies || []);
        res = await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...existing,
            copies: updatedCopies,
            marketLoose: normalizeMoney(r.loose),
            marketCib: normalizeMoney(r.cib),
            marketNew: normalizeMoney(r.newPrice),
            lastFetched: new Date().toISOString(),
          }),
        });
        copyAwareMessage = newCopies.length > 0
          ? ` Added ${quantity} ${quantity === 1 ? 'copy' : 'copies'} to your existing ${r.title} entry.`
          : ` Updated your existing ${r.title} entry instead of creating a duplicate.`;
      } else {
        const payload = {
          title: r.title,
          platform: r.platform,
          isDigital: false,
          copies: newCopies,
          marketLoose: normalizeMoney(r.loose),
          marketCib: normalizeMoney(r.cib),
          marketNew: normalizeMoney(r.newPrice),
          lastFetched: new Date().toISOString(),
        };
        res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        copyAwareMessage = newCopies.length > 0
          ? ` Created a new game entry with ${quantity} owned ${quantity === 1 ? 'copy' : 'copies'}.`
          : ` Created a new game entry in your Vault.`;
      }

      if (!res.ok) throw new Error(copyDetails ? 'Failed to save purchase to inventory' : 'Failed to save to inventory');

      if (copyDetails) {
        for (let i = 0; i < quantity; i += 1) {
          const acqRes = await fetch('/api/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'acquisitions',
              action: 'add',
              item: buildAcquisitionEntry({
                title: r.title,
                platform: r.platform,
                priceAcquired: copyDetails.priceAcquired || '0.00',
                notes: `Field purchase · ${condition}${quantity > 1 ? ` · copy ${i + 1}/${quantity}` : ''}`,
              })
            }),
          });
          if (!acqRes.ok) throw new Error('Saved inventory but failed to log acquisition');
        }
        addPurchaseToActiveConventionSession({
          title: r.title,
          platform: r.platform,
          price: (parseFloat(copyDetails.priceAcquired || '0') || 0) * quantity,
          condition,
          notes: `Field purchase${quantity > 1 ? ` · ${quantity} copies` : ''}`,
          at: 'Field Mode',
          source: 'Convention',
        });

        const matchingWishlistItems = wishlistItems.filter((item) => normalizeFieldKey(item.title, item.platform) === normalizeFieldKey(r.title, r.platform));
        const selectedWishlistItem = matchingWishlistItems.find((item) => (item.playerId || '') === wishlistPlayerId) || null;
        const otherWishlistItems = matchingWishlistItems.filter((item) => item.id !== selectedWishlistItem?.id);
        if (selectedWishlistItem) {
          await fetch(`/api/wishlist/${selectedWishlistItem.id}`, { method: 'DELETE' }).catch(() => {});
        }
        if (!selectedWishlistItem && otherWishlistItems.length > 0) {
          const names = otherWishlistItems.map((item) => item.player?.name || 'another player').join(', ');
          const shouldRemove = typeof window !== 'undefined' ? window.confirm(`This game is on ${names}'s wishlist. Remove it now that you bought it?`) : false;
          if (shouldRemove) {
            await Promise.all(otherWishlistItems.map((item) => fetch(`/api/wishlist/${item.id}`, { method: 'DELETE' }).catch(() => {})));
          }
        }
      }

      const platformMessage = getPlatformMessage(platformSync, r.platform, 'and');
      setSaveStatus(
        `${copyDetails ? '🛒 Bought' : '📦 Added'} ${r.title} (${r.platform})${platformMessage}.${copyAwareMessage}`
      );
      setNeedsCacheRefresh(!!cacheMeta);
      await refreshFieldData();
    } catch (e: unknown) {
      setSaveStatus(`Error: ${getErrorMessage(e, 'Could not save to inventory')}`);
    } finally {
      setSavingKey('');
    }
  };

  const saveToWatchlist = async (r: PriceResult) => {
    const key = `watchlist:${r.title}:${r.platform}`;
    setSavingKey(key);
    setSaveStatus('');
    try {
      const platformSync = await ensurePlatformEnabled(r.platform);
      const targetBuyPrice = normalizeMoney(r.loose) || normalizeMoney(r.cib) || '0.00';
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'watchlist',
          action: 'add',
          item: {
            title: r.title,
            platform: r.platform,
            targetBuyPrice,
            alertPrice: targetBuyPrice,
            notes: 'Added from Field Mode',
          }
        }),
      });
      if (!res.ok) throw new Error('Failed to add to watchlist');
      const platformMessage = getPlatformMessage(platformSync, r.platform, ', and');
      setSaveStatus(`⭐ Added ${r.title} (${r.platform}) to Target Radar${platformMessage}.`);
      setNeedsCacheRefresh(!!cacheMeta);
      await refreshFieldData();
    } catch (e: unknown) {
      setSaveStatus(`Error: ${getErrorMessage(e, 'Could not add to watchlist')}`);
    } finally {
      setSavingKey('');
    }
  };

  const saveToWishlist = async (r: PriceResult) => {
    const key = `wishlist:${r.title}:${r.platform}`;
    setSavingKey(key);
    setSaveStatus('');
    try {
      const matchingWishlistItems = wishlistItems.filter((item) => normalizeFieldKey(item.title, item.platform) === normalizeFieldKey(r.title, r.platform));
      const selectedWishlistItem = matchingWishlistItems.find((item) => (item.playerId || '') === wishlistPlayerId);
      if (selectedWishlistItem) {
        throw new Error(`${selectedWishlistItem.player?.name || 'That player'} already has this on their wishlist`);
      }
      const platformSync = await ensurePlatformEnabled(r.platform);
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: r.title,
          platform: r.platform,
          priority: 2,
          notes: 'Added from Field Mode',
          playerId: wishlistPlayerId || null,
          marketLoose: normalizeMoney(r.loose),
          marketCib: normalizeMoney(r.cib),
          marketNew: normalizeMoney(r.newPrice),
        }),
      });
      if (!res.ok) throw new Error('Failed to add to wishlist');
      const platformMessage = getPlatformMessage(platformSync, r.platform, ', and');
      setSaveStatus(`🎁 Added ${r.title} (${r.platform}) to Wishlist${platformMessage}.`);
      setNeedsCacheRefresh(!!cacheMeta);
      await refreshFieldData();
    } catch (e: unknown) {
      setSaveStatus(`Error: ${getErrorMessage(e, 'Could not add to wishlist')}`);
    } finally {
      setSavingKey('');
    }
  };

  const handlePhotoLookup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setOcrBusy(true);
    setOcrStatus('Scanning cover text...');
    setOcrCandidates([]);

    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/field/identify', { method: 'POST', body: form });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json()
        : { error: await res.text() };
      if (!res.ok) {
        const fallback = typeof data?.error === 'string' && data.error.includes('<')
          ? 'OCR route failed before returning JSON. The server likely threw an HTML error page.'
          : data?.error || 'Could not identify image';
        throw new Error(fallback);
      }

      const nextCandidates = Array.isArray(data?.candidates) ? data.candidates : [];
      setOcrCandidates(nextCandidates);

      if (data?.match?.title) {
        setQuery(data.match.title);
        setPlatform(data.match.platform || 'all');
      }

      if (data?.autoRun && data?.match?.title) {
        setOcrStatus(`📸 Locked on ${data.match.title} (${data.match.platform}) at ${data.confidence}% confidence.`);
        void doSearch(data.match.title, data.match.platform || 'all');
      } else if (data?.match?.title) {
        setOcrStatus(`📸 Low confidence at ${data.confidence}%. I think this is ${data.match.title} (${data.match.platform}). Tap a candidate below or just type it manually.`);
      } else {
        setOcrStatus('📸 Could not confidently identify this one. Type the title manually.');
      }
    } catch (e: unknown) {
      setOcrStatus(`Error: ${getErrorMessage(e, 'Could not identify image')}`);
    } finally {
      setOcrBusy(false);
    }
  };

  const askNum = parseFloat(askPrice);
  const hasAsk = !isNaN(askNum) && askNum > 0;

  return (
    <div className="min-h-screen bg-black p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="font-terminal text-3xl text-green-400 uppercase tracking-widest mb-1">🔦 Field Mode</h1>
        <p className="text-zinc-600 font-terminal text-sm">Quick price check · Dupe alert · Should I buy?</p>
      </div>

      {/* Offline Cache Panel */}
      <div className="mb-5 border border-zinc-800 bg-zinc-950 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            {cacheMeta ? (
              <div className="font-terminal text-xs">
                <span className="text-green-600">📦 Offline cache ready</span>
                <span className="text-zinc-600 ml-2">
                  {cacheMeta.count} games · cached {new Date(cacheMeta.cachedAt).toLocaleDateString()} {new Date(cacheMeta.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ) : (
              <div className="font-terminal text-xs text-zinc-600">
                No offline cache — tap Cache before entering the show
              </div>
            )}
            {cacheProgress && (
              <div className="font-terminal text-xs text-yellow-600 mt-1">{cacheProgress}</div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleBuildCache}
              disabled={caching}
              className="px-3 py-1.5 font-terminal text-xs border border-green-700 text-green-400 hover:bg-green-950 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {caching ? '⏳ Caching...' : '📥 Cache for Offline'}
            </button>
            {cacheMeta && (
              <button
                onClick={handleClearCache}
                className="px-3 py-1.5 font-terminal text-xs border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-800 transition-colors"
                title="Clear offline cache"
              >
                × Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <input ref={inputRef} type="text" value={query}
            onChange={e => { setQuery(e.target.value); updateSuggestions(e.target.value, platform); }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveSuggestion(a => Math.min(a + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestion(a => Math.max(a - 1, -1));
              } else if (e.key === "Enter") {
                if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
                  pickSuggestion(suggestions[activeSuggestion]);
                } else {
                  search();
                }
              } else if (e.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="GAME TITLE..."
            className="w-full bg-zinc-950 border-2 border-green-800 text-green-300 font-terminal text-2xl p-4 uppercase focus:outline-none focus:border-green-500 placeholder-green-900"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestRef}
              className="absolute z-50 w-full bg-zinc-950 border-2 border-green-700 shadow-[0_4px_20px_rgba(34,197,94,0.2)] max-h-64 overflow-y-auto">
              <div className="sticky top-0 z-10 bg-zinc-950 border-b border-green-900 p-2 sm:hidden">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowSuggestions(false);
                    search();
                  }}
                  disabled={searching || !query.trim()}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 text-black font-terminal text-lg font-bold border border-green-400 disabled:opacity-40 transition-colors"
                >
                  {searching ? '...' : `SEARCH "${query.trim()}"`}
                </button>
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={`${s.title}-${s.platform}`}
                  onPointerDown={e => { e.preventDefault(); pickSuggestion(s); }}
                  className={`w-full text-left px-4 py-3 font-terminal flex items-center justify-between gap-3 border-b border-zinc-900 transition-colors ${
                    i === activeSuggestion
                      ? 'bg-green-900/40 text-green-200'
                      : 'text-green-400 hover:bg-zinc-900'
                  }`}
                >
                  <span className="truncate uppercase text-sm">{s.title}</span>
                  <span className="text-zinc-600 text-xs shrink-0">{s.platform}</span>
                </button>
              ))}
              <div className="px-4 py-2 text-zinc-700 font-terminal text-xs border-t border-zinc-900">
                ↑↓ navigate · Enter select · Esc close · or keep typing to free-search
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <select value={platform} onChange={e => { setPlatform(e.target.value); updateSuggestions(query, e.target.value); }}
            className="flex-1 bg-zinc-950 border-2 border-green-900 text-green-400 font-terminal text-xl p-3 focus:outline-none cursor-pointer">
            <option value="all">ALL PLATFORMS</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={search} disabled={searching || !query.trim()}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-black font-terminal text-xl font-bold border-2 border-green-400 disabled:opacity-40 transition-colors">
            {searching ? "..." : "SEARCH"}
          </button>
        </div>

        <div className="border border-cyan-900 bg-cyan-950/20 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-terminal text-sm text-cyan-300">📸 Photo Lookup</div>
              <div className="font-terminal text-xs text-zinc-500">Snap a game photo, run it through Google Vision OCR, then drop into the normal Field Mode flow.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="px-3 py-2 font-terminal text-xs border border-cyan-800 text-cyan-300 hover:bg-cyan-950/30 transition-colors cursor-pointer">
                {ocrBusy ? '⏳ Scanning...' : '📷 Take Photo'}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoLookup} disabled={ocrBusy} />
              </label>
              <label className="px-3 py-2 font-terminal text-xs border border-cyan-800 text-cyan-300 hover:bg-cyan-950/30 transition-colors cursor-pointer">
                {ocrBusy ? '⏳ Scanning...' : '🖼️ Choose Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoLookup} disabled={ocrBusy} />
              </label>
            </div>
          </div>
          {ocrStatus && <div className="font-terminal text-xs text-cyan-200">{ocrStatus}</div>}
          {!ocrBusy && ocrCandidates.length > 0 && (
            <div className="font-terminal text-xs text-zinc-500">
              Under 70% confidence, Photo Lookup will wait for your confirmation instead of auto-running.
            </div>
          )}
          {ocrCandidates.length > 0 && (
            <div className="space-y-2">
              <div className="font-terminal text-xs text-zinc-400">Top guesses — tap to search, or just type the title above:</div>
              <div className="flex flex-wrap gap-2">
                {ocrCandidates.map((candidate) => (
                  <button
                    key={`${candidate.title}:${candidate.platform}`}
                    onClick={() => {
                      setQuery(candidate.title);
                      setPlatform(candidate.platform || 'all');
                      void doSearch(candidate.title, candidate.platform || 'all');
                    }}
                    className="px-3 py-2 font-terminal text-xs border border-cyan-800 text-cyan-300 hover:bg-cyan-950/30 transition-colors"
                  >
                    {candidate.title} · {candidate.platform} · {Math.round(candidate.confidence * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ask Price */}
        <div className="flex gap-2 items-center">
          <span className="text-zinc-500 font-terminal text-sm uppercase">Their Ask:</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-terminal text-xl">$</span>
            <input type="number" min="0" step="0.50" value={askPrice}
              onChange={e => setAskPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-950 border-2 border-yellow-900 text-yellow-300 font-terminal text-2xl pl-8 p-3 focus:outline-none focus:border-yellow-500"
            />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-zinc-500 font-terminal text-sm uppercase">Condition:</span>
          <select value={fieldCondition} onChange={e => setFieldCondition(e.target.value as CopyCondition)}
            className="flex-1 bg-zinc-950 border-2 border-blue-900 text-blue-300 font-terminal text-lg p-3 focus:outline-none cursor-pointer">
            {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {saveStatus && (
        <div className="mb-4 border border-cyan-800 bg-cyan-950/20 px-4 py-3 font-terminal text-sm text-cyan-300">
          {saveStatus}
        </div>
      )}

      {needsCacheRefresh && (
        <div className="mb-4 border border-amber-800 bg-amber-950/20 px-4 py-3 font-terminal text-sm text-amber-300">
          📦 Your offline cache is now stale. Rebuild it before going offline again.
          <button
            onClick={async () => {
              await handleBuildCache();
              setNeedsCacheRefresh(false);
            }}
            className="ml-3 px-3 py-1 font-terminal text-xs border border-amber-700 text-amber-300 hover:bg-amber-950/40 transition-colors"
          >
            Refresh Cache Now
          </button>
        </div>
      )}

      {players.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-zinc-500 font-terminal text-sm uppercase">Wishlist Player:</span>
          <select
            value={wishlistPlayerId}
            onChange={e => setWishlistPlayerId(e.target.value)}
            className="flex-1 bg-zinc-950 border-2 border-pink-900 text-pink-300 font-terminal text-lg p-3 focus:outline-none cursor-pointer"
          >
            <option value="">No player</option>
            {players.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && results.map((r, i) => {
        const looseNum = r.loose ? parseFloat(r.loose) : null;
        const decision = hasAsk ? getDecision(askNum, looseNum, r.owned, r.watchlisted) : null;
        const refreshKey = `${r.title}::${r.platform}`;
        const isRefreshingPrice = refreshingPrices.includes(refreshKey);
        const matchingWishlistItems = wishlistItems.filter((item) => normalizeFieldKey(item.title, item.platform) === normalizeFieldKey(r.title, r.platform));
        const selectedWishlistItem = matchingWishlistItems.find((item) => (item.playerId || '') === wishlistPlayerId) || null;
        const otherWishlistItems = matchingWishlistItems.filter((item) => (item.playerId || '') !== wishlistPlayerId);

        return (
          <div key={i} className={`bg-zinc-950 border-2 mb-4 p-5 space-y-4 ${
            decision?.verdict === "BUY" ? "border-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.2)]" :
            decision?.verdict === "PASS" ? "border-red-900" :
            decision?.verdict === "ALREADY OWNED" ? "border-orange-700" :
            "border-green-900"
          }`}>
            {/* Title + platform */}
            <div>
              <h2 className="text-green-300 font-terminal text-2xl uppercase leading-tight">{r.title}</h2>
              <p className="text-zinc-500 font-terminal text-sm">{r.platform} · {r.owned > 0 ? `📦 Owned${r.owned > 1 ? ` (${r.owned} copies)` : ''}` : '⭕ Not owned'}</p>
            </div>

            {/* Dupe alert + what you paid */}
            {r.owned > 0 && (
              <div className={`border px-4 py-2 font-terminal ${r.owned >= 2 ? "border-orange-700 bg-orange-950/30 text-orange-400" : "border-blue-800 bg-blue-950/20 text-blue-400"}`}>
                <div className="text-xl mb-1">
                  {r.owned >= 2
                    ? `⚠️ DUPE ALERT — you own ${r.owned} copies (${r.conditions.join(' + ')})!`
                    : `ℹ️ You own 1 ${r.conditions[0] ?? 'Loose'} copy`
                  }
                </div>
                {r.paidTotal > 0 && (
                  <div className="text-sm text-zinc-400 font-terminal">
                    {r.owned === 1
                      ? `Paid: $${r.paidTotal.toFixed(2)}`
                      : `Paid: ${r.paidEach.map((p, i) => `Copy ${i + 1}: $${p.toFixed(2)}`).join(" · ")} (total $${r.paidTotal.toFixed(2)})`
                    }
                    {r.loose && r.paidTotal > 0 && (() => {
                      const mkt = parseFloat(r.loose);
                      const gain = mkt - (r.paidTotal / r.owned);
                      const gainPct = ((gain / (r.paidTotal / r.owned)) * 100);
                      return gain !== 0 ? (
                        <span className={`ml-2 ${gain > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ({gain > 0 ? '+' : ''}${gain.toFixed(2)} · {gainPct > 0 ? '+' : ''}{gainPct.toFixed(0)}% vs market)
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Watchlist */}
            {r.watchlisted && (
              <div className="border border-yellow-700 bg-yellow-950/20 px-4 py-2 font-terminal text-xl text-yellow-400">
                ⭐ ON YOUR WATCHLIST{r.watchlistPrice ? ` — alert at $${r.watchlistPrice}` : ""}
              </div>
            )}

            {/* Variant pricing alert */}
            {r.hasVariants && (
              <div className="border border-amber-700 bg-amber-950/20 px-4 py-2 font-terminal text-sm text-amber-300">
                <div className="text-base font-bold">⚠ Variant-sensitive pricing</div>
              </div>
            )}

            {/* Wishlist badge */}
            {r.wishlistPriority != null && (
              <div className="border border-pink-800 bg-pink-950/20 px-4 py-2 font-terminal text-xl text-pink-400">
                🎁 ON YOUR WISHLIST
                {r.wishlistPriority === 1 && <span className="ml-2 text-yellow-400 text-sm">⭐ Must-Have</span>}
                {r.wishlistPriority === 2 && <span className="ml-2 text-green-500 text-sm">🎮 Want</span>}
                {r.wishlistPriority === 3 && <span className="ml-2 text-zinc-500 text-sm">📦 Someday</span>}
                {r.wishlistNotes && <p className="text-xs text-zinc-500 mt-0.5">{r.wishlistNotes}</p>}
              </div>
            )}

            {/* Stale price warning */}
            {r.stale && (
              <div className="border border-yellow-800 bg-yellow-950/20 px-3 py-2 font-terminal text-xs text-yellow-600">
                ⚠️ Live price unavailable (network timeout) — showing cached price
                {r.lastFetched && ` from ${new Date(r.lastFetched).toLocaleDateString()}`}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => refreshResultPrice(r.title, r.platform === 'Unknown' ? '' : r.platform)}
                  disabled={isRefreshingPrice}
                  className="px-3 py-2 font-terminal text-sm border border-blue-700 text-blue-300 hover:bg-blue-950/30 disabled:opacity-50 transition-colors"
                >
                  {isRefreshingPrice ? '… Refreshing' : '💰 Fetch Price'}
                </button>
              </div>

              {r.source === "pricecharting" && (
                <>
                  {!enabledPlatforms.includes(r.platform) && (
                    <div className="border border-purple-800 bg-purple-950/20 px-4 py-2 font-terminal text-sm text-purple-300">
                      🕹️ {r.platform} isn’t currently enabled. Field Mode will enable it automatically when you save, or you can do it now.
                      <button
                        onClick={async () => {
                          const key = `enable:${r.platform}`;
                          setSavingKey(key);
                          setSaveStatus('');
                          try {
                            await ensurePlatformEnabled(r.platform);
                            setSaveStatus(`🕹️ Enabled ${r.platform} for RetroVault.`);
                          } catch (e: unknown) {
                            setSaveStatus(`Error: ${getErrorMessage(e, 'Could not enable platform')}`);
                          } finally {
                            setSavingKey('');
                          }
                        }}
                        disabled={savingKey === `enable:${r.platform}`}
                        className="ml-3 px-3 py-1 font-terminal text-xs border border-purple-700 text-purple-300 hover:bg-purple-950/40 disabled:opacity-50 transition-colors"
                      >
                        {savingKey === `enable:${r.platform}` ? '...' : `Enable ${r.platform}`}
                      </button>
                    </div>
                  )}

                  {findInventoryMatch(inventory, r.title, r.platform) && (
                    <div className="border border-blue-800 bg-blue-950/20 px-4 py-2 font-terminal text-sm text-blue-300">
                      📦 You already have this game record. Bought It will add a new copy to it instead of creating a duplicate.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => saveToWatchlist(r)}
                      disabled={savingKey === `watchlist:${r.title}:${r.platform}`}
                      className="px-3 py-2 font-terminal text-sm border border-yellow-700 text-yellow-300 hover:bg-yellow-950/30 disabled:opacity-50 transition-colors"
                    >
                      {savingKey === `watchlist:${r.title}:${r.platform}` ? '...' : '⭐ Add to Watchlist'}
                    </button>
                    <button
                      onClick={() => saveToWishlist(r)}
                      disabled={savingKey === `wishlist:${r.title}:${r.platform}` || !!selectedWishlistItem}
                      className="px-3 py-2 font-terminal text-sm border border-pink-700 text-pink-300 hover:bg-pink-950/30 disabled:opacity-50 transition-colors"
                    >
                      {savingKey === `wishlist:${r.title}:${r.platform}`
                        ? '...'
                        : selectedWishlistItem
                          ? `🎁 On ${selectedWishlistItem.player?.name || 'selected'}'s Wishlist`
                          : otherWishlistItems.length > 0
                            ? `🎁 Add to ${(players.find((p) => p.id === wishlistPlayerId)?.name || 'selected')}'s Wishlist`
                            : '🎁 Add to Wishlist'}
                    </button>
                    <button
                      onClick={() => saveToInventory(r, {
                        condition: fieldCondition,
                        priceAcquired: askPrice || '0.00',
                        quantity: Math.max(1, parseInt(purchaseQuantity || '1', 10) || 1),
                      })}
                      disabled={savingKey === `purchase:${r.title}:${r.platform}`}
                      className="px-3 py-2 font-terminal text-sm border border-emerald-700 text-emerald-300 hover:bg-emerald-950/30 disabled:opacity-50 transition-colors"
                    >
                      {savingKey === `purchase:${r.title}:${r.platform}` ? '...' : '🛒 Bought It'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <label className="font-terminal text-xs text-zinc-500 uppercase tracking-wider">
                      Qty
                      <input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={purchaseQuantity}
                        onChange={(e) => setPurchaseQuantity(e.target.value.replace(/[^0-9]/g, '') || '1')}
                        className="mt-1 w-20 bg-black border border-zinc-700 px-2 py-2 text-sm text-green-300 focus:border-green-500 focus:outline-none"
                      />
                    </label>
                    <div className="font-terminal text-xs text-zinc-600">
                      Multi-copy buys will add one inventory copy and one acquisition log per unit.
                    </div>
                  </div>

                  {r.wishlistNotes && (
                    <div className="font-terminal text-xs text-zinc-500">
                      🔎 {r.wishlistNotes}
                    </div>
                  )}

                  {(() => {
                    const presets = getWatchlistTargetPresets(askPrice, r.loose);
                    return (
                      <div className="flex flex-wrap gap-2">
                        {presets.askPrice && (
                          <button
                            onClick={() => setAskPrice(presets.askPrice || '')}
                            className="px-2 py-1 font-terminal text-xs border border-zinc-700 text-zinc-400 hover:text-green-300 hover:border-green-700 transition-colors"
                          >
                            Use Ask ${presets.askPrice}
                          </button>
                        )}
                        {presets.belowAsk10 && (
                          <button
                            onClick={() => saveToWatchlist({ ...r, loose: presets.belowAsk10 })}
                            disabled={savingKey === `watchlist:${r.title}:${r.platform}`}
                            className="px-2 py-1 font-terminal text-xs border border-yellow-900 text-yellow-400 hover:bg-yellow-950/30 transition-colors"
                          >
                            Watch at 10% below ask (${presets.belowAsk10})
                          </button>
                        )}
                        {presets.marketMinus20 && (
                          <button
                            onClick={() => saveToWatchlist({ ...r, loose: presets.marketMinus20 })}
                            disabled={savingKey === `watchlist:${r.title}:${r.platform}`}
                            className="px-2 py-1 font-terminal text-xs border border-yellow-900 text-yellow-400 hover:bg-yellow-950/30 transition-colors"
                          >
                            Watch at 20% below market (${presets.marketMinus20})
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {askPrice && (
                    <div className="font-terminal text-xs text-zinc-500">
                      Bought It will save <span className="text-yellow-400">{Math.max(1, parseInt(purchaseQuantity || '1', 10) || 1)}</span> {Math.max(1, parseInt(purchaseQuantity || '1', 10) || 1) === 1 ? 'copy' : 'copies'} at <span className="text-yellow-400">${parseFloat(askPrice || '0').toFixed(2)}</span> each with condition <span className="text-blue-400">{fieldCondition}</span>.
                    </div>
                  )}
                </>
              )}
            </div>

            {isRefreshingPrice && (
              <div className="text-cyan-400 font-terminal text-xs">
                Refreshing price in the background...
              </div>
            )}

            {/* Prices */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "LOOSE", val: r.loose },
                { label: "CIB", val: r.cib },
                { label: "NEW", val: r.newPrice },
              ].map(({ label, val }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 p-3 text-center">
                  <div className="text-zinc-600 font-terminal text-xs mb-1">{label}{r.hasVariants ? ' *' : ''}</div>
                  <div className="text-green-300 font-terminal text-xl">{val ? `$${parseFloat(val).toFixed(2)}` : "—"}</div>
                </div>
              ))}
            </div>

            {r.hasVariants && (
              <div className="border border-amber-700 bg-amber-950/20 px-4 py-2 font-terminal text-sm text-amber-300">
                <p className="text-xs text-amber-500 mb-2">* Variants affect price. Check the detailed edition rows below if the box/manual/art looks different.</p>
                {r.variantMatches && r.variantMatches.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {r.variantMatches.map((v, vi) => (
                      <div key={vi} className="text-xs text-amber-400 font-terminal border border-amber-900 px-2 py-1">
                        <span className="font-bold">{v.title}</span>
                        {v.loose && ` · Loose $${v.loose}`}
                        {v.cib && ` · CIB $${v.cib}`}
                        {v.new && ` · New $${v.new}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Decision */}
            {decision && (
              <div className={`border-2 p-4 text-center ${
                decision.verdict === "BUY" ? "border-emerald-600 bg-emerald-950/30" :
                decision.verdict === "PASS" ? "border-red-800 bg-red-950/20" :
                decision.verdict === "ALREADY OWNED" ? "border-orange-700 bg-orange-950/20" :
                "border-yellow-700 bg-yellow-950/20"
              }`}>
                <div className={`font-terminal text-4xl font-bold mb-1 ${decision.color}`}>
                  {decision.verdict}
                </div>
                <div className="text-zinc-400 font-terminal text-sm">{decision.reason}</div>
                {decision.verdict === "NEGOTIATE" && looseNum && (
                  <div className="text-yellow-500 font-terminal text-sm mt-2">
                    Suggested offer: ${(looseNum * 0.65).toFixed(2)} – ${(looseNum * 0.80).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!searching && results.length === 0 && query && (
        <div className="text-center text-zinc-700 font-terminal text-xl py-8">
          {getFieldEmptyState({
            query,
            platform,
            isOffline: lastSearchIssue?.isOffline || false,
            hadTimeout: lastSearchIssue?.hadTimeout || false,
          })}
        </div>
      )}
    </div>
  );
}
