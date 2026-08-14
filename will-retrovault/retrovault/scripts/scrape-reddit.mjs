/**
 * RetroVault Reddit r/gameswap Scraper
 * Uses Reddit's public RSS feed (no API key needed)
 * Matches posts against your watchlist and grail list
 * Writes matches to data/reddit-alerts.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ALERTS_FILE = path.join(ROOT, 'data', 'reddit-alerts.json');
const WATCHLIST_FILE = path.join(ROOT, 'data', 'watchlist.json');
const GRAILS_FILE = path.join(ROOT, 'data', 'grails.json');

const SUBREDDITS = ['gameswap', 'retrogaming', 'gamecollecting'];
const HEADERS = { 'User-Agent': 'RetroVault/1.0 retro-gaming-collection-manager' };

const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadJson(file) {
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function tokenize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function matchesItem(postTitle, postBody, itemTitle) {
  const text = `${postTitle} ${postBody}`.toLowerCase();
  const tokens = tokenize(itemTitle);
  // Require at least 70% of item title tokens to appear
  const matches = tokens.filter(t => t.length > 2 && text.includes(t));
  return matches.length / tokens.length >= 0.7;
}

async function scrapeSubreddit(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=50`;
  console.log(`  Fetching r/${subreddit}...`);
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) { console.log(`  HTTP ${res.status}`); return []; }
    const data = await res.json();
    const posts = data?.data?.children || [];
    return posts.map(p => ({
      id: p.data.id,
      title: p.data.title,
      body: p.data.selftext?.slice(0, 500) || '',
      url: `https://reddit.com${p.data.permalink}`,
      author: p.data.author,
      subreddit,
      createdAt: new Date(p.data.created_utc * 1000).toISOString(),
      flair: p.data.link_flair_text || '',
    }));
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return [];
  }
}

async function run() {
  console.log('🎮 RetroVault Reddit Scraper starting...\n');

  const watchlist = loadJson(WATCHLIST_FILE);
  const grails = loadJson(GRAILS_FILE).filter(g => !g.acquiredAt);
  const targets = [
    ...watchlist.map(w => ({ title: w.title, platform: w.platform, source: 'watchlist' })),
    ...grails.map(g => ({ title: g.title, platform: g.platform, source: 'grail' })),
  ];

  if (targets.length === 0) {
    console.log('No watchlist or grail items to match against. Add some first!');
    return;
  }

  console.log(`Matching against ${targets.length} targets (${watchlist.length} watchlist + ${grails.length} grails)\n`);

  const existingAlerts = loadJson(ALERTS_FILE);
  const existingIds = new Set(existingAlerts.map(a => a.postId));
  const newAlerts = [];

  for (const subreddit of SUBREDDITS) {
    const posts = await scrapeSubreddit(subreddit);
    console.log(`  Got ${posts.length} posts`);

    for (const post of posts) {
      if (existingIds.has(post.id)) continue;

      // Only look at selling/trading posts
      const flair = post.flair.toLowerCase();
      const title = post.title.toLowerCase();
      if (!flair.includes('sell') && !flair.includes('trade') && !flair.includes('have') &&
          !title.includes('[h]') && !title.includes('[have]') && !title.includes('[fs]')) {
        continue;
      }

      for (const target of targets) {
        if (matchesItem(post.title, post.body, target.title)) {
          console.log(`  ✅ Match: "${target.title}" in "${post.title}"`);
          newAlerts.push({
            id: `reddit-${post.id}-${Date.now()}`,
            postId: post.id,
            targetTitle: target.title,
            targetPlatform: target.platform,
            targetSource: target.source,
            postTitle: post.title,
            postUrl: post.url,
            author: post.author,
            subreddit: post.subreddit,
            flair: post.flair,
            createdAt: post.createdAt,
            scrapedAt: new Date().toISOString(),
            dismissed: false,
          });
          break; // One alert per post
        }
      }
    }
    await sleep(2000);
  }

  const all = [...newAlerts, ...existingAlerts].slice(0, 200);
  saveJson(ALERTS_FILE, all);
  console.log(`\n✅ Done. ${newAlerts.length} new matches found.`);
}

run().catch(console.error);
