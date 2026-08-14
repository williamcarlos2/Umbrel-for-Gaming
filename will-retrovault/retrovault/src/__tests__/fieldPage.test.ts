import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('Field page actions', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/field/page.tsx'), 'utf8');

  it('uses owned vs not-owned wording instead of vault provenance in result headers', () => {
    expect(source).toContain("📦 Owned");
    expect(source).toContain("⭕ Not owned");
    expect(source).not.toContain('📦 In your vault');
  });

  it('supports async background price refresh, wishlist-aware actions, and manual fetch-price retry', () => {
    expect(source).toContain('const saveToWishlist = async');
    expect(source).toContain("fetch('/api/wishlist'");
    expect(source).toContain('Added from Field Mode');
    expect(source).toContain('🎁 Add to Wishlist');
    expect(source).toContain('Wishlist Player:');
    expect(source).toContain('playerId: wishlistPlayerId || null');
    expect(source).toContain('💰 Fetch Price');
    expect(source).toContain('const [refreshingPrices, setRefreshingPrices] = useState<string[]>([])');
    expect(source).toContain('void Promise.all(fromInventory.map((item) => refreshResultPrice(item.title, item.platform)))');
    expect(source).toContain("void refreshResultPrice(d.title, d.platform || (plat !== 'all' ? plat : '') || \"\")");
    expect(source).toContain('Refreshing price in the background...');
    expect(source).toContain('… Refreshing');
    expect(source).toContain('SEARCH "${query.trim()}"');
    expect(source).toContain('⭕ Not owned');
    expect(source).toContain("d.platform || (plat !== 'all' ? plat : '') || \"Unknown\"");
    expect(source).toContain('nextWishlist.forEach');
    expect(source).toContain("That player'} already has this on their wishlist");
    expect(source).toContain("'🛒 Bought It'");
    expect(source).toContain("On ${selectedWishlistItem.player?.name || 'selected'}'s Wishlist");
    expect(source).toContain("/api/field/identify");
    expect(source).toContain('📸 Photo Lookup');
    expect(source).toContain("📷 Take Photo");
    expect(source).toContain("🖼️ Choose Photo");
    expect(source).toContain('capture="environment"');
    expect(source).toContain('data?.autoRun && data?.match?.title');
    expect(source).toContain("contentType.includes('application/json')");
    expect(source).toContain('OCR route failed before returning JSON');
    expect(source).toContain('Low confidence at ${data.confidence}%');
    expect(source).toContain('Under 70% confidence, Photo Lookup will wait for your confirmation');
    expect(source).not.toContain('📦 Add to Vault');
    expect(source).toContain('sticky top-0 z-10 bg-zinc-950 border-b border-green-900 p-2 sm:hidden');
    expect(source).toContain("{label}{r.hasVariants ? ' *' : ''}");
    expect(source).toContain('Check the detailed edition rows below');
  });
});
