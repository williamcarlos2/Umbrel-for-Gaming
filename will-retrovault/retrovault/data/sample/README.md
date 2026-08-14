# RetroVault Data Directory

This directory holds your personal collection data. **None of these files are committed to git** — they live only on your machine.

## Setup

Copy the sample config to get started:

```bash
cp data/sample/app.config.sample.json data/app.config.json
```

## Files

| File | Contents |
|---|---|
| `app.config.json` | App settings (name, theme, auth, platforms) |
| `inventory.json` | Your full game catalog + market prices |
| `favorites.json` | Critics + favorites/regrets |
| `sales.json` | Sales transaction log |
| `acquisitions.json` | Purchase log |
| `watchlist.json` | Target Radar price alerts |
| `goals.json` | Collection goals per platform |
| `grails.json` | Holy Grail wish list |
| `playlog.json` | Play Log entries |
| `tags.json` | Game/platform tags + @mentions |
| `events.json` | Gaming events calendar |
| `whatnot.json` | Whatnot seller/stream tracking |
| `value-history.json` | Daily collection value snapshots |
| `achievements-unlocked.json` | Manually unlocked achievements |
| `scrapers.json` | Scraper registry and status |

## First Run

1. Copy `data/sample/app.config.sample.json` to `data/app.config.json`
2. Run `npm install && npm run dev`
3. Open http://localhost:3000
4. Go to Settings to configure your collection

## Building the game catalog

Run the catalog scraper to populate your database:
```bash
node scripts/scrape-catalog.mjs --platforms=NES,SNES
```
