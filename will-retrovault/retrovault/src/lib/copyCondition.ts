export type CopyFlags = {
  hasBox: boolean;
  hasManual: boolean;
};

export type CopyPricedItem = {
  platform?: string;
  marketLoose?: string | null;
  marketCib?: string | null;
  marketNew?: string | null;
};

export type CopyWithCondition = CopyFlags & {
  condition?: string;
};

export type CopyBucket = 'cib' | 'partial' | 'loose';

export function getCopyBucket(copy: CopyFlags): CopyBucket {
  if (copy.hasBox && copy.hasManual) return 'cib';
  if (copy.hasBox || copy.hasManual) return 'partial';
  return 'loose';
}

export function hasAnyCopyBucket(copies: CopyFlags[], bucket: CopyBucket): boolean {
  return copies.some(copy => getCopyBucket(copy) === bucket);
}

export function getOwnedCopyBuckets(copies: CopyFlags[], platform?: string) {
  const hasAnyCib = hasAnyCopyBucket(copies, 'cib');
  const hasAnyPartial = hasAnyCopyBucket(copies, 'partial');
  const hasAnyLoose = hasAnyCopyBucket(copies, 'loose');
  const isNes = platform?.toLowerCase().includes('nes');

  return {
    cib: copies.length > 0 ? hasAnyCib : false,
    partial: copies.length > 0 ? hasAnyPartial : false,
    loose: copies.length > 0 ? (hasAnyLoose || (isNes && !hasAnyCib && !hasAnyPartial)) : false,
  };
}

export function getCopyBucketLabel(copy: CopyFlags): 'CIB' | 'PARTIAL' | 'LOOSE' {
  const bucket = getCopyBucket(copy);
  if (bucket === 'cib') return 'CIB';
  if (bucket === 'partial') return 'PARTIAL';
  return 'LOOSE';
}

export function getCopyDisplayLabel(copy: CopyFlags): 'CIB' | 'Box only' | 'Manual only' | 'Loose' {
  if (copy.hasBox && copy.hasManual) return 'CIB';
  if (copy.hasBox) return 'Box only';
  if (copy.hasManual) return 'Manual only';
  return 'Loose';
}

export function getCopyMarketValue(item: CopyPricedItem, copy?: CopyWithCondition): number {
  const baseLoose = parseFloat(String(item.marketLoose ?? '0')) || 0;
  const baseCib = parseFloat(String(item.marketCib ?? '0')) || 0;
  const baseNew = parseFloat(String(item.marketNew ?? '0')) || 0;
  const normalizedPlatform = item.platform?.toLowerCase().trim() || '';
  const isNes = normalizedPlatform === 'nes' || normalizedPlatform === 'nintendo entertainment system';

  if (!copy) {
    return isNes ? baseLoose : (baseCib || baseLoose);
  }

  if (copy.condition === 'Sealed' || copy.condition === 'New/Sealed') {
    return baseNew || baseCib || baseLoose;
  }

  return getCopyBucket(copy) === 'cib' ? (baseCib || baseLoose) : baseLoose;
}
