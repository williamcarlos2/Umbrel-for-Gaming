/**
 * RetroVault — JSON to SQLite Migration Script (Fast Bulk Mode)
 *
 * Uses better-sqlite3 directly with bulk transactions for maximum speed.
 * 26,980 games migrate in seconds instead of minutes.
 *
 * Usage:
 *   node scripts/migrate-to-sqlite.mjs
 *   node scripts/migrate-to-sqlite.mjs --dry-run
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const RUNTIME_ENV = process.env.RETROVAULT_ENV || process.env.RETROVAULT_RUNTIME_ENV || 'prod';
const DATA_ROOT = path.join(ROOT, 'data');
const DEFAULT_ENV_DATA_DIR = path.join(DATA_ROOT, RUNTIME_ENV);
const DATA_DIR  = process.env.RETROVAULT_DATA_DIR || DEFAULT_ENV_DATA_DIR;
const DB_PATH   = process.env.RETROVAULT_DB_PATH || path.join(DATA_DIR, 'retrovault.db');
const DRY_RUN   = process.argv.includes('--dry-run');
const SKIP_SNAPSHOT = process.argv.includes('--skip-snapshot');

function loadJson(file, fallback = []) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) { console.log(`  [skip] ${file} not found`); return fallback; }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { console.error(`  [error] Failed to parse ${file}`); return fallback; }
}

function openDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 10000');
  return db;
}

function migrateInventory(db) {
  console.log('\n📦 Migrating inventory...');
  const inventory = loadJson('inventory.json', []);
  if (!inventory.length) { console.log('  Empty.'); return; }

  const insertGame = db.prepare(`
    INSERT OR REPLACE INTO Game
    (id, title, platform, status, notes, isDigital, source, purchaseDate, lastFetched,
     marketLoose, marketCib, marketNew, marketGraded, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertCopy = db.prepare(`
    INSERT OR REPLACE INTO GameCopy
    (id, gameId, condition, hasBox, hasManual, priceAcquired, purchaseDate, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertHistory = db.prepare(`
    INSERT OR IGNORE INTO PriceHistory (id, gameId, date, loose, cib, "new", graded, fetchedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let games = 0, copies = 0, history = 0;

  const bulkInsert = db.transaction(() => {
    for (const item of inventory) {
      if (!item.id || !item.title) continue;

      insertGame.run(
        item.id, item.title, item.platform || '', item.status || 'unowned',
        item.notes || '', item.isDigital ? 1 : 0,
        item.source || null, item.purchaseDate || null,
        item.lastFetched ? new Date(item.lastFetched).toISOString() : null,
        item.marketLoose  ? parseFloat(item.marketLoose)  : null,
        item.marketCib    ? parseFloat(item.marketCib)    : null,
        item.marketNew    ? parseFloat(item.marketNew)    : null,
        item.marketGraded ? parseFloat(item.marketGraded) : null,
      );
      games++;

      for (const copy of (item.copies || [])) {
        if (!copy.id) continue;
        insertCopy.run(
          copy.id, item.id, copy.condition || 'Loose',
          copy.hasBox ? 1 : 0, copy.hasManual ? 1 : 0,
          parseFloat(copy.priceAcquired) || 0,
          copy.purchaseDate || null
        );
        copies++;
      }

      const ph = item.priceHistory || {};
      for (const [date, entry] of Object.entries(ph)) {
        if (!entry || typeof entry !== 'object') continue;
        const hid = `${item.id}-${date}`;
        insertHistory.run(
          hid, item.id, date,
          entry.loose   ? parseFloat(entry.loose)   : null,
          entry.cib     ? parseFloat(entry.cib)     : null,
          entry.new     ? parseFloat(entry.new)     : null,
          entry.graded  ? parseFloat(entry.graded)  : null,
          entry.fetchedAt || new Date().toISOString()
        );
        history++;
      }
    }
  });

  bulkInsert();
  console.log(`  ✓ ${games} games, ${copies} copies, ${history} price history entries`);
}

function migrateFavorites(db) {
  console.log('\n⭐ Migrating favorites/critics...');
  const data = loadJson('favorites.json', { people: [], favorites: {}, regrets: {} });

  const insertPerson = db.prepare(`INSERT OR REPLACE INTO Person (id, name, createdAt) VALUES (?, ?, datetime('now'))`);
  const insertFav    = db.prepare(`INSERT OR IGNORE INTO Favorite (id, personId, gameId) VALUES (?, ?, ?)`);
  const insertReg    = db.prepare(`INSERT OR IGNORE INTO Regret (id, personId, gameId) VALUES (?, ?, ?)`);

  const bulk = db.transaction(() => {
    for (const p of (data.people || [])) {
      if (!p.id || !p.name) continue;
      insertPerson.run(p.id, p.name);
    }
    let f = 0, r = 0;
    for (const [personId, gameIds] of Object.entries(data.favorites || {})) {
      for (const gameId of (gameIds || [])) {
        insertFav.run(`${personId}-${gameId}`, personId, gameId);
        f++;
      }
    }
    for (const [personId, gameIds] of Object.entries(data.regrets || {})) {
      for (const gameId of (gameIds || [])) {
        insertReg.run(`${personId}-${gameId}`, personId, gameId);
        r++;
      }
    }
    return { people: (data.people || []).length, favs: f, regs: r };
  });

  const { people, favs, regs } = bulk();
  console.log(`  ✓ ${people} critics, ${favs} favorites, ${regs} regrets`);
}

function migrateSales(db) {
  console.log('\n💰 Migrating sales & acquisitions...');
  const data = loadJson('sales.json', { sales: [], acquisitions: [] });

  const insertSale = db.prepare(`
    INSERT OR IGNORE INTO Sale (id, gameId, gameTitle, platform, salePrice, saleDate, condition, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const insertAcq = db.prepare(`
    INSERT OR IGNORE INTO Acquisition (id, gameId, gameTitle, platform, cost, purchaseDate, source, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const bulk = db.transaction(() => {
    let s = 0, a = 0;
    for (const sale of (data.sales || [])) {
      if (!sale.id) continue;
      insertSale.run(sale.id, sale.gameId||null, sale.gameTitle||'Unknown', sale.platform||null,
        parseFloat(sale.salePrice)||0, sale.saleDate||'', sale.condition||null, sale.notes||null);
      s++;
    }
    for (const acq of (data.acquisitions || [])) {
      if (!acq.id) continue;
      insertAcq.run(acq.id, acq.gameId||null, acq.gameTitle||'Unknown', acq.platform||null,
        parseFloat(acq.cost)||0, acq.purchaseDate||'', acq.source||null, acq.notes||null);
      a++;
    }
    return { s, a };
  });

  const { s, a } = bulk();
  console.log(`  ✓ ${s} sales, ${a} acquisitions`);
}

function migrateGrails(db) {
  console.log('\n🏴‍☠️ Migrating grails...');
  const grails = loadJson('grails.json', []);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO Grail (id, title, platform, notes, priority, acquiredAt, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const bulk = db.transaction(() => {
    for (const g of grails) {
      if (!g.id) continue;
      insert.run(g.id, g.title, g.platform||null, g.notes||null, g.priority||2,
        g.acquiredAt ? new Date(g.acquiredAt).toISOString() : null);
    }
  });
  bulk();
  console.log(`  ✓ ${grails.length} grails`);
}

function migratePlaylog(db) {
  console.log('\n🎮 Migrating play log...');
  const entries = loadJson('playlog.json', []);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO PlayLogEntry (id, title, platform, status, rating, notes, startedAt, finishedAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  const bulk = db.transaction(() => {
    for (const e of entries) {
      if (!e.id) continue;
      insert.run(e.id, e.title, e.platform, e.status||'backlog', e.rating||null, e.notes||null,
        e.startedAt ? new Date(e.startedAt).toISOString() : null,
        e.finishedAt ? new Date(e.finishedAt).toISOString() : null);
    }
  });
  bulk();
  console.log(`  ✓ ${entries.length} play log entries`);
}

function migrateValueHistory(db) {
  console.log('\n📈 Migrating value history...');
  const history = loadJson('value-history.json', []);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO ValueSnapshot (id, date, totalValue, totalCib, totalPaid, gameCount, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const bulk = db.transaction(() => {
    for (const snap of history) {
      if (!snap.date) continue;
      insert.run(snap.date, snap.date, snap.totalValue||0, snap.totalCib||0, snap.totalPaid||0, snap.gameCount||0);
    }
  });
  bulk();
  console.log(`  ✓ ${history.length} value snapshots`);
}

function maybeSnapshotRuntime() {
  if (DRY_RUN || SKIP_SNAPSHOT) return;

  const envName = process.env.RETROVAULT_RUNTIME_ENV || process.env.RETROVAULT_ENV || path.basename(DATA_DIR) || 'local';
  console.log(`\n💾 Snapshotting runtime state before migration (${envName})...`);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'backup-runtime-data.mjs'), envName], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
}

function main() {
  console.log(`\n🚀 RetroVault JSON → SQLite Migration${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(50));
  console.log(`Target env: ${RUNTIME_ENV}`);
  console.log(`Data dir:    ${DATA_DIR}`);
  console.log(`DB path:     ${DB_PATH}`);

  if (DRY_RUN) {
    console.log('\n📋 Dry run — counting records without writing:\n');
    const files = ['inventory.json','favorites.json','sales.json','grails.json','playlog.json','value-history.json'];
    for (const f of files) {
      const data = loadJson(f, null);
      if (data === null) continue;
      const count = Array.isArray(data) ? data.length :
        Object.values(data).reduce((s, v) => s + (Array.isArray(v) ? v.length : 1), 0);
      console.log(`  ${f}: ${count} records`);
    }
    console.log('\n✅ Dry run complete — no data written.');
    return;
  }

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  maybeSnapshotRuntime();

  const db = openDb();
  const start = Date.now();

  try {
    // Check migrations have been run
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    if (!tables.find(t => t.name === 'Game')) {
      console.error('\n❌ Database tables not found. Run `npx prisma migrate dev` first.');
      process.exit(1);
    }

    migrateInventory(db);
    migrateFavorites(db);
    migrateSales(db);
    migrateGrails(db);
    migratePlaylog(db);
    migrateValueHistory(db);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Migration complete in ${elapsed}s!`);
    console.log(`   Database: ${DB_PATH}`);
    console.log('   JSON files preserved in data/ as backup.');
    console.log('\n   Next: update API routes to use Prisma (see docs/developer-guide.md)');

  } catch (e) {
    console.error('\n❌ Migration failed:', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
