import fs from 'fs';
import path from 'path';

export type RuntimeReadinessOptions = {
  baseUrl: string;
  timeoutMs?: number;
  pagePaths?: string[];
  apiPaths?: string[];
  assetLimit?: number;
  warmupRounds?: number;
  warmupDelayMs?: number;
  assetRetries?: number;
  assetRetryDelayMs?: number;
};

export type RuntimeReadinessResult = {
  warmedPaths: string[];
  assetPaths: string[];
};

const DEFAULT_PAGE_PATHS = ['/', '/inventory'];
const DEFAULT_API_PATHS = ['/api/auth', '/api/config'];

function normalizePath(value: string) {
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'retrovault-runtime-readiness/1.0',
        accept: 'text/html,application/json,*/*',
      },
    });

    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timeout);
  }
}

function getAssetRefsFromHtml(html: string) {
  const refs = new Set<string>();
  const regex = /(?:href|src)=["']([^"']*\/_next\/static\/[^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    refs.add(match[1]);
  }

  return Array.from(refs);
}

async function fetchJson(url: string, timeoutMs: number) {
  const { response, text } = await fetchText(url, timeoutMs);
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 160).replace(/\s+/g, ' ').trim();
    const contentType = response.headers.get('content-type') || 'unknown';
    throw new Error(`${url} did not return valid JSON (status ${response.status}, content-type ${contentType}${snippet ? `, body: ${snippet}` : ''})`);
  }
  return { response, data };
}

export async function verifyRuntimeReadiness({
  baseUrl,
  timeoutMs = 10000,
  pagePaths = DEFAULT_PAGE_PATHS,
  apiPaths = DEFAULT_API_PATHS,
  assetLimit = 12,
  warmupRounds = 2,
  warmupDelayMs = 500,
  assetRetries = 3,
  assetRetryDelayMs = 1000,
}: RuntimeReadinessOptions): Promise<RuntimeReadinessResult> {
  const normalizedPages = pagePaths.map(normalizePath);
  const normalizedApis = apiPaths.map(normalizePath);
  const warmedPaths = new Set<string>();
  const assetPaths = new Set<string>();

  for (let round = 0; round < warmupRounds; round += 1) {
    for (const apiPath of normalizedApis) {
      const url = new URL(apiPath, baseUrl).toString();
      const { response } = await fetchJson(url, timeoutMs);
      if (!response.ok) {
        throw new Error(`API ${apiPath} returned ${response.status}`);
      }
      warmedPaths.add(apiPath);
    }

    for (const pagePath of normalizedPages) {
      const url = new URL(pagePath, baseUrl).toString();
      const { response, text } = await fetchText(url, timeoutMs);
      if (!response.ok) {
        throw new Error(`Page ${pagePath} returned ${response.status}`);
      }
      if (!text.includes('<html')) {
        throw new Error(`Page ${pagePath} did not return HTML`);
      }
      const refs = getAssetRefsFromHtml(text);
      if (refs.length === 0) {
        throw new Error(`Page ${pagePath} referenced no /_next/static assets`);
      }
      refs.slice(0, assetLimit).forEach((ref) => assetPaths.add(normalizePath(ref)));
      warmedPaths.add(pagePath);
    }

    if (round < warmupRounds - 1) {
      await sleep(warmupDelayMs);
    }
  }

  for (const assetPath of assetPaths) {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= assetRetries; attempt += 1) {
      try {
        const url = new URL(assetPath, baseUrl).toString();
        const { response, text } = await fetchText(url, timeoutMs);
        if (!response.ok) {
          const snippet = text.slice(0, 160).replace(/\s+/g, ' ').trim();
          throw new Error(`Asset ${assetPath} returned ${response.status}${snippet ? ` (${snippet})` : ''}`);
        }
        warmedPaths.add(assetPath);
        lastError = null;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt >= assetRetries) break;
        await sleep(assetRetryDelayMs);
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  return {
    warmedPaths: Array.from(warmedPaths),
    assetPaths: Array.from(assetPaths),
  };
}

export function resolveRuntimeReadinessBaseUrl(port: string | number) {
  return `http://127.0.0.1:${port}`;
}

export function getBuildAssetCandidates(rootDir: string) {
  const manifestPath = path.join(rootDir, '.next', 'build-manifest.json');
  if (!fs.existsSync(manifestPath)) return [];

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const pages = manifest.pages || {};
  const app = manifest.rootMainFiles || [];

  const candidateFiles = new Set<string>([
    ...app,
    ...(pages['/'] || []),
    ...(pages['/inventory'] || []),
  ]);

  return Array.from(candidateFiles)
    .filter((file) => typeof file === 'string' && file.startsWith('static/'))
    .map((file) => path.join(rootDir, '.next', file));
}
