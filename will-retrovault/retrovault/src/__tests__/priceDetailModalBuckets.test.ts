import { describe, expect, it } from 'vitest';
import { getCopyBucket, getCopyBucketLabel, getOwnedCopyBuckets } from '@/lib/copyCondition';

describe('copy condition bucket helpers', () => {
  it('marks a partial copy as partial only, not loose', () => {
    const buckets = getOwnedCopyBuckets([
      { hasBox: true, hasManual: false },
    ], 'Sega Genesis');

    expect(buckets.partial).toBe(true);
    expect(buckets.loose).toBe(false);
    expect(buckets.cib).toBe(false);
  });

  it('marks a loose copy as loose only', () => {
    const buckets = getOwnedCopyBuckets([
      { hasBox: false, hasManual: false },
    ], 'Sega Genesis');

    expect(buckets.loose).toBe(true);
    expect(buckets.partial).toBe(false);
    expect(buckets.cib).toBe(false);
  });

  it('keeps NES fallback from marking partial copies as loose', () => {
    const buckets = getOwnedCopyBuckets([
      { hasBox: true, hasManual: false },
    ], 'NES');

    expect(buckets.partial).toBe(true);
    expect(buckets.loose).toBe(false);
    expect(buckets.cib).toBe(false);
  });

  it('classifies copy buckets consistently', () => {
    expect(getCopyBucket({ hasBox: true, hasManual: true })).toBe('cib');
    expect(getCopyBucket({ hasBox: true, hasManual: false })).toBe('partial');
    expect(getCopyBucket({ hasBox: false, hasManual: false })).toBe('loose');

    expect(getCopyBucketLabel({ hasBox: true, hasManual: true })).toBe('CIB');
    expect(getCopyBucketLabel({ hasBox: false, hasManual: true })).toBe('PARTIAL');
    expect(getCopyBucketLabel({ hasBox: false, hasManual: false })).toBe('LOOSE');
  });
});
