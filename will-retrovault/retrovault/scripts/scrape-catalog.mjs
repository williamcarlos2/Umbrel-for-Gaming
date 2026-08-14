/**
 * RetroVault Catalog Scraper
 * Scrapes PriceCharting for all game titles per platform
 * and merges them into data/inventory.json without clobbering
 * existing copy/price data.
 *
 * Run: node scripts/scrape-catalog.mjs
 * Cron (weekly): 0 3 * * 0  (Sunday 3am)
 *
 * PriceCharting platform slugs:
 * https://www.pricecharting.com/category/{slug}?sort=title&status=&id=
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INVENTORY_FILE = path.join(ROOT, 'data', 'inventory.json');
const LOG_FILE = path.join(ROOT, 'logs', 'catalog-scraper.log');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

const DELAY_MS = 2500;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Platform mapping: RetroVault display name → PriceCharting slug
const PLATFORM_SLUGS = [
  // Retro Nintendo
  { name: "NES",              slug: "nintendo-nes"       },
  { name: "SNES",             slug: "super-nintendo"     },
  { name: "Nintendo 64",      slug: "nintendo-64"        },
  { name: "Gamecube",         slug: "gamecube"           },
  { name: "Wii",              slug: "wii"                },
  { name: "Wii U",            slug: "wii-u"              },
  { name: "Switch",           slug: "nintendo-switch"    },
  { name: "Switch 2",         slug: "nintendo-switch-2"  },
  { name: "Game Boy",         slug: "gameboy"            },
  { name: "Game Boy Color",   slug: "gameboy-color"      },
  { name: "Game Boy Advance", slug: "gameboy-advance"    },
  { name: "Nintendo DS",      slug: "nintendo-ds"        },
  { name: "Nintendo 3DS",     slug: "nintendo-3ds"       },
  // PlayStation
  { name: "PS1",              slug: "playstation"        },
  { name: "PS2",              slug: "playstation-2"      },
  { name: "PS3",              slug: "playstation-3"      },
  { name: "PS4",              slug: "playstation-4"      },
  { name: "PS5",              slug: "playstation-5"      },
  { name: "PSP",              slug: "psp"                },
  { name: "PS Vita",          slug: "playstation-vita"   },
  // Sega
  { name: "Sega Genesis",     slug: "sega-genesis"       },
  { name: "Sega CD",          slug: "sega-cd"            },
  { name: "Sega 32X",         slug: "sega-32x"           },
  { name: "Sega Saturn",      slug: "sega-saturn"        },
  { name: "Dreamcast",        slug: "sega-dreamcast"     },
  { name: "Game Gear",        slug: "sega-game-gear"     },
  { name: "Sega Master System", slug: "sega-master-system" },
  // Xbox
  { name: "Xbox",             slug: "xbox"               },
  { name: "Xbox 360",         slug: "xbox-360"           },
  { name: "Xbox One",         slug: "xbox-one"           },
  { name: "Xbox Series X",    slug: "xbox-series-x"      },
  // Others
  { name: "Atari 2600",       slug: "atari-2600"         },
  { name: "Sega Saturn",      slug: "sega-saturn"        },
  { name: "TurboGrafx-16",    slug: "turbografx-16"      },
  { name: "Neo Geo",          slug: "neo-geo-aes"        },
  { name: "Atari Jaguar",     slug: "atari-jaguar"       },
];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    if (!fs.existsSync(path.join(ROOT, 'logs'))) fs.mkdirSync(path.join(ROOT, 'logs'));
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

function loadInventory() {
  if (!fs.existsSync(INVENTORY_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8')); }
  catch { return []; }
}

function saveInventory(data) {
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2));
}

function makeId(title, platform) {
  return `${platform}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function scrapePlatformPage(platform, slug, offset = 0) {
  const url = `https://www.pricecharting.com/category/${slug}?sort=title&status=&id=&offset=${offset}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) { log(`  HTTP ${res.status} for ${slug} offset ${offset}`); return { titles: [], hasMore: false }; }
    const html = await res.text();

    const titles = [];

    // Extract game titles from table rows
    // PriceCharting uses: <td class="title"><a href="...">Game Title</a></td>
    const titlePattern = /<td[^>]*class="[^"]*title[^"]*"[^>]*>(?:<span[^>]*>[^<]*<\/span>)?<a[^>]*href="\/game\/[^"]*"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = titlePattern.exec(html)) !== null) {
      const title = match[1].trim().replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      if (title && title.length > 0) titles.push(title);
    }

    // Check if there's a "next page" link
    const hasMore = html.includes('class="next"') || html.includes('>Next<') || html.includes('rel="next"');

    return { titles, hasMore };
  } catch (e) {
    log(`  Error scraping ${slug}: ${e.message}`);
    return { titles: [], hasMore: false };
  }
}

async function scrapePlatform(platformName, slug) {
  log(`\nScraping ${platformName} (${slug})...`);
  const allTitles = new Set();
  let offset = 0;
  let page = 1;

  while (true) {
    const { titles, hasMore } = await scrapePlatformPage(platformName, slug, offset);
    titles.forEach(t => allTitles.add(t));
    log(`  Page ${page}: ${titles.length} titles (total: ${allTitles.size})`);

    if (!hasMore || titles.length === 0) break;
    offset += 25; // PriceCharting paginates by 25
    page++;
    await sleep(DELAY_MS);
  }

  return [...allTitles];
}

async function run() {
  log('📚 RetroVault Catalog Scraper starting...');

  // Parse args: --platforms=PS4,PS5 to limit which platforms to update
  const args = process.argv.slice(2);
  const platformArg = args.find(a => a.startsWith('--platforms='));
  const targetPlatforms = platformArg
    ? platformArg.split('=')[1].split(',').map(p => p.trim())
    : null;

  const platformsToScrape = targetPlatforms
    ? PLATFORM_SLUGS.filter(p => targetPlatforms.some(t => p.name.toLowerCase().includes(t.toLowerCase())))
    : PLATFORM_SLUGS;

  log(`Platforms to scrape: ${platformsToScrape.map(p => p.name).join(', ')}`);

  // Load existing inventory
  const existing = loadInventory();
  const existingMap = new Map(existing.map(g => [makeId(g.title, g.platform), g]));

  let added = 0;
  let skipped = 0;

  for (const { name: platformName, slug } of platformsToScrape) {
    const titles = await scrapePlatform(platformName, slug);

    for (const title of titles) {
      const id = makeId(title, platformName);
      if (existingMap.has(id)) {
        skipped++;
        continue;
      }

      const newEntry = {
        id,
        title,
        platform: platformName,
        status: 'unowned',
        notes: '',
        copies: [],
        isDigital: false,
        lastFetched: null,
        marketLoose: null,
        marketCib: null,
        marketNew: null,
        marketGraded: null,
        priceHistory: {},
      };

      existingMap.set(id, newEntry);
      added++;
    }

    // Save after each platform in case of interruption
    saveInventory([...existingMap.values()]);
    log(`  ✅ ${platformName}: +${titles.length} titles (${added} added total, ${skipped} existing)`);
    await sleep(DELAY_MS);
  }

  log(`\n✅ Catalog scrape complete: ${added} new games added, ${skipped} already existed.`);
  log(`Total catalog size: ${existingMap.size}`);
}

run().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
