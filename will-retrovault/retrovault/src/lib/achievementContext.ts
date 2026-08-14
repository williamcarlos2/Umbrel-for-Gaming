import fs from 'fs';
import { evaluateAchievements, type AchievementContext } from '@/data/achievements';
import { readDataFile } from '@/lib/data';
import prisma from '@/lib/prisma';
import { resolveDataPath } from '@/lib/runtimeDataPaths';

const read = <T,>(file: string, fallback: T): T => readDataFile(file, fallback);

type InventoryCopy = {
  priceAcquired?: string | number | null;
};

type InventoryItem = {
  platform?: string;
  source?: string | null;
  isDigital?: boolean;
  marketLoose?: string | number | null;
  priceHistory?: Record<string, unknown>;
  copies?: InventoryCopy[];
};

type SaleEntry = {
  gameId?: string;
  salePrice?: string | number | null;
};

type AcquisitionEntry = {
  gameId?: string;
  cost?: string | number | null;
};

type FavoritesData = {
  people: unknown[];
  favorites: Record<string, string[]>;
  regrets: Record<string, string[]>;
};

type PlaylogEntry = {
  status?: string;
  rating?: number;
};

type GrailEntry = {
  acquiredAt?: string | null;
};

type TagsData = {
  gameTags: Record<string, string[]>;
  platformTags: Record<string, string[]>;
  mentions: Record<string, unknown[]>;
};

type EventEntry = {
  attending?: boolean;
};

type WhatnotData = {
  sellers: unknown[];
  streams: Array<{ attending?: boolean }>;
};

type ScraperEntry = {
  lastRun?: string | null;
};

type DealEntry = {
  dismissed?: boolean;
};

type ValueHistoryEntry = {
  date?: string;
  fetchedAt?: string;
};

type AppConfig = {
  apiKeys?: unknown[];
  setupWizardMode?: 'collector' | 'dealer' | 'empire' | null;
  setupWizardVersion?: string | number | null;
  auth?: { enabled?: boolean; passwordHash?: string | null };
  themeColor?: string | null;
};

export function getAchievementsUnlockedPath() {
  return resolveDataPath('achievements-unlocked.json');
}

export function loadManualAchievements(): string[] {
  const unlockedFile = getAchievementsUnlockedPath();
  if (!fs.existsSync(unlockedFile)) return [];
  return JSON.parse(fs.readFileSync(unlockedFile, 'utf8'));
}

export function readWishlistCounts(): { wishlistCount: number; wishlistFound: number } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    const dbPath = resolveDataPath('retrovault.db');
    const db = new Database(dbPath, { readonly: true });
    const wishlistCount = (db.prepare('SELECT COUNT(*) as c FROM WishlistItem').get() as { c: number }).c;
    const wishlistFound = (db.prepare('SELECT COUNT(*) as c FROM WishlistItem WHERE foundAt IS NOT NULL').get() as { c: number }).c;
    db.close();
    return { wishlistCount, wishlistFound };
  } catch {
    return { wishlistCount: 0, wishlistFound: 0 };
  }
}

async function readWishlistShared(): Promise<boolean> {
  try {
    const share = await prisma.wishlistShare.findFirst({ orderBy: { createdAt: 'desc' } });
    return !!share;
  } catch {
    return false;
  }
}

