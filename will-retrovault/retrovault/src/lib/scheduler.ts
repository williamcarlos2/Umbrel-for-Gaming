/**
 * RetroVault In-Process Scheduler
 *
 * Pure Node.js implementation — no external dependencies.
 * Uses setInterval to check every minute if any scraper should run.
 * Reads schedule config from data/scrapers.json dynamically.
 *
 * Lifecycle:
 * - Initialized once at server startup via src/instrumentation.ts
 * - Reloaded dynamically when user changes schedules in the Scraper UI
 * - Each scraper runs in a child process to avoid blocking the server
 */

// Node.js built-ins only — no npm packages
import { spawn } from 'child_process';
import fs from 'fs';
import { getScrapersPath } from './runtimeDataPaths';
import { getLogsDir, resolveLogPath, resolveProjectPath } from './runtimePaths';

const DATA_FILE  = getScrapersPath();

type Scraper = {
  id: string;
  name: string;
  script: string | null;
  logFile: string;
  enabled: boolean;
  cadenceHour: number;
  cadenceType: 'hourly' | 'daily' | 'weekly' | 'on-demand';
  status: string;
  lastRun: string | null;
  lastRunStatus: string | null;
};

function loadScrapers(): Scraper[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function updateScraperStatus(id: string, updates: Partial<Scraper>) {
  try {
    const scrapers = loadScrapers();
    const idx = scrapers.findIndex(s => s.id === id);
    if (idx >= 0) {
      scrapers[idx] = { ...scrapers[idx], ...updates };
      fs.writeFileSync(DATA_FILE, JSON.stringify(scrapers, null, 2));
    }
  } catch { /* non-fatal */ }
}

/** Returns true if this scraper should run at the given time */
function shouldRunNow(scraper: Scraper, now: Date): boolean {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon

  if (!scraper.enabled || !scraper.script) return false;

  switch (scraper.cadenceType) {
    case 'hourly':
      // Run at minute 0 of every Nth hour
      return minute === 0 && (hour % Math.max(1, scraper.cadenceHour) === 0);
    case 'daily':
      // Run once per day at specified hour
      return hour === scraper.cadenceHour && minute === 0;
    case 'weekly':
      // Run once per week on Monday at specified hour
      return dayOfWeek === 1 && hour === scraper.cadenceHour && minute === 0;
    case 'on-demand':
      return false;
    default:
      return false;
  }
}

export function getCronExpression(scraper: Scraper): string | null {
  switch (scraper.cadenceType) {
    case 'hourly':  return `0 */${Math.max(1, scraper.cadenceHour)} * * *`;
    case 'daily':   return `0 ${scraper.cadenceHour} * * *`;
    case 'weekly':  return `0 ${scraper.cadenceHour} * * 1`;
    case 'on-demand': return null;
    default: return null;
  }
}

export async function runScript(scraper: Scraper): Promise<void> {
  if (!scraper.script) return;

  const scriptPath = resolveProjectPath(scraper.script);
  if (!fs.existsSync(scriptPath)) {
    console.log(`[Scheduler] Script not found: ${scraper.script}`);
    return;
  }

  const logsDir = getLogsDir();
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const logPath = resolveLogPath(scraper.logFile);

  console.log(`[Scheduler] Starting ${scraper.name}...`);
  updateScraperStatus(scraper.id, {
    status: 'running',
    lastRun: new Date().toISOString(),
  });

  return new Promise((resolve) => {
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.write(`\n[${new Date().toISOString()}] Scheduled run started\n`);

    const child = spawn(process.execPath, [scriptPath], {
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.pipe(logStream, { end: false });
    child.stderr?.pipe(logStream, { end: false });

    child.on('close', (code) => {
      logStream.write(`\n[${new Date().toISOString()}] Completed with exit code ${code}\n`);
      logStream.end();
      updateScraperStatus(scraper.id, {
        status: 'idle',
        lastRunStatus: code === 0 ? 'success' : 'error',
      });
      console.log(`[Scheduler] ${scraper.name} finished (exit ${code})`);
      resolve();
    });

    child.on('error', (err) => {
      logStream.end();
      updateScraperStatus(scraper.id, { status: 'error', lastRunStatus: 'error' });
      console.error(`[Scheduler] ${scraper.name} error:`, err.message);
      resolve();
    });
  });
}

// ── Tick-based scheduler ─────────────────────────────────────────────────────

let tickInterval: ReturnType<typeof setInterval> | null = null;
const runningScrapers = new Set<string>(); // Prevent double-runs

function tick() {
  const now = new Date();
  const scrapers = loadScrapers();

  for (const scraper of scrapers) {
    if (runningScrapers.has(scraper.id)) continue; // Skip if already running
    if (shouldRunNow(scraper, now)) {
      runningScrapers.add(scraper.id);
      runScript(scraper)
        .finally(() => runningScrapers.delete(scraper.id));
    }
  }
}

export function startScheduler(): void {
  if (tickInterval) clearInterval(tickInterval);
  // Check every minute (at ~second 0 for accuracy)
  tickInterval = setInterval(tick, 60_000);
  console.log('[Scheduler] Started — checking every minute');
  logScheduledScrapers();
}

export function reloadSchedules(): void {
  // No teardown needed — tick() always reads fresh from disk
  console.log('[Scheduler] Schedules reloaded from disk');
  logScheduledScrapers();
}

function logScheduledScrapers() {
  const scrapers = loadScrapers().filter(s => s.enabled && s.script && s.cadenceType !== 'on-demand');
  for (const s of scrapers) {
    console.log(`[Scheduler] ${s.name}: ${getCronExpression(s)} (${s.cadenceType} @ hour ${s.cadenceHour})`);
  }
  if (!scrapers.length) console.log('[Scheduler] No scrapers currently scheduled');
}

export function runNow(scraperId: string): Promise<void> {
  const scraper = loadScrapers().find(s => s.id === scraperId);
  if (!scraper) return Promise.reject(new Error(`Scraper not found: ${scraperId}`));
  return runScript(scraper);
}

export function getSchedulerStatus(): Record<string, { scheduled: boolean; cronExpr: string | null; nextRun?: string }> {
  const scrapers = loadScrapers();
  const result: Record<string, { scheduled: boolean; cronExpr: string | null }> = {};
  for (const s of scrapers) {
    const expr = getCronExpression(s);
    result[s.id] = {
      scheduled: s.enabled && s.cadenceType !== 'on-demand' && !!s.script,
      cronExpr: expr,
    };
  }
  return result;
}
