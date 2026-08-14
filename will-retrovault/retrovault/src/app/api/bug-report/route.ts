import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import crypto from 'crypto';
import { getConfigPath, resolveDataPath } from '@/lib/runtimeDataPaths';

export const dynamic = 'force-dynamic';

const RATE_FILE = resolveDataPath('bug-reports.json');
function getGithubRepo(): string {
  try {
    const cfg = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
    return cfg.githubRepo || 'theretrovault/retrovault';
  } catch { return 'theretrovault/retrovault'; }
}
const RATE_LIMIT_HOURS = 1;
const MAX_PER_DAY = 5; // per IP

type RateEntry = { ip: string; timestamps: number[]; reportIds: string[] };

function loadRates(): RateEntry[] {
  if (!fs.existsSync(RATE_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(RATE_FILE, 'utf8')); } catch { return []; }
}

function saveRates(data: RateEntry[]) {
  fs.writeFileSync(RATE_FILE, JSON.stringify(data, null, 2));
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const real = req.headers.get('x-real-ip');
  return (forwarded?.split(',')[0] || real || 'unknown').trim();
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + 'retrovault-salt').digest('hex').slice(0, 16);
}

function checkRateLimit(ip: string): { allowed: boolean; reason?: string; resetIn?: number } {
  const ipHash = hashIp(ip);
  const rates = loadRates();
  const now = Date.now();
  const hourAgo = now - RATE_LIMIT_HOURS * 3600000;
  const dayAgo = now - 24 * 3600000;

  const entry = rates.find(r => r.ip === ipHash);
  if (!entry) return { allowed: true };

  // Clean old timestamps
  entry.timestamps = entry.timestamps.filter(t => t > dayAgo);

  const recentHour = entry.timestamps.filter(t => t > hourAgo).length;
  const recentDay = entry.timestamps.length;

  if (recentHour >= 1) {
    const nextAllowed = entry.timestamps.filter(t => t > hourAgo)[0] + RATE_LIMIT_HOURS * 3600000;
    return { allowed: false, reason: 'Rate limit: 1 report per hour.', resetIn: Math.ceil((nextAllowed - now) / 60000) };
  }
  if (recentDay >= MAX_PER_DAY) {
    return { allowed: false, reason: `Daily limit reached (${MAX_PER_DAY} reports per day).` };
  }

  return { allowed: true };
}

function recordReport(ip: string, reportId: string) {
  const ipHash = hashIp(ip);
  const rates = loadRates();
  const now = Date.now();
  const dayAgo = now - 24 * 3600000;

  let entry = rates.find(r => r.ip === ipHash);
  if (!entry) {
    entry = { ip: ipHash, timestamps: [], reportIds: [] };
    rates.push(entry);
  }
  entry.timestamps = entry.timestamps.filter(t => t > dayAgo);
  entry.timestamps.push(now);
  entry.reportIds.push(reportId);
  saveRates(rates);
}

async function searchExistingIssues(title: string, token: string): Promise<{ isDuplicate: boolean; url?: string; existingTitle?: string }> {
  // Extract key words from title for searching
  const keywords = title.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 4)
    .join('+');

  if (!keywords) return { isDuplicate: false };

  try {
    const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(keywords)}+repo:${getGithubRepo()}+is:issue+is:open&per_page=5`;
    const res = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RetroVault-BugReporter/1.0',
      }
    });

    if (!res.ok) return { isDuplicate: false };
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      // Check if any existing issue title is similar
      const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
      const inputNorm = normalizeTitle(title);

      for (const issue of data.items) {
        const issueNorm = normalizeTitle(issue.title);
        // Simple similarity: check if 60%+ of words overlap
        const inputWords = new Set(inputNorm.split(/\s+/).filter((w: string) => w.length > 3));
        const issueWords = new Set(issueNorm.split(/\s+/).filter((w: string) => w.length > 3));
        const overlap = [...inputWords].filter(w => issueWords.has(w)).length;
        const similarity = inputWords.size > 0 ? overlap / inputWords.size : 0;

        if (similarity >= 0.6) {
          return { isDuplicate: true, url: issue.html_url, existingTitle: issue.title };
        }
      }
    }
  } catch { /* ignore search errors, allow submission */ }

  return { isDuplicate: false };
}

async function createGitHubIssue(title: string, body: string, labels: string[], token: string): Promise<{ url: string; number: number }> {
  const res = await fetch(`https://api.github.com/repos/${getGithubRepo()}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'RetroVault-BugReporter/1.0',
    },
    body: JSON.stringify({ title, body, labels }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error: ${res.status}`);
  }

  const issue = await res.json();
  return { url: issue.html_url, number: issue.number };
}

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_ISSUES_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Bug reporting not configured. Add GITHUB_ISSUES_TOKEN to .env.local.' }, { status: 503 });
  }

  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Honeypot — bots fill this, humans don't
  if (body.website) {
    return NextResponse.json({ ok: true, message: 'Report submitted.' }); // Silent success for bots
  }

  const { title, description, type, page, steps, expected, actual, metadata } = body;

  // Validate
  if (!title || title.trim().length < 10) {
    return NextResponse.json({ error: 'Title must be at least 10 characters.' }, { status: 400 });
  }
  if (!description || description.trim().length < 20) {
    return NextResponse.json({ error: 'Description must be at least 20 characters.' }, { status: 400 });
  }

  // Rate limit
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json({
      error: rateCheck.reason,
      resetIn: rateCheck.resetIn
    }, { status: 429 });
  }

  // Duplicate detection
  const dupCheck = await searchExistingIssues(title, token);
  if (dupCheck.isDuplicate) {
    return NextResponse.json({
      error: 'A similar issue already exists.',
      duplicate: true,
      existingUrl: dupCheck.url,
      existingTitle: dupCheck.existingTitle,
    }, { status: 409 });
  }

  // Build issue body
  const typeLabel = type || 'bug';
  const issueBody = [
    `## ${typeLabel === 'bug' ? '🐛 Bug Report' : typeLabel === 'feature' ? '✨ Feature Request' : '📋 Report'} from RetroVault`,
    '',
    `**Page:** ${page || 'Unknown'}`,
    '',
    `### Description`,
    description.trim(),
    '',
    steps ? `### Steps to Reproduce\n${steps.trim()}` : '',
    expected ? `### Expected Behavior\n${expected.trim()}` : '',
    actual ? `### Actual Behavior\n${actual.trim()}` : '',
    metadata ? `### Context\n\n\
\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\`` : '',
    '',
    `---`,
    `*Submitted via RetroVault in-app bug reporter*`,
  ].filter(Boolean).join('\n');

  const labels = typeLabel === 'feature' ? ['enhancement'] : ['bug'];

  try {
    const issue = await createGitHubIssue(
      `[${typeLabel === 'bug' ? 'Bug' : 'Feature'}] ${title.trim()}`,
      issueBody,
      labels,
      token
    );

    recordReport(ip, issue.number.toString());

    return NextResponse.json({
      ok: true,
      issueNumber: issue.number,
      issueUrl: issue.url,
      message: `Issue #${issue.number} created successfully.`
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create GitHub issue.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const configured = !!process.env.GITHUB_ISSUES_TOKEN;
  const repo = getGithubRepo();
  return NextResponse.json({ configured, repo, issuesUrl: `https://github.com/${repo}/issues` });
}
