import { beforeEach, describe, expect, it, vi } from 'vitest';

const readScraperHealthSummary = vi.fn();

vi.mock('@/lib/scraperHealth', () => ({
  readScraperHealthSummary,
}));

async function loadRoute() {
  return import('@/app/api/scraper-health/route');
}

describe('/api/scraper-health route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns the shared scraper health summary', async () => {
    readScraperHealthSummary.mockReturnValue({
      ok: false,
      degraded: true,
      severity: 'critical',
      activeIssueCount: 1,
      criticalCount: 1,
      warningCount: 0,
      items: [],
      activeIssues: [{ id: 'price-fetch', name: 'PriceCharting Price Fetcher' }],
    });

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(true);
    expect(body.activeIssueCount).toBe(1);
  });
});
