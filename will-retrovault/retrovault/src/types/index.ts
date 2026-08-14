/**
 * RetroVault — Shared Type Definitions
 *
 * Import from here rather than redefining types per-file:
 *   import type { GameItem, Person, GameCopy } from '@/types';
 */

// ─── Core Game Types ──────────────────────────────────────────────────────────

export type GameCopy = {
  id: string;
  hasBox: boolean;
  hasManual: boolean;
  priceAcquired: string;
  condition: string;
};

export type PriceHistoryEntry = {
  loose: string | null;
  cib: string | null;
  new: string | null;
  graded: string | null;
  fetchedAt?: string;
};

export type GameItem = {
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
  source?: string;
  isDigital?: boolean;
  copies: GameCopy[];
};

// ─── People & Social ──────────────────────────────────────────────────────────

export type Person = {
  id: string;
  name: string;
  color?: string | null;
};

export type PlayerData = {
  people: Person[];
  favorites: Record<string, string[]>;  // personId → gameId[]
  regrets: Record<string, string[]>;    // personId → gameId[]
};

export type CriticData = PlayerData;

// ─── Business Types ───────────────────────────────────────────────────────────

export type SaleEntry = {
  id: string;
  gameId?: string;
  gameTitle: string;
  platform?: string;
  salePrice: string;
  saleDate: string;
  condition?: string;
  notes?: string;
};

export type AcquisitionEntry = {
  id: string;
  gameId?: string;
  gameTitle: string;
  platform?: string;
  cost: string;
  purchaseDate: string;
  source?: string;
  notes?: string;
};

export type WatchlistItem = {
  id: string;
  title: string;
  platform: string;
  alertPrice: string;
  marketLoose?: string;
  notes?: string;
};

// ─── Collection Tools ─────────────────────────────────────────────────────────

export type GrailEntry = {
  id: string;
  title: string;
  platform: string;
  notes?: string;
  priority: 1 | 2 | 3;
  addedAt: string;
  acquiredAt?: string;
};

export type PlayLogEntry = {
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

// ─── Tags & Mentions ──────────────────────────────────────────────────────────

export type MentionEntry = {
  id: string;
  entityId: string;
  entityType: 'game' | 'platform';
  entityName: string;
  fromPerson: string;
  toPerson: string;
  message: string;
  createdAt: string;
};

export type TagsData = {
  gameTags: Record<string, string[]>;     // gameId → tag[]
  platformTags: Record<string, string[]>; // platformId → tag[]
  mentions: Record<string, MentionEntry[]>; // personId → mentions[]
};

// ─── Events ───────────────────────────────────────────────────────────────────

export type GameEvent = {
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

// ─── Config ───────────────────────────────────────────────────────────────────

export type Features = {
  business: boolean;
  fieldTools: boolean;
  social: boolean;
  personal: boolean;
  media: boolean;
};

export type AppConfig = {
  appName: string;
  tagline: string;
  ownerName: string;
  themeColor: string;
  currency: string;
  dateFormat: string;
  region: string;
  publicUrl: string;
  standaloneMode: boolean;
  auth: { enabled: boolean; passwordHash: string };
  plex: { url: string; token: string };
  fetchScheduleHour: number;
  priceDataSource: string;
  autoSatisfyWishlistOnVaultAdd?: boolean;
  githubRepo: string;
  scrapers: { craigslistCity: string };
  features: Features;
  platforms: string[];
  apiKeys?: ApiKey[];
};

export type ApiKey = {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  permissions: 'read' | 'write';
  createdAt: string;
  lastUsed?: string;
};

// ─── Computed / UI Types ──────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';

export type FilterAction =
  | 'owned' | 'unowned' | 'all' | 'sell'
  | `fav_${string}` | `reg_${string}`;

export type ViewMode = 'table' | 'cards';

export type ScoreData = {
  minSell: number;
  maxSell: number;
  minBuy: number;
  maxBuy: number;
};
