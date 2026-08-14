import fs from "fs";
import os from "os";
import { createRequire } from "module";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const tempDirs: string[] = [];
type TestDatabase = { exec: (sql: string) => void; close: () => void };
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3") as new (filename: string) => TestDatabase;

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "retrovault-db-backup-health-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("database backup integrity", () => {
  it("reports db existence, newest backup metadata, quick_check, and row counts without writes", async () => {
    const dataDir = makeTempDir();
    const backupsDir = path.join(dataDir, "backups", "db");
    fs.mkdirSync(backupsDir, { recursive: true });
    const dbPath = path.join(dataDir, "retrovault.db");
    const olderBackup = path.join(backupsDir, "retrovault.db.20260101-000000.sqlite");
    const latestBackup = path.join(backupsDir, "retrovault.db.20260622-120000.sqlite");
    const latestSymlink = path.join(backupsDir, "latest.sqlite");

    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE Game (id TEXT PRIMARY KEY, title TEXT NOT NULL);
      CREATE TABLE GameCopy (id TEXT PRIMARY KEY, gameId TEXT NOT NULL);
      INSERT INTO Game (id, title) VALUES ('g1', 'Sonic'), ('g2', 'Zelda');
      INSERT INTO GameCopy (id, gameId) VALUES ('c1', 'g1');
    `);
    db.close();
    fs.copyFileSync(dbPath, olderBackup);
    fs.copyFileSync(dbPath, latestBackup);
    fs.utimesSync(olderBackup, new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"));
    fs.utimesSync(latestBackup, new Date("2026-06-22T12:00:00Z"), new Date("2026-06-22T12:00:00Z"));
    fs.symlinkSync(path.basename(latestBackup), latestSymlink);

    vi.stubEnv("RETROVAULT_DATA_DIR", dataDir);
    vi.stubEnv("RETROVAULT_DB_PATH", dbPath);
    vi.stubEnv("RETROVAULT_DB_BACKUP_DIR", backupsDir);

    const { readDatabaseBackupIntegrity } = await import("@/lib/databaseBackupIntegrity");
    const report = readDatabaseBackupIntegrity(new Date("2026-06-22T16:00:00Z"));

    expect(report.status).toBe("ok");
    expect(report.database.exists).toBe(true);
    expect(report.database.path).toBe(dbPath);
    expect(report.latestBackup?.path).toBe(latestBackup);
    expect(report.latestBackup?.ageMinutes).toBe(240);
    expect(report.latestSymlink).toEqual({ path: latestSymlink, target: latestBackup, exists: true });
    expect(report.quickCheck).toEqual({ ok: true, result: "ok", target: dbPath });
    expect(report.counts).toEqual({ game: 2, gameCopy: 1 });
  });

  it("reports missing backup directories as warnings without creating files", async () => {
    const dataDir = makeTempDir();
    const dbPath = path.join(dataDir, "retrovault.db");
    const missingBackupsDir = path.join(dataDir, "missing", "backups");

    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE Game (id TEXT PRIMARY KEY);
      CREATE TABLE GameCopy (id TEXT PRIMARY KEY);
    `);
    db.close();

    vi.stubEnv("RETROVAULT_DATA_DIR", dataDir);
    vi.stubEnv("RETROVAULT_DB_PATH", dbPath);
    vi.stubEnv("RETROVAULT_DB_BACKUP_DIR", missingBackupsDir);

    const { readDatabaseBackupIntegrity } = await import("@/lib/databaseBackupIntegrity");
    const report = readDatabaseBackupIntegrity(new Date("2026-06-22T16:00:00Z"));

    expect(report.status).toBe("warning");
    expect(report.backupDirectory.exists).toBe(false);
    expect(report.latestBackup).toBeNull();
    expect(report.latestSymlink).toBeNull();
    expect(report.quickCheck).toEqual({ ok: true, result: "ok", target: dbPath });
    expect(report.counts).toEqual({ game: 0, gameCopy: 0 });
    expect(fs.existsSync(missingBackupsDir)).toBe(false);
  });
});
