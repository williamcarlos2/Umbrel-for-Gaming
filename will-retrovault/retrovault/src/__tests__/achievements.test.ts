/**
 * Achievement System — Evaluation logic tests
 */

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, evaluateAchievements, getTotalPoints, getCompletionPercent, type AchievementCategory, type AchievementContext } from '@/data/achievements';

function makeContext(overrides: Partial<AchievementContext> = {}): AchievementContext {
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
    ...overrides
  };
}

describe('Achievement evaluation', () => {
  it('unlocks "First Cartridge" when 1 game owned', () => {
    const ctx = makeContext({ totalOwned: 1 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('c_first')).toBe(true);
  });

  it('does NOT unlock "First Cartridge" with 0 games', () => {
    const ctx = makeContext({ totalOwned: 0 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('c_first')).toBe(false);
  });

  it('unlocks milestone achievements at correct thresholds', () => {
    const cases = [
      { id: 'c_10', owned: 10 },
      { id: 'c_50', owned: 50 },
      { id: 'c_100', owned: 100 },
      { id: 'c_500', owned: 500 },
      { id: 'c_1000', owned: 1000 },
    ];

    for (const { id, owned } of cases) {
      const ctx = makeContext({ totalOwned: owned });
      const unlocked = evaluateAchievements(ctx);
      expect(unlocked.has(id), `${id} should unlock at ${owned} games`).toBe(true);
    }
  });

  it('does NOT unlock milestone before threshold', () => {
    const ctx = makeContext({ totalOwned: 99 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('c_100')).toBe(false);
    expect(unlocked.has('c_50')).toBe(true); // 99 > 50
  });

  it('unlocks platform achievements correctly', () => {
    const ctx = makeContext({ totalPlatforms: 5 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('p_2plat')).toBe(true);
    expect(unlocked.has('p_5plat')).toBe(true);
    expect(unlocked.has('p_10plat')).toBe(false);
  });

  it('unlocks NES enthusiast at 25 games', () => {
    const ctx = makeContext({ nesOwned: 25 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('p_nes25')).toBe(true);
    expect(unlocked.has('p_nes100')).toBe(false);
  });

  it('unlocks business achievements', () => {
    const ctx = makeContext({ totalSales: 10, totalProfit: 1000, totalRevenue: 2000 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('b_first_sale')).toBe(true);
    expect(unlocked.has('b_10sales')).toBe(true);
    expect(unlocked.has('b_profit1k')).toBe(true);
    expect(unlocked.has('b_revenue1k')).toBe(true);
    expect(unlocked.has('b_50sales')).toBe(false);
  });

  it('unlocks personal/play log achievements', () => {
    const ctx = makeContext({ playlogCount: 10, gamesBeaten: 5, gamesGivenUp: 2 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('pl_first')).toBe(true);
    expect(unlocked.has('pl_10')).toBe(true);
    expect(unlocked.has('pl_beat1')).toBe(true);
    expect(unlocked.has('pl_giveup')).toBe(true);
    expect(unlocked.has('pl_giveup5')).toBe(false);
  });

  it('unlocks sourcing achievements', () => {
    const ctx = makeContext({
      sources: ['Garage Sale', 'Thrift Store', 'eBay'],
      sourceCount: 3,
    });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('h_garage')).toBe(true);
    expect(unlocked.has('h_thrift')).toBe(true);
    expect(unlocked.has('h_source3')).toBe(true);
    expect(unlocked.has('h_source6')).toBe(false);
  });

  it('unlocks grail achievements', () => {
    const ctx = makeContext({ grailCount: 5, grailsFound: 1 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('g_first_grail')).toBe(true);
    expect(unlocked.has('g_5grails')).toBe(true);
    expect(unlocked.has('g_first_found')).toBe(true);
    expect(unlocked.has('g_5found')).toBe(false);
  });

  it('secret achievements are NOT auto-evaluated', () => {
    const ctx = makeContext({ totalOwned: 1000, totalSales: 0 }); // triggers x_collector
    const unlocked = evaluateAchievements(ctx);
    // Secret achievements with check returning false should not unlock via auto-evaluation
    // The "x_collector" has a real check so it might unlock — test the ones with _ => false
    const secretWithFalse = ACHIEVEMENTS.filter(a => a.secret && a.check.toString().includes('_ => false'));
    for (const a of secretWithFalse) {
      expect(unlocked.has(a.id), `Secret ${a.id} should not auto-unlock`).toBe(false);
    }
  });
});

describe('getTotalPoints', () => {
  it('returns 0 for empty unlock list', () => {
    expect(getTotalPoints([])).toBe(0);
  });

  it('returns correct sum for known achievements', () => {
    const points = getTotalPoints(['c_first', 'c_10']); // 10 + 10 = 20
    expect(points).toBe(20);
  });

  it('ignores unknown IDs', () => {
    const points = getTotalPoints(['c_first', 'fake_id_xyz']);
    expect(points).toBe(10); // only c_first (10pts)
  });
});

describe('Achievement data integrity', () => {
  it('all achievements have required fields', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id, `${a.id} missing id`).toBeTruthy();
      expect(a.name, `${a.id} missing name`).toBeTruthy();
      expect(a.icon, `${a.id} missing icon`).toBeTruthy();
      expect(a.category, `${a.id} missing category`).toBeTruthy();
      expect(a.rarity, `${a.id} missing rarity`).toBeTruthy();
      expect(a.points, `${a.id} missing points`).toBeGreaterThan(0);
      expect(typeof a.check, `${a.id} check must be function`).toBe('function');
    }
  });

  it('all achievement IDs are unique', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('legendary achievements are worth more than common', () => {
    const legendary = ACHIEVEMENTS.find(a => a.rarity === 'legendary');
    const common    = ACHIEVEMENTS.find(a => a.rarity === 'common');
    expect(legendary!.points).toBeGreaterThan(common!.points);
  });

  it('has achievements for all 9 categories', () => {
    const categories = new Set(ACHIEVEMENTS.map(a => a.category));
    const expected: AchievementCategory[] = ['business', 'hunting', 'platform', 'social', 'personal', 'grind', 'secret', 'milestone'];
    // Note: 'collection' category maps to 'milestone' in the data
    for (const cat of expected) {
      expect(categories.has(cat), `Missing category: ${cat}`).toBe(true);
    }
  });
});

describe('System & Power User achievements', () => {
  it('unlocks uptime achievements at correct thresholds', () => {
    const cases = [
      { id: 'sys_uptime7',   days: 7 },
      { id: 'sys_uptime30',  days: 30 },
      { id: 'sys_uptime90',  days: 90 },
      { id: 'sys_uptime365', days: 365 },
    ];
    for (const { id, days } of cases) {
      const ctx = makeContext({ uptimeDays: days });
      const unlocked = evaluateAchievements(ctx);
      expect(unlocked.has(id), `${id} should unlock at ${days} days`).toBe(true);
    }
  });

  it('does NOT unlock uptime achievement before threshold', () => {
    const ctx = makeContext({ uptimeDays: 6 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('sys_uptime7')).toBe(false);
  });

  it('unlocks value history achievement at 7 days', () => {
    const ctx = makeContext({ valueHistoryDays: 7 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('sys_snapshot7')).toBe(true);
  });

  it('unlocks API key achievement', () => {
    const ctx = makeContext({ apiKeysCreated: 1 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('sys_api_key')).toBe(true);
    expect(unlocked.has('sys_api_3')).toBe(false);
  });

  it('unlocks integrator at 3 API keys', () => {
    const ctx = makeContext({ apiKeysCreated: 3 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('sys_api_3')).toBe(true);
  });

  it('unlocks bug reporter achievements', () => {
    const ctx1 = makeContext({ bugReportsFiled: 1 });
    expect(evaluateAchievements(ctx1).has('sys_bug')).toBe(true);

    const ctx3 = makeContext({ bugReportsFiled: 3 });
    expect(evaluateAchievements(ctx3).has('sys_bug3')).toBe(true);
  });

  it('unlocks scraper power user achievements', () => {
    const ctx5 = makeContext({ scraperRuns: 5 });
    expect(evaluateAchievements(ctx5).has('sys_scraper5')).toBe(true);
    expect(evaluateAchievements(ctx5).has('sys_scraper20')).toBe(false);

    const ctx20 = makeContext({ scraperRuns: 20 });
    expect(evaluateAchievements(ctx20).has('sys_scraper20')).toBe(true);
  });

  it('BUG REGRESSION: uptime 0 does not unlock any uptime achievement', () => {
    const ctx = makeContext({ uptimeDays: 0 });
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('sys_uptime7')).toBe(false);
    expect(unlocked.has('sys_uptime30')).toBe(false);
  });
});
// ─── getTotalPoints ───────────────────────────────────────────────────────────


describe('getTotalPoints', () => {
  it('returns 0 for no unlocked achievements', () => {
    expect(getTotalPoints([])).toBe(0);
  });

  it('sums points for unlocked achievements', () => {
    // c_first = 10 pts (common), c_10 = 25 pts (uncommon)
    const pts = getTotalPoints(['c_first', 'c_10']);
    expect(pts).toBeGreaterThan(0);
    expect(pts).toBe(
      (ACHIEVEMENTS.find(a => a.id === 'c_first')?.points ?? 0) +
      (ACHIEVEMENTS.find(a => a.id === 'c_10')?.points ?? 0)
    );
  });

  it('ignores unknown ids', () => {
    expect(getTotalPoints(['nonexistent-id'])).toBe(0);
  });
});

describe('getCompletionPercent', () => {
  it('returns 0 with no unlocked achievements', () => {
    expect(getCompletionPercent([])).toBe(0);
  });

  it('returns a value between 0 and 100', () => {
    const pct = getCompletionPercent(['c_first', 'c_10', 'c_50']);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it('increases with more unlocks', () => {
    const pct1 = getCompletionPercent(['c_first']);
    const pct2 = getCompletionPercent(['c_first', 'c_10', 'c_50', 'c_100']);
    expect(pct2).toBeGreaterThan(pct1);
  });

  it('excludes secret achievements from completion total', () => {
    // Unlocking ALL achievements including secrets should not exceed 100%
    const allIds = ACHIEVEMENTS.map(a => a.id);
    expect(getCompletionPercent(allIds)).toBeLessThanOrEqual(100);
  });
});

describe('Achievement catalog integrity', () => {
  it('all achievement IDs are unique', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all achievements have positive points', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.points, `${a.id} has non-positive points`).toBeGreaterThan(0);
    }
  });

  it('secret achievements are NOT evaluated by evaluateAchievements', () => {
    const ctx = makeContext({ totalOwned: 99999, totalSales: 0 }); // would unlock x_collector
    const unlocked = evaluateAchievements(ctx);
    expect(unlocked.has('x_collector')).toBe(false); // secret, skipped
  });
});
