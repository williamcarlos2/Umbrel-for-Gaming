import { describe, it, expect } from 'vitest';
import {
  findInventoryMatch,
  getCopyFlags,
  buildAcquisitionEntry,
  getWatchlistTargetPresets,
  getFieldEmptyState,
  getMatchConfidence,
} from '@/lib/fieldMode';

describe('Field Mode helpers', () => {
  it('finds an existing inventory match case-insensitively', () => {
    const items = [
      { title: 'Wii Sports', platform: 'Wii', copies: [] },
      { title: 'F-Zero', platform: 'SNES', copies: [] },
    ];

    const found = findInventoryMatch(items, 'wii sports', 'wii');
    expect(found?.title).toBe('Wii Sports');
  });

  it('returns undefined when the title/platform pair does not exist', () => {
    const items = [{ title: 'Wii Sports', platform: 'Wii' }];
    expect(findInventoryMatch(items, 'Wii Play', 'Wii')).toBeUndefined();
  });

  it('maps CIB to box + manual', () => {
    expect(getCopyFlags('CIB')).toEqual({ hasBox: true, hasManual: true });
  });

  it('maps Loose to no box or manual', () => {
    expect(getCopyFlags('Loose')).toEqual({ hasBox: false, hasManual: false });
  });

  it('builds acquisition entries for Field Mode purchases', () => {
    const entry = buildAcquisitionEntry({
      title: 'Wii Sports',
      platform: 'Wii',
      priceAcquired: '8.00',
    });

    expect(entry).toMatchObject({
      gameId: null,
      gameTitle: 'Wii Sports',
      platform: 'Wii',
      source: 'Field Mode',
      cost: '8.00',
      notes: 'Logged from Field Mode',
    });
    expect(entry.purchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('builds watchlist presets from ask and market prices', () => {
    expect(getWatchlistTargetPresets('10', '20')).toEqual({
      askPrice: '10.00',
      belowAsk10: '9.00',
      marketMinus20: '16.00',
    });
  });

  it('returns useful empty-state messages', () => {
    expect(getFieldEmptyState({ query: 'Wii Sports', platform: 'Wii', isOffline: false, hadTimeout: false }))
      .toContain('No match found for Wii Sports on Wii');
    expect(getFieldEmptyState({ query: 'Wii Sports', platform: 'all', isOffline: true, hadTimeout: false }))
      .toContain('Offline and no cached match found');
  });

  it('maps confidence scores to clear labels', () => {
    expect(getMatchConfidence(0.98)).toBe('High confidence match');
    expect(getMatchConfidence(0.8)).toBe('Likely match, verify title');
    expect(getMatchConfidence(0.4)).toBe('Low confidence, verify before saving');
  });
});
