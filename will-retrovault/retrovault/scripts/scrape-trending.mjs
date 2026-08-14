/**
 * RetroVault PriceCharting Trending Scraper
 * Scrapes the trending/most-searched games from PriceCharting
 * Writes to data/trending.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TRENDING_FILE = path.join(ROOT, 'data', 'trending.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
};

const PLATFORM_SLUGS = ['nintendo-nes', 'super-nintendo', 'nintendo-64', 'sega-genesis', 'playstation', 'playstation-2', 'dreamcast'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function scrapePlatformTrending(platformSlug) {
  const url = `https://www.pricecharting.com/category/${platformSlug}?sort=sold&status=sold`;
  console.log(`  Fetching ${platformSlug}...`);
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) { console.log(`  HTTP ${res.status}`); return []; }
    const html = await res.text();

    const items = [];
    // Extract table rows with game data
    const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = html.match(rowPattern) || [];

    for (const row of rows.slice(1, 26)) { // Skip header, take top 25
      const titleMatch = row.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)/i);
      const priceMatch = row.match(/\$([0-9]+\.[0-9]{2})/);

      if (titleMatch && priceMatch) {
        items.push({
          title: titleMatch[1].trim(),
          platform: platformSlug.replace(/-/g, ' '),
          price: priceMatch[1],
        });
      }
    }
    return items;
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return [];
  }
}

async function run() {
  console.log('📈 RetroVault Trending Scraper starting...\n');
  const allTrending = [];

  for (const slug of PLATFORM_SLUGS) {
    const items = await scrapePlatformTrending(slug);
    allTrending.push(...items);
    console.log(`  Got ${items.length} items for ${slug}`);
    await sleep(2500);
  }

  const result = {
    scrapedAt: new Date().toISOString(),
    items: allTrending,
  };

  fs.writeFileSync(TRENDING_FILE, JSON.stringify(result, null, 2));
  console.log(`\n✅ Saved ${allTrending.length} trending items`);
}

run().catch(console.error);
