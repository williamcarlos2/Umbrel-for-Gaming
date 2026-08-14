/**
 * Price Utilities Tests — src/hooks/usePriceData.ts
 *
 * Tests the core pricing math used for Buy/Sell scores, P&L, and ROI.
 * These functions are pure (no side effects), making them ideal for unit testing.
 */

import { describe, it, expect } from 'vitest';
import {
  getCorrectPrice,
  totalMarket,
  totalPaid,
  calcNetProfit,
  calcROI,
  normalizeScore,
  getPriceTrend,
  EBAY_FEE,
  SHIPPING,
} from '@/hooks/usePriceData';
import type { GameItem } from '@/types';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<GameItem> = {}): GameItem {
  return {
    id: 'test-id',
    title: 'Test Game',
    platform: 'NES',
    status: 'owned',
    notes: '',
    isDigital: false,
    marketLoose: '20.00',
    marketCib: '35.00',
    marketNew: '60.00',
    copies: [],
    priceHistory: {},
    ...overrides,
  } as GameItem;
}

function makeCopy(overrides: Partial<GameItem['copies'][0]> = {}): GameItem['copies'][0] {
  return {
    id: 'copy-id',
    condition: 'Loose',
    hasBox: false,
    hasManual: false,
    priceAcquired: '10.00',
    ...overrides,
  };
}

// ─── getCorrectPrice ──────────────────────────────────────────────────────────

describe('getCorrectPrice', () => {
  it('returns 0 for digital games', () => {
    const game = makeGame({ isDigital: true });
    expect(getCorrectPrice(game)).toBe(0);
  });

  it('returns loose price for loose copy', () => {
    const game = makeGame();
    const copy = makeCopy({ condition: 'Loose', hasBox: false, hasManual: false });
    expect(getCorrectPrice(game, copy)).toBe(20);
  });

  it('returns CIB price when copy has box and manual', () => {
    const game = makeGame();
    const copy = makeCopy({ condition: 'Good', hasBox: true, hasManual: true });
    expect(getCorrectPrice(game, copy)).toBe(35);
  });

  it('returns New price for sealed copy', () => {
    const game = makeGame();
    const copy = makeCopy({ condition: 'Sealed' });
    expect(getCorrectPrice(game, copy)).toBe(60);
  });

  it('falls back to loose if no CIB price set', () => {
    const game = makeGame({ marketCib: undefined });
    const copy = makeCopy({ hasBox: true, hasManual: true });
    expect(getCorrectPrice(game, copy)).toBe(20);
  });

  it('returns loose price when called without a copy', () => {
    const game = makeGame();
    expect(getCorrectPrice(game)).toBe(20);
  });
});

// ─── totalMarket ──────────────────────────────────────────────────────────────

describe('totalMarket', () => {
  it('returns 0 for digital games', () => {
    expect(totalMarket(makeGame({ isDigital: true }))).toBe(0);
  });

  it('returns loose price for game with no copies', () => {
    expect(totalMarket(makeGame({ copies: [] }))).toBe(20);
  });

  it('sums market value across multiple copies', () => {
    const copies = [
      makeCopy({ id: '1', condition: 'Loose' }),
      makeCopy({ id: '2', hasBox: true, hasManual: true }),
    ];
    const game = makeGame({ copies });
    // Loose ($20) + CIB ($35) = $55
    expect(totalMarket(game)).toBe(55);
  });
});

// ─── totalPaid ────────────────────────────────────────────────────────────────

describe('totalPaid', () => {
  it('returns 0 for empty copies', () => {
    expect(totalPaid([])).toBe(0);
  });

  it('sums priceAcquired across copies', () => {
    const copies = [
      makeCopy({ id: '1', priceAcquired: '10.00' }),
      makeCopy({ id: '2', priceAcquired: '15.50' }),
    ];
    expect(totalPaid(copies)).toBeCloseTo(25.5);
  });

  it('handles missing or zero priceAcquired', () => {
    const copies = [
      makeCopy({ id: '1', priceAcquired: '' }),
      makeCopy({ id: '2', priceAcquired: '0' }),
    ];
    expect(totalPaid(copies)).toBe(0);
  });
});

