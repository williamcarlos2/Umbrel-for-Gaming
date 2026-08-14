/**
 * RetroVault Price Fetcher — Smart Mode
 *
 * Improvements over v1:
 * 1. Only fetches OWNED games (not the full 26k catalog) — drastically reduces run time
 * 2. Prioritizes by: never-fetched → oldest fetch → highest market value
 * 3. Configurable daily limit (default: 500 games/run via FETCH_LIMIT env)
 * 4. Skips digital games (no market value)
 * 5. Reports estimated time per run
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath  = path.join(__dirname, '..', 'data', 'inventory.json');
const lockPath  = path.join(__dirname, '..', 'data', 'fetch.lock');

// Configurable: override with FETCH_LIMIT=200 node scripts/bg-fetch.mjs
const DAILY_LIMIT   = parseInt(process.env.FETCH_LIMIT || '500', 10);
const DELAY_MS      = 2500; // 2.5s between requests — PriceCharting rate limit

function isLocked() { return fs.existsSync(lockPath); }

async function waitForUnlock(label) {
  if (!isLocked()) return;
  console.log(`[bg-fetch] UI lock detected on "${label}", pausing...`);
  while (isLocked()) await new Promise(r => setTimeout(r, 5000));
  console.log('[bg-fetch] Lock released, resuming...');
}

async function getPrice(query) {
  const url = `https://www.pricecharting.com/search-products?q=${encodeURIComponent(query)}&type=videogames`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  // Check if we landed on a direct product page (search redirected)
  const directLoose = $('#used_price .price, #used_price .js-price').first().text().replace(/[$,]/g,'').trim();
  const directCib   = $('#complete_price .price, #complete_price .js-price').first().text().replace(/[$,]/g,'').trim();
  const directNew   = $('#new_price .price, #new_price .js-price').first().text().replace(/[$,]/g,'').trim();

  if (directLoose && !isNaN(parseFloat(directLoose))) {
    return {
      loose:  directLoose,
      cib:    directCib   || 'N/A',
      new:    directNew   || 'N/A',
      graded: 'N/A'
    };
  }

  // Search results page — use first row
  const firstRow = $('table#games_table tbody tr').first();
  if (!firstRow.length) return { loose: 'N/A', cib: 'N/A', new: 'N/A', graded: 'N/A' };

  const get = (sel) => firstRow.find(sel).text().trim().split('\n')[0].replace('$', '').trim() || 'N/A';
  return {
    loose:  get('td.used_price .js-price, td.used_price'),
    cib:    get('td.cib_price .js-price, td.cib_price'),
    new:    get('td.new_price .js-price, td.new_price'),
    graded: get('td.graded_price .js-price, td.graded_price'),
  };
}

async function run() {
  if (!fs.existsSync(dataPath)) {
    console.log('[bg-fetch] inventory.json not found, skipping');
    return;
  }

  let inventory = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const today = new Date().toISOString().split('T')[0];

  // ── Step 1: Filter to owned, physical games only ──────────────────────────
  const owned = inventory.filter(item =>
    (item.copies || []).length > 0 && !item.isDigital
  );
  console.log(`[bg-fetch] Total catalog: ${inventory.length} | Owned (physical): ${owned.length}`);

  // ── Step 2: Exclude already fetched today ────────────────────────────────
  const needsFetch = owned.filter(item => {
    const history = item.priceHistory || {};
    return !history[today];
  });

  // ── Step 3: Prioritize ────────────────────────────────────────────────────
  // Priority: (1) never fetched, (2) oldest lastFetched, (3) highest market value
  const prioritized = [...needsFetch].sort((a, b) => {
    const aFetched = a.lastFetched ? new Date(a.lastFetched).getTime() : 0;
    const bFetched = b.lastFetched ? new Date(b.lastFetched).getTime() : 0;
    const aValue   = parseFloat(a.marketLoose || '0') || 0;
    const bValue   = parseFloat(b.marketLoose || '0') || 0;

    // Never fetched first
    if (!a.lastFetched && b.lastFetched) return -1;
    if (a.lastFetched && !b.lastFetched) return  1;
    // Then oldest fetch date
    if (aFetched !== bFetched) return aFetched - bFetched;
    // Then highest value (keep expensive games fresh)
    return bValue - aValue;
  });

  // ── Step 4: Apply daily limit ─────────────────────────────────────────────
  const toFetch = prioritized.slice(0, DAILY_LIMIT);
  const estMinutes = Math.ceil((toFetch.length * DELAY_MS) / 60000);

  console.log(`[bg-fetch] ${new Date().toISOString()}`);
  console.log(`[bg-fetch] Need fetch: ${needsFetch.length} | This run: ${toFetch.length} (limit: ${DAILY_LIMIT}) | Est: ${estMinutes} min`);

  if (toFetch.length === 0) {
    console.log('[bg-fetch] All owned games have fresh prices. Nothing to do.');
    return;
  }

  let updated = 0;
  let noData  = 0;
  let saveCounter = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const item = toFetch[i];
    const progress = `[${i + 1}/${toFetch.length}]`;
    const daysSince = item.lastFetched
      ? Math.floor((Date.now() - new Date(item.lastFetched).getTime()) / 86400000)
      : null;
    const ageLabel = daysSince === null ? 'never' : `${daysSince}d ago`;

    try {
      const q = `${item.title} ${item.platform}`;
      const data = await getPrice(q);

      if (data.loose !== 'N/A' || data.cib !== 'N/A') {
        const idx = inventory.findIndex(x => x.id === item.id);
        if (idx !== -1) {
          const existing = inventory[idx];
          inventory[idx] = {
            ...existing,
            marketLoose:  data.loose  !== 'N/A' ? data.loose  : existing.marketLoose,
            marketCib:    data.cib    !== 'N/A' ? data.cib    : existing.marketCib,
            marketNew:    data.new    !== 'N/A' ? data.new    : existing.marketNew,
            marketGraded: data.graded !== 'N/A' ? data.graded : existing.marketGraded,
            lastFetched:  new Date().toISOString(),
            priceHistory: {
              ...(existing.priceHistory || {}),
              [today]: {
                loose:     data.loose  !== 'N/A' ? data.loose  : null,
                cib:       data.cib    !== 'N/A' ? data.cib    : null,
                new:       data.new    !== 'N/A' ? data.new    : null,
                graded:    data.graded !== 'N/A' ? data.graded : null,
                fetchedAt: new Date().toISOString()
              }
            }
          };
          updated++;
          console.log(`${progress} ✓ ${item.title} (${item.platform}) [${ageLabel}]: L=$${data.loose} CIB=$${data.cib}`);
        }
      } else {
        noData++;
        // Mark attempted so we don't retry until tomorrow
        const idx = inventory.findIndex(x => x.id === item.id);
        if (idx !== -1) {
          inventory[idx] = {
            ...inventory[idx],
            lastFetched: new Date().toISOString(),
            priceHistory: {
              ...(inventory[idx].priceHistory || {}),
              [today]: { loose: null, cib: null, new: null, graded: null, fetchedAt: new Date().toISOString() }
            }
          };
        }
        console.log(`${progress} ~ No data: ${item.title} (${item.platform})`);
      }

      // Save every 25 fetches — don't lose progress on interruption
      if (++saveCounter >= 25) {
        fs.writeFileSync(dataPath, JSON.stringify(inventory, null, 2));
        saveCounter = 0;
      }

    } catch (e) {
      noData++;
      console.error(`${progress} ✗ Error on "${item.title}":`, e.message);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
    await waitForUnlock(item.title);
  }

  // Final save
  fs.writeFileSync(dataPath, JSON.stringify(inventory, null, 2));

  const remaining = needsFetch.length - toFetch.length;
  console.log(`\n[bg-fetch] Complete. Updated: ${updated} | No data: ${noData} | Remaining for future runs: ${remaining}`);
  console.log(`[bg-fetch] ${new Date().toISOString()}`);
}

run().catch(e => {
  console.error('[bg-fetch] Fatal error:', e);
  process.exit(1);
});
