#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const env = process.argv[2] || 'dev';

const CONFIG = {
  prod: { app: 'retrovault-prod', port: '3000', baseUrl: 'https://retrovault.peschpit.com' },
  dev: { app: 'retrovault-dev', port: '3001', baseUrl: 'https://retrovault-dev.peschpit.com' },
  nightly: { app: 'retrovault-nightly', port: '3002', baseUrl: 'https://nightly-retrovault.peschpit.com' },
};

if (!CONFIG[env]) {
  console.error(`Unknown env: ${env}`);
  console.error('Usage: node scripts/restart-runtime.mjs [dev|prod|nightly]');
  process.exit(1);
}

const { app, port, baseUrl } = CONFIG[env];

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`🔄 Restarting ${app} (${env})`);
run('pm2', ['restart', app, '--update-env']);

console.log('🔥 Waiting for runtime readiness...');
run('node', [
  'scripts/wait-for-runtime-ready.mjs',
  '--port', port,
  '--retries', '8',
  '--retry-delay-ms', '2000',
  '--warmup-rounds', '2',
  '--warmup-delay-ms', '500',
  '--asset-limit', '12',
  '--asset-retries', '4',
  '--asset-retry-delay-ms', '1000',
]);

console.log('🧪 Running public smoke...');
run('node', [
  'scripts/release-smoke.mjs',
  '--base-url', baseUrl,
  '--retries', '5',
  '--retry-delay-ms', '2000',
  '--asset-limit', '20',
  '--asset-retries', '4',
  '--asset-retry-delay-ms', '1000',
]);

console.log(`✅ ${app} restarted and verified`);
