/**
 * RetroVault Collection Value Snapshot
 * Records daily collection value to data/value-history.json
 * Run via cron: 0 1 * * * node /path/to/scripts/snapshot-value.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INVENTORY_FILE = path.join(ROOT, 'data', 'inventory.json');
const HISTORY_FILE = path.join(ROOT, 'data', 'value-history.json');

function loadJson(file, fallback = []) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

const inventory = loadJson(INVENTORY_FILE);
const history = loadJson(HISTORY_FILE, []);

const owned = inventory.filter(i => (i.copies || []).length > 0 && !i.isDigital);
const totalValue = owned.reduce((s, i) => s + (parseFloat(i.marketLoose || '0') || 0), 0);
const totalCib = owned.reduce((s, i) => s + (parseFloat(i.marketCib || '0') || parseFloat(i.marketLoose || '0') || 0), 0);
const totalPaid = owned.reduce((s, i) =>
  s + (i.copies || []).reduce((cs, c) => cs + (parseFloat(c.priceAcquired) || 0), 0), 0);
const gameCount = owned.length;
const today = new Date().toISOString().split('T')[0];

// Don't duplicate today's entry
const withoutToday = history.filter(h => h.date !== today);
withoutToday.push({ date: today, totalValue, totalCib, totalPaid, gameCount });

// Keep 2 years of daily history
const trimmed = withoutToday.slice(-730);
fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));

console.log(`✅ Snapshot saved: ${today} — ${gameCount} games, $${totalValue.toFixed(2)} loose value`);
