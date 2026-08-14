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

  it('returns degraded=true when active scraper issues exist', async () => {
    readScraperHealthSummary.mockReturnValue({
      ok: false,
      degraded: true,
      severity: 'critical',
      activeIssueCount: 1,
      activeIssues: [{ id: 'price-fetch', name: 'PriceCharting Price Fetcher' }],
      items: [],
      criticalCount: 1,
      warningCount: 0,
    });

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(true);
    expect(body.activeIssueCount).toBe(1);
  });

  it('returns degraded=false when all scrapers are healthy', async () => {
    readScraperHealthSummary.mockReturnValue({
      ok: true,
      degraded: false,
      severity: 'info',
      activeIssueCount: 0,
      activeIssues: [],
      items: [],
      criticalCount: 0,
      warningCount: 0,
    });

    const route = await loadRoute();
    const response = await route.GET();
    const body = await response.json();

    expect(body.degraded).toBe(false);
  });
});
