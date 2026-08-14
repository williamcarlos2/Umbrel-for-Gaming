import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  diffRuntimeBackupAgainstTarget,
  makeBackupTimestamp,
  pruneRuntimeBackups,
  restoreRuntimeBackup,
  selectRuntimeBackupFiles,
} from '@/lib/runtimeBackup';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retrovault-backup-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('runtimeBackup helpers', () => {
  it('builds filesystem-safe timestamps', () => {
    expect(makeBackupTimestamp(new Date('2026-04-20T15:28:52.721Z'))).toBe('2026-04-20T15-28-52-721Z');
  });

  it('selects only files that exist in the target runtime dir', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'retrovault.db'), 'db');
    fs.writeFileSync(path.join(dir, 'inventory.json'), '[]');

    const selected = selectRuntimeBackupFiles(dir);
    expect(selected).toContain('retrovault.db');
    expect(selected).toContain('inventory.json');
    expect(selected).not.toContain('watchlist.json');
  });

  it('prunes older backups while keeping the newest N for an env', () => {
    const root = makeTempDir();
    ['prod-2026-04-20T10-00-00-000Z', 'prod-2026-04-20T11-00-00-000Z', 'prod-2026-04-20T12-00-00-000Z', 'dev-2026-04-20T09-00-00-000Z']
      .forEach((name) => fs.mkdirSync(path.join(root, name), { recursive: true }));

    const pruned = pruneRuntimeBackups(root, 'prod', 2);
    expect(pruned).toEqual(['prod-2026-04-20T10-00-00-000Z']);
    expect(fs.existsSync(path.join(root, 'prod-2026-04-20T10-00-00-000Z'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'prod-2026-04-20T11-00-00-000Z'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'dev-2026-04-20T09-00-00-000Z'))).toBe(true);
  });

  it('reports which files would be created vs overwritten during restore preview', () => {
    const snapshot = makeTempDir();
    const target = makeTempDir();
    fs.writeFileSync(path.join(snapshot, 'retrovault.db'), 'db-content');
    fs.writeFileSync(path.join(snapshot, 'app.config.json'), '{"themeColor":"green"}');
    fs.writeFileSync(path.join(target, 'retrovault.db'), 'older-db-content');
    fs.writeFileSync(path.join(snapshot, 'manifest.json'), JSON.stringify({
      env: 'prod',
      createdAt: '2026-04-20T15:30:00.000Z',
      sourceDir: '/src',
      outputDir: snapshot,
      files: ['retrovault.db', 'app.config.json'],
    }));

    const preview = diffRuntimeBackupAgainstTarget(snapshot, target);
    expect(preview.diff).toEqual([
      { file: 'retrovault.db', sourceExists: true, targetExists: true, willOverwrite: true },
      { file: 'app.config.json', sourceExists: true, targetExists: false, willOverwrite: false },
    ]);
  });

  it('requires explicit overwrite permission before restoring over existing files', () => {
    const snapshot = makeTempDir();
    const target = makeTempDir();
    fs.writeFileSync(path.join(snapshot, 'retrovault.db'), 'db-content');
    fs.writeFileSync(path.join(snapshot, 'manifest.json'), JSON.stringify({
      env: 'prod',
      createdAt: '2026-04-20T15:30:00.000Z',
      sourceDir: '/src',
      outputDir: snapshot,
      files: ['retrovault.db'],
    }));
    fs.writeFileSync(path.join(target, 'retrovault.db'), 'older-db-content');

    expect(() => restoreRuntimeBackup(snapshot, target)).toThrow(/overwrite 1 existing files/i);
  });

  it('restores files listed in the manifest into the target runtime dir when overwrite is allowed', () => {
    const snapshot = makeTempDir();
    const target = makeTempDir();
    fs.writeFileSync(path.join(snapshot, 'retrovault.db'), 'db-content');
    fs.writeFileSync(path.join(snapshot, 'app.config.json'), '{"themeColor":"green"}');
    fs.writeFileSync(path.join(snapshot, 'manifest.json'), JSON.stringify({
      env: 'prod',
      createdAt: '2026-04-20T15:30:00.000Z',
      sourceDir: '/src',
      outputDir: snapshot,
      files: ['retrovault.db', 'app.config.json'],
    }));

    const restored = restoreRuntimeBackup(snapshot, target, { allowOverwrite: true });
    expect(restored.manifest.files).toEqual(['retrovault.db', 'app.config.json']);
    expect(fs.readFileSync(path.join(target, 'retrovault.db'), 'utf8')).toBe('db-content');
    expect(JSON.parse(fs.readFileSync(path.join(target, 'app.config.json'), 'utf8')).themeColor).toBe('green');
  });
});
