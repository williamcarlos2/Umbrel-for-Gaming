/**
 * Wishlist & Setup Wizard Achievement Tests
 *
 * Covers:
 * - Wishlist achievement unlock thresholds
 * - Setup Wizard mode achievements
 * - AchievementContext new fields
 */

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, evaluateAchievements, type AchievementContext } from '@/data/achievements';

function makeCtx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    totalOwned: 0, totalPlatforms: 0, totalCatalog: 0, platformCounts: {},
    totalSpent: 0, totalRevenue: 0, totalSales: 0, totalProfit: 0, bestFlipRoi: 0,
    hasMarketData: false, priceHistoryDays: 0, watchlistCount: 0, grailCount: 0, grailsFound: 0,
    playlogCount: 0, gamesBeaten: 0, gamesGivenUp: 0, currentlyPlaying: 0, backlogCount: 0,
    ratingsFive: 0, ratingsOne: 0, criticCount: 0, totalFavorites: 0, totalRegrets: 0,
    totalTags: 0, totalMentions: 0, eventsAttending: 0, conventionSessions: 0, conventionSpent: 0,
    sources: [], sourceCount: 0,
    nesOwned: 0, snesOwned: 0, n64Owned: 0, genesisOwned: 0, dreamcastOwned: 0,
    ps1Owned: 0, ps2Owned: 0, gamecubeOwned: 0, xboxOwned: 0, switchOwned: 0,
    pspOwned: 0, ps3Owned: 0, xbox360Owned: 0, segaCdOwned: 0,
    scraperRuns: 0, dealsDismissed: 0, whatnotSellers: 0, streamsWatched: 0,
    apiKeysCreated: 0, bugReportsFiled: 0, collectionExported: false, csvImported: false,
    valueHistoryDays: 0, uptimeDays: 0,
    setupWizardMode: null, setupWizardDone: false, authConfigured: false, themeCustomized: false,
    wishlistCount: 0, wishlistFound: 0, wishlistShared: false, wishlistMustHaveCount: 0,
    ...overrides,
  };
}

// ─── Wishlist achievements ─────────────────────────────────────────────────────

describe('Wishlist achievements', () => {
  it('wish_first: unlocks at 1 wishlist item', () => {
    expect(evaluateAchievements(makeCtx({ wishlistCount: 0 })).has('wish_first')).toBe(false);
    expect(evaluateAchievements(makeCtx({ wishlistCount: 1 })).has('wish_first')).toBe(true);
  });

  it('wish_five: unlocks at 5 wishlist items', () => {
    expect(evaluateAchievements(makeCtx({ wishlistCount: 4 })).has('wish_five')).toBe(false);
    expect(evaluateAchievements(makeCtx({ wishlistCount: 5 })).has('wish_five')).toBe(true);
    expect(evaluateAchievements(makeCtx({ wishlistCount: 10 })).has('wish_five')).toBe(true);
  });

  it('wish_ten: unlocks at 10 wishlist items', () => {
    expect(evaluateAchievements(makeCtx({ wishlistCount: 9 })).has('wish_ten')).toBe(false);
    expect(evaluateAchievements(makeCtx({ wishlistCount: 10 })).has('wish_ten')).toBe(true);
  });

  it('wish_found1: unlocks at 1 found item', () => {
    expect(evaluateAchievements(makeCtx({ wishlistFound: 0 })).has('wish_found1')).toBe(false);
    expect(evaluateAchievements(makeCtx({ wishlistFound: 1 })).has('wish_found1')).toBe(true);
  });

  it('wish_found5: unlocks at 5 found items', () => {
    expect(evaluateAchievements(makeCtx({ wishlistFound: 4 })).has('wish_found5')).toBe(false);
    expect(evaluateAchievements(makeCtx({ wishlistFound: 5 })).has('wish_found5')).toBe(true);
  });

  it('wish_found10: unlocks at 10 found items', () => {
    expect(evaluateAchievements(makeCtx({ wishlistFound: 9 })).has('wish_found10')).toBe(false);
    expect(evaluateAchievements(makeCtx({ wishlistFound: 10 })).has('wish_found10')).toBe(true);
  });

  it('wish_found1 does not unlock without wish_first', () => {
    // Can find items without having others on the list currently
    const ctx = makeCtx({ wishlistCount: 0, wishlistFound: 1 });
    expect(evaluateAchievements(ctx).has('wish_found1')).toBe(true);
    expect(evaluateAchievements(ctx).has('wish_first')).toBe(false);
  });

  it('wish_shared unlocks when a wishlist share exists', () => {
    expect(evaluateAchievements(makeCtx({ wishlistShared: false })).has('wish_shared')).toBe(false);
    expect(evaluateAchievements(makeCtx({ wishlistShared: true })).has('wish_shared')).toBe(true);
  });

  it('wish_must_have unlocks at 5 must-have wishlist items', () => {
    expect(evaluateAchievements(makeCtx({ wishlistMustHaveCount: 4 })).has('wish_must_have')).toBe(false);
    expect(evaluateAchievements(makeCtx({ wishlistMustHaveCount: 5 })).has('wish_must_have')).toBe(true);
  });
});

