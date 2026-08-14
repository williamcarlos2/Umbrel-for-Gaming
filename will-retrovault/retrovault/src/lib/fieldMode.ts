export type CopyCondition = "Loose" | "CIB" | "New/Sealed" | "Good";

export const CONDITION_OPTIONS: CopyCondition[] = ["Loose", "CIB", "New/Sealed", "Good"];

export function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function findInventoryMatch<T extends { title: string; platform: string }>(
  items: T[],
  title: string,
  platform: string
): T | undefined {
  const t = normalizeText(title);
  const p = normalizeText(platform);
  return items.find(item => normalizeText(item.title) === t && normalizeText(item.platform) === p);
}

export function getCopyFlags(condition: CopyCondition) {
  const hasBox = condition === 'CIB' || condition === 'New/Sealed';
  const hasManual = condition === 'CIB' || condition === 'New/Sealed';
  return { hasBox, hasManual };
}

export function buildFieldCopy(condition: CopyCondition, priceAcquired: string) {
  const { hasBox, hasManual } = getCopyFlags(condition);
  return {
    id: Math.random().toString(36).slice(2, 10),
    hasBox,
    hasManual,
    priceAcquired: priceAcquired || '0.00',
    condition,
  };
}

export function buildAcquisitionEntry(input: {
  title: string;
  platform: string;
  priceAcquired: string;
  notes?: string;
  source?: string;
  gameId?: string;
}) {
  return {
    gameId: input.gameId || null,
    gameTitle: input.title,
    platform: input.platform,
    source: input.source || 'Field Mode',
    cost: input.priceAcquired || '0.00',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: input.notes || 'Logged from Field Mode',
  };
}

export function getWatchlistTargetPresets(askPrice: string, loosePrice: string | null) {
  const ask = parseFloat(askPrice || '0');
  const loose = parseFloat(loosePrice || '0');

  return {
    askPrice: ask > 0 ? ask.toFixed(2) : null,
    belowAsk10: ask > 0 ? (ask * 0.9).toFixed(2) : null,
    marketMinus20: loose > 0 ? (loose * 0.8).toFixed(2) : null,
  };
}

export function getFieldEmptyState(params: {
  query: string;
  platform: string;
  isOffline: boolean;
  hadTimeout: boolean;
}) {
  if (!params.query.trim()) return 'Search for a title to start.';
  if (params.isOffline) return 'Offline and no cached match found. Cache this platform before the next show.';
  if (params.hadTimeout) return 'Live price lookup timed out. Try again, or use your offline cache if you have one.';
  if (params.platform !== 'all') return `No match found for ${params.query} on ${params.platform}. Check spelling or try ALL PLATFORMS.`;
  return `No match found for ${params.query}. Check spelling or try a specific platform.`;
}

export function getMatchConfidence(confidence?: number) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) return null;
  if (confidence >= 0.95) return 'High confidence match';
  if (confidence >= 0.75) return 'Likely match, verify title';
  return 'Low confidence, verify before saving';
}
