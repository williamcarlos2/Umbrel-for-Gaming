import { describe, expect, it } from 'vitest';
import { getCopyBucket, getCopyBucketLabel, getCopyDisplayLabel, getCopyMarketValue, getOwnedCopyBuckets } from '@/lib/copyCondition';

describe('copyCondition helpers', () => {
  it('classifies copy buckets and labels consistently', () => {
    expect(getCopyBucket({ hasBox: true, hasManual: true })).toBe('cib');
    expect(getCopyBucket({ hasBox: true, hasManual: false })).toBe('partial');
    expect(getCopyBucket({ hasBox: false, hasManual: false })).toBe('loose');

    expect(getCopyBucketLabel({ hasBox: true, hasManual: true })).toBe('CIB');
    expect(getCopyBucketLabel({ hasBox: false, hasManual: true })).toBe('PARTIAL');
    expect(getCopyBucketLabel({ hasBox: false, hasManual: false })).toBe('LOOSE');

    expect(getCopyDisplayLabel({ hasBox: true, hasManual: false })).toBe('Box only');
    expect(getCopyDisplayLabel({ hasBox: false, hasManual: true })).toBe('Manual only');
  });

  it('keeps ownership buckets mutually exclusive for partial copies', () => {
    const buckets = getOwnedCopyBuckets([{ hasBox: true, hasManual: false }], 'Genesis');
    expect(buckets.partial).toBe(true);
    expect(buckets.loose).toBe(false);
    expect(buckets.cib).toBe(false);
  });

  it('uses sealed/new price when copy condition is sealed-like', () => {
    const value = getCopyMarketValue(
      { marketLoose: '20', marketCib: '35', marketNew: '80' },
      { hasBox: true, hasManual: true, condition: 'New/Sealed' }
    );

    expect(value).toBe(80);
  });

  it('uses CIB price for complete copies and loose price otherwise', () => {
    expect(getCopyMarketValue(
      { marketLoose: '20', marketCib: '35' },
      { hasBox: true, hasManual: true }
    )).toBe(35);

    expect(getCopyMarketValue(
      { marketLoose: '20', marketCib: '35' },
      { hasBox: true, hasManual: false }
    )).toBe(20);
  });

  it('uses NES loose fallback for unowned items and CIB fallback elsewhere', () => {
    expect(getCopyMarketValue({ platform: 'NES', marketLoose: '15', marketCib: '40' })).toBe(15);
    expect(getCopyMarketValue({ platform: 'SNES', marketLoose: '15', marketCib: '40' })).toBe(40);
  });
});
