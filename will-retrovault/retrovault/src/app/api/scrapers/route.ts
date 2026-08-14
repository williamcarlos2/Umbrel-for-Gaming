import { NextResponse } from 'next/server';
import fs from 'fs';
import { getScrapersPath } from '@/lib/runtimeDataPaths';
import { resolveLogPath } from '@/lib/runtimePaths';
// Scheduler imported dynamically to avoid bundling child_process in client paths

export const dynamic = 'force-dynamic';

const SCRAPERS_FILE = getScrapersPath();

type Scraper = {
  id: string;
  name: string;
  description: string;
  script: string;
  logFile: string;
  featureGroup: string | null;
  enabled: boolean;
  status: string;
  lastRun: string | null;
  lastRunStatus: string | null;
  nextRun: string | null;
  cadenceHour: number;
  cadenceType: string;
  itemsProcessed: number;
  itemsTotal: number;
  defaultCadenceHour: number;
  pid?: number;
};

function loadScrapers(): Scraper[] {
  if (!fs.existsSync(SCRAPERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(SCRAPERS_FILE, 'utf8'));
}

function saveScrapers(scrapers: Scraper[]) {
  fs.writeFileSync(SCRAPERS_FILE, JSON.stringify(scrapers, null, 2));
}

function getLogTail(logFile: string, lines = 50): string[] {
  const logPath = resolveLogPath(logFile);
  if (!fs.existsSync(logPath)) return [];
  const content = fs.readFileSync(logPath, 'utf8');
  return content.split('\n').filter(Boolean).slice(-lines);
}

function getLogSize(logFile: string): number {
  const logPath = resolveLogPath(logFile);
  if (!fs.existsSync(logPath)) return 0;
  return fs.statSync(logPath).size;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const logLines = url.searchParams.get('log');

  const scrapers = loadScrapers();

  if (id && logLines) {
    const scraper = scrapers.find((s) => s.id === id);
    if (!scraper) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const lines = getLogTail(scraper.logFile, parseInt(logLines) || 50);
    return NextResponse.json({ lines, size: getLogSize(scraper.logFile) });
  }

  const enriched = scrapers.map((s) => ({
    ...s,
    logSize: getLogSize(s.logFile),
    logExists: fs.existsSync(resolveLogPath(s.logFile)),
  }));

  return NextResponse.json(enriched, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const scrapers = loadScrapers();
  const { action, id } = body;

  const idx = scrapers.findIndex((s) => s.id === id);

  if (action === 'run') {
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const scraper = scrapers[idx];
    if (!scraper.script) return NextResponse.json({ error: 'Script not configured' }, { status: 400 });

    try {
      const { runNow } = await import('@/lib/scheduler');
      runNow(id).catch(console.error);
    } catch {
      console.error('Scheduler not available');
    }
    return NextResponse.json({ ok: true, status: 'running' });
  }

  if (action === 'toggle_enabled') {
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    scrapers[idx].enabled = !scrapers[idx].enabled;
    saveScrapers(scrapers);
    try {
      const { reloadSchedules } = await import('@/lib/scheduler');
      reloadSchedules();
    } catch {}
    return NextResponse.json(scrapers[idx]);
  }

  if (action === 'update_cadence') {
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    scrapers[idx].cadenceHour = body.cadenceHour;
    scrapers[idx].cadenceType = body.cadenceType;
    saveScrapers(scrapers);
    try {
      const { reloadSchedules } = await import('@/lib/scheduler');
      reloadSchedules();
    } catch {}
    return NextResponse.json(scrapers[idx]);
  }

  if (action === 'clear_log') {
    if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const logPath = resolveLogPath(scrapers[idx].logFile);
    if (fs.existsSync(logPath)) fs.writeFileSync(logPath, '');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