// ─── Setup Wizard achievements ────────────────────────────────────────────────

describe('Setup Wizard achievements', () => {
  it('setup_done: unlocks when wizard is completed', () => {
    expect(evaluateAchievements(makeCtx({ setupWizardDone: false })).has('setup_done')).toBe(false);
    expect(evaluateAchievements(makeCtx({ setupWizardDone: true })).has('setup_done')).toBe(true);
  });

  it('setup_collector: only unlocks in collector mode', () => {
    const modes = ['collector', 'dealer', 'empire', null] as const;
    for (const mode of modes) {
      const unlocked = evaluateAchievements(makeCtx({ setupWizardMode: mode }));
      if (mode === 'collector') {
        expect(unlocked.has('setup_collector')).toBe(true);
        expect(unlocked.has('setup_dealer')).toBe(false);
        expect(unlocked.has('setup_empire')).toBe(false);
      } else if (mode === 'dealer') {
        expect(unlocked.has('setup_collector')).toBe(false);
        expect(unlocked.has('setup_dealer')).toBe(true);
        expect(unlocked.has('setup_empire')).toBe(false);
      } else if (mode === 'empire') {
        expect(unlocked.has('setup_collector')).toBe(false);
        expect(unlocked.has('setup_dealer')).toBe(false);
        expect(unlocked.has('setup_empire')).toBe(true);
      } else {
        expect(unlocked.has('setup_collector')).toBe(false);
        expect(unlocked.has('setup_dealer')).toBe(false);
        expect(unlocked.has('setup_empire')).toBe(false);
      }
    }
  });

  it('setup_done + mode = 2 achievements at once', () => {
    const ctx = makeCtx({ setupWizardDone: true, setupWizardMode: 'empire' });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('setup_done')).toBe(true);
    expect(unlocked.has('setup_empire')).toBe(true);
    expect(unlocked.has('setup_collector')).toBe(false);
    expect(unlocked.has('setup_dealer')).toBe(false);
  });

  it('a_auth unlocks only when auth is enabled and has a password hash', () => {
    expect(evaluateAchievements(makeCtx({ authConfigured: false })).has('a_auth')).toBe(false);
    expect(evaluateAchievements(makeCtx({ authConfigured: true })).has('a_auth')).toBe(true);
  });

  it('a_theme unlocks when theme differs from default green', () => {
    expect(evaluateAchievements(makeCtx({ themeCustomized: false })).has('a_theme')).toBe(false);
    expect(evaluateAchievements(makeCtx({ themeCustomized: true })).has('a_theme')).toBe(true);
  });
});

// ─── Achievement registry sanity checks ──────────────────────────────────────

describe('Achievement registry', () => {
  it('all new achievement IDs are unique', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all new achievements have required fields', () => {
    const newIds = [
      'setup_done', 'setup_collector', 'setup_dealer', 'setup_empire', 'setup_rerun',
      'wish_first', 'wish_five', 'wish_ten', 'wish_found1', 'wish_found5', 'wish_found10',
      'wish_shared', 'wish_must_have',
    ];
    for (const id of newIds) {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      expect(a, `Achievement ${id} not found`).toBeDefined();
      expect(a!.name).toBeTruthy();
      expect(a!.icon).toBeTruthy();
      expect(a!.points).toBeGreaterThan(0);
    }
  });

  it('secret achievements are flagged correctly', () => {
    const setupRerun = ACHIEVEMENTS.find(a => a.id === 'setup_rerun');
    expect(setupRerun?.secret).toBe(true);
  });
});
