/**
 * RetroVault Whatnot Stream Watcher
 * Attempts to fetch seller stream schedules from Whatnot.
 * Whatnot is Cloudflare-protected and JS-rendered, so this script:
 *   1. Tries to fetch public profile pages with realistic headers
 *   2. Falls back to noting that a manual check is needed
 *   3. Updates whatnot.json with any schedule data found + check timestamps
 *
 * For reliable data, consider checking sellers' social media (Twitter/Instagram)
 * which sellers use to announce streams. Links can be stored per seller.
 *
 * Run: node scripts/scrape-whatnot.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'whatnot.json');

// Realistic browser headers to try bypassing Cloudflare
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function load() {
  if (!fs.existsSync(DATA_FILE)) return { sellers: [], streams: [], lastChecked: null };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function parseScheduledStreams(html, sellerUsername) {
  const streams = [];

  // Look for JSON-LD or structured data
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'Event' || data.startDate) {
        streams.push({
          id: `wn-${sellerUsername}-${Date.now()}`,
          seller: sellerUsername,
          title: data.name || `${sellerUsername} live stream`,
          startTime: data.startDate || null,
          url: `https://www.whatnot.com/user/${sellerUsername}`,
          source: 'whatnot-jsonld',
          scrapedAt: new Date().toISOString(),
        });
      }
    } catch { continue; }
  }

  // Look for "upcoming" text patterns
  const upcomingPattern = /(?:going live|streaming|live on|join me)(?:[^.]{0,50})((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[^.]{0,40})/gi;
  let m;
  while ((m = upcomingPattern.exec(html)) !== null) {
    streams.push({
      id: `wn-${sellerUsername}-text-${Date.now()}`,
      seller: sellerUsername,
      title: `${sellerUsername} — upcoming stream`,
      scheduledText: m[1].trim(),
      url: `https://www.whatnot.com/user/${sellerUsername}`,
      source: 'whatnot-text',
      scrapedAt: new Date().toISOString(),
    });
  }

  return streams;
}

async function checkSeller(seller) {
  const url = `https://www.whatnot.com/user/${seller.username}`;
  console.log(`  Checking ${seller.username} (${url})...`);

  try {
    const res = await fetch(url, { headers: HEADERS });
    console.log(`  HTTP ${res.status}`);

    if (res.status === 403 || res.status === 429) {
      console.log(`  ⚠️  Blocked by Cloudflare — Whatnot requires a real browser session`);
      return { seller: seller.username, status: 'blocked', streams: [], needsManualCheck: true };
    }

    if (!res.ok) {
      return { seller: seller.username, status: 'error', streams: [], needsManualCheck: true };
    }

    const html = await res.text();
    if (html.includes('Just a moment') || html.includes('cf-challenge')) {
      console.log(`  ⚠️  Cloudflare challenge page — needs browser session`);
      return { seller: seller.username, status: 'blocked', streams: [], needsManualCheck: true };
    }

    const streams = parseScheduledStreams(html, seller.username);
    console.log(`  Found ${streams.length} scheduled streams`);
    return { seller: seller.username, status: 'ok', streams, needsManualCheck: false };

  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return { seller: seller.username, status: 'error', streams: [], needsManualCheck: true };
  }
}

async function run() {
  console.log('📺 RetroVault Whatnot Stream Watcher starting...\n');

  const data = load();
  const sellers = data.sellers || [];

  if (sellers.length === 0) {
    console.log('No sellers configured. Add some from the RetroVault Whatnot page.');
    data.lastChecked = new Date().toISOString();
    save(data);
    return;
  }

  console.log(`Checking ${sellers.length} seller(s)...\n`);

  const allStreams = [];
  const sellerStatuses = {};

  for (const seller of sellers) {
    const result = await checkSeller(seller);
    allStreams.push(...result.streams);
    sellerStatuses[seller.username] = {
      status: result.status,
      needsManualCheck: result.needsManualCheck,
      lastChecked: new Date().toISOString(),
    };
    await sleep(3000);
  }

  // Merge new streams, keep manually-added ones
  const existingManual = (data.streams || []).filter(s => s.source === 'manual');
  // Remove old automated streams, add new ones
  const newStreams = [...allStreams, ...existingManual];

  data.streams = newStreams;
  data.lastChecked = new Date().toISOString();
  data.sellerStatuses = sellerStatuses;
  save(data);

  const blocked = Object.values(sellerStatuses).filter((s) => s.needsManualCheck).length;
  console.log(`\n✅ Done.`);
  if (blocked > 0) {
    console.log(`⚠️  ${blocked} seller(s) blocked by Cloudflare.`);
    console.log(`   Tip: Check sellers' Twitter/Instagram for stream announcements.`);
    console.log(`   Add streams manually in RetroVault → Whatnot page.`);
  }
}

run().catch(console.error);
