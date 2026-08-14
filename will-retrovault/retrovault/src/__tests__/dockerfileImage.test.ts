import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const rootDir = path.resolve(__dirname, '../..');
const dockerfile = fs.readFileSync(path.join(rootDir, 'Dockerfile'), 'utf8');

describe('Docker image packaging', () => {
  it('builds better-sqlite3 native bindings even when app postinstall scripts are deferred', () => {
    expect(dockerfile).toContain('npm ci --ignore-scripts');
    expect(dockerfile).toMatch(/npm\s+rebuild\s+better-sqlite3(?:\s|$)/);
  });

  it('ships Prisma runtime config with the runner image for migrate deploy', () => {
    expect(dockerfile).toMatch(/COPY\s+--from=builder\s+\/app\/prisma\.config\.ts\s+\.\/prisma\.config\.ts/);
  });

  it('allows the non-root runtime user to run Prisma migrations', () => {
    expect(dockerfile).toMatch(/chown\s+-R\s+nextjs:nodejs[^\n]*\/app\/node_modules\/@prisma\/engines/);
  });
});
