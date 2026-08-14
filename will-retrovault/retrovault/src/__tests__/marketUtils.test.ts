import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPriceTrend, getTotalMarketValue, getTotalPaid } from '@/lib/marketUtils';

describe('marketUtils helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-19T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('totals paid across copies', () => {
    expect(getTotalPaid([
      { priceAcquired: '10.00' },
      { priceAcquired: '5.50' },
    ])).toBe(15.5);
  });

  it('totals market value across copies using copy-aware pricing', () => {
    const item = {
      platform: 'SNES',
      marketLoose: '20',
      marketCib: '35',
      copies: [
        { hasBox: false, hasManual: false, priceAcquired: '5' },
        { hasBox: true, hasManual: true, priceAcquired: '10' },
      ],
    };

    expect(getTotalMarketValue(item)).toBe(55);
  });

  it('uses correct keyed price history trend', () => {
    const item = {
      priceHistory: {
        '2026-03-01': { loose: '10', cib: '20' },
        '2026-04-01': { loose: '15', cib: '30' },
      },
    };

    expect(getPriceTrend(item, 30, 'loose')).toBe(50);
    expect(getPriceTrend(item, 30, 'cib')).toBe(50);
  });
});
