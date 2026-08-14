/**
 * Data Utilities Tests — src/lib/data.ts
 *
 * Tests the file I/O helpers used by API routes.
 * DATA_DIR is evaluated at module load time via runtimePaths, so these
 * tests use the current workspace data/ directory with test-prefixed filenames
 * that are cleaned up in afterEach.
 */

import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

import { readDataFile, writeDataFile, dataFileExists } from '@/lib/data';
import { getDataDir } from '@/lib/runtimeDataPaths';

const DATA_DIR = getDataDir();
const TEST_PREFIX = '_test_';

afterEach(() => {
  // Clean up any files written by tests
  if (!fs.existsSync(DATA_DIR)) return;
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (f.startsWith(TEST_PREFIX)) fs.unlinkSync(path.join(DATA_DIR, f));
  }
});

// ─── readDataFile ─────────────────────────────────────────────────────────────

describe('readDataFile', () => {
  it('returns fallback when file does not exist', () => {
    const result = readDataFile('_test_nonexistent.json', []);
    expect(result).toEqual([]);
  });

  it('reads and parses a JSON array', () => {
    writeDataFile('_test_data.json', [1, 2, 3]);
    const result = readDataFile<number[]>('_test_data.json', []);
    expect(result).toEqual([1, 2, 3]);
  });

  it('reads and parses a JSON object', () => {
    writeDataFile('_test_config.json', { appName: 'RetroVault', version: 1 });
    const result = readDataFile<{ appName: string }>('_test_config.json', { appName: '' });
    expect(result.appName).toBe('RetroVault');
  });

  it('returns fallback for malformed JSON', () => {
    const dataDir = DATA_DIR;
    fs.writeFileSync(path.join(dataDir, '_test_bad.json'), '{ invalid json !!');
    const result = readDataFile('_test_bad.json', { ok: false });
    expect(result).toEqual({ ok: false });
  });

  it('returns typed fallback for missing file', () => {
    const result = readDataFile('_test_missing.json', { sales: [], acquisitions: [] });
    expect(result).toEqual({ sales: [], acquisitions: [] });
  });
});

// ─── writeDataFile ────────────────────────────────────────────────────────────

describe('writeDataFile', () => {
  it('writes JSON with 2-space indentation', () => {
    writeDataFile('_test_formatted.json', { key: 'value' });
    const dataDir = DATA_DIR;
    const raw = fs.readFileSync(path.join(dataDir, '_test_formatted.json'), 'utf8');
    expect(raw).toContain('\n  '); // has indentation
    expect(JSON.parse(raw)).toEqual({ key: 'value' });
  });

  it('overwrites existing file', () => {
    writeDataFile('_test_overwrite.json', ['original']);
    writeDataFile('_test_overwrite.json', ['updated']);
    const result = readDataFile<string[]>('_test_overwrite.json', []);
    expect(result).toEqual(['updated']);
  });

  it('handles arrays', () => {
    const items = [{ id: '1', title: 'Mega Man' }, { id: '2', title: 'Zelda' }];
    writeDataFile('_test_items.json', items);
    const result = readDataFile<typeof items>('_test_items.json', []);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Mega Man');
  });
});

// ─── dataFileExists ───────────────────────────────────────────────────────────

describe('dataFileExists', () => {
  it('returns false for non-existent file', () => {
    expect(dataFileExists('_test_ghost.json')).toBe(false);
  });

  it('returns true after file is written', () => {
    writeDataFile('_test_exists.json', []);
    expect(dataFileExists('_test_exists.json')).toBe(true);
  });
});
