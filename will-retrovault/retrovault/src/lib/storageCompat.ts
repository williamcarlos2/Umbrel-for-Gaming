import { prisma } from '@/lib/prisma';
import { readDataFile, writeDataFile } from '@/lib/data';

export type LegacyInventoryItem = {
  id: string;
  title: string;
  platform: string;
  status?: string;
  notes?: string;
  isDigital?: boolean;
  source?: string | null;
  purchaseDate?: string | null;
  lastFetched?: string | null;
  marketLoose?: string | number | null;
  marketCib?: string | number | null;
  marketNew?: string | number | null;
  marketGraded?: string | number | null;
  copies?: Array<{
    id?: string;
    condition?: string;
    hasBox?: boolean;
    hasManual?: boolean;
    priceAcquired?: string | number;
    purchaseDate?: string | null;
    source?: string | null;
  }>;
  priceHistory?: Record<string, {
    loose?: string | number | null;
    cib?: string | number | null;
    new?: string | number | null;
    graded?: string | number | null;
    fetchedAt?: string | null;
  }>;
};

export type LegacyWatchlistItem = {
  id: string;
  gameId?: string | null;
  title: string;
  platform: string;
  targetBuyPrice?: string | number | null;
  alertPrice?: string | number | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type LegacyFavoritesData = {
  people: Array<{ id: string; name: string }>;
  favorites: Record<string, string[]>;
  regrets: Record<string, string[]>;
};

export type LegacyTagsData = {
  gameTags: Record<string, string[]>;
  platformTags: Record<string, string[]>;
  mentions: Record<string, Array<{
    id: string;
    entityId: string;
    entityType: string;
    entityName?: string;
    fromPerson: string;
    message: string;
    createdAt: string;
  }>>;
};

export type LegacyPlayLogEntry = {
  id: string;
  title: string;
  platform: string;
  status: 'playing' | 'beat' | 'gave_up' | 'want_to_play' | 'backlog';
  rating?: number;
  notes?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
};

export type LegacyGoalsData = {
  priorities: Record<string, number>;
};

export type LegacyGrailEntry = {
  id: string;
  title: string;
  platform: string;
  notes?: string;
  priority: 1 | 2 | 3;
  addedAt: string;
  acquiredAt?: string;
};

export type LegacySaleEntry = {
  id: string;
  gameId?: string | null;
  gameTitle: string;
  platform?: string | null;
  salePrice: string | number;
  saleDate: string;
  condition?: string | null;
  notes?: string | null;
  source?: string | null;
  createdAt?: string;
};

export type LegacyAcquisitionEntry = {
  id: string;
  gameId?: string | null;
  gameTitle: string;
  platform?: string | null;
  cost: string | number;
  purchaseDate: string;
  source?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export type LegacyValueSnapshot = {
  date: string;
  totalValue: number;
  totalCib: number;
  totalPaid: number;
  gameCount: number;
};

export type LegacyEvent = {
  id: string;
  title: string;
  dateRaw: string;
  date?: string;
  location: string;
  venue?: string;
  url?: string;
  source: string;
  type: string;
  description?: string;
  scrapedAt?: string;
  attending: boolean;
  interested: boolean;
  notes?: string;
};

export type LegacyWhatnotSeller = {
  username: string;
  displayName: string;
  specialty: string;
  twitterUrl?: string;
  instagramUrl?: string;
  notes?: string;
  addedAt: string;
  notifyBefore?: number;
};

export type LegacyWhatnotStream = {
  id: string;
  seller: string;
  title: string;
  startTime?: string;
  scheduledText?: string;
  url: string;
  source: string;
  scrapedAt: string;
  dismissed?: boolean;
  attending?: boolean;
};

export type LegacyWhatnotData = {
  sellers: LegacyWhatnotSeller[];
  streams: LegacyWhatnotStream[];
  lastChecked: string | null;
  sellerStatuses?: Record<string, unknown>;
};

export type LegacyDealEntry = {
  id: string;
  dismissed?: boolean;
  [key: string]: unknown;
};

export type LegacyDealsData = {
  craigslist: LegacyDealEntry[];
  reddit: LegacyDealEntry[];
};

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeInventoryKeyPart(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function safeIso(value: unknown): string | null {
  const stringValue = toNullableString(value);
  if (!stringValue) return null;
  const parsed = new Date(stringValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

type InventoryGameRecord = {
  id: string;
  title: string;
  platform: string;
  status: string;
  notes: string;
  isDigital: boolean;
  source: string | null;
  purchaseDate: string | null;
  lastFetched: Date | null;
  marketLoose: number | null;
  marketCib: number | null;
  marketNew: number | null;
  marketGraded: number | null;
  copies: Array<{
    id: string;
    condition: string;
    hasBox: boolean;
    hasManual: boolean;
    priceAcquired: number;
    purchaseDate: string | null;
    source: string | null;
  }>;
  priceHistory: Array<{
    date: string;
    loose: number | null;
    cib: number | null;
    newPrice: number | null;
    graded: number | null;
    fetchedAt: Date;
  }>;
};

function mapGameToLegacy(game: InventoryGameRecord): LegacyInventoryItem {
  return {
    id: game.id,
    title: game.title,
    platform: game.platform,
    status: game.status,
    notes: game.notes,
    isDigital: game.isDigital,
    source: game.source,
    purchaseDate: game.purchaseDate,
    lastFetched: game.lastFetched?.toISOString() ?? null,
    marketLoose: game.marketLoose ?? null,
    marketCib: game.marketCib ?? null,
    marketNew: game.marketNew ?? null,
    marketGraded: game.marketGraded ?? null,
    copies: game.copies.map((copy) => ({
      id: copy.id,
      condition: copy.condition,
      hasBox: copy.hasBox,
      hasManual: copy.hasManual,
      priceAcquired: copy.priceAcquired,
      purchaseDate: copy.purchaseDate,
      source: copy.source,
    })),
    priceHistory: Object.fromEntries(
      game.priceHistory.map((entry) => [entry.date, {
        loose: entry.loose ?? null,
        cib: entry.cib ?? null,
        new: entry.newPrice ?? null,
        graded: entry.graded ?? null,
        fetchedAt: entry.fetchedAt.toISOString(),
      }])
    ),
  };
}

export async function readInventoryCompat(): Promise<LegacyInventoryItem[]> {
  const games = await prisma.game.findMany({
    include: {
      copies: true,
      priceHistory: true,
    },
    orderBy: [{ title: 'asc' }, { platform: 'asc' }],
  });

  const dbItems = games.map(mapGameToLegacy);
  const legacyItems = readDataFile<LegacyInventoryItem[]>('inventory.json', []);

  // During the hybrid migration window, Prisma is the preferred source for rows it knows
  // about, but JSON may still contain newer user-added records that have not been backfilled
  // yet. Merge by id so JSON-only records remain visible instead of silently disappearing.
  const merged = new Map<string, LegacyInventoryItem>();
  for (const item of legacyItems) merged.set(item.id, item);
  for (const item of dbItems) merged.set(item.id, item);

  return Array.from(merged.values()).sort((a, b) => {
    const titleCompare = a.title.localeCompare(b.title);
    if (titleCompare !== 0) return titleCompare;
    return a.platform.localeCompare(b.platform);
  });
}

export async function createInventoryCompat(item: LegacyInventoryItem): Promise<LegacyInventoryItem> {
  const normalizedTitle = normalizeInventoryKeyPart(item.title);
  const normalizedPlatform = normalizeInventoryKeyPart(item.platform);
  const existingItems = await readInventoryCompat();
  const matchingExisting = existingItems.find((entry) =>
    normalizeInventoryKeyPart(entry.title) === normalizedTitle &&
    normalizeInventoryKeyPart(entry.platform) === normalizedPlatform
  );

  if (matchingExisting) {
    const existingCopies = matchingExisting.copies || [];
    const incomingCopies = item.copies || [];
    const mergedCopies = [...existingCopies, ...incomingCopies].map((copy, index) => ({
      ...copy,
      id: copy.id || `${matchingExisting.id}-copy-${index + 1}`,
    }));

    const mergedPriceHistory = {
      ...(matchingExisting.priceHistory || {}),
      ...(item.priceHistory || {}),
    };

    const updated = await updateInventoryCompat({
      ...matchingExisting,
      status: item.status ?? matchingExisting.status,
      notes: item.notes ?? matchingExisting.notes,
      isDigital: item.isDigital ?? matchingExisting.isDigital,
      source: toNullableString(item.source) ?? matchingExisting.source,
      purchaseDate: toNullableString(item.purchaseDate) ?? matchingExisting.purchaseDate,
      lastFetched: safeIso(item.lastFetched) ?? matchingExisting.lastFetched,
      marketLoose: toNullableNumber(item.marketLoose) ?? matchingExisting.marketLoose,
      marketCib: toNullableNumber(item.marketCib) ?? matchingExisting.marketCib,
      marketNew: toNullableNumber(item.marketNew) ?? matchingExisting.marketNew,
      marketGraded: toNullableNumber(item.marketGraded) ?? matchingExisting.marketGraded,
      copies: mergedCopies,
      priceHistory: mergedPriceHistory,
    });

    if (!updated) throw new Error('Failed to merge inventory item with existing record');
    return updated;
  }

  const created = await prisma.game.create({
    data: {
      id: item.id,
      title: item.title,
      platform: item.platform,
      status: item.status ?? 'unowned',
      notes: item.notes ?? '',
      isDigital: Boolean(item.isDigital),
      source: toNullableString(item.source),
      purchaseDate: toNullableString(item.purchaseDate),
      lastFetched: safeIso(item.lastFetched),
      marketLoose: toNullableNumber(item.marketLoose),
      marketCib: toNullableNumber(item.marketCib),
      marketNew: toNullableNumber(item.marketNew),
      marketGraded: toNullableNumber(item.marketGraded),
      copies: {
        create: (item.copies || []).map((copy) => ({
          id: copy.id,
          condition: copy.condition || 'Loose',
          hasBox: Boolean(copy.hasBox),
          hasManual: Boolean(copy.hasManual),
          priceAcquired: toNullableNumber(copy.priceAcquired) ?? 0,
          purchaseDate: toNullableString(copy.purchaseDate),
          source: toNullableString(copy.source),
        })),
      },
      priceHistory: {
        create: Object.entries(item.priceHistory || {}).map(([date, prices]) => ({
          date,
          loose: toNullableNumber(prices?.loose),
          cib: toNullableNumber(prices?.cib),
          newPrice: toNullableNumber(prices?.new),
          graded: toNullableNumber(prices?.graded),
          fetchedAt: safeIso(prices?.fetchedAt) ?? new Date().toISOString(),
        })),
      },
    },
    include: {
      copies: true,
      priceHistory: true,
    },
  });

  return {
    id: created.id,
    title: created.title,
    platform: created.platform,
    status: created.status,
    notes: created.notes,
    isDigital: created.isDigital,
    source: created.source,
    purchaseDate: created.purchaseDate,
    lastFetched: created.lastFetched?.toISOString() ?? null,
    marketLoose: created.marketLoose ?? null,
    marketCib: created.marketCib ?? null,
    marketNew: created.marketNew ?? null,
    marketGraded: created.marketGraded ?? null,
    copies: created.copies.map((copy) => ({
      id: copy.id,
      condition: copy.condition,
      hasBox: copy.hasBox,
      hasManual: copy.hasManual,
      priceAcquired: copy.priceAcquired,
      purchaseDate: copy.purchaseDate,
      source: copy.source,
    })),
    priceHistory: Object.fromEntries(created.priceHistory.map((entry) => [entry.date, {
      loose: entry.loose ?? null,
      cib: entry.cib ?? null,
      new: entry.newPrice ?? null,
      graded: entry.graded ?? null,
      fetchedAt: entry.fetchedAt.toISOString(),
    }])),
  };
}

export async function updateInventoryCompat(item: LegacyInventoryItem): Promise<LegacyInventoryItem | null> {
  const existing = await prisma.game.findUnique({ where: { id: item.id } });
  if (!existing) return null;

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: item.id },
      data: {
        title: item.title,
        platform: item.platform,
        status: item.status ?? 'unowned',
        notes: item.notes ?? '',
        isDigital: Boolean(item.isDigital),
        source: toNullableString(item.source),
        purchaseDate: toNullableString(item.purchaseDate),
        lastFetched: safeIso(item.lastFetched),
        marketLoose: toNullableNumber(item.marketLoose),
        marketCib: toNullableNumber(item.marketCib),
        marketNew: toNullableNumber(item.marketNew),
        marketGraded: toNullableNumber(item.marketGraded),
      },
    });

    await tx.gameCopy.deleteMany({ where: { gameId: item.id } });
    if ((item.copies || []).length > 0) {
      await tx.gameCopy.createMany({
        data: (item.copies || []).map((copy) => ({
          id: copy.id,
          gameId: item.id,
          condition: copy.condition || 'Loose',
          hasBox: Boolean(copy.hasBox),
          hasManual: Boolean(copy.hasManual),
          priceAcquired: toNullableNumber(copy.priceAcquired) ?? 0,
          purchaseDate: toNullableString(copy.purchaseDate),
          source: toNullableString(copy.source),
        })),
      });
    }

    await tx.priceHistory.deleteMany({ where: { gameId: item.id } });
    const priceEntries = Object.entries(item.priceHistory || {});
    if (priceEntries.length > 0) {
      await tx.priceHistory.createMany({
        data: priceEntries.map(([date, prices]) => ({
          gameId: item.id,
          date,
          loose: toNullableNumber(prices?.loose),
          cib: toNullableNumber(prices?.cib),
          newPrice: toNullableNumber(prices?.new),
          graded: toNullableNumber(prices?.graded),
          fetchedAt: safeIso(prices?.fetchedAt) ?? new Date().toISOString(),
        })),
      });
    }
  });

  const [updated] = await Promise.all([readInventoryCompat()]);
  return updated.find((entry) => entry.id === item.id) || null;
}

