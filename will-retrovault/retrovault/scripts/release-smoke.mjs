#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const args = process.argv.slice(2);

const options = {
  baseUrl: process.env.SMOKE_BASE_URL || null,
  pagePaths: ['/', '/inventory', '/analytics', '/sales'],
  apiPaths: ['/api/auth', '/api/config'],
  timeoutMs: Number(process.env.SMOKE_TIMEOUT_MS || 10000),
  assetLimit: Number(process.env.SMOKE_ASSET_LIMIT || 20),
  retries: Number(process.env.SMOKE_RETRIES || 0),
  retryDelayMs: Number(process.env.SMOKE_RETRY_DELAY_MS || 1500),
  assetRetries: Number(process.env.SMOKE_ASSET_RETRIES || 1),
  assetRetryDelayMs: Number(process.env.SMOKE_ASSET_RETRY_DELAY_MS || 750),
  assetPaths: [],
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];

  if (arg === '--base-url' && next) {
    options.baseUrl = next;
    i += 1;
  } else if (arg === '--page' && next) {
    options.pagePaths.push(next);
    i += 1;
  } else if (arg === '--api' && next) {
    options.apiPaths.push(next);
    i += 1;
  } else if (arg === '--asset' && next) {
    options.assetPaths.push(next);
    i += 1;
  } else if (arg === '--timeout-ms' && next) {
    options.timeoutMs = Number(next);
    i += 1;
  } else if (arg === '--asset-limit' && next) {
    options.assetLimit = Number(next);
    i += 1;
  } else if (arg === '--retries' && next) {
    options.retries = Number(next);
    i += 1;
  } else if (arg === '--retry-delay-ms' && next) {
    options.retryDelayMs = Number(next);
    i += 1;
  }
}

function log(message) {
  console.log(`[release-smoke] ${message}`);
}

function fail(message) {
  console.error(`[release-smoke] ERROR: ${message}`);
  process.exit(1);
}

