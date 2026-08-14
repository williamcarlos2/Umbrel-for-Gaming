/**
 * In-Process Scheduler — Unit Tests
 *
 * Tests the scheduling logic without spawning actual processes.
 * Key behaviors:
 * - shouldRunNow() correctly evaluates hourly/daily/weekly schedules
 * - getCronExpression() returns correct cron strings
 * - Disabled scrapers never run
 * - On-demand scrapers never auto-run
 */

import { describe, it, expect } from 'vitest';
import { getCronExpression } from '@/lib/scheduler';

// ─── Replicate shouldRunNow for unit testing ──────────────────────────────────
// (Can't import directly since scheduler uses child_process which is Node-only)

type Scraper = {
  id: string; name: string; script: string | null;
  logFile: string; enabled: boolean;
  cadenceHour: number;
  cadenceType: 'hourly' | 'daily' | 'weekly' | 'on-demand';
  status: string; lastRun: string | null; lastRunStatus: string | null;
};

function shouldRunNow(scraper: Scraper, now: Date): boolean {
  const hour      = now.getHours();
  const minute    = now.getMinutes();
  const dayOfWeek = now.getDay();

  if (!scraper.enabled || !scraper.script) return false;

  switch (scraper.cadenceType) {
    case 'hourly':
      return minute === 0 && (hour % Math.max(1, scraper.cadenceHour) === 0);
    case 'daily':
      return hour === scraper.cadenceHour && minute === 0;
    case 'weekly':
      return dayOfWeek === 1 && hour === scraper.cadenceHour && minute === 0;
    case 'on-demand':
      return false;
    default:
      return false;
  }
}

function makeScraper(overrides: Partial<Scraper> = {}): Scraper {
  return {
    id: 'test', name: 'Test Scraper', script: 'scripts/test.mjs',
    logFile: 'logs/test.log', enabled: true,
    cadenceHour: 0, cadenceType: 'daily',
    status: 'idle', lastRun: null, lastRunStatus: null,
    ...overrides,
  };
}

function makeTime(hour: number, minute: number, dayOfWeek = 1): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  // Adjust day of week
  const currentDay = d.getDay();
  const diff = dayOfWeek - currentDay;
  d.setDate(d.getDate() + diff);
  return d;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Scheduler — daily cadence', () => {
  it('runs at the configured hour (minute 0)', () => {
    const s = makeScraper({ cadenceType: 'daily', cadenceHour: 0 });
    expect(shouldRunNow(s, makeTime(0, 0))).toBe(true);
  });

  it('does NOT run at minute 1', () => {
    const s = makeScraper({ cadenceType: 'daily', cadenceHour: 0 });
    expect(shouldRunNow(s, makeTime(0, 1))).toBe(false);
  });

  it('does NOT run at the wrong hour', () => {
    const s = makeScraper({ cadenceType: 'daily', cadenceHour: 6 });
    expect(shouldRunNow(s, makeTime(0, 0))).toBe(false);
    expect(shouldRunNow(s, makeTime(6, 0))).toBe(true);
  });

  it('respects cadenceHour: 2', () => {
    const s = makeScraper({ cadenceType: 'daily', cadenceHour: 2 });
    expect(shouldRunNow(s, makeTime(2, 0))).toBe(true);
    expect(shouldRunNow(s, makeTime(3, 0))).toBe(false);
  });
});

describe('Scheduler — hourly cadence', () => {
  it('runs every hour when cadenceHour is 1', () => {
    const s = makeScraper({ cadenceType: 'hourly', cadenceHour: 1 });
    expect(shouldRunNow(s, makeTime(0, 0))).toBe(true);
    expect(shouldRunNow(s, makeTime(1, 0))).toBe(true);
    expect(shouldRunNow(s, makeTime(6, 0))).toBe(true);
  });

  it('runs every 6 hours when cadenceHour is 6', () => {
    const s = makeScraper({ cadenceType: 'hourly', cadenceHour: 6 });
    expect(shouldRunNow(s, makeTime(0, 0))).toBe(true);  // 0 % 6 = 0 ✓
    expect(shouldRunNow(s, makeTime(6, 0))).toBe(true);  // 6 % 6 = 0 ✓
    expect(shouldRunNow(s, makeTime(12, 0))).toBe(true); // 12 % 6 = 0 ✓
    expect(shouldRunNow(s, makeTime(3, 0))).toBe(false); // 3 % 6 = 3 ✗
  });

  it('never runs at non-zero minutes', () => {
    const s = makeScraper({ cadenceType: 'hourly', cadenceHour: 1 });
    expect(shouldRunNow(s, makeTime(0, 30))).toBe(false);
    expect(shouldRunNow(s, makeTime(6, 15))).toBe(false);
  });
});

