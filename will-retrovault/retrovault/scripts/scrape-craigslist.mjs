/**
 * RetroVault Craigslist Local Deals Scraper
 * Scrapes Craigslist video games section for your configured city
 * No API key needed — uses public search pages
 * Writes to data/craigslist-deals.json
 *
 * Configure city in Settings → Scrapers → Craigslist City
 * Common city slugs: portland, seattle, chicago, boston, losangeles, nyc,
 *   sfbay, denver, dallas, phoenix, atlanta, miami, detroit, minneapolis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEALS_FILE = path.join(ROOT, 'data', 'craigslist-deals.json');
const CONFIG_FILE = path.join(ROOT, 'data', 'app.config.json');
const WATCHLIST_FILE = path.join(ROOT, 'data', 'watchlist.json');
const GRAILS_FILE = path.join(ROOT, 'data', 'grails.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};


function loadJson(file, fallback = []) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getCitySlug() {
  const config = loadJson(CONFIG_FILE, {});
  return config?.scrapers?.craigslistCity || 'portland';
}

function tokenize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
}

function matchScore(listing, targets) {
  const listingTokens = tokenize(listing.title);
  let bestScore = 0;
  let bestTarget = null;

  for (const target of targets) {
    const targetTokens = tokenize(target.title);
    const matches = targetTokens.filter(t => listingTokens.includes(t));
    const score = matches.length / targetTokens.length;
    if (score > bestScore) { bestScore = score; bestTarget = target; }
  }

  return { score: bestScore, target: bestTarget };
}

async function scrapeCity(citySlug, maxPrice = 500) {
  const url = `https://${citySlug}.craigslist.org/search/vga?sort=date&max_price=${maxPrice}&postedToday=0`;
  console.log(`Scraping ${url}...`);

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) { console.error(`HTTP ${res.status} for ${citySlug}`); return []; }
    const html = await res.text();

    const listings = [];

    // Parse listing items - Craigslist uses a consistent structure
    // Match: title, price, location from the search results
    const itemPattern = /<li[^>]*class="[^"]*cl-search-result[^"]*"[\s\S]*?(?=<li[^>]*class="[^"]*cl-search-result|<\/ul>)/gi;
    const items = html.match(itemPattern) || [];

    if (items.length === 0) {
      // Fallback: parse the simpler text format
      const linePattern = /\n([^\n$]{5,80})\n\s*\$(\d+)\n\s*([^\n]{2,50})\n/g;
      let match;
      while ((match = linePattern.exec(html)) !== null) {
        const [, title, price, location] = match;
        if (title.trim().length < 4) continue;
        listings.push({
          id: `cl-${citySlug}-${listings.length}-${Date.now()}`,
          title: title.trim(),
          price: parseFloat(price),
          location: location.trim(),
          url: `https://${citySlug}.craigslist.org/search/vga`,
          citySlug,
          scrapedAt: new Date().toISOString(),
        });
      }
    } else {
      for (const item of items) {
        const titleMatch = item.match(/class="[^"]*posting-title[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*label[^"]*"[^>]*>([^<]+)<\/span>/i)
          || item.match(/data-title="([^"]+)"/i)
          || item.match(/<a[^>]*href="[^"]*\/\d+\.html"[^>]*>([^<]+)<\/a>/i);

        const priceMatch = item.match(/class="[^"]*price[^"]*"[^>]*>\$?([\d,]+)/i);
        const locationMatch = item.match(/class="[^"]*meta[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]{3,40})<\/span>/i);
        const linkMatch = item.match(/href="(https?:\/\/[^"]*craigslist[^"]*\/\d+\.html)"/i);

        if (titleMatch) {
          listings.push({
            id: `cl-${citySlug}-${listings.length}-${Date.now()}`,
            title: titleMatch[1].trim(),
            price: priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null,
            location: locationMatch ? locationMatch[1].trim() : citySlug,
            url: linkMatch ? linkMatch[1] : `https://${citySlug}.craigslist.org/search/vga`,
            citySlug,
            scrapedAt: new Date().toISOString(),
          });
        }
      }
    }

    // If still nothing, do simple text extraction
    if (listings.length === 0) {
      const titlePricePattern = /\n\s*([A-Z][^\n]{4,80})\n\s*\$(\d[\d,]*)\n\s*([^\n]{3,50})/g;
      let m;
      while ((m = titlePricePattern.exec(html)) !== null) {
        listings.push({
          id: `cl-${citySlug}-${listings.length}-${Date.now()}`,
          title: m[1].trim(),
          price: parseFloat(m[2].replace(',', '')),
          location: m[3].trim(),
          url: `https://${citySlug}.craigslist.org/search/vga`,
          citySlug,
          scrapedAt: new Date().toISOString(),
        });
      }
    }

    console.log(`  Parsed ${listings.length} listings`);
    return listings;
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return [];
  }
}

async function run() {
  console.log('🏠 RetroVault Craigslist Scraper starting...\n');

  const citySlug = getCitySlug();
  console.log(`City: ${citySlug}\n`);

  // Load targets (watchlist + grails)
  const watchlist = loadJson(WATCHLIST_FILE);
  const grails = loadJson(GRAILS_FILE).filter(g => !g.acquiredAt);
  const targets = [
    ...watchlist.map(w => ({ title: w.title, platform: w.platform, alertPrice: parseFloat(w.alertPrice) || null, source: 'watchlist' })),
    ...grails.map(g => ({ title: g.title, platform: g.platform, alertPrice: null, source: 'grail' })),
  ];

  const listings = await scrapeCity(citySlug);

  if (listings.length === 0) {
    console.log('No listings found. Check city slug or try again later.');
    return;
  }

  // Score each listing against targets
  const existing = loadJson(DEALS_FILE);
  const existingIds = new Set(existing.map(d => d.id));

  const scored = listings
    .filter(l => !existingIds.has(l.id) && l.title && l.price !== null)
    .map(listing => {
      const { score, target } = matchScore(listing, targets);
      const isWatchlistMatch = score >= 0.6 && target;
      const isRetroKeyword = /\b(nes|snes|n64|genesis|sega|atari|gameboy|game boy|dreamcast|ps1|ps2|psx|gamecube|super nintendo|nintendo 64|game cube)\b/i.test(listing.title);

      return {
        ...listing,
        matchScore: score,
        matchTarget: target ? target.title : null,
        matchSource: target ? target.source : null,
        alertPrice: target?.alertPrice || null,
        isWatchlistMatch,
        isRetroKeyword,
        isGoodDeal: isWatchlistMatch || isRetroKeyword,
        dismissed: false,
      };
    })
    .filter(l => l.isGoodDeal)
    .sort((a, b) => b.matchScore - a.matchScore);

  console.log(`\nFound ${scored.length} relevant listings (${scored.filter(l => l.isWatchlistMatch).length} watchlist matches)`);

  // Merge with existing (keep dismissed state, limit to 500)
  const all = [...scored, ...existing.filter(e => !scored.find(s => s.title === e.title))].slice(0, 500);
  saveJson(DEALS_FILE, all);

  // Print top matches
  if (scored.length > 0) {
    console.log('\nTop matches:');
    scored.slice(0, 5).forEach(l => {
      const tag = l.isWatchlistMatch ? `[WATCHLIST: ${l.matchTarget}]` : '[RETRO]';
      console.log(`  ${tag} ${l.title} — $${l.price} — ${l.location}`);
    });
  }

  console.log(`\n✅ Done. Saved ${all.length} total deals.`);
}

run().catch(console.error);
