/**
 * RetroVault Event Scraper
 * Scrapes retro gaming events from Eventbrite (no API key needed)
 * Writes to data/events.json
 * 
 * Run: node scripts/scrape-events.mjs
 * Or schedule via cron: 0 6 * * 1  (Monday 6am)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_FILE = path.join(__dirname, '..', 'data', 'events.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

const DELAY_MS = 3000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function loadEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8')); }
  catch { return []; }
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function dedup(events) {
  const seen = new Set();
  return events.filter(e => {
    const key = `${e.title}-${e.date}-${e.location}`.toLowerCase().replace(/\s+/g, '-');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Parse Eventbrite text output into structured events
 * The readability extractor gives us flat text like:
 * "Event Title\nDate at Time\nCity · Venue\n"
 */
function parseEventbriteText(text, url) {
  const events = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Pattern: title line, then "Day, Mon DD, HH:MM AM/PM" or "Today/Tomorrow at HH:MM"
  const datePattern = /^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Today|Tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[,\s].+?\d{1,2}:\d{2}\s*(?:AM|PM))/i;
  const locationPattern = /^(.+?)\s*·\s*(.+)$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Skip lines that look like navigation, promoted labels, or prices
    if (['Promoted', 'Free', 'Filters', 'Date', 'Category'].includes(line)) { i++; continue; }
    if (line.startsWith('From $') || line.match(/^\$[\d.]+$/)) { i++; continue; }

    // Check if next line is a date
    const nextLine = lines[i + 1] || '';
    const nextNextLine = lines[i + 2] || '';

    if (datePattern.test(nextLine)) {
      const title = line;
      const dateStr = nextLine;
      let location = '';
      let venue = '';

      // Check for location on the line after date
      const locMatch = nextNextLine.match(locationPattern);
      if (locMatch) {
        location = locMatch[1];
        venue = locMatch[2];
        i += 3;
      } else if (nextNextLine && !datePattern.test(nextNextLine)) {
        location = nextNextLine;
        i += 3;
      } else {
        i += 2;
      }

      // Skip duplicates (Eventbrite dupes each event)
      const lastEvent = events[events.length - 1];
      if (lastEvent && lastEvent.title === title && lastEvent.dateRaw === dateStr) {
        continue;
      }

      events.push({
        id: `eb-${Date.now()}-${events.length}`,
        title,
        dateRaw: dateStr,
        location,
        venue,
        url: url,
        source: 'eventbrite',
        type: 'gaming',
        scrapedAt: new Date().toISOString(),
        attending: false,
        interested: false,
      });
    } else {
      i++;
    }
  }

  return events;
}

async function scrapeEventbrite(query, location = 'united-states') {
  const url = `https://www.eventbrite.com/d/${location}/${encodeURIComponent(query)}/`;
  console.log(`  Fetching: ${url}`);

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) { console.log(`  HTTP ${res.status}`); return []; }
    const html = await res.text();

    // Extract the JSON-LD structured data if available
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    const events = [];

    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        if (data['@type'] === 'Event' || (Array.isArray(data) && data[0]?.['@type'] === 'Event')) {
          const arr = Array.isArray(data) ? data : [data];
          for (const ev of arr) {
            if (ev['@type'] !== 'Event') continue;
            events.push({
              id: `eb-${Date.now()}-${events.length}`,
              title: ev.name || 'Unknown Event',
              dateRaw: ev.startDate || '',
              date: ev.startDate ? ev.startDate.split('T')[0] : '',
              location: ev.location?.address?.addressLocality || ev.location?.name || '',
              venue: ev.location?.name || '',
              url: ev.url || url,
              source: 'eventbrite',
              type: 'gaming',
              description: ev.description?.slice(0, 200) || '',
              scrapedAt: new Date().toISOString(),
              attending: false,
              interested: false,
            });
          }
        }
      } catch { continue; }
    }

    if (events.length > 0) {
      console.log(`  Found ${events.length} events via JSON-LD`);
      return events;
    }

    // Fallback: parse the readability text
    // Extract text content from HTML roughly
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n');

    const parsed = parseEventbriteText(textContent, url);
    console.log(`  Found ${parsed.length} events via text parsing`);
    return parsed;

  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return [];
  }
}

async function scrapeAll() {
  console.log('🎮 RetroVault Event Scraper starting...\n');

  const existing = loadEvents();
  const newEvents = [];

  const queries = [
    'retro-gaming',
    'video-game-expo',
    'game-swap',
    'gaming-convention',
    'retro-games',
  ];

  for (const query of queries) {
    console.log(`Scraping Eventbrite: "${query}"`);
    const found = await scrapeEventbrite(query);
    newEvents.push(...found);
    await sleep(DELAY_MS);
  }

  // Merge with existing, preserving user's attending/interested flags
  const existingMap = Object.fromEntries(existing.map(e => [`${e.title}-${e.dateRaw}`, e]));
  const merged = newEvents.map(e => {
    const key = `${e.title}-${e.dateRaw}`;
    const existing = existingMap[key];
    if (existing) {
      return { ...e, attending: existing.attending, interested: existing.interested, notes: existing.notes };
    }
    return e;
  });

  // Also keep manually-added events (source: 'manual')
  const manual = existing.filter(e => e.source === 'manual');
  const all = dedup([...merged, ...manual]);

  // Sort by date
  all.sort((a, b) => {
    const da = new Date(a.date || a.dateRaw || '');
    const db = new Date(b.date || b.dateRaw || '');
    return da.getTime() - db.getTime();
  });

  saveEvents(all);
  console.log(`\n✅ Saved ${all.length} events (${newEvents.length} scraped, ${manual.length} manual)`);
}

scrapeAll().catch(console.error);