export async function buildAchievementContext(): Promise<AchievementContext> {
  const inventory = read<InventoryItem[]>('inventory.json', []);
  const sales = read<{ sales: SaleEntry[]; acquisitions: AcquisitionEntry[] }>('sales.json', { sales: [], acquisitions: [] });
  const favorites = read<FavoritesData>('favorites.json', { people: [], favorites: {}, regrets: {} });
  const playlog = read<PlaylogEntry[]>('playlog.json', []);
  const grails = read<GrailEntry[]>('grails.json', []);
  const watchlist = read<unknown[]>('watchlist.json', []);
  const tags = read<TagsData>('tags.json', { gameTags: {}, platformTags: {}, mentions: {} });
  const events = read<EventEntry[]>('events.json', []);
  const whatnot = read<WhatnotData>('whatnot.json', { sellers: [], streams: [] });
  const scrapers = read<ScraperEntry[]>('scrapers.json', []);
  const clDeals = read<DealEntry[]>('craigslist-deals.json', []);
  const valueHistory = read<ValueHistoryEntry[]>('value-history.json', []);
  const bugReports = read<unknown[]>('bug-reports.json', []);
  const cfg = read<AppConfig>('app.config.json', {});

  const owned = inventory.filter((i) => (i.copies || []).length > 0 && !i.isDigital);
  const platforms = [...new Set(owned.map((i) => i.platform).filter((platform): platform is string => Boolean(platform)))];

  const platformCounts: Record<string, number> = {};
  for (const i of owned) {
    if (!i.platform) continue;
    platformCounts[i.platform] = (platformCounts[i.platform] || 0) + 1;
  }

  const saleList = sales.sales || [];
  const totalRevenue = saleList.reduce((s, sale) => s + (parseFloat(String(sale.salePrice ?? '')) || 0), 0);
  const totalSpent = owned.reduce((s, i) =>
    s + (i.copies || []).reduce((cs, c) => cs + (parseFloat(String(c.priceAcquired ?? '')) || 0), 0), 0);

  const acqMap: Record<string, number> = {};
  for (const acq of (sales.acquisitions || [])) {
    if (!acq.gameId) continue;
    acqMap[acq.gameId] = (acqMap[acq.gameId] || 0) + (parseFloat(String(acq.cost ?? '')) || 0);
  }
  let bestFlipRoi = 0;
  for (const sale of saleList) {
    const cost = sale.gameId ? acqMap[sale.gameId] || 0 : 0;
    if (cost > 0) {
      const roi = ((parseFloat(String(sale.salePrice ?? '')) - cost) / cost) * 100;
      if (roi > bestFlipRoi) bestFlipRoi = roi;
    }
  }

  let maxHistoryDays = 0;
  for (const item of inventory) {
    if (item.priceHistory) {
      const dates = Object.keys(item.priceHistory).sort();
      if (dates.length >= 2) {
        const d1 = new Date(dates[0]);
        const d2 = new Date(dates[dates.length - 1]);
        const days = Math.floor((d2.getTime() - d1.getTime()) / 86400000);
        if (days > maxHistoryDays) maxHistoryDays = days;
      }
    }
  }

  const sources = [...new Set(owned.map((i) => i.source).filter((source): source is string => Boolean(source)))];
  const allGameTags = Object.values(tags.gameTags || {}) as string[][];
  const totalTags = allGameTags.reduce((s, arr) => s + arr.length, 0);
  const allMentions = Object.values(tags.mentions || {});
  const totalMentions = allMentions.reduce((s, arr) => s + arr.length, 0);
  const allFavs = Object.values(favorites.favorites || {}) as string[][];
  const totalFavorites = allFavs.reduce((s, arr) => s + arr.length, 0);
  const allRegs = Object.values(favorites.regrets || {}) as string[][];
  const totalRegrets = allRegs.reduce((s, arr) => s + arr.length, 0);

  const beaten = playlog.filter((p) => p.status === 'beat').length;
  const gaveUp = playlog.filter((p) => p.status === 'gave_up').length;
  const playing = playlog.filter((p) => p.status === 'playing').length;
  const backlog = playlog.filter((p) => p.status === 'backlog').length;
  const ratings5 = playlog.filter((p) => p.rating === 5).length;
  const ratings1 = playlog.filter((p) => p.rating === 1).length;
  const conventionSessions = events.filter((e) => e.attending).length;
  const scraperRuns = scrapers.filter((s) => s.lastRun !== null).length;

  let uptimeDays = 0;
  if (valueHistory.length > 0) {
    const first = new Date(valueHistory[0].date || valueHistory[0].fetchedAt || 0);
    uptimeDays = Math.floor((Date.now() - first.getTime()) / 86400000);
  }

  const apiKeysCreated = (cfg.apiKeys || []).length;
  const setupWizardMode = cfg.setupWizardMode ?? null;
  const setupWizardDone = !!cfg.setupWizardVersion;
  const authConfigured = !!cfg.auth?.enabled && !!cfg.auth?.passwordHash;
  const themeCustomized = !!cfg.themeColor && cfg.themeColor !== 'green';
  const { wishlistCount, wishlistFound } = readWishlistCounts();
  const wishlistShared = await readWishlistShared();
  const wishlistMustHaveCount = await prisma.wishlistItem.count({ where: { priority: 1 } }).catch(() => 0);
  const collectionExported = valueHistory.length > 0;
  const csvImported = owned.some((i) => i.source && i.source.toLowerCase().includes('import'));

  return {
    totalOwned: owned.length,
    totalPlatforms: platforms.length,
    totalCatalog: inventory.length,
    platformCounts,
    totalSpent,
    totalRevenue,
    totalSales: saleList.length,
    totalProfit: totalRevenue - totalSpent,
    bestFlipRoi,
    hasMarketData: inventory.some((i) => i.marketLoose),
    priceHistoryDays: maxHistoryDays,
    watchlistCount: watchlist.length,
    grailCount: grails.length,
    grailsFound: grails.filter((g) => g.acquiredAt).length,
    playlogCount: playlog.length,
    gamesBeaten: beaten,
    gamesGivenUp: gaveUp,
    currentlyPlaying: playing,
    backlogCount: backlog,
    ratingsFive: ratings5,
    ratingsOne: ratings1,
    criticCount: (favorites.people || []).length,
    totalFavorites,
    totalRegrets,
    totalTags,
    totalMentions,
    eventsAttending: events.filter((e) => e.attending).length,
    conventionSessions,
    conventionSpent: 0,
    sources,
    sourceCount: sources.length,
    nesOwned: platformCounts['NES'] || 0,
    snesOwned: platformCounts['SNES'] || 0,
    n64Owned: platformCounts['N64'] || 0,
    genesisOwned: platformCounts['Sega Genesis'] || 0,
    dreamcastOwned: platformCounts['Dreamcast'] || 0,
    ps1Owned: platformCounts['PS1'] || 0,
    ps2Owned: platformCounts['PS2'] || 0,
    gamecubeOwned: platformCounts['Gamecube'] || 0,
    xboxOwned: platformCounts['Xbox'] || 0,
    switchOwned: platformCounts['Switch'] || 0,
    pspOwned: platformCounts['PSP'] || 0,
    ps3Owned: platformCounts['PS3'] || 0,
    xbox360Owned: platformCounts['Xbox 360'] || 0,
    segaCdOwned: platformCounts['Sega CD'] || 0,
    scraperRuns,
    dealsDismissed: clDeals.filter((d) => d.dismissed).length,
    whatnotSellers: (whatnot.sellers || []).length,
    streamsWatched: (whatnot.streams || []).filter((s) => s.attending).length,
    apiKeysCreated,
    bugReportsFiled: bugReports.length,
    collectionExported,
    csvImported,
    valueHistoryDays: valueHistory.length,
    uptimeDays,
    setupWizardMode,
    setupWizardDone,
    authConfigured,
    themeCustomized,
    wishlistCount,
    wishlistFound,
    wishlistShared,
    wishlistMustHaveCount,
  };
}

export async function buildAchievementPayload() {
  const context = await buildAchievementContext();
  const auto = evaluateAchievements(context);
  const manual = loadManualAchievements();
  const unlockedIds = [...new Set([...auto, ...manual])];

  return {
    context,
    unlockedIds,
    autoCount: auto.size,
    manualCount: manual.length,
  };
}
