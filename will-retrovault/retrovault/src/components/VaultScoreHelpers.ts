/**
 * Buy/Sell score computation helpers for the Vault
 */

import type { GameItem } from "@/types";
import { totalMarket, totalPaid, getPriceTrend, normalizeScore } from "@/hooks/usePriceData";

export type ScoreContext = {
  minSell: number; maxSell: number;
  minBuy: number;  maxBuy: number;
};

export function computeScores(items: GameItem[]): ScoreContext {
  const sellDeltas: number[] = [];
  const buyPrices: number[] = [];

  for (const item of items) {
    const copies = item.copies || [];
    const qty = copies.length;
    const market = totalMarket(item);
    const paid = totalPaid(copies);

    if (qty > 0 && paid > 0 && market > 0 && !item.isDigital) {
      sellDeltas.push((market - paid) / paid * 100);
    }
    if (market > 0 && !item.isDigital) {
      buyPrices.push(market);
    }
  }

  return {
    minSell: Math.min(...sellDeltas, 0),
    maxSell: Math.max(...sellDeltas, 0),
    minBuy:  Math.min(...buyPrices, 0),
    maxBuy:  Math.max(...buyPrices, 0),
  };
}

export function getSellScore(item: GameItem, ctx: ScoreContext): number {
  const copies = item.copies || [];
  if (copies.length === 0 || item.isDigital) return 0;
  const market = totalMarket(item);
  const paid = totalPaid(copies);
  if (market <= 0 || paid <= 0) return 0;
  const delta = (market - paid) / paid * 100;
  const base = normalizeScore(delta, ctx.minSell, ctx.maxSell);
  const trend = getPriceTrend(item) ?? 0;
  const trendAdj = Math.max(-20, Math.min(20, trend * 2));
  return Math.max(0, Math.min(100, Math.round(base * 0.7 + (50 + trendAdj) * 0.3)));
}

export function getBuyScore(item: GameItem, ctx: ScoreContext): number {
  if (item.isDigital) return 0;
  const market = totalMarket(item);
  if (market <= 0) return 0;
  const base = 100 - normalizeScore(market, ctx.minBuy, ctx.maxBuy);
  const trend = getPriceTrend(item) ?? 0;
  const trendAdj = Math.max(-20, Math.min(20, -trend * 2));
  return Math.max(0, Math.min(100, Math.round(base * 0.7 + (50 + trendAdj) * 0.3)));
}

export function getNostalgiaScore(
  item: GameItem,
  fanCount: number
): number {
  const copies = item.copies || [];
  const qty = copies.length;
  if (qty === 0) return 0;
  const market = totalMarket(item);
  const paid = totalPaid(copies);
  const holdTime = item.purchaseDate
    ? (Date.now() - new Date(item.purchaseDate).getTime()) / 86400000 / 30
    : 0;
  const score =
    (fanCount * 25) +
    (qty > 1 ? 20 : 0) +
    Math.min(30, holdTime * 2) +
    (market > 0 && paid > 0 ? Math.min(25, ((market - paid) / paid) * 25) : 0);
  return Math.min(100, Math.round(score));
}
