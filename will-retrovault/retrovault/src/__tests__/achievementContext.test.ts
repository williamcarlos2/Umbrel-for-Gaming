import { describe, expect, it, vi, beforeEach } from 'vitest';

const readDataFileMock = vi.fn();
const evaluateAchievementsMock = vi.fn();
const prismaMock = {
  wishlistShare: {
    findFirst: vi.fn(),
  },
  wishlistItem: {
    count: vi.fn(),
  },
};

vi.mock('@/lib/data', () => ({
  readDataFile: (...args: Parameters<typeof readDataFileMock>) => readDataFileMock(...args),
}));

vi.mock('@/data/achievements', () => ({
  evaluateAchievements: (...args: Parameters<typeof evaluateAchievementsMock>) => evaluateAchievementsMock(...args),
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

describe('achievementContext', () => {
  beforeEach(() => {
    vi.resetModules();
    readDataFileMock.mockReset();
    evaluateAchievementsMock.mockReset();
    prismaMock.wishlistShare.findFirst.mockResolvedValue({ token: 'wish123' });
    prismaMock.wishlistItem.count.mockResolvedValue(5);
    readDataFileMock.mockImplementation((file: string, fallback: unknown) => {
      const map: Record<string, unknown> = {
        'inventory.json': [
          { title: 'Sonic', platform: 'Sega Genesis', copies: [{ priceAcquired: '10' }], source: 'Garage Sale', marketLoose: 20 },
          { title: 'Mario', platform: 'NES', copies: [{ priceAcquired: '15' }], source: 'Convention', marketLoose: 30 },
        ],
        'sales.json': { sales: [{ gameId: 'g1', salePrice: '40' }], acquisitions: [{ gameId: 'g1', cost: '10' }] },
        'favorites.json': { people: [{ id: 'p1', name: 'Alex' }], favorites: { p1: ['g1'] }, regrets: { p1: [] } },
        'playlog.json': [{ status: 'beat', rating: 5 }],
        'grails.json': [{ acquiredAt: null }],
        'watchlist.json': [{ id: 'w1' }],
        'tags.json': { gameTags: { g1: ['shmup'] }, platformTags: {}, mentions: { g1: [{ id: 'm1' }] } },
        'events.json': [{ attending: true }],
        'whatnot.json': { sellers: [{ username: 'seller1' }], streams: [{ attending: true }] },
        'scrapers.json': [{ lastRun: '2026-04-20T00:00:00.000Z' }],
        'craigslist-deals.json': [{ dismissed: true }],
        'value-history.json': [{ date: '2026-04-18' }, { date: '2026-04-19' }],
        'bug-reports.json': [{ id: 'b1' }],
        'app.config.json': { apiKeys: [{ id: 'k1' }], setupWizardMode: 'empire', setupWizardVersion: '2', auth: { enabled: true, passwordHash: 'hash123' }, themeColor: 'amber' },
      };
      return (file in map ? map[file] : fallback) as unknown;
    });
    evaluateAchievementsMock.mockReturnValue(new Set(['setup_empire', 'wish_first']));
  });

  it('builds a stable achievement payload from current runtime sources', async () => {
    const mod = await import('@/lib/achievementContext');
    const payload = await mod.buildAchievementPayload();

    expect(payload.context.totalOwned).toBe(2);
    expect(payload.context.totalPlatforms).toBe(2);
    expect(payload.context.totalSpent).toBe(25);
    expect(payload.context.totalRevenue).toBe(40);
    expect(payload.context.bestFlipRoi).toBe(300);
    expect(payload.context.watchlistCount).toBe(1);
    expect(payload.context.grailCount).toBe(1);
    expect(payload.context.eventsAttending).toBe(1);
    expect(payload.context.scraperRuns).toBe(1);
    expect(payload.context.apiKeysCreated).toBe(1);
    expect(payload.context.setupWizardMode).toBe('empire');
    expect(payload.context.setupWizardDone).toBe(true);
    expect(payload.context.authConfigured).toBe(true);
    expect(payload.context.themeCustomized).toBe(true);
    expect(payload.context.wishlistShared).toBe(true);
    expect(payload.context.wishlistMustHaveCount).toBe(5);
    expect(payload.autoCount).toBe(2);
    expect(payload.unlockedIds).toEqual(expect.arrayContaining(['setup_empire', 'wish_first']));
  });
});
