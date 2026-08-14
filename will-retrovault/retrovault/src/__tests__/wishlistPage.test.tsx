import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('Wishlist page contextual flow', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/app/wishlist/page.tsx'), 'utf8');

  it('adds wishlist-level and bulk price fetch affordances, with visual refresh hooks', () => {
    expect(source).toContain('Fetch Price');
    expect(source).toContain('Fetch All');
    expect(source).toContain('fetchAllPrices');
    expect(source).toContain('wishlistId?: string');
    expect(source).toContain('fetchingWishlistIds');
    expect(source).toContain('isFetchingPrice');
    expect(source).toContain('setItems((current) => current.map');
    expect(source).toContain('item.marketLoose');
    expect(source).toContain('item.marketCib');
    expect(source).toContain('item.lastFetched');
  });

  it('adds wishlist QR share parity and a direct PriceCharting link on cards', () => {
    expect(source).toContain('generateShareQr');
    expect(source).toContain('shareQrSvg');
    expect(source).toContain('Download QR');
    expect(source).toContain('PriceCharting');
    expect(source).toContain('buildPriceChartingUrl');
    expect(source).toContain('search-products?');
  });

  it('fully dismisses wishlist share UI state', () => {
    expect(source).toContain('setShareUrl(null); setShareQrSvg(""); setCopyMsg("")');
  });

  it('handles wishlist share failures honestly instead of silently failing', () => {
    expect(source).toContain('Could not generate wishlist share link');
    expect(source).toContain('Share link failed');
    expect(source).toContain('!shareUrl && copyMsg');
  });

  it('uses suggestions for contextual title entry while keeping unknown platforms truthful', () => {
    expect(source).toContain('catalogRef');
    expect(source).toContain('pickSuggestion');
    expect(source).toContain('showSuggestions');
    expect(source).toContain('readFieldCache');
    expect(source).toContain('Platform unknown');
    expect(source).toContain('"owned" | "not-owned" | "wishlist"');
    expect(source).toContain('already wishlisted');
    expect(source).toContain('not owned');
  });

  it('sorts wishlist items by platform and then title', () => {
    expect(source).toContain('const compareWishlistItems');
    expect(source).toContain('a.platform.localeCompare(b.platform');
    expect(source).toContain('a.title.localeCompare(b.title');
    expect(source).toContain('const sortedFiltered = [...filtered].sort(compareWishlistItems)');
  });

  it('shows aggregated fetched wishlist totals near the top', () => {
    expect(source).toContain('const wishlistTotals = items.reduce');
    expect(source).toContain('Wishlist Loose Total');
    expect(source).toContain('Wishlist CIB Total');
    expect(source).toContain('Wishlist New Total');
    expect(source).toContain('Wishlist Graded Total');
    expect(source).toContain('hasWishlistTotals');
  });

  it('supports sticky player assignment, reassignment, and colored player badges on wishlist items', () => {
    expect(source).toContain('WISHLIST_PLAYER_STORAGE_KEY');
    expect(source).toContain('localStorage.setItem(WISHLIST_PLAYER_STORAGE_KEY');
    expect(source).toContain('playerId');
    expect(source).toContain('getPlayerBadgeStyle');
    expect(source).toContain('player.color');
    expect(source).toContain('👤');
    expect(source).toContain('No player');
    expect(source).toContain('updateWishlistPlayer');
    expect(source).toContain('setItems((current) => current.map');
    expect(source).toContain('player: selectedPlayer');
    expect(source).toContain('onPlayerChange');
    expect(source).toContain('Choose which player wants this game');
    expect(source).toContain('borderColor: playerAccent || undefined');
    expect(source).toContain('boxShadow: playerAccent ? `0 0 0 1px ${playerAccent}, inset 0 0 0 1px ${playerAccent}22` : undefined');
    expect(source).toContain('hasVariants: !!lookup.hasVariants');
    expect(source).toContain('hasVariants: priceLookup?.title === form.title && priceLookup?.platform === form.platform ? !!priceLookup.hasVariants : false');
    expect(source).toContain('const ok = await fetchPrice(item.title, item.platform, item.id);');
    expect(source).toContain('if (ok) updated += 1;');
    expect(source).toContain('else failed += 1;');
    expect(source).toContain('overflow-hidden');
    expect(source).toContain('inset 0 0 0 1px ${playerAccent}22');
    expect(source).toContain('absolute inset-y-0 left-0 w-1 pointer-events-none');
  });

  it('prompts before found items disappear, routes them into collection, and ignores catalog-only ownership ghosts', () => {
    expect(source).toContain('FOUND IT?');
    expect(source).toContain('Add to Collection');
    expect(source).toContain('/api/inventory');
    expect(source).toContain('buildFieldCopy');
    expect(source).toContain('item.copies.length > 0');
  });
});
