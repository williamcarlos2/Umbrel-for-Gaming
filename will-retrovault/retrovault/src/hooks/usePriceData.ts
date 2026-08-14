"use client";
import type { GameItem } from "@/types";

const EBAY_FEE = 0.1325;
const SHIPPING = 4.5;

/** Get the market price appropriate for a copy's condition */
export function getCorrectPrice(item: GameItem, copy?: GameItem["copies"][0]): number {
  if (item.isDigital) return 0;
  const isSealed = copy?.condition?.toLowerCase().includes("sealed");
  const isCib = copy ? (copy.hasBox && copy.hasManual) : false;
  if (isSealed && item.marketNew) return parseFloat(item.marketNew) || 0;
  if (isCib && item.marketCib) return parseFloat(item.marketCib) || 0;
  return parseFloat(item.marketLoose || "0") || 0;
}

/** Total market value across all copies */
export function totalMarket(item: GameItem): number {
  if (item.isDigital) return 0;
  const copies = item.copies || [];
  if (copies.length === 0) return getCorrectPrice(item);
  return copies.reduce((s, c) => s + getCorrectPrice(item, c), 0);
}

/** Total amount paid across all copies */
export function totalPaid(copies: GameItem["copies"]): number {
  return copies.reduce((s, c) => s + (parseFloat(c.priceAcquired) || 0), 0);
}

/** Net profit after eBay fees and shipping */
export function calcNetProfit(marketPrice: number, buyPrice: number): number {
  return marketPrice - (marketPrice * EBAY_FEE) - SHIPPING - buyPrice;
}

/** ROI percentage */
export function calcROI(marketPrice: number, buyPrice: number): number {
  if (buyPrice <= 0) return 0;
  return (calcNetProfit(marketPrice, buyPrice) / buyPrice) * 100;
}

/** Normalize score 0-100 across a range */
export function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.round(Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)));
}

/** Get 30-day price trend % */
export function getPriceTrend(item: GameItem, days = 30): number | null {
  const history = item.priceHistory;
  if (!history) return null;
  const dates = Object.keys(history).sort();
  if (dates.length < 2) return null;
  const latest = parseFloat(history[dates[dates.length - 1]]?.loose || "0");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const pastDates = dates.filter(d => new Date(d) <= cutoff);
  if (!pastDates.length) return null;
  const past = parseFloat(history[pastDates[pastDates.length - 1]]?.loose || "0");
  if (!past || !latest) return null;
  return ((latest - past) / past) * 100;
}

export { EBAY_FEE, SHIPPING };
