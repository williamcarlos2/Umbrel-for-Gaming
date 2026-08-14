#!/usr/bin/env node
import { spawnSync } from 'child_process';

for (const script of ['scripts/snapshot-prod-to-fixture.mjs', 'scripts/seed-dev-from-fixture.mjs']) {
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\nDev fixture refresh complete.');
