/**
 * RetroVault Field Cache — IndexedDB offline storage
 *
 * Caches owned games, watchlist, and wishlist for offline Field Mode use.
 * Designed to be populated at the hotel, used at the convention.
 *
 * Storage: IndexedDB (survives browser close, no 5MB limit like localStorage)
 * Typical size: ~300KB for 254 games + watchlist + wishlist
 */

const DB_NAME    = 'retrovault-field';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

export type CachedGame = {
  id: string;
  title: string;
  platform: string;
  owned: number;
  conditions: string[];
  paidTotal: number;
  paidEach: number[];
  marketLoose: number | null;
  marketCib: number | null;
  marketNew: number | null;
  lastFetched: string | null;
  // Watchlist metadata
  onWatchlist: boolean;
  watchlistPrice: number | null;
  // Wishlist metadata
  onWishlist: boolean;
  wishlistPriority: number | null;
  wishlistNotes: string | null;
};

export type FieldCacheData = {
  games:    CachedGame[];
  cachedAt: string; // ISO timestamp
  version:  number; // increment to invalidate old caches
};

type InventoryCopy = {
  priceAcquired?: string | number | null;
  condition?: string | null;
};

type InventoryItem = {
  id: string;
  title: string;
  platform: string;
  copies?: InventoryCopy[];
  marketLoose?: string | number | null;
  marketCib?: string | number | null;
  marketNew?: string | number | null;
  lastFetched?: string | null;
};

type WatchlistItem = {
  id: string;
  alertPrice?: string | number | null;
};

type WishlistItem = {
  title?: string | null;
  platform?: string | null;
  priority?: number | null;
  notes?: string | null;
};

const CACHE_VERSION = 1;

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.get(key);
    req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build and save the offline field cache.
 * Fetches owned inventory, watchlist, and wishlist from the server.
 * Call this before entering an area with no connectivity.
 */
export async function buildFieldCache(
  onProgress?: (step: string, pct: number) => void
): Promise<{ count: number; sizeKb: number }> {
  onProgress?.('Loading inventory...', 10);

  // Fetch all three data sources in parallel
  const [invRaw, watchRaw, wishRaw] = await Promise.all([
    fetch('/api/inventory').then(r => r.json()),
    fetch('/api/watchlist').then(r => r.json()).catch(() => []),
    fetch('/api/wishlist').then(r => r.json()).catch(() => ({ items: [] })),
  ]);

  onProgress?.('Building cache...', 50);

  const inventory: InventoryItem[] = Array.isArray(invRaw) ? invRaw : [];
  const watchlist: WatchlistItem[] = Array.isArray(watchRaw) ? watchRaw : [];
  const wishItems: WishlistItem[] = Array.isArray(wishRaw?.items)
    ? wishRaw.items
    : (Array.isArray(wishRaw) ? wishRaw : []);

  // Build lookup maps
  const watchMap = new Map(watchlist.map((w) => [w.id, w]));
  const wishMap  = new Map(wishItems.map((wi) => [`${wi.title || ''}|${wi.platform || ''}`.toLowerCase(), wi]));

  // Filter to owned games only (plus anything on watchlist/wishlist)
  const watchIds  = new Set(watchlist.map((w) => w.id));
  const wishTitles = new Set(wishItems.map((wi) => `${wi.title || ''}|${wi.platform || ''}`.toLowerCase()));

  const relevant = inventory.filter((item) => {
    const hasOwned = (item.copies || []).length > 0;
    const onWatch  = watchIds.has(item.id);
    const onWish   = wishTitles.has((item.title + '|' + item.platform).toLowerCase());
    return hasOwned || onWatch || onWish;
  });

  onProgress?.(`Caching ${relevant.length} games...`, 70);

  const games: CachedGame[] = relevant.map((item) => {
    const copies    = item.copies || [];
    const paidEach  = copies.map((c) => parseFloat(String(c.priceAcquired || 0)) || 0);
    const watchItem = watchMap.get(item.id);
    const wishKey   = (item.title + '|' + item.platform).toLowerCase();
    const wishItem  = wishMap.get(wishKey);

    return {
      id:           item.id,
      title:        item.title,
      platform:     item.platform,
      owned:        copies.length,
      conditions:   copies.map((c) => c.condition || 'Loose'),
      paidTotal:    paidEach.reduce((s: number, v: number) => s + v, 0),
      paidEach,
      marketLoose:  item.marketLoose  ? parseFloat(String(item.marketLoose))  : null,
      marketCib:    item.marketCib    ? parseFloat(String(item.marketCib))    : null,
      marketNew:    item.marketNew    ? parseFloat(String(item.marketNew))    : null,
      lastFetched:  item.lastFetched  ?? null,
      onWatchlist:  !!watchItem,
      watchlistPrice: watchItem ? parseFloat(String(watchItem.alertPrice || '0')) || null : null,
      onWishlist:   !!wishItem,
      wishlistPriority: wishItem?.priority ?? null,
      wishlistNotes:    wishItem?.notes    ?? null,
    };
  });

  const data: FieldCacheData = {
    games,
    cachedAt: new Date().toISOString(),
    version:  CACHE_VERSION,
  };

  onProgress?.('Saving to device...', 90);
  await idbSet('field-cache', data);

  const json    = JSON.stringify(data);
  const sizeKb  = Math.round(json.length / 1024);

  onProgress?.('Done!', 100);
  return { count: games.length, sizeKb };
}

/** Read the offline field cache. Returns null if no cache exists. */
export async function readFieldCache(): Promise<FieldCacheData | null> {
  try {
    const data = await idbGet<FieldCacheData>('field-cache');
    if (!data || data.version !== CACHE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

/** Clear the field cache. */
export async function clearFieldCache(): Promise<void> {
  await idbDelete('field-cache');
}

/** Check if a valid field cache exists and return its metadata. */
export async function getFieldCacheMeta(): Promise<{ cachedAt: string; count: number } | null> {
  const data = await readFieldCache();
  if (!data) return null;
  return { cachedAt: data.cachedAt, count: data.games.length };
}

/**
 * Search the offline cache for a game.
 * Returns up to 5 matches, owned games first.
 */
export function searchFieldCache(
  cache: FieldCacheData,
  query: string,
  platform: string
): CachedGame[] {
  const q          = query.toLowerCase();
  const platFilter = platform !== 'all';

  const matches = cache.games.filter(g =>
    g.title.toLowerCase().includes(q) &&
    (!platFilter || g.platform === platform)
  );

  // Sort: owned first, then watchlist, then wishlist
  matches.sort((a, b) => {
    if (a.owned !== b.owned) return b.owned - a.owned;
    if (a.onWatchlist !== b.onWatchlist) return a.onWatchlist ? -1 : 1;
    if (a.onWishlist  !== b.onWishlist)  return a.onWishlist  ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return matches.slice(0, 5);
}
