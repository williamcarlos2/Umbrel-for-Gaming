import fs from 'fs';
import path from 'path';
import { getDataDir, getDatabasePath } from '@/lib/runtimeDataPaths';

type BetterSqliteDatabase = {
  pragma: (statement: string) => unknown;
  prepare: (statement: string) => { get: () => Record<string, unknown> | undefined };
  close: () => void;
};

export type DatabaseBackupIntegrityReport = {
  status: 'ok' | 'warning' | 'error';
  timestamp: string;
  database: {
    path: string;
    exists: boolean;
    sizeBytes: number;
    modifiedAt: string | null;
  };
  backupDirectory: {
    path: string;
    exists: boolean;
  };
  latestBackup: {
    path: string;
    sizeBytes: number;
    modifiedAt: string;
    ageMinutes: number;
  } | null;
  latestSymlink: {
    path: string;
    target: string;
    exists: boolean;
  } | null;
  quickCheck: {
    ok: boolean;
    result: string;
    target: string | null;
  };
  counts: {
    game: number | null;
    gameCopy: number | null;
  };
  errors: string[];
};

function statOrNull(filePath: string) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function lstatOrNull(filePath: string) {
  try {
    return fs.lstatSync(filePath);
  } catch {
    return null;
  }
}

export function getDatabaseBackupDir() {
  return process.env.RETROVAULT_DB_BACKUP_DIR || path.resolve(getDataDir(), '..', 'backups', 'db');
}

function listDatabaseBackups(backupDir: string) {
  if (!fs.existsSync(backupDir)) return [] as string[];
  return fs.readdirSync(backupDir)
    .filter((name) => name !== 'latest.sqlite')
    .filter((name) => /(?:\.db|\.sqlite|\.sqlite3)(?:\.|$)/i.test(name))
    .map((name) => path.join(backupDir, name))
    .filter((filePath) => statOrNull(filePath)?.isFile())
    .sort((a, b) => (statOrNull(b)?.mtimeMs ?? 0) - (statOrNull(a)?.mtimeMs ?? 0));
}

function readLatestSymlink(backupDir: string) {
  const symlinkPath = path.join(backupDir, 'latest.sqlite');
  const linkStat = lstatOrNull(symlinkPath);
  if (!linkStat?.isSymbolicLink()) return null;

  const rawTarget = fs.readlinkSync(symlinkPath);
  const target = path.isAbsolute(rawTarget) ? rawTarget : path.resolve(backupDir, rawTarget);
  return {
    path: symlinkPath,
    target,
    exists: Boolean(statOrNull(target)?.isFile()),
  };
}

function openReadonlyDatabase(filePath: string): BetterSqliteDatabase {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  return new Database(filePath, { readonly: true, fileMustExist: true }) as BetterSqliteDatabase;
}

function readTableCount(db: BetterSqliteDatabase, tableName: 'Game' | 'GameCopy') {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get();
  const value = row?.count;
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function normalizeQuickCheckResult(result: unknown) {
  if (Array.isArray(result)) {
    const first = result[0] as Record<string, unknown> | undefined;
    return String(first?.quick_check ?? first?.integrity_check ?? JSON.stringify(result));
  }
  return String(result);
}

export function readDatabaseBackupIntegrity(now = new Date()): DatabaseBackupIntegrityReport {
  const databasePath = getDatabasePath();
  const backupDir = getDatabaseBackupDir();
  const dbStat = statOrNull(databasePath);
  const backupDirStat = statOrNull(backupDir);
  const errors: string[] = [];
  const backups = listDatabaseBackups(backupDir);
  const latestBackupPath = backups[0] ?? null;
  const latestBackupStat = latestBackupPath ? statOrNull(latestBackupPath) : null;
  const latestSymlink = backupDirStat?.isDirectory() ? readLatestSymlink(backupDir) : null;
  const quickTarget = dbStat?.isFile() ? databasePath : null;

  let quickCheck = { ok: false, result: 'not run', target: quickTarget };
  let counts = { game: null as number | null, gameCopy: null as number | null };

  if (!dbStat?.isFile()) errors.push(`Database file not found: ${databasePath}`);
  if (!backupDirStat?.isDirectory()) errors.push(`Backup directory not found: ${backupDir}`);
  if (backupDirStat?.isDirectory() && !latestBackupPath) errors.push(`No database backups found in: ${backupDir}`);
  if (latestSymlink && !latestSymlink.exists) errors.push(`Latest backup symlink target missing: ${latestSymlink.target}`);

  if (quickTarget) {
    let db: BetterSqliteDatabase | null = null;
    try {
      db = openReadonlyDatabase(quickTarget);
      const normalized = normalizeQuickCheckResult(db.pragma('quick_check'));
      quickCheck = { ok: normalized.toLowerCase() === 'ok', result: normalized, target: quickTarget };
      counts = {
        game: readTableCount(db, 'Game'),
        gameCopy: readTableCount(db, 'GameCopy'),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`SQLite integrity read failed: ${message}`);
      quickCheck = { ok: false, result: message, target: quickTarget };
    } finally {
      try { db?.close(); } catch {}
    }
  }

  const latestBackup = latestBackupPath && latestBackupStat ? {
    path: latestBackupPath,
    sizeBytes: latestBackupStat.size,
    modifiedAt: latestBackupStat.mtime.toISOString(),
    ageMinutes: Math.max(0, Math.round((now.getTime() - latestBackupStat.mtime.getTime()) / 60000)),
  } : null;

  const status: DatabaseBackupIntegrityReport['status'] = errors.length > 0 || !quickCheck.ok ? (dbStat?.isFile() ? 'warning' : 'error') : 'ok';

  return {
    status,
    timestamp: now.toISOString(),
    database: {
      path: databasePath,
      exists: Boolean(dbStat?.isFile()),
      sizeBytes: dbStat?.size ?? 0,
      modifiedAt: dbStat?.mtime.toISOString() ?? null,
    },
    backupDirectory: {
      path: backupDir,
      exists: Boolean(backupDirStat?.isDirectory()),
    },
    latestBackup,
    latestSymlink,
    quickCheck,
    counts,
    errors,
  };
}
