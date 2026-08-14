#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import {
  diffRuntimeBackupAgainstTarget,
  restoreRuntimeBackup,
} from '../src/lib/runtimeBackup.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const previewOnly = args.includes('--dry-run') || args.includes('--preview');
const force = args.includes('--force');
const positional = args.filter((arg) => !arg.startsWith('--'));
const envArg = positional[0];
const snapshotArg = positional[1];

if (!envArg || !snapshotArg) {
  console.error('Usage: node scripts/restore-runtime-data.mjs <env> <snapshot-dir> [--dry-run] [--force]');
  process.exit(1);
}

const targetDir = path.join(appDir, 'data', envArg);
const snapshotDir = path.isAbsolute(snapshotArg)
  ? snapshotArg
  : path.join(appDir, snapshotArg);

const { manifest, diff } = diffRuntimeBackupAgainstTarget(snapshotDir, targetDir);
const overwriteCount = diff.filter((entry) => entry.willOverwrite).length;

console.log(`Snapshot: ${snapshotDir}`);
console.log(`Target:   ${targetDir}`);
console.log(`Files in snapshot: ${manifest.files.length}`);
console.log(`Existing target files that would be overwritten: ${overwriteCount}`);
for (const entry of diff) {
  console.log(` - ${entry.file} :: ${entry.targetExists ? 'overwrite' : 'create'}`);
}

if (previewOnly) {
  console.log('Dry run only, no files were restored.');
  process.exit(0);
}

if (!force) {
  console.error('Refusing to restore without --force. This command can overwrite newer runtime state.');
  console.error('Re-run with --dry-run to preview or --force to confirm the restore.');
  process.exit(1);
}

const restored = restoreRuntimeBackup(snapshotDir, targetDir, { allowOverwrite: true });
console.log(`Restored ${restored.manifest.files.length} files from ${snapshotDir} into ${targetDir}`);
for (const name of restored.manifest.files) console.log(` - ${name}`);
