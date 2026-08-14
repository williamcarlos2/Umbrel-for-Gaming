import fs from 'fs';
import path from 'path';

export const RUNTIME_BACKUP_FILES = [
  'retrovault.db',
  'retrovault.db-shm',
  'retrovault.db-wal',
  'app.config.json',
  'inventory.json',
  'sales.json',
  'acquisitions.json',
  'watchlist.json',
  'favorites.json',
  'tags.json',
  'goals.json',
  'grails.json',
  'playlog.json',
  'events.json',
  'whatnot.json',
  'value-history.json',
  'achievements-unlocked.json',
  'scrapers.json',
  'bug-reports.json',
  'craigslist-deals.json',
  'reddit-alerts.json',
  'youtube-cache.json',
] as const;

export type RuntimeBackupFile = typeof RUNTIME_BACKUP_FILES[number];

export type RuntimeBackupManifest = {
  env: string;
  createdAt: string;
  sourceDir: string;
  outputDir: string;
  files: string[];
};

export function makeBackupTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function getRuntimeBackupOutputDir(appDir: string, env: string, timestamp = makeBackupTimestamp()) {
  return path.join(appDir, 'backups', 'runtime-data', `${env}-${timestamp}`);
}

export function selectRuntimeBackupFiles(targetDir: string, names = RUNTIME_BACKUP_FILES) {
  return names.filter((name) => fs.existsSync(path.join(targetDir, name)));
}

export function pruneRuntimeBackups(backupsRoot: string, env: string, keepCount: number) {
  if (keepCount <= 0 || !fs.existsSync(backupsRoot)) return [] as string[];

  const prefix = `${env}-`;
  const entries = fs.readdirSync(backupsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .sort((a, b) => a.name.localeCompare(b.name));

  const toDelete = entries.slice(0, Math.max(0, entries.length - keepCount));
  for (const entry of toDelete) {
    fs.rmSync(path.join(backupsRoot, entry.name), { recursive: true, force: true });
  }

  return toDelete.map((entry) => entry.name);
}

export function readRuntimeBackupManifest(snapshotDir: string): RuntimeBackupManifest {
  const manifestPath = path.join(snapshotDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found: ${manifestPath}`);
  }

  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as RuntimeBackupManifest;
}

export function diffRuntimeBackupAgainstTarget(snapshotDir: string, targetDir: string) {
  const manifest = readRuntimeBackupManifest(snapshotDir);
  const diff = manifest.files.map((file) => {
    const source = path.join(snapshotDir, file);
    const dest = path.join(targetDir, file);
    const sourceExists = fs.existsSync(source);
    const targetExists = fs.existsSync(dest);
    return {
      file,
      sourceExists,
      targetExists,
      willOverwrite: targetExists,
    };
  });

  return { manifest, diff };
}

export function restoreRuntimeBackup(snapshotDir: string, targetDir: string, options?: { allowOverwrite?: boolean }) {
  const { manifest, diff } = diffRuntimeBackupAgainstTarget(snapshotDir, targetDir);
  const allowOverwrite = options?.allowOverwrite ?? false;
  const overwrites = diff.filter((entry) => entry.willOverwrite);

  if (overwrites.length > 0 && !allowOverwrite) {
    throw new Error(`Restore would overwrite ${overwrites.length} existing files in ${targetDir}. Re-run with overwrite confirmation.`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of diff) {
    const source = path.join(snapshotDir, entry.file);
    const dest = path.join(targetDir, entry.file);
    if (!entry.sourceExists) {
      throw new Error(`Backup file missing from snapshot: ${source}`);
    }
    fs.copyFileSync(source, dest);
  }

  return { manifest, diff };
}
