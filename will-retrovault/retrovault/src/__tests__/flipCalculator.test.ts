/**
 * Flip Calculator — Business Logic Tests
 * Tests the fee math, ROI calculation, and break-even logic
 */

import { describe, it, expect } from 'vitest';

const EBAY_FEE = 0.1325;
const SHIPPING = 4.50;

function calcFlip(buyPrice: number, sellPrice: number, feeRate = EBAY_FEE, shippingCost = SHIPPING) {
  const fees = sellPrice * feeRate;
  const netRevenue = sellPrice - fees - shippingCost;
  const profit = netRevenue - buyPrice;
  const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
  const roi = buyPrice > 0 ? (profit / buyPrice) * 100 : 0;
  return { fees, netRevenue, profit, margin, roi };
}

function breakEven(buyPrice: number, feeRate = EBAY_FEE, shippingCost = SHIPPING): number {
  return (buyPrice + shippingCost) / (1 - feeRate);
}

describe('Flip Calculator — fee math', () => {
  it('calculates eBay fees correctly (13.25%)', () => {
    const result = calcFlip(20, 60);
    expect(result.fees).toBeCloseTo(60 * 0.1325, 2);
  });

  it('calculates net revenue correctly', () => {
    const result = calcFlip(20, 60);
    const expectedNet = 60 - (60 * EBAY_FEE) - SHIPPING;
    expect(result.netRevenue).toBeCloseTo(expectedNet, 2);
  });

  it('calculates profit correctly', () => {
    const result = calcFlip(20, 60);
    const expectedNet = 60 - (60 * EBAY_FEE) - SHIPPING;
    expect(result.profit).toBeCloseTo(expectedNet - 20, 2);
  });

  it('calculates ROI correctly', () => {
    const result = calcFlip(10, 30);
    const expectedNet = 30 - (30 * EBAY_FEE) - SHIPPING;
    const expectedRoi = ((expectedNet - 10) / 10) * 100;
    expect(result.roi).toBeCloseTo(expectedRoi, 1);
  });

  it('returns negative profit when selling below cost', () => {
    const result = calcFlip(50, 40);
    expect(result.profit).toBeLessThan(0);
  });

  it('returns zero profit at exact break-even', () => {
    const be = breakEven(20);
    const result = calcFlip(20, be);
    expect(result.profit).toBeCloseTo(0, 1);
  });

  it('handles free local sale (no fees, no shipping)', () => {
    const result = calcFlip(20, 50, 0, 0);
    expect(result.profit).toBeCloseTo(30, 2);
    expect(result.roi).toBeCloseTo(150, 1);
  });

  it('break-even price is above buy price', () => {
    const be = breakEven(30);
    expect(be).toBeGreaterThan(30);
  });

  it('Mercari (10% fee) gives higher net than eBay (13.25%)', () => {
    const ebay = calcFlip(20, 60, 0.1325, 3);
    const mercari = calcFlip(20, 60, 0.10, 3);
    expect(mercari.profit).toBeGreaterThan(ebay.profit);
  });
});

describe('Flip verdict thresholds', () => {
  function getVerdict(roi: number): string {
    if (roi >= 50) return 'STRONG_FLIP';
    if (roi >= 25) return 'GOOD_FLIP';
    if (roi >= 10) return 'THIN_MARGIN';
    if (roi >= 0)  return 'BREAK_EVEN';
    return 'LOSS';
  }

  it('classifies high ROI as STRONG_FLIP', () => {
    const { roi } = calcFlip(10, 40);
    expect(getVerdict(roi)).toBe('STRONG_FLIP');
  });

  it('classifies negative ROI as LOSS', () => {
    const { roi } = calcFlip(50, 40);
    expect(getVerdict(roi)).toBe('LOSS');
  });

  it('classifies break-even correctly', () => {
    const be = breakEven(30);
    const { roi } = calcFlip(30, be);
    expect(getVerdict(roi)).toBe('BREAK_EVEN');
  });
});
