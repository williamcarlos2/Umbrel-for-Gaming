#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getRuntimeBackupOutputDir,
  pruneRuntimeBackups,
  selectRuntimeBackupFiles,
} from '../src/lib/runtimeBackup.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');
const dataDir = path.join(appDir, 'data');
const envArg = process.argv[2] || 'prod';
const targetDir = path.join(dataDir, envArg);
const backupsRoot = path.join(appDir, 'backups', 'runtime-data');
const keepCount = Number.parseInt(process.env.RETROVAULT_BACKUP_KEEP || '10', 10);
const outputDir = getRuntimeBackupOutputDir(appDir, envArg);

if (!fs.existsSync(targetDir)) {
  console.error(`Data directory not found: ${targetDir}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const selectedFiles = selectRuntimeBackupFiles(targetDir);
for (const name of selectedFiles) {
  const source = path.join(targetDir, name);
  fs.copyFileSync(source, path.join(outputDir, name));
}

const manifest = {
  env: envArg,
  createdAt: new Date().toISOString(),
  sourceDir: targetDir,
  outputDir,
  files: selectedFiles,
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

const pruned = Number.isFinite(keepCount) && keepCount > 0
  ? pruneRuntimeBackups(backupsRoot, envArg, keepCount)
  : [];

console.log(`Backed up ${selectedFiles.length} runtime data files to ${outputDir}`);
for (const name of selectedFiles) console.log(` - ${name}`);
if (pruned.length > 0) {
  console.log(`Pruned ${pruned.length} older ${envArg} runtime backups:`);
  for (const name of pruned) console.log(` - ${name}`);
}
