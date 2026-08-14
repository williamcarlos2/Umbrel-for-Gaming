import { readDataFile } from '@/lib/data';

export type ScraperCadence = 'hourly' | 'daily' | 'weekly' | 'on-demand';

export type ScraperRecord = {
  id: string;
  name: string;
  description?: string | null;
  enabled?: boolean;
  status?: string | null;
  lastRun?: string | null;
  lastRunStatus?: string | null;
  cadenceType?: ScraperCadence | null;
  cadenceHour?: number | null;
  featureGroup?: string | null;
  logFile?: string | null;
  script?: string | null;
};

export type ScraperHealthSeverity = 'info' | 'warning' | 'critical';
export type ScraperHealthState = 'healthy' | 'degraded' | 'down' | 'not_configured' | 'paused';

export type ScraperHealthItem = {
  id: string;
  name: string;
  state: ScraperHealthState;
  severity: ScraperHealthSeverity;
  enabled: boolean;
  featureGroup: string | null;
  message: string;
  userImpact: string;
  lastRun: string | null;
  lastRunStatus: string | null;
  status: string | null;
  cadenceType: ScraperCadence | null;
  cadenceHour: number | null;
  logFile: string | null;
};

const IMPACT_BY_SCRAPER: Record<string, string> = {
  'price-fetch': 'Price data may be stale across inventory, field mode, and analytics.',
  'pricecharting-trending': 'Trending market signals may be incomplete.',
  'events-scraper': 'Convention and event discovery may be incomplete.',
  'craigslist-local': 'Local deal sourcing results may be outdated.',
  'ebay-sold': 'Cross-check sale comps may be incomplete.',
  'reddit-gameswap': 'Trade opportunities may be missing from watch surfaces.',
  'whatnot-watcher': 'Upcoming stream visibility may be incomplete.',
  'catalog-scraper': 'Platform catalog freshness may lag behind new titles.',
  'value-snapshot': 'Value history charts may miss recent daily snapshots.',
  'youtube-cache': 'Video lookup freshness may be limited.',
};

function getStaleThresholdMs(cadenceType: ScraperCadence | null | undefined, cadenceHour: number | null | undefined) {
  switch (cadenceType) {
    case 'hourly':
      return Math.max(1, cadenceHour || 1) * 3 * 60 * 60 * 1000;
    case 'daily':
      return 36 * 60 * 60 * 1000;
    case 'weekly':
      return 10 * 24 * 60 * 60 * 1000;
    case 'on-demand':
    default:
      return null;
  }
}

function getUserImpact(scraper: ScraperRecord) {
  return IMPACT_BY_SCRAPER[scraper.id] || 'Some automated data in this area may be stale or incomplete.';
}

export function evaluateScraperHealth(scraper: ScraperRecord, now = Date.now()): ScraperHealthItem {
  const enabled = scraper.enabled !== false;
  const lastRunTime = scraper.lastRun ? new Date(scraper.lastRun).getTime() : null;
  const staleThreshold = getStaleThresholdMs(scraper.cadenceType, scraper.cadenceHour);
  const stale = Boolean(lastRunTime && staleThreshold && now - lastRunTime > staleThreshold);

  let state: ScraperHealthState = 'healthy';
  let severity: ScraperHealthSeverity = 'info';
  let message = 'Scraper is healthy.';

  if (!enabled) {
    state = scraper.status === 'not_configured' ? 'not_configured' : 'paused';
    severity = 'info';
    message = scraper.status === 'not_configured' ? 'Scraper is not configured.' : 'Scraper is disabled.';
  } else if (scraper.status === 'error' || scraper.lastRunStatus === 'error') {
    state = 'down';
    severity = scraper.id === 'price-fetch' ? 'critical' : 'warning';
    message = 'Latest scraper run failed.';
  } else if (stale) {
    state = 'degraded';
    severity = scraper.id === 'price-fetch' ? 'critical' : 'warning';
    message = 'Scraper data looks stale for its expected cadence.';
  } else if (!scraper.lastRun && scraper.cadenceType !== 'on-demand') {
    state = 'degraded';
    severity = 'warning';
    message = 'Scraper has not completed an initial run yet.';
  }

  return {
    id: scraper.id,
    name: scraper.name,
    state,
    severity,
    enabled,
    featureGroup: scraper.featureGroup || null,
    message,
    userImpact: getUserImpact(scraper),
    lastRun: scraper.lastRun || null,
    lastRunStatus: scraper.lastRunStatus || null,
    status: scraper.status || null,
    cadenceType: scraper.cadenceType || null,
    cadenceHour: scraper.cadenceHour ?? null,
    logFile: scraper.logFile || null,
  };
}

export function getScraperHealthSummary(scrapers: ScraperRecord[], now = Date.now()) {
  const items = scrapers.map((scraper) => evaluateScraperHealth(scraper, now));
  const activeIssues = items.filter((item) => item.enabled && (item.state === 'degraded' || item.state === 'down'));
  const criticalCount = activeIssues.filter((item) => item.severity === 'critical').length;
  const warningCount = activeIssues.filter((item) => item.severity === 'warning').length;

  return {
    ok: activeIssues.length === 0,
    degraded: activeIssues.length > 0,
    severity: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'info',
    criticalCount,
    warningCount,
    activeIssueCount: activeIssues.length,
    items,
    activeIssues,
  };
}

export function readScraperHealthSummary(now = Date.now()) {
  const scrapers = readDataFile<ScraperRecord[]>('scrapers.json', []);
  return getScraperHealthSummary(scrapers, now);
}
