import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Vault add -> wishlist satisfaction flow', () => {
  const inventorySource = fs.readFileSync(path.join(process.cwd(), 'src/app/inventory/page.tsx'), 'utf8');
  const settingsSource = fs.readFileSync(path.join(process.cwd(), 'src/app/settings/page.tsx'), 'utf8');
  const configRouteSource = fs.readFileSync(path.join(process.cwd(), 'src/app/api/config/route.ts'), 'utf8');

  it('auto-satisfies matching wishlist entries on Vault add when enabled', () => {
    expect(inventorySource).toContain('const autoSatisfyWishlistOnVaultAdd = config?.autoSatisfyWishlistOnVaultAdd !== false;');
    expect(inventorySource).toContain("const wishlistPayload = await fetch('/api/wishlist')");
    expect(inventorySource).toContain("await fetch(`/api/wishlist/${match.id}`, { method: 'DELETE' })");
    expect(inventorySource).toContain('String(item?.title || \'\').trim().toLowerCase() === data.title.trim().toLowerCase()');
    expect(inventorySource).toContain('String(item?.platform || \'\').trim().toLowerCase() === data.platform.trim().toLowerCase()');
  });

  it('stores a session-only undo payload and renders Put Back on Wishlist affordances', () => {
    expect(inventorySource).toContain('const [vaultWishlistUndo, setVaultWishlistUndo] = useState<Record<string, WishlistRestorePayload>>({});');
    expect(inventorySource).toContain('const handleUndoVaultWishlist = async (gameId: string) =>');
    expect(inventorySource).toContain("await fetch('/api/wishlist', {");
    expect(inventorySource).toContain('↩ PUT BACK ON WISHLIST');
    expect(inventorySource).toContain('setVaultWishlistUndo((prev) => ({ ...prev, [created.id]: removedWishlistEntry }));');
  });

  it('exposes the behavior as a settings toggle with a config default', () => {
    expect(settingsSource).toContain('autoSatisfyWishlistOnVaultAdd?: boolean;');
    expect(settingsSource).toContain('Auto-satisfy wishlist when adding to Vault');
    expect(configRouteSource).toContain('autoSatisfyWishlistOnVaultAdd: true');
    expect(configRouteSource).toContain('autoSatisfyWishlistOnVaultAdd: config.autoSatisfyWishlistOnVaultAdd !== false');
  });
});
