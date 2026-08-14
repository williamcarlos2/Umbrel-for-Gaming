import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Convention session integration', () => {
  const conventionSource = fs.readFileSync(path.join(process.cwd(), 'src/app/convention/page.tsx'), 'utf8');
  const inventorySource = fs.readFileSync(path.join(process.cwd(), 'src/app/inventory/page.tsx'), 'utf8');
  const fieldSource = fs.readFileSync(path.join(process.cwd(), 'src/app/field/page.tsx'), 'utf8');
  const wishlistSource = fs.readFileSync(path.join(process.cwd(), 'src/app/wishlist/page.tsx'), 'utf8');

  it('supports active and ended convention sessions in the convention tracker', () => {
    expect(conventionSource).toContain('isActive');
    expect(conventionSource).toContain('End Session');
    expect(conventionSource).toContain('Mark Active');
    expect(conventionSource).toContain('Session status');
  });

  it('auto-attributes acquisitions from vault, field mode, and wishlist to the active convention session', () => {
    expect(inventorySource).toContain('addPurchaseToActiveConventionSession');
    expect(fieldSource).toContain('addPurchaseToActiveConventionSession');
    expect(wishlistSource).toContain('addPurchaseToActiveConventionSession');
    expect(fieldSource).toContain("at: 'Field Mode'");
    expect(wishlistSource).toContain('at: "Wishlist"');
  });
});