export async function deleteInventoryCompat(id: string): Promise<boolean> {
  const existing = await prisma.game.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.game.delete({ where: { id } });
  return true;
}

export async function readWatchlistCompat(): Promise<LegacyWatchlistItem[]> {
  const items = await prisma.watchlistItem.findMany({ orderBy: { createdAt: 'desc' } });
  return items.map((item) => ({
    id: item.id,
    gameId: item.gameId,
    title: item.title,
    platform: item.platform,
    targetBuyPrice: item.alertPrice,
    alertPrice: item.alertPrice,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
  }));
}

export async function addWatchlistCompat(item: LegacyWatchlistItem): Promise<LegacyWatchlistItem> {
  const alertPrice = toNullableNumber(item.alertPrice ?? item.targetBuyPrice) ?? 0;
  const created = await prisma.watchlistItem.create({
    data: {
      gameId: toNullableString(item.gameId),
      title: item.title,
      platform: item.platform,
      alertPrice,
      notes: toNullableString(item.notes),
    },
  });

  return {
    id: created.id,
    gameId: created.gameId,
    title: created.title,
    platform: created.platform,
    targetBuyPrice: created.alertPrice,
    alertPrice: created.alertPrice,
    notes: created.notes,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateWatchlistCompat(item: LegacyWatchlistItem): Promise<LegacyWatchlistItem | null> {
  const existing = await prisma.watchlistItem.findUnique({ where: { id: item.id } });
  if (!existing) return null;

  const updated = await prisma.watchlistItem.update({
    where: { id: item.id },
    data: {
      gameId: toNullableString(item.gameId),
      title: item.title,
      platform: item.platform,
      alertPrice: toNullableNumber(item.alertPrice ?? item.targetBuyPrice) ?? 0,
      notes: toNullableString(item.notes),
    },
  });

  return {
    id: updated.id,
    gameId: updated.gameId,
    title: updated.title,
    platform: updated.platform,
    targetBuyPrice: updated.alertPrice,
    alertPrice: updated.alertPrice,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteWatchlistCompat(id: string): Promise<boolean> {
  const existing = await prisma.watchlistItem.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.watchlistItem.delete({ where: { id } });
  return true;
}

type FavoritePersonWithColor = { id: string; name: string; color?: string | null };

export async function readFavoritesCompat(): Promise<LegacyFavoritesData> {
  const people = await prisma.person.findMany({
    include: {
      favorites: true,
      regrets: true,
    },
    orderBy: { name: 'asc' },
  });

  const legacy = readDataFile<LegacyFavoritesData>('favorites.json', { people: [], favorites: {}, regrets: {} });
  const mergedPeople = new Map<string, { id: string; name: string; color?: string | null }>();
  for (const person of legacy.people || []) mergedPeople.set(person.id, person);
  for (const person of people) mergedPeople.set(person.id, { id: person.id, name: person.name, color: (person as FavoritePersonWithColor).color ?? null });

  const favorites: Record<string, string[]> = { ...(legacy.favorites || {}) };
  const regrets: Record<string, string[]> = { ...(legacy.regrets || {}) };

  for (const person of people) {
    favorites[person.id] = Array.from(new Set(person.favorites.map((entry) => entry.gameId))).sort();
    regrets[person.id] = Array.from(new Set(person.regrets.map((entry) => entry.gameId))).sort();
  }

  return {
    people: Array.from(mergedPeople.values()).sort((a, b) => a.name.localeCompare(b.name)),
    favorites,
    regrets,
  };
}

export async function addPersonCompat(name: string, color?: string | null) {
  const created = await prisma.person.create({ data: { name, color: color || null } });
  return { id: created.id, name: created.name, color: created.color };
}

export async function renamePersonCompat(id: string, name: string, color?: string | null) {
  try {
    const updated = await prisma.person.update({ where: { id }, data: { name, ...(color !== undefined ? { color: color || null } : {}) } });
    return { id: updated.id, name: updated.name, color: updated.color };
  } catch {
    return null;
  }
}

export async function removePersonCompat(id: string): Promise<boolean> {
  try {
    await prisma.person.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function toggleFavoriteCompat(personId: string, gameId: string) {
  const existing = await prisma.favorite.findFirst({ where: { personId, gameId } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { personId, gameId } });
    const regret = await prisma.regret.findFirst({ where: { personId, gameId } });
    if (regret) {
      await prisma.regret.delete({ where: { id: regret.id } });
    }
  }

  const refreshed = await readFavoritesCompat();
  return refreshed.favorites[personId] || [];
}

export async function toggleRegretCompat(personId: string, gameId: string) {
  const existing = await prisma.regret.findFirst({ where: { personId, gameId } });
  if (existing) {
    await prisma.regret.delete({ where: { id: existing.id } });
  } else {
    await prisma.regret.create({ data: { personId, gameId } });
    const favorite = await prisma.favorite.findFirst({ where: { personId, gameId } });
    if (favorite) {
      await prisma.favorite.delete({ where: { id: favorite.id } });
    }
  }

  const refreshed = await readFavoritesCompat();
  return refreshed.regrets[personId] || [];
}

export async function readTagsCompat(): Promise<LegacyTagsData> {
  const [gameTags, mentions] = await Promise.all([
    prisma.gameTag.findMany({ orderBy: [{ entityType: 'asc' }, { tag: 'asc' }] }),
    prisma.mention.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  const legacy = readDataFile<LegacyTagsData>('tags.json', { gameTags: {}, platformTags: {}, mentions: {} });
  const result: LegacyTagsData = {
    gameTags: { ...(legacy.gameTags || {}) },
    platformTags: { ...(legacy.platformTags || {}) },
    mentions: { ...(legacy.mentions || {}) },
  };

  for (const tag of gameTags) {
    const store = tag.entityType === 'platform' ? result.platformTags : result.gameTags;
    store[tag.gameId] = Array.from(new Set([...(store[tag.gameId] || []), tag.tag])).sort();
  }

  for (const mention of mentions) {
    const personId = mention.toPersonId;
    result.mentions[personId] = result.mentions[personId] || [];
    const exists = result.mentions[personId].some((entry) => entry.id === mention.id);
    if (!exists) {
      result.mentions[personId].push({
        id: mention.id,
        entityId: mention.gameId,
        entityType: mention.entityType,
        entityName: mention.entityName,
        fromPerson: mention.fromPerson,
        message: mention.message,
        createdAt: mention.createdAt.toISOString(),
      });
    }
  }

  return result;
}

export async function addTagCompat(entityId: string, entityType: string, tag: string) {
  const normalizedEntityType = entityType === 'platform' ? 'platform' : 'game';
  const existing = await prisma.gameTag.findFirst({ where: { gameId: entityId, tag, entityType: normalizedEntityType } });
  if (!existing) {
    await prisma.gameTag.create({
      data: {
        gameId: entityId,
        tag,
        entityType: normalizedEntityType,
      },
    });
  }
  const refreshed = await readTagsCompat();
  return normalizedEntityType === 'platform' ? refreshed.platformTags[entityId] || [] : refreshed.gameTags[entityId] || [];
}

export async function removeTagCompat(entityId: string, entityType: string, tag: string) {
  const normalizedEntityType = entityType === 'platform' ? 'platform' : 'game';
  const existing = await prisma.gameTag.findFirst({ where: { gameId: entityId, tag, entityType: normalizedEntityType } });
  if (existing) {
    await prisma.gameTag.delete({ where: { id: existing.id } });
  }
  const refreshed = await readTagsCompat();
  return normalizedEntityType === 'platform' ? refreshed.platformTags[entityId] || [] : refreshed.gameTags[entityId] || [];
}

export async function addMentionCompat(mention: {
  entityId: string;
  entityType: string;
  entityName?: string;
  fromPerson: string;
  toPerson: string;
  message: string;
}) {
  const created = await prisma.mention.create({
    data: {
      gameId: mention.entityId,
      toPersonId: mention.toPerson,
      fromPerson: mention.fromPerson,
      message: mention.message,
      entityType: mention.entityType,
      entityName: mention.entityName || '',
    },
  });

  return {
    id: created.id,
    entityId: created.gameId,
    entityType: created.entityType,
    entityName: created.entityName,
    fromPerson: created.fromPerson,
    message: created.message,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function deleteMentionCompat(personId: string, mentionId: string) {
  const existing = await prisma.mention.findFirst({ where: { id: mentionId, toPersonId: personId } });
  if (!existing) return false;
  await prisma.mention.delete({ where: { id: mentionId } });
  return true;
}

export async function readPlaylogCompat(): Promise<LegacyPlayLogEntry[]> {
  const entries = await prisma.playLogEntry.findMany({ orderBy: { updatedAt: 'desc' } });
  const legacy = readDataFile<LegacyPlayLogEntry[]>('playlog.json', []);
  const merged = new Map<string, LegacyPlayLogEntry>();

  for (const entry of legacy) merged.set(entry.id, entry);
  for (const entry of entries) {
    merged.set(entry.id, {
      id: entry.id,
      title: entry.title,
      platform: entry.platform,
      status: entry.status as LegacyPlayLogEntry['status'],
      rating: entry.rating ?? undefined,
      notes: entry.notes ?? undefined,
      startedAt: entry.startedAt?.toISOString(),
      finishedAt: entry.finishedAt?.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    });
  }

  return Array.from(merged.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertPlaylogCompat(entry: Omit<LegacyPlayLogEntry, 'updatedAt'>) {
  const updated = await prisma.playLogEntry.upsert({
    where: { id: entry.id },
    update: {
      title: entry.title,
      platform: entry.platform,
      status: entry.status,
      rating: entry.rating ?? null,
      notes: entry.notes ?? null,
      startedAt: safeIso(entry.startedAt),
      finishedAt: safeIso(entry.finishedAt),
    },
    create: {
      id: entry.id,
      title: entry.title,
      platform: entry.platform,
      status: entry.status,
      rating: entry.rating ?? null,
      notes: entry.notes ?? null,
      startedAt: safeIso(entry.startedAt),
      finishedAt: safeIso(entry.finishedAt),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    platform: updated.platform,
    status: updated.status as LegacyPlayLogEntry['status'],
    rating: updated.rating ?? undefined,
    notes: updated.notes ?? undefined,
    startedAt: updated.startedAt?.toISOString(),
    finishedAt: updated.finishedAt?.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deletePlaylogCompat(id: string): Promise<boolean> {
  try {
    await prisma.playLogEntry.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function setPlaylogStatusCompat(id: string, status: LegacyPlayLogEntry['status']) {
  const existing = await prisma.playLogEntry.findUnique({ where: { id } });
  if (!existing) return null;

  const now = new Date();
  const updated = await prisma.playLogEntry.update({
    where: { id },
    data: {
      status,
      startedAt: status === 'playing' ? existing.startedAt ?? now : existing.startedAt,
      finishedAt: status === 'beat' ? existing.finishedAt ?? now : existing.finishedAt,
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    platform: updated.platform,
    status: updated.status as LegacyPlayLogEntry['status'],
    rating: updated.rating ?? undefined,
    notes: updated.notes ?? undefined,
    startedAt: updated.startedAt?.toISOString(),
    finishedAt: updated.finishedAt?.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function readGoalsCompat(): Promise<LegacyGoalsData> {
  const goals = await prisma.collectionGoal.findMany({ orderBy: { platform: 'asc' } });
  const legacy = readDataFile<LegacyGoalsData>('goals.json', { priorities: {} });
  const priorities = { ...(legacy.priorities || {}) };

  for (const goal of goals) {
    priorities[goal.platform] = goal.priority;
  }

  return { priorities };
}

export async function setGoalPriorityCompat(platform: string, priority: number | null | undefined) {
  if (priority === null || priority === undefined) {
    await prisma.collectionGoal.deleteMany({ where: { platform } });
    return;
  }

  await prisma.collectionGoal.upsert({
    where: { platform },
    update: { priority },
    create: { platform, priority },
  });
}

export async function readGrailsCompat(): Promise<LegacyGrailEntry[]> {
  const grails = await prisma.grail.findMany({ orderBy: [{ acquiredAt: 'desc' }, { createdAt: 'desc' }] });
  const legacy = readDataFile<LegacyGrailEntry[]>('grails.json', []);
  const merged = new Map<string, LegacyGrailEntry>();

  for (const grail of legacy) merged.set(grail.id, grail);
  for (const grail of grails) {
    merged.set(grail.id, {
      id: grail.id,
      title: grail.title,
      platform: grail.platform || '',
      notes: grail.notes ?? '',
      priority: (grail.priority as 1 | 2 | 3) || 2,
      addedAt: grail.createdAt.toISOString(),
      acquiredAt: grail.acquiredAt?.toISOString(),
    });
  }

  return Array.from(merged.values()).sort((a, b) => (b.acquiredAt || b.addedAt).localeCompare(a.acquiredAt || a.addedAt));
}

export async function addGrailCompat(entry: { title: string; platform: string; notes?: string; priority?: 1 | 2 | 3 }) {
  const created = await prisma.grail.create({
    data: {
      title: entry.title,
      platform: entry.platform,
      notes: entry.notes || '',
      priority: entry.priority || 2,
    },
  });

  return {
    id: created.id,
    title: created.title,
    platform: created.platform || '',
    notes: created.notes ?? '',
    priority: (created.priority as 1 | 2 | 3) || 2,
    addedAt: created.createdAt.toISOString(),
    acquiredAt: created.acquiredAt?.toISOString(),
  };
}

export async function acquireGrailCompat(id: string) {
  try {
    const updated = await prisma.grail.update({ where: { id }, data: { acquiredAt: new Date() } });
    return {
      id: updated.id,
      title: updated.title,
      platform: updated.platform || '',
      notes: updated.notes ?? '',
      priority: (updated.priority as 1 | 2 | 3) || 2,
      addedAt: updated.createdAt.toISOString(),
      acquiredAt: updated.acquiredAt?.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function updateGrailCompat(entry: Partial<LegacyGrailEntry> & { id: string }) {
  try {
    const updated = await prisma.grail.update({
      where: { id: entry.id },
      data: {
        title: entry.title,
        platform: entry.platform,
        notes: entry.notes,
        priority: entry.priority,
        acquiredAt: safeIso(entry.acquiredAt),
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      platform: updated.platform || '',
      notes: updated.notes ?? '',
      priority: (updated.priority as 1 | 2 | 3) || 2,
      addedAt: updated.createdAt.toISOString(),
      acquiredAt: updated.acquiredAt?.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function deleteGrailCompat(id: string): Promise<boolean> {
  try {
    await prisma.grail.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function readSalesCompat(): Promise<LegacySaleEntry[]> {
  const sales = await prisma.sale.findMany({ orderBy: { createdAt: 'desc' } });
  const legacy = readDataFile<LegacySaleEntry[]>('sales.json', []);
  const merged = new Map<string, LegacySaleEntry>();

  for (const entry of legacy) merged.set(entry.id, entry);
  for (const entry of sales) {
    merged.set(entry.id, {
      id: entry.id,
      gameId: entry.gameId,
      gameTitle: entry.gameTitle,
      platform: entry.platform,
      salePrice: entry.salePrice,
      saleDate: entry.saleDate,
      condition: entry.condition,
      notes: entry.notes,
      source: entry.source,
      createdAt: entry.createdAt.toISOString(),
    });
  }

  return Array.from(merged.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function addSaleCompat(item: Omit<LegacySaleEntry, 'id' | 'createdAt'>) {
  const created = await prisma.sale.create({
    data: {
      gameId: toNullableString(item.gameId),
      gameTitle: item.gameTitle,
      platform: toNullableString(item.platform),
      salePrice: toNullableNumber(item.salePrice) ?? 0,
      saleDate: item.saleDate,
      condition: toNullableString(item.condition),
      notes: toNullableString(item.notes),
      source: toNullableString(item.source),
    },
  });

  return {
    id: created.id,
    gameId: created.gameId,
    gameTitle: created.gameTitle,
    platform: created.platform,
    salePrice: created.salePrice,
    saleDate: created.saleDate,
    condition: created.condition,
    notes: created.notes,
    source: created.source,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateSaleCompat(item: LegacySaleEntry) {
  try {
    const updated = await prisma.sale.update({
      where: { id: item.id },
      data: {
        gameId: toNullableString(item.gameId),
        gameTitle: item.gameTitle,
        platform: toNullableString(item.platform),
        salePrice: toNullableNumber(item.salePrice) ?? 0,
        saleDate: item.saleDate,
        condition: toNullableString(item.condition),
        notes: toNullableString(item.notes),
        source: toNullableString(item.source),
      },
    });

    return {
      id: updated.id,
      gameId: updated.gameId,
      gameTitle: updated.gameTitle,
      platform: updated.platform,
      salePrice: updated.salePrice,
      saleDate: updated.saleDate,
      condition: updated.condition,
      notes: updated.notes,
      source: updated.source,
      createdAt: updated.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function deleteSaleCompat(id: string): Promise<boolean> {
  try {
    await prisma.sale.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function readAcquisitionsCompat(): Promise<LegacyAcquisitionEntry[]> {
  const acquisitions = await prisma.acquisition.findMany({ orderBy: { createdAt: 'desc' } });
  const legacy = readDataFile<LegacyAcquisitionEntry[]>('acquisitions.json', []);
  const merged = new Map<string, LegacyAcquisitionEntry>();

  for (const entry of legacy) merged.set(entry.id, entry);
  for (const entry of acquisitions) {
    merged.set(entry.id, {
      id: entry.id,
      gameId: entry.gameId,
      gameTitle: entry.gameTitle,
      platform: entry.platform,
      cost: entry.cost,
      purchaseDate: entry.purchaseDate,
      source: entry.source,
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
    });
  }

  return Array.from(merged.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function addAcquisitionCompat(item: Omit<LegacyAcquisitionEntry, 'id' | 'createdAt'>) {
  const created = await prisma.acquisition.create({
    data: {
      gameId: toNullableString(item.gameId),
      gameTitle: item.gameTitle,
      platform: toNullableString(item.platform),
      cost: toNullableNumber(item.cost) ?? 0,
      purchaseDate: item.purchaseDate,
      source: toNullableString(item.source),
      notes: toNullableString(item.notes),
    },
  });

  return {
    id: created.id,
    gameId: created.gameId,
    gameTitle: created.gameTitle,
    platform: created.platform,
    cost: created.cost,
    purchaseDate: created.purchaseDate,
    source: created.source,
    notes: created.notes,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateAcquisitionCompat(item: LegacyAcquisitionEntry) {
  try {
    const updated = await prisma.acquisition.update({
      where: { id: item.id },
      data: {
        gameId: toNullableString(item.gameId),
        gameTitle: item.gameTitle,
        platform: toNullableString(item.platform),
        cost: toNullableNumber(item.cost) ?? 0,
        purchaseDate: item.purchaseDate,
        source: toNullableString(item.source),
        notes: toNullableString(item.notes),
      },
    });

    return {
      id: updated.id,
      gameId: updated.gameId,
      gameTitle: updated.gameTitle,
      platform: updated.platform,
      cost: updated.cost,
      purchaseDate: updated.purchaseDate,
      source: updated.source,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function deleteAcquisitionCompat(id: string): Promise<boolean> {
  try {
    await prisma.acquisition.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function readEventsCompat(): Promise<LegacyEvent[]> {
  const events = await prisma.event.findMany({ orderBy: { scrapedAt: 'desc' } });
  const legacy = readDataFile<LegacyEvent[]>('events.json', []);
  const merged = new Map<string, LegacyEvent>();

  for (const entry of legacy) merged.set(entry.id, entry);
  for (const entry of events) {
    merged.set(entry.id, {
      id: entry.id,
      title: entry.title,
      dateRaw: entry.dateRaw,
      date: entry.date ?? undefined,
      location: entry.location,
      venue: entry.venue ?? undefined,
      url: entry.url ?? undefined,
      source: entry.source,
      type: 'gaming',
      description: entry.description ?? undefined,
      scrapedAt: entry.scrapedAt.toISOString(),
      attending: entry.attending,
      interested: entry.interested,
      notes: entry.notes ?? undefined,
    });
  }

  return Array.from(merged.values()).sort((a, b) => (b.scrapedAt || '').localeCompare(a.scrapedAt || ''));
}

export async function addEventCompat(item: Omit<LegacyEvent, 'id' | 'scrapedAt' | 'type'> & { type?: string }) {
  const created = await prisma.event.create({
    data: {
      title: item.title,
      dateRaw: item.dateRaw,
      date: toNullableString(item.date),
      location: item.location || '',
      venue: toNullableString(item.venue),
      url: toNullableString(item.url),
      source: item.source || 'manual',
      description: toNullableString(item.description),
      attending: Boolean(item.attending),
      interested: Boolean(item.interested),
      notes: toNullableString(item.notes),
    },
  });

  return {
    id: created.id,
    title: created.title,
    dateRaw: created.dateRaw,
    date: created.date ?? undefined,
    location: created.location,
    venue: created.venue ?? undefined,
    url: created.url ?? undefined,
    source: created.source,
    type: 'gaming',
    description: created.description ?? undefined,
    scrapedAt: created.scrapedAt.toISOString(),
    attending: created.attending,
    interested: created.interested,
    notes: created.notes ?? undefined,
  };
}

export async function updateEventCompat(id: string, updates: Partial<LegacyEvent>) {
  try {
    const updated = await prisma.event.update({
      where: { id },
      data: {
        attending: updates.attending,
        interested: updates.interested,
        notes: updates.notes === undefined ? undefined : toNullableString(updates.notes),
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      dateRaw: updated.dateRaw,
      date: updated.date ?? undefined,
      location: updated.location,
      venue: updated.venue ?? undefined,
      url: updated.url ?? undefined,
      source: updated.source,
      type: 'gaming',
      description: updated.description ?? undefined,
      scrapedAt: updated.scrapedAt.toISOString(),
      attending: updated.attending,
      interested: updated.interested,
      notes: updated.notes ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function deleteEventCompat(id: string): Promise<boolean> {
  try {
    await prisma.event.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function readWhatnotCompat(): Promise<LegacyWhatnotData> {
  const sellers = await prisma.whatnotSeller.findMany({ orderBy: { createdAt: 'asc' } });
  const streams = await prisma.whatnotStream.findMany({ orderBy: { createdAt: 'desc' } });
  const legacy = readDataFile<LegacyWhatnotData>('whatnot.json', { sellers: [], streams: [], lastChecked: null });

  const mergedSellers = new Map<string, LegacyWhatnotSeller>();
  for (const seller of legacy.sellers || []) mergedSellers.set(seller.username, seller);
  for (const seller of sellers) {
    mergedSellers.set(seller.username, {
      username: seller.username,
      displayName: seller.displayName,
      specialty: seller.specialty,
      twitterUrl: seller.twitterUrl ?? undefined,
      instagramUrl: seller.instagramUrl ?? undefined,
      notes: seller.notes ?? undefined,
      addedAt: seller.createdAt.toISOString(),
      notifyBefore: seller.notifyBefore,
    });
  }

  const mergedStreams = new Map<string, LegacyWhatnotStream>();
  for (const stream of legacy.streams || []) mergedStreams.set(stream.id, stream);
  for (const stream of streams) {
    mergedStreams.set(stream.id, {
      id: stream.id,
      seller: stream.seller,
      title: stream.title,
      startTime: stream.startTime?.toISOString(),
      scheduledText: stream.scheduledText ?? undefined,
      url: stream.url,
      source: stream.source,
      scrapedAt: stream.createdAt.toISOString(),
      attending: stream.attending,
      dismissed: false,
    });
  }

  return {
    sellers: Array.from(mergedSellers.values()),
    streams: Array.from(mergedStreams.values()).sort((a, b) => (b.scrapedAt || '').localeCompare(a.scrapedAt || '')),
    lastChecked: legacy.lastChecked || null,
    sellerStatuses: legacy.sellerStatuses,
  };
}

export async function addWhatnotSellerCompat(item: Omit<LegacyWhatnotSeller, 'addedAt'>) {
  const normalizedUsername = item.username.toLowerCase().replace(/\s+/g, '');
  const seller = await prisma.whatnotSeller.upsert({
    where: { username: normalizedUsername },
    update: {
      displayName: item.displayName || item.username,
      specialty: item.specialty || '',
      twitterUrl: toNullableString(item.twitterUrl),
      instagramUrl: toNullableString(item.instagramUrl),
      notes: toNullableString(item.notes),
      notifyBefore: item.notifyBefore || 30,
    },
    create: {
      username: normalizedUsername,
      displayName: item.displayName || item.username,
      specialty: item.specialty || '',
      twitterUrl: toNullableString(item.twitterUrl),
      instagramUrl: toNullableString(item.instagramUrl),
      notes: toNullableString(item.notes),
      notifyBefore: item.notifyBefore || 30,
    },
  });

  return {
    username: seller.username,
    displayName: seller.displayName,
    specialty: seller.specialty,
    twitterUrl: seller.twitterUrl ?? undefined,
    instagramUrl: seller.instagramUrl ?? undefined,
    notes: seller.notes ?? undefined,
    notifyBefore: seller.notifyBefore,
    addedAt: seller.createdAt.toISOString(),
  };
}

export async function updateWhatnotSellerCompat(username: string, updates: Partial<LegacyWhatnotSeller>) {
  try {
    const seller = await prisma.whatnotSeller.update({
      where: { username },
      data: {
        displayName: updates.displayName,
        specialty: updates.specialty,
        twitterUrl: updates.twitterUrl === undefined ? undefined : toNullableString(updates.twitterUrl),
        instagramUrl: updates.instagramUrl === undefined ? undefined : toNullableString(updates.instagramUrl),
        notes: updates.notes === undefined ? undefined : toNullableString(updates.notes),
        notifyBefore: updates.notifyBefore,
      },
    });

    return {
      username: seller.username,
      displayName: seller.displayName,
      specialty: seller.specialty,
      twitterUrl: seller.twitterUrl ?? undefined,
      instagramUrl: seller.instagramUrl ?? undefined,
      notes: seller.notes ?? undefined,
      notifyBefore: seller.notifyBefore,
      addedAt: seller.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function removeWhatnotSellerCompat(username: string): Promise<boolean> {
  try {
    await prisma.whatnotSeller.delete({ where: { username } });
    return true;
  } catch {
    return false;
  }
}

export async function addWhatnotStreamCompat(item: Omit<LegacyWhatnotStream, 'id' | 'scrapedAt' | 'source'> & { source?: string }) {
  const created = await prisma.whatnotStream.create({
    data: {
      seller: item.seller,
      title: item.title,
      startTime: item.startTime ? new Date(item.startTime) : null,
      scheduledText: toNullableString(item.scheduledText),
      url: item.url,
      source: item.source || 'manual',
      attending: Boolean(item.attending),
    },
  });

  return {
    id: created.id,
    seller: created.seller,
    title: created.title,
    startTime: created.startTime?.toISOString(),
    scheduledText: created.scheduledText ?? undefined,
    url: created.url,
    source: created.source,
    scrapedAt: created.createdAt.toISOString(),
    attending: created.attending,
    dismissed: false,
  };
}

export async function updateWhatnotStreamCompat(id: string, updates: Partial<LegacyWhatnotStream>) {
  try {
    const stream = await prisma.whatnotStream.update({
      where: { id },
      data: {
        attending: updates.attending,
      },
    });

    return {
      id: stream.id,
      seller: stream.seller,
      title: stream.title,
      startTime: stream.startTime?.toISOString(),
      scheduledText: stream.scheduledText ?? undefined,
      url: stream.url,
      source: stream.source,
      scrapedAt: stream.createdAt.toISOString(),
      attending: stream.attending,
      dismissed: false,
    };
  } catch {
    return null;
  }
}

export async function deleteWhatnotStreamCompat(id: string): Promise<boolean> {
  try {
    await prisma.whatnotStream.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export function readDealsCompat(source: 'craigslist' | 'reddit' | 'all' = 'all'): LegacyDealsData {
  const craigslist = source !== 'reddit'
    ? readDataFile<LegacyDealEntry[]>('craigslist-deals.json', [])
    : [];
  const reddit = source !== 'craigslist'
    ? readDataFile<LegacyDealEntry[]>('reddit-alerts.json', [])
    : [];

  return { craigslist, reddit };
}

export function updateDealDismissedCompat(source: 'craigslist' | 'reddit', id: string, dismissed: boolean): boolean {
  const filename = source === 'reddit' ? 'reddit-alerts.json' : 'craigslist-deals.json';
  const deals = readDataFile<LegacyDealEntry[]>(filename, []);
  const idx = deals.findIndex((deal) => deal.id === id);
  if (idx === -1) return false;
  deals[idx] = { ...deals[idx], dismissed };
  writeDataFile(filename, deals);
  return true;
}

export function clearDismissedDealsCompat(source: 'craigslist' | 'reddit'): number {
  const filename = source === 'reddit' ? 'reddit-alerts.json' : 'craigslist-deals.json';
  const deals = readDataFile<LegacyDealEntry[]>(filename, []);
  const filtered = deals.filter((deal) => !deal.dismissed);
  writeDataFile(filename, filtered);
  return deals.length - filtered.length;
}

export async function readValueHistoryCompat(): Promise<LegacyValueSnapshot[]> {
  const snapshots = await prisma.valueSnapshot.findMany({ orderBy: { date: 'asc' } });
  const legacy = readDataFile<LegacyValueSnapshot[]>('value-history.json', []);
  const merged = new Map<string, LegacyValueSnapshot>();

  for (const entry of legacy) merged.set(entry.date, entry);
  for (const entry of snapshots) {
    merged.set(entry.date, {
      date: entry.date,
      totalValue: entry.totalValue,
      totalCib: entry.totalCib,
      totalPaid: entry.totalPaid,
      gameCount: entry.gameCount,
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function upsertValueSnapshotCompat(entry: LegacyValueSnapshot) {
  const updated = await prisma.valueSnapshot.upsert({
    where: { date: entry.date },
    update: {
      totalValue: entry.totalValue,
      totalCib: entry.totalCib,
      totalPaid: entry.totalPaid,
      gameCount: entry.gameCount,
    },
    create: {
      date: entry.date,
      totalValue: entry.totalValue,
      totalCib: entry.totalCib,
      totalPaid: entry.totalPaid,
      gameCount: entry.gameCount,
    },
  });

  return {
    date: updated.date,
    totalValue: updated.totalValue,
    totalCib: updated.totalCib,
    totalPaid: updated.totalPaid,
    gameCount: updated.gameCount,
  };
}

export function readJsonValueHistoryCompat<T = unknown[]>(): T {
  return readDataFile('value-history.json', [] as T);
}

export function writeJsonSnapshotCompat(filename: string, data: unknown): void {
  writeDataFile(filename, data);
}
