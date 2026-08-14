import { NextResponse } from 'next/server';
import { readDataFile } from '@/lib/data';

export const dynamic = 'force-dynamic';

const read = <T,>(file: string, fallback: T): T => readDataFile(file, fallback);


type InventoryCopy = { priceAcquired?: string | number | null };
type InventoryItem = {
  id?: string;
  title?: string;
  platform?: string;
  isDigital?: boolean;
  marketLoose?: string | number | null;
  copies?: InventoryCopy[];
};
type WatchlistItem = {
  id?: string;
  title?: string;
  platform?: string;
  alertPrice?: string | number | null;
};
type GrailItem = {
  id?: string;
  title?: string;
  acquiredAt?: string | null;
};
type HotFlip = InventoryItem & { net: number; roi: number; market: number };

type Alert = {
  id: string;
  type: 'price_drop' | 'price_spike' | 'watchlist_hit' | 'hot_flip' | 'grail_found';
  title: string;
  message: string;
  href: string;
  severity: 'info' | 'warning' | 'success' | 'urgent';
  icon: string;
  createdAt: string;
};

export async function GET() {
  const watchlist = read<WatchlistItem[]>('watchlist.json', []);
  const inventory = read<InventoryItem[]>('inventory.json', []);
  const grails = read<GrailItem[]>('grails.json', []);

  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  // ── Watchlist price alerts ─────────────────────────────────────────────────
  for (const item of watchlist) {
    const invItem = inventory.find((i) => i.id === item.id);
    if (!invItem) continue;
    const market = parseFloat(String(invItem.marketLoose || '0'));
    const target = parseFloat(String(item.alertPrice || '999'));
    if (market <= 0 || target <= 0) continue;

    if (market <= target) {
      alerts.push({
        id: `wl-hit-${item.id}`,
        type: 'watchlist_hit',
        title: `Price Alert: ${item.title}`,
        message: `${item.title} (${item.platform}) is at $${market.toFixed(2)} — at or below your target of $${target.toFixed(2)}!`,
        href: '/watchlist',
        severity: 'urgent',
        icon: '⚡',
        createdAt: now,
      });
    } else if (market <= target * 1.1) {
      alerts.push({
        id: `wl-close-${item.id}`,
        type: 'price_drop',
        title: `Getting Close: ${item.title}`,
        message: `${item.title} is at $${market.toFixed(2)}, within 10% of your $${target.toFixed(2)} target.`,
        href: '/watchlist',
        severity: 'warning',
        icon: '📉',
        createdAt: now,
      });
    }
  }

  // ── Hot flip alerts ────────────────────────────────────────────────────────
  const EBAY_FEE = 0.1325;
  const SHIP = 4.5;
  const MIN_ROI = 80;

  const ownedItems = inventory.filter((i) => (i.copies || []).length > 0 && !i.isDigital);
  const hotFlips = ownedItems
    .filter((i) => parseFloat(String(i.marketLoose || '0')) > 0)
    .map((i): HotFlip => {
      const avgPaid = (i.copies || []).reduce((s, c) => s + (parseFloat(String(c.priceAcquired ?? '')) || 0), 0) / Math.max(i.copies?.length || 0, 1);
      const market = parseFloat(String(i.marketLoose || '0'));
      const net = market - (market * EBAY_FEE) - SHIP - avgPaid;
      const roi = avgPaid > 0 ? (net / avgPaid) * 100 : 0;
      return { ...i, net, roi, market };
    })
    .filter((i) => i.roi >= MIN_ROI)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 3);

  if (hotFlips.length > 0) {
    const best = hotFlips[0];
    alerts.push({
      id: `hot-flip-${best.id}`,
      type: 'hot_flip',
      title: `🔥 Strong Flip Opportunity`,
      message: `${best.title} has a ${best.roi.toFixed(0)}% ROI potential. Net ~$${best.net.toFixed(2)} after eBay fees.`,
      href: '/hotlist',
      severity: 'success',
      icon: '🔥',
      createdAt: now,
    });
  }

  // ── Grail recently found ──────────────────────────────────────────────────
  const recentlyFound = grails.filter((g) => {
    if (!g.acquiredAt) return false;
    const found = new Date(g.acquiredAt);
    const daysSince = (Date.now() - found.getTime()) / 86400000;
    return daysSince <= 7;
  });

  for (const grail of recentlyFound.slice(0, 2)) {
    alerts.push({
      id: `grail-found-${grail.id}`,
      type: 'grail_found',
      title: `🎉 Grail Found: ${grail.title}`,
      message: `You found ${grail.title}! Marked as acquired within the last 7 days.`,
      href: '/grails',
      severity: 'success',
      icon: '🎉',
      createdAt: grail.acquiredAt || now,
    });
  }

  // Sort: urgent first, then warnings, then info/success
  const ORDER = { urgent: 0, warning: 1, success: 2, info: 3 };
  alerts.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

  return NextResponse.json(alerts, { headers: { 'Cache-Control': 'no-store' } });
}
