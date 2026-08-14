import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

function uniqueId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

describe('storageCompat', () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'retrovault-storage-compat-'));
  const dataDir = path.join(testRoot, 'data');
  const dbPath = path.join(dataDir, 'retrovault.db');
  const configPath = path.join(dataDir, 'app.config.json');
  const scrapersPath = path.join(dataDir, 'scrapers.json');

  beforeAll(async () => {
    vi.resetModules();

    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
    fs.writeFileSync(scrapersPath, JSON.stringify({}, null, 2));
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '');
    }

    process.env.RETROVAULT_ENV = 'test';
    process.env.RETROVAULT_DATA_DIR = dataDir;
    process.env.RETROVAULT_DB_PATH = dbPath;
    process.env.RETROVAULT_CONFIG_PATH = configPath;
    process.env.RETROVAULT_SCRAPERS_PATH = scrapersPath;
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.RETROVAULT_INVENTORY_PATH = path.join(dataDir, 'inventory.json');

    const { execFileSync } = await import('child_process');
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: path.resolve(import.meta.dirname, '../..'),
      env: process.env,
      stdio: 'pipe',
    });
  }, 30_000);

  beforeEach(async () => {
    vi.resetModules();

    const { default: prisma } = await import('@/lib/prisma');
    const { writeDataFile } = await import('@/lib/data');

    await prisma.priceHistory.deleteMany();
    await prisma.gameCopy.deleteMany();
    await prisma.game.deleteMany();
    await prisma.watchlistItem.deleteMany();
    writeDataFile('inventory.json', []);
  });

  it('round-trips inventory through Prisma with legacy-compatible shape', async () => {
    const { createInventoryCompat, readInventoryCompat } = await import('@/lib/storageCompat');
    const id = uniqueId('game');

    await createInventoryCompat({
      id,
      title: 'Test Drive 6',
      platform: 'PlayStation',
      copies: [{ condition: 'CIB', hasBox: true, hasManual: true, priceAcquired: '12.50' }],
      marketLoose: '18.25',
      marketCib: '24.75',
      marketNew: null,
      lastFetched: '2026-04-20T12:00:00.000Z',
      priceHistory: {
        '2026-04-20': { loose: '18.25', cib: '24.75', fetchedAt: '2026-04-20T12:00:00.000Z' },
      },
    });

    const inventory = await readInventoryCompat();
    const created = inventory.find((item) => item.id === id);

    expect(created).toBeTruthy();
    expect(created?.copies).toHaveLength(1);
    expect(created?.priceHistory?.['2026-04-20']?.loose).toBe(18.25);
  });

  it('updates and deletes inventory records through compat helpers', async () => {
    const { createInventoryCompat, updateInventoryCompat, deleteInventoryCompat, readInventoryCompat } = await import('@/lib/storageCompat');
    const id = uniqueId('game');
    await createInventoryCompat({ id, title: 'Ecco', platform: 'Genesis', copies: [] });

    const updated = await updateInventoryCompat({
      id,
      title: 'Ecco the Dolphin',
      platform: 'Genesis',
      copies: [{ condition: 'Loose', priceAcquired: '4.00' }],
      marketLoose: '9.50',
    });

    expect(updated?.title).toBe('Ecco the Dolphin');
    expect(updated?.copies).toHaveLength(1);

    const deleted = await deleteInventoryCompat(id);
    expect(deleted).toBe(true);
    expect((await readInventoryCompat()).find((item) => item.id === id)).toBeUndefined();
  });

  it('merges create requests that match an existing title/platform even when the incoming id is different', async () => {
    const { createInventoryCompat, readInventoryCompat } = await import('@/lib/storageCompat');

    await createInventoryCompat({
      id: uniqueId('vp'),
      title: 'Virtual Pinball',
      platform: 'Sega Genesis',
      status: 'Yes',
      copies: [{ id: uniqueId('copy'), condition: 'Loose', hasBox: false, hasManual: false, priceAcquired: '5.00' }],
    });

    const merged = await createInventoryCompat({
      id: uniqueId('vp'),
      title: ' Virtual   Pinball ',
      platform: 'sega genesis',
      status: 'Yes',
      purchaseDate: '2026-03-27',
      copies: [{ id: uniqueId('copy'), condition: 'CIB', hasBox: true, hasManual: true, priceAcquired: '12.00' }],
    });

    expect(merged.title).toBe('Virtual Pinball');
    expect(merged.platform).toBe('Sega Genesis');
    expect(merged.copies).toHaveLength(2);
    expect(merged.purchaseDate).toBe('2026-03-27');

    const inventory = await readInventoryCompat();
    const vpRows = inventory.filter((item) => item.title === 'Virtual Pinball' && item.platform === 'Sega Genesis');
    expect(vpRows).toHaveLength(1);
    expect(vpRows[0].copies).toHaveLength(2);
  });

  it('preserves JSON-only inventory rows during the hybrid migration window', async () => {
    const { createInventoryCompat, readInventoryCompat } = await import('@/lib/storageCompat');
    const prismaId = uniqueId('catalog');
    const jsonOnlyId = uniqueId('owned');

    await createInventoryCompat({
      id: prismaId,
      title: 'Wonder Boy in Monster World',
      platform: 'Sega Genesis',
      status: 'No',
      copies: [],
    });

    const inventoryPath = process.env.RETROVAULT_INVENTORY_PATH || '';
    const existing = inventoryPath && fs.existsSync(inventoryPath)
      ? JSON.parse(fs.readFileSync(inventoryPath, 'utf8'))
      : [];

    const { writeDataFile } = await import('@/lib/data');
    writeDataFile('inventory.json', [
      ...existing,
      {
        id: jsonOnlyId,
        title: 'Wonder Boy in Monster World',
        platform: 'Sega Genesis',
        status: 'Yes',
        notes: 'Chase After the Right Price',
        purchaseDate: '2026-03-27',
        copies: [{ id: uniqueId('copy'), condition: 'Other', hasBox: true, hasManual: false, priceAcquired: '27.56' }],
      },
    ]);

    const inventory = await readInventoryCompat();
    const jsonOnly = inventory.find((item) => item.id === jsonOnlyId);

    expect(jsonOnly).toBeTruthy();
    expect(jsonOnly).toMatchObject({
      title: 'Wonder Boy in Monster World',
      status: 'Yes',
      purchaseDate: '2026-03-27',
      notes: 'Chase After the Right Price',
    });
    expect(jsonOnly?.copies).toHaveLength(1);
  });

  it('round-trips watchlist entries through Prisma with legacy fields', async () => {
    const { addWatchlistCompat, updateWatchlistCompat, readWatchlistCompat, deleteWatchlistCompat } = await import('@/lib/storageCompat');
    const created = await addWatchlistCompat({
      id: uniqueId('watch'),
      title: 'Silent Hill',
      platform: 'PlayStation 2',
      targetBuyPrice: '55.00',
      notes: 'Field mode target',
    });

    expect(created.targetBuyPrice).toBe(55);

    const updated = await updateWatchlistCompat({
      ...created,
      targetBuyPrice: '50.00',
      alertPrice: '50.00',
      notes: 'Adjusted target',
    });

    expect(updated?.alertPrice).toBe(50);
    expect(updated?.notes).toBe('Adjusted target');

    const entries = await readWatchlistCompat();
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Silent Hill');

    const deleted = await deleteWatchlistCompat(created.id);
    expect(deleted).toBe(true);
    expect(await readWatchlistCompat()).toHaveLength(0);
  });
});
