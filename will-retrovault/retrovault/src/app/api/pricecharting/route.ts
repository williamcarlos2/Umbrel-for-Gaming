import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import fs from 'fs';
import { getConfigPath } from '@/lib/runtimeDataPaths';

function getRegion(): string {
  try {
    const cfg = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
    return (cfg.region || 'NTSC').toUpperCase();
  } catch { return 'NTSC'; }
}

// Normalized title for comparison: lowercase, remove punctuation and common noise words
function normalizeTitle(s: string): string {
  return s.toLowerCase()
    .replace(/[''`]/g, "'")          // normalize apostrophes
    .replace(/[^a-z0-9 ']/g, ' ')    // keep only alphanum, spaces, apostrophes
    .replace(/\b(the|a|an|and|of|n)\b/g, '') // strip common articles
    .replace(/\s+/g, ' ').trim();
}

// Token overlap score: what fraction of query tokens appear in result title?
function tokenScore(query: string, candidate: string): number {
  const qTokens = normalizeTitle(query).split(' ').filter(Boolean);
  const cNorm = normalizeTitle(candidate);
  if (qTokens.length === 0) return 0;
  const matches = qTokens.filter(t => t.length > 1 && cNorm.includes(t)).length;
  return matches / qTokens.length;
}

function normalizePlatform(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function platformMatches(requestedPlatform: string | null | undefined, candidatePlatform: string): boolean {
  if (!requestedPlatform) return true;
  const requested = normalizePlatform(requestedPlatform);
  const candidate = normalizePlatform(candidatePlatform);
  if (!requested || !candidate) return true;

  const slug = PLATFORM_SLUGS[requested] || requested.replace(/\s+/g, '-');
  const aliases = new Set([
    requested,
    slug,
    slug.replace(/-/g, ' '),
  ]);

  for (const [name, mappedSlug] of Object.entries(PLATFORM_SLUGS)) {
    if (mappedSlug === slug) aliases.add(normalizePlatform(name));
  }

  return Array.from(aliases).some((alias) => candidate.includes(alias));
}

// Exact suffix penalty: if result title ends with a number/word the query doesn't have, penalize
function hasSuspiciousSuffix(query: string, candidate: string): boolean {
  const qNorm = normalizeTitle(query);
  const cNorm = normalizeTitle(candidate);
  // Check if candidate has trailing tokens not in query (like '2', 'ii', 'deluxe', 'plus')
  const qTokens = new Set(qNorm.split(' ').filter(Boolean));
  const cTokens = cNorm.split(' ').filter(Boolean);
  const extraTokens = cTokens.filter(t => !qTokens.has(t));
  // If extra tokens look like sequel indicators, flag it
  return extraTokens.some(t => /^(2|3|4|5|ii|iii|iv|v|vi|deluxe|plus|ex|super|special|turbo|remix|ultra)$/i.test(t));
}

// Map platform names to PriceCharting console slugs (NTSC/NA region names)
const PLATFORM_SLUGS: Record<string, string> = {
  // Nintendo retro
  'nes': 'nes',
  'snes': 'super-nintendo',
  'super nintendo': 'super-nintendo',
  'super nintendo entertainment system': 'super-nintendo',
  'n64': 'n64',
  'nintendo 64': 'n64',
  'gamecube': 'gamecube',
  'nintendo gamecube': 'gamecube',
  // Nintendo modern
  'wii': 'wii',
  'nintendo wii': 'wii',
  'wii u': 'wii-u',
  'nintendo wii u': 'wii-u',
  'nintendo switch': 'nintendo-switch',
  'switch': 'nintendo-switch',
  'switch 2': 'nintendo-switch-2',
  // Nintendo handheld
  'game boy': 'gameboy',
  'gameboy': 'gameboy',
  'game boy color': 'gameboy-color',
  'gameboy color': 'gameboy-color',
  'virtual boy': 'virtual-boy',
  'game boy advance': 'gameboy-advance',
  'gameboy advance': 'gameboy-advance',
  'gba': 'gameboy-advance',
  'nintendo ds': 'nintendo-ds',
  'ds': 'nintendo-ds',
  'nintendo 3ds': 'nintendo-3ds',
  '3ds': 'nintendo-3ds',
  // PlayStation
  'ps1': 'playstation',
  'psx': 'playstation',
  'playstation': 'playstation',
  'playstation 1': 'playstation',
  'ps2': 'playstation-2',
  'playstation 2': 'playstation-2',
  'ps3': 'playstation-3',
  'playstation 3': 'playstation-3',
  'ps4': 'playstation-4',
  'playstation 4': 'playstation-4',
  'ps5': 'playstation-5',
  'playstation 5': 'playstation-5',
  'psp': 'psp',
  'sony psp': 'psp',
  'ps vita': 'playstation-vita',
  'playstation vita': 'playstation-vita',
  'vita': 'playstation-vita',
  // Sega
  'sega genesis': 'sega-genesis',
  'genesis': 'sega-genesis',
  'sega cd': 'sega-cd',
  'sega 32x': 'sega-32x',
  '32x': 'sega-32x',
  'sega saturn': 'sega-saturn',
  'saturn': 'sega-saturn',
  'dreamcast': 'sega-dreamcast',
  'sega dreamcast': 'sega-dreamcast',
  'game gear': 'sega-game-gear',
  'sega game gear': 'sega-game-gear',
  'sega master system': 'sega-master-system',
  'master system': 'sega-master-system',
  // Xbox
  'xbox': 'xbox',
  'original xbox': 'xbox',
  'xbox 360': 'xbox-360',
  'xbox one': 'xbox-one',
  'xbox series x': 'xbox-series-x',
  // Legacy
  'atari 2600': 'atari-2600',
  'turbografx-16': 'turbografx-16',
  'neo geo': 'neo-geo-aes',
  'atari jaguar': 'atari-jaguar',
};

// PAL/JP platform name prefixes to exclude when preferring NTSC
const PAL_PREFIXES = ['pal ', 'jp ', 'pal-', 'jp-', 'european ', 'japan '];

function shouldSkipRegion(platformText: string): boolean {
  const region = getRegion();
  const lower = platformText.toLowerCase();
  const isPal = PAL_PREFIXES.some(p => lower.startsWith(p)) || lower.includes('pal ') || lower.includes(' pal');
  const isJp  = lower.startsWith('jp ') || lower.includes(' jp ') || lower.startsWith('jp-');
  if (region === 'NTSC') return isPal || isJp;  // skip non-NTSC
  if (region === 'PAL')  return !isPal;           // skip non-PAL
  if (region === 'JP')   return !isJp;            // skip non-JP
  return isPal || isJp; // default: NTSC
}

function titleToSlug(s: string): string {
  return s.toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9 -]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function cleanText(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function extractRowTitle(rowEl: cheerio.Cheerio<AnyNode>): string {
  return cleanText(
    rowEl.find('td.title > a').first().text()
    || rowEl.find('td.title a').first().text()
    || rowEl.find('td.title').first().clone().children().remove().end().text()
  );
}

function extractPageTitle($root: cheerio.CheerioAPI): string {
  return cleanText(
    $root('h1 span[itemprop="name"]').first().text()
    || $root('h1').first().clone().children().remove().end().text()
    || $root('h1').first().text()
  );
}

const FETCH_TIMEOUT_MS = 8000; // 8 seconds — enough for slow connections, not enough to hang in field

function isVariantSensitiveTitle(title: string): boolean {
  return /\[(.*?)\]|not for resale|first print|player'?s choice|variant|bundle|big box|red box|yellow box|classics|reversed nintendo seal/i.test(title);
}

/** AbortSignal that times out after ms milliseconds */
function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qParam = searchParams.get('q')?.trim();
  const titleParam = searchParams.get('title')?.trim();
  const platformParam = searchParams.get('platform')?.trim();
  const q = qParam || [titleParam, platformParam].filter(Boolean).join(' ').trim();
  
  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const queryTitle = titleParam || (platformParam
    ? q.replace(new RegExp(`\\s+${platformParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '').trim() || q
    : q);
  const signal = timeoutSignal(FETCH_TIMEOUT_MS);

  try {
    // Strategy 1: Try direct URL first (most accurate)
    // q format is usually "Game Title Platform Name"
    // Try to extract platform from end of query
    let directResult = null;
    for (const [platName, platSlug] of Object.entries(PLATFORM_SLUGS)) {
      if (q.toLowerCase().endsWith(platName)) {
        const gameTitle = q.slice(0, q.length - platName.length - 1).trim();

        // Try multiple slug variants: PriceCharting often drops "The" / "A" from slugs
        // e.g. "The Legend of Zelda" → "zelda-wind-waker" not "the-legend-of-zelda-wind-waker"
        const slugVariants: string[] = [];
        slugVariants.push(titleToSlug(gameTitle));
        // Strip leading articles
        const stripped = gameTitle.replace(/^(the|a|an)\s+/i, '').trim();
        if (stripped !== gameTitle) slugVariants.push(titleToSlug(stripped));

        let directHtml = '';
        let $d: cheerio.CheerioAPI | null = null;
        let pageTitle = '';

        for (const gameSlug of slugVariants) {
          const directUrl = `https://www.pricecharting.com/game/${platSlug}/${gameSlug}`;
          const directRes = await fetch(directUrl, {
            redirect: 'manual', // Don't auto-follow — detect if we got redirected to search
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal
          });
          
          // If it redirected to search, this slug didn't match — try next variant
          if (directRes.status === 301 || directRes.status === 302) {
            const location = directRes.headers.get('location') || '';
            if (location.includes('search-products')) continue;
          }

          // Follow manually if needed, but reject redirects that just dump us into search.
          const fetchUrl = directRes.status >= 300 && directRes.status < 400
            ? (directRes.headers.get('location') || directUrl)
            : directUrl;

          if (fetchUrl.includes('/search-products')) continue;

          const finalRes = await fetch(fetchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal
          });
          directHtml = await finalRes.text();
          $d = cheerio.load(directHtml);
          pageTitle = extractPageTitle($d);

          if (finalRes.url.includes('/search-products')) {
            $d = null;
            pageTitle = '';
            continue;
          }

          break; // Got a real product page
        }

        if (!$d) break; // No valid page found for any slug variant

        // Check it's actually a game page (not a search results page)
        if (pageTitle && !pageTitle.toLowerCase().includes('not found') && !pageTitle.toLowerCase().includes('search')) {
          // ── Priority 1: Read prices directly from the product page price table ──
          // These IDs are reliable on direct product pages
          const getDirectPrice = (id: string) => {
            if (!$d) return null;
            const val = $d(`#${id} .js-price, #${id} .price`).first().text().replace(/[$,]/g,'').trim();
            if (val && !isNaN(parseFloat(val))) return val;
            return null;
          };
          let loose: string | null    = getDirectPrice('used_price');
          let cib: string | null      = getDirectPrice('complete_price');
          let newPrice: string | null = getDirectPrice('new_price');
          let graded: string | null   = getDirectPrice('graded_price');

          // If we got prices directly, return immediately — most reliable path
          if (loose || cib) {
            directResult = {
              loose: loose || 'N/A', cib: cib || 'N/A', new: newPrice || 'N/A', graded: graded || 'N/A',
              matchedTitle: pageTitle, confidence: 1.0,
              hasVariants: isVariantSensitiveTitle(pageTitle),
              variantMatches: [],
            };
            break;
          }

          // ── Priority 2: Fall back to related editions table if direct prices not found ──
          let bestRowScore = -1;
          
          const platAliases = [platName, platSlug.replace(/-/g, ' '), 'mega drive', 'mega-drive',
                               platName.replace('playstation 1','playstation').replace('snes','super nintendo')];

          $d('table tr').each((_, row) => {
            const rowEl = $d(row);
            const rowText = rowEl.text().replace(/\s+/g, ' ').trim();
            const rowLower = rowText.toLowerCase();
            const isThisPlatform = platAliases.some((a: string) => rowLower.includes(a.toLowerCase()));
            if (!isThisPlatform) return;

            // Skip PAL/JP rows — we want NTSC prices by default
            // Check the platform cell specifically, not the whole row
            const platformCell = rowEl.find('td').eq(1).text().trim();
            if (shouldSkipRegion(platformCell)) return;

            const prices = rowEl.find('.js-price').map((_, el) => $d(el).text().replace('$','').replace(',','').trim()).get().filter((p: string) => p && p !== '?' && !isNaN(parseFloat(p)));
            if (prices.length < 2) return;

            // Score this row: how well does the row title match our game title?
            const rowTitle = extractRowTitle(rowEl) || rowText.slice(0, 50);
            const score = tokenScore(gameTitle, rowTitle) - (hasSuspiciousSuffix(gameTitle, rowTitle) ? 0.5 : 0);

            if (score > bestRowScore) {
              bestRowScore = score;
              [loose, cib, newPrice] = prices as [string, string, string];
              graded = prices[3] || null;
            }
          });
          
          // Fallback: try standard price IDs on the product page
          // PriceCharting uses: used_price, complete_price (NOT cib_price), new_price
          if (!loose) {
            // Try multiple selector patterns for robustness
            const priceSelectors = ['.price', 'span[data-price]', '.js-item-price'];
            const getPrice = (id: string) => {
              for (const sel of priceSelectors) {
                const val = $d(`#${id} ${sel}`).first().text().replace(/[$,]/g,'').trim();
                if (val && !isNaN(parseFloat(val))) return val;
              }
              // Also try the span directly inside the td
              const direct = $d(`#${id}`).first().text().replace(/[$,]/g,'').trim().split('\n')[0];
              if (direct && !isNaN(parseFloat(direct))) return direct;
              return null;
            };
            loose    = getPrice('used_price');
            cib      = getPrice('complete_price');  // PriceCharting uses complete_price, not cib_price
            newPrice = getPrice('new_price');
          }
          
          if (loose || cib) {
            directResult = {
              loose: loose || 'N/A', cib: cib || 'N/A', new: newPrice || 'N/A', graded: graded || 'N/A',
              matchedTitle: pageTitle, confidence: 1.0,
              hasVariants: isVariantSensitiveTitle(pageTitle),
              variantMatches: [],
            };
            break;
          }
        }
        break;
      }
    }
    
    if (directResult) {
      return NextResponse.json({
        ...directResult,
        title: directResult.matchedTitle || titleParam || queryTitle,
        platform: platformParam || null,
      });
    }

    // Strategy 2: Fuzzy search fallback
    const searchUrl = `https://www.pricecharting.com/search-products?q=${encodeURIComponent(q)}&type=videogames`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Check if we landed on a direct product page
    // PriceCharting uses complete_price not cib_price
    const extractPrice = ($el: cheerio.CheerioAPI, id: string) => {
      const val = $el(`#${id} .price`).first().text().replace(/[$,]/g,'').trim();
      if (val && !isNaN(parseFloat(val))) return val;
      const fallback = $el(`#${id}`).first().text().replace(/[$,]/g,'').trim().split('\n')[0];
      return (fallback && !isNaN(parseFloat(fallback))) ? fallback : null;
    };
    let loosePrice = extractPrice($, 'used_price');
    let cibPrice = extractPrice($, 'complete_price');
    let newPrice = extractPrice($, 'new_price');
    let gradedPrice = extractPrice($, 'graded_price');
    let matchedTitle = extractPageTitle($);
    const variantMatches: Array<{ title: string; platform: string; loose: string | null; cib: string | null; new: string | null; graded: string | null }> = [];

    if (!loosePrice) {
      // Search results page — find the best-matching row
      const rows = $('table#games_table tbody tr').toArray();
      let bestScore = 0;
      let bestRow: cheerio.Cheerio<AnyNode> | null = null;
      let bestTitle = '';

      for (const row of rows) {
        const rowEl = $(row);
        const rowTitle = extractRowTitle(rowEl);
        if (!rowTitle) continue;

        // Skip PAL/JP results — prefer NTSC prices
        const platformCell = rowEl.find('td.console, td.phone-landscape-hidden').first().text().trim()
          || rowEl.find('td').eq(2).text().trim();
        if (shouldSkipRegion(platformCell)) continue;
        if (!platformMatches(platformParam, platformCell)) continue;

        // Score this result
        const score = tokenScore(queryTitle, rowTitle) + (platformMatches(platformParam, platformCell) ? 0.15 : 0);
        const suspicious = hasSuspiciousSuffix(queryTitle, rowTitle);
        const adjustedScore = suspicious ? score * 0.5 : score;

        if (isVariantSensitiveTitle(rowTitle)) {
          variantMatches.push({
            title: rowTitle,
            platform: platformCell,
            loose: rowEl.find('td.used_price .js-price, td.used_price').text().trim().split('\n')[0] || null,
            cib: rowEl.find('td.cib_price .js-price, td.cib_price').text().trim().split('\n')[0] || null,
            new: rowEl.find('td.new_price .js-price, td.new_price').text().trim().split('\n')[0] || null,
            graded: rowEl.find('td.graded_price .js-price, td.graded_price').text().trim().split('\n')[0] || null,
          });
        }

        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestRow = rowEl;
          bestTitle = rowTitle;
        }
      }

      // Require at least 60% token overlap to trust the result
      if (bestRow && bestScore >= 0.6) {
        loosePrice = bestRow.find('td.used_price .js-price, td.used_price').text().trim().split('\n')[0] || null;
        cibPrice   = bestRow.find('td.cib_price .js-price, td.cib_price').text().trim().split('\n')[0] || null;
        newPrice   = bestRow.find('td.new_price .js-price, td.new_price').text().trim().split('\n')[0] || null;
        gradedPrice= bestRow.find('td.graded_price .js-price, td.graded_price').text().trim().split('\n')[0] || null;
        matchedTitle = bestTitle;
      } else {
        // No confident match found
        return NextResponse.json({
          loose: 'N/A', cib: 'N/A', new: 'N/A', graded: 'N/A',
          matchedTitle: null,
          confidence: bestScore
        });
      }
    }

    const clean = (s: string | null) => s ? s.replace('$', '').trim() : 'N/A';

    return NextResponse.json({
      title: matchedTitle || titleParam || queryTitle,
      platform: platformParam || null,
      loose: clean(loosePrice),
      cib: clean(cibPrice),
      new: clean(newPrice),
      graded: clean(gradedPrice),
      matchedTitle,
      confidence: 1.0,
      hasVariants: isVariantSensitiveTitle(matchedTitle || '') || variantMatches.length > 0,
      variantMatches,
    });

  } catch (error: unknown) {
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'));
    if (isTimeout) {
      console.warn('[pricecharting] Request timed out after', FETCH_TIMEOUT_MS, 'ms for query:', q);
      return NextResponse.json({ error: 'timeout', message: 'Price lookup timed out' }, { status: 408 });
    }
    console.error('PriceCharting Scrape Error:', error);
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}
