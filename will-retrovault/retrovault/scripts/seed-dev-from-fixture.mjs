#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DEV_DIR = path.join(ROOT, 'data', 'dev');
const FIXTURE_DIR = path.join(ROOT, 'fixtures', 'prod-snapshot');
const BACKUP_ROOT = path.join(ROOT, 'backups');

if (!fs.existsSync(FIXTURE_DIR)) {
  console.error(`Missing fixture snapshot at ${FIXTURE_DIR}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(BACKUP_ROOT, `dev-before-fixture-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.mkdirSync(DEV_DIR, { recursive: true });

for (const entry of fs.readdirSync(DEV_DIR)) {
  const src = path.join(DEV_DIR, entry);
  const dest = path.join(backupDir, entry);
  if (fs.lstatSync(src).isFile()) fs.copyFileSync(src, dest);
}

for (const entry of fs.readdirSync(FIXTURE_DIR)) {
  if (entry === 'manifest.json') continue;
  const src = path.join(FIXTURE_DIR, entry);
  const dest = path.join(DEV_DIR, entry);
  if (fs.lstatSync(src).isFile()) {
    fs.copyFileSync(src, dest);
    console.log(`seeded ${entry}`);
  }
}

console.log(`\nDev data seeded from fixture. Backup saved to ${backupDir}`);
