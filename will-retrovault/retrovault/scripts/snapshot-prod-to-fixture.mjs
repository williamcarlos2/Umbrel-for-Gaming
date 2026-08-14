#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PROD_DIR = path.join(ROOT, 'data', 'prod');
const FIXTURE_DIR = path.join(ROOT, 'fixtures', 'prod-snapshot');

const FILES = [
  'retrovault.db',
  'retrovault.db-shm',
  'retrovault.db-wal',
  'app.config.json',
  'scrapers.json',
  'inventory.json',
  'favorites.json',
  'sales.json',
  'acquisitions.json',
  'watchlist.json',
  'goals.json',
  'grails.json',
  'playlog.json',
  'tags.json',
  'events.json',
  'whatnot.json',
  'craigslist-deals.json',
  'reddit-alerts.json',
  'achievements-unlocked.json',
  'value-history.json',
  'bug-reports.json',
  'youtube-cache.json',
];

fs.mkdirSync(FIXTURE_DIR, { recursive: true });

for (const file of FILES) {
  const src = path.join(PROD_DIR, file);
  const dest = path.join(FIXTURE_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`copied ${file}`);
  }
}

const meta = {
  capturedAt: new Date().toISOString(),
  source: 'data/prod',
  fileCount: FILES.filter((file) => fs.existsSync(path.join(PROD_DIR, file))).length,
};
fs.writeFileSync(path.join(FIXTURE_DIR, 'manifest.json'), JSON.stringify(meta, null, 2));
console.log(`\nFixture snapshot ready at ${FIXTURE_DIR}`);
