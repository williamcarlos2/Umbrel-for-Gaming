import { getCopyMarketValue, type CopyPricedItem, type CopyWithCondition } from '@/lib/copyCondition';

export type PriceHistoryEntry = {
  loose?: string | null;
  cib?: string | null;
  new?: string | null;
  graded?: string | null;
  fetchedAt?: string;
};

export type PriceHistoryItem = {
  priceHistory?: Record<string, PriceHistoryEntry>;
};

export function getTotalPaid<T extends { priceAcquired: string }>(copies: T[]): number {
  return copies.reduce((sum, copy) => sum + (parseFloat(copy.priceAcquired) || 0), 0);
}

export function getTotalMarketValue<TItem extends CopyPricedItem, TCopy extends CopyWithCondition>(item: TItem & { copies?: TCopy[] }): number {
  const copies = item.copies || [];
  if (copies.length === 0) return getCopyMarketValue(item);
  return copies.reduce((sum, copy) => sum + getCopyMarketValue(item, copy), 0);
}

export function getPriceTrend(item: PriceHistoryItem, days: number, priceKey: 'loose' | 'cib' = 'loose'): number | null {
  const history = item.priceHistory;
  if (!history) return null;
  const dates = Object.keys(history).sort();
  if (dates.length < 2) return null;

  const todayEntry = history[dates[dates.length - 1]];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const pastDates = dates.filter(d => new Date(d) <= cutoff);
  if (pastDates.length === 0) return null;

  const pastEntry = history[pastDates[pastDates.length - 1]];
  const today = parseFloat(todayEntry[priceKey] || '0');
  const past = parseFloat(pastEntry[priceKey] || '0');
  if (past === 0 || today === 0) return null;

  return (today - past) / past * 100;
}