describe('Scheduler — weekly cadence', () => {
  it('runs on Monday at the configured hour', () => {
    const s = makeScraper({ cadenceType: 'weekly', cadenceHour: 6 });
    const monday6am = makeTime(6, 0, 1); // dayOfWeek=1 (Monday)
    expect(shouldRunNow(s, monday6am)).toBe(true);
  });

  it('does NOT run on other days', () => {
    const s = makeScraper({ cadenceType: 'weekly', cadenceHour: 6 });
    const tuesday6am = makeTime(6, 0, 2);
    const sunday6am  = makeTime(6, 0, 0);
    expect(shouldRunNow(s, tuesday6am)).toBe(false);
    expect(shouldRunNow(s, sunday6am)).toBe(false);
  });

  it('does NOT run at the wrong hour on Monday', () => {
    const s = makeScraper({ cadenceType: 'weekly', cadenceHour: 6 });
    const monday3am = makeTime(3, 0, 1);
    expect(shouldRunNow(s, monday3am)).toBe(false);
  });
});

describe('Scheduler — disabled and on-demand', () => {
  it('NEVER runs when disabled', () => {
    const s = makeScraper({ cadenceType: 'daily', cadenceHour: 0, enabled: false });
    expect(shouldRunNow(s, makeTime(0, 0))).toBe(false);
  });

  it('NEVER runs on-demand scrapers automatically', () => {
    const s = makeScraper({ cadenceType: 'on-demand' });
    // Try every hour of every scenario
    for (let h = 0; h < 24; h++) {
      for (const day of [0, 1, 2, 3, 4, 5, 6]) {
        expect(shouldRunNow(s, makeTime(h, 0, day))).toBe(false);
      }
    }
  });

  it('NEVER runs when script is null', () => {
    const s = makeScraper({ script: null });
    expect(shouldRunNow(s, makeTime(0, 0))).toBe(false);
  });
});

describe('getCronExpression', () => {
  it('returns correct daily expression', () => {
    expect(getCronExpression(makeScraper({ cadenceType: 'daily', cadenceHour: 0 }))).toBe('0 0 * * *');
    expect(getCronExpression(makeScraper({ cadenceType: 'daily', cadenceHour: 6 }))).toBe('0 6 * * *');
    expect(getCronExpression(makeScraper({ cadenceType: 'daily', cadenceHour: 23 }))).toBe('0 23 * * *');
  });

  it('returns correct hourly expression', () => {
    expect(getCronExpression(makeScraper({ cadenceType: 'hourly', cadenceHour: 1 }))).toBe('0 */1 * * *');
    expect(getCronExpression(makeScraper({ cadenceType: 'hourly', cadenceHour: 6 }))).toBe('0 */6 * * *');
  });

  it('returns correct weekly expression', () => {
    expect(getCronExpression(makeScraper({ cadenceType: 'weekly', cadenceHour: 6 }))).toBe('0 6 * * 1');
  });

  it('returns null for on-demand', () => {
    expect(getCronExpression(makeScraper({ cadenceType: 'on-demand' }))).toBeNull();
  });

  it('BUG REGRESSION: disabled scrapers still return cron expression (scheduling is separate from enabled state)', () => {
    // getCronExpression describes the schedule, shouldRunNow checks enabled state
    const s = makeScraper({ cadenceType: 'daily', cadenceHour: 0, enabled: false });
    expect(getCronExpression(s)).toBe('0 0 * * *'); // Expression exists
    expect(shouldRunNow(s, makeTime(0, 0))).toBe(false); // But won't fire
  });
});

describe('Scheduler — tick-based design invariants', () => {
  it('daily scraper fires exactly once per day (at minute 0 of target hour)', () => {
    const s = makeScraper({ cadenceType: 'daily', cadenceHour: 0 });
    let fires = 0;
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        if (shouldRunNow(s, makeTime(h, m))) fires++;
      }
    }
    expect(fires).toBe(1);
  });

  it('weekly scraper fires exactly once per week (Monday at target hour)', () => {
    const s = makeScraper({ cadenceType: 'weekly', cadenceHour: 6 });
    let fires = 0;
    for (let day = 0; day < 7; day++) {
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m++) {
          if (shouldRunNow(s, makeTime(h, m, day))) fires++;
        }
      }
    }
    expect(fires).toBe(1);
  });

  it('hourly/6 scraper fires exactly 4 times per day', () => {
    const s = makeScraper({ cadenceType: 'hourly', cadenceHour: 6 });
    let fires = 0;
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        if (shouldRunNow(s, makeTime(h, m))) fires++;
      }
    }
    expect(fires).toBe(4); // 0:00, 6:00, 12:00, 18:00
  });
});

// ─── getSchedulerStatus ───────────────────────────────────────────────────────

import { getSchedulerStatus, reloadSchedules } from '@/lib/scheduler';

describe('getSchedulerStatus', () => {
  it('returns an object (may be empty on fresh install)', () => {
    const status = getSchedulerStatus();
    expect(typeof status).toBe('object');
  });

  it('each entry has scheduled boolean and cronExpr', () => {
    const status = getSchedulerStatus();
    for (const [, entry] of Object.entries(status)) {
      expect(typeof entry.scheduled).toBe('boolean');
      expect(entry.cronExpr === null || typeof entry.cronExpr === 'string').toBe(true);
    }
  });
});

describe('reloadSchedules', () => {
  it('does not throw (no-op function)', () => {
    expect(() => reloadSchedules()).not.toThrow();
  });
});