// ─── calcNetProfit ────────────────────────────────────────────────────────────

describe('calcNetProfit', () => {
  it('calculates net profit after eBay fees and shipping', () => {
    // $20 market: $20 - ($20 * 13.25%) - $4.50 - $10 buy = $2.85
    const profit = calcNetProfit(20, 10);
    expect(profit).toBeCloseTo(20 - (20 * EBAY_FEE) - SHIPPING - 10, 2);
  });

  it('returns negative when buy price exceeds market minus fees', () => {
    expect(calcNetProfit(10, 20)).toBeLessThan(0);
  });

  it('returns negative when market is zero', () => {
    expect(calcNetProfit(0, 5)).toBeLessThan(0);
  });
});

// ─── calcROI ──────────────────────────────────────────────────────────────────

describe('calcROI', () => {
  it('returns 0 when buy price is 0 (avoid division by zero)', () => {
    expect(calcROI(50, 0)).toBe(0);
  });

  it('returns positive ROI for a good deal', () => {
    // Market $50, paid $5 — good ROI
    expect(calcROI(50, 5)).toBeGreaterThan(0);
  });

  it('returns negative ROI when overpaid', () => {
    expect(calcROI(5, 50)).toBeLessThan(0);
  });
});

// ─── normalizeScore ───────────────────────────────────────────────────────────

describe('normalizeScore', () => {
  it('returns 50 when min equals max (avoid division by zero)', () => {
    expect(normalizeScore(5, 5, 5)).toBe(50);
  });

  it('returns 0 at minimum', () => {
    expect(normalizeScore(0, 0, 100)).toBe(0);
  });

  it('returns 100 at maximum', () => {
    expect(normalizeScore(100, 0, 100)).toBe(100);
  });

  it('returns 50 at midpoint', () => {
    expect(normalizeScore(50, 0, 100)).toBe(50);
  });

  it('clamps below 0', () => {
    expect(normalizeScore(-10, 0, 100)).toBe(0);
  });

  it('clamps above 100', () => {
    expect(normalizeScore(150, 0, 100)).toBe(100);
  });
});

// ─── getPriceTrend ────────────────────────────────────────────────────────────

describe('getPriceTrend', () => {
  it('returns null with no price history', () => {
    expect(getPriceTrend(makeGame({ priceHistory: undefined }))).toBeNull();
  });

  it('returns null with only one data point', () => {
    const game = makeGame({ priceHistory: { '2026-01-01': { loose: '20', cib: '', new: '', graded: '' } } });
    expect(getPriceTrend(game)).toBeNull();
  });

  it('calculates positive trend when price went up', () => {
    const today = new Date().toISOString().split('T')[0];
    const past  = new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0];
    const game  = makeGame({
      priceHistory: {
        [past]:  { loose: '10', cib: '', new: '', graded: '' },
        [today]: { loose: '15', cib: '', new: '', graded: '' },
      }
    });
    const trend = getPriceTrend(game, 30);
    expect(trend).toBeGreaterThan(0);
  });

  it('calculates negative trend when price went down', () => {
    const today = new Date().toISOString().split('T')[0];
    const past  = new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0];
    const game  = makeGame({
      priceHistory: {
        [past]:  { loose: '20', cib: '', new: '', graded: '' },
        [today]: { loose: '10', cib: '', new: '', graded: '' },
      }
    });
    const trend = getPriceTrend(game, 30);
    expect(trend).toBeLessThan(0);
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('Constants', () => {
  it('EBAY_FEE is 13.25%', () => {
    expect(EBAY_FEE).toBe(0.1325);
  });

  it('SHIPPING is $4.50', () => {
    expect(SHIPPING).toBe(4.5);
  });
});