function normalizePath(value) {
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'retrovault-release-smoke/1.0',
        accept: 'text/html,application/json,*/*',
      },
    });

    const text = await response.text();
    return { response, text };
  } catch (error) {
    throw new Error(`${url} request failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function getAssetRefsFromHtml(html) {
  const refs = new Set();
  const regex = /(?:href|src)=["']([^"']*\/_next\/static\/[^"']+)["']/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    refs.add(match[1]);
  }

  return Array.from(refs);
}

async function fetchJson(url) {
  const { response, text } = await fetchText(url);
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 160).replace(/\s+/g, ' ').trim();
    const contentType = response.headers.get('content-type') || 'unknown';
    throw new Error(`${url} did not return valid JSON (status ${response.status}, content-type ${contentType}${snippet ? `, body: ${snippet}` : ''})`);
  }
  return { response, data, text };
}

async function verifyAssetWithRetry(baseUrl, assetPath, sourcePage) {
  let lastError = null;

  for (let attempt = 0; attempt <= options.assetRetries; attempt += 1) {
    try {
      const url = new URL(assetPath, baseUrl).toString();
      const { response, text } = await fetchText(url);
      if (!response.ok) {
        const snippet = text.slice(0, 160).replace(/\s+/g, ' ').trim();
        throw new Error(`Asset ${assetPath} from ${sourcePage} returned ${response.status}${snippet ? ` (${snippet})` : ''}`);
      }
      log(`Asset ${assetPath} OK${attempt > 0 ? ` after retry ${attempt}` : ''}`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= options.assetRetries) break;
      log(`Asset ${assetPath} from ${sourcePage} failed attempt ${attempt + 1}, retrying in ${options.assetRetryDelayMs}ms: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(options.assetRetryDelayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function verifyHttpModeOnce(baseUrl) {
  const pageAssets = new Map(options.assetPaths.map((assetPath) => [normalizePath(assetPath), 'manual']))
  const authUrl = new URL('/api/auth', baseUrl).toString();
  const configUrl = new URL('/api/config', baseUrl).toString();
  const { response: authResponse } = await fetchJson(authUrl);
  if (!authResponse.ok) {
    throw new Error(`/api/auth returned ${authResponse.status}`);
  }
  log(`API /api/auth OK (${authResponse.status})`);

  const { response: configResponse, data: configData } = await fetchJson(configUrl);
  if (!configResponse.ok) {
    throw new Error(`/api/config returned ${configResponse.status}`);
  }
  log(`API /api/config OK (${configResponse.status})`);

  for (const pagePath of options.pagePaths.map(normalizePath)) {
    const url = new URL(pagePath, baseUrl).toString();
    const { response, text } = await fetchText(url);

    if (!response.ok) {
      throw new Error(`Page ${pagePath} returned ${response.status}`);
    }

    if (!text.includes('<html')) {
      throw new Error(`Page ${pagePath} did not return HTML`);
    }

    const authShellCount = (text.match(/AUTHENTICATING\.\.\./g) || []).length;
    if (authShellCount > 1) {
      throw new Error(`Page ${pagePath} rendered duplicate auth shells (${authShellCount})`);
    }

    if (configData && configData.auth && configData.auth.enabled === false && text.includes('/login')) {
      throw new Error(`Page ${pagePath} rendered login-linked shell while auth is disabled`);
    }

    const assetRefs = getAssetRefsFromHtml(text);
    if (assetRefs.length === 0) {
      throw new Error(`Page ${pagePath} referenced no /_next/static assets`);
    }

    assetRefs.slice(0, options.assetLimit).forEach((assetPath) => pageAssets.set(normalizePath(assetPath), pagePath));
    log(`Page ${pagePath} OK, found ${assetRefs.length} asset refs`);
  }

  for (const apiPath of options.apiPaths.map(normalizePath)) {
    if (apiPath === '/api/auth' || apiPath === '/api/config') continue;
    const url = new URL(apiPath, baseUrl).toString();
    const { response } = await fetchText(url);
    if (!response.ok) {
      throw new Error(`API ${apiPath} returned ${response.status}`);
    }
    log(`API ${apiPath} OK (${response.status})`);
  }

  for (const [assetPath, sourcePage] of pageAssets.entries()) {
    await verifyAssetWithRetry(baseUrl, assetPath, sourcePage);
  }
}

async function verifyHttpMode(baseUrl) {
  log(`Smoke testing live runtime at ${baseUrl}`);

  let lastError = null;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      if (attempt > 0) {
        log(`Retry attempt ${attempt} of ${options.retries}`);
      }
      await verifyHttpModeOnce(baseUrl);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= options.retries) break;
      log(`Attempt ${attempt + 1} failed, waiting ${options.retryDelayMs}ms before retry: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(options.retryDelayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function verifyBuildMode() {
  log('Smoke testing local build artifacts');

  const manifestPath = path.join(rootDir, '.next', 'build-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fail(`Missing manifest: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const pages = manifest.pages || {};
  const app = manifest.rootMainFiles || [];

  const candidateFiles = new Set([
    ...app,
    ...(pages['/'] || []),
    ...(pages['/inventory'] || []),
  ]);

  const assetFiles = Array.from(candidateFiles)
    .filter((file) => typeof file === 'string' && file.startsWith('static/'))
    .map((file) => path.join(rootDir, '.next', file));

  if (assetFiles.length === 0) {
    fail('No static asset files discovered in build manifest');
  }

  for (const assetFile of assetFiles) {
    if (!fs.existsSync(assetFile)) {
      fail(`Manifest referenced missing asset: ${assetFile}`);
    }
    const stats = fs.statSync(assetFile);
    if (!stats.isFile() || stats.size === 0) {
      fail(`Asset missing or empty: ${assetFile}`);
    }
    log(`Asset OK: ${path.relative(rootDir, assetFile)}`);
  }

  const requiredServerFiles = [
    path.join(rootDir, '.next', 'prerender-manifest.json'),
    path.join(rootDir, '.next', 'server', 'app', 'index.html'),
    path.join(rootDir, '.next', 'server', 'app', 'inventory.html'),
  ];

  for (const filePath of requiredServerFiles) {
    if (!fs.existsSync(filePath)) {
      fail(`Expected build output missing: ${filePath}`);
    }
    log(`Build output OK: ${path.relative(rootDir, filePath)}`);
  }
}

async function main() {
  if (options.baseUrl) {
    await verifyHttpMode(options.baseUrl);
  } else {
    verifyBuildMode();
  }

  log('Smoke test passed');
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
