import { describe, expect, it } from 'vitest';
import { calcFlipMetrics, getFlipVerdict } from '@/lib/flipMath';

describe('flipMath helpers', () => {
  it('calculates flip metrics consistently', () => {
    const result = calcFlipMetrics(20, 50, 0.1, 5);

    expect(result.grossRevenue).toBe(50);
    expect(result.fees).toBe(5);
    expect(result.shipping).toBe(5);
    expect(result.netRevenue).toBe(40);
    expect(result.profit).toBe(20);
    expect(result.margin).toBe(40);
    expect(result.roi).toBe(100);
  });

  it('returns verdict bands by ROI', () => {
    expect(getFlipVerdict(60).verdict).toContain('STRONG FLIP');
    expect(getFlipVerdict(30).verdict).toContain('GOOD FLIP');
    expect(getFlipVerdict(15).verdict).toContain('THIN MARGIN');
    expect(getFlipVerdict(1).verdict).toContain('BREAK EVEN');
    expect(getFlipVerdict(-5).verdict).toContain('LOSS');
  });
});
