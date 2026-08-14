import { describe, expect, it } from 'vitest';
import { getBuildAssetCandidates, resolveRuntimeReadinessBaseUrl } from '@/lib/runtimeReadiness';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('runtimeReadiness helpers', () => {
  it('builds a localhost readiness URL from a port', () => {
    expect(resolveRuntimeReadinessBaseUrl(3001)).toBe('http://127.0.0.1:3001');
    expect(resolveRuntimeReadinessBaseUrl('3002')).toBe('http://127.0.0.1:3002');
  });

  it('extracts build asset candidates from build-manifest.json', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'retrovault-runtime-ready-'));
    const nextDir = path.join(rootDir, '.next');
    fs.mkdirSync(nextDir, { recursive: true });

    fs.writeFileSync(
      path.join(nextDir, 'build-manifest.json'),
      JSON.stringify({
        rootMainFiles: ['static/chunks/root.js', 'ignored/file.txt'],
        pages: {
          '/': ['static/chunks/home.js'],
          '/inventory': ['static/chunks/inventory.js'],
        },
      }),
    );

    const assets = getBuildAssetCandidates(rootDir);

    expect(assets).toEqual([
      path.join(rootDir, '.next', 'static/chunks/root.js'),
      path.join(rootDir, '.next', 'static/chunks/home.js'),
      path.join(rootDir, '.next', 'static/chunks/inventory.js'),
    ]);
  });
});
