#!/usr/bin/env node

import { verifyRuntimeReadiness, resolveRuntimeReadinessBaseUrl } from '../src/lib/runtimeReadiness.ts';

const args = process.argv.slice(2);

const options = {
  baseUrl: null,
  port: process.env.PORT || null,
  timeoutMs: Number(process.env.RUNTIME_READY_TIMEOUT_MS || 10000),
  retries: Number(process.env.RUNTIME_READY_RETRIES || 8),
  retryDelayMs: Number(process.env.RUNTIME_READY_RETRY_DELAY_MS || 2000),
  warmupRounds: Number(process.env.RUNTIME_READY_WARMUP_ROUNDS || 2),
  warmupDelayMs: Number(process.env.RUNTIME_READY_WARMUP_DELAY_MS || 500),
  assetLimit: Number(process.env.RUNTIME_READY_ASSET_LIMIT || 12),
  assetRetries: Number(process.env.RUNTIME_READY_ASSET_RETRIES || 4),
  assetRetryDelayMs: Number(process.env.RUNTIME_READY_ASSET_RETRY_DELAY_MS || 1000),
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];

  if (arg === '--base-url' && next) {
    options.baseUrl = next;
    i += 1;
  } else if (arg === '--port' && next) {
    options.port = next;
    i += 1;
  } else if (arg === '--timeout-ms' && next) {
    options.timeoutMs = Number(next);
    i += 1;
  } else if (arg === '--retries' && next) {
    options.retries = Number(next);
    i += 1;
  } else if (arg === '--retry-delay-ms' && next) {
    options.retryDelayMs = Number(next);
    i += 1;
  } else if (arg === '--warmup-rounds' && next) {
    options.warmupRounds = Number(next);
    i += 1;
  } else if (arg === '--warmup-delay-ms' && next) {
    options.warmupDelayMs = Number(next);
    i += 1;
  } else if (arg === '--asset-limit' && next) {
    options.assetLimit = Number(next);
    i += 1;
  } else if (arg === '--asset-retries' && next) {
    options.assetRetries = Number(next);
    i += 1;
  } else if (arg === '--asset-retry-delay-ms' && next) {
    options.assetRetryDelayMs = Number(next);
    i += 1;
  }
}

function log(message) {
  console.log(`[runtime-ready] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const baseUrl = options.baseUrl || (options.port ? resolveRuntimeReadinessBaseUrl(options.port) : null);
  if (!baseUrl) {
    throw new Error('Provide --base-url or --port');
  }

  let lastError = null;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      if (attempt > 0) {
        log(`Retry attempt ${attempt} of ${options.retries}`);
      }
      const result = await verifyRuntimeReadiness({
        baseUrl,
        timeoutMs: options.timeoutMs,
        warmupRounds: options.warmupRounds,
        warmupDelayMs: options.warmupDelayMs,
        assetLimit: options.assetLimit,
        assetRetries: options.assetRetries,
        assetRetryDelayMs: options.assetRetryDelayMs,
      });
      log(`Runtime ready at ${baseUrl}`);
      log(`Warmed ${result.warmedPaths.length} paths, verified ${result.assetPaths.length} assets`);
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

main().catch((error) => {
  console.error(`[runtime-ready] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
