import { describe, expect, it } from 'vitest';
import { evaluateScraperHealth, getScraperHealthSummary } from '@/lib/scraperHealth';

describe('scraperHealth', () => {
  it('marks failed price fetcher runs as critical down state', () => {
    const result = evaluateScraperHealth({
      id: 'price-fetch',
      name: 'PriceCharting Price Fetcher',
      enabled: true,
      status: 'idle',
      lastRunStatus: 'error',
      lastRun: '2026-04-20T12:00:00.000Z',
      cadenceType: 'daily',
      cadenceHour: 0,
    }, Date.parse('2026-04-20T13:00:00.000Z'));

    expect(result.state).toBe('down');
    expect(result.severity).toBe('critical');
  });

  it('treats stale weekly scrapers as warnings', () => {
    const result = evaluateScraperHealth({
      id: 'events-scraper',
      name: 'Gaming Events Scraper',
      enabled: true,
      status: 'idle',
      lastRunStatus: 'success',
      lastRun: '2026-04-01T00:00:00.000Z',
      cadenceType: 'weekly',
      cadenceHour: 6,
    }, Date.parse('2026-04-20T13:00:00.000Z'));

    expect(result.state).toBe('degraded');
    expect(result.severity).toBe('warning');
  });

  it('summarizes only enabled degraded/down scrapers as active issues', () => {
    const summary = getScraperHealthSummary([
      {
        id: 'price-fetch',
        name: 'PriceCharting Price Fetcher',
        enabled: true,
        status: 'idle',
        lastRunStatus: 'error',
        lastRun: '2026-04-20T12:00:00.000Z',
        cadenceType: 'daily',
        cadenceHour: 0,
      },
      {
        id: 'ebay-sold',
        name: 'eBay Sold Listings',
        enabled: false,
        status: 'not_configured',
        cadenceType: 'daily',
        cadenceHour: 2,
      },
    ], Date.parse('2026-04-20T13:00:00.000Z'));

    expect(summary.activeIssueCount).toBe(1);
    expect(summary.criticalCount).toBe(1);
    expect(summary.activeIssues[0].id).toBe('price-fetch');
  });
});
